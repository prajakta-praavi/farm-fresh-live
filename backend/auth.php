<?php

declare(strict_types=1);

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/utils.php';

function startSessionIfNeeded(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'domain' => '',
        'secure' => $secure,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

function base64UrlEncode(string $data): string
{
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function base64UrlDecode(string $data): string
{
    return base64_decode(strtr($data, '-_', '+/')) ?: '';
}

function createJwt(array $payload): string
{
    $header = ['alg' => 'HS256', 'typ' => 'JWT'];
    $expiry = (int) env('JWT_EXPIRY_SECONDS', '86400');
    $payload['exp'] = time() + $expiry;
    $payload['iat'] = time();

    $headerEncoded = base64UrlEncode((string) json_encode($header));
    $payloadEncoded = base64UrlEncode((string) json_encode($payload));
    $signature = hash_hmac(
        'sha256',
        $headerEncoded . '.' . $payloadEncoded,
        env('JWT_SECRET', 'change_me'),
        true
    );
    $signatureEncoded = base64UrlEncode($signature);

    return $headerEncoded . '.' . $payloadEncoded . '.' . $signatureEncoded;
}

function decodeJwt(string $token): ?array
{
    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        return null;
    }
    [$headerEncoded, $payloadEncoded, $signatureEncoded] = $parts;
    $expected = base64UrlEncode(hash_hmac(
        'sha256',
        $headerEncoded . '.' . $payloadEncoded,
        env('JWT_SECRET', 'change_me'),
        true
    ));
    if (!hash_equals($expected, $signatureEncoded)) {
        return null;
    }
    $payload = json_decode(base64UrlDecode($payloadEncoded), true);
    if (!is_array($payload)) {
        return null;
    }
    if (($payload['exp'] ?? 0) < time()) {
        return null;
    }
    return $payload;
}

function authUser(): ?array
{
    startSessionIfNeeded();
    if (isset($_SESSION['admin']) && is_array($_SESSION['admin'])) {
        return [
            'id' => (int) ($_SESSION['admin']['id'] ?? 0),
            'email' => (string) ($_SESSION['admin']['email'] ?? ''),
            'role' => 'admin',
        ];
    }

    $headers = function_exists('getallheaders') ? getallheaders() : [];
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    if (!str_starts_with($authHeader, 'Bearer ')) {
        return null;
    }
    $token = substr($authHeader, 7);
    $payload = decodeJwt($token);
    if (!$payload) {
        return null;
    }
    return [
        'id' => (int) ($payload['id'] ?? 0),
        'email' => (string) ($payload['email'] ?? ''),
        'role' => (string) ($payload['role'] ?? ''),
    ];
}

function requireAdmin(): array
{
    $user = authUser();
    if (!$user || $user['role'] !== 'admin') {
        jsonResponse(['message' => 'Unauthorized'], 401);
    }
    return $user;
}

function ensureBootstrapAdmin(): void
{
    $pdo = db();
    $count = (int) $pdo->query('SELECT COUNT(*) FROM admins')->fetchColumn();
    if ($count > 0) {
        return;
    }

    $name = env('ADMIN_BOOTSTRAP_NAME', 'Admin');
    $email = env('ADMIN_BOOTSTRAP_EMAIL', 'admin@example.com');
    $username = env('ADMIN_BOOTSTRAP_USERNAME', 'admin');
    $password = env('ADMIN_BOOTSTRAP_PASSWORD', 'Admin@123');

    $stmt = $pdo->prepare('INSERT INTO admins (name, username, email, password) VALUES (?, ?, ?, ?)');
    $stmt->execute([$name, $username, $email, password_hash($password, PASSWORD_DEFAULT)]);
}

function authCustomer(): ?array
{
    startSessionIfNeeded();
    if (!isset($_SESSION['customer']) || !is_array($_SESSION['customer'])) {
        return null;
    }
    return [
        'id' => (int) ($_SESSION['customer']['id'] ?? 0),
        'email' => (string) ($_SESSION['customer']['email'] ?? ''),
        'name' => (string) ($_SESSION['customer']['name'] ?? ''),
        'phone' => (string) ($_SESSION['customer']['phone'] ?? ''),
    ];
}

function requireCustomer(): array
{
    $customer = authCustomer();
    if (!$customer || $customer['id'] <= 0) {
        jsonResponse(['message' => 'Unauthorized'], 401);
    }
    return $customer;
}

function setAdminSession(array $admin): void
{
    startSessionIfNeeded();
    session_regenerate_id(true);
    $_SESSION['admin'] = [
        'id' => (int) ($admin['id'] ?? 0),
        'name' => (string) ($admin['name'] ?? ''),
        'username' => (string) ($admin['username'] ?? ''),
        'email' => (string) ($admin['email'] ?? ''),
    ];
    unset($_SESSION['customer']);
}

function setCustomerSession(array $customer): void
{
    startSessionIfNeeded();
    session_regenerate_id(true);
    $_SESSION['customer'] = [
        'id' => (int) ($customer['id'] ?? 0),
        'name' => (string) ($customer['name'] ?? ''),
        'email' => (string) ($customer['email'] ?? ''),
        'phone' => (string) ($customer['phone'] ?? ''),
    ];
}

function clearAuthSession(): void
{
    startSessionIfNeeded();
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], (bool) $params['secure'], (bool) $params['httponly']);
    }
    session_destroy();
}

function hasTable(PDO $pdo, string $tableName): bool
{
    $stmt = $pdo->prepare('
        SELECT COUNT(*)
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ?
    ');
    $stmt->execute([$tableName]);
    return (int) $stmt->fetchColumn() > 0;
}

function ensureAuthSchema(): void
{
    $pdo = db();

    $pdo->exec('
        CREATE TABLE IF NOT EXISTS admins (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(120) NOT NULL,
          username VARCHAR(80) NOT NULL UNIQUE,
          email VARCHAR(190) NOT NULL UNIQUE,
          password VARCHAR(255) NOT NULL,
          profile_image VARCHAR(255) DEFAULT NULL,
          last_login DATETIME DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ');

    $pdo->exec('
        CREATE TABLE IF NOT EXISTS customers (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(120) NOT NULL,
          email VARCHAR(190) NOT NULL UNIQUE,
          phone VARCHAR(20) NOT NULL,
          password VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_login DATETIME DEFAULT NULL
        )
    ');

    if (hasTable($pdo, 'users')) {
        $countAdmins = (int) $pdo->query('SELECT COUNT(*) FROM admins')->fetchColumn();
        if ($countAdmins === 0) {
            $legacy = $pdo->query('SELECT name, email, password_hash FROM users WHERE role = "admin" ORDER BY id ASC LIMIT 1')->fetch();
            if ($legacy) {
                $name = (string) ($legacy['name'] ?? 'Admin');
                $email = (string) ($legacy['email'] ?? 'admin@example.com');
                $passwordHash = (string) ($legacy['password_hash'] ?? '');
                $username = strtolower(preg_replace('/[^a-z0-9_]+/i', '', strstr($email, '@', true) ?: $name) ?: 'admin');
                if ($username === '') {
                    $username = 'admin';
                }
                $ins = $pdo->prepare('INSERT INTO admins (name, username, email, password) VALUES (?, ?, ?, ?)');
                $ins->execute([$name, $username, $email, $passwordHash !== '' ? $passwordHash : password_hash('Admin@123', PASSWORD_DEFAULT)]);
            }
        }
    }

    if (!hasColumn($pdo, 'orders', 'customer_id')) {
        $pdo->exec('ALTER TABLE orders ADD COLUMN customer_id INT NULL AFTER id');
    }

    $fkStmt = $pdo->prepare('
        SELECT COUNT(*)
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = "orders"
          AND CONSTRAINT_NAME = "fk_orders_customer"
    ');
    $fkStmt->execute();
    if ((int) $fkStmt->fetchColumn() === 0) {
        $pdo->exec('
            ALTER TABLE orders
            ADD CONSTRAINT fk_orders_customer
            FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
        ');
    }
}

function ensureDefaultCategories(): void
{
    $pdo = db();
    $count = (int) $pdo->query('SELECT COUNT(*) FROM categories')->fetchColumn();
    if ($count > 0) {
        return;
    }

    $defaults = [
        'Dairy Products',
        'Fresh Fruits',
        'Gau Seva Products',
        'Natural Sweetness',
        'Spices & Condiments',
        'Grains & Pulses',
        'Farm Stay',
    ];

    $stmt = $pdo->prepare('INSERT INTO categories (name) VALUES (?)');
    foreach ($defaults as $name) {
        $stmt->execute([$name]);
    }
}

function ensureDefaultProducts(): void
{
    $pdo = db();

    $categoryMap = [];
    $rows = $pdo->query('SELECT id, name FROM categories')->fetchAll();
    foreach ($rows as $row) {
        $categoryMap[strtolower(trim((string) $row['name']))] = (int) $row['id'];
    }

    $products = [
        ['name' => 'Tur Dal', 'category' => 'Grains & Pulses', 'price' => 65, 'unit' => '250gm', 'hsn_code' => '7136000', 'gst_rate' => 5, 'image_url' => '/products/Tur%20dal.png'],
        ['name' => 'Chana Dal', 'category' => 'Grains & Pulses', 'price' => 48, 'unit' => '250gm', 'hsn_code' => '7132000', 'gst_rate' => 5, 'image_url' => '/products/Chana%20dal.png'],
        ['name' => 'Moog (Whole)', 'category' => 'Grains & Pulses', 'price' => 55, 'unit' => '250gm', 'hsn_code' => '7133100', 'gst_rate' => 5, 'image_url' => '/products/Moog%20whole.png'],
        ['name' => 'Moog Dal Mogar', 'category' => 'Grains & Pulses', 'price' => 60, 'unit' => '250gm', 'hsn_code' => '7133100', 'gst_rate' => 5, 'image_url' => '/products/Moog%20daal%20mohar.png'],
        ['name' => 'Moog Dal Chilka', 'category' => 'Grains & Pulses', 'price' => 60, 'unit' => '250gm', 'hsn_code' => '7133390', 'gst_rate' => 5, 'image_url' => '/products/Moog%20daal%20chika.png'],
        ['name' => 'Udid (Whole)', 'category' => 'Grains & Pulses', 'price' => 55, 'unit' => '250gm', 'hsn_code' => '7133110', 'gst_rate' => 5, 'image_url' => '/products/Udid%20Whole.png'],
        ['name' => 'Udid Dal Plain', 'category' => 'Grains & Pulses', 'price' => 65, 'unit' => '250gm', 'hsn_code' => '7133100', 'gst_rate' => 5, 'image_url' => '/products/udid%20dal%20plain.png'],
        ['name' => 'Udid Dal Chilka', 'category' => 'Grains & Pulses', 'price' => 58, 'unit' => '250gm', 'hsn_code' => '7133390', 'gst_rate' => 5, 'image_url' => '/products/udid%20dal%20chika.png'],
        ['name' => 'Pavta / Indian Bean', 'category' => 'Grains & Pulses', 'price' => 55, 'unit' => '250gm', 'hsn_code' => '7082000', 'gst_rate' => 0, 'image_url' => '/products/pavta%20indian%20bean.png'],
        ['name' => 'Organic Strawberry (Winter Down)', 'category' => 'Fresh Fruits', 'price' => 100, 'unit' => '200gm', 'hsn_code' => '8101000', 'gst_rate' => 0, 'image_url' => '/products/strawberry.png'],
        ['name' => 'Strawberry Jam', 'category' => 'Natural Sweetness', 'price' => 150, 'unit' => '250gm', 'hsn_code' => '20079990', 'gst_rate' => 12, 'image_url' => '/products/strawberry%20jam.png'],
        ['name' => 'Desi Gir Cow Ghee', 'category' => 'Dairy Products', 'price' => 350, 'unit' => '100gm', 'hsn_code' => '4059020', 'gst_rate' => 5, 'image_url' => '/products/Cow%20Ghee.png'],
        ['name' => 'Raw Honey', 'category' => 'Natural Sweetness', 'price' => 90, 'unit' => '100gm', 'hsn_code' => '7133300', 'gst_rate' => 0, 'image_url' => '/products/honey.png'],
        ['name' => 'Rajma / Ghewda', 'category' => 'Grains & Pulses', 'price' => 55, 'unit' => '250gm', 'hsn_code' => '7133300', 'gst_rate' => 0, 'image_url' => '/products/15.png'],
        ['name' => 'Turmeric', 'category' => 'Spices & Condiments', 'price' => 135, 'unit' => '250gm', 'hsn_code' => '9103020', 'gst_rate' => 5, 'image_url' => '/products/Turmeric.png'],
        ['name' => 'Nachani / Finger Millet', 'category' => 'Grains & Pulses', 'price' => 35, 'unit' => '250gm', 'hsn_code' => '10082930', 'gst_rate' => 5, 'image_url' => '/products/nachni%20%282%29.png'],
        ['name' => 'Jawar', 'category' => 'Grains & Pulses', 'price' => 32, 'unit' => '250gm', 'hsn_code' => '10082110', 'gst_rate' => 5, 'image_url' => '/products/jower.png'],
        ['name' => 'Jaggery Block', 'category' => 'Natural Sweetness', 'price' => 135, 'unit' => '1kg', 'hsn_code' => '17011310', 'gst_rate' => 5, 'image_url' => '/products/Jaggery%20Blocks.png'],
        ['name' => 'Jaggery Cubes', 'category' => 'Natural Sweetness', 'price' => 150, 'unit' => '1kg', 'hsn_code' => '17011310', 'gst_rate' => 0, 'image_url' => '/products/16.png'],
        ['name' => 'Jaggery Powder', 'category' => 'Natural Sweetness', 'price' => 220, 'unit' => '1kg', 'hsn_code' => '17011310', 'gst_rate' => 5, 'image_url' => '/products/JAggery%20Powder.png'],
        ['name' => 'Gaumutra', 'category' => 'Gau Seva Products', 'price' => 175, 'unit' => '500ml', 'hsn_code' => '30049011', 'gst_rate' => 5, 'image_url' => '/products/gomutra.png'],
        ['name' => 'Cowdung Dhup', 'category' => 'Gau Seva Products', 'price' => 50, 'unit' => '10 pieces', 'hsn_code' => '33074100', 'gst_rate' => 5, 'image_url' => '/products/dhup.png'],
        ['name' => 'Cowdung Diya', 'category' => 'Gau Seva Products', 'price' => 80, 'unit' => '10 pieces', 'hsn_code' => '31010099', 'gst_rate' => 5, 'image_url' => '/products/Cowdung%20Diya.png'],
        ['name' => 'Cowdung Cake', 'category' => 'Gau Seva Products', 'price' => 60, 'unit' => '10 pieces', 'hsn_code' => '31010092', 'gst_rate' => 5, 'image_url' => '/products/Cowdung%20cake.png'],
    ];

    $stmt = $pdo->prepare('
        INSERT INTO products (category_id, name, description, image_url, price, stock_quantity, unit, hsn_code, gst_rate, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    ');
    $updateStmt = $pdo->prepare('
        UPDATE products
        SET hsn_code = ?, gst_rate = ?, image_url = ?
        WHERE id = ?
    ');

    foreach ($products as $item) {
        $categoryKey = strtolower((string) $item['category']);
        $categoryId = $categoryMap[$categoryKey] ?? 0;
        if ($categoryId <= 0) {
            continue;
        }
        $existsStmt = $pdo->prepare('SELECT id FROM products WHERE LOWER(name) = LOWER(?) LIMIT 1');
        $existsStmt->execute([(string) $item['name']]);
        $existing = $existsStmt->fetch();
        if ($existing) {
            $updateStmt->execute([
                (string) $item['hsn_code'],
                (float) $item['gst_rate'],
                (string) $item['image_url'],
                (int) $existing['id'],
            ]);
            continue;
        }
        $stmt->execute([
            $categoryId,
            (string) $item['name'],
            '',
            (string) $item['image_url'],
            (float) $item['price'],
            100,
            (string) $item['unit'],
            (string) $item['hsn_code'],
            (float) $item['gst_rate'],
        ]);
    }
}

function ensureDefaultProductVariations(): void
{
    $pdo = db();

    $ensureAttributeStmt = $pdo->prepare('SELECT id FROM attributes WHERE LOWER(name) = LOWER(?) LIMIT 1');
    $createAttributeStmt = $pdo->prepare('INSERT INTO attributes (name) VALUES (?)');
    $ensureTermStmt = $pdo->prepare('SELECT id FROM attribute_terms WHERE attribute_id = ? AND LOWER(term_name) = LOWER(?) LIMIT 1');
    $createTermStmt = $pdo->prepare('
        INSERT INTO attribute_terms (attribute_id, term_name, quantity_value, unit)
        VALUES (?, ?, ?, ?)
    ');

    $getOrCreateAttribute = function (string $name) use ($ensureAttributeStmt, $createAttributeStmt, $pdo): int {
        $ensureAttributeStmt->execute([$name]);
        $existing = $ensureAttributeStmt->fetch();
        if ($existing) {
            return (int) $existing['id'];
        }
        $createAttributeStmt->execute([$name]);
        return (int) $pdo->lastInsertId();
    };

    $getOrCreateTerm = function (int $attributeId, string $termName, ?float $quantityValue, ?string $unit) use ($ensureTermStmt, $createTermStmt, $pdo): int {
        $ensureTermStmt->execute([$attributeId, $termName]);
        $existing = $ensureTermStmt->fetch();
        if ($existing) {
            return (int) $existing['id'];
        }
        $createTermStmt->execute([$attributeId, $termName, $quantityValue, $unit]);
        return (int) $pdo->lastInsertId();
    };

    $weightAttributeId = $getOrCreateAttribute('Weight');
    $packAttributeId = $getOrCreateAttribute('Pack');

    $definitions = [
        'Tur Dal' => ['attribute_id' => $weightAttributeId, 'options' => [['250 gm', 250, 'gm', 65], ['500 gm', 500, 'gm', 125], ['1 kg', 1, 'kg', 250]]],
        'Chana Dal' => ['attribute_id' => $weightAttributeId, 'options' => [['250 gm', 250, 'gm', 48], ['500 gm', 500, 'gm', 90], ['1 kg', 1, 'kg', 180]]],
        'Moog (Whole)' => ['attribute_id' => $weightAttributeId, 'options' => [['250 gm', 250, 'gm', 55], ['500 gm', 500, 'gm', 100], ['1 kg', 1, 'kg', 200]]],
        'Moog Dal Mogar' => ['attribute_id' => $weightAttributeId, 'options' => [['250 gm', 250, 'gm', 60], ['500 gm', 500, 'gm', 115], ['1 kg', 1, 'kg', 230]]],
        'Moog Dal Chilka' => ['attribute_id' => $weightAttributeId, 'options' => [['250 gm', 250, 'gm', 60], ['500 gm', 500, 'gm', 110], ['1 kg', 1, 'kg', 220]]],
        'Udid (Whole)' => ['attribute_id' => $weightAttributeId, 'options' => [['250 gm', 250, 'gm', 55], ['500 gm', 500, 'gm', 100], ['1 kg', 1, 'kg', 200]]],
        'Udid Dal Plain' => ['attribute_id' => $weightAttributeId, 'options' => [['250 gm', 250, 'gm', 65], ['500 gm', 500, 'gm', 120], ['1 kg', 1, 'kg', 240]]],
        'Udid Dal Chilka' => ['attribute_id' => $weightAttributeId, 'options' => [['250 gm', 250, 'gm', 58], ['500 gm', 500, 'gm', 110], ['1 kg', 1, 'kg', 220]]],
        'Pavta / Indian Bean' => ['attribute_id' => $weightAttributeId, 'options' => [['250 gm', 250, 'gm', 55], ['500 gm', 500, 'gm', 105], ['1 kg', 1, 'kg', 210]]],
        'Organic Strawberry (Winter Down)' => ['attribute_id' => $weightAttributeId, 'options' => [['200 gm', 200, 'gm', 100], ['500 gm', 500, 'gm', 250]]],
        'Strawberry Jam' => ['attribute_id' => $weightAttributeId, 'options' => [['250 gm', 250, 'gm', 150]]],
        'Desi Gir Cow Ghee' => ['attribute_id' => $weightAttributeId, 'options' => [['100 gm', 100, 'gm', 350], ['250 gm', 250, 'gm', 800], ['500 gm', 500, 'gm', 1500], ['1 kg', 1, 'kg', 3000]]],
        'Raw Honey' => ['attribute_id' => $weightAttributeId, 'options' => [['100 gm', 100, 'gm', 90], ['250 gm', 250, 'gm', 220], ['500 gm', 500, 'gm', 425], ['1 kg', 1, 'kg', 850]]],
        'Rajma / Ghewda' => ['attribute_id' => $weightAttributeId, 'options' => [['250 gm', 250, 'gm', 55], ['500 gm', 500, 'gm', 110], ['1 kg', 1, 'kg', 220]]],
        'Turmeric' => ['attribute_id' => $weightAttributeId, 'options' => [['250 gm', 250, 'gm', 135], ['500 gm', 500, 'gm', 250], ['1 kg', 1, 'kg', 500]]],
        'Nachani / Finger Millet' => ['attribute_id' => $weightAttributeId, 'options' => [['250 gm', 250, 'gm', 35], ['500 gm', 500, 'gm', 60], ['1 kg', 1, 'kg', 120]]],
        'Jawar' => ['attribute_id' => $weightAttributeId, 'options' => [['250 gm', 250, 'gm', 32], ['500 gm', 500, 'gm', 60], ['1 kg', 1, 'kg', 120]]],
        'Jaggery Block' => ['attribute_id' => $weightAttributeId, 'options' => [['1 kg', 1, 'kg', 135]]],
        'Jaggery Cubes' => ['attribute_id' => $weightAttributeId, 'options' => [['1 kg', 1, 'kg', 150]]],
        'Jaggery Powder' => ['attribute_id' => $weightAttributeId, 'options' => [['1 kg', 1, 'kg', 220]]],
        'Gaumutra' => ['attribute_id' => $weightAttributeId, 'options' => [['500 ml', 500, 'ml', 175], ['1 litre', 1, 'litre', 350]]],
        'Cowdung Dhup' => ['attribute_id' => $packAttributeId, 'options' => [['10 pcs', 10, 'pcs', 50], ['20 pcs', 20, 'pcs', 100], ['50 pcs', 50, 'pcs', 220]]],
        'Cowdung Diya' => ['attribute_id' => $packAttributeId, 'options' => [['10 pcs', 10, 'pcs', 80], ['50 pcs', 50, 'pcs', 400], ['100 pcs', 100, 'pcs', 800]]],
        'Cowdung Cake' => ['attribute_id' => $packAttributeId, 'options' => [['10 pcs', 10, 'pcs', 60], ['50 pcs', 50, 'pcs', 300], ['100 pcs', 100, 'pcs', 600]]],
    ];

    $productStmt = $pdo->prepare('SELECT id FROM products WHERE LOWER(name) = LOWER(?) LIMIT 1');
    $hasVariationStmt = $pdo->prepare('SELECT COUNT(*) FROM product_variations WHERE product_id = ?');
    $insertVariationStmt = $pdo->prepare('
        INSERT INTO product_variations (product_id, attribute_id, term_id, value, quantity_value, unit, price, stock, sku)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ');

    foreach ($definitions as $productName => $config) {
        $productStmt->execute([$productName]);
        $product = $productStmt->fetch();
        if (!$product) {
            continue;
        }
        $productId = (int) $product['id'];
        $hasVariationStmt->execute([$productId]);
        if ((int) $hasVariationStmt->fetchColumn() > 0) {
            continue;
        }

        $attributeId = (int) $config['attribute_id'];
        foreach ($config['options'] as $option) {
            [$label, $quantityValue, $unit, $price] = $option;
            $termId = $getOrCreateTerm($attributeId, (string) $label, (float) $quantityValue, (string) $unit);
            $insertVariationStmt->execute([
                $productId,
                $attributeId,
                $termId,
                (string) $label,
                (float) $quantityValue,
                (string) $unit,
                (float) $price,
                100,
                null,
            ]);
        }
    }
}

function hasColumn(PDO $pdo, string $tableName, string $columnName): bool
{
    $stmt = $pdo->prepare('
        SELECT COUNT(*)
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ?
          AND COLUMN_NAME = ?
    ');
    $stmt->execute([$tableName, $columnName]);
    return (int) $stmt->fetchColumn() > 0;
}

function ensureVariationSchema(): void
{
    $pdo = db();

    $pdo->exec('
        CREATE TABLE IF NOT EXISTS attributes (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(120) NOT NULL UNIQUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ');

    $pdo->exec('
        CREATE TABLE IF NOT EXISTS attribute_terms (
          id INT AUTO_INCREMENT PRIMARY KEY,
          attribute_id INT NOT NULL,
          term_name VARCHAR(120) NOT NULL,
          quantity_value DECIMAL(10,3) DEFAULT NULL,
          unit VARCHAR(20) DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT fk_attribute_terms_attribute FOREIGN KEY (attribute_id) REFERENCES attributes(id) ON DELETE CASCADE,
          UNIQUE KEY uniq_attribute_term_name (attribute_id, term_name)
        )
    ');

    $pdo->exec('
        CREATE TABLE IF NOT EXISTS product_variations (
          id INT AUTO_INCREMENT PRIMARY KEY,
          product_id INT NOT NULL,
          attribute_id INT NOT NULL,
          term_id INT NOT NULL,
          value VARCHAR(120) NOT NULL,
          quantity_value DECIMAL(10,3) DEFAULT NULL,
          unit VARCHAR(20) DEFAULT NULL,
          price DECIMAL(10,2) NOT NULL DEFAULT 0,
          stock INT NOT NULL DEFAULT 0,
          sku VARCHAR(80) DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_product_variations_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
          CONSTRAINT fk_product_variations_attribute FOREIGN KEY (attribute_id) REFERENCES attributes(id) ON DELETE CASCADE,
          CONSTRAINT fk_product_variations_term FOREIGN KEY (term_id) REFERENCES attribute_terms(id) ON DELETE CASCADE
        )
    ');

    if (!hasColumn($pdo, 'order_items', 'variation_id')) {
        $pdo->exec('ALTER TABLE order_items ADD COLUMN variation_id INT NULL AFTER product_id');
    }
    if (!hasColumn($pdo, 'order_items', 'attribute_name')) {
        $pdo->exec('ALTER TABLE order_items ADD COLUMN attribute_name VARCHAR(120) DEFAULT NULL AFTER variation_id');
    }
    if (!hasColumn($pdo, 'order_items', 'term_name')) {
        $pdo->exec('ALTER TABLE order_items ADD COLUMN term_name VARCHAR(120) DEFAULT NULL AFTER attribute_name');
    }
    if (!hasColumn($pdo, 'order_items', 'variation_value')) {
        $pdo->exec('ALTER TABLE order_items ADD COLUMN variation_value VARCHAR(120) DEFAULT NULL AFTER term_name');
    }
    if (!hasColumn($pdo, 'order_items', 'quantity_value')) {
        $pdo->exec('ALTER TABLE order_items ADD COLUMN quantity_value DECIMAL(10,3) DEFAULT NULL AFTER variation_value');
    }
    if (!hasColumn($pdo, 'order_items', 'unit')) {
        $pdo->exec('ALTER TABLE order_items ADD COLUMN unit VARCHAR(20) DEFAULT NULL AFTER quantity_value');
    }
    if (!hasColumn($pdo, 'order_items', 'sku')) {
        $pdo->exec('ALTER TABLE order_items ADD COLUMN sku VARCHAR(80) DEFAULT NULL AFTER unit');
    }

    if (!hasColumn($pdo, 'attribute_terms', 'quantity_value')) {
        $pdo->exec('ALTER TABLE attribute_terms ADD COLUMN quantity_value DECIMAL(10,3) DEFAULT NULL AFTER term_name');
    }
    if (!hasColumn($pdo, 'attribute_terms', 'unit')) {
        $pdo->exec('ALTER TABLE attribute_terms ADD COLUMN unit VARCHAR(20) DEFAULT NULL AFTER quantity_value');
    }

    if (!hasColumn($pdo, 'product_variations', 'quantity_value')) {
        $pdo->exec('ALTER TABLE product_variations ADD COLUMN quantity_value DECIMAL(10,3) DEFAULT NULL AFTER value');
    }
    if (!hasColumn($pdo, 'product_variations', 'unit')) {
        $pdo->exec('ALTER TABLE product_variations ADD COLUMN unit VARCHAR(20) DEFAULT NULL AFTER quantity_value');
    }
    if (!hasColumn($pdo, 'products', 'gst_rate')) {
        $pdo->exec('ALTER TABLE products ADD COLUMN gst_rate DECIMAL(5,2) NOT NULL DEFAULT 0 AFTER hsn_code');
    }

    $fkStmt = $pdo->prepare('
        SELECT COUNT(*)
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = "order_items"
          AND CONSTRAINT_NAME = "fk_order_items_variation"
    ');
    $fkStmt->execute();
    if ((int) $fkStmt->fetchColumn() === 0) {
        $pdo->exec('
            ALTER TABLE order_items
            ADD CONSTRAINT fk_order_items_variation
            FOREIGN KEY (variation_id) REFERENCES product_variations(id) ON DELETE SET NULL
        ');
    }
}

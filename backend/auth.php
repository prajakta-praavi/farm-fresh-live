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
        $role = (string) ($_SESSION['admin']['role'] ?? 'administrator');
        $source = (string) ($_SESSION['admin']['source'] ?? 'admins');
        return [
            'id' => (int) ($_SESSION['admin']['id'] ?? 0),
            'email' => (string) ($_SESSION['admin']['email'] ?? ''),
            'role' => $role,
            'source' => $source,
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
        'source' => (string) ($payload['source'] ?? 'token'),
    ];
}

function requireRole(array $roles): array
{
    $user = authUser();
    if (!$user) {
        jsonResponse(['message' => 'Unauthorized'], 401);
    }
    $role = strtolower((string) ($user['role'] ?? ''));
    if ($role === 'admin') {
        $role = 'administrator';
    }
    $allowed = array_map(static fn(string $r): string => strtolower($r), $roles);
    if (!in_array($role, $allowed, true)) {
        jsonResponse(['message' => 'Unauthorized'], 401);
    }
    $user['role'] = $role;
    return $user;
}

function requireAdmin(): array
{
    return requireRole(['administrator']);
}

function requireAuthor(): array
{
    return requireRole(['administrator', 'author']);
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

function setAdminSession(array $admin, string $role = 'administrator', string $source = 'admins'): void
{
    startSessionIfNeeded();
    session_regenerate_id(true);
    $_SESSION['admin'] = [
        'id' => (int) ($admin['id'] ?? 0),
        'name' => (string) ($admin['name'] ?? ''),
        'username' => (string) ($admin['username'] ?? ''),
        'email' => (string) ($admin['email'] ?? ''),
        'role' => $role,
        'source' => $source,
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

    if (
        hasTable($pdo, 'users')
        && hasColumn($pdo, 'users', 'password_hash')
        && hasColumn($pdo, 'users', 'role')
        && hasColumn($pdo, 'users', 'email')
    ) {
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
    if (!hasColumn($pdo, 'orders', 'invoice_id')) {
        $pdo->exec('ALTER TABLE orders ADD COLUMN invoice_id VARCHAR(40) DEFAULT NULL AFTER razorpay_signature');
    }
    if (!hasColumn($pdo, 'orders', 'tracking_number')) {
        $pdo->exec('ALTER TABLE orders ADD COLUMN tracking_number VARCHAR(120) DEFAULT NULL AFTER invoice_id');
    }
    if (!hasColumn($pdo, 'orders', 'tracking_url')) {
        $pdo->exec('ALTER TABLE orders ADD COLUMN tracking_url VARCHAR(255) DEFAULT NULL AFTER tracking_number');
    }
    if (!hasColumn($pdo, 'orders', 'subtotal_amount')) {
        $pdo->exec('ALTER TABLE orders ADD COLUMN subtotal_amount DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER customer_pincode');
    }
    if (!hasColumn($pdo, 'orders', 'coupon_id')) {
        $pdo->exec('ALTER TABLE orders ADD COLUMN coupon_id INT NULL AFTER subtotal_amount');
    }
    if (!hasColumn($pdo, 'orders', 'coupon_code')) {
        $pdo->exec('ALTER TABLE orders ADD COLUMN coupon_code VARCHAR(50) DEFAULT NULL AFTER coupon_id');
    }
    if (!hasColumn($pdo, 'orders', 'discount_type')) {
        $pdo->exec('ALTER TABLE orders ADD COLUMN discount_type ENUM("percentage","fixed") DEFAULT NULL AFTER coupon_code');
    }
    if (!hasColumn($pdo, 'orders', 'discount_value')) {
        $pdo->exec('ALTER TABLE orders ADD COLUMN discount_value DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER discount_type');
    }
    if (!hasColumn($pdo, 'orders', 'discount_amount')) {
        $pdo->exec('ALTER TABLE orders ADD COLUMN discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER discount_value');
    }
    $pdo->exec('
        ALTER TABLE orders
        MODIFY COLUMN order_status ENUM("Pending","Confirmed","Processing","Ready to Ship","Shipped","Delivered","Cancelled") NOT NULL DEFAULT "Pending"
    ');

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

    $couponFkStmt = $pdo->prepare('
        SELECT COUNT(*)
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = "orders"
          AND CONSTRAINT_NAME = "fk_orders_coupon"
    ');
    $couponFkStmt->execute();
    if ((int) $couponFkStmt->fetchColumn() === 0 && hasTable($pdo, 'coupons')) {
        $pdo->exec('
            ALTER TABLE orders
            ADD CONSTRAINT fk_orders_coupon
            FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE SET NULL
        ');
    }
}

function ensureUsersSchema(): void
{
    $pdo = db();
    $pdo->exec('
        CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          username VARCHAR(80) NOT NULL UNIQUE,
          email VARCHAR(190) NOT NULL UNIQUE,
          password VARCHAR(255) NOT NULL,
          role ENUM("administrator", "author", "subscriber") NOT NULL DEFAULT "subscriber",
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    ');

    if (!hasColumn($pdo, 'users', 'username')) {
        $pdo->exec('ALTER TABLE users ADD COLUMN username VARCHAR(80) NULL AFTER id');
    }
    if (!hasColumn($pdo, 'users', 'email')) {
        $pdo->exec('ALTER TABLE users ADD COLUMN email VARCHAR(190) NULL AFTER username');
    }
    if (!hasColumn($pdo, 'users', 'password')) {
        $pdo->exec('ALTER TABLE users ADD COLUMN password VARCHAR(255) NULL AFTER email');
    }
    if (!hasColumn($pdo, 'users', 'role')) {
        $pdo->exec('ALTER TABLE users ADD COLUMN role VARCHAR(40) NOT NULL DEFAULT "subscriber" AFTER password');
    }
    if (!hasColumn($pdo, 'users', 'profile_image')) {
        $pdo->exec('ALTER TABLE users ADD COLUMN profile_image VARCHAR(255) DEFAULT NULL AFTER password');
    }
    if (!hasColumn($pdo, 'users', 'updated_at')) {
        $pdo->exec('ALTER TABLE users ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
    }

    if (hasColumn($pdo, 'users', 'name')) {
        $pdo->exec("UPDATE users SET username = TRIM(name) WHERE (username IS NULL OR username = '') AND name IS NOT NULL AND name <> ''");
    }
    $pdo->exec("UPDATE users SET username = CONCAT('user', id) WHERE username IS NULL OR username = ''");

    if (hasColumn($pdo, 'users', 'password_hash')) {
        $pdo->exec("UPDATE users SET password = password_hash WHERE (password IS NULL OR password = '') AND password_hash IS NOT NULL AND password_hash <> ''");
    }
    $pdo->exec("UPDATE users SET password = '" . password_hash(bin2hex(random_bytes(16)), PASSWORD_DEFAULT) . "' WHERE password IS NULL OR password = ''");

    $pdo->exec("UPDATE users SET email = CONCAT('user', id, '@local.invalid') WHERE email IS NULL OR email = ''");

    // Ensure role column supports required values even if table existed earlier.
    $pdo->exec("UPDATE users SET role = 'administrator' WHERE LOWER(role) = 'admin'");
    $pdo->exec("UPDATE users SET role = 'subscriber' WHERE LOWER(role) NOT IN ('administrator', 'author', 'subscriber')");
    $pdo->exec('
        ALTER TABLE users
        MODIFY COLUMN username VARCHAR(80) NOT NULL,
        MODIFY COLUMN email VARCHAR(190) NOT NULL,
        MODIFY COLUMN password VARCHAR(255) NOT NULL,
        MODIFY COLUMN role ENUM("administrator", "author", "subscriber") NOT NULL DEFAULT "subscriber"
    ');

    try {
        $pdo->exec('ALTER TABLE users ADD UNIQUE KEY uniq_users_username (username)');
    } catch (Throwable $e) {
        // Ignore if index already exists.
    }
    try {
        $pdo->exec('ALTER TABLE users ADD UNIQUE KEY uniq_users_email (email)');
    } catch (Throwable $e) {
        // Ignore if index already exists.
    }

    $adminUsername = trim((string) env('ADMIN_BOOTSTRAP_USERNAME', 'admin'));
    $adminEmail = trim((string) env('ADMIN_BOOTSTRAP_EMAIL', 'admin@example.com'));
    $adminPassword = (string) env('ADMIN_BOOTSTRAP_PASSWORD', 'Admin@123');
    if ($adminUsername === '' || $adminEmail === '' || $adminPassword === '') {
        return;
    }

    $existsStmt = $pdo->prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1');
    $existsStmt->execute([$adminEmail]);
    if ($existsStmt->fetch()) {
        return;
    }

    $insertStmt = $pdo->prepare('INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, "administrator")');
    $insertStmt->execute([
        $adminUsername,
        $adminEmail,
        password_hash($adminPassword, PASSWORD_DEFAULT),
    ]);
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
        'Natural Sweeteners',
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
    $pdo->prepare('DELETE FROM products WHERE LOWER(name) = LOWER(?)')->execute(['Payment Test Product']);
    $pdo->prepare('DELETE FROM products WHERE LOWER(name) = LOWER(?)')->execute(['Guava']);

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
        ['name' => 'Strawberry Jam', 'category' => 'Natural Sweeteners', 'price' => 150, 'unit' => '250gm', 'hsn_code' => '20079990', 'gst_rate' => 12, 'image_url' => '/products/strawberry%20jam.png'],
        ['name' => 'Desi Gir Cow Ghee', 'category' => 'Dairy Products', 'price' => 350, 'unit' => '100gm', 'hsn_code' => '4059020', 'gst_rate' => 5, 'image_url' => '/products/Cow%20Ghee.png'],
        ['name' => 'Raw Honey', 'category' => 'Natural Sweeteners', 'price' => 90, 'unit' => '100gm', 'hsn_code' => '7133300', 'gst_rate' => 0, 'image_url' => '/products/honey.png'],
        ['name' => 'Rajma / Ghewda', 'category' => 'Grains & Pulses', 'price' => 55, 'unit' => '250gm', 'hsn_code' => '7133300', 'gst_rate' => 0, 'image_url' => '/products/15.png'],
        ['name' => 'Turmeric', 'category' => 'Spices & Condiments', 'price' => 135, 'unit' => '250gm', 'hsn_code' => '9103020', 'gst_rate' => 5, 'image_url' => '/products/Turmeric.png'],
        ['name' => 'Nachani / Finger Millet', 'category' => 'Grains & Pulses', 'price' => 35, 'unit' => '250gm', 'hsn_code' => '10082930', 'gst_rate' => 5, 'image_url' => '/products/nachni%20%282%29.png'],
        ['name' => 'Jawar', 'category' => 'Grains & Pulses', 'price' => 32, 'unit' => '250gm', 'hsn_code' => '10082110', 'gst_rate' => 5, 'image_url' => '/products/jower.png'],
        ['name' => 'Jaggery Block', 'category' => 'Natural Sweeteners', 'price' => 135, 'unit' => '1kg', 'hsn_code' => '17011310', 'gst_rate' => 5, 'image_url' => '/products/Jaggery%20Block.png'],
        ['name' => 'Jaggery Cubes', 'category' => 'Natural Sweeteners', 'price' => 150, 'unit' => '1kg', 'hsn_code' => '17011310', 'gst_rate' => 0, 'image_url' => '/products/Jaggery%20Blocks.png'],
        ['name' => 'Jaggery Powder', 'category' => 'Natural Sweeteners', 'price' => 220, 'unit' => '1kg', 'hsn_code' => '17011310', 'gst_rate' => 5, 'image_url' => '/products/JAggery%20Powder.png'],
        ['name' => 'Gaumutra', 'category' => 'Gau Seva Products', 'price' => 175, 'unit' => '500ml', 'hsn_code' => '30049011', 'gst_rate' => 5, 'image_url' => '/products/gomutra.png'],
        ['name' => 'Cowdung Dhup', 'category' => 'Gau Seva Products', 'price' => 50, 'unit' => '10 pieces', 'hsn_code' => '33074100', 'gst_rate' => 5, 'image_url' => '/products/dhup.png'],
        ['name' => 'Cowdung Diya', 'category' => 'Gau Seva Products', 'price' => 80, 'unit' => '10 pieces', 'hsn_code' => '31010099', 'gst_rate' => 5, 'image_url' => '/products/Cowdung%20Diya.png'],
        ['name' => 'Cowdung Cake', 'category' => 'Gau Seva Products', 'price' => 60, 'unit' => '10 pieces', 'hsn_code' => '31010092', 'gst_rate' => 5, 'image_url' => '/products/Cowdung%20cake.png'],
    ];

    $stmt = $pdo->prepare('
        INSERT INTO products (category_id, name, sku, description, image_url, price, stock_quantity, product_status, unit, hsn_code, gst_rate, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
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
            continue;
        }
        $stmt->execute([
            $categoryId,
            (string) $item['name'],
            null,
            '',
            (string) $item['image_url'],
            (float) $item['price'],
            100,
            'Active',
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

    $pdo->exec('
        CREATE TABLE IF NOT EXISTS coupons (
          id INT AUTO_INCREMENT PRIMARY KEY,
          code VARCHAR(50) NOT NULL UNIQUE,
          discount_type ENUM("percentage","fixed") NOT NULL,
          discount_value DECIMAL(10,2) NOT NULL DEFAULT 0,
          min_order_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
          expiry_date DATE DEFAULT NULL,
          usage_limit INT DEFAULT NULL,
          used_count INT NOT NULL DEFAULT 0,
          status ENUM("Active","Inactive") NOT NULL DEFAULT "Active",
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
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
    if (!hasColumn($pdo, 'products', 'sku')) {
        $pdo->exec('ALTER TABLE products ADD COLUMN sku VARCHAR(80) DEFAULT NULL AFTER name');
    }
    if (!hasColumn($pdo, 'products', 'product_status')) {
        $pdo->exec("ALTER TABLE products ADD COLUMN product_status ENUM('Active','Out of Stock') NOT NULL DEFAULT 'Active' AFTER stock_quantity");
    }
    $pdo->exec("UPDATE products SET product_status = CASE WHEN stock_quantity <= 0 THEN 'Out of Stock' ELSE 'Active' END");
    try {
        $pdo->exec('ALTER TABLE products ADD UNIQUE KEY uniq_products_sku (sku)');
    } catch (Throwable $e) {
        // Ignore if index exists or duplicate/empty values are present.
    }

    $pdo->exec('
        CREATE TABLE IF NOT EXISTS stock_movements (
          id INT AUTO_INCREMENT PRIMARY KEY,
          product_id INT NOT NULL,
          variation_id INT NULL,
          order_id INT NULL,
          movement_type ENUM("order_deduction","admin_adjustment","restock") NOT NULL,
          quantity_delta INT NOT NULL,
          previous_stock INT NOT NULL,
          new_stock INT NOT NULL,
          note VARCHAR(255) DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT fk_stock_movements_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
          CONSTRAINT fk_stock_movements_variation FOREIGN KEY (variation_id) REFERENCES product_variations(id) ON DELETE SET NULL,
          CONSTRAINT fk_stock_movements_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
        )
    ');

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

function ensureProductGallerySchema(): void
{
    $pdo = db();
    $pdo->exec('
        CREATE TABLE IF NOT EXISTS product_images (
          id INT AUTO_INCREMENT PRIMARY KEY,
          product_id INT NOT NULL,
          image_path VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT fk_product_images_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
        )
    ');
}

function ensureBlogSchema(): void
{
    $pdo = db();
    $pdo->exec('
        CREATE TABLE IF NOT EXISTS blog_categories (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(120) NOT NULL UNIQUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ');

    $pdo->exec('
        CREATE TABLE IF NOT EXISTS blog_posts (
          id INT AUTO_INCREMENT PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          slug VARCHAR(255) NOT NULL UNIQUE,
          author_name VARCHAR(120) DEFAULT NULL,
          excerpt TEXT NOT NULL,
          content LONGTEXT NOT NULL,
          image_url VARCHAR(255) DEFAULT NULL,
          category VARCHAR(120) DEFAULT "General",
          read_time VARCHAR(50) DEFAULT "5 min read",
          is_published TINYINT(1) NOT NULL DEFAULT 1,
          publish_at DATETIME DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    ');
    if (!hasColumn($pdo, 'blog_posts', 'author_name')) {
        $pdo->exec('ALTER TABLE blog_posts ADD COLUMN author_name VARCHAR(120) DEFAULT NULL AFTER slug');
    }
    $pdo->exec("UPDATE blog_posts SET author_name = 'Rushivan Aagro' WHERE author_name IS NULL OR TRIM(author_name) = ''");
    if (!hasColumn($pdo, 'blog_posts', 'publish_at')) {
        $pdo->exec('ALTER TABLE blog_posts ADD COLUMN publish_at DATETIME DEFAULT NULL AFTER is_published');
    }

    $defaultCategories = [
        'Farm Stay Experience',
        'Organic Farming',
        'Seasonal Produce',
        'Healthy Recipes',
        'Natural Sweeteners',
        'Dairy & A2 Ghee',
        'Gau Seva Products',
        'Grains & Pulses',
        'Wellness & Nutrition',
        'Sustainable Living',
        'Festivals & Gifting',
        'Rushivan Updates',
        'General',
    ];
    $insertCategoryStmt = $pdo->prepare('INSERT IGNORE INTO blog_categories (name) VALUES (?)');
    foreach ($defaultCategories as $categoryName) {
        $insertCategoryStmt->execute([$categoryName]);
    }

    $defaultPosts = [
        [
            'title' => 'Benefits of A2 Gir Cow Ghee',
            'slug' => 'benefits-of-a2-gir-cow-ghee',
            'excerpt' => 'Discover how traditionally crafted A2 Gir cow ghee supports digestion, immunity, and daily wellness in a natural way.',
            'author_name' => 'Rushivan Aagro',
            'content' => "A2 Gir cow ghee is a traditional nourishment source rooted in Indian food wisdom.\n\nIt is widely used for daily cooking and balanced diets.\n\nChoose authentic small-batch ghee for better quality and consistency.",
            'image_url' => 'https://images.unsplash.com/photo-1505253216365-4fc01b7e1f4d?w=1200&h=800&fit=crop',
            'category' => 'Wellness & Nutrition',
            'read_time' => '5 min read',
            'is_published' => 1,
        ],
        [
            'title' => 'Farm-to-Table: Our Journey',
            'slug' => 'farm-to-table-our-journey',
            'excerpt' => 'Learn how our farm-to-table process protects freshness, quality, and trust from harvest day to your kitchen.',
            'author_name' => 'Rushivan Aagro',
            'content' => "Farm-to-table means quality decisions happen close to the source.\n\nFrom cultivation to packing, each step is designed to preserve freshness.\n\nThis approach builds customer trust and supports sustainable farming.",
            'image_url' => 'https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=1200&h=800&fit=crop',
            'category' => 'Farm Stay Experience',
            'read_time' => '4 min read',
            'is_published' => 1,
        ],
        [
            'title' => 'The Sacred Practice of Gau Seva',
            'slug' => 'the-sacred-practice-of-gau-seva',
            'excerpt' => 'Understand the spiritual, ecological, and practical role of Gau Seva in sustainable rural farming traditions.',
            'author_name' => 'Rushivan Aagro',
            'content' => "Gau Seva connects compassion with practical rural sustainability.\n\nCow-based farming supports soil health and reduces chemical dependency.\n\nPracticed responsibly, it strengthens farms, communities, and clean food systems.",
            'image_url' => 'https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?w=1200&h=800&fit=crop',
            'category' => 'Gau Seva Products',
            'read_time' => '6 min read',
            'is_published' => 1,
        ],
    ];
    $insertPostStmt = $pdo->prepare('
        INSERT IGNORE INTO blog_posts (title, slug, author_name, excerpt, content, image_url, category, read_time, is_published)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ');
    foreach ($defaultPosts as $post) {
        $insertPostStmt->execute([
            $post['title'],
            $post['slug'],
            $post['author_name'],
            $post['excerpt'],
            $post['content'],
            $post['image_url'],
            $post['category'],
            $post['read_time'],
            $post['is_published'],
        ]);
    }
}

function ensureFarmStayBookingSchema(): void
{
    $pdo = db();

    $pdo->exec('
        CREATE TABLE IF NOT EXISTS farm_stay_settings (
          id TINYINT PRIMARY KEY DEFAULT 1,
          total_property_capacity INT NOT NULL DEFAULT 15,
          total_rooms INT NOT NULL DEFAULT 2,
          room_base_capacity INT NOT NULL DEFAULT 2,
          room_max_capacity INT NOT NULL DEFAULT 3,
          room_price_per_night DECIMAL(10,2) NOT NULL DEFAULT 3000,
          extra_bed_charge DECIMAL(10,2) NOT NULL DEFAULT 1000,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    ');

    $pdo->exec('
        CREATE TABLE IF NOT EXISTS farm_stay_units (
          id INT AUTO_INCREMENT PRIMARY KEY,
          unit_type ENUM("ROOM","TENT") NOT NULL,
          unit_name VARCHAR(120) NOT NULL,
          capacity INT NOT NULL,
          price_per_night DECIMAL(10,2) NOT NULL DEFAULT 0,
          is_active TINYINT(1) NOT NULL DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    ');

    $pdo->exec('
        CREATE TABLE IF NOT EXISTS farm_stay_bookings (
          id INT AUTO_INCREMENT PRIMARY KEY,
          full_name VARCHAR(120) NOT NULL,
          phone VARCHAR(20) NOT NULL,
          email VARCHAR(190) DEFAULT "",
          check_in_date DATE NOT NULL,
          check_out_date DATE NOT NULL,
          guest_count INT NOT NULL,
          accommodation_type ENUM("ROOM","TENT") NOT NULL,
          rooms_allocated INT NOT NULL DEFAULT 0,
          extra_beds INT NOT NULL DEFAULT 0,
          subtotal_per_night DECIMAL(10,2) NOT NULL DEFAULT 0,
          gst_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
          gst_amount_per_night DECIMAL(10,2) NOT NULL DEFAULT 0,
          total_gst DECIMAL(10,2) NOT NULL DEFAULT 0,
          total_price DECIMAL(10,2) NOT NULL DEFAULT 0,
          notes TEXT,
          status ENUM("Pending","Confirmed","Completed","Cancelled") NOT NULL DEFAULT "Pending",
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    ');
    if (!hasColumn($pdo, 'farm_stay_bookings', 'gst_rate')) {
        $pdo->exec('ALTER TABLE farm_stay_bookings ADD COLUMN gst_rate DECIMAL(5,2) NOT NULL DEFAULT 0 AFTER subtotal_per_night');
    }
    if (!hasColumn($pdo, 'farm_stay_bookings', 'gst_amount_per_night')) {
        $pdo->exec('ALTER TABLE farm_stay_bookings ADD COLUMN gst_amount_per_night DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER gst_rate');
    }
    if (!hasColumn($pdo, 'farm_stay_bookings', 'total_gst')) {
        $pdo->exec('ALTER TABLE farm_stay_bookings ADD COLUMN total_gst DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER gst_amount_per_night');
    }

    $pdo->exec('
        CREATE TABLE IF NOT EXISTS farm_stay_booking_units (
          id INT AUTO_INCREMENT PRIMARY KEY,
          booking_id INT NOT NULL,
          unit_id INT NOT NULL,
          guests_allocated INT NOT NULL DEFAULT 0,
          unit_price_per_night DECIMAL(10,2) NOT NULL DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT fk_farm_booking_units_booking FOREIGN KEY (booking_id) REFERENCES farm_stay_bookings(id) ON DELETE CASCADE,
          CONSTRAINT fk_farm_booking_units_unit FOREIGN KEY (unit_id) REFERENCES farm_stay_units(id) ON DELETE CASCADE
        )
    ');

    $pdo->exec('
        CREATE TABLE IF NOT EXISTS farm_stay_blocked_dates (
          id INT AUTO_INCREMENT PRIMARY KEY,
          blocked_date DATE NOT NULL UNIQUE,
          reason VARCHAR(255) DEFAULT NULL,
          is_active TINYINT(1) NOT NULL DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ');

    $pdo->exec('
        INSERT INTO farm_stay_settings (
            id, total_property_capacity, total_rooms, room_base_capacity, room_max_capacity, room_price_per_night, extra_bed_charge
        ) VALUES (1, 15, 2, 2, 3, 3000, 1000)
        ON DUPLICATE KEY UPDATE
            total_property_capacity = IF(total_property_capacity > 0, total_property_capacity, VALUES(total_property_capacity)),
            total_rooms = IF(total_rooms > 0, total_rooms, VALUES(total_rooms)),
            room_base_capacity = IF(room_base_capacity > 0, room_base_capacity, VALUES(room_base_capacity)),
            room_max_capacity = IF(room_max_capacity > 0, room_max_capacity, VALUES(room_max_capacity)),
            room_price_per_night = IF(room_price_per_night > 0, room_price_per_night, VALUES(room_price_per_night)),
            extra_bed_charge = IF(extra_bed_charge >= 0, extra_bed_charge, VALUES(extra_bed_charge))
    ');

    $roomCount = (int) $pdo->query("SELECT COUNT(*) FROM farm_stay_units WHERE unit_type = 'ROOM'")->fetchColumn();
    if ($roomCount < 2) {
        $insertRoomStmt = $pdo->prepare('
            INSERT INTO farm_stay_units (unit_type, unit_name, capacity, price_per_night, is_active)
            VALUES ("ROOM", ?, 3, 3000, 1)
        ');
        for ($i = $roomCount + 1; $i <= 2; $i++) {
            $insertRoomStmt->execute(['Cottage Room ' . $i]);
        }
    }

    if (!hasColumn($pdo, 'farm_stay_inquiries', 'accommodation_type')) {
        $pdo->exec('ALTER TABLE farm_stay_inquiries ADD COLUMN accommodation_type VARCHAR(20) DEFAULT NULL AFTER people_count');
    }
}

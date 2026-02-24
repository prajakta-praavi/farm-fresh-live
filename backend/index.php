<?php

declare(strict_types=1);

require_once __DIR__ . '/utils.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';

startSessionIfNeeded();

$origin = (string) ($_SERVER['HTTP_ORIGIN'] ?? '*');
if ($origin !== '') {
    header('Access-Control-Allow-Origin: ' . $origin);
}
header('Vary: Origin');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');

if (methodIs('OPTIONS')) {
    http_response_code(204);
    exit;
}

$path = getPath();
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
$body = parseJsonBody();

try {
    ensureAuthSchema();
    ensureBootstrapAdmin();
    ensureDefaultCategories();
    ensureVariationSchema();
    ensureDefaultProducts();
    ensureDefaultProductVariations();
    $pdo = db();

    if ($path === '/api/health' && $method === 'GET') {
        jsonResponse(['status' => 'ok']);
    }

    if ($path === '/api/auth/login' && $method === 'POST') {
        $email = trim((string) ($body['email'] ?? ''));
        $password = (string) ($body['password'] ?? '');
        if ($email === '' || $password === '') {
            jsonResponse(['message' => 'Email and password are required'], 422);
        }
        $stmt = $pdo->prepare('SELECT id, name, username, email, password, profile_image, last_login FROM admins WHERE email = ? LIMIT 1');
        $stmt->execute([$email]);
        $admin = $stmt->fetch();

        if (!$admin || !password_verify($password, (string) $admin['password'])) {
            jsonResponse(['message' => 'Invalid email or password'], 401);
        }

        setAdminSession($admin);
        $pdo->prepare('UPDATE admins SET last_login = NOW() WHERE id = ?')->execute([(int) $admin['id']]);
        $token = createJwt([
            'id' => (int) $admin['id'],
            'email' => (string) $admin['email'],
            'role' => 'admin',
        ]);

        jsonResponse([
            'token' => $token,
            'user' => [
                'id' => (int) $admin['id'],
                'name' => (string) $admin['name'],
                'username' => (string) $admin['username'],
                'email' => (string) $admin['email'],
                'profile_image' => $admin['profile_image'] ?? null,
                'last_login' => $admin['last_login'] ?? null,
                'role' => 'admin',
            ],
        ]);
    }

    if ($path === '/api/auth/logout' && $method === 'POST') {
        clearAuthSession();
        jsonResponse(['success' => true]);
    }

    if ($path === '/api/admin/me' && $method === 'GET') {
        $auth = requireAdmin();
        $stmt = $pdo->prepare('SELECT id, name, username, email, profile_image, last_login, created_at FROM admins WHERE id = ? LIMIT 1');
        $stmt->execute([(int) $auth['id']]);
        $admin = $stmt->fetch();
        if (!$admin) {
            jsonResponse(['message' => 'Admin not found'], 404);
        }
        jsonResponse($admin);
    }

    if ($path === '/api/admin/profile' && $method === 'PUT') {
        $auth = requireAdmin();
        $name = trim((string) ($body['name'] ?? ''));
        $username = trim((string) ($body['username'] ?? ''));
        $email = trim((string) ($body['email'] ?? ''));
        if ($name === '' || $username === '' || $email === '') {
            jsonResponse(['message' => 'Name, username and email are required'], 422);
        }
        $dup = $pdo->prepare('SELECT id FROM admins WHERE (username = ? OR email = ?) AND id <> ? LIMIT 1');
        $dup->execute([$username, $email, (int) $auth['id']]);
        if ($dup->fetch()) {
            jsonResponse(['message' => 'Username or email is already in use'], 422);
        }
        $stmt = $pdo->prepare('UPDATE admins SET name = ?, username = ?, email = ? WHERE id = ?');
        $stmt->execute([$name, $username, $email, (int) $auth['id']]);
        $stmt = $pdo->prepare('SELECT id, name, username, email, profile_image, last_login, created_at FROM admins WHERE id = ? LIMIT 1');
        $stmt->execute([(int) $auth['id']]);
        $updated = $stmt->fetch();
        if ($updated) {
            setAdminSession($updated);
        }
        jsonResponse($updated ?: []);
    }

    if ($path === '/api/admin/profile/password' && $method === 'PATCH') {
        $auth = requireAdmin();
        $currentPassword = (string) ($body['current_password'] ?? '');
        $newPassword = (string) ($body['new_password'] ?? '');
        if ($currentPassword === '' || strlen($newPassword) < 6) {
            jsonResponse(['message' => 'Current password and new password (min 6 chars) are required'], 422);
        }
        $stmt = $pdo->prepare('SELECT password FROM admins WHERE id = ? LIMIT 1');
        $stmt->execute([(int) $auth['id']]);
        $row = $stmt->fetch();
        if (!$row || !password_verify($currentPassword, (string) $row['password'])) {
            jsonResponse(['message' => 'Current password is incorrect'], 401);
        }
        $stmt = $pdo->prepare('UPDATE admins SET password = ? WHERE id = ?');
        $stmt->execute([password_hash($newPassword, PASSWORD_DEFAULT), (int) $auth['id']]);
        jsonResponse(['success' => true]);
    }

    if ($path === '/api/admin/profile/photo' && $method === 'POST') {
        $auth = requireAdmin();
        if (!isset($_FILES['image']) || !is_array($_FILES['image'])) {
            jsonResponse(['message' => 'Profile image is required'], 422);
        }
        $file = $_FILES['image'];
        $errorCode = (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE);
        if ($errorCode !== UPLOAD_ERR_OK) {
            jsonResponse(['message' => 'Profile image upload failed'], 422);
        }
        $tmpPath = (string) ($file['tmp_name'] ?? '');
        $originalName = (string) ($file['name'] ?? '');
        $size = (int) ($file['size'] ?? 0);
        if ($size <= 0 || $size > 5 * 1024 * 1024) {
            jsonResponse(['message' => 'Image must be between 1 byte and 5MB'], 422);
        }
        $extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
        $allowed = ['jpg', 'jpeg', 'png', 'webp'];
        if (!in_array($extension, $allowed, true)) {
            jsonResponse(['message' => 'Only jpg, jpeg, png, webp files are allowed'], 422);
        }
        $uploadDir = __DIR__ . '/uploads/admins';
        if (!is_dir($uploadDir) && !mkdir($uploadDir, 0777, true) && !is_dir($uploadDir)) {
            jsonResponse(['message' => 'Failed to create upload directory'], 500);
        }
        $filename = 'admin_' . (int) $auth['id'] . '_' . time() . '_' . bin2hex(random_bytes(3)) . '.' . $extension;
        $targetPath = $uploadDir . '/' . $filename;
        if (!move_uploaded_file($tmpPath, $targetPath)) {
            jsonResponse(['message' => 'Failed to store uploaded image'], 500);
        }
        $relativePath = '/uploads/admins/' . $filename;
        $stmt = $pdo->prepare('UPDATE admins SET profile_image = ? WHERE id = ?');
        $stmt->execute([$relativePath, (int) $auth['id']]);
        jsonResponse(['profile_image' => $relativePath]);
    }

    if ($path === '/api/customer/register' && $method === 'POST') {
        $name = trim((string) ($body['name'] ?? ''));
        $email = trim((string) ($body['email'] ?? ''));
        $phone = trim((string) ($body['phone'] ?? ''));
        $password = (string) ($body['password'] ?? '');
        $confirmPassword = (string) ($body['confirm_password'] ?? '');
        if ($name === '' || $email === '' || $phone === '' || $password === '') {
            jsonResponse(['message' => 'All fields are required'], 422);
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            jsonResponse(['message' => 'Invalid email'], 422);
        }
        if ($password !== $confirmPassword) {
            jsonResponse(['message' => 'Password and confirm password do not match'], 422);
        }
        if (strlen($password) < 6) {
            jsonResponse(['message' => 'Password must be at least 6 characters'], 422);
        }
        $dup = $pdo->prepare('SELECT id FROM customers WHERE email = ? LIMIT 1');
        $dup->execute([$email]);
        if ($dup->fetch()) {
            jsonResponse(['message' => 'Email is already registered'], 422);
        }
        $stmt = $pdo->prepare('INSERT INTO customers (name, email, phone, password, last_login) VALUES (?, ?, ?, ?, NOW())');
        $stmt->execute([$name, $email, $phone, password_hash($password, PASSWORD_DEFAULT)]);
        $id = (int) $pdo->lastInsertId();
        $rowStmt = $pdo->prepare('SELECT id, name, email, phone, created_at, last_login FROM customers WHERE id = ? LIMIT 1');
        $rowStmt->execute([$id]);
        $customer = $rowStmt->fetch();
        if ($customer) {
            setCustomerSession($customer);
        }
        jsonResponse(['customer' => $customer], 201);
    }

    if ($path === '/api/customer/login' && $method === 'POST') {
        $email = trim((string) ($body['email'] ?? ''));
        $password = (string) ($body['password'] ?? '');
        if ($email === '' || $password === '') {
            jsonResponse(['message' => 'Email and password are required'], 422);
        }
        $stmt = $pdo->prepare('SELECT id, name, email, phone, password, created_at, last_login FROM customers WHERE email = ? LIMIT 1');
        $stmt->execute([$email]);
        $customer = $stmt->fetch();
        if (!$customer || !password_verify($password, (string) $customer['password'])) {
            jsonResponse(['message' => 'Invalid email or password'], 401);
        }
        $pdo->prepare('UPDATE customers SET last_login = NOW() WHERE id = ?')->execute([(int) $customer['id']]);
        $customer['last_login'] = date('Y-m-d H:i:s');
        setCustomerSession($customer);
        unset($customer['password']);
        jsonResponse(['customer' => $customer]);
    }

    if ($path === '/api/customer/logout' && $method === 'POST') {
        clearAuthSession();
        jsonResponse(['success' => true]);
    }

    if ($path === '/api/customer/me' && $method === 'GET') {
        $customer = requireCustomer();
        $stmt = $pdo->prepare('SELECT id, name, email, phone, created_at, last_login FROM customers WHERE id = ? LIMIT 1');
        $stmt->execute([(int) $customer['id']]);
        $row = $stmt->fetch();
        if (!$row) {
            jsonResponse(['message' => 'Customer not found'], 404);
        }
        jsonResponse($row);
    }

    if ($path === '/api/customer/profile' && $method === 'PUT') {
        $customer = requireCustomer();
        $name = trim((string) ($body['name'] ?? ''));
        $phone = trim((string) ($body['phone'] ?? ''));
        if ($name === '' || $phone === '') {
            jsonResponse(['message' => 'Name and phone are required'], 422);
        }
        $stmt = $pdo->prepare('UPDATE customers SET name = ?, phone = ? WHERE id = ?');
        $stmt->execute([$name, $phone, (int) $customer['id']]);
        $stmt = $pdo->prepare('SELECT id, name, email, phone, created_at, last_login FROM customers WHERE id = ? LIMIT 1');
        $stmt->execute([(int) $customer['id']]);
        $row = $stmt->fetch();
        if ($row) {
            setCustomerSession($row);
        }
        jsonResponse($row ?: []);
    }

    if ($path === '/api/customer/password' && $method === 'PATCH') {
        $customer = requireCustomer();
        $currentPassword = (string) ($body['current_password'] ?? '');
        $newPassword = (string) ($body['new_password'] ?? '');
        if ($currentPassword === '' || strlen($newPassword) < 6) {
            jsonResponse(['message' => 'Current password and new password (min 6 chars) are required'], 422);
        }
        $stmt = $pdo->prepare('SELECT password FROM customers WHERE id = ? LIMIT 1');
        $stmt->execute([(int) $customer['id']]);
        $row = $stmt->fetch();
        if (!$row || !password_verify($currentPassword, (string) $row['password'])) {
            jsonResponse(['message' => 'Current password is incorrect'], 401);
        }
        $stmt = $pdo->prepare('UPDATE customers SET password = ? WHERE id = ?');
        $stmt->execute([password_hash($newPassword, PASSWORD_DEFAULT), (int) $customer['id']]);
        jsonResponse(['success' => true]);
    }

    if ($path === '/api/customer/orders' && $method === 'GET') {
        $customer = requireCustomer();
        $stmt = $pdo->prepare('SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC');
        $stmt->execute([(int) $customer['id']]);
        jsonResponse($stmt->fetchAll());
    }

    if ($path === '/api/categories' && $method === 'GET') {
        requireAdmin();
        $rows = $pdo->query('SELECT id, name FROM categories ORDER BY name')->fetchAll();
        jsonResponse($rows);
    }

    if ($path === '/api/attributes' && $method === 'GET') {
        requireAdmin();
        $rows = $pdo->query('SELECT id, name FROM attributes ORDER BY name')->fetchAll();
        jsonResponse($rows);
    }

    if ($path === '/api/attributes' && $method === 'POST') {
        requireAdmin();
        $name = trim((string) ($body['name'] ?? ''));
        if ($name === '') {
            jsonResponse(['message' => 'Attribute name is required'], 422);
        }
        $stmt = $pdo->prepare('INSERT INTO attributes (name) VALUES (?)');
        $stmt->execute([$name]);
        $id = (int) $pdo->lastInsertId();
        $row = $pdo->prepare('SELECT id, name FROM attributes WHERE id = ?');
        $row->execute([$id]);
        jsonResponse($row->fetch() ?: [], 201);
    }

    if (preg_match('#^/api/attributes/(\d+)$#', $path, $m) && $method === 'PUT') {
        requireAdmin();
        $id = (int) $m[1];
        $name = trim((string) ($body['name'] ?? ''));
        if ($name === '') {
            jsonResponse(['message' => 'Attribute name is required'], 422);
        }
        $stmt = $pdo->prepare('UPDATE attributes SET name = ? WHERE id = ?');
        $stmt->execute([$name, $id]);
        $row = $pdo->prepare('SELECT id, name FROM attributes WHERE id = ?');
        $row->execute([$id]);
        jsonResponse($row->fetch() ?: []);
    }

    if (preg_match('#^/api/attributes/(\d+)$#', $path, $m) && $method === 'DELETE') {
        requireAdmin();
        $id = (int) $m[1];
        $stmt = $pdo->prepare('DELETE FROM attributes WHERE id = ?');
        $stmt->execute([$id]);
        jsonResponse(['success' => true]);
    }

    if (preg_match('#^/api/attributes/(\d+)/terms$#', $path, $m) && $method === 'GET') {
        requireAdmin();
        $attributeId = (int) $m[1];
        $stmt = $pdo->prepare('SELECT id, attribute_id, term_name, quantity_value, unit FROM attribute_terms WHERE attribute_id = ? ORDER BY id DESC');
        $stmt->execute([$attributeId]);
        jsonResponse($stmt->fetchAll());
    }

    if (preg_match('#^/api/attributes/(\d+)/terms$#', $path, $m) && $method === 'POST') {
        requireAdmin();
        $attributeId = (int) $m[1];
        $quantityValueRaw = trim((string) ($body['quantity_value'] ?? ''));
        $unit = strtolower(trim((string) ($body['unit'] ?? '')));
        $termName = trim((string) ($body['term_name'] ?? ''));
        $quantityValue = $quantityValueRaw !== '' ? (float) $quantityValueRaw : null;

        if ($termName === '' && $quantityValue !== null && $unit !== '') {
            $termName = rtrim(rtrim((string) $quantityValueRaw, '0'), '.') . ' ' . $unit;
        }
        if ($termName === '') {
            jsonResponse(['message' => 'Term name is required'], 422);
        }
        $stmt = $pdo->prepare('INSERT INTO attribute_terms (attribute_id, term_name, quantity_value, unit) VALUES (?, ?, ?, ?)');
        $stmt->execute([$attributeId, $termName, $quantityValue, $unit !== '' ? $unit : null]);
        $id = (int) $pdo->lastInsertId();
        $row = $pdo->prepare('SELECT id, attribute_id, term_name, quantity_value, unit FROM attribute_terms WHERE id = ?');
        $row->execute([$id]);
        jsonResponse($row->fetch() ?: [], 201);
    }

    if (preg_match('#^/api/attribute-terms/(\d+)$#', $path, $m) && $method === 'PUT') {
        requireAdmin();
        $id = (int) $m[1];
        $quantityValueRaw = trim((string) ($body['quantity_value'] ?? ''));
        $unit = strtolower(trim((string) ($body['unit'] ?? '')));
        $termName = trim((string) ($body['term_name'] ?? ''));
        $quantityValue = $quantityValueRaw !== '' ? (float) $quantityValueRaw : null;

        if ($termName === '' && $quantityValue !== null && $unit !== '') {
            $termName = rtrim(rtrim((string) $quantityValueRaw, '0'), '.') . ' ' . $unit;
        }
        if ($termName === '') {
            jsonResponse(['message' => 'Term name is required'], 422);
        }
        $stmt = $pdo->prepare('UPDATE attribute_terms SET term_name = ?, quantity_value = ?, unit = ? WHERE id = ?');
        $stmt->execute([$termName, $quantityValue, $unit !== '' ? $unit : null, $id]);
        $row = $pdo->prepare('SELECT id, attribute_id, term_name, quantity_value, unit FROM attribute_terms WHERE id = ?');
        $row->execute([$id]);
        jsonResponse($row->fetch() ?: []);
    }

    if (preg_match('#^/api/attribute-terms/(\d+)$#', $path, $m) && $method === 'DELETE') {
        requireAdmin();
        $id = (int) $m[1];
        $stmt = $pdo->prepare('DELETE FROM attribute_terms WHERE id = ?');
        $stmt->execute([$id]);
        jsonResponse(['success' => true]);
    }

    if (preg_match('#^/api/products/(\d+)/variations$#', $path, $m) && $method === 'GET') {
        requireAdmin();
        $productId = (int) $m[1];
        $stmt = $pdo->prepare('
            SELECT
                pv.id,
                pv.product_id,
                pv.attribute_id,
                pv.term_id,
                pv.value,
                pv.quantity_value,
                pv.unit,
                pv.price,
                pv.stock,
                pv.sku,
                a.name AS attribute_name,
                t.term_name
            FROM product_variations pv
            JOIN attributes a ON a.id = pv.attribute_id
            JOIN attribute_terms t ON t.id = pv.term_id
            WHERE pv.product_id = ?
            ORDER BY a.name, t.term_name, pv.value
        ');
        $stmt->execute([$productId]);
        jsonResponse($stmt->fetchAll());
    }

    if (preg_match('#^/api/products/(\d+)/variations$#', $path, $m) && $method === 'PUT') {
        requireAdmin();
        $productId = (int) $m[1];
        $variations = $body['variations'] ?? [];
        if (!is_array($variations)) {
            jsonResponse(['message' => 'Variations must be an array'], 422);
        }

        $pdo->beginTransaction();
        $deleteStmt = $pdo->prepare('DELETE FROM product_variations WHERE product_id = ?');
        $deleteStmt->execute([$productId]);

        if (count($variations) > 0) {
            $insertStmt = $pdo->prepare('
                INSERT INTO product_variations (product_id, attribute_id, term_id, value, quantity_value, unit, price, stock, sku)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ');
            foreach ($variations as $variation) {
                $attributeId = (int) ($variation['attribute_id'] ?? 0);
                $termId = (int) ($variation['term_id'] ?? 0);
                $value = trim((string) ($variation['value'] ?? ''));
                $quantityValueRaw = trim((string) ($variation['quantity_value'] ?? ''));
                $quantityValue = $quantityValueRaw !== '' ? (float) $quantityValueRaw : null;
                $unit = strtolower(trim((string) ($variation['unit'] ?? '')));
                $price = (float) ($variation['price'] ?? 0);
                $stock = (int) ($variation['stock'] ?? 0);
                $sku = trim((string) ($variation['sku'] ?? ''));

                if ($value === '' && $quantityValue !== null && $unit !== '') {
                    $value = rtrim(rtrim((string) $quantityValueRaw, '0'), '.') . ' ' . $unit;
                }

                if ($attributeId <= 0 || $termId <= 0 || $value === '') {
                    $pdo->rollBack();
                    jsonResponse(['message' => 'Each variation requires attribute, term and value'], 422);
                }

                $insertStmt->execute([
                    $productId,
                    $attributeId,
                    $termId,
                    $value,
                    $quantityValue,
                    $unit !== '' ? $unit : null,
                    $price,
                    $stock,
                    $sku !== '' ? $sku : null,
                ]);
            }
        }

        $pdo->commit();
        jsonResponse(['success' => true]);
    }

    if ($path === '/api/public/products' && $method === 'GET') {
        $rows = $pdo->query('
            SELECT
                p.id,
                p.name,
                p.description,
                p.image_url,
                p.price,
                p.stock_quantity,
                p.unit,
                p.hsn_code,
                p.gst_rate,
                c.name AS category
            FROM products p
            JOIN categories c ON c.id = p.category_id
            WHERE p.is_active = 1
            ORDER BY p.created_at DESC
        ')->fetchAll();
        jsonResponse($rows);
    }

    if (preg_match('#^/api/public/products/(\d+)$#', $path, $m) && $method === 'GET') {
        $id = (int) $m[1];
        $stmt = $pdo->prepare('
            SELECT
                p.id,
                p.name,
                p.description,
                p.image_url,
                p.price,
                p.stock_quantity,
                p.unit,
                p.hsn_code,
                p.gst_rate,
                c.name AS category
            FROM products p
            JOIN categories c ON c.id = p.category_id
            WHERE p.id = ? AND p.is_active = 1
            LIMIT 1
        ');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) {
            jsonResponse(['message' => 'Product not found'], 404);
        }

        $variationStmt = $pdo->prepare('
            SELECT
                pv.id,
                pv.attribute_id,
                pv.term_id,
                pv.value,
                pv.quantity_value,
                pv.unit,
                pv.price,
                pv.stock,
                pv.sku,
                a.name AS attribute_name,
                t.term_name
            FROM product_variations pv
            JOIN attributes a ON a.id = pv.attribute_id
            JOIN attribute_terms t ON t.id = pv.term_id
            WHERE pv.product_id = ?
            ORDER BY a.name, t.term_name, pv.value
        ');
        $variationStmt->execute([$id]);
        $row['variations'] = $variationStmt->fetchAll();
        jsonResponse($row);
    }

    if ($path === '/api/uploads' && $method === 'POST') {
        requireAdmin();

        if (!isset($_FILES['image']) || !is_array($_FILES['image'])) {
            jsonResponse(['message' => 'Image file is required'], 422);
        }

        $file = $_FILES['image'];
        $errorCode = (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE);
        if ($errorCode !== UPLOAD_ERR_OK) {
            jsonResponse(['message' => 'Image upload failed'], 422);
        }

        $tmpPath = (string) ($file['tmp_name'] ?? '');
        $originalName = (string) ($file['name'] ?? '');
        $size = (int) ($file['size'] ?? 0);

        if ($size <= 0 || $size > 5 * 1024 * 1024) {
            jsonResponse(['message' => 'Image must be between 1 byte and 5MB'], 422);
        }

        $extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
        $allowed = ['jpg', 'jpeg', 'png', 'webp'];
        if (!in_array($extension, $allowed, true)) {
            jsonResponse(['message' => 'Only jpg, jpeg, png, webp files are allowed'], 422);
        }

        $uploadDir = __DIR__ . '/uploads';
        if (!is_dir($uploadDir) && !mkdir($uploadDir, 0777, true) && !is_dir($uploadDir)) {
            jsonResponse(['message' => 'Failed to create upload directory'], 500);
        }

        $filename = 'product_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $extension;
        $targetPath = $uploadDir . '/' . $filename;
        if (!move_uploaded_file($tmpPath, $targetPath)) {
            jsonResponse(['message' => 'Failed to store uploaded image'], 500);
        }

        $baseUrl = rtrim((string) env('APP_URL', ''), '/');
        $imageUrl = $baseUrl !== '' ? ($baseUrl . '/uploads/' . $filename) : ('/uploads/' . $filename);
        jsonResponse(['image_url' => $imageUrl], 201);
    }

    if ($path === '/api/dashboard/overview' && $method === 'GET') {
        requireAdmin();
        $totalProducts = (int) $pdo->query('SELECT COUNT(*) FROM products')->fetchColumn();
        $totalOrders = (int) $pdo->query('SELECT COUNT(*) FROM orders')->fetchColumn();
        $totalCustomers = (int) $pdo->query('SELECT COUNT(*) FROM customers')->fetchColumn();
        $totalRevenue = (float) $pdo->query("SELECT COALESCE(SUM(total_amount),0) FROM orders WHERE payment_status = 'Paid'")->fetchColumn();
        $totalFarmStay = (int) $pdo->query('SELECT COUNT(*) FROM farm_stay_inquiries')->fetchColumn();
        $recentOrders = $pdo->query('SELECT * FROM orders ORDER BY created_at DESC LIMIT 10')->fetchAll();

        jsonResponse([
            'totalProducts' => $totalProducts,
            'totalOrders' => $totalOrders,
            'totalCustomers' => $totalCustomers,
            'totalRevenue' => $totalRevenue,
            'totalFarmStayInquiries' => $totalFarmStay,
            'recentOrders' => $recentOrders,
        ]);
    }

    if ($path === '/api/products' && $method === 'GET') {
        requireAdmin();
        $rows = $pdo->query('
            SELECT p.*, c.name AS category_name
            FROM products p
            JOIN categories c ON c.id = p.category_id
            ORDER BY p.created_at DESC
        ')->fetchAll();
        jsonResponse($rows);
    }

    if ($path === '/api/products' && $method === 'POST') {
        requireAdmin();
        $stmt = $pdo->prepare('
            INSERT INTO products (name, category_id, description, image_url, price, stock_quantity, unit, hsn_code, gst_rate, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        ');
        $stmt->execute([
            trim((string) ($body['name'] ?? '')),
            (int) ($body['category_id'] ?? 0),
            trim((string) ($body['description'] ?? '')),
            trim((string) ($body['image_url'] ?? '')),
            (float) ($body['price'] ?? 0),
            (int) ($body['stock_quantity'] ?? 0),
            trim((string) ($body['unit'] ?? '')),
            trim((string) ($body['hsn_code'] ?? '')),
            (float) ($body['gst_rate'] ?? 0),
        ]);
        $id = (int) $pdo->lastInsertId();
        $row = $pdo->query("SELECT p.*, c.name AS category_name FROM products p JOIN categories c ON c.id = p.category_id WHERE p.id = {$id}")->fetch();
        jsonResponse($row ?: [], 201);
    }

    if (preg_match('#^/api/products/(\d+)$#', $path, $m) && $method === 'PUT') {
        requireAdmin();
        $id = (int) $m[1];
        $stmt = $pdo->prepare('
            UPDATE products
            SET name = ?, category_id = ?, description = ?, image_url = ?, price = ?, stock_quantity = ?, unit = ?, hsn_code = ?, gst_rate = ?
            WHERE id = ?
        ');
        $stmt->execute([
            trim((string) ($body['name'] ?? '')),
            (int) ($body['category_id'] ?? 0),
            trim((string) ($body['description'] ?? '')),
            trim((string) ($body['image_url'] ?? '')),
            (float) ($body['price'] ?? 0),
            (int) ($body['stock_quantity'] ?? 0),
            trim((string) ($body['unit'] ?? '')),
            trim((string) ($body['hsn_code'] ?? '')),
            (float) ($body['gst_rate'] ?? 0),
            $id,
        ]);
        $row = $pdo->query("SELECT p.*, c.name AS category_name FROM products p JOIN categories c ON c.id = p.category_id WHERE p.id = {$id}")->fetch();
        jsonResponse($row ?: []);
    }

    if (preg_match('#^/api/products/(\d+)/stock$#', $path, $m) && $method === 'PATCH') {
        requireAdmin();
        $id = (int) $m[1];
        $stmt = $pdo->prepare('UPDATE products SET stock_quantity = ? WHERE id = ?');
        $stmt->execute([(int) ($body['stock_quantity'] ?? 0), $id]);
        $row = $pdo->query("SELECT p.*, c.name AS category_name FROM products p JOIN categories c ON c.id = p.category_id WHERE p.id = {$id}")->fetch();
        jsonResponse($row ?: []);
    }

    if (preg_match('#^/api/products/(\d+)$#', $path, $m) && $method === 'DELETE') {
        requireAdmin();
        $id = (int) $m[1];
        $stmt = $pdo->prepare('DELETE FROM products WHERE id = ?');
        $stmt->execute([$id]);
        jsonResponse(['success' => true]);
    }

    if ($path === '/api/orders' && $method === 'GET') {
        requireAdmin();
        $rows = $pdo->query('SELECT * FROM orders ORDER BY created_at DESC')->fetchAll();
        jsonResponse($rows);
    }

    if (preg_match('#^/api/orders/(\d+)$#', $path, $m) && $method === 'GET') {
        requireAdmin();
        $id = (int) $m[1];
        $stmt = $pdo->prepare('SELECT * FROM orders WHERE id = ?');
        $stmt->execute([$id]);
        $order = $stmt->fetch();
        if (!$order) {
            jsonResponse(['message' => 'Order not found'], 404);
        }
        $itemsStmt = $pdo->prepare('
            SELECT
                id,
                product_id,
                variation_id,
                attribute_name,
                term_name,
                variation_value,
                quantity_value,
                unit,
                sku,
                product_name,
                quantity,
                unit_price,
                total_price
            FROM order_items
            WHERE order_id = ?
        ');
        $itemsStmt->execute([$id]);
        $order['items'] = $itemsStmt->fetchAll();
        jsonResponse($order);
    }

    if (preg_match('#^/api/orders/(\d+)/status$#', $path, $m) && $method === 'PATCH') {
        requireAdmin();
        $id = (int) $m[1];
        $status = (string) ($body['order_status'] ?? 'Pending');
        $allowed = ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'];
        if (!in_array($status, $allowed, true)) {
            jsonResponse(['message' => 'Invalid order status'], 422);
        }
        $stmt = $pdo->prepare('UPDATE orders SET order_status = ? WHERE id = ?');
        $stmt->execute([$status, $id]);
        $stmt = $pdo->prepare('SELECT * FROM orders WHERE id = ?');
        $stmt->execute([$id]);
        jsonResponse($stmt->fetch() ?: []);
    }

    if ($path === '/api/admin/customers' && $method === 'GET') {
        requireAdmin();
        $search = trim((string) ($_GET['search'] ?? ''));
        if ($search !== '') {
            $like = '%' . $search . '%';
            $stmt = $pdo->prepare('
                SELECT id, name, email, phone, created_at, last_login
                FROM customers
                WHERE name LIKE ? OR email LIKE ? OR phone LIKE ?
                ORDER BY created_at DESC
            ');
            $stmt->execute([$like, $like, $like]);
            jsonResponse($stmt->fetchAll());
        }
        $rows = $pdo->query('SELECT id, name, email, phone, created_at, last_login FROM customers ORDER BY created_at DESC')->fetchAll();
        jsonResponse($rows);
    }

    if (preg_match('#^/api/admin/customers/(\d+)$#', $path, $m) && $method === 'DELETE') {
        requireAdmin();
        $customerId = (int) $m[1];
        $stmt = $pdo->prepare('DELETE FROM customers WHERE id = ?');
        $stmt->execute([$customerId]);
        jsonResponse(['success' => true]);
    }

    if (preg_match('#^/api/admin/customers/(\d+)/orders$#', $path, $m) && $method === 'GET') {
        requireAdmin();
        $customerId = (int) $m[1];
        $stmt = $pdo->prepare('SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC');
        $stmt->execute([$customerId]);
        jsonResponse($stmt->fetchAll());
    }

    if ($path === '/api/orders' && $method === 'POST') {
        $items = $body['items'] ?? [];
        if (!is_array($items) || count($items) === 0) {
            jsonResponse(['message' => 'Order items are required'], 422);
        }
        $customerSession = authCustomer();
        $customerId = $customerSession ? (int) ($customerSession['id'] ?? 0) : null;

        $pdo->beginTransaction();
        $stmt = $pdo->prepare('
            INSERT INTO orders (
                customer_id,
                customer_name, customer_email, customer_phone, customer_address, customer_pincode,
                total_amount, payment_status, order_status, razorpay_order_id, razorpay_payment_id, razorpay_signature
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ');
        $stmt->execute([
            $customerId && $customerId > 0 ? $customerId : null,
            trim((string) ($body['customer_name'] ?? '')),
            trim((string) ($body['customer_email'] ?? '')),
            trim((string) ($body['customer_phone'] ?? '')),
            trim((string) ($body['customer_address'] ?? '')),
            trim((string) ($body['customer_pincode'] ?? '')),
            (float) ($body['total_amount'] ?? 0),
            (string) ($body['payment_status'] ?? 'Pending'),
            (string) ($body['order_status'] ?? 'Pending'),
            (string) ($body['razorpay_order_id'] ?? ''),
            (string) ($body['razorpay_payment_id'] ?? ''),
            (string) ($body['razorpay_signature'] ?? ''),
        ]);
        $orderId = (int) $pdo->lastInsertId();

        $itemStmt = $pdo->prepare('
            INSERT INTO order_items (
                order_id,
                product_id,
                variation_id,
                attribute_name,
                term_name,
                variation_value,
                quantity_value,
                unit,
                sku,
                product_name,
                quantity,
                unit_price,
                total_price
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ');
        foreach ($items as $item) {
            $qty = (int) ($item['quantity'] ?? 1);
            $unitPrice = (float) ($item['unit_price'] ?? 0);
            $variationId = isset($item['variation_id']) ? (int) $item['variation_id'] : null;
            $attributeName = trim((string) ($item['attribute_name'] ?? ''));
            $termName = trim((string) ($item['term_name'] ?? ''));
            $variationValue = trim((string) ($item['variation_value'] ?? ''));
            $quantityValueRaw = trim((string) ($item['quantity_value'] ?? ''));
            $quantityValue = $quantityValueRaw !== '' ? (float) $quantityValueRaw : null;
            $unit = strtolower(trim((string) ($item['unit'] ?? '')));
            $sku = trim((string) ($item['sku'] ?? ''));
            $itemStmt->execute([
                $orderId,
                isset($item['product_id']) ? (int) $item['product_id'] : null,
                $variationId,
                $attributeName !== '' ? $attributeName : null,
                $termName !== '' ? $termName : null,
                $variationValue !== '' ? $variationValue : null,
                $quantityValue,
                $unit !== '' ? $unit : null,
                $sku !== '' ? $sku : null,
                trim((string) ($item['product_name'] ?? '')),
                $qty,
                $unitPrice,
                $qty * $unitPrice,
            ]);
            if ($variationId !== null && $variationId > 0) {
                $variationStockStmt = $pdo->prepare('UPDATE product_variations SET stock = GREATEST(stock - ?, 0) WHERE id = ?');
                $variationStockStmt->execute([$qty, $variationId]);
            } elseif (isset($item['product_id'])) {
                $stockStmt = $pdo->prepare('UPDATE products SET stock_quantity = GREATEST(stock_quantity - ?, 0) WHERE id = ?');
                $stockStmt->execute([$qty, (int) $item['product_id']]);
            }
        }
        $pdo->commit();
        jsonResponse(['id' => $orderId, 'message' => 'Order stored'], 201);
    }

    if (preg_match('#^/api/orders/(\d+)/payment-verify$#', $path, $m) && $method === 'POST') {
        $id = (int) $m[1];
        $razorpayOrderId = (string) ($body['razorpay_order_id'] ?? '');
        $razorpayPaymentId = (string) ($body['razorpay_payment_id'] ?? '');
        $razorpaySignature = (string) ($body['razorpay_signature'] ?? '');
        $secret = env('RAZORPAY_KEY_SECRET', '');

        $generated = hash_hmac('sha256', $razorpayOrderId . '|' . $razorpayPaymentId, $secret);
        $isValid = $secret !== '' && hash_equals($generated, $razorpaySignature);

        $paymentStatus = $isValid ? 'Paid' : 'Failed';
        $stmt = $pdo->prepare('
            UPDATE orders
            SET payment_status = ?, razorpay_order_id = ?, razorpay_payment_id = ?, razorpay_signature = ?
            WHERE id = ?
        ');
        $stmt->execute([$paymentStatus, $razorpayOrderId, $razorpayPaymentId, $razorpaySignature, $id]);
        jsonResponse(['verified' => $isValid, 'payment_status' => $paymentStatus]);
    }

    if ($path === '/api/farm-stay-inquiries' && $method === 'GET') {
        requireAdmin();
        $rows = $pdo->query('SELECT * FROM farm_stay_inquiries ORDER BY created_at DESC')->fetchAll();
        jsonResponse($rows);
    }

    if ($path === '/api/farm-stay-inquiries' && $method === 'POST') {
        $stmt = $pdo->prepare('
            INSERT INTO farm_stay_inquiries (
                full_name, phone, email, check_in_date, check_out_date, people_count, message, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, "New")
        ');
        $stmt->execute([
            trim((string) ($body['full_name'] ?? '')),
            trim((string) ($body['phone'] ?? '')),
            trim((string) ($body['email'] ?? '')),
            (string) ($body['check_in_date'] ?? ''),
            (string) ($body['check_out_date'] ?? ''),
            (int) ($body['people_count'] ?? 1),
            trim((string) ($body['message'] ?? '')),
        ]);
        jsonResponse(['success' => true], 201);
    }

    if (preg_match('#^/api/farm-stay-inquiries/(\d+)/status$#', $path, $m) && $method === 'PATCH') {
        requireAdmin();
        $id = (int) $m[1];
        $status = (string) ($body['status'] ?? 'New');
        $allowed = ['New', 'Confirmed', 'Completed', 'Cancelled'];
        if (!in_array($status, $allowed, true)) {
            jsonResponse(['message' => 'Invalid status'], 422);
        }
        $stmt = $pdo->prepare('UPDATE farm_stay_inquiries SET status = ? WHERE id = ?');
        $stmt->execute([$status, $id]);
        $stmt = $pdo->prepare('SELECT * FROM farm_stay_inquiries WHERE id = ?');
        $stmt->execute([$id]);
        jsonResponse($stmt->fetch() ?: []);
    }

    jsonResponse(['message' => 'Route not found'], 404);
} catch (Throwable $e) {
    jsonResponse(['message' => $e->getMessage()], 500);
}

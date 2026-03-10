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

function fileUploadErrorMessage(int $errorCode, string $missingFileMessage = 'Image file is required'): string
{
    return match ($errorCode) {
        UPLOAD_ERR_INI_SIZE => 'Image upload failed: file exceeds server upload_max_filesize limit',
        UPLOAD_ERR_FORM_SIZE => 'Image upload failed: file exceeds form size limit',
        UPLOAD_ERR_PARTIAL => 'Image upload failed: file was only partially uploaded',
        UPLOAD_ERR_NO_FILE => $missingFileMessage,
        UPLOAD_ERR_NO_TMP_DIR => 'Image upload failed: temporary upload directory is missing on server',
        UPLOAD_ERR_CANT_WRITE => 'Image upload failed: cannot write file to disk',
        UPLOAD_ERR_EXTENSION => 'Image upload failed: blocked by a PHP extension',
        default => 'Image upload failed',
    };
}

function uploadBaseDirectory(): string
{
    $configured = trim((string) env('UPLOAD_DIR', ''));
    if ($configured !== '') {
        return rtrim($configured, '/\\');
    }
    return __DIR__ . '/uploads';
}

function ensureDirectoryWritable(string $directory): void
{
    if (!is_dir($directory) && !mkdir($directory, 0775, true) && !is_dir($directory)) {
        jsonResponse(['message' => 'Failed to create upload directory: ' . $directory], 500);
    }
    if (!is_writable($directory)) {
        jsonResponse(['message' => 'Upload directory is not writable: ' . $directory], 500);
    }
}

function apiOriginFromRequest(): string
{
    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = trim((string) ($_SERVER['HTTP_HOST'] ?? ''));
    if ($host === '') {
        return '';
    }
    $scriptName = (string) ($_SERVER['SCRIPT_NAME'] ?? '');
    $basePath = rtrim(str_replace('\\', '/', dirname($scriptName)), '/.');
    return $scheme . '://' . $host . ($basePath !== '' ? $basePath : '');
}

function buildUploadUrl(string $relativePath): string
{
    $relativePath = '/' . ltrim($relativePath, '/');
    $publicBase = rtrim((string) env('UPLOAD_PUBLIC_BASE_URL', ''), '/');
    if ($publicBase !== '') {
        return $publicBase . $relativePath;
    }
    $appUrl = rtrim((string) env('APP_URL', ''), '/');
    if ($appUrl !== '') {
        return $appUrl . $relativePath;
    }
    $requestBase = rtrim(apiOriginFromRequest(), '/');
    if ($requestBase !== '') {
        return $requestBase . $relativePath;
    }
    return $relativePath;
}

function sendOwnerOrderNotification(int $orderId, array $orderPayload, array $items): void
{
    $ownerEmail = trim((string) env('ORDER_NOTIFICATION_EMAIL', 'rushivanagro@gmail.com'));
    if ($ownerEmail === '') {
        return;
    }

    $customerName = trim((string) ($orderPayload['customer_name'] ?? ''));
    $customerEmail = trim((string) ($orderPayload['customer_email'] ?? ''));
    $customerPhone = trim((string) ($orderPayload['customer_phone'] ?? ''));
    $customerAddress = trim((string) ($orderPayload['customer_address'] ?? ''));
    $customerPincode = trim((string) ($orderPayload['customer_pincode'] ?? ''));
    $totalAmount = number_format((float) ($orderPayload['total_amount'] ?? 0), 2, '.', '');
    $paymentStatus = trim((string) ($orderPayload['payment_status'] ?? 'Pending'));
    $paymentMethod = trim((string) ($orderPayload['payment_method'] ?? 'Online'));
    $orderDate = date('d M Y, h:i A');

    $itemLines = [];
    foreach ($items as $item) {
        $name = trim((string) ($item['product_name'] ?? 'Product'));
        $qty = (int) ($item['quantity'] ?? 1);
        $price = (float) ($item['unit_price'] ?? 0);
        $itemLines[] = sprintf('- %s | Qty: %d | Unit Price: %.2f', $name, $qty, $price);
    }
    $itemsText = count($itemLines) > 0 ? implode("\n", $itemLines) : '- No items';

    $subject = sprintf('New Order Received – Order #%d', $orderId);
    $message = implode("\n", [
        'Hello Admin,',
        '',
        'A new order has been placed on the website.',
        '',
        'Order ID: ' . $orderId,
        'Order Date: ' . $orderDate,
        'Total Amount: Rs ' . $totalAmount,
        'Payment Method: ' . ($paymentMethod !== '' ? $paymentMethod : 'Online'),
        'Payment Status: ' . ($paymentStatus !== '' ? $paymentStatus : 'Pending'),
        '',
        'Customer Details:',
        'Name: ' . ($customerName !== '' ? $customerName : 'N/A'),
        'Email: ' . ($customerEmail !== '' ? $customerEmail : 'N/A'),
        'Phone: ' . ($customerPhone !== '' ? $customerPhone : 'N/A'),
        'Address: ' . ($customerAddress !== '' ? $customerAddress : 'N/A'),
        'Pincode: ' . ($customerPincode !== '' ? $customerPincode : 'N/A'),
        '',
        'Order Details:',
        $itemsText,
        '',
        'Please process the order and arrange shipment.',
        '',
        'Regards,',
        'Website Order System',
    ]);

    $fromEmail = trim((string) env('MAIL_FROM', 'noreply@rushivanagro.com'));
    $headers = [
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'From: Rushivan Agro <' . $fromEmail . '>',
    ];

    try {
        sendEmail($ownerEmail, $subject, $message, $headers);
    } catch (Throwable $e) {
        // Do not fail checkout if email service is unavailable.
    }
}

function sendCustomerOrderConfirmation(int $orderId, string $invoiceId, array $orderPayload, array $items): void
{
    $customerEmail = trim((string) ($orderPayload['customer_email'] ?? ''));
    if ($customerEmail === '') {
        return;
    }

    $customerName = trim((string) ($orderPayload['customer_name'] ?? 'Customer'));
    $customerPhone = trim((string) ($orderPayload['customer_phone'] ?? ''));
    $customerAddress = trim((string) ($orderPayload['customer_address'] ?? ''));
    $customerPincode = trim((string) ($orderPayload['customer_pincode'] ?? ''));
    $totalAmount = number_format((float) ($orderPayload['total_amount'] ?? 0), 2, '.', '');
    $paymentStatus = trim((string) ($orderPayload['payment_status'] ?? 'Pending'));
    $paymentLine = strcasecmp($paymentStatus, 'Paid') === 0
        ? 'Payment Status: Paid (Payment successful)'
        : 'Payment Status: ' . ($paymentStatus !== '' ? $paymentStatus : 'Pending');
    $orderDate = date('d M Y, h:i A');

    $itemLines = [];
    foreach ($items as $item) {
        $name = trim((string) ($item['product_name'] ?? 'Product'));
        $qty = (int) ($item['quantity'] ?? 1);
        $price = (float) ($item['unit_price'] ?? 0);
        $itemLines[] = sprintf('- %s | Qty: %d | Unit Price: %.2f', $name, $qty, $price);
    }
    $itemsText = count($itemLines) > 0 ? implode("\n", $itemLines) : '- No items';

    $trackingNumber = trim((string) ($orderPayload['tracking_number'] ?? ''));
    $trackingUrl = trim((string) ($orderPayload['tracking_url'] ?? ''));
    $websiteUrl = rtrim((string) env('WEBSITE_URL', 'https://www.rushivanagro.com'), '/');
    $trackLink = $trackingUrl !== '' ? $trackingUrl : ($websiteUrl !== '' ? $websiteUrl . '/track-order' : '');
    $subject = sprintf('Your Order is Confirmed – Order #%d', $orderId);
    $message = implode("\n", [
        'Dear ' . ($customerName !== '' ? $customerName : 'Customer') . ',',
        '',
        'Thank you for shopping with us! Your order has been successfully placed.',
        '',
        'Order Details:',
        'Order ID: #' . $orderId,
        'Order Date: ' . $orderDate,
        $paymentLine,
        'Total Amount: Rs ' . $totalAmount,
        '',
        'Product Details:',
        $itemsText,
        '',
        'Tracking Information:',
        'Tracking Number: ' . ($trackingNumber !== '' ? $trackingNumber : 'Not available yet'),
        $trackLink !== '' ? ('Track Order: ' . $trackLink) : 'Tracking link will be shared once the order is shipped.',
        '',
        'Your order is now being processed. You will receive another email once your order is shipped.',
        '',
        'Regards,',
        'Rushivan Agro',
    ]);

    $fromEmail = trim((string) env('MAIL_FROM', 'noreply@rushivanagro.com'));
    $headers = [
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'From: Rushivan Agro <' . $fromEmail . '>',
    ];

    try {
        sendEmail($customerEmail, $subject, $message, $headers);
    } catch (Throwable $e) {
        // Do not fail checkout if email service is unavailable.
    }
}

function httpBuildQuerySafe(array $params): string
{
    return http_build_query($params, '', '&', PHP_QUERY_RFC3986);
}

function razorpayApiRequest(string $method, string $endpoint, array $payload = []): array
{
    $keyId = trim((string) env('RAZORPAY_KEY_ID', ''));
    $keySecret = trim((string) env('RAZORPAY_KEY_SECRET', ''));
    if ($keyId === '' || $keySecret === '') {
        jsonResponse(['message' => 'Razorpay credentials are not configured on server'], 500);
    }

    $url = 'https://api.razorpay.com/v1/' . ltrim($endpoint, '/');
    $ch = curl_init();
    if ($ch === false) {
        jsonResponse(['message' => 'Unable to initialize payment gateway request'], 500);
    }

    $headers = ['Accept: application/json'];
    $normalizedMethod = strtoupper($method);

    if ($normalizedMethod === 'GET' && count($payload) > 0) {
        $url .= '?' . httpBuildQuerySafe($payload);
    } elseif ($normalizedMethod !== 'GET') {
        $headers[] = 'Content-Type: application/json';
    }

    curl_setopt_array($ch, [
        CURLOPT_URL => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_USERPWD => $keyId . ':' . $keySecret,
        CURLOPT_HTTPAUTH => CURLAUTH_BASIC,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_CUSTOMREQUEST => $normalizedMethod,
        CURLOPT_TIMEOUT => 20,
    ]);

    if ($normalizedMethod !== 'GET') {
        curl_setopt($ch, CURLOPT_POSTFIELDS, (string) json_encode($payload));
    }

    $raw = curl_exec($ch);
    $curlError = curl_error($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($raw === false) {
        jsonResponse(['message' => $curlError !== '' ? $curlError : 'Payment gateway request failed'], 502);
    }

    $decoded = json_decode((string) $raw, true);
    if (!is_array($decoded)) {
        jsonResponse(['message' => 'Unexpected response from payment gateway'], 502);
    }

    if ($status >= 400) {
        $error = $decoded['error'] ?? [];
        $description = is_array($error) ? (string) ($error['description'] ?? 'Payment gateway error') : 'Payment gateway error';
        jsonResponse(['message' => $description], $status);
    }

    return $decoded;
}

function generateInvoiceId(int $orderId): string
{
    return 'INV-' . date('Ymd') . '-' . str_pad((string) $orderId, 6, '0', STR_PAD_LEFT);
}

function sendCustomerOrderStatusUpdate(int $orderId, array $orderData, array $items): void
{
    $customerEmail = trim((string) ($orderData['customer_email'] ?? ''));
    if ($customerEmail === '') {
        return;
    }

    $status = trim((string) ($orderData['order_status'] ?? 'Pending'));
    $subject = match ($status) {
        'Confirmed' => 'Your Order is Confirmed',
        'Processing' => 'Your Order is Being Prepared',
        'Ready to Ship' => 'Your Product is Ready to be Shipped',
        'Shipped' => 'Your Order Has Been Shipped',
        'Delivered' => 'Your Order Has Been Delivered',
        default => 'Order Status Update',
    };

    $trackingNumber = trim((string) ($orderData['tracking_number'] ?? ''));
    $trackingUrl = trim((string) ($orderData['tracking_url'] ?? ''));
    $customerName = trim((string) ($orderData['customer_name'] ?? 'Customer'));

    $itemLines = [];
    foreach ($items as $item) {
        $name = trim((string) ($item['product_name'] ?? 'Product'));
        $qty = (int) ($item['quantity'] ?? 1);
        $itemLines[] = sprintf('- %s | Qty: %d', $name, $qty);
    }
    $itemsText = count($itemLines) > 0 ? implode("\n", $itemLines) : '- No items';

    $message = implode("\n", [
        'Dear ' . ($customerName !== '' ? $customerName : 'Customer') . ',',
        '',
        'Your order status has been updated.',
        'Order ID: ' . $orderId,
        'Current Status: ' . ($status !== '' ? $status : 'Pending'),
        '',
        'Products:',
        $itemsText,
        '',
        'Tracking Number: ' . ($trackingNumber !== '' ? $trackingNumber : 'Not available yet'),
        'Tracking Link: ' . ($trackingUrl !== '' ? $trackingUrl : 'Not available yet'),
        '',
        'Thank you for shopping with Rushivan Agro.',
    ]);

    $fromEmail = trim((string) env('MAIL_FROM', 'noreply@rushivanagro.com'));
    $headers = [
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'From: Rushivan Agro <' . $fromEmail . '>',
    ];

    try {
        sendEmail($customerEmail, $subject, $message, $headers);
    } catch (Throwable $e) {
        // Do not fail status update if email service is unavailable.
    }
}

function slugify(string $text): string
{
    $text = strtolower(trim($text));
    $text = preg_replace('/[^a-z0-9]+/i', '-', $text) ?? '';
    $text = trim($text, '-');
    return $text !== '' ? $text : 'post';
}

function estimateReadTime(string $content): string
{
    $wordCount = str_word_count(strip_tags($content));
    $minutes = max(1, (int) ceil($wordCount / 200));
    return $minutes . ' min read';
}

function generateUniqueBlogSlug(PDO $pdo, string $title, ?int $excludeId = null): string
{
    $base = slugify($title);
    $candidate = $base;
    $suffix = 1;

    while (true) {
        if ($excludeId !== null) {
            $stmt = $pdo->prepare('SELECT id FROM blog_posts WHERE slug = ? AND id <> ? LIMIT 1');
            $stmt->execute([$candidate, $excludeId]);
        } else {
            $stmt = $pdo->prepare('SELECT id FROM blog_posts WHERE slug = ? LIMIT 1');
            $stmt->execute([$candidate]);
        }
        if (!$stmt->fetch()) {
            return $candidate;
        }
        $suffix++;
        $candidate = $base . '-' . $suffix;
    }
}

function productStatusFromStock(int $stockQty): string
{
    return $stockQty > 0 ? 'Active' : 'Out of Stock';
}

function createStockMovement(
    PDO $pdo,
    int $productId,
    ?int $variationId,
    ?int $orderId,
    string $movementType,
    int $quantityDelta,
    int $previousStock,
    int $newStock,
    ?string $note = null
): void {
    $stmt = $pdo->prepare('
        INSERT INTO stock_movements (
            product_id,
            variation_id,
            order_id,
            movement_type,
            quantity_delta,
            previous_stock,
            new_stock,
            note
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ');
    $stmt->execute([
        $productId,
        $variationId,
        $orderId,
        $movementType,
        $quantityDelta,
        $previousStock,
        $newStock,
        $note,
    ]);
}

try {
    ensureAuthSchema();
    ensureBootstrapAdmin();
    ensureBlogSchema();
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
            jsonResponse(['message' => fileUploadErrorMessage($errorCode, 'Profile image is required')], 422);
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
        $uploadDir = uploadBaseDirectory() . '/admins';
        ensureDirectoryWritable($uploadDir);
        $filename = 'admin_' . (int) $auth['id'] . '_' . time() . '_' . bin2hex(random_bytes(3)) . '.' . $extension;
        $targetPath = $uploadDir . '/' . $filename;
        if (!move_uploaded_file($tmpPath, $targetPath)) {
            jsonResponse(['message' => 'Failed to store uploaded image'], 500);
        }
        $relativePath = '/uploads/admins/' . $filename;
        $profileImageUrl = buildUploadUrl($relativePath);
        $stmt = $pdo->prepare('UPDATE admins SET profile_image = ? WHERE id = ?');
        $stmt->execute([$profileImageUrl, (int) $auth['id']]);
        jsonResponse(['profile_image' => $profileImageUrl]);
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
        $customerId = (int) ($customer['id'] ?? 0);
        $customerEmail = trim((string) ($customer['email'] ?? ''));
        $stmt = $pdo->prepare('
            SELECT * FROM orders
            WHERE customer_id = ?
               OR (customer_id IS NULL AND customer_email = ?)
            ORDER BY created_at DESC
        ');
        $stmt->execute([$customerId, $customerEmail]);
        $rows = $stmt->fetchAll();

        if ($customerId > 0 && $customerEmail !== '') {
            $linkStmt = $pdo->prepare('
                UPDATE orders
                SET customer_id = ?
                WHERE customer_id IS NULL AND customer_email = ?
            ');
            $linkStmt->execute([$customerId, $customerEmail]);
        }

        jsonResponse($rows);
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

        if (count($variations) > 0) {
            $stockTotalStmt = $pdo->prepare('SELECT COALESCE(SUM(stock), 0) AS total_stock FROM product_variations WHERE product_id = ?');
            $stockTotalStmt->execute([$productId]);
            $totalVariationStock = (int) (($stockTotalStmt->fetch()['total_stock'] ?? 0));
            $syncProductStmt = $pdo->prepare('UPDATE products SET stock_quantity = ?, product_status = ? WHERE id = ?');
            $syncProductStmt->execute([
                $totalVariationStock,
                productStatusFromStock($totalVariationStock),
                $productId,
            ]);
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
            jsonResponse(['message' => fileUploadErrorMessage($errorCode, 'Image file is required')], 422);
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

        $uploadDir = uploadBaseDirectory();
        ensureDirectoryWritable($uploadDir);

        $filename = 'product_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $extension;
        $targetPath = $uploadDir . '/' . $filename;
        if (!move_uploaded_file($tmpPath, $targetPath)) {
            jsonResponse(['message' => 'Failed to store uploaded image'], 500);
        }

        $imageUrl = buildUploadUrl('/uploads/' . $filename);
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
        if (count($rows) > 0) {
            $ids = array_map(static fn(array $row): int => (int) $row['id'], $rows);
            $placeholders = implode(',', array_fill(0, count($ids), '?'));
            $variationStmt = $pdo->prepare("
                SELECT product_id, COUNT(*) AS variation_count, COALESCE(SUM(stock), 0) AS total_stock
                FROM product_variations
                WHERE product_id IN ($placeholders)
                GROUP BY product_id
            ");
            $variationStmt->execute($ids);
            $variationMap = [];
            foreach ($variationStmt->fetchAll() as $variationRow) {
                $variationMap[(int) $variationRow['product_id']] = [
                    'variation_count' => (int) ($variationRow['variation_count'] ?? 0),
                    'total_stock' => (int) ($variationRow['total_stock'] ?? 0),
                ];
            }

            foreach ($rows as &$row) {
                $productId = (int) ($row['id'] ?? 0);
                $variationMeta = $variationMap[$productId] ?? null;
                if (!$variationMeta || $variationMeta['variation_count'] <= 0) {
                    continue;
                }
                $row['stock_quantity'] = $variationMeta['total_stock'];
                $row['product_status'] = productStatusFromStock($variationMeta['total_stock']);
            }
            unset($row);
        }
        jsonResponse($rows);
    }

    if ($path === '/api/products' && $method === 'POST') {
        requireAdmin();
        $stockQty = max(0, (int) ($body['stock_quantity'] ?? 0));
        $productStatus = productStatusFromStock($stockQty);
        $stmt = $pdo->prepare('
            INSERT INTO products (name, sku, category_id, description, image_url, price, stock_quantity, product_status, unit, hsn_code, gst_rate, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        ');
        $stmt->execute([
            trim((string) ($body['name'] ?? '')),
            trim((string) ($body['sku'] ?? '')) ?: null,
            (int) ($body['category_id'] ?? 0),
            trim((string) ($body['description'] ?? '')),
            trim((string) ($body['image_url'] ?? '')),
            (float) ($body['price'] ?? 0),
            $stockQty,
            $productStatus,
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
        $stockQty = max(0, (int) ($body['stock_quantity'] ?? 0));
        $productStatus = productStatusFromStock($stockQty);
        $stmt = $pdo->prepare('
            UPDATE products
            SET name = ?, sku = ?, category_id = ?, description = ?, image_url = ?, price = ?, stock_quantity = ?, product_status = ?, unit = ?, hsn_code = ?, gst_rate = ?
            WHERE id = ?
        ');
        $stmt->execute([
            trim((string) ($body['name'] ?? '')),
            trim((string) ($body['sku'] ?? '')) ?: null,
            (int) ($body['category_id'] ?? 0),
            trim((string) ($body['description'] ?? '')),
            trim((string) ($body['image_url'] ?? '')),
            (float) ($body['price'] ?? 0),
            $stockQty,
            $productStatus,
            trim((string) ($body['unit'] ?? '')),
            trim((string) ($body['hsn_code'] ?? '')),
            (float) ($body['gst_rate'] ?? 0),
            $id,
        ]);

        $variationStockStmt = $pdo->prepare('
            SELECT COUNT(*) AS variation_count, COALESCE(SUM(stock), 0) AS total_stock
            FROM product_variations
            WHERE product_id = ?
        ');
        $variationStockStmt->execute([$id]);
        $variationMeta = $variationStockStmt->fetch() ?: ['variation_count' => 0, 'total_stock' => 0];
        $variationCount = (int) ($variationMeta['variation_count'] ?? 0);
        if ($variationCount > 0) {
            $totalVariationStock = (int) ($variationMeta['total_stock'] ?? 0);
            $syncProductStmt = $pdo->prepare('UPDATE products SET stock_quantity = ?, product_status = ? WHERE id = ?');
            $syncProductStmt->execute([
                $totalVariationStock,
                productStatusFromStock($totalVariationStock),
                $id,
            ]);
        }

        $row = $pdo->query("SELECT p.*, c.name AS category_name FROM products p JOIN categories c ON c.id = p.category_id WHERE p.id = {$id}")->fetch();
        jsonResponse($row ?: []);
    }

    if (preg_match('#^/api/products/(\d+)/stock$#', $path, $m) && $method === 'PATCH') {
        requireAdmin();
        $id = (int) $m[1];
        $newStock = max(0, (int) ($body['stock_quantity'] ?? 0));
        $pdo->beginTransaction();
        $lockStmt = $pdo->prepare('SELECT id, stock_quantity FROM products WHERE id = ? FOR UPDATE');
        $lockStmt->execute([$id]);
        $product = $lockStmt->fetch();
        if (!$product) {
            $pdo->rollBack();
            jsonResponse(['message' => 'Product not found'], 404);
        }
        $previousStock = (int) $product['stock_quantity'];
        $status = productStatusFromStock($newStock);
        $stmt = $pdo->prepare('UPDATE products SET stock_quantity = ?, product_status = ? WHERE id = ?');
        $stmt->execute([$newStock, $status, $id]);
        if ($previousStock !== $newStock) {
            $movementType = $newStock > $previousStock ? 'restock' : 'admin_adjustment';
            createStockMovement(
                $pdo,
                $id,
                null,
                null,
                $movementType,
                $newStock - $previousStock,
                $previousStock,
                $newStock,
                'Manual stock update from admin panel'
            );
        }
        $pdo->commit();
        $row = $pdo->query("SELECT p.*, c.name AS category_name FROM products p JOIN categories c ON c.id = p.category_id WHERE p.id = {$id}")->fetch();
        jsonResponse($row ?: []);
    }

    if ($path === '/api/stock-movements' && $method === 'GET') {
        requireAdmin();
        $rows = $pdo->query('
            SELECT
                sm.id,
                sm.product_id,
                p.name AS product_name,
                sm.variation_id,
                pv.value AS variation_value,
                sm.order_id,
                sm.movement_type,
                sm.quantity_delta,
                sm.previous_stock,
                sm.new_stock,
                sm.note,
                sm.created_at
            FROM stock_movements sm
            JOIN products p ON p.id = sm.product_id
            LEFT JOIN product_variations pv ON pv.id = sm.variation_id
            ORDER BY sm.created_at DESC, sm.id DESC
            LIMIT 200
        ')->fetchAll();
        jsonResponse($rows);
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

    if ($path === '/api/payments/razorpay/order' && $method === 'POST') {
        $amount = (float) ($body['amount'] ?? 0);
        $currency = strtoupper(trim((string) ($body['currency'] ?? 'INR')));
        $customerName = trim((string) ($body['customer_name'] ?? ''));
        $customerEmail = trim((string) ($body['customer_email'] ?? ''));
        $customerPhone = trim((string) ($body['customer_phone'] ?? ''));

        if ($amount <= 0) {
            jsonResponse(['message' => 'Amount must be greater than zero'], 422);
        }

        $amountInPaise = (int) round($amount * 100);
        $receipt = 'rcpt_' . date('YmdHis') . '_' . bin2hex(random_bytes(3));
        $payload = [
            'amount' => $amountInPaise,
            'currency' => $currency !== '' ? $currency : 'INR',
            'receipt' => $receipt,
            'notes' => [
                'customer_name' => $customerName,
                'customer_email' => $customerEmail,
                'customer_phone' => $customerPhone,
            ],
        ];

        $razorpayOrder = razorpayApiRequest('POST', '/orders', $payload);
        jsonResponse([
            'id' => (string) ($razorpayOrder['id'] ?? ''),
            'amount' => (int) ($razorpayOrder['amount'] ?? $amountInPaise),
            'currency' => (string) ($razorpayOrder['currency'] ?? 'INR'),
            'receipt' => (string) ($razorpayOrder['receipt'] ?? $receipt),
            'status' => (string) ($razorpayOrder['status'] ?? ''),
        ]);
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
        $allowed = ['Pending', 'Confirmed', 'Processing', 'Ready to Ship', 'Shipped', 'Delivered', 'Cancelled'];
        if (!in_array($status, $allowed, true)) {
            jsonResponse(['message' => 'Invalid order status'], 422);
        }
        $currentStmt = $pdo->prepare('SELECT * FROM orders WHERE id = ? LIMIT 1');
        $currentStmt->execute([$id]);
        $current = $currentStmt->fetch();
        if (!$current) {
            jsonResponse(['message' => 'Order not found'], 404);
        }

        $trackingNumber = array_key_exists('tracking_number', $body)
            ? trim((string) ($body['tracking_number'] ?? ''))
            : (string) ($current['tracking_number'] ?? '');
        $trackingUrl = array_key_exists('tracking_url', $body)
            ? trim((string) ($body['tracking_url'] ?? ''))
            : (string) ($current['tracking_url'] ?? '');

        $stmt = $pdo->prepare('UPDATE orders SET order_status = ?, tracking_number = ?, tracking_url = ? WHERE id = ?');
        $stmt->execute([
            $status,
            $trackingNumber !== '' ? $trackingNumber : null,
            $trackingUrl !== '' ? $trackingUrl : null,
            $id,
        ]);
        $stmt = $pdo->prepare('SELECT * FROM orders WHERE id = ?');
        $stmt->execute([$id]);
        $updated = $stmt->fetch() ?: [];

        $itemsStmt = $pdo->prepare('
            SELECT id, product_name, quantity, unit_price, total_price
            FROM order_items
            WHERE order_id = ?
        ');
        $itemsStmt->execute([$id]);
        $items = $itemsStmt->fetchAll();

        if (($current['order_status'] ?? '') !== $status) {
            sendCustomerOrderStatusUpdate($id, is_array($updated) ? $updated : [], $items);
        }

        jsonResponse($updated);
    }

    if (preg_match('#^/api/orders/track/(\d+)$#', $path, $m) && $method === 'GET') {
        $id = (int) $m[1];
        $stmt = $pdo->prepare('
            SELECT
                id,
                invoice_id,
                order_status,
                tracking_number,
                tracking_url,
                created_at
            FROM orders
            WHERE id = ?
            LIMIT 1
        ');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) {
            jsonResponse(['message' => 'Order not found'], 404);
        }
        jsonResponse($row);
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

    if ($path === '/api/admin/users' && $method === 'GET') {
        requireAdmin();
        $search = trim((string) ($_GET['search'] ?? ''));
        $role = strtolower(trim((string) ($_GET['role'] ?? '')));
        $allowedRoles = ['administrator', 'author', 'subscriber'];
        if ($role !== '' && !in_array($role, $allowedRoles, true)) {
            jsonResponse(['message' => 'Invalid role filter'], 422);
        }

        $page = max(1, (int) ($_GET['page'] ?? 1));
        $perPage = (int) ($_GET['per_page'] ?? 10);
        if ($perPage <= 0) {
            $perPage = 10;
        }
        $perPage = min(100, $perPage);
        $offset = ($page - 1) * $perPage;

        $whereClauses = [];
        $params = [];
        if ($search !== '') {
            $whereClauses[] = '(username LIKE ? OR email LIKE ?)';
            $like = '%' . $search . '%';
            $params[] = $like;
            $params[] = $like;
        }
        if ($role !== '') {
            $whereClauses[] = 'role = ?';
            $params[] = $role;
        }
        $whereSql = count($whereClauses) > 0 ? ('WHERE ' . implode(' AND ', $whereClauses)) : '';

        $countStmt = $pdo->prepare("SELECT COUNT(*) AS total FROM users $whereSql");
        $countStmt->execute($params);
        $total = (int) (($countStmt->fetch()['total'] ?? 0));
        $totalPages = max(1, (int) ceil($total / $perPage));
        if ($page > $totalPages) {
            $page = $totalPages;
            $offset = ($page - 1) * $perPage;
        }

        $listStmt = $pdo->prepare("
            SELECT id, username, email, role, created_at, updated_at
            FROM users
            $whereSql
            ORDER BY created_at DESC, id DESC
            LIMIT ? OFFSET ?
        ");
        $bindIndex = 1;
        foreach ($params as $value) {
            $listStmt->bindValue($bindIndex++, $value, PDO::PARAM_STR);
        }
        $listStmt->bindValue($bindIndex++, $perPage, PDO::PARAM_INT);
        $listStmt->bindValue($bindIndex, $offset, PDO::PARAM_INT);
        $listStmt->execute();

        jsonResponse([
            'items' => $listStmt->fetchAll(),
            'pagination' => [
                'page' => $page,
                'per_page' => $perPage,
                'total' => $total,
                'total_pages' => $totalPages,
            ],
        ]);
    }

    if ($path === '/api/admin/users' && $method === 'POST') {
        requireAdmin();
        $username = trim((string) ($body['username'] ?? ''));
        $email = strtolower(trim((string) ($body['email'] ?? '')));
        $password = (string) ($body['password'] ?? '');
        $role = strtolower(trim((string) ($body['role'] ?? 'subscriber')));
        $allowedRoles = ['administrator', 'author', 'subscriber'];

        if ($username === '' || $email === '' || $password === '') {
            jsonResponse(['message' => 'Username, email and password are required'], 422);
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            jsonResponse(['message' => 'Invalid email'], 422);
        }
        if (strlen($password) < 6) {
            jsonResponse(['message' => 'Password must be at least 6 characters'], 422);
        }
        if (!in_array($role, $allowedRoles, true)) {
            jsonResponse(['message' => 'Invalid role'], 422);
        }

        $dup = $pdo->prepare('SELECT id FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?) LIMIT 1');
        $dup->execute([$username, $email]);
        if ($dup->fetch()) {
            jsonResponse(['message' => 'Username or email already exists'], 422);
        }

        $stmt = $pdo->prepare('INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)');
        $stmt->execute([$username, $email, password_hash($password, PASSWORD_DEFAULT), $role]);

        $createdId = (int) $pdo->lastInsertId();
        $row = $pdo->prepare('SELECT id, username, email, role, created_at, updated_at FROM users WHERE id = ? LIMIT 1');
        $row->execute([$createdId]);
        jsonResponse($row->fetch() ?: [], 201);
    }

    if (preg_match('#^/api/admin/users/(\d+)$#', $path, $m) && $method === 'PUT') {
        requireAdmin();
        $userId = (int) $m[1];
        $username = trim((string) ($body['username'] ?? ''));
        $email = strtolower(trim((string) ($body['email'] ?? '')));
        $role = strtolower(trim((string) ($body['role'] ?? 'subscriber')));
        $password = (string) ($body['password'] ?? '');
        $allowedRoles = ['administrator', 'author', 'subscriber'];

        if ($username === '' || $email === '') {
            jsonResponse(['message' => 'Username and email are required'], 422);
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            jsonResponse(['message' => 'Invalid email'], 422);
        }
        if (!in_array($role, $allowedRoles, true)) {
            jsonResponse(['message' => 'Invalid role'], 422);
        }
        if ($password !== '' && strlen($password) < 6) {
            jsonResponse(['message' => 'Password must be at least 6 characters'], 422);
        }

        $exists = $pdo->prepare('SELECT id FROM users WHERE id = ? LIMIT 1');
        $exists->execute([$userId]);
        if (!$exists->fetch()) {
            jsonResponse(['message' => 'User not found'], 404);
        }

        $dup = $pdo->prepare('SELECT id FROM users WHERE (LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)) AND id <> ? LIMIT 1');
        $dup->execute([$username, $email, $userId]);
        if ($dup->fetch()) {
            jsonResponse(['message' => 'Username or email already exists'], 422);
        }

        if ($password !== '') {
            $stmt = $pdo->prepare('UPDATE users SET username = ?, email = ?, role = ?, password = ? WHERE id = ?');
            $stmt->execute([$username, $email, $role, password_hash($password, PASSWORD_DEFAULT), $userId]);
        } else {
            $stmt = $pdo->prepare('UPDATE users SET username = ?, email = ?, role = ? WHERE id = ?');
            $stmt->execute([$username, $email, $role, $userId]);
        }

        $row = $pdo->prepare('SELECT id, username, email, role, created_at, updated_at FROM users WHERE id = ? LIMIT 1');
        $row->execute([$userId]);
        jsonResponse($row->fetch() ?: []);
    }

    if (preg_match('#^/api/admin/users/(\d+)$#', $path, $m) && $method === 'DELETE') {
        $auth = requireAdmin();
        $userId = (int) $m[1];
        if ((int) ($auth['id'] ?? 0) === $userId) {
            jsonResponse(['message' => 'You cannot delete your own user'], 422);
        }
        $stmt = $pdo->prepare('DELETE FROM users WHERE id = ?');
        $stmt->execute([$userId]);
        jsonResponse(['success' => true]);
    }

    if ($path === '/api/blog-categories' && $method === 'GET') {
        requireAdmin();
        $rows = $pdo->query('SELECT id, name, created_at FROM blog_categories ORDER BY name ASC')->fetchAll();
        jsonResponse($rows);
    }

    if ($path === '/api/blog-categories' && $method === 'POST') {
        requireAdmin();
        $name = trim((string) ($body['name'] ?? ''));
        if ($name === '') {
            jsonResponse(['message' => 'Category name is required'], 422);
        }
        $dup = $pdo->prepare('SELECT id FROM blog_categories WHERE LOWER(name) = LOWER(?) LIMIT 1');
        $dup->execute([$name]);
        if ($dup->fetch()) {
            jsonResponse(['message' => 'Category already exists'], 422);
        }
        $stmt = $pdo->prepare('INSERT INTO blog_categories (name) VALUES (?)');
        $stmt->execute([$name]);
        $id = (int) $pdo->lastInsertId();
        $row = $pdo->prepare('SELECT id, name, created_at FROM blog_categories WHERE id = ?');
        $row->execute([$id]);
        jsonResponse($row->fetch() ?: [], 201);
    }

    if (preg_match('#^/api/blog-categories/(\d+)$#', $path, $m) && $method === 'DELETE') {
        requireAdmin();
        $categoryId = (int) $m[1];
        $rowStmt = $pdo->prepare('SELECT id, name FROM blog_categories WHERE id = ? LIMIT 1');
        $rowStmt->execute([$categoryId]);
        $category = $rowStmt->fetch();
        if (!$category) {
            jsonResponse(['message' => 'Category not found'], 404);
        }
        if (strtolower(trim((string) $category['name'])) === 'general') {
            jsonResponse(['message' => 'General category cannot be deleted'], 422);
        }
        $stmt = $pdo->prepare('DELETE FROM blog_categories WHERE id = ?');
        $stmt->execute([$categoryId]);
        jsonResponse(['success' => true]);
    }

    if ($path === '/api/blogs' && $method === 'GET') {
        requireAdmin();
        $rows = $pdo->query('
            SELECT
                id,
                title,
                slug,
                author_name,
                excerpt,
                content,
                image_url,
                category,
                read_time,
                is_published,
                publish_at,
                created_at,
                updated_at
            FROM blog_posts
            ORDER BY COALESCE(publish_at, created_at) DESC, id DESC
        ')->fetchAll();
        jsonResponse($rows);
    }

    if ($path === '/api/blogs' && $method === 'POST') {
        requireAdmin();
        $title = trim((string) ($body['title'] ?? ''));
        $authorName = trim((string) ($body['author_name'] ?? 'Rushivan Aagro'));
        $excerpt = trim((string) ($body['excerpt'] ?? ''));
        $content = trim((string) ($body['content'] ?? ''));
        $imageUrl = trim((string) ($body['image_url'] ?? ''));
        $category = trim((string) ($body['category'] ?? 'General'));
        $isPublished = (int) ($body['is_published'] ?? 1) === 1 ? 1 : 0;
        $publishAtRaw = trim((string) ($body['publish_at'] ?? ''));
        $publishAt = $publishAtRaw !== '' ? str_replace('T', ' ', $publishAtRaw) : null;

        if ($title === '' || $excerpt === '' || $content === '') {
            jsonResponse(['message' => 'Title, excerpt and content are required'], 422);
        }

        $slug = generateUniqueBlogSlug($pdo, $title);
        $readTime = estimateReadTime($content);
        $stmt = $pdo->prepare('
            INSERT INTO blog_posts (
                title,
                slug,
                author_name,
                excerpt,
                content,
                image_url,
                category,
                read_time,
                is_published,
                publish_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ');
        $stmt->execute([
            $title,
            $slug,
            $authorName !== '' ? $authorName : 'Rushivan Aagro',
            $excerpt,
            $content,
            $imageUrl !== '' ? $imageUrl : null,
            $category !== '' ? $category : 'General',
            $readTime,
            $isPublished,
            $publishAt,
        ]);
        $id = (int) $pdo->lastInsertId();
        $row = $pdo->prepare('SELECT * FROM blog_posts WHERE id = ? LIMIT 1');
        $row->execute([$id]);
        jsonResponse($row->fetch() ?: [], 201);
    }

    if (preg_match('#^/api/blogs/(\d+)$#', $path, $m) && $method === 'PUT') {
        requireAdmin();
        $id = (int) $m[1];
        $title = trim((string) ($body['title'] ?? ''));
        $authorName = trim((string) ($body['author_name'] ?? 'Rushivan Aagro'));
        $excerpt = trim((string) ($body['excerpt'] ?? ''));
        $content = trim((string) ($body['content'] ?? ''));
        $imageUrl = trim((string) ($body['image_url'] ?? ''));
        $category = trim((string) ($body['category'] ?? 'General'));
        $isPublished = (int) ($body['is_published'] ?? 1) === 1 ? 1 : 0;
        $publishAtRaw = trim((string) ($body['publish_at'] ?? ''));
        $publishAt = $publishAtRaw !== '' ? str_replace('T', ' ', $publishAtRaw) : null;

        if ($title === '' || $excerpt === '' || $content === '') {
            jsonResponse(['message' => 'Title, excerpt and content are required'], 422);
        }

        $exists = $pdo->prepare('SELECT id FROM blog_posts WHERE id = ? LIMIT 1');
        $exists->execute([$id]);
        if (!$exists->fetch()) {
            jsonResponse(['message' => 'Blog post not found'], 404);
        }

        $slug = generateUniqueBlogSlug($pdo, $title, $id);
        $readTime = estimateReadTime($content);
        $stmt = $pdo->prepare('
            UPDATE blog_posts
            SET title = ?, slug = ?, author_name = ?, excerpt = ?, content = ?, image_url = ?, category = ?, read_time = ?, is_published = ?, publish_at = ?
            WHERE id = ?
        ');
        $stmt->execute([
            $title,
            $slug,
            $authorName !== '' ? $authorName : 'Rushivan Aagro',
            $excerpt,
            $content,
            $imageUrl !== '' ? $imageUrl : null,
            $category !== '' ? $category : 'General',
            $readTime,
            $isPublished,
            $publishAt,
            $id,
        ]);
        $row = $pdo->prepare('SELECT * FROM blog_posts WHERE id = ? LIMIT 1');
        $row->execute([$id]);
        jsonResponse($row->fetch() ?: []);
    }

    if (preg_match('#^/api/blogs/(\d+)$#', $path, $m) && $method === 'DELETE') {
        requireAdmin();
        $id = (int) $m[1];
        $stmt = $pdo->prepare('DELETE FROM blog_posts WHERE id = ?');
        $stmt->execute([$id]);
        jsonResponse(['success' => true]);
    }

    if ($path === '/api/public/blogs' && $method === 'GET') {
        $rows = $pdo->query('
            SELECT
                id,
                title,
                slug,
                author_name,
                excerpt,
                content,
                image_url,
                category,
                read_time,
                is_published,
                publish_at,
                created_at,
                updated_at
            FROM blog_posts
            WHERE is_published = 1
              AND (publish_at IS NULL OR publish_at <= NOW())
            ORDER BY COALESCE(publish_at, created_at) DESC, id DESC
        ')->fetchAll();
        jsonResponse($rows);
    }

    if (preg_match('#^/api/public/blogs/([^/]+)$#', $path, $m) && $method === 'GET') {
        $slug = urldecode((string) $m[1]);
        $stmt = $pdo->prepare('
            SELECT
                id,
                title,
                slug,
                author_name,
                excerpt,
                content,
                image_url,
                category,
                read_time,
                is_published,
                publish_at,
                created_at,
                updated_at
            FROM blog_posts
            WHERE slug = ?
              AND is_published = 1
              AND (publish_at IS NULL OR publish_at <= NOW())
            LIMIT 1
        ');
        $stmt->execute([$slug]);
        $row = $stmt->fetch();
        if (!$row) {
            jsonResponse(['message' => 'Blog not found'], 404);
        }
        jsonResponse($row);
    }

    if ($path === '/api/orders' && $method === 'POST') {
        $items = $body['items'] ?? [];
        if (!is_array($items) || count($items) === 0) {
            jsonResponse(['message' => 'Order items are required'], 422);
        }
        $customerSession = authCustomer();
        $customerId = $customerSession ? (int) ($customerSession['id'] ?? 0) : null;
        if (!$customerId) {
            $lookupEmail = trim((string) ($body['customer_email'] ?? ''));
            if ($lookupEmail !== '') {
                $custStmt = $pdo->prepare('SELECT id FROM customers WHERE email = ? LIMIT 1');
                $custStmt->execute([$lookupEmail]);
                $existingCustomer = $custStmt->fetch();
                if ($existingCustomer && isset($existingCustomer['id'])) {
                    $customerId = (int) $existingCustomer['id'];
                }
            }
        }
        try {
            $pdo->beginTransaction();
            $stmt = $pdo->prepare('
                INSERT INTO orders (
                    customer_id,
                    customer_name, customer_email, customer_phone, customer_address, customer_pincode,
                    total_amount, payment_status, order_status, razorpay_order_id, razorpay_payment_id, razorpay_signature, invoice_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                null,
            ]);
            $orderId = (int) $pdo->lastInsertId();
            $invoiceId = trim((string) ($body['invoice_id'] ?? ''));
            if ($invoiceId === '') {
                $invoiceId = generateInvoiceId($orderId);
            }
            $updateInvoiceStmt = $pdo->prepare('UPDATE orders SET invoice_id = ? WHERE id = ?');
            $updateInvoiceStmt->execute([$invoiceId, $orderId]);

            $lockProductStmt = $pdo->prepare('SELECT id, name, stock_quantity FROM products WHERE id = ? FOR UPDATE');
            $updateProductStockStmt = $pdo->prepare('UPDATE products SET stock_quantity = ?, product_status = ? WHERE id = ?');
            $lockVariationStmt = $pdo->prepare('SELECT id, product_id, value, stock FROM product_variations WHERE id = ? FOR UPDATE');
            $updateVariationStockStmt = $pdo->prepare('UPDATE product_variations SET stock = ? WHERE id = ?');
            $sumVariationStockStmt = $pdo->prepare('SELECT COALESCE(SUM(stock), 0) AS total_stock FROM product_variations WHERE product_id = ?');

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

            $variationProductIds = [];
            foreach ($items as $item) {
                $qty = (int) ($item['quantity'] ?? 1);
                if ($qty <= 0) {
                    throw new RuntimeException('Order quantity must be at least 1', 422);
                }

                $unitPrice = (float) ($item['unit_price'] ?? 0);
                $variationId = isset($item['variation_id']) ? (int) $item['variation_id'] : null;
                $requestedProductId = isset($item['product_id']) ? (int) $item['product_id'] : null;
                $attributeName = trim((string) ($item['attribute_name'] ?? ''));
                $termName = trim((string) ($item['term_name'] ?? ''));
                $variationValue = trim((string) ($item['variation_value'] ?? ''));
                $quantityValueRaw = trim((string) ($item['quantity_value'] ?? ''));
                $quantityValue = $quantityValueRaw !== '' ? (float) $quantityValueRaw : null;
                $unit = strtolower(trim((string) ($item['unit'] ?? '')));
                $sku = trim((string) ($item['sku'] ?? ''));
                $productIdForItem = $requestedProductId && $requestedProductId > 0 ? $requestedProductId : null;

                if ($variationId !== null && $variationId > 0) {
                    $lockVariationStmt->execute([$variationId]);
                    $variationRow = $lockVariationStmt->fetch();
                    if (!$variationRow) {
                        throw new RuntimeException('Selected variation is no longer available', 422);
                    }
                    $productIdForItem = (int) $variationRow['product_id'];
                    $previousStock = (int) $variationRow['stock'];
                    if ($previousStock < $qty) {
                        $variationLabel = trim((string) ($variationRow['value'] ?? 'this variation'));
                        throw new RuntimeException("Insufficient stock for {$variationLabel}. Available: {$previousStock}", 422);
                    }
                    $newStock = $previousStock - $qty;
                    $updateVariationStockStmt->execute([$newStock, $variationId]);
                    createStockMovement(
                        $pdo,
                        $productIdForItem,
                        $variationId,
                        $orderId,
                        'order_deduction',
                        -$qty,
                        $previousStock,
                        $newStock,
                        'Order deduction'
                    );
                    $variationProductIds[$productIdForItem] = true;
                } else {
                    if ($productIdForItem === null || $productIdForItem <= 0) {
                        throw new RuntimeException('Product ID is required for each order item', 422);
                    }
                    $lockProductStmt->execute([$productIdForItem]);
                    $productRow = $lockProductStmt->fetch();
                    if (!$productRow) {
                        throw new RuntimeException('Product not found for one of the items', 422);
                    }
                    $previousStock = (int) $productRow['stock_quantity'];
                    if ($previousStock < $qty) {
                        $productName = trim((string) ($productRow['name'] ?? 'product'));
                        throw new RuntimeException("Insufficient stock for {$productName}. Available: {$previousStock}", 422);
                    }
                    $newStock = $previousStock - $qty;
                    $updateProductStockStmt->execute([$newStock, productStatusFromStock($newStock), $productIdForItem]);
                    createStockMovement(
                        $pdo,
                        $productIdForItem,
                        null,
                        $orderId,
                        'order_deduction',
                        -$qty,
                        $previousStock,
                        $newStock,
                        'Order deduction'
                    );
                }

                $itemStmt->execute([
                    $orderId,
                    $productIdForItem,
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
            }

            foreach (array_keys($variationProductIds) as $productId) {
                $sumVariationStockStmt->execute([(int) $productId]);
                $totalVariationStock = (int) (($sumVariationStockStmt->fetch()['total_stock'] ?? 0));
                $updateProductStockStmt->execute([
                    $totalVariationStock,
                    productStatusFromStock($totalVariationStock),
                    (int) $productId,
                ]);
            }

            $pdo->commit();
            sendOwnerOrderNotification($orderId, $body, $items);
            sendCustomerOrderConfirmation($orderId, $invoiceId, $body, $items);
            jsonResponse(['id' => $orderId, 'invoice_id' => $invoiceId, 'message' => 'Order stored'], 201);
        } catch (Throwable $txError) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            $statusCode = ($txError instanceof RuntimeException && $txError->getCode() >= 400 && $txError->getCode() < 500)
                ? (int) $txError->getCode()
                : 500;
            jsonResponse(['message' => $txError->getMessage()], $statusCode);
        }
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

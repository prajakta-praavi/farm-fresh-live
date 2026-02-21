<?php

declare(strict_types=1);

require_once __DIR__ . '/utils.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');

if (methodIs('OPTIONS')) {
    http_response_code(204);
    exit;
}

ensureBootstrapAdmin();
$pdo = db();
$path = getPath();
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
$body = parseJsonBody();

try {
    if ($path === '/api/health' && $method === 'GET') {
        jsonResponse(['status' => 'ok']);
    }

    if ($path === '/api/auth/login' && $method === 'POST') {
        $email = trim((string) ($body['email'] ?? ''));
        $password = (string) ($body['password'] ?? '');
        $stmt = $pdo->prepare('SELECT id, name, email, password_hash, role FROM users WHERE email = ? LIMIT 1');
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($password, (string) $user['password_hash'])) {
            jsonResponse(['message' => 'Invalid email or password'], 401);
        }

        $token = createJwt([
            'id' => (int) $user['id'],
            'email' => $user['email'],
            'role' => $user['role'],
        ]);

        jsonResponse([
            'token' => $token,
            'user' => [
                'id' => (int) $user['id'],
                'name' => $user['name'],
                'email' => $user['email'],
                'role' => $user['role'],
            ],
        ]);
    }

    if ($path === '/api/categories' && $method === 'GET') {
        requireAdmin();
        $rows = $pdo->query('SELECT id, name FROM categories ORDER BY name')->fetchAll();
        jsonResponse($rows);
    }

    if ($path === '/api/dashboard/overview' && $method === 'GET') {
        requireAdmin();
        $totalProducts = (int) $pdo->query('SELECT COUNT(*) FROM products')->fetchColumn();
        $totalOrders = (int) $pdo->query('SELECT COUNT(*) FROM orders')->fetchColumn();
        $totalRevenue = (float) $pdo->query("SELECT COALESCE(SUM(total_amount),0) FROM orders WHERE payment_status = 'Paid'")->fetchColumn();
        $totalFarmStay = (int) $pdo->query('SELECT COUNT(*) FROM farm_stay_inquiries')->fetchColumn();
        $recentOrders = $pdo->query('SELECT * FROM orders ORDER BY created_at DESC LIMIT 10')->fetchAll();

        jsonResponse([
            'totalProducts' => $totalProducts,
            'totalOrders' => $totalOrders,
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
            INSERT INTO products (name, category_id, description, image_url, price, stock_quantity, unit, hsn_code, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
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
            SET name = ?, category_id = ?, description = ?, image_url = ?, price = ?, stock_quantity = ?, unit = ?, hsn_code = ?
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
        $itemsStmt = $pdo->prepare('SELECT id, product_name, quantity, unit_price, total_price FROM order_items WHERE order_id = ?');
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

    if ($path === '/api/orders' && $method === 'POST') {
        $items = $body['items'] ?? [];
        if (!is_array($items) || count($items) === 0) {
            jsonResponse(['message' => 'Order items are required'], 422);
        }

        $pdo->beginTransaction();
        $stmt = $pdo->prepare('
            INSERT INTO orders (
                customer_name, customer_email, customer_phone, customer_address, customer_pincode,
                total_amount, payment_status, order_status, razorpay_order_id, razorpay_payment_id, razorpay_signature
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ');
        $stmt->execute([
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
            INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, total_price)
            VALUES (?, ?, ?, ?, ?, ?)
        ');
        foreach ($items as $item) {
            $qty = (int) ($item['quantity'] ?? 1);
            $unitPrice = (float) ($item['unit_price'] ?? 0);
            $itemStmt->execute([
                $orderId,
                isset($item['product_id']) ? (int) $item['product_id'] : null,
                trim((string) ($item['product_name'] ?? '')),
                $qty,
                $unitPrice,
                $qty * $unitPrice,
            ]);
            if (isset($item['product_id'])) {
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


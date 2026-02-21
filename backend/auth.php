<?php

declare(strict_types=1);

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/utils.php';

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
    $count = (int) $pdo->query('SELECT COUNT(*) FROM users WHERE role = "admin"')->fetchColumn();
    if ($count > 0) {
        return;
    }

    $name = env('ADMIN_BOOTSTRAP_NAME', 'Admin');
    $email = env('ADMIN_BOOTSTRAP_EMAIL', 'admin@example.com');
    $password = env('ADMIN_BOOTSTRAP_PASSWORD', 'Admin@123');

    $stmt = $pdo->prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, "admin")');
    $stmt->execute([$name, $email, password_hash($password, PASSWORD_DEFAULT)]);
}


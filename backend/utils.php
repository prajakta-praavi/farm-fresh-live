<?php

declare(strict_types=1);

function jsonResponse(array $payload, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json');
    echo json_encode($payload);
    exit;
}

function parseJsonBody(): array
{
    $raw = file_get_contents('php://input') ?: '';
    if ($raw === '') {
        return [];
    }
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function getPath(): string
{
    $uri = $_SERVER['REQUEST_URI'] ?? '/';
    $path = parse_url($uri, PHP_URL_PATH) ?: '/';
    $apiPos = strpos($path, '/api/');
    if ($apiPos === false) {
        return $path;
    }
    return substr($path, $apiPos);
}

function methodIs(string $method): bool
{
    return strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET') === strtoupper($method);
}

function sendEmail(string $to, string $subject, string $message, array $headers = []): bool
{
    $smtpHost = trim((string) env('SMTP_HOST', ''));
    if ($smtpHost === '') {
        return @mail($to, $subject, $message, implode("\r\n", $headers));
    }

    $smtpPort = (int) env('SMTP_PORT', '587');
    $smtpUser = trim((string) env('SMTP_USER', ''));
    $smtpPass = (string) env('SMTP_PASS', '');
    $smtpSecure = strtolower(trim((string) env('SMTP_SECURE', 'tls')));
    $timeout = (int) env('SMTP_TIMEOUT', '20');

    $fromEmail = trim((string) env('MAIL_FROM', 'noreply@rushivanagro.com'));
    $fromName = trim((string) env('MAIL_FROM_NAME', 'Rushivan Agro'));

    $hasFrom = false;
    foreach ($headers as $line) {
        if (stripos($line, 'From:') === 0) {
            $hasFrom = true;
            break;
        }
    }
    if (!$hasFrom) {
        $headers[] = 'From: ' . ($fromName !== '' ? $fromName : 'Rushivan Agro') . ' <' . $fromEmail . '>';
    }

    $remoteHost = ($smtpSecure === 'ssl') ? "ssl://{$smtpHost}" : $smtpHost;
    $fp = @stream_socket_client($remoteHost . ':' . $smtpPort, $errno, $errstr, $timeout);
    if (!$fp) {
        return false;
    }

    $readResponse = static function ($socket): string {
        $data = '';
        while (!feof($socket)) {
            $line = fgets($socket, 515);
            if ($line === false) {
                break;
            }
            $data .= $line;
            if (strlen($line) >= 4 && $line[3] !== '-') {
                break;
            }
        }
        return $data;
    };

    $expect = static function (string $response, array $codes): bool {
        $code = (int) substr(trim($response), 0, 3);
        return in_array($code, $codes, true);
    };

    $sendCommand = static function ($socket, string $command, array $codes) use ($readResponse, $expect): bool {
        fwrite($socket, $command . "\r\n");
        $response = $readResponse($socket);
        return $expect($response, $codes);
    };

    $greeting = $readResponse($fp);
    if (!$expect($greeting, [220])) {
        fclose($fp);
        return false;
    }

    $hostname = (string) ($_SERVER['SERVER_NAME'] ?? 'localhost');
    if (!$sendCommand($fp, 'EHLO ' . $hostname, [250])) {
        if (!$sendCommand($fp, 'HELO ' . $hostname, [250])) {
            fclose($fp);
            return false;
        }
    }

    if ($smtpSecure === 'tls') {
        if (!$sendCommand($fp, 'STARTTLS', [220])) {
            fclose($fp);
            return false;
        }
        if (!stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
            fclose($fp);
            return false;
        }
        if (!$sendCommand($fp, 'EHLO ' . $hostname, [250])) {
            fclose($fp);
            return false;
        }
    }

    if ($smtpUser !== '') {
        if (!$sendCommand($fp, 'AUTH LOGIN', [334])) {
            fclose($fp);
            return false;
        }
        if (!$sendCommand($fp, base64_encode($smtpUser), [334])) {
            fclose($fp);
            return false;
        }
        if (!$sendCommand($fp, base64_encode($smtpPass), [235])) {
            fclose($fp);
            return false;
        }
    }

    if (!$sendCommand($fp, 'MAIL FROM:<' . $fromEmail . '>', [250])) {
        fclose($fp);
        return false;
    }
    if (!$sendCommand($fp, 'RCPT TO:<' . $to . '>', [250, 251])) {
        fclose($fp);
        return false;
    }
    if (!$sendCommand($fp, 'DATA', [354])) {
        fclose($fp);
        return false;
    }

    $payload = [];
    $payload[] = 'To: ' . $to;
    $payload[] = 'Subject: ' . $subject;
    foreach ($headers as $line) {
        $payload[] = $line;
    }
    $payload[] = '';
    $payload[] = $message;

    $data = implode("\r\n", $payload);
    $data = str_replace("\n.", "\n..", $data);
    fwrite($fp, $data . "\r\n.\r\n");

    $finalResponse = $readResponse($fp);
    $sendCommand($fp, 'QUIT', [221]);
    fclose($fp);

    return $expect($finalResponse, [250]);
}

<?php
declare(strict_types=1);

ini_set('display_errors', '1');
ini_set('display_startup_errors', '1');
ini_set('output_buffering', '0');
ini_set('zlib.output_compression', '0');
error_reporting(E_ALL);

while (ob_get_level() > 0) {
    ob_end_flush();
}
ob_implicit_flush(true);

register_shutdown_function(static function (): void {
    $error = error_get_last();
    if ($error) {
        echo "\nhealth: shutdown error: {$error['message']} ({$error['file']}:{$error['line']})\n";
    }
});

header('Content-Type: text/plain; charset=UTF-8');
echo "health: start\n";
flush();

$dbFile = __DIR__ . '/db.php';
if (!file_exists($dbFile)) {
    http_response_code(500);
    echo "health: db.php missing\n";
    exit;
}

require_once $dbFile;
echo "health: db.php loaded\n";
flush();

try {
    $pdo = db();
    $pdo->query('SELECT 1');
    echo "health: db connected\n";
} catch (Throwable $e) {
    http_response_code(500);
    echo "health: db error: " . $e->getMessage() . "\n";
}

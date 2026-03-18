<?php
$host='127.0.0.1';
$port='3306';
$name='rushivan_agro';
$user='farm_app';
$pass='farm123';
$dsn = "mysql:host=$host;port=$port;dbname=$name;charset=utf8mb4";
try {
  $pdo = new PDO($dsn, $user, $pass, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
  echo "OK";
} catch (Throwable $e) {
  echo $e->getMessage();
}
?>

<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

define('DB_HOST', '72.62.115.30');
define('DB_PORT', '3306');
define('DB_NAME', 'schema_barbearia');
define('DB_USER', 'root');
define('DB_PASS', 'GaFranco@2024');

function getConnection() {
    try {
        $dsn = 'mysql:host=' . DB_HOST . ';port=' . DB_PORT . ';dbname=' . DB_NAME . ';charset=utf8mb4';
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
        return $pdo;
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['erro' => 'Falha na conexão com o banco de dados', 'detalhes' => $e->getMessage()]);
        exit();
    }
}

function jsonInput() {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function respond($data, $status = 200) {
    http_response_code($status);
    echo json_encode($data);
    exit();
}

function diaNomeParaInt($nome) {
    $mapa = [
        'Domingo' => 1,
        'Segunda-feira' => 2,
        'Terça-feira' => 3,
        'Quarta-feira' => 4,
        'Quinta-feira' => 5,
        'Sexta-feira' => 6,
        'Sábado' => 7,
    ];
    return $mapa[$nome] ?? 2;
}

function diaIntParaNome($int) {
    $mapa = [
        1 => 'Domingo',
        2 => 'Segunda-feira',
        3 => 'Terça-feira',
        4 => 'Quarta-feira',
        5 => 'Quinta-feira',
        6 => 'Sexta-feira',
        7 => 'Sábado',
    ];
    return $mapa[$int] ?? 'Segunda-feira';
}

function diaAppParaEnum($codigo) {
    $mapa = [
        'Seg' => 'seg',
        'Ter' => 'ter',
        'Qua' => 'qua',
        'Qui' => 'qui',
        'Sex' => 'sex',
        'Sáb' => 'sab',
        'Dom' => 'dom',
    ];
    return $mapa[$codigo] ?? null;
}

function diaEnumParaApp($enum) {
    $mapa = [
        'seg' => 'Seg',
        'ter' => 'Ter',
        'qua' => 'Qua',
        'qui' => 'Qui',
        'sex' => 'Sex',
        'sab' => 'Sáb',
        'dom' => 'Dom',
    ];
    return $mapa[$enum] ?? null;
}

function minutosParaTime($minutos) {
    $minutos = (int)$minutos;
    $horas = intdiv($minutos, 60);
    $min = $minutos % 60;
    return sprintf('%02d:%02d:00', $horas, $min);
}

function timeParaMinutos($time) {
    if (!$time) return 30;
    $partes = explode(':', $time);
    $horas = (int)($partes[0] ?? 0);
    $min = (int)($partes[1] ?? 0);
    return ($horas * 60) + $min;
}

function statusAppParaEnum($status) {
    $mapa = [
        'Agendado' => 'agendado',
        'Concluído' => 'concluido',
        'Cancelado' => 'cancelado',
    ];
    return $mapa[$status] ?? 'agendado';
}

function statusEnumParaApp($status) {
    $mapa = [
        'agendado' => 'Agendado',
        'concluido' => 'Concluído',
        'cancelado' => 'Cancelado',
    ];
    return $mapa[$status] ?? 'Agendado';
}


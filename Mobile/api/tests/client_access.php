<?php
declare(strict_types=1);
$_SERVER['REQUEST_METHOD'] = 'CLI';
require dirname(__DIR__) . '/config/database.php';
require dirname(__DIR__) . '/src/Core.php';
$pdo = getConnection();
$pdo->exec("SET time_zone = '-03:00'");
$checks = 0;
function checkClient(bool $condition, string $label): void {
    global $checks;
    if (!$condition) throw new RuntimeException('Falhou: ' . $label);
    $checks++;
}
function fetchClients(?string $token = null, string $query = ''): array {
    $headers = $token === null ? '' : "Authorization: Bearer $token\r\n";
    $context = stream_context_create(['http'=>['header'=>$headers, 'ignore_errors'=>true, 'timeout'=>20]]);
    $raw = file_get_contents('http://localhost:8000/api/public/index.php?route=/clientes' . $query, false, $context);
    preg_match('/\s(\d{3})\s/', $http_response_header[0] ?? '', $status);
    return [(int)($status[1] ?? 0), json_decode($raw ?: '{}', true, 32, JSON_THROW_ON_ERROR)];
}
checkClient(fetchClients()[0] === 401, 'acesso sem login negado');
checkClient(fetchClients(str_repeat('0', 64))[0] === 401, 'token inválido negado');
foreach (['barbeiro', 'funcionario', '', 'Admin'] as $role) {
    try { requireAdmin(['role'=>$role]); checkClient(false, 'papel não admin negado'); }
    catch (ApiError $e) { checkClient($e->status === 403, 'papel não admin negado'); }
}
$admins = $pdo->query("SELECT MIN(id_usuario) AS id_usuario,id_barbearia FROM usuarios_admin WHERE ativo=1 AND nivel='admin' AND id_barbearia>0 GROUP BY id_barbearia ORDER BY id_barbearia")->fetchAll();
checkClient(count($admins) > 0, 'administrador existente');
foreach ($admins as $admin) {
    $shop = (int)$admin['id_barbearia'];
    $token = issueToken($pdo, (int)$admin['id_usuario'])['token'];
    [$status, $data] = fetchClients($token);
    checkClient($status === 200 && $data['id_barbearia'] === $shop, 'admin consulta sua loja');
    $stmt = $pdo->prepare('SELECT id_cliente FROM clientes WHERE id_barbearia=? ORDER BY id_cliente');
    $stmt->execute([$shop]);
    $expected = array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN));
    $actual = array_column($data['clientes'], 'id_cliente'); sort($actual);
    checkClient($actual === $expected && $data['metricas']['total'] === count($expected), 'lista completa contém somente clientes da loja');
    checkClient(array_filter($data['clientes'], static fn($c) => $c['id_barbearia'] !== $shop) === [], 'nenhum cliente de outra loja');
    $stmt = $pdo->prepare('SELECT COUNT(*) FROM clientes WHERE id_barbearia=? AND data_cadastro>=CURRENT_DATE() AND data_cadastro<CURRENT_DATE()+INTERVAL 1 DAY');
    $stmt->execute([$shop]);
    checkClient($data['metricas']['novos_hoje'] === (int)$stmt->fetchColumn(), 'novos hoje conferem com banco');
    $stmt = $pdo->prepare('SELECT COUNT(*) FROM clientes WHERE id_barbearia=? AND data_cadastro>=? AND data_cadastro<DATE_ADD(?, INTERVAL 7 DAY)');
    $stmt->execute([$shop, $data['semana']['inicio'], $data['semana']['inicio']]);
    checkClient($data['metricas']['novos_semana'] === (int)$stmt->fetchColumn(), 'semana segunda a domingo confere com banco');
    checkClient(fetchClients($token, '&id_barbearia=' . ($shop + 1))[0] === 403, 'tentativa de trocar loja negada');
    [$status, $tampered] = fetchClients($token, '&usuario_id=999999&nivel=admin');
    checkClient($status === 200 && $tampered['id_barbearia'] === $shop, 'parâmetros não substituem identidade autenticada');
    $expired = issueToken($pdo, (int)$admin['id_usuario'], -1)['token'];
    checkClient(fetchClients($expired)[0] === 401, 'token expirado negado');
}
echo "$checks verificações passaram; " . count($admins) . " barbearia(s) testada(s).\n";

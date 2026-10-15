<?php
// Integração local: php api/tests/report_access.php (servidor na porta 8000).
declare(strict_types=1);
$_SERVER['REQUEST_METHOD'] = 'CLI';
require dirname(__DIR__) . '/config/database.php';
require dirname(__DIR__) . '/src/Core.php';
$pdo = getConnection();
$token = null;
$checks = 0;
function verify(bool $condition, string $label): void {
    global $checks;
    if (!$condition) throw new RuntimeException('Falhou: ' . $label);
    $checks++;
}
function requestReport(string $route, ?string $token = null, ?array $body = null): array {
    $headers = "Content-Type: application/json\r\n";
    if ($token !== null) $headers .= "Authorization: Bearer $token\r\n";
    $context = stream_context_create(['http' => [
        'method' => $body === null ? 'GET' : 'POST', 'header' => $headers,
        'content' => $body === null ? '' : json_encode((object)$body), 'ignore_errors' => true, 'timeout' => 45,
    ]]);
    $raw = file_get_contents('http://localhost:8000/api/public/index.php?route=' . $route, false, $context);
    preg_match('/\s(\d{3})\s/', $http_response_header[0] ?? '', $status);
    return [(int)($status[1] ?? 0), json_decode($raw ?: '{}', true, 32, JSON_THROW_ON_ERROR)];
}
try {
    foreach (['barbeiro', 'funcionario', '', 'Admin'] as $role) {
        try { requireAdmin(['role' => $role]); verify(false, 'recusar papel não admin'); }
        catch (ApiError $e) { verify($e->status === 403, 'recusar papel não admin'); }
    }
    requireAdmin(['role' => 'admin']);
    verify(requestReport('/relatorios/dashboard')[0] === 401, 'sem token');
    verify(requestReport('/relatorios/dashboard', str_repeat('0', 64))[0] === 401, 'token inválido');
    $user = $pdo->query("SELECT id_usuario,id_barbearia FROM usuarios_admin WHERE nivel='admin' AND ativo=1 AND id_barbearia>0 LIMIT 1")->fetch();
    if (!$user) throw new RuntimeException('É necessário um administrador ativo para o teste.');
    $token = issueToken($pdo, (int)$user['id_usuario'])['token'];
    [$status, $data] = requestReport('/relatorios/dashboard&ano=2026&mes=10', $token);
    verify($status === 200 && isset($data['metricas']['faturamento']), 'dashboard autenticado');
    verify(count($data['faturamento_por_dia_semana']) === 7, 'sete dias no gráfico');
    $stmt = $pdo->prepare("SELECT COUNT(*) AS n,COALESCE(SUM(s.preco),0) AS total FROM agendamentos a JOIN servicos s ON s.id_servico=a.id_servico AND s.id_barbearia=a.id_barbearia WHERE a.id_barbearia=? AND a.status_agendamento='concluido' AND a.data_agendamento>='2026-10-01' AND a.data_agendamento<'2026-11-01'");
    $stmt->execute([$user['id_barbearia']]); $expected = $stmt->fetch();
    verify((int)$data['metricas']['atendimentos'] === (int)$expected['n'] && abs((float)$data['metricas']['faturamento'] - (float)$expected['total']) < .001, 'métricas conferem com banco');
    verify(requestReport('/relatorios/dashboard&id_barbearia=' . ((int)$user['id_barbearia'] + 1), $token)[0] === 403, 'isolamento entre barbearias');
    verify(requestReport('/relatorios/dashboard&mes=13', $token)[0] === 400, 'mês inválido');
    [$status, $answer] = requestReport('/ia/perguntar', $token, ['ano'=>2026,'mes'=>10,'pergunta'=>'Quanto faturei?']);
    verify($status === 200 && $answer['tipo'] === 'FATURAMENTO' && !empty($answer['resposta']), 'consulta de faturamento');
    verify(requestReport('/auth/logout', $token, [])[0] === 200, 'logout');
    verify(requestReport('/relatorios/dashboard', $token)[0] === 401, 'token revogado');
    echo "$checks verificações passaram.\n";
} finally {
    if ($token !== null) {
        $stmt = $pdo->prepare('DELETE FROM api_tokens WHERE token_hash=?');
        $stmt->execute([hash('sha256', $token)]);
    }
}

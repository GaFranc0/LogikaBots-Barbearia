<?php
declare(strict_types=1);

function clientDirectory(PDO $db, int $shopId, ?DateTimeImmutable $now = null): array {
    $today = ($now ?? new DateTimeImmutable('now', new DateTimeZone('America/Sao_Paulo')))->setTime(0, 0);
    $tomorrow = $today->modify('+1 day');
    $weekStart = $today->modify('-' . ((int)$today->format('N') - 1) . ' days');
    $weekEnd = $weekStart->modify('+7 days');
    $stats = rows($db, 'SELECT COUNT(*) AS total,
        COALESCE(SUM(data_cadastro >= ? AND data_cadastro < ?), 0) AS novos_hoje,
        COALESCE(SUM(data_cadastro >= ? AND data_cadastro < ?), 0) AS novos_semana
        FROM clientes WHERE id_barbearia = ?', [
            $today->format('Y-m-d H:i:s'), $tomorrow->format('Y-m-d H:i:s'),
            $weekStart->format('Y-m-d H:i:s'), $weekEnd->format('Y-m-d H:i:s'), $shopId,
        ])[0];
    $clients = rows($db, 'SELECT id_cliente, id_barbearia, nome, telefone, remoteJid, data_cadastro
        FROM clientes WHERE id_barbearia = ? ORDER BY nome, id_cliente', [$shopId]);
    foreach ($clients as &$client) {
        $client['id_cliente'] = (int)$client['id_cliente'];
        $client['id_barbearia'] = (int)$client['id_barbearia'];
    }
    unset($client);
    return [
        'id_barbearia' => $shopId,
        'metricas' => array_map('intval', $stats),
        'clientes' => $clients,
        'semana' => ['inicio' => $weekStart->format('Y-m-d'), 'fim' => $weekEnd->modify('-1 day')->format('Y-m-d')],
    ];
}

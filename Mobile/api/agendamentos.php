<?php
require_once __DIR__ . '/config/database.php';

$pdo = getConnection();
$metodo = $_SERVER['REQUEST_METHOD'];

if ($metodo === 'GET') {
    $idBarbearia = $_GET['id_barbearia'] ?? '';
    if ($idBarbearia === '') {
        respond(['erro' => 'id_barbearia é obrigatório'], 400);
    }

    $stmt = $pdo->prepare('SELECT ag.id_agendamento, c.nome AS cliente, c.id_cliente, c.id_barbearia AS cliente_barbearia_id, c.telefone, c.remoteJid, c.data_cadastro, ag.horario_inicio, ag.data_agendamento, b.nome AS profissional, s.nome_servico, s.preco, ag.status_agendamento
        FROM agendamentos ag
        JOIN clientes c ON c.id_cliente = ag.id_cliente
        JOIN barbeiros b ON b.id_barbeiro = ag.id_barbeiro
        JOIN servicos s ON s.id_servico = ag.id_servico
        WHERE ag.id_barbearia = :id_barbearia
        ORDER BY ag.data_agendamento, ag.horario_inicio');
    $stmt->execute(['id_barbearia' => $idBarbearia]);

    $lista = array_map(function ($a) {
        return [
            'id' => (int)$a['id_agendamento'],
            'cliente' => $a['cliente'],
            'cliente_dados' => [
                'id_cliente' => (int)$a['id_cliente'],
                'id_barbearia' => (int)$a['cliente_barbearia_id'],
                'nome' => $a['cliente'],
                'telefone' => $a['telefone'],
                'remoteJid' => $a['remoteJid'],
                'data_cadastro' => $a['data_cadastro'],
            ],
            'horario' => substr($a['horario_inicio'], 0, 5),
            'data' => $a['data_agendamento'],
            'profissional' => $a['profissional'],
            'servico' => $a['nome_servico'],
            'valor' => (float)$a['preco'],
            'status' => statusEnumParaApp($a['status_agendamento']),
        ];
    }, $stmt->fetchAll());

    respond($lista);
}

if ($metodo === 'PUT') {
    $dados = jsonInput();
    $id = $dados['id'] ?? '';
    $status = $dados['status'] ?? '';

    if ($id === '' || $status === '') {
        respond(['erro' => 'id e status são obrigatórios'], 400);
    }

    $stmt = $pdo->prepare('UPDATE agendamentos SET status_agendamento = :status WHERE id_agendamento = :id');
    $stmt->execute(['id' => $id, 'status' => statusAppParaEnum($status)]);

    respond(['mensagem' => 'Status atualizado com sucesso']);
}

if ($metodo === 'DELETE') {
    $id = $_GET['id'] ?? '';
    if ($id === '') {
        respond(['erro' => 'id é obrigatório'], 400);
    }

    $stmt = $pdo->prepare('DELETE FROM agendamentos WHERE id_agendamento = :id');
    $stmt->execute(['id' => $id]);

    respond(['mensagem' => 'Agendamento removido com sucesso']);
}

respond(['erro' => 'Método não suportado'], 405);

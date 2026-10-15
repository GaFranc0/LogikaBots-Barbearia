<?php
require_once __DIR__ . '/config/database.php';

$pdo = getConnection();
$metodo = $_SERVER['REQUEST_METHOD'];

if ($metodo === 'GET') {
    $idBarbearia = $_GET['id_barbearia'] ?? '';
    if ($idBarbearia === '') {
        respond(['erro' => 'id_barbearia é obrigatório'], 400);
    }

    $stmt = $pdo->prepare('SELECT ba.id_bloqueio, ba.id_barbeiro, b.nome AS profissional, ba.data_inicio, ba.data_fim, ba.motivo
        FROM bloqueios_agenda ba
        JOIN barbeiros b ON b.id_barbeiro = ba.id_barbeiro
        WHERE ba.id_barbearia = :id_barbearia
        ORDER BY ba.data_inicio');
    $stmt->execute(['id_barbearia' => $idBarbearia]);

    $lista = array_map(function ($b) {
        return [
            'id' => (string)$b['id_bloqueio'],
            'barbeiro_id' => (string)$b['id_barbeiro'],
            'profissional' => $b['profissional'],
            'data_inicio' => $b['data_inicio'],
            'data_fim' => $b['data_fim'],
            'motivo' => $b['motivo'],
        ];
    }, $stmt->fetchAll());

    respond($lista);
}

if ($metodo === 'POST') {
    $dados = jsonInput();
    $idBarbearia = $dados['id_barbearia'] ?? '';
    $barbeiroId = $dados['barbeiro_id'] ?? '';

    if ($idBarbearia === '') {
        respond(['erro' => 'id_barbearia é obrigatório'], 400);
    }
    if ($barbeiroId === '') {
        respond(['erro' => 'barbeiro_id é obrigatório'], 400);
    }

    $insert = $pdo->prepare('INSERT INTO bloqueios_agenda (id_barbearia, id_barbeiro, motivo, data_inicio, data_fim) VALUES (:id_barbearia, :id_barbeiro, :motivo, :data_inicio, :data_fim)');

    if ($barbeiroId === 'todos') {
        $stmtBarbeiros = $pdo->prepare("SELECT id_barbeiro FROM barbeiros WHERE id_barbearia = :id_barbearia AND situacao = 'ativo'");
        $stmtBarbeiros->execute(['id_barbearia' => $idBarbearia]);
        $barbeiros = $stmtBarbeiros->fetchAll();

        if (empty($barbeiros)) {
            respond(['erro' => 'Nenhum profissional ativo encontrado'], 400);
        }

        $ids = [];
        foreach ($barbeiros as $b) {
            $insert->execute([
                'id_barbearia' => $idBarbearia,
                'id_barbeiro' => $b['id_barbeiro'],
                'motivo' => $dados['motivo'] ?? '',
                'data_inicio' => $dados['dataInicio'] ?? null,
                'data_fim' => $dados['dataFim'] ?? null,
            ]);
            $ids[] = (string)$pdo->lastInsertId();
        }

        respond(['ids' => $ids], 201);
    }

    $insert->execute([
        'id_barbearia' => $idBarbearia,
        'id_barbeiro' => $barbeiroId,
        'motivo' => $dados['motivo'] ?? '',
        'data_inicio' => $dados['dataInicio'] ?? null,
        'data_fim' => $dados['dataFim'] ?? null,
    ]);

    respond(['id' => (string)$pdo->lastInsertId()], 201);
}

if ($metodo === 'PUT') {
    $dados = jsonInput();
    $id = $dados['id'] ?? '';
    $barbeiroId = $dados['barbeiro_id'] ?? '';

    if ($id === '') {
        respond(['erro' => 'id é obrigatório'], 400);
    }
    if ($barbeiroId === 'todos') {
        respond(['erro' => 'Não é possível editar um bloqueio existente para "todos". Remova e crie novamente.'], 400);
    }

    $stmt = $pdo->prepare('UPDATE bloqueios_agenda SET motivo = :motivo, id_barbeiro = :id_barbeiro, data_inicio = :data_inicio, data_fim = :data_fim WHERE id_bloqueio = :id');
    $stmt->execute([
        'id' => $id,
        'motivo' => $dados['motivo'] ?? '',
        'id_barbeiro' => $barbeiroId,
        'data_inicio' => $dados['dataInicio'] ?? null,
        'data_fim' => $dados['dataFim'] ?? null,
    ]);

    respond(['mensagem' => 'Bloqueio atualizado com sucesso']);
}

if ($metodo === 'DELETE') {
    $id = $_GET['id'] ?? '';
    if ($id === '') {
        respond(['erro' => 'id é obrigatório'], 400);
    }

    $stmt = $pdo->prepare('DELETE FROM bloqueios_agenda WHERE id_bloqueio = :id');
    $stmt->execute(['id' => $id]);

    respond(['mensagem' => 'Bloqueio removido com sucesso']);
}

respond(['erro' => 'Método não suportado'], 405);

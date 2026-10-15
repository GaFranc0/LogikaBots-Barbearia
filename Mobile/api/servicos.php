<?php
require_once __DIR__ . '/config/database.php';

$pdo = getConnection();
$metodo = $_SERVER['REQUEST_METHOD'];

function formatarServico($s) {
    return [
        'id' => (int)$s['id_servico'],
        'nome' => $s['nome_servico'],
        'valor' => (float)$s['preco'],
        'minutos' => timeParaMinutos($s['tempo']),
    ];
}

if ($metodo === 'GET') {
    $idBarbearia = $_GET['id_barbearia'] ?? '';
    if ($idBarbearia === '') {
        respond(['erro' => 'id_barbearia é obrigatório'], 400);
    }

    $stmt = $pdo->prepare('SELECT id_servico, nome_servico, preco, tempo FROM servicos WHERE id_barbearia = :id_barbearia ORDER BY id_servico');
    $stmt->execute(['id_barbearia' => $idBarbearia]);
    respond(array_map('formatarServico', $stmt->fetchAll()));
}

if ($metodo === 'POST') {
    $dados = jsonInput();
    $idBarbearia = $dados['id_barbearia'] ?? '';

    if ($idBarbearia === '') {
        respond(['erro' => 'id_barbearia é obrigatório'], 400);
    }

    $stmt = $pdo->prepare('INSERT INTO servicos (id_barbearia, nome_servico, preco, tempo) VALUES (:id_barbearia, :nome, :preco, :tempo)');
    $stmt->execute([
        'id_barbearia' => $idBarbearia,
        'nome' => $dados['nome'] ?? '',
        'preco' => $dados['valor'] ?? 0,
        'tempo' => minutosParaTime($dados['minutos'] ?? 30),
    ]);

    respond(['id' => (int)$pdo->lastInsertId()], 201);
}

if ($metodo === 'PUT') {
    $dados = jsonInput();
    $id = $dados['id'] ?? '';

    if ($id === '') {
        respond(['erro' => 'id é obrigatório'], 400);
    }

    $stmt = $pdo->prepare('UPDATE servicos SET nome_servico = :nome, preco = :preco, tempo = :tempo WHERE id_servico = :id');
    $stmt->execute([
        'id' => $id,
        'nome' => $dados['nome'] ?? '',
        'preco' => $dados['valor'] ?? 0,
        'tempo' => minutosParaTime($dados['minutos'] ?? 30),
    ]);

    respond(['mensagem' => 'Serviço atualizado com sucesso']);
}

if ($metodo === 'DELETE') {
    $id = $_GET['id'] ?? '';
    if ($id === '') {
        respond(['erro' => 'id é obrigatório'], 400);
    }

    $stmt = $pdo->prepare('DELETE FROM servicos WHERE id_servico = :id');
    $stmt->execute(['id' => $id]);

    respond(['mensagem' => 'Serviço removido com sucesso']);
}

respond(['erro' => 'Método não suportado'], 405);

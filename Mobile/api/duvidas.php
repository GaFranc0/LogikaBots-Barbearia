<?php
require_once __DIR__ . '/config/database.php';

$pdo = getConnection();
$metodo = $_SERVER['REQUEST_METHOD'];

if ($metodo === 'GET') {
    $idBarbearia = $_GET['id_barbearia'] ?? '';
    if ($idBarbearia === '') {
        respond(['erro' => 'id_barbearia é obrigatório'], 400);
    }

    $stmt = $pdo->prepare('SELECT id_duvida, duvida_titulo, duvida_resposta FROM duvidas_frequentes WHERE id_barbearia = :id_barbearia ORDER BY id_duvida');
    $stmt->execute(['id_barbearia' => $idBarbearia]);

    $lista = array_map(function ($d) {
        return [
            'id' => (string)$d['id_duvida'],
            'pergunta' => $d['duvida_titulo'],
            'resposta' => $d['duvida_resposta'],
        ];
    }, $stmt->fetchAll());

    respond($lista);
}

if ($metodo === 'POST') {
    $dados = jsonInput();
    $idBarbearia = $dados['id_barbearia'] ?? '';

    if ($idBarbearia === '') {
        respond(['erro' => 'id_barbearia é obrigatório'], 400);
    }

    $stmt = $pdo->prepare('INSERT INTO duvidas_frequentes (id_barbearia, duvida_titulo, duvida_resposta) VALUES (:id_barbearia, :pergunta, :resposta)');
    $stmt->execute([
        'id_barbearia' => $idBarbearia,
        'pergunta' => mb_substr(trim((string)($dados['pergunta'] ?? '')), 0, 150),
        'resposta' => mb_substr(trim((string)($dados['resposta'] ?? '')), 0, 500),
    ]);

    respond(['id' => (string)$pdo->lastInsertId()], 201);
}

if ($metodo === 'PUT') {
    $dados = jsonInput();
    $id = $dados['id'] ?? '';

    if ($id === '') {
        respond(['erro' => 'id é obrigatório'], 400);
    }

    $stmt = $pdo->prepare('UPDATE duvidas_frequentes SET duvida_titulo = :pergunta, duvida_resposta = :resposta WHERE id_duvida = :id');
    $stmt->execute([
        'id' => $id,
        'pergunta' => mb_substr(trim((string)($dados['pergunta'] ?? '')), 0, 150),
        'resposta' => mb_substr(trim((string)($dados['resposta'] ?? '')), 0, 500),
    ]);

    respond(['mensagem' => 'Dúvida atualizada com sucesso']);
}

if ($metodo === 'DELETE') {
    $id = $_GET['id'] ?? '';
    if ($id === '') {
        respond(['erro' => 'id é obrigatório'], 400);
    }

    $stmt = $pdo->prepare('DELETE FROM duvidas_frequentes WHERE id_duvida = :id');
    $stmt->execute(['id' => $id]);

    respond(['mensagem' => 'Dúvida removida com sucesso']);
}

respond(['erro' => 'Método não suportado'], 405);

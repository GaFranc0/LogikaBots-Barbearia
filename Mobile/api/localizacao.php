<?php
require_once __DIR__ . '/config/database.php';

$pdo = getConnection();
$metodo = $_SERVER['REQUEST_METHOD'];

if ($metodo === 'GET') {
    $idBarbearia = $_GET['id_barbearia'] ?? '';
    if ($idBarbearia === '') {
        respond(['erro' => 'id_barbearia é obrigatório'], 400);
    }

    $stmt = $pdo->prepare('SELECT localizacao FROM barbearias WHERE id_barbearia = :id_barbearia');
    $stmt->execute(['id_barbearia' => $idBarbearia]);
    $barbearia = $stmt->fetch();

    respond(['mensagem' => $barbearia ? ($barbearia['localizacao'] ?? '') : '']);
}

if ($metodo === 'POST') {
    $dados = jsonInput();
    $idBarbearia = $dados['id_barbearia'] ?? '';

    if ($idBarbearia === '') {
        respond(['erro' => 'id_barbearia é obrigatório'], 400);
    }

    $stmt = $pdo->prepare('UPDATE barbearias SET localizacao = :mensagem WHERE id_barbearia = :id_barbearia');
    $stmt->execute([
        'id_barbearia' => $idBarbearia,
        'mensagem' => mb_substr(trim((string)($dados['mensagem'] ?? '')), 0, 150),
    ]);

    respond(['mensagem' => 'Localização salva com sucesso']);
}

respond(['erro' => 'Método não suportado'], 405);

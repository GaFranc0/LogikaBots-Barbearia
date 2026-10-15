<?php
require_once __DIR__ . '/config/database.php';

$pdo = getConnection();

$idBarbearia = $_GET['id_barbearia'] ?? 1;

$usuarios = [
    ['user' => 'Admin', 'password' => 'Admin', 'nome' => 'Administrador'],
    ['user' => 'Teste', 'password' => 'senha123', 'nome' => 'Usuário Teste'],
];

foreach ($usuarios as $u) {
    $hash = password_hash($u['password'], PASSWORD_BCRYPT);
    $stmt = $pdo->prepare('INSERT INTO usuarios_admin (id_barbearia, nome, usuario, senha_hash, nivel, ativo)
        VALUES (:id_barbearia, :nome, :usuario, :senha_hash, :nivel, 1)
        ON DUPLICATE KEY UPDATE senha_hash = :senha_hash2, nome = :nome2');
    $stmt->execute([
        'id_barbearia' => $idBarbearia,
        'nome' => $u['nome'],
        'usuario' => $u['user'],
        'senha_hash' => $hash,
        'nivel' => 'admin',
        'senha_hash2' => $hash,
        'nome2' => $u['nome'],
    ]);
}

respond(['mensagem' => 'Usuários iniciais criados/atualizados com sucesso para a barbearia ' . $idBarbearia]);

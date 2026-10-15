<?php
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/src/Core.php';

$pdo = getConnection();
$metodo = $_SERVER['REQUEST_METHOD'];
$acao = $_GET['acao'] ?? '';

if ($metodo === 'POST' && $acao === 'login') {
    header('Cache-Control: no-store');
    $dados = jsonInput();
    $user = trim($dados['user'] ?? '');
    $senha = $dados['password'] ?? '';

    if ($user === '' || $senha === '') {
        respond(['erro' => 'Usuário e senha são obrigatórios'], 400);
    }

    $stmt = $pdo->prepare('SELECT id_usuario, id_barbearia, nome, usuario, senha_hash, nivel, ativo FROM usuarios_admin WHERE usuario = :user');
    $stmt->execute(['user' => $user]);
    $usuario = $stmt->fetch();

    if (!$usuario || (int)$usuario['ativo'] !== 1 || !password_verify($senha, $usuario['senha_hash'])) {
        respond(['erro' => 'Usuário ou senha incorreta'], 401);
    }

    $credentials = issueToken($pdo, (int)$usuario['id_usuario']);
    respond([
        ...$credentials,
        'id' => (int)$usuario['id_usuario'],
        'id_barbearia' => (int)$usuario['id_barbearia'],
        'user' => $usuario['usuario'],
        'nome' => $usuario['nome'],
        'nivel' => $usuario['nivel'],
    ]);
}

if ($metodo === 'GET' && $acao === 'perfil') {
    $id = $_GET['usuario_id'] ?? '';
    if ($id === '') {
        respond(['erro' => 'usuario_id é obrigatório'], 400);
    }

    $stmt = $pdo->prepare('SELECT id_usuario, id_barbearia, nome, usuario, nivel FROM usuarios_admin WHERE id_usuario = :id');
    $stmt->execute(['id' => $id]);
    $usuario = $stmt->fetch();

    if (!$usuario) {
        respond(['erro' => 'Usuário não encontrado'], 404);
    }

    respond([
        'id' => (int)$usuario['id_usuario'],
        'id_barbearia' => (int)$usuario['id_barbearia'],
        'nome' => $usuario['nome'],
        'user' => $usuario['usuario'],
        'nivel' => $usuario['nivel'],
    ]);
}

if ($metodo === 'PUT' && $acao === 'perfil') {
    $dados = jsonInput();
    $id = $dados['usuario_id'] ?? '';

    if ($id === '') {
        respond(['erro' => 'usuario_id é obrigatório'], 400);
    }

    $campos = [];
    $params = ['id' => $id];

    if (isset($dados['nome'])) {
        $campos[] = 'nome = :nome';
        $params['nome'] = $dados['nome'];
    }
    if (isset($dados['user']) && trim($dados['user']) !== '') {
        $campos[] = 'usuario = :usuario';
        $params['usuario'] = trim($dados['user']);
    }
    if (isset($dados['password']) && trim($dados['password']) !== '') {
        $campos[] = 'senha_hash = :senha_hash';
        $params['senha_hash'] = password_hash($dados['password'], PASSWORD_BCRYPT);
    }

    if (empty($campos)) {
        respond(['erro' => 'Nenhum campo para atualizar'], 400);
    }

    $sql = 'UPDATE usuarios_admin SET ' . implode(', ', $campos) . ' WHERE id_usuario = :id';
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    respond(['mensagem' => 'Perfil atualizado com sucesso']);
}

respond(['erro' => 'Rota não encontrada'], 404);

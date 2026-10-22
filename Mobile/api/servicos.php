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

function lerPreco($dados) {
    $valor = $dados['valor'] ?? 0;
    if (is_string($valor)) $valor = str_replace(',', '.', trim($valor));
    if (!is_numeric($valor) || (float)$valor <= 0 || (float)$valor > 99999999) {
        respond(['erro' => 'Informe um preço maior que zero'], 422);
    }
    return round((float)$valor, 2);
}

function lerNome($dados) {
    $nome = trim((string)($dados['nome'] ?? ''));
    if ($nome === '') respond(['erro' => 'Informe o nome do serviço'], 422);
    return mb_substr($nome, 0, 100);
}

try {
    if ($metodo === 'GET') {
        $idBarbearia = $_GET['id_barbearia'] ?? '';
        if ($idBarbearia === '') {
            respond(['erro' => 'id_barbearia é obrigatório'], 400);
        }

        $tempo = minutosParaTime(intervaloBarbearia($pdo, $idBarbearia));
        $sincroniza = $pdo->prepare('UPDATE servicos SET tempo = :tempo WHERE id_barbearia = :id_barbearia AND (tempo IS NULL OR tempo <> :tempo_atual)');
        $sincroniza->execute(['tempo' => $tempo, 'id_barbearia' => $idBarbearia, 'tempo_atual' => $tempo]);

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
            'nome' => lerNome($dados),
            'preco' => lerPreco($dados),
            'tempo' => minutosParaTime(intervaloBarbearia($pdo, $idBarbearia)),
        ]);

        respond(['id' => (int)$pdo->lastInsertId()], 201);
    }

    if ($metodo === 'PUT') {
        $dados = jsonInput();
        $id = $dados['id'] ?? '';

        if ($id === '') {
            respond(['erro' => 'id é obrigatório'], 400);
        }

        $stmtBarbearia = $pdo->prepare('SELECT id_barbearia FROM servicos WHERE id_servico = :id');
        $stmtBarbearia->execute(['id' => $id]);
        $idBarbearia = $stmtBarbearia->fetchColumn();
        if ($idBarbearia === false) {
            respond(['erro' => 'Serviço não encontrado'], 404);
        }

        $stmt = $pdo->prepare('UPDATE servicos SET nome_servico = :nome, preco = :preco, tempo = :tempo WHERE id_servico = :id');
        $stmt->execute([
            'id' => $id,
            'nome' => lerNome($dados),
            'preco' => lerPreco($dados),
            'tempo' => minutosParaTime(intervaloBarbearia($pdo, $idBarbearia)),
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
} catch (PDOException $e) {
    error_log('servicos.php: ' . $e->getMessage());
    if ($e->getCode() === '23000' && $metodo === 'DELETE') {
        respond(['erro' => 'Este serviço possui agendamentos e não pode ser removido'], 409);
    }
    respond(['erro' => 'Não foi possível salvar o serviço. Tente novamente.'], 500);
}

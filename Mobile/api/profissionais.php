<?php
require_once __DIR__ . '/config/database.php';

$pdo = getConnection();
$metodo = $_SERVER['REQUEST_METHOD'];

function horaParaPartes($time, $horaPadrao = 8, $minutoPadrao = 0) {
    if (!$time) return [$horaPadrao, $minutoPadrao];
    $partes = explode(':', $time);
    return [(int)($partes[0] ?? $horaPadrao), (int)($partes[1] ?? $minutoPadrao)];
}

function lerComissao($dados, $padrao = 0) {
    $valor = $dados['comissao_percentual'] ?? $padrao;
    if (is_string($valor)) $valor = str_replace(',', '.', trim($valor));
    if (!is_numeric($valor) || !is_finite((float)$valor) || $valor < 0 || $valor > 100) {
        respond(['erro' => 'Informe uma comissão entre 0 e 100%'], 422);
    }
    return round((float)$valor, 2);
}

function buscarJornada($pdo, $idBarbeiro) {
    $stmt = $pdo->prepare('SELECT dia_semana, MIN(hora_inicio) AS hora_inicio, MAX(hora_fim) AS hora_fim FROM disponibilidade_barbeiro WHERE id_barbeiro = :id GROUP BY dia_semana');
    $stmt->execute(['id' => $idBarbeiro]);
    $linhas = $stmt->fetchAll();

    $jornada = [];
    foreach ($linhas as $linha) {
        $codigo = diaEnumParaApp($linha['dia_semana']);
        if ($codigo === null) continue;
        [$entradaH, $entradaM] = horaParaPartes($linha['hora_inicio']);
        [$saidaH, $saidaM] = horaParaPartes($linha['hora_fim'], 18, 0);
        $jornada[$codigo] = [
            'ativo' => true,
            'entradaHour' => $entradaH,
            'entradaMinute' => $entradaM,
            'saidaHour' => $saidaH,
            'saidaMinute' => $saidaM,
        ];
    }

    foreach (['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'] as $codigo) {
        if (!isset($jornada[$codigo])) {
            $jornada[$codigo] = [
                'ativo' => false,
                'entradaHour' => 8,
                'entradaMinute' => 0,
                'saidaHour' => 18,
                'saidaMinute' => 0,
            ];
        }
    }

    return $jornada;
}

function montarPeriodosJornada($jornada, $inicioAlmoco, $fimAlmoco) {
    $periodos = [];

    foreach ($jornada as $codigo => $info) {
        if (empty($info['ativo'])) continue;
        $enum = diaAppParaEnum($codigo);
        if ($enum === null) continue;

        $horaInicio = sprintf('%02d:%02d:00', $info['entradaHour'] ?? 8, $info['entradaMinute'] ?? 0);
        $horaFim = sprintf('%02d:%02d:00', $info['saidaHour'] ?? 18, $info['saidaMinute'] ?? 0);

        if (!($horaInicio < $inicioAlmoco && $inicioAlmoco < $fimAlmoco && $fimAlmoco < $horaFim)) {
            respond(['erro' => "Em $codigo, use a ordem: entrada, início do almoço, fim do almoço e saída"], 422);
        }

        $periodos[] = [$enum, $horaInicio, $inicioAlmoco];
        $periodos[] = [$enum, $fimAlmoco, $horaFim];
    }

    return $periodos;
}

function salvarJornada($pdo, $idBarbeiro, $idBarbearia, $periodos) {
    $stmt = $pdo->prepare('DELETE FROM disponibilidade_barbeiro WHERE id_barbeiro = :id');
    $stmt->execute(['id' => $idBarbeiro]);

    $insert = $pdo->prepare('INSERT INTO disponibilidade_barbeiro (id_barbearia, id_barbeiro, dia_semana, hora_inicio, hora_fim) VALUES (:id_barbearia, :id_barbeiro, :dia_semana, :hora_inicio, :hora_fim)');

    foreach ($periodos as [$enum, $horaInicio, $horaFim]) {
        $insert->execute([
            'id_barbearia' => $idBarbearia,
            'id_barbeiro' => $idBarbeiro,
            'dia_semana' => $enum,
            'hora_inicio' => $horaInicio,
            'hora_fim' => $horaFim,
        ]);
    }
}

if ($metodo === 'GET') {
    $idBarbearia = $_GET['id_barbearia'] ?? '';
    if ($idBarbearia === '') {
        respond(['erro' => 'id_barbearia é obrigatório'], 400);
    }

    $stmt = $pdo->prepare("SELECT id_barbeiro, nome, almoco_inicio, almoco_fim, comissao_percentual FROM barbeiros WHERE id_barbearia = :id_barbearia AND situacao = 'ativo' ORDER BY nome");
    $stmt->execute(['id_barbearia' => $idBarbearia]);
    $barbeiros = $stmt->fetchAll();

    $lista = array_map(function ($b) use ($pdo) {
        [$inicioH, $inicioM] = horaParaPartes($b['almoco_inicio'], 12, 0);
        [$fimH, $fimM] = horaParaPartes($b['almoco_fim'], 13, 0);

        return [
            'id' => (string)$b['id_barbeiro'],
            'nome' => $b['nome'],
            'comissao_percentual' => (float)$b['comissao_percentual'],
            'inicioAlmocoHour' => $inicioH,
            'inicioAlmocoMinute' => $inicioM,
            'fimAlmocoHour' => $fimH,
            'fimAlmocoMinute' => $fimM,
            'jornada' => buscarJornada($pdo, $b['id_barbeiro']),
        ];
    }, $barbeiros);

    respond($lista);
}

if ($metodo === 'POST') {
    $dados = jsonInput();
    $comissao = lerComissao($dados);
    $idBarbearia = $dados['id_barbearia'] ?? '';

    if ($idBarbearia === '') {
        respond(['erro' => 'id_barbearia é obrigatório'], 400);
    }

    $inicioAlmoco = sprintf('%02d:%02d:00', $dados['inicioAlmocoHour'] ?? 12, $dados['inicioAlmocoMinute'] ?? 0);
    $fimAlmoco = sprintf('%02d:%02d:00', $dados['fimAlmocoHour'] ?? 13, $dados['fimAlmocoMinute'] ?? 0);
    $periodos = montarPeriodosJornada($dados['jornada'] ?? [], $inicioAlmoco, $fimAlmoco);

    $stmt = $pdo->prepare("INSERT INTO barbeiros (id_barbearia, nome, situacao, almoco_inicio, almoco_fim, comissao_percentual) VALUES (:id_barbearia, :nome, 'ativo', :inicio_almoco, :fim_almoco, :comissao)");
    $stmt->execute([
        'id_barbearia' => $idBarbearia,
        'nome' => $dados['nome'] ?? '',
        'comissao' => $comissao,
        'inicio_almoco' => $inicioAlmoco,
        'fim_almoco' => $fimAlmoco,
    ]);

    $idBarbeiro = (int)$pdo->lastInsertId();
    salvarJornada($pdo, $idBarbeiro, $idBarbearia, $periodos);

    respond(['id' => (string)$idBarbeiro], 201);
}

if ($metodo === 'PUT') {
    $dados = jsonInput();
    $id = $dados['id'] ?? '';

    if ($id === '') {
        respond(['erro' => 'id é obrigatório'], 400);
    }

    $stmtBusca = $pdo->prepare('SELECT id_barbearia, comissao_percentual FROM barbeiros WHERE id_barbeiro = :id');
    $stmtBusca->execute(['id' => $id]);
    $barbeiro = $stmtBusca->fetch();

    if (!$barbeiro) {
        respond(['erro' => 'Profissional não encontrado'], 404);
    }

    $comissao = lerComissao($dados, $barbeiro['comissao_percentual']);

    $inicioAlmoco = sprintf('%02d:%02d:00', $dados['inicioAlmocoHour'] ?? 12, $dados['inicioAlmocoMinute'] ?? 0);
    $fimAlmoco = sprintf('%02d:%02d:00', $dados['fimAlmocoHour'] ?? 13, $dados['fimAlmocoMinute'] ?? 0);
    $periodos = montarPeriodosJornada($dados['jornada'] ?? [], $inicioAlmoco, $fimAlmoco);

    $stmt = $pdo->prepare('UPDATE barbeiros SET nome = :nome, almoco_inicio = :inicio_almoco, almoco_fim = :fim_almoco, comissao_percentual = :comissao WHERE id_barbeiro = :id');
    $stmt->execute([
        'id' => $id,
        'nome' => $dados['nome'] ?? '',
        'comissao' => $comissao,
        'inicio_almoco' => $inicioAlmoco,
        'fim_almoco' => $fimAlmoco,
    ]);

    salvarJornada($pdo, $id, $barbeiro['id_barbearia'], $periodos);

    respond(['mensagem' => 'Profissional atualizado com sucesso']);
}

if ($metodo === 'DELETE') {
    $id = $_GET['id'] ?? '';
    if ($id === '') {
        respond(['erro' => 'id é obrigatório'], 400);
    }

    $stmt = $pdo->prepare("UPDATE barbeiros SET situacao = 'inativo' WHERE id_barbeiro = :id");
    $stmt->execute(['id' => $id]);

    respond(['mensagem' => 'Profissional removido com sucesso']);
}

respond(['erro' => 'Método não suportado'], 405);

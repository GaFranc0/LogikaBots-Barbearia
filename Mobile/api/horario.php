<?php
require_once __DIR__ . '/config/database.php';

$pdo = getConnection();
$metodo = $_SERVER['REQUEST_METHOD'];

function horarioParaMinutos($horario) {
    if (!is_string($horario) || !preg_match('/^(\d{1,2}):(\d{2})$/', $horario, $partes)) {
        return null;
    }

    $hora = (int)$partes[1];
    $minuto = (int)$partes[2];
    if ($hora < 0 || $hora > 23 || $minuto < 0 || $minuto > 59) {
        return null;
    }

    return ($hora * 60) + $minuto;
}

function minutosParaHorario($minutos) {
    return sprintf('%02d:%02d:00', intdiv($minutos, 60), $minutos % 60);
}

if ($metodo === 'GET') {
    $idBarbearia = $_GET['id_barbearia'] ?? '';
    if ($idBarbearia === '') {
        respond(['erro' => 'id_barbearia é obrigatório'], 400);
    }

    $stmt = $pdo->prepare('SELECT horario_funcionamento_inicio, horario_funcionamento_fim, dia_inicio, dia_fim FROM barbearias WHERE id_barbearia = :id_barbearia');
    $stmt->execute(['id_barbearia' => $idBarbearia]);
    $barbearia = $stmt->fetch();

    if (!$barbearia) {
        respond(['erro' => 'Barbearia não encontrada'], 404);
    }

    $stmtHorarios = $pdo->prepare('SELECT horario FROM horarios_atendimento WHERE id_barbearia = :id_barbearia ORDER BY horario');
    $stmtHorarios->execute(['id_barbearia' => $idBarbearia]);
    $horarios = array_map(
        fn($horario) => substr($horario, 0, 5),
        $stmtHorarios->fetchAll(PDO::FETCH_COLUMN)
    );

    $intervaloMinutos = 40;
    if (count($horarios) >= 2) {
        $primeiro = horarioParaMinutos($horarios[0]);
        $segundo = horarioParaMinutos($horarios[1]);
        if ($primeiro !== null && $segundo !== null && $segundo > $primeiro) {
            $intervaloMinutos = $segundo - $primeiro;
        }
    }

    respond([
        'abertura' => substr($barbearia['horario_funcionamento_inicio'], 0, 5),
        'fechamento' => substr($barbearia['horario_funcionamento_fim'], 0, 5),
        'primeiroDia' => diaIntParaNome((int)$barbearia['dia_inicio']),
        'ultimoDia' => diaIntParaNome((int)$barbearia['dia_fim']),
        'intervalo' => $intervaloMinutos . ' minutos',
        'intervaloMinutos' => $intervaloMinutos,
        'horarios' => $horarios,
    ]);
}

if ($metodo === 'POST') {
    $dados = jsonInput();
    $idBarbearia = $dados['id_barbearia'] ?? '';

    if ($idBarbearia === '') {
        respond(['erro' => 'id_barbearia é obrigatório'], 400);
    }

    $abertura = $dados['abertura'] ?? '';
    $fechamento = $dados['fechamento'] ?? '';
    $inicioMinutos = horarioParaMinutos($abertura);
    $fimMinutos = horarioParaMinutos($fechamento);
    $intervaloMinutos = (int)($dados['intervaloMinutos'] ?? preg_replace('/\D+/', '', $dados['intervalo'] ?? '40'));

    if ($inicioMinutos === null || $fimMinutos === null) {
        respond(['erro' => 'Horários de abertura e fechamento inválidos'], 400);
    }
    if ($fimMinutos <= $inicioMinutos) {
        respond(['erro' => 'O horário de fechamento deve ser posterior ao de abertura'], 400);
    }
    if ($intervaloMinutos <= 0 || $intervaloMinutos > 720) {
        respond(['erro' => 'Intervalo entre agendamentos inválido'], 400);
    }

    try {
        $pdo->beginTransaction();

        $stmt = $pdo->prepare('UPDATE barbearias SET horario_funcionamento_inicio = :abertura, horario_funcionamento_fim = :fechamento, dia_inicio = :dia_inicio, dia_fim = :dia_fim WHERE id_barbearia = :id_barbearia');
        $stmt->execute([
            'id_barbearia' => $idBarbearia,
            'abertura' => $abertura,
            'fechamento' => $fechamento,
            'dia_inicio' => diaNomeParaInt($dados['primeiroDia'] ?? 'Segunda-feira'),
            'dia_fim' => diaNomeParaInt($dados['ultimoDia'] ?? 'Sexta-feira'),
        ]);

        $pdo->exec('DELETE FROM horarios_atendimento');

        $insert = $pdo->prepare('INSERT INTO horarios_atendimento (id_barbearia, horario) VALUES (:id_barbearia, :horario)');
        $horarios = [];
        for ($minutos = $inicioMinutos; $minutos < $fimMinutos; $minutos += $intervaloMinutos) {
            $horario = minutosParaHorario($minutos);
            $insert->execute([
                'id_barbearia' => $idBarbearia,
                'horario' => $horario,
            ]);
            $horarios[] = substr($horario, 0, 5);
        }

        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        respond(['erro' => 'Não foi possível salvar os horários de atendimento'], 500);
    }

    respond([
        'mensagem' => 'Horários de atendimento salvos com sucesso',
        'quantidade' => count($horarios),
        'horarios' => $horarios,
    ]);
}

respond(['erro' => 'Método não suportado'], 405);

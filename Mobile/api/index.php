<?php
require_once __DIR__ . '/config/database.php';

try {
    $pdo = getConnection();
    $status = 'conectado';
} catch (Exception $e) {
    $status = 'erro';
}

respond([
    'api' => 'LogikaBots - API do app mobile',
    'status_banco' => $status,
    'endpoints' => [
        'POST /usuarios.php?acao=login' => 'Login (user, password)',
        'GET/PUT /usuarios.php?acao=perfil' => 'Perfil do usuário admin',
        'GET/POST/PUT/DELETE /servicos.php' => 'Serviços do catálogo',
        'GET/POST/PUT/DELETE /profissionais.php' => 'Profissionais (barbeiros)',
        'GET/POST/PUT/DELETE /bloqueios.php' => 'Bloqueios de agenda',
        'GET/POST/PUT/DELETE /duvidas.php' => 'Dúvidas frequentes',
        'GET/POST /horario.php' => 'Horário de funcionamento',
        'GET/POST /localizacao.php' => 'Localização da barbearia',
        'GET/PUT /agendamentos.php' => 'Agendamentos',
    ],
]);

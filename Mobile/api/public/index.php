<?php
declare(strict_types=1);
require dirname(__DIR__) . '/config/database.php';
require dirname(__DIR__) . '/src/Core.php';
require dirname(__DIR__) . '/src/Reports.php';
require dirname(__DIR__) . '/src/Planner.php';
require dirname(__DIR__) . '/src/Clients.php';
date_default_timezone_set('America/Sao_Paulo');
ini_set('display_errors', '0');
header('X-Content-Type-Options: nosniff');
try {
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    // Funciona com rewrite e também com index.php?route=/ia/perguntar.
    $path = $_GET['route'] ?? parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
    if (!is_string($path)) throw new ApiError(400, 'Rota inválida.');
    $path = '/' . trim($path, '/');
    $routes = ['/auth/login' => 'POST', '/auth/logout' => 'POST', '/ia/status' => 'GET',
        '/ia/perguntar' => 'POST', '/relatorios/dashboard' => 'GET', '/clientes' => 'GET'];
    if (!isset($routes[$path])) throw new ApiError(404, 'Endpoint não encontrado.');
    if ($method !== $routes[$path]) { header('Allow: ' . $routes[$path]); throw new ApiError(405, 'Método não permitido.'); }
    $input = $method === 'POST' ? bodyJson() : $_GET;
    if ($path === '/auth/login') reply(login(db(), $input));
    $user = authenticatedUser(db());
    $id = tenant($user, $input['id_barbearia'] ?? null);
    if ($path === '/auth/logout') {
        $token = substr($_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'], 7);
        $stmt = db()->prepare('DELETE FROM api_tokens WHERE token_hash = ?'); $stmt->execute([hash('sha256', $token)]);
        reply(['sucesso' => true]);
    }
    requireAdmin($user);
    if ($path === '/clientes') reply(clientDirectory(db(true), $id));
    if ($path === '/ia/status') {
        // Não expõe catálogo dos modelos, URL interna ou credenciais.
        ollama([['role' => 'user', 'content' => 'Responda {"ok":true}']], null, 15);
        reply(['sucesso' => true]);
    }
    $ano = integerField($input['ano'] ?? date('Y'), 'ano', 2000, 2100);
    $mes = integerField($input['mes'] ?? date('n'), 'mes', 1, 12);
    if ($path === '/relatorios/dashboard') reply(dashboard(db(true), $id, $ano, $mes));
    $question = $input['pergunta'] ?? null;
    if (!is_string($question) || trim($question) === '' || mb_strlen($question, 'UTF-8') > 300) {
        throw new ApiError(400, 'Informe uma pergunta de até 300 caracteres.');
    }
    $history = $input['historico'] ?? [];
    if (!is_array($history) || !array_is_list($history)) throw new ApiError(400, 'Histórico inválido.');
    reply(askReport(db(true), trim($question), $id, $ano, $mes, array_slice($history, -6)));
} catch (ApiError $e) { reply(['error' => $e->getMessage()], $e->status); }
catch (Throwable $e) { error_log('API: '.get_class($e).' código '.$e->getCode()); reply(['error' => 'Erro interno ao processar a solicitação.'], 500); }

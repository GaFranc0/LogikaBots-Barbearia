<?php
declare(strict_types=1);

final class ApiError extends RuntimeException {
    public function __construct(public readonly int $status, string $message) { parent::__construct($message); }
}
function envValue(string $key, string $default = ''): string {
    $value = getenv($key);
    return $value === false ? $default : $value;
}
function requiredEnv(string $key): string {
    $value = envValue($key);
    if ($value === '') throw new RuntimeException("Configuração ausente: $key");
    return $value;
}
function reply(array $data, int $status = 200): never {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    exit;
}
function bodyJson(): array {
    if (!str_starts_with(strtolower($_SERVER['CONTENT_TYPE'] ?? ''), 'application/json')) {
        throw new ApiError(415, 'Envie Content-Type: application/json.');
    }
    $raw = file_get_contents('php://input', false, null, 0, 32769);
    if ($raw === false || strlen($raw) > 32768) throw new ApiError(413, 'Corpo da requisição muito grande.');
    try { $obj = json_decode($raw, false, 32, JSON_THROW_ON_ERROR); }
    catch (JsonException) { throw new ApiError(400, 'JSON inválido.'); }
    if (!$obj instanceof stdClass) throw new ApiError(400, 'Envie um objeto JSON.');
    return (array)$obj;
}
function integerField(mixed $value, string $name, int $min, int $max): int {
    if ((!is_int($value) && !is_string($value)) || !preg_match('/^\d+$/D', (string)$value)) {
        throw new ApiError(400, "$name inválido.");
    }
    $n = filter_var($value, FILTER_VALIDATE_INT);
    if ($n === false || $n < $min || $n > $max) throw new ApiError(400, "$name inválido.");
    return $n;
}
function db(bool $reports = false): PDO {
    static $connections = [];
    $key = $reports ? 'reports' : 'auth';
    if (isset($connections[$key])) return $connections[$key];
    if (envValue('DB_HOST') === '' && function_exists('getConnection')) {
        $pdo = getConnection();
        $pdo->exec("SET time_zone = '-03:00'");
        return $connections[$key] = $pdo;
    }
    $host = requiredEnv('DB_HOST');
    $name = requiredEnv('DB_NAME');
    if (!preg_match('/^[a-zA-Z0-9_.:-]+$/D', $host) || !preg_match('/^[a-zA-Z0-9_-]+$/D', $name)) {
        throw new RuntimeException('DB_HOST ou DB_NAME inválido.');
    }
    $port = integerField(envValue('DB_PORT', '3306'), 'DB_PORT', 1, 65535);
    $pdo = new PDO("mysql:host=$host;port=$port;dbname=$name;charset=utf8mb4",
        requiredEnv($reports ? 'DB_IA_USER' : 'DB_USER'),
        requiredEnv($reports ? 'DB_IA_PASSWORD' : 'DB_PASSWORD'),
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_EMULATE_PREPARES => false,
         PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
    $pdo->exec("SET time_zone = '-03:00'");
    return $connections[$key] = $pdo;
}
function rows(PDO $db, string $sql, array $params = []): array {
    $stmt = $db->prepare($sql); $stmt->execute($params); return $stmt->fetchAll();
}
function base64UrlEncode(string $value): string {
    return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
}
function base64UrlDecode(string $value): string|false {
    return base64_decode(strtr($value, '-_', '+/'), true);
}
function tokenSecret(): string {
    $secret = envValue('API_SECRET');
    if ($secret !== '') return $secret;
    if (defined('DB_PASS')) return hash('sha256', 'api-token|' . DB_PASS);
    throw new RuntimeException('Configuração ausente: API_SECRET');
}
function passwordFingerprint(string $passwordHash): string {
    return substr(hash_hmac('sha256', $passwordHash, tokenSecret()), 0, 16);
}
function authenticatedUser(PDO $pdo): array {
    $authorization = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if (!preg_match('/^Bearer ([A-Za-z0-9_-]{1,512})\.([A-Za-z0-9_-]{43})$/D', $authorization, $m)) {
        throw new ApiError(401, 'Faça login para continuar.');
    }
    $signature = base64UrlDecode($m[2]);
    $expected = hash_hmac('sha256', $m[1], tokenSecret(), true);
    if ($signature === false || !hash_equals($expected, $signature)) {
        throw new ApiError(401, 'Sessão inválida ou expirada.');
    }
    $payload = json_decode((string)base64UrlDecode($m[1]), true);
    if (!is_array($payload) || !is_int($payload['u'] ?? null) || !is_int($payload['e'] ?? null) ||
        !is_string($payload['f'] ?? null) || $payload['e'] <= time()) {
        throw new ApiError(401, 'Sessão inválida ou expirada.');
    }
    $user = rows($pdo, 'SELECT id_usuario, nome, usuario, id_barbearia, nivel AS role, senha_hash
        FROM usuarios_admin WHERE id_usuario = ? AND ativo = 1 LIMIT 1', [$payload['u']])[0] ?? null;
    if (!$user || (int)$user['id_barbearia'] <= 0 ||
        !hash_equals(passwordFingerprint((string)$user['senha_hash']), $payload['f'])) {
        throw new ApiError(401, 'Sessão inválida ou expirada.');
    }
    unset($user['senha_hash']);
    return $user;
}
function tenant(array $user, mixed $requested = null): int {
    $id = (int)$user['id_barbearia'];
    if ($requested !== null && integerField($requested, 'id_barbearia', 1, PHP_INT_MAX) !== $id) {
        throw new ApiError(403, 'Você não tem acesso a essa barbearia.');
    }
    return $id;
}
function requireAdmin(array $user): void {
    if (($user['role'] ?? '') !== 'admin') {
        throw new ApiError(403, 'Acesso disponível somente para administradores.');
    }
}
function issueToken(PDO $pdo, int $userId, ?int $ttl = null): array {
    $ttl ??= integerField(envValue('TOKEN_TTL_SECONDS', '28800'), 'TOKEN_TTL_SECONDS', 300, 604800);
    $stmt = $pdo->prepare('SELECT senha_hash FROM usuarios_admin WHERE id_usuario = ? AND ativo = 1 LIMIT 1');
    $stmt->execute([$userId]);
    $passwordHash = $stmt->fetchColumn();
    if (!is_string($passwordHash)) throw new ApiError(401, 'Usuário ou senha inválidos.');
    $payload = base64UrlEncode(json_encode(['u' => $userId, 'e' => time() + $ttl, 'f' => passwordFingerprint($passwordHash)],
        JSON_THROW_ON_ERROR));
    $signature = base64UrlEncode(hash_hmac('sha256', $payload, tokenSecret(), true));
    return ['token' => "$payload.$signature", 'token_type' => 'Bearer', 'expires_in' => $ttl];
}
function login(PDO $pdo, array $input): array {
    $login = $input['usuario'] ?? $input['email'] ?? null;
    $password = $input['password'] ?? null;
    if (!is_string($login) || !is_string($password) || trim($login) === '' || strlen($login) > 150 || strlen($password) > 1024) {
        throw new ApiError(400, 'Informe usuário e senha válidos.');
    }
    $user = rows($pdo, 'SELECT id_usuario, nome, usuario, senha_hash, id_barbearia, nivel AS role
        FROM usuarios_admin WHERE usuario = ? AND ativo = 1 LIMIT 1', [trim($login)])[0] ?? null;
    $hash = $user['senha_hash'] ?? '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi';
    if (str_starts_with($hash, '$2a$') || str_starts_with($hash, '$2b$')) $hash = '$2y$' . substr($hash, 4);
    $valid = password_verify($password, $hash);
    if (!$user || !$valid || (int)$user['id_barbearia'] <= 0) throw new ApiError(401, 'Usuário ou senha inválidos.');
    $credentials = issueToken($pdo, (int)$user['id_usuario']);
    unset($user['senha_hash']);
    $user['id_barbearia'] = (int)$user['id_barbearia'];
    $user['id_usuario'] = (int)$user['id_usuario'];
    return [...$credentials, 'user' => $user];
}
function ollama(array $messages, ?array $schema = null, int $timeout = 45, int $maxTokens = 512): string {
    $base = rtrim(envValue('OLLAMA_URL', 'http://127.0.0.1:11434'), '/');
    $url = parse_url($base);
    if (!$url || !in_array($url['scheme'] ?? '', ['http','https'], true) || empty($url['host']) ||
        isset($url['user']) || isset($url['pass']) || isset($url['query']) || isset($url['fragment'])) {
        throw new RuntimeException('OLLAMA_URL inválida.');
    }
    $body = ['model' => envValue('OLLAMA_MODEL', 'qwen2.5:1.5b'), 'messages' => $messages,
        'stream' => false, 'keep_alive' => '2m', 'options' => ['temperature' => 0.1, 'num_predict' => $maxTokens, 'num_ctx' => 4096],
        'format' => $schema ?? 'json'];
    $curl = curl_init($base . '/api/chat');
    curl_setopt_array($curl, [CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS => json_encode($body, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
        CURLOPT_CONNECTTIMEOUT => 5, CURLOPT_TIMEOUT => $timeout, CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_PROTOCOLS => CURLPROTO_HTTP | CURLPROTO_HTTPS,
        CURLOPT_WRITEFUNCTION => static function ($ch, string $chunk) use (&$response): int {
            $response = ($response ?? '') . $chunk;
            return strlen($response) <= 1048576 ? strlen($chunk) : 0;
        }]);
    $response = ''; $ok = curl_exec($curl); $code = (int)curl_getinfo($curl, CURLINFO_HTTP_CODE);
    $err = curl_errno($curl); curl_close($curl);
    if ($ok === false || $code !== 200) {
        error_log("Ollama: HTTP $code, cURL $err");
        throw new ApiError($err === CURLE_OPERATION_TIMEDOUT ? 504 : 502, 'A IA está indisponível. Tente novamente.');
    }
    $json = json_decode($response, true, 32, JSON_THROW_ON_ERROR);
    $content = $json['message']['content'] ?? null;
    if (!is_string($content) || $content === '') throw new ApiError(502, 'A IA retornou uma resposta inválida.');
    return $content;
}

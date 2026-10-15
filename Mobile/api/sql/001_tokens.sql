-- Execute uma vez no mesmo banco. Não altera tabelas existentes.
CREATE TABLE IF NOT EXISTS api_tokens (
    token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    id_usuario INT NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_api_token_user (id_usuario),
    INDEX idx_api_token_expiry (expires_at)
);
-- Agende diariamente: DELETE FROM api_tokens WHERE expires_at <= UTC_TIMESTAMP();
-- DB_USER precisa SELECT em usuarios_admin e SELECT/INSERT/DELETE em api_tokens.
-- DB_IA_USER deve ter somente SELECT nas tabelas consultadas pelos relatórios.

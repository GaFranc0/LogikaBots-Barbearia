CREATE SCHEMA IF NOT EXISTS schema_barbearia;
USE schema_barbearia;
SET FOREIGN_KEY_CHECKS = 1;
-- ==============================
-- 1. BARBEARIAS
-- ==============================
CREATE TABLE barbearias (
    id_barbearia INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    telefone_whatsapp VARCHAR(25) NOT NULL,
    endereco VARCHAR(255),
    horario_funcionamento_inicio TIME NOT NULL,
    horario_funcionamento_fim TIME NOT NULL,
    id_instance VARCHAR(100) NOT NULL UNIQUE,
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_barbearias_instance ON barbearias(id_instance);


-- ==============================
-- 2. CLIENTES
-- ==============================
CREATE TABLE clientes (
    id_cliente INT AUTO_INCREMENT PRIMARY KEY,
    id_barbearia INT NOT NULL,
    nome VARCHAR(100),
    telefone VARCHAR(30),
    remoteJid VARCHAR(50) NOT NULL,
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Permite o mesmo número de telefone (remoteJid), desde que em barbearias diferentes
    UNIQUE(remoteJid, id_barbearia),
    
    FOREIGN KEY (id_barbearia) REFERENCES barbearias(id_barbearia) ON DELETE CASCADE
);

CREATE INDEX idx_clientes_remotejid ON clientes(remoteJid, id_barbearia);


-- ==============================
-- 3. SERVIÇOS
-- ==============================
CREATE TABLE servicos (
    id_servico INT AUTO_INCREMENT PRIMARY KEY,
    id_barbearia INT NOT NULL,
    nome_servico VARCHAR(50) NOT NULL,
    preco DECIMAL(10,2) NOT NULL,
    tempo TIME NOT NULL,

    FOREIGN KEY (id_barbearia) REFERENCES barbearias(id_barbearia) ON DELETE CASCADE
);


-- ==============================
-- 4. BARBEIROS
-- ==============================
CREATE TABLE barbeiros (
    id_barbeiro INT AUTO_INCREMENT PRIMARY KEY,
    id_barbearia INT NOT NULL,
    nome VARCHAR(100) NOT NULL,
    situacao ENUM('ativo','inativo') DEFAULT 'ativo',

    FOREIGN KEY (id_barbearia) REFERENCES barbearias(id_barbearia) ON DELETE CASCADE
);


-- ==============================
-- 5. HORÁRIOS BASE DA BARBEARIA
-- ==============================
CREATE TABLE horarios_atendimento (
    id_horario INT AUTO_INCREMENT PRIMARY KEY,
    id_barbearia INT NOT NULL,
    horario TIME NOT NULL,

    UNIQUE(id_barbearia, horario),
    FOREIGN KEY (id_barbearia) REFERENCES barbearias(id_barbearia) ON DELETE CASCADE
);


-- ==============================
-- 6. AGENDAMENTOS (AQUI ESTÁ A CORREÇÃO DO SEU ERRO)
-- ==============================
CREATE TABLE agendamentos (
    id_agendamento INT AUTO_INCREMENT PRIMARY KEY,
    id_barbearia INT NOT NULL,
    id_cliente INT NOT NULL,
    id_barbeiro INT NOT NULL,
    id_servico INT NOT NULL,
    data_agendamento DATE NOT NULL,
    horario_inicio TIME NOT NULL,
    horario_fim TIME NOT NULL,
    status_agendamento ENUM('agendado','concluido','cancelado') DEFAULT 'agendado',
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- FKs com CASCADE para limpeza automática
    FOREIGN KEY (id_barbearia) REFERENCES barbearias(id_barbearia) ON DELETE CASCADE,
    FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente) ON DELETE CASCADE,
    FOREIGN KEY (id_barbeiro) REFERENCES barbeiros(id_barbeiro) ON DELETE CASCADE,
    FOREIGN KEY (id_servico) REFERENCES servicos(id_servico) ON DELETE CASCADE
);

-- CORREÇÃO: Adicionado 'id_barbearia' no índice ÚNICO.
-- Antes: Impedia o Barbeiro 6 de ter agenda no mesmo horário em QUALQUER lugar.
-- Agora: Impede o Barbeiro 6 de ter agenda no mesmo horário DENTRO DAQUELA BARBEARIA.
CREATE UNIQUE INDEX ux_agendamento_barbeiro_horario
ON agendamentos (id_barbearia, id_barbeiro, data_agendamento, horario_inicio);

CREATE INDEX idx_agendamentos_data
ON agendamentos (data_agendamento, id_barbeiro);


-- ==============================
-- 7. DISPONIBILIDADE SEMANAL
-- ==============================
CREATE TABLE disponibilidade_barbeiro (
    id_disponibilidade INT AUTO_INCREMENT PRIMARY KEY,
    id_barbearia INT NOT NULL,
    id_barbeiro INT NOT NULL,
    dia_semana ENUM('seg','ter','qua','qui','sex','sab','dom') NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fim TIME NOT NULL,

    FOREIGN KEY (id_barbearia) REFERENCES barbearias(id_barbearia) ON DELETE CASCADE,
    FOREIGN KEY (id_barbeiro) REFERENCES barbeiros(id_barbeiro) ON DELETE CASCADE
);


-- ==============================
-- 8. BLOQUEIOS / EXCEÇÕES
-- ==============================
CREATE TABLE bloqueios_agenda (
    id_bloqueio INT AUTO_INCREMENT PRIMARY KEY,
    id_barbearia INT NOT NULL,
    id_barbeiro INT NOT NULL,
    data_inicio DATETIME NOT NULL,
    data_fim DATETIME NOT NULL,
    motivo VARCHAR(150),

    FOREIGN KEY (id_barbearia) REFERENCES barbearias(id_barbearia) ON DELETE CASCADE,
    FOREIGN KEY (id_barbeiro) REFERENCES barbeiros(id_barbeiro) ON DELETE CASCADE
);


-- ==============================
-- 9. USUÁRIOS ADMIN (PAINEL)
-- ==============================
CREATE TABLE usuarios_admin (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    id_barbearia INT NOT NULL,
    nome VARCHAR(100),
    email VARCHAR(150) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    nivel ENUM('admin','gerente','atendente') DEFAULT 'admin',
    ativo BOOLEAN DEFAULT TRUE,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (id_barbearia) REFERENCES barbearias(id_barbearia) ON DELETE CASCADE
);


-- ==============================
-- 10. SESSÕES DO BOT (CÉREBRO DO CHAT)
-- ==============================
CREATE TABLE sessoes_bot (
    id_sessao INT AUTO_INCREMENT PRIMARY KEY,
    id_cliente INT NOT NULL,
    id_barbearia INT NOT NULL,
    etapa VARCHAR(50),
    dados_contexto JSON,
    bot_ativo BOOLEAN DEFAULT TRUE,
    id_session VARCHAR(50),
    ultima_interacao DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente) ON DELETE CASCADE,
    FOREIGN KEY (id_barbearia) REFERENCES barbearias(id_barbearia) ON DELETE CASCADE,

    -- Garante que o cliente só tenha 1 sessão ativa POR barbearia
    UNIQUE (id_cliente, id_barbearia)
);

CREATE INDEX idx_sessoes_etapa ON sessoes_bot(etapa);

-- ==============================
-- 11. CONTROLE DE MENSAGENS
-- ==============================
CREATE TABLE controle_mensagens (
    chat_id VARCHAR(50) PRIMARY KEY,
    message_id VARCHAR(50) NOT NULL,
    origem VARCHAR(20) NOT NULL,
    pausado_em DATETIME DEFAULT CURRENT_TIMESTAMP
)
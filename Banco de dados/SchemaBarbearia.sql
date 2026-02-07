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
    horario_funcionamento_inicio TIME NOT NULL,
    horario_funcionamento_fim TIME NOT NULL,
    localizacao VARCHAR(150),
    dia_inicio INT NOT NULL DEFAULT 2,
    dia_fim INT NOT NULL DEFAULT 6,
    id_instance VARCHAR(100) NOT NULL UNIQUE,
    token_evolution VARCHAR(50) NOT NULL UNIQUE,
    timezone VARCHAR(50) DEFAULT 'America/Sao_Paulo',
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
    almoco_inicio TIME DEFAULT NULL,
	almoco_fim TIME DEFAULT NULL,

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
    lembrete_enviado BOOLEAN DEFAULT FALSE,
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

    -- MUDANÇA AQUI: Trocamos email por usuario
    usuario VARCHAR(50) NOT NULL UNIQUE, 

    -- A senha será criptografada (hash), então 255 caracteres é um tamanho seguro
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
    pausado_em DATETIME,
    remoteJid VARCHAR(50) NOT NULL,
    ultima_interacao DATETIME DEFAULT CURRENT_TIMESTAMP,

	FOREIGN KEY (remoteJid) REFERENCES clientes(remoteJid) ON DELETE CASCADE,
    FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente) ON DELETE CASCADE,
    FOREIGN KEY (id_barbearia) REFERENCES barbearias(id_barbearia) ON DELETE CASCADE,

    -- Garante que o cliente só tenha 1 sessão ativa POR barbearia
    UNIQUE (id_cliente, id_barbearia)
);

CREATE INDEX idx_sessoes_etapa ON sessoes_bot(etapa);

-- ==============================
-- 11. CONTROLE DO BOT
-- ==============================
CREATE TABLE controle_bot (
id_controle INT PRIMARY KEY AUTO_INCREMENT,
id_cliente INT,
id_barbearia INT,
processando BOOLEAN,

FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente) ON DELETE CASCADE,
FOREIGN KEY (id_barbearia) REFERENCES barbearias(id_barbearia) ON DELETE CASCADE
);

-- ==============================
-- 11. DUVIDAS FREQUENTES
-- ==============================
CREATE TABLE duvidas_frequentes (
    id_duvida INT AUTO_INCREMENT PRIMARY KEY,
    id_barbearia INT,
    duvida_titulo VARCHAR(150),
    duvida_resposta VARCHAR(500),
    
    FOREIGN KEY (id_barbearia) REFERENCES barbearias(id_barbearia) ON DELETE CASCADE
)
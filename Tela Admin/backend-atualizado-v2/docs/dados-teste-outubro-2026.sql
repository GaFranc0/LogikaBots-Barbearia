-- Execute no banco da aplicação pelo phpMyAdmin.
-- Dados fictícios; não altera os cadastros existentes.
-- Execute uma única vez. O usuário único impede repetir o mesmo conjunto.
-- Login: teste.comissoes.outubro2026
-- Senha: TesteOutubro2026!Comissoes
-- Se qualquer comando falhar: execute ROLLBACK e não execute COMMIT.
-- Outubro/2026: 12 concluídos, 2 agendados, 2 cancelados.
-- Faturamento esperado: R$ 500,00. Comissão esperada: R$ 154,13.
-- Percentual 0.50 significa 0,5%, não 50%.

SET NAMES utf8mb4;
SET time_zone = '-03:00';
START TRANSACTION;

-- Nome de usuário único: a primeira inserção já bloqueia uma reexecução.
-- Use a mesma conexão durante todo o script (variáveis @...).
INSERT INTO barbearias
    (nome, telefone_whatsapp, horario_funcionamento_inicio,
     horario_funcionamento_fim, localizacao, dia_inicio, dia_fim,
     id_instance, token_evolution, timezone, data_cadastro)
VALUES
    ('TESTE - Comissões Outubro 2026', 'TESTE-SEM-WHATSAPP', '09:00:00',
     '18:00:00', 'Ambiente de teste - dados fictícios', 2, 7,
     'teste-comissoes-outubro-2026', 'TESTE-SEM-INTEGRACAO-OUT2026',
     'America/Sao_Paulo', '2026-10-01 09:00:00');
SET @barbearia = LAST_INSERT_ID();

INSERT INTO usuarios_admin
    (id_barbearia, nome, usuario, senha_hash, nivel, ativo, data_criacao)
VALUES
    (@barbearia, 'Administrador Teste Outubro', 'teste.comissoes.outubro2026',
     '$2b$10$yL2rlw/tG0mbQZYdgQYNT.SEFdyKtxfcPherxfs8NURVTbjiQTC/6',
     'admin', 1, '2026-10-01 09:00:00');

INSERT INTO barbeiros (id_barbearia, nome, situacao, comissao_percentual)
VALUES (@barbearia, 'João', 'ativo', 40.00);
SET @joao = LAST_INSERT_ID();
INSERT INTO barbeiros (id_barbearia, nome, situacao, comissao_percentual)
VALUES (@barbearia, 'Marcos', 'ativo', 30.00);
SET @marcos = LAST_INSERT_ID();
INSERT INTO barbeiros (id_barbearia, nome, situacao, comissao_percentual)
VALUES (@barbearia, 'Ana', 'ativo', 50.00);
SET @ana = LAST_INSERT_ID();
INSERT INTO barbeiros (id_barbearia, nome, situacao, comissao_percentual)
VALUES (@barbearia, 'Pedro Zero', 'ativo', 0.00);
SET @pedro = LAST_INSERT_ID();
INSERT INTO barbeiros (id_barbearia, nome, situacao, comissao_percentual)
VALUES (@barbearia, 'Carlos Inativo', 'inativo', 25.00);
SET @carlos = LAST_INSERT_ID();
INSERT INTO barbeiros (id_barbearia, nome, situacao, comissao_percentual)
VALUES (@barbearia, 'Ciro Decimal', 'ativo', 0.50);
SET @ciro = LAST_INSERT_ID();
INSERT INTO barbeiros (id_barbearia, nome, situacao, comissao_percentual)
VALUES (@barbearia, 'Rafael Sem Atendimentos', 'ativo', 35.00);
SET @rafael = LAST_INSERT_ID();

INSERT INTO servicos (id_barbearia, nome_servico, preco, tempo, ativo)
VALUES (@barbearia, 'Corte', 40.00, '00:30:00', 1);
SET @corte = LAST_INSERT_ID();
INSERT INTO servicos (id_barbearia, nome_servico, preco, tempo, ativo)
VALUES (@barbearia, 'Barba', 25.00, '00:30:00', 1);
SET @barba = LAST_INSERT_ID();
INSERT INTO servicos (id_barbearia, nome_servico, preco, tempo, ativo)
VALUES (@barbearia, 'Combo', 60.00, '01:00:00', 1);
SET @combo = LAST_INSERT_ID();

-- Identificadores fictícios sem endereço WhatsApp válido.
INSERT INTO clientes (id_barbearia, nome, telefone, remoteJid, data_cadastro)
VALUES (@barbearia, 'Cliente Teste Alice', NULL,
        CONCAT('teste-out2026-', @barbearia, '-alice'), '2026-10-01 09:00:00');
SET @alice = LAST_INSERT_ID();
INSERT INTO clientes (id_barbearia, nome, telefone, remoteJid, data_cadastro)
VALUES (@barbearia, 'Cliente Teste Bruno', NULL,
        CONCAT('teste-out2026-', @barbearia, '-bruno'), '2026-10-02 09:00:00');
SET @bruno = LAST_INSERT_ID();
INSERT INTO clientes (id_barbearia, nome, telefone, remoteJid, data_cadastro)
VALUES (@barbearia, 'Cliente Teste Clara', NULL,
        CONCAT('teste-out2026-', @barbearia, '-clara'), '2026-10-03 09:00:00');
SET @clara = LAST_INSERT_ID();
INSERT INTO clientes (id_barbearia, nome, telefone, remoteJid, data_cadastro)
VALUES (@barbearia, 'Cliente Teste Daniel', NULL,
        CONCAT('teste-out2026-', @barbearia, '-daniel'), '2026-10-02 08:00:00');
SET @daniel = LAST_INSERT_ID();

INSERT INTO disponibilidade_barbeiro
    (id_barbearia, id_barbeiro, dia_semana, hora_inicio, hora_fim)
SELECT @barbearia, b.id_barbeiro, d.dia, '09:00:00', '18:00:00'
FROM barbeiros b
CROSS JOIN (
    SELECT 'seg' AS dia UNION ALL SELECT 'ter' UNION ALL SELECT 'qua'
    UNION ALL SELECT 'qui' UNION ALL SELECT 'sex' UNION ALL SELECT 'sab'
) d
WHERE b.id_barbearia = @barbearia;

INSERT INTO horarios_atendimento (id_barbearia, horario)
VALUES (@barbearia, '09:00:00'), (@barbearia, '09:30:00'),
       (@barbearia, '10:00:00'), (@barbearia, '10:30:00'),
       (@barbearia, '11:00:00'), (@barbearia, '11:30:00'),
       (@barbearia, '12:00:00'), (@barbearia, '12:30:00'),
       (@barbearia, '13:00:00'), (@barbearia, '13:30:00'),
       (@barbearia, '14:00:00'), (@barbearia, '14:30:00'),
       (@barbearia, '15:00:00'), (@barbearia, '15:30:00'),
       (@barbearia, '16:00:00'), (@barbearia, '16:30:00'),
       (@barbearia, '17:00:00'), (@barbearia, '17:30:00');

-- Concluídos até 07/10; horários sem sobreposição por profissional.
-- lembrete_enviado = 1 evita lembretes nos registros fictícios.
INSERT INTO agendamentos
    (id_barbearia, id_cliente, id_barbeiro, id_servico, data_agendamento,
     horario_inicio, horario_fim, lembrete_enviado, status_agendamento, data_criacao)
VALUES
    (@barbearia, @alice, @joao, @corte, '2026-10-01', '09:00', '09:30', 1, 'concluido', '2026-10-01 08:00:00'),
    (@barbearia, @bruno, @joao, @combo, '2026-10-02', '10:00', '11:00', 1, 'concluido', '2026-10-01 08:00:00'),
    (@barbearia, @clara, @joao, @barba, '2026-10-05', '09:00', '09:30', 1, 'concluido', '2026-10-01 08:00:00'),
    (@barbearia, @daniel, @joao, @combo, '2026-10-07', '14:00', '15:00', 1, 'concluido', '2026-10-01 08:00:00'),
    (@barbearia, @bruno, @marcos, @combo, '2026-10-01', '11:00', '12:00', 1, 'concluido', '2026-10-01 08:00:00'),
    (@barbearia, @alice, @marcos, @corte, '2026-10-03', '09:00', '09:30', 1, 'concluido', '2026-10-01 08:00:00'),
    (@barbearia, @clara, @marcos, @barba, '2026-10-06', '10:00', '10:30', 1, 'concluido', '2026-10-01 08:00:00'),
    (@barbearia, @daniel, @ana, @corte, '2026-10-02', '09:00', '09:30', 1, 'concluido', '2026-10-01 08:00:00'),
    (@barbearia, @alice, @ana, @barba, '2026-10-05', '10:00', '10:30', 1, 'concluido', '2026-10-01 08:00:00'),
    (@barbearia, @bruno, @pedro, @combo, '2026-10-06', '11:00', '12:00', 1, 'concluido', '2026-10-01 08:00:00'),
    (@barbearia, @clara, @carlos, @corte, '2026-10-01', '14:00', '14:30', 1, 'concluido', '2026-10-01 08:00:00'),
    (@barbearia, @daniel, @ciro, @barba, '2026-10-07', '09:00', '09:30', 1, 'concluido', '2026-10-01 08:00:00'),
    (@barbearia, @alice, @joao, @combo, '2026-10-15', '09:00', '10:00', 1, 'agendado', '2026-10-07 08:00:00'),
    (@barbearia, @bruno, @marcos, @corte, '2026-10-22', '10:00', '10:30', 1, 'agendado', '2026-10-07 08:00:00'),
    (@barbearia, @clara, @joao, @combo, '2026-10-02', '15:00', '16:00', 1, 'cancelado', '2026-10-01 08:00:00'),
    (@barbearia, @daniel, @marcos, @combo, '2026-10-07', '15:00', '16:00', 1, 'cancelado', '2026-10-01 08:00:00');

-- Preço registrado igual ao preço do serviço para este conjunto de teste.
-- O código atual de relatórios usa servicos.preco, não esta tabela.
INSERT INTO agendamentos_valores
    (id_agendamento, id_barbearia, id_servico, valor_cobrado, data_registro)
SELECT a.id_agendamento, a.id_barbearia, a.id_servico, s.preco, a.data_criacao
FROM agendamentos a
JOIN servicos s ON s.id_servico = a.id_servico AND s.id_barbearia = a.id_barbearia
WHERE a.id_barbearia = @barbearia AND a.status_agendamento = 'concluido';

COMMIT;

SELECT @barbearia AS id_barbearia_criada,
       'teste.comissoes.outubro2026' AS usuario,
       'Outubro de 2026' AS periodo;

-- Verificação independente, incluindo ativo sem atendimentos e inativo com atendimentos.
SELECT b.nome, b.situacao, b.comissao_percentual,
       COALESCE(t.atendimentos, 0) AS atendimentos,
       COALESCE(t.faturamento, 0) AS faturamento,
       ROUND(COALESCE(t.faturamento, 0) * b.comissao_percentual / 100, 2) AS comissao
FROM barbeiros b
LEFT JOIN (
    SELECT a.id_barbeiro, COUNT(*) AS atendimentos, SUM(s.preco) AS faturamento
    FROM agendamentos a
    JOIN servicos s ON s.id_servico = a.id_servico AND s.id_barbearia = a.id_barbearia
    WHERE a.id_barbearia = @barbearia AND a.status_agendamento = 'concluido'
      AND a.data_agendamento >= '2026-10-01' AND a.data_agendamento < '2026-11-01'
    GROUP BY a.id_barbeiro
) t ON t.id_barbeiro = b.id_barbeiro
WHERE b.id_barbearia = @barbearia
ORDER BY comissao DESC, b.nome;

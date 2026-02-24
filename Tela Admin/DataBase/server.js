const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const moment = require('moment');
const bcrypt = require('bcrypt');

const app = express();
app.use(cors());
app.use(express.json());

// ⚡ Pool MySQL OTIMIZADO
const pool = mysql.createPool({
    host: '46.224.192.131',
    user: 'root',
    password: 'd%?>Pfr![:gI+Kl@+',
    database: 'schema_barbearia_testes',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: '-03:00',
    // ⚡ CONFIGURAÇÕES ANTI-TIMEOUT
    connectTimeout: 10000, // 10 segundos
    acquireTimeout: 10000, // 10 segundos para adquirir conexão
    timeout: 60000 // 60 segundos para queries
});

(async () => {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Conectado ao MySQL com sucesso!');
        connection.release();
    } catch (err) {
        console.error('❌ Erro crítico ao conectar no MySQL:', err);
    }
})();

function minutesToMysqlTime(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
}

// ⚡ LIMPEZA AUTOMÁTICA - SEM TRANSAÇÃO LONGA
async function limparEAutoConcluir(idBarbearia) {
    let connection;
    
    try {
        connection = await pool.getConnection();
        
        const hoje = moment().format('YYYY-MM-DD');
        const duasHorasAtras = moment().subtract(2, 'hours').format('YYYY-MM-DD HH:mm:ss');
        
        // ⚡ Auto-concluir SEM transação (operação atômica)
        const [updateResult] = await connection.query(
            `UPDATE agendamentos 
             SET status_agendamento = 'concluido' 
             WHERE id_barbearia = ? 
             AND status_agendamento = 'agendado' 
             AND CONCAT(data_agendamento, ' ', horario_inicio) < ?`,
            [idBarbearia, duasHorasAtras]
        );
        
        // ⚡ Limpar SEM transação (operação atômica)
        const [deleteResult] = await connection.query(
            `DELETE FROM agendamentos 
             WHERE id_barbearia = ? 
             AND status_agendamento IN ('cancelado', 'concluido') 
             AND data_agendamento < ?`,
            [idBarbearia, hoje]
        );
        
        console.log(`🧹 Limpeza: ${updateResult.affectedRows} auto-concluídos, ${deleteResult.affectedRows} removidos`);
        
    } catch (err) {
        console.error('⚠️ Erro na limpeza automática:', err);
    } finally {
        if (connection) connection.release();
    }
}

// ============================
// Perfil Cliente
// ============================
app.post('/usuarios/update', async (req, res) => {
    // ACEITA email (antigo) OU usuario (novo) para retrocompatibilidade
    const { id_usuario, nome, email, usuario, senha_hash } = req.body;
    let connection;

    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        let query;
        let params;

        // Prioriza 'usuario' mas aceita 'email' (retrocompatibilidade)
        const loginField = usuario || email;

        if (senha_hash && senha_hash.trim() !== "") {
            // Se enviou senha, criptografa com bcrypt
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(senha_hash, saltRounds);
            
            query = "UPDATE usuarios_admin SET nome = ?, usuario = ?, senha_hash = ? WHERE id_usuario = ?";
            params = [nome, loginField, hashedPassword, id_usuario];
        } else {
            // Se não enviou senha, atualiza apenas nome e usuario
            query = "UPDATE usuarios_admin SET nome = ?, usuario = ? WHERE id_usuario = ?";
            params = [nome, loginField, id_usuario];
        }

        const [result] = await connection.query(query, params);

        if (result.affectedRows === 0) {
            throw new Error("Usuário não encontrado ou nenhum dado alterado.");
        }

        await connection.commit();
        res.json({ message: "Perfil atualizado com sucesso!" });

    } catch (err) {
        if (connection) await connection.rollback();
        console.error("Erro ao atualizar usuário:", err);
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) connection.release();
    }
});

// Serviços
app.get('/servicos/:id_barbearia', async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM servicos WHERE id_barbearia = ?", [req.params.id_barbearia]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/servicos', async (req, res) => {
    const { id_barbearia, servicos, deleted_ids } = req.body;
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        if (deleted_ids && deleted_ids.length > 0) {
            await connection.query("DELETE FROM servicos WHERE id_servico IN (?) AND id_barbearia = ?", [deleted_ids, id_barbearia]);
        }

        for (const servico of servicos) {
            const tempoFormatado = minutesToMysqlTime(servico.duracao);
            if (servico.id_servico) {
                await connection.query(
                    "UPDATE servicos SET nome_servico = ?, preco = ?, tempo = ? WHERE id_servico = ? AND id_barbearia = ?",
                    [servico.nome, servico.preco, tempoFormatado, servico.id_servico, id_barbearia]
                );
            } else {
                await connection.query(
                    "INSERT INTO servicos (id_barbearia, nome_servico, preco, tempo) VALUES (?, ?, ?, ?)",
                    [id_barbearia, servico.nome, servico.preco, tempoFormatado]
                );
            }
        }

        await connection.commit();
        res.json({ message: "Serviços salvos!" });
    } catch (err) {
        if (connection) await connection.rollback();
        console.error(err);
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) connection.release();
    }
});

// Barbeiros
app.get('/barbeiros/:id_barbearia', async (req, res) => {
    try {
        const [barbeiros] = await pool.query(
            "SELECT * FROM barbeiros WHERE id_barbearia = ? AND situacao = 'ativo'", 
            [req.params.id_barbearia]
        );
        
        for (let barb of barbeiros) {
            const [periodos] = await pool.query(
                "SELECT dia_semana, hora_inicio, hora_fim FROM disponibilidade_barbeiro WHERE id_barbeiro = ? ORDER BY dia_semana, hora_inicio",
                [barb.id_barbeiro]
            );
            
            // 🔄 RECONSTRUIR: Agrupar períodos do mesmo dia
            const agendaMap = new Map();
            
            for (const periodo of periodos) {
                const dia = periodo.dia_semana;
                
                if (!agendaMap.has(dia)) {
                    // Primeiro período do dia
                    agendaMap.set(dia, {
                        dia_semana: dia,
                        hora_inicio: periodo.hora_inicio,
                        hora_fim: periodo.hora_fim
                    });
                } else {
                    // Segundo período (após almoço) - estende o hora_fim
                    const diaData = agendaMap.get(dia);
                    diaData.hora_fim = periodo.hora_fim;
                }
            }
            
            barb.agenda = Array.from(agendaMap.values());
        }
        
        res.json(barbeiros);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/barbeiros', async (req, res) => {
    const { id_barbearia, barbeiros_data, deleted_ids } = req.body;
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // 🗑️ Deletar barbeiros inativos
        if (deleted_ids && deleted_ids.length > 0) {
            await connection.query(
                "UPDATE barbeiros SET situacao = 'inativo' WHERE id_barbeiro IN (?) AND id_barbearia = ?",
                [deleted_ids, id_barbearia]
            );
            await connection.query("DELETE FROM disponibilidade_barbeiro WHERE id_barbeiro IN (?)", [deleted_ids]);
            await connection.query("DELETE FROM bloqueios_agenda WHERE id_barbeiro IN (?)", [deleted_ids]);
        }

        // 💾 Salvar ou atualizar barbeiros
        for (const bData of barbeiros_data) {
            let idBarbeiro = bData.id_barbeiro;

            // Atualizar ou inserir barbeiro
            if (idBarbeiro) {
                await connection.query(
                    "UPDATE barbeiros SET nome = ?, almoco_inicio = ?, almoco_fim = ? WHERE id_barbeiro = ?", 
                    [bData.nome, bData.almoco_inicio || null, bData.almoco_fim || null, idBarbeiro]
                );
            } else {
                const [result] = await connection.query(
                    "INSERT INTO barbeiros (id_barbearia, nome, almoco_inicio, almoco_fim) VALUES (?, ?, ?, ?)", 
                    [id_barbearia, bData.nome, bData.almoco_inicio || null, bData.almoco_fim || null]
                );
                idBarbeiro = result.insertId;
            }

            // 🕐 Processar disponibilidade com divisão de turnos
            await connection.query("DELETE FROM disponibilidade_barbeiro WHERE id_barbeiro = ?", [idBarbeiro]);

            if (bData.agenda && bData.agenda.length > 0) {
                const values = [];
                const almocoIni = bData.almoco_inicio;
                const almocoFim = bData.almoco_fim;
                
                for (const dia of bData.agenda) {
                    const { dia_semana, inicio, fim } = dia;
                    
                    // Verificar se há horário de almoço válido E se ele está dentro do expediente
                    const temAlmoco = almocoIni && almocoFim;
                    const almocoNoPeriodo = temAlmoco && inicio < almocoIni && almocoFim < fim;
                    
                    if (almocoNoPeriodo) {
                        console.log(`📌 ${bData.nome} - ${dia_semana}: Dividindo turno (${inicio}-${almocoIni} | ${almocoFim}-${fim})`);
                        
                        // Período 1: Início até o almoço
                        values.push([id_barbearia, idBarbeiro, dia_semana, inicio, almocoIni]);
                        
                        // Período 2: Fim do almoço até o fim
                        values.push([id_barbearia, idBarbeiro, dia_semana, almocoFim, fim]);
                    } else {
                        console.log(`📌 ${bData.nome} - ${dia_semana}: Turno único (${inicio}-${fim})`);
                        
                        // Sem divisão: salva período completo
                        values.push([id_barbearia, idBarbeiro, dia_semana, inicio, fim]);
                    }
                }
                
                if (values.length > 0) {
                    await connection.query(
                        "INSERT INTO disponibilidade_barbeiro (id_barbearia, id_barbeiro, dia_semana, hora_inicio, hora_fim) VALUES ?", 
                        [values]
                    );
                    console.log(`✅ Salvos ${values.length} período(s) para ${bData.nome}`);
                }
            }
        }

        await connection.commit();
        res.json({ message: "Barbeiros salvos com sucesso!" });
        
    } catch (err) {
        if (connection) await connection.rollback();
        console.error("❌ Erro ao salvar barbeiros:", err);
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) connection.release();
    }
});

// ⭐ Bloqueios - CORRIGIDO TIMEZONE
app.get('/bloqueios/:id_barbearia', async (req, res) => {
    try {
        // ⭐ CORREÇÃO: Usar DATE_FORMAT para retornar STRING ao invés de Date
        const query = `
            SELECT 
                b.id_bloqueio,
                b.id_barbearia,
                b.id_barbeiro,
                DATE_FORMAT(b.data_inicio, '%Y-%m-%d %H:%i:%s') as data_inicio,
                DATE_FORMAT(b.data_fim, '%Y-%m-%d %H:%i:%s') as data_fim,
                b.motivo,
                u.nome as nome_barbeiro 
            FROM bloqueios_agenda b 
            LEFT JOIN barbeiros u ON b.id_barbeiro = u.id_barbeiro 
            WHERE b.id_barbearia = ? AND b.motivo != 'Horário de Almoço'
        `;
        const [rows] = await pool.query(query, [req.params.id_barbearia]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/bloqueios', async (req, res) => {
    const { id_barbearia, bloqueios, deleted_ids } = req.body;
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        if (deleted_ids && deleted_ids.length > 0) {
            await connection.query("DELETE FROM bloqueios_agenda WHERE id_bloqueio IN (?) AND id_barbearia = ?", [deleted_ids, id_barbearia]);
        }

        for (const blq of bloqueios) {
            let idsParaBloquear = [];
            if (blq.id_barbeiro === 'todos') {
                const [allBarbers] = await connection.query("SELECT id_barbeiro FROM barbeiros WHERE id_barbearia = ? AND situacao='ativo'", [id_barbearia]);
                idsParaBloquear = allBarbers.map(b => b.id_barbeiro);
            } else {
                idsParaBloquear = [blq.id_barbeiro];
            }

            if (!blq.id_bloqueio) {
                for (const idB of idsParaBloquear) {
                    await connection.query(
                        "INSERT INTO bloqueios_agenda (id_barbearia, id_barbeiro, data_inicio, data_fim, motivo) VALUES (?, ?, ?, ?, ?)",
                        [id_barbearia, idB, `${blq.data_inicio} ${blq.hora_inicio}:00`, `${blq.data_fim} ${blq.hora_fim}:00`, blq.motivo]
                    );
                }
            }
        }

        await connection.commit();
        res.json({ message: "Bloqueios salvos!" });
    } catch (err) {
        if (connection) await connection.rollback();
        console.error(err);
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) connection.release();
    }
});

// ============================
// DÚVIDAS FREQUENTES
// ============================

// Buscar dúvidas frequentes
app.get('/duvidas/:id_barbearia', async (req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT * FROM duvidas_frequentes WHERE id_barbearia = ? ORDER BY id_duvida ASC",
            [req.params.id_barbearia]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Salvar dúvidas frequentes
app.post('/duvidas', async (req, res) => {
    const { id_barbearia, duvidas, deleted_ids } = req.body;
    let connection;
    
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // Deletar dúvidas removidas
        if (deleted_ids && deleted_ids.length > 0) {
            await connection.query(
                "DELETE FROM duvidas_frequentes WHERE id_duvida IN (?) AND id_barbearia = ?",
                [deleted_ids, id_barbearia]
            );
        }

        // Inserir ou atualizar dúvidas
        for (const duvida of duvidas) {
            if (duvida.id_duvida) {
                // Atualizar dúvida existente
                await connection.query(
                    "UPDATE duvidas_frequentes SET duvida_titulo = ?, duvida_resposta = ? WHERE id_duvida = ? AND id_barbearia = ?",
                    [duvida.titulo, duvida.resposta, duvida.id_duvida, id_barbearia]
                );
            } else {
                // Inserir nova dúvida
                await connection.query(
                    "INSERT INTO duvidas_frequentes (id_barbearia, duvida_titulo, duvida_resposta) VALUES (?, ?, ?)",
                    [id_barbearia, duvida.titulo, duvida.resposta]
                );
            }
        }

        await connection.commit();
        res.json({ message: "Dúvidas frequentes salvas com sucesso!" });
        
    } catch (err) {
        if (connection) await connection.rollback();
        console.error('Erro ao salvar dúvidas:', err);
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) connection.release();
    }
});

// Barbearia (horário e configurações)
app.get('/barbearia/:id_barbearia', async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT 
                horario_funcionamento_inicio, 
                horario_funcionamento_fim,
                dia_inicio,
                dia_fim,
                localizacao
            FROM barbearias 
            WHERE id_barbearia = ?`,
            [req.params.id_barbearia]
        );
        res.json(rows[0] || {});
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/barbearia/config', async (req, res) => {
    const { id_barbearia, inicio, fim, dia_inicio, dia_fim, localizacao } = req.body;
    
    try {
        await pool.query(
            `UPDATE barbearias 
             SET horario_funcionamento_inicio = ?, 
                 horario_funcionamento_fim = ?,
                 dia_inicio = ?,
                 dia_fim = ?,
                 localizacao = ?
             WHERE id_barbearia = ?`,
            [
                inicio ? `${inicio}:00` : null, 
                fim ? `${fim}:00` : null,
                dia_inicio || 2,
                dia_fim || 6,
                localizacao || null,
                id_barbearia
            ]
        );
        res.json({ message: "Configurações salvas com sucesso!" });
    } catch (err) {
        console.error('Erro ao salvar configurações:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================
// CALCULAR HORÁRIOS
// ============================
app.post('/horarios/calcular', async (req, res) => {
    const { id_barbearia, intervalo_min, abertura, fechamento } = req.body;
    let connection;
    
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        console.log(`🔄 Recalculando horários para barbearia ${id_barbearia}`);

        await connection.query("DELETE FROM horarios_atendimento WHERE id_barbearia = ?", [id_barbearia]);

        if (!abertura || !fechamento) {
            await connection.commit();
            return res.json({ 
                message: "Horários não configurados",
                count: 0 
            });
        }

        let current = moment(abertura, 'HH:mm');
        const end = moment(fechamento, 'HH:mm');
        const horariosGerados = [];

        while (current.isBefore(end)) {
            const timeStr = current.format('HH:mm:ss');
            horariosGerados.push(timeStr);
            current.add(intervalo_min, 'minutes');
        }

        if (horariosGerados.length > 0) {
            const values = horariosGerados.map(h => [id_barbearia, h]);
            await connection.query(
                "INSERT INTO horarios_atendimento (id_barbearia, horario) VALUES ?",
                [values]
            );
        }

        await connection.commit();
        
        res.json({ 
            message: "Horários recalculados com sucesso!",
            count: horariosGerados.length,
            intervalo: intervalo_min
        });
        
    } catch (err) {
        if (connection) await connection.rollback();
        console.error('❌ Erro ao calcular horários:', err);
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) connection.release();
    }
});

// ============================
// BUSCAR HORÁRIOS
// ============================
app.get('/horarios/:id_barbearia', async (req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT horario FROM horarios_atendimento WHERE id_barbearia = ? ORDER BY horario ASC",
            [req.params.id_barbearia]
        );
        res.json(rows);
    } catch (err) {
        console.error('❌ Erro ao buscar horários:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================
// AGENDAMENTOS - SUPER OTIMIZADO ⚡⚡⚡
// ============================

// ⚡ Buscar agendamentos - COM LIMPEZA AUTOMÁTICA EM BACKGROUND
app.get('/agendamentos/:id_barbearia', async (req, res) => {
    try {
        const idBarbearia = req.params.id_barbearia;
        
        // ⚡ Limpeza em BACKGROUND (não trava a resposta)
        limparEAutoConcluir(idBarbearia).catch(err => {
            console.error('❌ Erro na limpeza background:', err);
        });
        
        // ⚡ Busca OTIMIZADA com timeout
        const query = `
            SELECT 
                a.*,
                c.nome as nome_cliente,
                c.telefone as telefone_cliente,
                b.nome as nome_barbeiro,
                s.nome_servico,
                s.preco
            FROM agendamentos a
            LEFT JOIN clientes c ON a.id_cliente = c.id_cliente
            LEFT JOIN barbeiros b ON a.id_barbeiro = b.id_barbeiro
            LEFT JOIN servicos s ON a.id_servico = s.id_servico
            WHERE a.id_barbearia = ?
            ORDER BY a.data_agendamento ASC, a.horario_inicio ASC
        `;
        
        const [rows] = await pool.query(query, [idBarbearia]);
        
        res.json(rows);
    } catch (err) {
        console.error('❌ Erro ao buscar agendamentos:', err);
        res.status(500).json({ error: err.message });
    }
});

// Agendamentos de hoje
app.get('/agendamentos/hoje/:id_barbearia', async (req, res) => {
    try {
        const hoje = moment().format('YYYY-MM-DD');
        const query = `
            SELECT 
                a.*,
                c.nome as nome_cliente,
                c.telefone as telefone_cliente,
                b.nome as nome_barbeiro,
                s.nome_servico,
                s.preco
            FROM agendamentos a
            LEFT JOIN clientes c ON a.id_cliente = c.id_cliente
            LEFT JOIN barbeiros b ON a.id_barbeiro = b.id_barbeiro
            LEFT JOIN servicos s ON a.id_servico = s.id_servico
            WHERE a.id_barbearia = ? 
            AND a.data_agendamento = ?
            AND a.status_agendamento IN ('agendado', 'concluido')
            ORDER BY a.horario_inicio ASC
        `;
        const [rows] = await pool.query(query, [req.params.id_barbearia, hoje]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ⚡ Concluir agendamento - SEM TRANSAÇÃO (operação atômica)
app.post('/agendamentos/concluir', async (req, res) => {
    const { id_agendamento } = req.body;
    
    try {
        // ⚡ UPDATE direto, sem transação
        const [result] = await pool.query(
            "UPDATE agendamentos SET status_agendamento = 'concluido' WHERE id_agendamento = ?",
            [id_agendamento]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'Agendamento não encontrado' 
            });
        }
        
        res.json({ 
            success: true,
            message: 'Agendamento concluído com sucesso!' 
        });
        
    } catch (err) {
        console.error('❌ Erro ao concluir:', err);
        res.status(500).json({ 
            success: false,
            error: err.message 
        });
    }
});

// ⚡ Cancelar agendamento - SEM TRANSAÇÃO (operação atômica)
app.post('/agendamentos/cancelar', async (req, res) => {
    const { id_agendamento } = req.body;
    
    try {
        // ⚡ UPDATE direto, sem transação
        const [result] = await pool.query(
            "UPDATE agendamentos SET status_agendamento = 'cancelado' WHERE id_agendamento = ?",
            [id_agendamento]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'Agendamento não encontrado' 
            });
        }
        
        res.json({ 
            success: true,
            message: 'Agendamento cancelado com sucesso!' 
        });
        
    } catch (err) {
        console.error('❌ Erro ao cancelar:', err);
        res.status(500).json({ 
            success: false,
            error: err.message 
        });
    }
});

// ==========================================
// 🆕 ENDPOINT PARA BLOQUEAR HORÁRIOS
// ==========================================
app.post('/bloqueios', async (req, res) => {
    try {
        const { id_barbearia, id_barbeiro, data_inicio, data_fim, motivo } = req.body;
        
        // Validação básica
        if (!id_barbearia || !id_barbeiro || !data_inicio || !data_fim) {
            return res.status(400).json({ 
                success: false, 
                error: 'Dados obrigatórios faltando' 
            });
        }
        
        const query = `
            INSERT INTO bloqueios_agenda 
            (id_barbearia, id_barbeiro, data_inicio, data_fim, motivo)
            VALUES (?, ?, ?, ?, ?)
        `;
        
        await connection.query(query, [
            id_barbearia, 
            id_barbeiro, 
            data_inicio, 
            data_fim, 
            motivo || 'Horário bloqueado manualmente'
        ]);
        
        console.log('✅ Horário bloqueado:', { id_barbeiro, data_inicio, data_fim });
        
        res.json({ 
            success: true, 
            message: 'Horário bloqueado com sucesso' 
        });
        
    } catch (error) {
        console.error('❌ Erro ao bloquear horário:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ==========================================
// 🆕 ENDPOINT PARA LISTAR BARBEIROS (se ainda não tiver)
// ==========================================
app.get('/barbeiros/:id_barbearia', async (req, res) => {
    try {
        const { id_barbearia } = req.params;
        
        const query = `
            SELECT id_barbeiro, nome, situacao 
            FROM barbeiros 
            WHERE id_barbearia = ?
            ORDER BY nome ASC
        `;
        
        const [rows] = await connection.query(query, [id_barbearia]);
        
        res.json(rows);
        
    } catch (error) {
        console.error('❌ Erro ao buscar barbeiros:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================
// Login - COMPATÍVEL COM SENHAS ANTIGAS E NOVAS
// ============================
app.post('/login', async (req, res) => {
    // ✅ ACEITA tanto 'email' quanto 'usuario' no body
    const { email, usuario, password } = req.body;
    const campoLogin = usuario || email;
    
    try {
        if (!campoLogin) return res.status(400).json({ message: "Usuário ou email não fornecido." });
        
        const [users] = await pool.query("SELECT * FROM usuarios_admin WHERE usuario = ? AND ativo = 1", [campoLogin]);
        
        if (users.length === 0) {
            return res.status(401).json({ message: "Usuário não encontrado." });
        }
        
        const user = users[0];
        
        // ⚡ VERIFICAÇÃO INTELIGENTE DE SENHA
        let passwordMatch = false;
        
        // Verifica se a senha no banco está em formato bcrypt
        if (user.senha_hash && (user.senha_hash.startsWith('$2b$') || user.senha_hash.startsWith('$2a$'))) {
            // Senha criptografada - usa bcrypt para comparar
            passwordMatch = await bcrypt.compare(password, user.senha_hash);
        } else {
            // Senha em texto plano (sistema antigo) - compara diretamente
            passwordMatch = (password === user.senha_hash);
        }
        
        if (!passwordMatch) {
            return res.status(401).json({ message: "Senha incorreta." });
        }
        
        // Login bem-sucedido
        res.json({
            message: "Login realizado!",
            user: {
                id_usuario: user.id_usuario,
                nome: user.nome,
                usuario: user.usuario,
                id_barbearia: user.id_barbearia,
                role: user.role
            }
        });
        
    } catch (err) {
        console.error("Erro no login:", err);
        res.status(500).json({ error: "Erro interno." });
    }
});

// Manipulador de 404
app.use((req, res, next) => {
    console.log('⚠️ Rota não encontrada:', req.method, req.path);
    res.status(404).json({ 
        error: 'Endpoint not found',
        method: req.method,
        path: req.path
    });
});

// Manipulador de erros global
app.use((err, req, res, next) => {
    console.error('❌ Erro não tratado:', err);
    res.status(500).json({ 
        error: 'Internal server error',
        message: err.message 
    });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log('🚀 Servidor SUPER OTIMIZADO rodando na porta 3000');
    console.log('⚡ Melhorias implementadas:');
    console.log('   ✅ Limpeza automática em background');
    console.log('   ✅ Sem transações desnecessárias');
    console.log('   ✅ Timeout de conexão configurado');
    console.log('   ✅ Pool otimizado');
    console.log('   ✅ Dias de funcionamento configuráveis');
    console.log('   ✅ Localização configurável');
    console.log('   ✅ Dúvidas frequentes (tabela dedicada)');
    console.log('   ✅ HORÁRIOS DOS BARBEIROS CORRIGIDOS');
    console.log('   ✅ BCRYPT implementado com retrocompatibilidade TOTAL');
    console.log('📡 Endpoints disponíveis:');
    console.log('   GET  /agendamentos/:id_barbearia (com limpeza background)');
    console.log('   POST /agendamentos/concluir (operação atômica)');
    console.log('   POST /agendamentos/cancelar (operação atômica)');
    console.log('   GET  /horarios/:id_barbearia');
    console.log('   GET  /barbearia/:id_barbearia');
    console.log('   POST /barbearia/config');
    console.log('   GET  /duvidas/:id_barbearia');
    console.log('   POST /duvidas');
    console.log('   POST /login (compatível com senhas antigas E novas)');
    console.log('   POST /usuarios/update (criptografa novas senhas automaticamente)');
    console.log('');
    console.log('🔐 Gerador de hash bcrypt:');
    console.log('   Execute: node -e "const bcrypt = require(\'bcrypt\'); bcrypt.hash(\'suaSenha\', 10).then(h => console.log(h))"');
});
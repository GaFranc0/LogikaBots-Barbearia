const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const moment = require('moment');

const app = express();
app.use(cors());
app.use(express.json());

// Pool MySQL
const pool = mysql.createPool({
    host: 'SEU_HOST',
    user: 'SEU_USUARIO',
    password: 'SUA_SENHA',
    database: 'SEU_SCHEMA',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: '-03:00',
    // CONFIGURAÇÕES ANTI-TIMEOUT
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

// LIMPEZA AUTOMÁTICA
async function limparEAutoConcluir(idBarbearia) {
    let connection;
    
    try {
        connection = await pool.getConnection();
        
        const hoje = moment().format('YYYY-MM-DD');
        const duasHorasAtras = moment().subtract(2, 'hours').format('YYYY-MM-DD HH:mm:ss');
        
        
        const [updateResult] = await connection.query(
            `UPDATE agendamentos 
             SET status_agendamento = 'concluido' 
             WHERE id_barbearia = ? 
             AND status_agendamento = 'agendado' 
             AND CONCAT(data_agendamento, ' ', horario_inicio) < ?`,
            [idBarbearia, duasHorasAtras]
        );
        
       
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
    const { id_usuario, nome, email, senha_hash } = req.body;
    let connection;

    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        let query;
        let params;

        if (senha_hash && senha_hash.trim() !== "") {
            query = "UPDATE usuarios_admin SET nome = ?, email = ?, senha_hash = ? WHERE id_usuario = ?";
            params = [nome, email, senha_hash, id_usuario];
        } else {
            query = "UPDATE usuarios_admin SET nome = ?, email = ? WHERE id_usuario = ?";
            params = [nome, email, id_usuario];
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
            const [agenda] = await pool.query(
                "SELECT dia_semana, hora_inicio, hora_fim FROM disponibilidade_barbeiro WHERE id_barbeiro = ?",
                [barb.id_barbeiro]
            );
            barb.agenda = agenda;
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

        if (deleted_ids && deleted_ids.length > 0) {
            await connection.query(
                "UPDATE barbeiros SET situacao = 'inativo' WHERE id_barbeiro IN (?) AND id_barbearia = ?",
                [deleted_ids, id_barbearia]
            );
            await connection.query("DELETE FROM disponibilidade_barbeiro WHERE id_barbeiro IN (?)", [deleted_ids]);
            await connection.query("DELETE FROM bloqueios_agenda WHERE id_barbeiro IN (?)", [deleted_ids]);
        }

        for (const bData of barbeiros_data) {
            let idBarbeiro = bData.id_barbeiro;

            if (idBarbeiro) {
                await connection.query("UPDATE barbeiros SET nome = ? WHERE id_barbeiro = ?", [bData.nome, idBarbeiro]);
            } else {
                const [result] = await connection.query("INSERT INTO barbeiros (id_barbearia, nome) VALUES (?, ?)", [id_barbearia, bData.nome]);
                idBarbeiro = result.insertId;
            }

            await connection.query("DELETE FROM disponibilidade_barbeiro WHERE id_barbeiro = ?", [idBarbeiro]);

            if (bData.agenda && bData.agenda.length > 0) {
                let values = [];
                for (const dia of bData.agenda) {
                    const { dia_semana, inicio, fim } = dia;
                    const almocoIni = bData.almoco_inicio;
                    const almocoFim = bData.almoco_fim;

                    if (almocoIni && almocoFim && inicio < almocoIni && almocoIni < fim) {
                        values.push([id_barbearia, idBarbeiro, dia_semana, inicio, almocoIni]);
                        if (inicio < almocoFim && almocoFim < fim) {
                            values.push([id_barbearia, idBarbeiro, dia_semana, almocoFim, fim]);
                        }
                    } else {
                        values.push([id_barbearia, idBarbeiro, dia_semana, inicio, fim]);
                    }
                }
                if (values.length > 0) {
                    await connection.query("INSERT INTO disponibilidade_barbeiro (id_barbearia, id_barbeiro, dia_semana, hora_inicio, hora_fim) VALUES ?", [values]);
                }
            }
        }

        await connection.commit();
        res.json({ message: "Barbeiros salvos!" });
    } catch (err) {
        if (connection) await connection.rollback();
        console.error(err);
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) connection.release();
    }
});

// Bloqueios
app.get('/bloqueios/:id_barbearia', async (req, res) => {
    try {
        const query = `
            SELECT b.*, u.nome as nome_barbeiro 
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

// Barbearia (horário)
app.get('/barbearia/:id_barbearia', async (req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT horario_funcionamento_inicio, horario_funcionamento_fim FROM barbearias WHERE id_barbearia = ?",
            [req.params.id_barbearia]
        );
        res.json(rows[0] || {});
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/barbearia/config', async (req, res) => {
    const { id_barbearia, inicio, fim } = req.body;
    try {
        await pool.query(
            "UPDATE barbearias SET horario_funcionamento_inicio = ?, horario_funcionamento_fim = ? WHERE id_barbearia = ?",
            [inicio ? `${inicio}:00` : null, fim ? `${fim}:00` : null, id_barbearia]
        );
        res.json({ message: "Horário salvo!" });
    } catch (err) {
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
// AGENDAMENTOS - SUPER OTIMIZADO
// ============================


app.get('/agendamentos/:id_barbearia', async (req, res) => {
    try {
        const idBarbearia = req.params.id_barbearia;
        
       
        limparEAutoConcluir(idBarbearia).catch(err => {
            console.error('❌ Erro na limpeza background:', err);
        });
        
       
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

// Login
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const [users] = await pool.query("SELECT * FROM usuarios_admin WHERE email = ? AND ativo = 1", [email]);
        if (users.length === 0) return res.status(401).json({ message: "Usuário não encontrado." });
        const user = users[0];
        if (password !== user.senha_hash) return res.status(401).json({ message: "Senha incorreta." });
        
        res.json({
            message: "Login realizado!",
            user: {
                id_usuario: user.id_usuario,
                nome: user.nome,
                email: user.email,
                id_barbearia: user.id_barbearia,
                role: user.role
            }
        });
    } catch (err) {
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
    console.log('   Servidor na porta 3000');
    console.log('   ✅ Limpeza automática em background');
    console.log('   Endpoints disponíveis:');
    console.log('   GET  /agendamentos/:id_barbearia');
    console.log('   POST /agendamentos/concluir');
    console.log('   POST /agendamentos/cancelar');
    console.log('   GET  /horarios/:id_barbearia');
});
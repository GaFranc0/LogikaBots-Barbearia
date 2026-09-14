const express = require('express');
const { pool } = require('../config/database');

const router = express.Router();

router.get('/barbeiros/:id_barbearia', async (req, res) => {
    try {
        const [barbeiros] = await pool.query(
            "SELECT * FROM barbeiros WHERE id_barbearia = ? AND situacao = 'ativo'",
            [req.params.id_barbearia]
        );

        for (let barb of barbeiros) {
            const [periodos] = await pool.query(
                'SELECT dia_semana, hora_inicio, hora_fim FROM disponibilidade_barbeiro WHERE id_barbeiro = ? ORDER BY dia_semana, hora_inicio',
                [barb.id_barbeiro]
            );

            const agendaMap = new Map();

            for (const periodo of periodos) {
                const dia = periodo.dia_semana;

                if (!agendaMap.has(dia)) {
                    agendaMap.set(dia, {
                        dia_semana: dia,
                        hora_inicio: periodo.hora_inicio,
                        hora_fim: periodo.hora_fim
                    });
                } else {
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

router.post('/barbeiros', async (req, res) => {
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
            await connection.query('DELETE FROM disponibilidade_barbeiro WHERE id_barbeiro IN (?)', [deleted_ids]);
            await connection.query('DELETE FROM bloqueios_agenda WHERE id_barbeiro IN (?)', [deleted_ids]);
        }

        for (const bData of barbeiros_data) {
            let idBarbeiro = bData.id_barbeiro;

            if (idBarbeiro) {
                await connection.query(
                    'UPDATE barbeiros SET nome = ?, almoco_inicio = ?, almoco_fim = ? WHERE id_barbeiro = ?',
                    [bData.nome, bData.almoco_inicio || null, bData.almoco_fim || null, idBarbeiro]
                );
            } else {
                const [result] = await connection.query(
                    'INSERT INTO barbeiros (id_barbearia, nome, almoco_inicio, almoco_fim) VALUES (?, ?, ?, ?)',
                    [id_barbearia, bData.nome, bData.almoco_inicio || null, bData.almoco_fim || null]
                );
                idBarbeiro = result.insertId;
            }

            await connection.query('DELETE FROM disponibilidade_barbeiro WHERE id_barbeiro = ?', [idBarbeiro]);

            if (bData.agenda && bData.agenda.length > 0) {
                const values = [];
                const almocoIni = bData.almoco_inicio;
                const almocoFim = bData.almoco_fim;

                for (const dia of bData.agenda) {
                    const { dia_semana, inicio, fim } = dia;

                    const temAlmoco = almocoIni && almocoFim;
                    const almocoNoPeriodo = temAlmoco && inicio < almocoIni && almocoFim < fim;

                    if (almocoNoPeriodo) {
                        console.log(`📌 ${bData.nome} - ${dia_semana}: Dividindo turno (${inicio}-${almocoIni} | ${almocoFim}-${fim})`);

                        values.push([id_barbearia, idBarbeiro, dia_semana, inicio, almocoIni]);
                        values.push([id_barbearia, idBarbeiro, dia_semana, almocoFim, fim]);
                    } else {
                        console.log(`📌 ${bData.nome} - ${dia_semana}: Turno único (${inicio}-${fim})`);
                        values.push([id_barbearia, idBarbeiro, dia_semana, inicio, fim]);
                    }
                }

                if (values.length > 0) {
                    await connection.query(
                        'INSERT INTO disponibilidade_barbeiro (id_barbearia, id_barbeiro, dia_semana, hora_inicio, hora_fim) VALUES ?',
                        [values]
                    );
                    console.log(`✅ Salvos ${values.length} período(s) para ${bData.nome}`);
                }
            }
        }

        await connection.commit();
        res.json({ message: 'Barbeiros salvos com sucesso!' });
    } catch (err) {
        if (connection) await connection.rollback();
        console.error('❌ Erro ao salvar barbeiros:', err);
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) connection.release();
    }
});

module.exports = router;

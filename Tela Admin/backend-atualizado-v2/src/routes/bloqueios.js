const express = require('express');
const { pool } = require('../config/database');

const router = express.Router();

router.get('/bloqueios/:id_barbearia', async (req, res) => {
    try {
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

router.post('/bloqueios', async (req, res) => {
    const { id_barbearia, bloqueios, deleted_ids } = req.body;
    let connection;

    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        if (deleted_ids && deleted_ids.length > 0) {
            await connection.query('DELETE FROM bloqueios_agenda WHERE id_bloqueio IN (?) AND id_barbearia = ?', [deleted_ids, id_barbearia]);
        }

        for (const blq of bloqueios) {
            let idsParaBloquear = [];

            if (blq.id_barbeiro === 'todos') {
                const [allBarbers] = await connection.query(
                    "SELECT id_barbeiro FROM barbeiros WHERE id_barbearia = ? AND situacao='ativo'",
                    [id_barbearia]
                );
                idsParaBloquear = allBarbers.map(b => b.id_barbeiro);
            } else {
                idsParaBloquear = [blq.id_barbeiro];
            }

            if (!blq.id_bloqueio) {
                for (const idB of idsParaBloquear) {
                    await connection.query(
                        'INSERT INTO bloqueios_agenda (id_barbearia, id_barbeiro, data_inicio, data_fim, motivo) VALUES (?, ?, ?, ?, ?)',
                        [id_barbearia, idB, `${blq.data_inicio} ${blq.hora_inicio}:00`, `${blq.data_fim} ${blq.hora_fim}:00`, blq.motivo]
                    );
                }
            }
        }

        await connection.commit();
        res.json({ message: 'Bloqueios salvos!' });
    } catch (err) {
        if (connection) await connection.rollback();
        console.error(err);
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) connection.release();
    }
});

module.exports = router;

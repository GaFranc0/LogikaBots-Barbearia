const express = require('express');
const moment = require('moment');
const { pool } = require('../config/database');

const router = express.Router();

router.post('/horarios/calcular', async (req, res) => {
    const { id_barbearia, intervalo_min, abertura, fechamento } = req.body;
    let connection;

    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        console.log(`🔄 Recalculando horários para barbearia ${id_barbearia}`);

        await connection.query('DELETE FROM horarios_atendimento WHERE id_barbearia = ?', [id_barbearia]);

        if (!abertura || !fechamento) {
            await connection.commit();
            return res.json({
                message: 'Horários não configurados',
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
                'INSERT INTO horarios_atendimento (id_barbearia, horario) VALUES ?',
                [values]
            );
        }

        await connection.commit();

        res.json({
            message: 'Horários recalculados com sucesso!',
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

router.get('/horarios/:id_barbearia', async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT horario FROM horarios_atendimento WHERE id_barbearia = ? ORDER BY horario ASC',
            [req.params.id_barbearia]
        );
        res.json(rows);
    } catch (err) {
        console.error('❌ Erro ao buscar horários:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

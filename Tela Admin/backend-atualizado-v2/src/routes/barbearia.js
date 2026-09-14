const express = require('express');
const { pool } = require('../config/database');

const router = express.Router();

router.get('/barbearia/:id_barbearia', async (req, res) => {
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

router.post('/barbearia/config', async (req, res) => {
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
        res.json({ message: 'Configurações salvas com sucesso!' });
    } catch (err) {
        console.error('Erro ao salvar configurações:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

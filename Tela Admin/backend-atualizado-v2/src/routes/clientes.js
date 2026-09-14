const express = require('express');
const { pool } = require('../config/database');

const router = express.Router();

router.get('/clientes/:id_barbearia', async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT id_cliente, id_barbearia, nome, telefone, remoteJid, data_cadastro
             FROM clientes
             WHERE id_barbearia = ?
             ORDER BY nome ASC`,
            [req.params.id_barbearia]
        );
        res.json(rows);
    } catch (err) {
        console.error('❌ Erro ao buscar clientes:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

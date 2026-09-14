const express = require('express');
const { pool } = require('../config/database');

const router = express.Router();

router.get('/duvidas/:id_barbearia', async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM duvidas_frequentes WHERE id_barbearia = ? ORDER BY id_duvida ASC',
            [req.params.id_barbearia]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/duvidas', async (req, res) => {
    const { id_barbearia, duvidas, deleted_ids } = req.body;
    let connection;

    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        if (deleted_ids && deleted_ids.length > 0) {
            await connection.query(
                'DELETE FROM duvidas_frequentes WHERE id_duvida IN (?) AND id_barbearia = ?',
                [deleted_ids, id_barbearia]
            );
        }

        for (const duvida of duvidas) {
            if (duvida.id_duvida) {
                await connection.query(
                    'UPDATE duvidas_frequentes SET duvida_titulo = ?, duvida_resposta = ? WHERE id_duvida = ? AND id_barbearia = ?',
                    [duvida.titulo, duvida.resposta, duvida.id_duvida, id_barbearia]
                );
            } else {
                await connection.query(
                    'INSERT INTO duvidas_frequentes (id_barbearia, duvida_titulo, duvida_resposta) VALUES (?, ?, ?)',
                    [id_barbearia, duvida.titulo, duvida.resposta]
                );
            }
        }

        await connection.commit();
        res.json({ message: 'Dúvidas frequentes salvas com sucesso!' });
    } catch (err) {
        if (connection) await connection.rollback();
        console.error('Erro ao salvar dúvidas:', err);
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) connection.release();
    }
});

module.exports = router;

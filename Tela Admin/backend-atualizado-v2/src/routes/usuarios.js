const express = require('express');
const bcrypt = require('bcrypt');
const { pool } = require('../config/database');

const router = express.Router();

router.post('/usuarios/update', async (req, res) => {
    const { id_usuario, nome, email, usuario, senha_hash } = req.body;
    let connection;

    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const loginField = usuario || email;

        let query;
        let params;

        if (senha_hash && senha_hash.trim() !== '') {
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(senha_hash, saltRounds);

            query = 'UPDATE usuarios_admin SET nome = ?, usuario = ?, senha_hash = ? WHERE id_usuario = ?';
            params = [nome, loginField, hashedPassword, id_usuario];
        } else {
            query = 'UPDATE usuarios_admin SET nome = ?, usuario = ? WHERE id_usuario = ?';
            params = [nome, loginField, id_usuario];
        }

        const [result] = await connection.query(query, params);

        if (result.affectedRows === 0) {
            throw new Error('Usuário não encontrado ou nenhum dado alterado.');
        }

        await connection.commit();
        res.json({ message: 'Perfil atualizado com sucesso!' });
    } catch (err) {
        if (connection) await connection.rollback();
        console.error('Erro ao atualizar usuário:', err);
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) connection.release();
    }
});

module.exports = router;

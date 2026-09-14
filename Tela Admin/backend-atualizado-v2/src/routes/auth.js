const express = require('express');
const bcrypt = require('bcrypt');
const { pool } = require('../config/database');

const router = express.Router();

router.post('/login', async (req, res) => {
    const { email, usuario, password } = req.body;
    const campoLogin = usuario || email;

    try {
        if (!campoLogin) {
            return res.status(400).json({ message: 'Usuário ou email não fornecido.' });
        }

        const [users] = await pool.query('SELECT * FROM usuarios_admin WHERE usuario = ? AND ativo = 1', [campoLogin]);

        if (users.length === 0) {
            return res.status(401).json({ message: 'Usuário não encontrado.' });
        }

        const user = users[0];

        let passwordMatch = false;

        if (user.senha_hash && (user.senha_hash.startsWith('$2b$') || user.senha_hash.startsWith('$2a$'))) {
            passwordMatch = await bcrypt.compare(password, user.senha_hash);
        } else {
            passwordMatch = password === user.senha_hash;
        }

        if (!passwordMatch) {
            return res.status(401).json({ message: 'Senha incorreta.' });
        }

        res.json({
            message: 'Login realizado!',
            user: {
                id_usuario: user.id_usuario,
                nome: user.nome,
                usuario: user.usuario,
                id_barbearia: user.id_barbearia,
                role: user.role
            }
        });
    } catch (err) {
        console.error('Erro no login:', err);
        res.status(500).json({ error: 'Erro interno.' });
    }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { buscarDashboard } = require('../services/relatorios');

router.get('/dashboard', async (req, res) => {
    try {
        const idBarbearia = Number(req.query.id_barbearia);
        const agora = new Date();
        const ano = req.query.ano ? Number(req.query.ano) : agora.getFullYear();
        const mes = req.query.mes ? Number(req.query.mes) : (agora.getMonth() + 1);

        if (!Number.isInteger(idBarbearia) || idBarbearia <= 0) {
            return res.status(400).json({ error: 'id_barbearia inválido ou não informado.' });
        }

        if (!Number.isInteger(ano) || ano < 2000 || ano > 2100) {
            return res.status(400).json({ error: 'Ano inválido.' });
        }

        if (!Number.isInteger(mes) || mes < 1 || mes > 12) {
            return res.status(400).json({ error: 'Mês inválido.' });
        }

        const dados = await buscarDashboard({ idBarbearia, ano, mes });
        return res.json(dados);
    } catch (error) {
        console.error('Erro GET /relatorios/dashboard:', error);
        return res.status(500).json({
            error: 'Erro ao carregar relatórios.',
            detalhe: error.message
        });
    }
});

module.exports = router;

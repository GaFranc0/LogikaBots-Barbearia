const express = require('express');
const moment = require('moment');
const { pool } = require('../config/database');
const { autoConcluirAgendamentos } = require('../services/agenda');

const router = express.Router();

router.get('/agendamentos/:id_barbearia', async (req, res) => {
    try {
        const idBarbearia = req.params.id_barbearia;

       autoConcluirAgendamentos(idBarbearia).catch(err => {
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

router.get('/agendamentos/hoje/:id_barbearia', async (req, res) => {
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

router.post('/agendamentos/concluir', async (req, res) => {

    const {
        id_agendamento,
        id_barbearia
    } = req.body;

    try {

        const [result] = await pool.query(
            `
            UPDATE agendamentos

            SET status_agendamento = 'concluido'

            WHERE id_agendamento = ?
              AND id_barbearia = ?
            `,
            [
                id_agendamento,
                id_barbearia
            ]
        );


        if (result.affectedRows === 0) {

            return res.status(404).json({
                success: false,
                error:
                    'Agendamento não encontrado.'
            });
        }


        return res.json({
            success: true,
            message:
                'Agendamento concluído com sucesso!'
        });


    } catch (err) {

        console.error(
            '❌ Erro ao concluir:',
            err
        );

        return res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

router.post('/agendamentos/cancelar', async (req, res) => {

    const {
        id_agendamento,
        id_barbearia
    } = req.body;

    try {

        const [result] = await pool.query(
            `
            UPDATE agendamentos

            SET status_agendamento = 'cancelado'

            WHERE id_agendamento = ?
              AND id_barbearia = ?
            `,
            [
                id_agendamento,
                id_barbearia
            ]
        );


        if (result.affectedRows === 0) {

            return res.status(404).json({
                success: false,
                error:
                    'Agendamento não encontrado.'
            });
        }


        return res.json({
            success: true,
            message:
                'Agendamento cancelado com sucesso!'
        });


    } catch (err) {

        console.error(
            '❌ Erro ao cancelar:',
            err
        );

        return res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

module.exports = router;

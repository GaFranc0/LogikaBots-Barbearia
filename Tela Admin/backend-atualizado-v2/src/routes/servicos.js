const express = require('express');
const { pool } = require('../config/database');
const { minutesToMysqlTime } = require('../utils/time');

const router = express.Router();


// ============================================================
// LISTAR SERVIÇOS ATIVOS
// ============================================================

router.get('/servicos/:id_barbearia', async (req, res) => {
    try {

        const [rows] = await pool.query(
            `
            SELECT *
            FROM servicos

            WHERE id_barbearia = ?
              AND ativo = 1

            ORDER BY nome_servico
            `,
            [req.params.id_barbearia]
        );

        res.json(rows);

    } catch (err) {

        console.error(
            '❌ Erro ao buscar serviços:',
            err
        );

        res.status(500).json({
            error: err.message
        });
    }
});


// ============================================================
// SALVAR SERVIÇOS
// ============================================================

router.post('/servicos', async (req, res) => {

    const {
        id_barbearia,
        servicos,
        deleted_ids
    } = req.body;

    let connection;

    try {

        connection = await pool.getConnection();

        await connection.beginTransaction();


        // ====================================================
        // "EXCLUIR" = DESATIVAR
        // ====================================================

        if (
            Array.isArray(deleted_ids) &&
            deleted_ids.length > 0
        ) {

            await connection.query(
                `
                UPDATE servicos

                SET ativo = 0

                WHERE id_servico IN (?)
                  AND id_barbearia = ?
                `,
                [
                    deleted_ids,
                    id_barbearia
                ]
            );
        }


        // ====================================================
        // INSERIR / ATUALIZAR
        // ====================================================

        for (const servico of servicos) {

            const tempoFormatado =
                minutesToMysqlTime(
                    servico.duracao
                );


            if (servico.id_servico) {

                await connection.query(
                    `
                    UPDATE servicos

                    SET
                        nome_servico = ?,
                        preco = ?,
                        tempo = ?,
                        ativo = 1

                    WHERE id_servico = ?
                      AND id_barbearia = ?
                    `,
                    [
                        servico.nome,
                        servico.preco,
                        tempoFormatado,
                        servico.id_servico,
                        id_barbearia
                    ]
                );

            } else {

                await connection.query(
                    `
                    INSERT INTO servicos
                    (
                        id_barbearia,
                        nome_servico,
                        preco,
                        tempo,
                        ativo
                    )

                    VALUES (?, ?, ?, ?, 1)
                    `,
                    [
                        id_barbearia,
                        servico.nome,
                        servico.preco,
                        tempoFormatado
                    ]
                );
            }
        }


        await connection.commit();


        res.json({
            message:
                'Serviços salvos com sucesso!'
        });


    } catch (err) {

        if (connection) {
            await connection.rollback();
        }

        console.error(
            '❌ Erro ao salvar serviços:',
            err
        );

        res.status(500).json({
            error: err.message
        });


    } finally {

        if (connection) {
            connection.release();
        }
    }
});


module.exports = router;
const moment = require('moment');
const { pool } = require('../config/database');

async function autoConcluirAgendamentos(idBarbearia) {
    let connection;

    try {
        connection = await pool.getConnection();

        const duasHorasAtras = moment()
            .subtract(2, 'hours')
            .format('YYYY-MM-DD HH:mm:ss');

        const [updateResult] = await connection.query(
            `
            UPDATE agendamentos

            SET status_agendamento = 'concluido'

            WHERE id_barbearia = ?

              AND status_agendamento = 'agendado'

              AND CONCAT(
                    data_agendamento,
                    ' ',
                    horario_inicio
                  ) < ?
            `,
            [
                idBarbearia,
                duasHorasAtras
            ]
        );

        console.log(
            `✅ Auto-conclusão: ${updateResult.affectedRows} agendamento(s) concluído(s)`
        );

    } catch (err) {

        console.error(
            '⚠️ Erro na auto-conclusão:',
            err
        );

    } finally {

        if (connection) {
            connection.release();
        }
    }
}


module.exports = {
    autoConcluirAgendamentos
};
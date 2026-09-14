const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'XXXXXXXXX',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'XXXXXXXXX',
    password: process.env.DB_PASSWORD || 'XXXXXXXXX',
    database: process.env.DB_NAME || 'XXXXXXXXX',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: '-03:00',
    connectTimeout: 10000
});

async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Conectado ao MySQL com sucesso!');
        connection.release();
    } catch (err) {
        console.error('❌ Erro crítico ao conectar no MySQL:', err);
    }
}

module.exports = {
    pool,
    testConnection
};

const mysql = require('mysql2/promise');

const requiredEnv = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
const missingEnv = requiredEnv.filter((name) => !process.env[name]);

if (missingEnv.length > 0) {
    throw new Error(`Variáveis de ambiente ausentes: ${missingEnv.join(', ')}. Configure o .env local ou as variáveis na Vercel.`);
}

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
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

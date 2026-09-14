const mysql = require('mysql2/promise');

const poolIA = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_IA_USER,
    password: process.env.DB_IA_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
    timezone: '-03:00',
    connectTimeout: 10000,
    multipleStatements: false
});

module.exports = poolIA;

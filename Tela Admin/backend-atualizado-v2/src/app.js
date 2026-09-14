const express = require('express');
const cors = require('cors');

const { testConnection } = require('./config/database');
const usuariosRoutes = require('./routes/usuarios');
const servicosRoutes = require('./routes/servicos');
const barbeirosRoutes = require('./routes/barbeiros');
const bloqueiosRoutes = require('./routes/bloqueios');
const duvidasRoutes = require('./routes/duvidas');
const barbeariaRoutes = require('./routes/barbearia');
const horariosRoutes = require('./routes/horarios');
const agendamentosRoutes = require('./routes/agendamentos');
const authRoutes = require('./routes/auth');
const iaRoutes = require('./routes/ia');
const relatoriosRoutes = require('./routes/relatorios');
const clientesRoutes = require('./routes/clientes');

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE']
}));
app.use(express.json());

app.use(authRoutes);
app.use(usuariosRoutes);
app.use(servicosRoutes);
app.use(barbeirosRoutes);
app.use(bloqueiosRoutes);
app.use(duvidasRoutes);
app.use(barbeariaRoutes);
app.use(horariosRoutes);
app.use(agendamentosRoutes);
app.use(clientesRoutes);
app.use('/ia', iaRoutes);
app.use('/relatorios', relatoriosRoutes);

app.use((req, res) => {
    console.log('⚠️ Rota não encontrada:', req.method, req.path);
    res.status(404).json({
        error: 'Endpoint not found',
        method: req.method,
        path: req.path
    });
});

app.use((err, req, res, next) => {
    console.error('❌ Erro não tratado:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: err.message
    });
});

testConnection().catch((err) => {
    console.error('❌ Verificação de conexão falhou:', err);
});

module.exports = app;

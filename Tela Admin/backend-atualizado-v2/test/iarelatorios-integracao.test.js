const { test } = require('node:test');
const assert = require('node:assert/strict');
const { interpretarPergunta } = require('../src/services/iarelatorios-plano');

test('pagamento a barbeiro desconhecido nunca vira total de todos', async () => {
    for (const pergunta of ['Quanto preciso pagar ao Pedro?', 'Quanto preciso repassar para o Pedro?']) {
        const r = await interpretarPergunta({ pergunta, ano: 2026, mes: 9,
            contexto: { servicos: [], barbeiros: [{ id_barbeiro: 6, nome: 'Ronaldo' }] },
            chat: async () => { throw Error('Não deve chamar modelo'); } });
        assert.equal(r.tipo, 'BARBEIRO_NAO_ENCONTRADO');
        assert.equal(r.plano, undefined);
    }
});

test('rota retorna erro de acesso sanitizado sem revelar credenciais', async () => {
    const service = require('../src/services/iarelatorios');
    const original = service.perguntarIA;
    service.perguntarIA = async () => {
        const error = new Error('Access denied: segredo-do-banco');
        error.code = 'ER_ACCESS_DENIED_ERROR';
        throw error;
    };
    const express = require('express');
    const app = express();
    app.use(express.json());
    app.use('/ia', require('../src/routes/ia'));
    const server = app.listen(0, '127.0.0.1');
    try {
        await new Promise(resolve => server.once('listening', resolve));
        const response = await fetch(`http://127.0.0.1:${server.address().port}/ia/perguntar`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pergunta: 'Qual o total de comissões?', id_barbearia: 2, ano: 2026, mes: 9 })
        });
        assert.equal(response.status, 503);
        const data = await response.json();
        assert.equal(data.codigo, 'IA_BANCO_SEM_ACESSO');
        assert.ok(!JSON.stringify(data).includes('segredo-do-banco'));
    } finally {
        service.perguntarIA = original;
        await new Promise(resolve => server.close(resolve));
    }
});

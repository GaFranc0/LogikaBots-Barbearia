const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function carregarRelatorios(rows, consultas) {
    const modulo = { exports: {} };
    vm.runInNewContext(fs.readFileSync(
        path.join(__dirname, '../src/services/relatorios.js'), 'utf8'
    ), {
        module: modulo,
        console,
        require(nome) {
            if (nome === '../config/database') {
                return { pool: { async query(sql, params) {
                    consultas.push({ sql, params });
                    return [sql.includes('AS valor_comissao') ? rows : []];
                } } };
            }
            if (nome === './ollama') {
                return { ollamaChat: async () => {
                    throw new Error('Relatorio vazio nao deve chamar IA');
                } };
            }
            throw new Error(`Dependencia inesperada: ${nome}`);
        }
    });
    return modulo.exports;
}

test('dashboard retorna comissoes numericas, pendencias e soma em centavos', async () => {
    const consultas = [];
    const rows = [
        { id_barbeiro: 1, nome_barbeiro: 'Ana', situacao: 'inativo', atendimentos: '2', faturamento: '100.10', comissao_percentual: '33.33', valor_comissao: '33.36' },
        { id_barbeiro: 2, comissao_percentual: '50', valor_comissao: '0.10' },
        { id_barbeiro: 3, comissao_percentual: null },
        { id_barbeiro: 4, comissao_percentual: '101' },
        { id_barbeiro: 5, comissao_percentual: '0' }
    ];
    const { buscarDashboard } = carregarRelatorios(rows, consultas);
    const resultado = await buscarDashboard({ idBarbearia: 7, ano: 2026, mes: 12 });
    assert.equal(resultado.comissoes.total_comissoes, 33.46);
    assert.equal(resultado.comissoes.total_faturamento, resultado.metricas.faturamento);
    assert.equal(resultado.comissoes.barbeiros_sem_comissao, 2);
    const barbeiros = resultado.comissoes.barbeiros;
    assert.equal(barbeiros[0].faturamento, 100.10);
    assert.equal(barbeiros[0].comissao_percentual, 33.33);
    assert.equal(barbeiros[0].situacao, 'inativo');
    assert.equal(barbeiros[2].comissao_configurada, false);
    assert.equal(barbeiros[3].comissao_percentual, null);
    assert.equal(barbeiros[4].comissao_configurada, true);
    assert.equal(barbeiros[4].valor_comissao, 0);
    const consulta = consultas.find(({ sql }) => sql.includes('AS valor_comissao'));
    assert.deepEqual(Array.from(consulta.params), [7, '2026-12-01', '2027-01-01', 7]);
    assert.match(consulta.sql, /status_agendamento = 'concluido'/);
    assert.match(consulta.sql, /s.id_barbearia = a.id_barbearia/);
    assert.match(consulta.sql, /WHERE b.id_barbearia = \?/);
    assert.match(consulta.sql, /ROUND\(COALESCE\(t.faturamento, 0\) \* b.comissao_percentual \/ 100, 2\)/);
});

test('dashboard sem barbeiros retorna lista vazia e total zero', async () => {
    const { buscarDashboard } = carregarRelatorios([], []);
    const resultado = await buscarDashboard({ idBarbearia: 1, ano: 2026, mes: 10 });
    assert.equal(resultado.comissoes.total_comissoes, 0);
    assert.equal(resultado.comissoes.barbeiros_sem_comissao, 0);
    assert.equal(resultado.comissoes.barbeiros.length, 0);
});

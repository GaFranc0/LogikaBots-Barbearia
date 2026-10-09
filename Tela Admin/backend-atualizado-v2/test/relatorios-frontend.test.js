const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function tela(storage = new Map()) {
    const elementos = new Map();
    const context = vm.createContext({
        window: { API_BASE_URL: 'http://localhost:3000' },
        document: {
            addEventListener() {},
            getElementById(id) {
                if (!elementos.has(id)) elementos.set(id, { textContent: '', innerHTML: '', hidden: false });
                return elementos.get(id);
            }
        }, Intl, URLSearchParams,
        sessionStorage: {
            getItem: key => storage.get(key) ?? null,
            setItem: (key, value) => storage.set(key, value)
        }
    });
    vm.runInContext(fs.readFileSync(path.join(__dirname,
        '../../frontend-atualizado-v2/assets/js/relatorio.js'), 'utf8'), context);
    return { context, elementos };
}

test('tela mostra faturamento total e pagamento individual sem converter pendência em zero', () => {
    const { context, elementos } = tela();
    context.dados = { total_faturamento: 500, total_comissoes: 154.13, barbeiros_sem_comissao: 1,
        barbeiros: [
            { nome_barbeiro: 'João', comissao_configurada: true, comissao_percentual: 40, faturamento: 185, valor_comissao: 74 },
            { nome_barbeiro: 'Pedro Zero', comissao_configurada: true, comissao_percentual: 0, valor_comissao: 0 },
            { nome_barbeiro: '<pendente>', comissao_configurada: false }
        ] };
    vm.runInContext('renderComissoes(dados, 500)', context);
    assert.match(elementos.get('comissoes-faturamento').textContent, /500,00/);
    assert.match(elementos.get('comissoes-total').textContent, /154,13/);
    const html = elementos.get('comissoes-conteudo').innerHTML;
    assert.match(html, /João/);
    assert.match(html, /74,00/);
    assert.match(html, /Pedro Zero/);
    assert.match(html, /0,00/);
    assert.match(html, /Pendente/);
    assert.match(html, /&lt;pendente&gt;/);
    assert.equal(elementos.get('comissoes-pendentes').hidden, false);
});

test('cache evita nova requisição ao voltar ao mês e ao reabrir relatórios', async () => {
    const storage = new Map();
    let chamadas = 0;
    function configurar(context) {
        context.fetch = async () => {
            chamadas++;
            return { ok: true, json: async () => ({ metricas: { faturamento: 500 }, comissoes: { barbeiros: [] } }) };
        };
        vm.runInContext(`userSession = { id_barbearia: 3 };
            getPeriodoSelecionado = () => ({ ano: 2026, mes: mesTeste });
            setDashboardLoading = () => {};
            renderDashboard = () => {};
            showToast = mensagem => { throw new Error(mensagem); };`, context);
    }
    const { context } = tela(storage);
    configurar(context);
    for (const mes of [10, 9, 10]) {
        context.mesTeste = mes;
        await vm.runInContext('carregarDashboard()', context);
    }
    assert.equal(chamadas, 2);
    const novaTela = tela(storage).context;
    configurar(novaTela);
    novaTela.mesTeste = 10;
    await vm.runInContext('carregarDashboard()', novaTela);
    assert.equal(chamadas, 2);
    vm.runInContext('userSession.id_barbearia = 4', novaTela);
    await vm.runInContext('carregarDashboard()', novaTela);
    assert.equal(chamadas, 3);
    vm.runInContext("userSession.id_barbearia = 3; assertCache = lerCacheRelatorio(3, 2026, 10)", novaTela);
    assert.ok(novaTela.assertCache);
    const outroAmbiente = tela(storage).context;
    vm.runInContext('salvarCacheRelatorio(3, 2026, 8, {metricas: {}})', outroAmbiente);
    assert.equal(vm.runInContext('lerCacheRelatorio(3, 2026, 8)', outroAmbiente), null);
});

test('API antiga mantém faturamento visível e informa ausência de pagamentos', () => {
    const { context, elementos } = tela();
    vm.runInContext('renderComissoes(undefined, 500)', context);
    assert.match(elementos.get('comissoes-faturamento').textContent, /500,00/);
    assert.equal(elementos.get('comissoes-total').textContent, '—');
    assert.match(elementos.get('comissoes-conteudo').innerHTML, /backend atualizado/);
    assert.match(elementos.get('comissoes-conteudo').innerHTML, /http:\/\/localhost:3000/);
});

test('configuração explícita usa localhost em arquivo, IP e domínio; false usa produção', () => {
    const codigo = fs.readFileSync(path.join(__dirname,
        '../../frontend-atualizado-v2/assets/js/config.js'), 'utf8');
    for (const hostname of ['', 'localhost', '127.0.0.1', '192.168.1.10', 'frontend.example']) {
        for (const local of [true, false]) {
            const context = vm.createContext({ window: { location: { hostname } } });
            vm.runInContext(codigo.replace('const USE_LOCAL_API = true;', `const USE_LOCAL_API = ${local};`), context);
            assert.equal(context.window.API_BASE_URL, local
                ? 'http://localhost:3000' : 'https://back-end-logika-barbeiros.vercel.app');
        }
    }
});

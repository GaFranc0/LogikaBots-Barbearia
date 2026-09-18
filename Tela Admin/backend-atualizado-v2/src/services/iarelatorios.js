const { interpretarPergunta, DIAS } = require('./iarelatorios-plano');

const NOTA_PRECOS = 'Valores calculados pelos preços atuais dos serviços; o sistema ainda não registra o preço cobrado em cada atendimento.';
const JOIN_AGENDAMENTOS = `
    FROM agendamentos a
    INNER JOIN servicos s ON s.id_servico = a.id_servico
        AND s.id_barbearia = a.id_barbearia
    INNER JOIN barbeiros b ON b.id_barbeiro = a.id_barbeiro
        AND b.id_barbearia = a.id_barbearia`;
const AGREGADOS = `COUNT(*) AS atendimentos,
    COUNT(DISTINCT a.id_cliente) AS clientes_atendidos,
    COALESCE(SUM(s.preco), 0) AS faturamento,
    AVG(s.preco) AS ticket_medio`;

// Expressões SQL fixas. Nenhum trecho de SQL é fornecido pelo modelo ou histórico.
const AGRUPAMENTOS = {
    RANKING_SERVICO: { coluna: 's.nome_servico AS nome', grupo: 's.id_servico, s.nome_servico', ordem: 'nome' },
    RANKING_BARBEIRO: { coluna: 'b.nome AS nome', grupo: 'b.id_barbeiro, b.nome', ordem: 'nome' },
    BARBEIROS_AGENDADOS: { coluna: 'b.nome AS nome', grupo: 'b.id_barbeiro, b.nome', ordem: 'nome' },
    MELHOR_DATA: { coluna: "DATE_FORMAT(a.data_agendamento, '%Y-%m-%d') AS data", grupo: "DATE_FORMAT(a.data_agendamento, '%Y-%m-%d')", ordem: 'data' },
    MELHOR_DIA_SEMANA: { coluna: 'DAYOFWEEK(a.data_agendamento) AS dia_numero', grupo: 'DAYOFWEEK(a.data_agendamento)', ordem: 'dia_numero' }
};

function filtrosAgendamentos(idBarbearia, plano, periodo) {
    const status = plano.intent === 'CANCELAMENTOS' ? 'cancelado'
        : ['AGENDADOS', 'BARBEIROS_AGENDADOS'].includes(plano.intent) ? 'agendado' : 'concluido';
    const condicoes = ['a.id_barbearia = ?', 'a.status_agendamento = ?',
        'a.data_agendamento >= ?', 'a.data_agendamento < ?'];
    const params = [idBarbearia, status, periodo.inicio, periodo.fim];
    if (plano.id_servico !== null) {
        condicoes.push('a.id_servico = ?');
        params.push(plano.id_servico);
    }
    if (plano.id_barbeiro !== null) {
        condicoes.push('a.id_barbeiro = ?');
        params.push(plano.id_barbeiro);
    }
    if (plano.dia_semana) {
        const dia = DIAS.indexOf(plano.dia_semana);
        if (dia < 0) throw new Error('Dia da semana inválido.');
        condicoes.push('DAYOFWEEK(a.data_agendamento) = ?');
        params.push(dia + 1);
    }
    return { where: condicoes.join(' AND '), params };
}

function numero(valor) {
    const result = Number(valor ?? 0);
    if (!Number.isFinite(result)) throw new Error('O banco retornou uma métrica inválida.');
    return result;
}
function normalizarLinha(row) {
    return { ...row, atendimentos: numero(row.atendimentos),
        clientes_atendidos: numero(row.clientes_atendidos), faturamento: numero(row.faturamento),
        ticket_medio: row.ticket_medio == null ? null : numero(row.ticket_medio) };
}
function moeda(valor) {
    return numero(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function quantidade(n, singular, plural = singular + 's') { return `${n} ${n === 1 ? singular : plural}`; }
function filtrosDescricao(plano) {
    const filtros = [];
    if (plano.servico) filtros.push(`serviço ${plano.servico}`);
    if (plano.barbeiro) filtros.push(`barbeiro ${plano.barbeiro}`);
    if (plano.dia_semana) filtros.push(`dia da semana: ${plano.dia_semana}`);
    return filtros.length ? ` (${filtros.join('; ')})` : '';
}

function montarResposta(resultado, plano, periodo) {
    const escopo = `em ${periodo.label}${filtrosDescricao(plano)}`;
    const n = resultado.atendimentos;
    switch (plano.intent) {
        case 'FATURAMENTO':
            return `O faturamento ${escopo} foi de ${moeda(resultado.faturamento)}.`;
        case 'ATENDIMENTOS':
            return `${n === 1 ? 'Foi realizado' : 'Foram realizados'} ${quantidade(n, 'atendimento')} concluído${n === 1 ? '' : 's'} ${escopo}.`;
        case 'CLIENTES_ATENDIDOS': {
            const total = resultado.clientes_atendidos;
            return `${total === 1 ? 'Foi atendido' : 'Foram atendidos'} ${quantidade(total, 'cliente diferente', 'clientes diferentes')} ${escopo}.`;
        }
        case 'TICKET_MEDIO':
            return n === 0 ? `Não houve atendimentos concluídos ${escopo} para calcular o ticket médio.`
                : `O ticket médio por atendimento ${escopo} foi de ${moeda(resultado.ticket_medio)}.`;
        case 'CANCELAMENTOS':
            return `${n === 1 ? 'Foi registrado' : 'Foram registrados'} ${quantidade(n, 'cancelamento')} ${escopo}.`;
        case 'AGENDADOS':
            return `${n === 1 ? 'Existe' : 'Existem'} ${quantidade(n, 'agendamento')} com status agendado ${escopo}.`;
        case 'NOVOS_CLIENTES':
            return `${resultado.novos_clientes === 1 ? 'Foi cadastrado' : 'Foram cadastrados'} ${quantidade(resultado.novos_clientes, 'novo cliente', 'novos clientes')} ${escopo}.`;
        case 'RESUMO': {
            const ticket = n === 0 ? 'ticket médio indisponível por falta de atendimentos'
                : `ticket médio por atendimento de ${moeda(resultado.ticket_medio)}`;
            const novos = resultado.novos_clientes == null ? ''
                : `; ${quantidade(resultado.novos_clientes, 'novo cliente cadastrado', 'novos clientes cadastrados')} na barbearia`;
            return `Resumo ${escopo}: ${quantidade(n, 'atendimento')} concluído${n === 1 ? '' : 's'}, ${quantidade(resultado.clientes_atendidos, 'cliente diferente', 'clientes diferentes')}, faturamento de ${moeda(resultado.faturamento)} e ${ticket}${novos}.`;
        }
        case 'BARBEIROS_AGENDADOS':
            return resultado.barbeiros.length
                ? `Barbeiros com status agendado ${escopo}: ${resultado.barbeiros.map(b => `${b.nome}: ${quantidade(b.atendimentos, 'agendamento')}`).join('; ')}.`
                : `Nenhum barbeiro possui agendamentos com status agendado ${escopo}.`;
        default: {
            if (!resultado.vencedores) throw new Error('Tipo de relatório não suportado.');
            if (!resultado.vencedores.length) return `Não houve atendimentos concluídos ${escopo} para esse ranking.`;
            const nomes = resultado.vencedores.map(row => {
                if (plano.intent === 'MELHOR_DATA') return String(row.data).split('-').reverse().join('/');
                if (plano.intent === 'MELHOR_DIA_SEMANA') return DIAS[numero(row.dia_numero) - 1];
                return row.nome;
            }).join(' e ');
            const vencedor = resultado.vencedores[0];
            const dinheiro = plano.ranking_por === 'FATURAMENTO';
            const valor = dinheiro ? `${moeda(vencedor.faturamento)} de faturamento`
                : quantidade(vencedor.atendimentos, 'atendimento');
            return resultado.vencedores.length > 1
                ? `Houve empate entre ${nomes} ${escopo}, com ${valor} cada.`
                : `${nomes} teve o maior ${dinheiro ? 'faturamento' : 'número de atendimentos'} ${escopo}: ${valor}.`;
        }
    }
}

function criarServicoRelatorios({ pool, chat }) {
    async function novosClientes(idBarbearia, periodo) {
        const [rows] = await pool.query(`SELECT COUNT(*) AS novos_clientes FROM clientes
            WHERE id_barbearia = ? AND data_cadastro >= ? AND data_cadastro < ?`,
        [idBarbearia, `${periodo.inicio} 00:00:00`, `${periodo.fim} 00:00:00`]);
        return numero(rows[0]?.novos_clientes);
    }

    async function consultarRelatorio(idBarbearia, plano, periodo) {
        if (plano.intent === 'NOVOS_CLIENTES') return { novos_clientes: await novosClientes(idBarbearia, periodo) };
        const filtro = filtrosAgendamentos(idBarbearia, plano, periodo);
        const grupo = AGRUPAMENTOS[plano.intent];
        const metrica = plano.ranking_por === 'FATURAMENTO' ? 'faturamento' : 'atendimentos';
        const [rows] = await pool.query(`SELECT ${grupo ? grupo.coluna + ',' : ''} ${AGREGADOS}
            ${JOIN_AGENDAMENTOS} WHERE ${filtro.where}
            ${grupo ? `GROUP BY ${grupo.grupo} ORDER BY ${metrica} DESC, ${grupo.ordem} ASC` : ''}`,
        filtro.params);
        const metricas = rows.map(normalizarLinha);
        if (plano.intent === 'BARBEIROS_AGENDADOS') return { barbeiros: metricas };
        if (grupo) {
            // O SQL calcula os agregados e ordena. Incluímos todos os empates.
            return { vencedores: metricas.filter(row => row[metrica] === metricas[0]?.[metrica]) };
        }
        const resultado = metricas[0] || normalizarLinha({});
        if (plano.intent === 'RESUMO') {
            // Cadastro não tem barbeiro/serviço: não misturar escopos no resumo filtrado.
            resultado.novos_clientes = plano.servico || plano.barbeiro || plano.dia_semana
                ? null : await novosClientes(idBarbearia, periodo);
        }
        return resultado;
    }

    async function perguntarIA(pergunta, idBarbearia, anoSelecionado, mesSelecionado, historico = []) {
        if (typeof pergunta !== 'string' || !pergunta.trim()) throw new Error('Pergunta inválida.');
        if (pergunta.length > 300) throw new Error('Faça uma pergunta de até 300 caracteres.');
        if (!['number', 'string'].includes(typeof idBarbearia) || !Number.isSafeInteger(Number(idBarbearia)) || Number(idBarbearia) <= 0) {
            throw new Error('Barbearia inválida.');
        }
        idBarbearia = Number(idBarbearia);
        const [[servicos], [barbeiros]] = await Promise.all([
            pool.query('SELECT id_servico, nome_servico FROM servicos WHERE id_barbearia = ? ORDER BY nome_servico', [idBarbearia]),
            pool.query('SELECT id_barbeiro, nome FROM barbeiros WHERE id_barbearia = ? ORDER BY nome', [idBarbearia])
        ]);
        const interpretacao = await interpretarPergunta({ pergunta: pergunta.trim(), ano: Number(anoSelecionado),
            mes: Number(mesSelecionado), contexto: { servicos, barbeiros }, historico, chat });
        if (!interpretacao.plano) return { ...interpretacao, plano: null };
        const { plano, periodo } = interpretacao;
        const resultado = await consultarRelatorio(idBarbearia, plano, periodo);
        const monetaria = ['FATURAMENTO', 'TICKET_MEDIO', 'RESUMO'].includes(plano.intent) || plano.ranking_por === 'FATURAMENTO';
        const observacoes = monetaria ? [NOTA_PRECOS] : [];
        const resposta = [montarResposta(resultado, plano, periodo), ...observacoes].join(' ');
        if (process.env.IA_DEBUG === '1') console.log('[IA RELATÓRIOS]', { plano, periodo });
        return { resposta, periodo, tipo: plano.intent, plano, observacoes };
    }
    return { perguntarIA };
}

// Inicialização lazy facilita testes sem abrir conexões e preserva a API das rotas.
let servicoPadrao;
async function perguntarIA(...args) {
    servicoPadrao ??= criarServicoRelatorios({
        pool: require('../config/databaseia'), chat: require('./ollama').ollamaChat
    });
    return servicoPadrao.perguntarIA(...args);
}

module.exports = { perguntarIA, criarServicoRelatorios };

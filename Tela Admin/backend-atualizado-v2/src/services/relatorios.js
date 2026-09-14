const { pool } = require('../config/database');
const { ollamaChat } = require('./ollama');

const NOMES_MESES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const DIA_ENUM = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];

function dataSQL(ano, mes, dia = 1) {
    return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

function proximoMes(ano, mes) {
    return mes === 12 ? { ano: ano + 1, mes: 1 } : { ano, mes: mes + 1 };
}

function mesAnterior(ano, mes) {
    return mes === 1 ? { ano: ano - 1, mes: 12 } : { ano, mes: mes - 1 };
}

function percentual(atual, anterior) {
    atual = Number(atual || 0);
    anterior = Number(anterior || 0);

    if (anterior === 0) return atual > 0 ? 100 : 0;
    return ((atual - anterior) / anterior) * 100;
}

function segundosHora(valor) {
    if (!valor) return null;
    const [h = 0, m = 0, s = 0] = String(valor).split(':').map(Number);
    return (h * 3600) + (m * 60) + s;
}

function contarCapacidadeMes({ ano, mes, barbeiros, horarios, disponibilidades }) {
    if (!barbeiros.length || !horarios.length || !disponibilidades.length) return 0;

    const barbeirosMap = new Map(
        barbeiros.map((b) => [Number(b.id_barbeiro), b])
    );

    const disponiveisPorDia = new Map();
    for (const d of disponibilidades) {
        const dia = String(d.dia_semana);
        if (!disponiveisPorDia.has(dia)) disponiveisPorDia.set(dia, []);
        disponiveisPorDia.get(dia).push(d);
    }

    const slots = horarios
        .map((h) => ({ original: h.horario, segundos: segundosHora(h.horario) }))
        .filter((h) => Number.isFinite(h.segundos));

    const diasNoMes = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
    let capacidade = 0;

    for (let dia = 1; dia <= diasNoMes; dia++) {
        const indiceDia = new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay();
        const diaEnum = DIA_ENUM[indiceDia];
        const disponibilidadesDia = disponiveisPorDia.get(diaEnum) || [];

        for (const disp of disponibilidadesDia) {
            const barbeiro = barbeirosMap.get(Number(disp.id_barbeiro));
            if (!barbeiro) continue;

            const inicio = segundosHora(disp.hora_inicio);
            const fim = segundosHora(disp.hora_fim);
            const almocoInicio = segundosHora(barbeiro.almoco_inicio);
            const almocoFim = segundosHora(barbeiro.almoco_fim);

            if (!Number.isFinite(inicio) || !Number.isFinite(fim)) continue;

            for (const slot of slots) {
                if (slot.segundos < inicio || slot.segundos >= fim) continue;

                const noAlmoco = Number.isFinite(almocoInicio) && Number.isFinite(almocoFim)
                    && slot.segundos >= almocoInicio
                    && slot.segundos < almocoFim;

                if (!noAlmoco) capacidade++;
            }
        }
    }

    return capacidade;
}

async function gerarInsightIA({
    periodo,
    metricas,
    faturamentoPorDia,
    topServicos
}) {

    if (
        !metricas.atendimentos ||
        metricas.atendimentos <= 0
    ) {

        return 'Ainda não há dados suficientes para gerar uma sugestão.';
    }


    /*
    ==============================================
    ENCONTRAR DIA MAIS FRACO COM MOVIMENTO
    ==============================================
    */

    const diasComDados =
        faturamentoPorDia.filter(
            d => Number(d.faturamento) > 0
        );


    let diaFraco = null;
    let diaForte = null;


    if (diasComDados.length) {

        diaFraco =
            [...diasComDados]
                .sort(
                    (a, b) =>
                        Number(a.faturamento) -
                        Number(b.faturamento)
                )[0];


        diaForte =
            [...diasComDados]
                .sort(
                    (a, b) =>
                        Number(b.faturamento) -
                        Number(a.faturamento)
                )[0];
    }


    const topServico =
        topServicos?.[0] || null;


    /*
    ==============================================
    BACKEND ESCOLHE QUAL OPORTUNIDADE É MAIS ÚTIL
    ==============================================
    */

    let objetivo;
    let fatos = [];


    if (
        metricas.taxa_ocupacao < 55 &&
        diaFraco
    ) {

        objetivo =
            `Crie uma ação para atrair clientes em ${diaFraco.dia}.`;

        fatos.push(
            `${diaFraco.dia} teve faturamento de R$ ${Number(diaFraco.faturamento).toFixed(2)}.`
        );

        fatos.push(
            `A taxa de ocupação do período foi ${Number(metricas.taxa_ocupacao).toFixed(1)}%.`
        );

    }

    else if (
        topServico &&
        Number(topServico.percentual) >= 35
    ) {

        objetivo =
            `Crie uma ideia simples para aproveitar a popularidade do serviço "${topServico.nome_servico}" e aumentar vendas de outros serviços.`;

        fatos.push(
            `"${topServico.nome_servico}" representa ${Number(topServico.percentual).toFixed(1)}% dos atendimentos.`
        );

    }

    else if (
        metricas.novos_clientes <= 2
    ) {

        objetivo =
            'Crie uma ação simples para atrair novos clientes.';

        fatos.push(
            `Foram registrados ${metricas.novos_clientes} novos clientes no período.`
        );

    }

    else if (
        Number(metricas.variacao_faturamento) < 0
    ) {

        objetivo =
            'Crie uma ação prática para ajudar a recuperar o faturamento.';

        fatos.push(
            `O faturamento variou ${Number(metricas.variacao_faturamento).toFixed(1)}% em relação ao período anterior.`
        );

    }

    else if (diaFraco) {

        objetivo =
            `Crie uma ação simples para aumentar o movimento em ${diaFraco.dia}.`;

        fatos.push(
            `${diaFraco.dia} teve o menor faturamento entre os dias com atendimento.`
        );

    }

    else {

        objetivo =
            'Crie uma ideia simples para atrair novos clientes para a barbearia.';
    }


    const prompt = `
Você escreve UMA sugestão comercial para uma barbearia.

OBJETIVO:
${objetivo}

FATOS QUE VOCÊ PODE USAR:
${fatos.join('\n')}

REGRAS ABSOLUTAS:

- Escreva apenas a sugestão.
- Máximo de 2 frases.
- Máximo de 220 caracteres.
- Seja direto.
- Não faça introdução.
- Não faça resumo do mês.
- Não explique seu raciocínio.
- Não diga "com base nos dados".
- Não repita todas as métricas.
- Não mencione SQL.
- Não mencione banco de dados.
- Não invente números.
- Não invente descontos.
- Não invente percentuais.
- Não invente promoções com valores específicos.
- Não afirme fatos que não estão acima.
- Dê uma ação concreta que o dono possa aplicar.
- Português brasileiro.

EXEMPLO BOM:

"Crie uma campanha exclusiva para terça-feira e divulgue nos Stories e no WhatsApp para preencher os horários mais vazios."

EXEMPLO BOM:

"Ofereça o serviço mais procurado em um combo com outro serviço menos vendido para aumentar o ticket médio."

EXEMPLO RUIM:

"Analisando o mês, podemos observar que houve diversos fatores que influenciaram os resultados..."

EXEMPLO RUIM:

"O faturamento foi X, a ocupação foi Y e portanto recomendamos..."

Retorne somente:

{
    "insight": "texto"
}
`;


    try {

        const resposta =
            await ollamaChat(
                [
                    {
                        role: 'system',
                        content:
                            'Você escreve apenas sugestões comerciais curtas e práticas para barbearias.'
                    },

                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                {
                    json: true,
                    temperature: 0.1,
                    keepAlive: '2m'
                }
            );


        const objeto =
            JSON.parse(resposta);


        let insight =
            String(objeto.insight || '')
                .trim();


        if (!insight) {
            throw new Error(
                'Insight vazio.'
            );
        }


        /*
        ==============================================
        LIMITE REAL PELO BACKEND
        ==============================================
        */

        if (insight.length > 240) {

            insight =
                insight
                    .slice(0, 237)
                    .trim() + '...';
        }


        return insight;


    } catch (error) {

        console.error(
            'Erro ao gerar insight:',
            error
        );


        /*
        ==============================================
        FALLBACK SEM IA
        ==============================================
        */

        if (diaFraco) {

            return `Crie uma ação de divulgação para ${diaFraco.dia} e use WhatsApp e redes sociais para preencher os horários mais vazios.`;
        }


        return 'Crie uma campanha de indicação para trazer novos clientes e aumentar o movimento da barbearia.';
    }
}

async function buscarDashboard({ idBarbearia, ano, mes }) {
    idBarbearia = Number(idBarbearia);
    ano = Number(ano);
    mes = Number(mes);

    if (!Number.isInteger(idBarbearia) || idBarbearia <= 0) {
        throw new Error('id_barbearia inválido.');
    }
    if (!Number.isInteger(ano) || ano < 2000 || ano > 2100) {
        throw new Error('Ano inválido.');
    }
    if (!Number.isInteger(mes) || mes < 1 || mes > 12) {
        throw new Error('Mês inválido.');
    }

    const proximo = proximoMes(ano, mes);
    const anterior = mesAnterior(ano, mes);

    const inicio = dataSQL(ano, mes);
    const fim = dataSQL(proximo.ano, proximo.mes);
    const anteriorInicio = dataSQL(anterior.ano, anterior.mes);
    const anteriorFim = inicio;

    const [metricasRows] = await pool.query(`
        SELECT
            COUNT(a.id_agendamento) AS atendimentos,
            COALESCE(SUM(s.preco), 0) AS faturamento,
            COALESCE(AVG(s.preco), 0) AS ticket_medio
        FROM agendamentos a
        INNER JOIN servicos s
            ON s.id_servico = a.id_servico
           AND s.id_barbearia = a.id_barbearia
        WHERE a.id_barbearia = ?
          AND a.status_agendamento = 'concluido'
          AND a.data_agendamento >= ?
          AND a.data_agendamento < ?
    `, [idBarbearia, inicio, fim]);

    const [clientesRows] = await pool.query(`
        SELECT COUNT(*) AS novos_clientes
        FROM clientes
        WHERE id_barbearia = ?
        AND data_cadastro >= ?
        AND data_cadastro < ?
    `, [idBarbearia, inicio, fim]);

    const [semanaRows] = await pool.query(`
        SELECT
            DAYOFWEEK(a.data_agendamento) AS dia_semana,
            COALESCE(SUM(s.preco), 0) AS faturamento
        FROM agendamentos a
        INNER JOIN servicos s
            ON s.id_servico = a.id_servico
           AND s.id_barbearia = a.id_barbearia
        WHERE a.id_barbearia = ?
          AND a.status_agendamento = 'concluido'
          AND a.data_agendamento >= ?
          AND a.data_agendamento < ?
        GROUP BY DAYOFWEEK(a.data_agendamento)
        ORDER BY dia_semana
    `, [idBarbearia, inicio, fim]);

    const [servicosRows] = await pool.query(`
        SELECT
            s.id_servico,
            s.nome_servico,
            COUNT(*) AS quantidade,
            COALESCE(SUM(s.preco), 0) AS faturamento
        FROM agendamentos a
        INNER JOIN servicos s
            ON s.id_servico = a.id_servico
           AND s.id_barbearia = a.id_barbearia
        WHERE a.id_barbearia = ?
          AND a.status_agendamento = 'concluido'
          AND a.data_agendamento >= ?
          AND a.data_agendamento < ?
        GROUP BY s.id_servico, s.nome_servico
        ORDER BY quantidade DESC, faturamento DESC
        LIMIT 5
    `, [idBarbearia, inicio, fim]);

    const [anteriorRows] = await pool.query(`
        SELECT
            COALESCE(SUM(s.preco), 0) AS faturamento,
            COALESCE(AVG(s.preco), 0) AS ticket_medio
        FROM agendamentos a
        INNER JOIN servicos s
            ON s.id_servico = a.id_servico
           AND s.id_barbearia = a.id_barbearia
        WHERE a.id_barbearia = ?
          AND a.status_agendamento = 'concluido'
          AND a.data_agendamento >= ?
          AND a.data_agendamento < ?
    `, [idBarbearia, anteriorInicio, anteriorFim]);

    const [ocupacaoRows] = await pool.query(`
        SELECT COUNT(*) AS ocupados
        FROM agendamentos
        WHERE id_barbearia = ?
          AND status_agendamento IN ('agendado', 'concluido')
          AND data_agendamento >= ?
          AND data_agendamento < ?
    `, [idBarbearia, inicio, fim]);

    const [barbeirosRows] = await pool.query(`
        SELECT id_barbeiro, almoco_inicio, almoco_fim
        FROM barbeiros
        WHERE id_barbearia = ?
          AND situacao = 'ativo'
    `, [idBarbearia]);

    const [horariosRows] = await pool.query(`
        SELECT horario
        FROM horarios_atendimento
        WHERE id_barbearia = ?
        ORDER BY horario
    `, [idBarbearia]);

    const [disponibilidadesRows] = await pool.query(`
        SELECT id_barbeiro, dia_semana, hora_inicio, hora_fim
        FROM disponibilidade_barbeiro
        WHERE id_barbearia = ?
    `, [idBarbearia]);

    const metricas = metricasRows[0] || {};
    const metricasAnterior = anteriorRows[0] || {};

    const faturamento = Number(metricas.faturamento || 0);
    const ticketMedio = Number(metricas.ticket_medio || 0);
    const ocupados = Number(ocupacaoRows[0]?.ocupados || 0);

    const capacidade = contarCapacidadeMes({
        ano,
        mes,
        barbeiros: barbeirosRows,
        horarios: horariosRows,
        disponibilidades: disponibilidadesRows
    });

    const taxaOcupacao = capacidade > 0
        ? Math.min(100, (ocupados / capacidade) * 100)
        : 0;

    const nomesDias = {
        1: 'Dom', 2: 'Seg', 3: 'Ter', 4: 'Qua', 5: 'Qui', 6: 'Sex', 7: 'Sáb'
    };

    const faturamentoPorDia = Object.keys(nomesDias).map((numero) => {
        const encontrado = semanaRows.find((item) => Number(item.dia_semana) === Number(numero));
        return {
            dia_semana: Number(numero),
            dia: nomesDias[numero],
            faturamento: Number(encontrado?.faturamento || 0)
        };
    });

    const totalServicos = servicosRows.reduce((acc, item) => acc + Number(item.quantidade || 0), 0);
    const topServicos = servicosRows.map((item) => ({
        nome_servico: item.nome_servico,
        quantidade: Number(item.quantidade || 0),
        faturamento: Number(item.faturamento || 0),
        percentual: totalServicos > 0
            ? (Number(item.quantidade || 0) / totalServicos) * 100
            : 0
    }));

    const periodoDashboard = {
        ano,
        mes,
        label: `${NOMES_MESES[mes - 1]} de ${ano}`
    };


    const metricasDashboard = {
        faturamento,

        atendimentos:
            Number(metricas.atendimentos || 0),

        novos_clientes:
            Number(
                clientesRows[0]?.novos_clientes || 0
            ),

        ticket_medio:
            ticketMedio,

        taxa_ocupacao:
            taxaOcupacao,

        capacidade_slots:
            capacidade,

        slots_ocupados:
            ocupados,

        variacao_faturamento:
            percentual(
                faturamento,
                metricasAnterior.faturamento
            ),

        variacao_ticket:
            percentual(
                ticketMedio,
                metricasAnterior.ticket_medio
            )
    };


    const insight = await gerarInsightIA({
        periodo: periodoDashboard,
        metricas: metricasDashboard,
        faturamentoPorDia,
        topServicos
    });

    return {

        periodo:
            periodoDashboard,

        metricas:
            metricasDashboard,

        faturamento_por_dia_semana:
            faturamentoPorDia,

        top_servicos:
            topServicos,

        insight
    };
}

module.exports = { buscarDashboard };

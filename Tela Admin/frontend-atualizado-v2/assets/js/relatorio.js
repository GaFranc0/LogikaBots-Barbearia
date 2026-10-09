// ==========================================
// CONFIGURAÇÃO & ESTADO
// ==========================================
const API_URL = window.API_BASE_URL;

let userSession = {};
let periodoAtual = null;
let dashboardRequestId = 0;

// Memória temporária da IA: existe somente enquanto esta página estiver aberta.
// Ao recarregar a página, o array é criado vazio novamente.
let historicoIA = [];
const LIMITE_HISTORICO_IA = 6;

// ==========================================
// INICIALIZAÇÃO
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    lucide.createIcons();

    if (!checkAuth()) return;

    initTheme();
    initUI();
    initMobileMenu();
    initPeriodoSelector();
    initRelatoriosEvents();

    await carregarDashboard();
});

function checkAuth() {
    const rawUser = localStorage.getItem('user_data');

    if (!rawUser) {
        window.location.href = 'index.html';
        return false;
    }

    try {
        userSession = JSON.parse(rawUser);
        return true;
    } catch (e) {
        console.error('Erro ao parsear user_data:', e);
        localStorage.removeItem('user_data');
        window.location.href = 'index.html';
        return false;
    }
}

function getIdBarbearia() {
    return Number(userSession.id_barbearia || userSession.idBarbearia);
}

function initUI() {
    const userNameDisplay = document.getElementById('user-name-display');
    const userEmailDisplay = document.getElementById('user-email-display');

    if (userNameDisplay) userNameDisplay.innerText = userSession.nome || 'Admin';
    if (userEmailDisplay) userEmailDisplay.innerText = userSession.email || userSession.usuario || 'Administrador';
}

// ==========================================
// PERÍODO DO RELATÓRIO
// ==========================================
function initPeriodoSelector() {
    const select = document.getElementById('periodo-relatorio');
    if (!select) return;

    const hoje = new Date();
    const nomesMeses = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    select.innerHTML = '';

    // Últimos 18 meses, incluindo o atual.
    for (let i = 0; i < 18; i++) {
        const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
        const ano = data.getFullYear();
        const mes = data.getMonth() + 1;

        const option = document.createElement('option');
        option.value = `${ano}-${String(mes).padStart(2, '0')}`;
        option.textContent = `${nomesMeses[mes - 1]} ${ano}`;
        select.appendChild(option);
    }

    periodoAtual = select.value;
}

function initRelatoriosEvents() {
    const select = document.getElementById('periodo-relatorio');
    const btnIA = document.getElementById('btn-perguntar-ia');
    const inputIA = document.getElementById('ia-pergunta');
    const btnPDF = document.getElementById('btn-exportar-pdf');

    select?.addEventListener('change', async () => {
        periodoAtual = select.value;
        await carregarDashboard();
    });

    btnIA?.addEventListener('click', perguntarIA);

    inputIA?.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            perguntarIA();
        }
    });

    btnPDF?.addEventListener('click', () => {
        // O diálogo do navegador permite "Salvar como PDF".
        window.print();
    });

    window.addEventListener('storage', async (event) => {
        if (event.key !== 'user_data' || !event.newValue) return;
        const idAnterior = getIdBarbearia();
        if (checkAuth() && getIdBarbearia() !== idAnterior) {
            historicoIA = [];
            document.getElementById('ia-resposta')?.classList.add('hidden');
            initUI();
            await carregarDashboard();
        }
    });
}

function getPeriodoSelecionado() {
    const select = document.getElementById('periodo-relatorio');
    const valor = select?.value || periodoAtual;

    if (!valor) {
        const agora = new Date();
        return { ano: agora.getFullYear(), mes: agora.getMonth() + 1 };
    }

    const [ano, mes] = valor.split('-').map(Number);
    return { ano, mes };
}

// ==========================================
// DASHBOARD PADRÃO (SEM IA)
// ==========================================
function chaveCacheRelatorio(idBarbearia, ano, mes) {
    return `relatorios:v2:${API_URL}:${idBarbearia}:${ano}-${String(mes).padStart(2, '0')}`;
}

function lerCacheRelatorio(idBarbearia, ano, mes) {
    try {
        const dados = JSON.parse(sessionStorage.getItem(chaveCacheRelatorio(idBarbearia, ano, mes)));
        if (dados?.metricas && Array.isArray(dados.comissoes?.barbeiros)) return dados;
    } catch {
        // Armazenamento indisponível ou dados inválidos: consultar a API.
    }
    return null;
}

function salvarCacheRelatorio(idBarbearia, ano, mes, dados) {
    if (!dados?.metricas || !Array.isArray(dados.comissoes?.barbeiros)) return;
    try {
        sessionStorage.setItem(chaveCacheRelatorio(idBarbearia, ano, mes), JSON.stringify(dados));
    } catch {
        // Falha no cache não impede exibir o relatório recebido.
    }
}

async function carregarDashboard() {
    const requestId = ++dashboardRequestId;
    const idBarbearia = getIdBarbearia();

    const { ano, mes } =
        getPeriodoSelecionado();

    if (!idBarbearia) {
        setDashboardLoading(false);
        setComissoesEstado('Não foi possível identificar a barbearia.', true);
        showToast(
            'Não foi possível identificar a barbearia do usuário.',
            'error'
        );

        return;
    }


    const cache = lerCacheRelatorio(idBarbearia, ano, mes);
    if (cache) {
        setDashboardLoading(false);
        renderDashboard(cache);
        return;
    }
    setDashboardLoading(true);


    try {

        const params =
            new URLSearchParams({
                id_barbearia: String(idBarbearia),
                ano: String(ano),
                mes: String(mes)
            });


        const response =
            await fetch(
                `${API_URL}/relatorios/dashboard?${params}`, { cache: 'no-store' }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.error ||
                data.detalhe ||
                'Erro ao carregar relatórios.'
            );

        }


        // ==========================================
        // 3. SALVAR RESULTADO
        // ==========================================
        salvarCacheRelatorio(idBarbearia, ano, mes, data);

        if (requestId !== dashboardRequestId) return;


        // ==========================================
        // 4. RENDERIZAR
        // ==========================================

        renderDashboard(data);


    } catch (error) {
        if (requestId !== dashboardRequestId) return;
        setComissoesEstado('Não foi possível carregar as comissões. Tente carregar o período novamente.', true);

        console.error(
            'Erro ao carregar dashboard:',
            error
        );

        showToast(
            error.message ||
            'Erro ao carregar relatórios.',
            'error'
        );


    } finally {

        if (requestId === dashboardRequestId) setDashboardLoading(false);

    }
}

function setDashboardLoading(isLoading) {
    document.getElementById('comissoes-secao')?.setAttribute('aria-busy', String(isLoading));
    if (isLoading) setComissoesEstado('Carregando comissões...');
    const ids = [
        'metrica-faturamento',
        'metrica-atendimentos',
        'metrica-ticket',
        'metrica-ocupacao'
    ];

    ids.forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('animate-pulse', isLoading);
    });
}

function renderDashboard(data) {
    const metricas = data.metricas || {};

    setText('metrica-faturamento', formatarMoeda(metricas.faturamento));
    setText('metrica-atendimentos', formatarNumero(metricas.atendimentos));
    setText('metrica-novos-clientes', `${formatarNumero(metricas.novos_clientes)} Novos`);
    setText('metrica-ticket', formatarMoeda(metricas.ticket_medio));
    setText('metrica-ocupacao', `${formatarPercentual(metricas.taxa_ocupacao)}%`);
    setText('metrica-faturamento-variacao', formatarVariacao(metricas.variacao_faturamento));
    setText('metrica-ticket-variacao', formatarVariacao(metricas.variacao_ticket));

    const barraOcupacao = document.getElementById('barra-ocupacao');
    if (barraOcupacao) {
        const ocupacao = Math.max(0, Math.min(100, Number(metricas.taxa_ocupacao) || 0));
        barraOcupacao.style.width = `${ocupacao}%`;
    }

    const descricao = document.getElementById('periodo-descricao');
    if (descricao) descricao.textContent = `Resumo consolidado de ${data.periodo?.label || 'período selecionado'}.`;

    renderGrafico(data.faturamento_por_dia_semana || []);
    renderTopServicos(data.top_servicos || []);
    renderInsight(data.insight);
    renderComissoes(data.comissoes, metricas.faturamento);

    lucide.createIcons();
}

function setComissoesEstado(mensagem, erro = false) {
    setText('comissoes-faturamento', '—');
    setText('comissoes-total', '—');
    const aviso = document.getElementById('comissoes-pendentes');
    if (aviso) aviso.hidden = true;
    const container = document.getElementById('comissoes-conteudo');
    if (container) {
        container.innerHTML = `<p role="${erro ? 'alert' : 'status'}" class="text-sm ${erro ? 'comissoes-erro' : 'text-slate-400'}">${escapeHtml(mensagem)}</p>`;
    }
}

function renderComissoes(comissoes, faturamento) {
    if (!comissoes || typeof comissoes !== 'object') {
        setComissoesEstado(`A API ${API_URL} não retornou os dados de pagamento dos barbeiros. Verifique se o backend atualizado está rodando nesse endereço e recarregue a página.`, true);
        setText('comissoes-faturamento', formatarMoeda(faturamento));
        return;
    }

    setText('comissoes-faturamento', formatarMoeda(comissoes.total_faturamento ?? faturamento));
    setText('comissoes-total', formatarMoeda(comissoes.total_comissoes));
    const aviso = document.getElementById('comissoes-pendentes');
    if (aviso) aviso.hidden = !(Number(comissoes.barbeiros_sem_comissao) > 0);
    const container = document.getElementById('comissoes-conteudo');
    if (!container) return;
    const barbeiros = Array.isArray(comissoes.barbeiros) ? comissoes.barbeiros : [];
    if (!barbeiros.length) {
        container.innerHTML = '<p role="status" class="text-sm text-slate-400">Nenhum barbeiro com dados de comissões neste período.</p>';
        return;
    }

    container.innerHTML = `<table class="comissoes-tabela" aria-label="Comissões dos barbeiros">
        <thead><tr><th scope="col">Barbeiro</th><th scope="col">Situação</th><th scope="col">Atendimentos concluídos</th><th scope="col">Faturamento do barbeiro</th><th scope="col">Percentual de comissão</th><th scope="col">Valor a pagar</th></tr></thead>
        <tbody>${barbeiros.map((barbeiro) => {
            const configurada = barbeiro.comissao_configurada === true;
            const percentual = configurada
                ? `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(Number(barbeiro.comissao_percentual) || 0)}%`
                : 'Comissão não configurada';
            return `<tr>
                <th scope="row" data-label="Barbeiro">${escapeHtml(barbeiro.nome_barbeiro || 'Barbeiro sem nome')}</th>
                <td data-label="Situação">${escapeHtml(barbeiro.situacao || 'Não informada')}</td>
                <td data-label="Atendimentos concluídos">${formatarNumero(barbeiro.atendimentos)}</td>
                <td data-label="Faturamento do barbeiro">${formatarMoeda(barbeiro.faturamento)}</td>
                <td data-label="Percentual de comissão" class="${configurada ? '' : 'comissoes-pendente'}">${percentual}</td>
                <td data-label="Valor a pagar" class="${configurada ? 'comissoes-valor' : 'comissoes-pendente'}">${configurada ? formatarMoeda(barbeiro.valor_comissao) : 'Pendente'}</td>
            </tr>`;
        }).join('')}</tbody>
    </table>`;
}

function renderGrafico(dias) {
    const container = document.getElementById('grafico-faturamento');
    if (!container) return;

    const ordem = [
        { numero: 1, label: 'Dom' },
        { numero: 2, label: 'Seg' },
        { numero: 3, label: 'Ter' },
        { numero: 4, label: 'Qua' },
        { numero: 5, label: 'Qui' },
        { numero: 6, label: 'Sex' },
        { numero: 7, label: 'Sáb' }
    ];

    const mapa = new Map(
        dias.map((item) => [
            Number(item.dia_semana),
            Number(item.faturamento) || 0
        ])
    );

    const maior = Math.max(
        ...ordem.map((d) => mapa.get(d.numero) || 0),
        1
    );

    container.innerHTML = ordem.map((dia) => {
        const valor = mapa.get(dia.numero) || 0;

        const altura = valor > 0
            ? Math.max(4, (valor / maior) * 92)
            : 2;

        const destaque = valor === maior && valor > 0;

        return `
            <div
                class="relative chart-bar-container flex flex-col items-center gap-2 w-full h-full justify-end group cursor-pointer"
            >

                <div
                    class="
                        absolute
                        left-1/2
                        -translate-x-1/2
                        -top-8
                        opacity-0
                        invisible
                        group-hover:opacity-100
                        group-hover:visible
                        transition-all
                        duration-150
                        z-50
                        pointer-events-none
                        whitespace-nowrap
                        text-xs
                        py-1.5
                        px-2.5
                        rounded-lg
                        shadow-xl
                        ${destaque
                            ? 'bg-emerald-500 text-slate-950 font-bold'
                            : 'bg-slate-900 border border-emerald-500/40 text-emerald-400'
                        }
                    "
                >
                    ${escapeHtml(dia.label)}: ${formatarMoeda(valor)}
                </div>

                <div
                    class="
                        relative
                        w-full
                        rounded-t-lg
                        bg-slate-800/30
                        h-full
                        flex
                        items-end
                        group-hover:bg-slate-800/50
                        transition-colors
                    "
                >

                    <div
                        class="
                            bar-fill
                            w-full
                            rounded-t-lg
                            ${destaque
                                ? 'bg-gradient-to-t from-emerald-500 to-emerald-300'
                                : 'bg-gradient-to-t from-emerald-600/80 to-emerald-400/80'
                            }
                            animate-grow-bar
                        "
                        style="height: ${altura}%"
                    ></div>

                </div>

                <span
                    class="
                        text-[10px]
                        font-bold
                        uppercase
                        ${destaque
                            ? 'text-emerald-400'
                            : 'text-slate-500'
                        }
                    "
                >
                    ${escapeHtml(dia.label)}
                </span>

            </div>
        `;
    }).join('');
}

function renderTopServicos(servicos) {
    const container = document.getElementById('top-servicos');
    if (!container) return;

    if (!servicos.length) {
        container.innerHTML = '<p class="text-sm text-slate-500">Nenhum atendimento concluído neste período.</p>';
        return;
    }

    container.innerHTML = servicos.slice(0, 5).map((servico) => {
        const percentual = Math.max(0, Math.min(100, Number(servico.percentual) || 0));

        return `
            <div class="group">
                <div class="flex justify-between text-xs mb-1.5 gap-3">
                    <span class="text-slate-300 font-medium group-hover:text-white transition-colors truncate">${escapeHtml(servico.nome_servico)}</span>
                    <span class="text-white font-mono font-bold whitespace-nowrap">${formatarPercentual(percentual)}%</span>
                </div>
                <div class="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div class="bg-emerald-500 h-full rounded-full progress-fill" style="width: ${percentual}%"></div>
                </div>
                <div class="flex justify-between mt-1 text-[10px] text-slate-500">
                    <span>${formatarNumero(servico.quantidade)} atendimentos</span>
                    <span>${formatarMoeda(servico.faturamento)}</span>
                </div>
            </div>
        `;
    }).join('');
}

function renderInsight(insight) {
    const el = document.getElementById('insight-automatico');
    if (!el) return;

    el.textContent = insight || 'Ainda não há dados suficientes para gerar um insight deste período.';
}

// ==========================================
// PERGUNTA LIVRE PARA A IA
// ==========================================
async function perguntarIA() {
    const input = document.getElementById('ia-pergunta');
    const btn = document.getElementById('btn-perguntar-ia');
    const loading = document.getElementById('ia-loading');
    const respostaBox = document.getElementById('ia-resposta');
    const respostaTexto = document.getElementById('ia-resposta-texto');

    const pergunta = input?.value.trim();
    const idBarbearia = getIdBarbearia();
    const { ano, mes } = getPeriodoSelecionado();

    if (!pergunta) {
        showToast(
            'Digite uma pergunta sobre os relatórios.',
            'error'
        );

        input?.focus();
        return;
    }

    if (!idBarbearia) {
        showToast(
            'Não foi possível identificar a barbearia.',
            'error'
        );
        return;
    }

    if (!ano || !mes) {
        showToast(
            'Não foi possível identificar o período selecionado.',
            'error'
        );
        return;
    }

    try {
        btn.disabled = true;
        input.disabled = true;

        loading?.classList.remove('hidden');
        respostaBox?.classList.add('hidden');

        const response = await fetch(
            `${API_URL}/ia/perguntar`,
            {
                method: 'POST',

                headers: {
                    'Content-Type': 'application/json'
                },

                body: JSON.stringify({
                    pergunta,
                    id_barbearia: idBarbearia,
                    ano,
                    mes,
                    historico: historicoIA
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.detalhe ||
                data.error ||
                'Erro ao consultar os relatórios.'
            );
        }

        if (!data.resposta) {
            throw new Error(
                'Não foi possível obter uma resposta.'
            );
        }

        if (idBarbearia !== getIdBarbearia()) return;
        respostaTexto.textContent = data.resposta;

        respostaBox?.classList.remove('hidden');


        historicoIA.push({
            pergunta,
            resposta: data.resposta,
            plano: data.plano || null
        });


        if (historicoIA.length > LIMITE_HISTORICO_IA) {
            historicoIA = historicoIA.slice(-LIMITE_HISTORICO_IA);
        }

        lucide.createIcons();

    } catch (error) {

        console.error(
            'Erro ao consultar IA:',
            error
        );

        showToast(
            error.message ||
            'Erro ao consultar os relatórios.',
            'error'
        );

    } finally {

        btn.disabled = false;
        input.disabled = false;

        loading?.classList.add('hidden');
    }
}

// ==========================================
// FORMATAÇÃO
// ==========================================
function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(Number(valor) || 0);
}

function formatarNumero(valor) {
    return new Intl.NumberFormat('pt-BR').format(Number(valor) || 0);
}

function formatarPercentual(valor) {
    return new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
    }).format(Number(valor) || 0);
}

function formatarVariacao(valor) {
    const numero = Number(valor) || 0;
    const sinal = numero > 0 ? '+' : '';
    return `${sinal}${formatarPercentual(numero)}%`;
}

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

// ==========================================
// TEMA
// ==========================================
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') applyLightTheme();
}

function toggleTheme() {
    const body = document.body;
    const html = document.documentElement;
    const isLight = body.classList.contains('light');

    if (isLight) {
        body.classList.remove('light');
        html.classList.remove('light');
        localStorage.setItem('theme', 'dark');
        updateThemeUI('Modo Escuro', 'translateX(0px)', false);
    } else {
        applyLightTheme();
    }
}

function applyLightTheme() {
    const body = document.body;
    const html = document.documentElement;

    body.classList.add('light');
    html.classList.add('light');
    localStorage.setItem('theme', 'light');
    updateThemeUI('Modo Claro', 'translateX(20px)', true);
}

function updateThemeUI(text, transform, isLight) {
    const themeText = document.getElementById('theme-text');
    const themeDot = document.getElementById('theme-dot');
    const iconDark = document.getElementById('theme-icon-dark');
    const iconLight = document.getElementById('theme-icon-light');

    if (themeText) themeText.innerText = text;
    if (themeDot) themeDot.style.transform = transform;
    if (iconDark) iconDark.classList.toggle('hidden', isLight);
    if (iconLight) iconLight.classList.toggle('hidden', !isLight);
}

// ==========================================
// MENU MOBILE
// ==========================================
function initMobileMenu() {
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const mobileMenuButton = document.getElementById('mobile-menu-button');

    mobileMenuButton?.addEventListener('click', toggleSidebar);
    sidebarOverlay?.addEventListener('click', toggleSidebar);
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (!sidebar || !overlay) return;

    const isHidden = sidebar.classList.contains('-translate-x-full');

    if (isHidden) {
        sidebar.classList.remove('-translate-x-full');
        overlay.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    } else {
        sidebar.classList.add('-translate-x-full');
        overlay.classList.add('hidden');
        document.body.style.overflow = '';
    }
}

// ==========================================
// PERFIL
// ==========================================
function togglePerfilModal() {
    const modal = document.getElementById('modal-perfil');
    if (!modal) return;

    const isHidden = modal.classList.contains('hidden');

    if (isHidden) {
        document.getElementById('edit-profile-name').value = userSession.nome || '';
        document.getElementById('edit-profile-email').value = userSession.email || '';
        document.getElementById('edit-profile-pass').value = '';
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    } else {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }

    setTimeout(() => lucide.createIcons(), 100);
}

async function updateUserProfile() {
    const btn = document.getElementById('btn-save-profile');
    const originalText = btn.innerText;

    const novoNome = document.getElementById('edit-profile-name').value.trim();
    const novoEmail = document.getElementById('edit-profile-email').value.trim();
    const novaSenha = document.getElementById('edit-profile-pass').value.trim();

    if (!validateProfileData(novoNome, novoEmail)) return;

    try {
        btn.innerText = 'Salvando...';
        btn.disabled = true;

        await saveProfileToServer(novoNome, novoEmail, novaSenha);
        updateLocalSession(novoNome, novoEmail);
        updateProfileUI(novoNome, novoEmail);

        showToast('Perfil atualizado com sucesso!', 'success');
        togglePerfilModal();
    } catch (error) {
        console.error(error);
        showToast(error.message || 'Erro ao atualizar perfil.', 'error');
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

function validateProfileData(nome, email) {
    if (!nome || !email) {
        showToast('Nome e E-mail são obrigatórios.', 'error');
        return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showToast('Por favor, insira um e-mail válido.', 'error');
        document.getElementById('edit-profile-email').focus();
        return false;
    }

    return true;
}

async function saveProfileToServer(nome, email, senha) {
    const response = await fetch(`${API_URL}/usuarios/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            id_usuario: userSession.id_usuario || userSession.id,
            nome,
            email,
            senha_hash: senha || null
        })
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Erro ao atualizar');
    return result;
}

function updateLocalSession(nome, email) {
    userSession.nome = nome;
    userSession.email = email;
    localStorage.setItem('user_data', JSON.stringify(userSession));
}

function updateProfileUI(nome, email) {
    setText('user-name-display', nome);
    setText('user-email-display', email);
}

// ==========================================
// TOASTS
// ==========================================
function showToast(msg, type = 'info') {
    let container = document.getElementById('toast-container');

    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'fixed bottom-4 right-4 z-[9999] flex flex-col gap-2';
        document.body.appendChild(container);
    }

    const div = document.createElement('div');
    const colors = {
        success: { bg: 'bg-emerald-500', icon: 'check-circle' },
        error: { bg: 'bg-red-500', icon: 'alert-circle' },
        info: { bg: 'bg-blue-500', icon: 'info' }
    };

    const { bg, icon } = colors[type] || colors.info;

    div.className = `flex items-center gap-3 px-4 py-3 ${bg} text-white rounded-lg shadow-2xl animate-fade-in-up max-w-sm`;
    div.innerHTML = `
        <i data-lucide="${icon}" class="w-5 h-5 flex-shrink-0"></i>
        <span class="text-sm font-medium">${escapeHtml(msg)}</span>
    `;

    container.appendChild(div);
    lucide.createIcons();

    setTimeout(() => {
        div.style.opacity = '0';
        div.style.transform = 'translateX(100%)';
        div.style.transition = 'all 0.3s ease';
        setTimeout(() => div.remove(), 300);
    }, 4000);
}

// ==========================================
// LOGOUT
// ==========================================
function logout() {
    if (confirm('Deseja realmente sair?')) {
        localStorage.removeItem('user_data');
        window.location.href = 'index.html';
    }
}

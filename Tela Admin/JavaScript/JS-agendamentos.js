// ==========================================
// ESTADO GLOBAL & CONFIGURAÇÃO - OTIMIZADO
// ==========================================
const API_URL = 'http://localhost:3000';
let userSession = {};
let allAppointments = [];
let filteredAppointments = [];
let currentFilter = 'hoje';
let selectedAppointmentId = null;
let showingFreeSlots = false;
let allTimeSlots = [];

// ⚡ CONTROLES DE PERFORMANCE
let isLoading = false;
let loadingController = null;
let debounceTimer = null;

// ==========================================
// INICIALIZAÇÃO - OTIMIZADA
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🔄 Inicializando sistema...');
    lucide.createIcons();
    checkAuth();
    initTheme();
    initUI();
    setupEventListeners(); // ⚡ Antes de carregar dados
    await loadAppointments();
    startAutoRefresh();
});

function setupEventListeners() {
    console.log('🔧 Configurando event listeners...');
    
    const mobileMenuBtn = document.getElementById('mobile-menu-button');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', toggleSidebar);
    }
    
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', toggleSidebar);
    }
    
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
    
    const perfilBtn = document.getElementById('perfil-btn');
    if (perfilBtn) {
        perfilBtn.addEventListener('click', togglePerfilModal);
    }
    
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const filter = this.getAttribute('data-filter');
            filterByDate(filter);
        });
    });
    
    const toggleSlotsBtn = document.getElementById('btn-toggle-free-slots');
    if (toggleSlotsBtn) {
        toggleSlotsBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            toggleFreeSlots();
        });
    }
    
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        // ⚡ Debounce na busca para evitar renderizações excessivas
        searchInput.addEventListener('input', debounceSearch);
    }
    
    console.log('✅ Event listeners configurados');
}

function checkAuth() {
    console.log('🔐 Verificando autenticação...');
    const rawUser = localStorage.getItem('user_data');
    
    if (!rawUser) {
        console.log('❌ Nenhum usuário autenticado, redirecionando...');
        window.location.href = 'login.html';
        return;
    }
    
    try {
        userSession = JSON.parse(rawUser);
        console.log('✅ Usuário autenticado:', {
            nome: userSession.nome,
            email: userSession.email,
            id_barbearia: userSession.id_barbearia
        });
    } catch (e) {
        console.error('❌ Erro ao parsear user_data:', e);
        localStorage.removeItem('user_data');
        window.location.href = 'login.html';
    }
}

function initUI() {
    console.log('🎨 Inicializando UI...');
    
    const userNameDisplay = document.getElementById('user-name-display');
    const userEmailDisplay = document.getElementById('user-email-display');
    
    if (userNameDisplay) {
        userNameDisplay.textContent = userSession.nome || 'Admin';
    }
    
    if (userEmailDisplay) {
        userEmailDisplay.textContent = userSession.email || 'admin@logika.com';
    }
    
    criarModalDetalhes();
    console.log('✅ UI inicializada');
}

function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light');
        document.documentElement.classList.add('light');
        updateThemeUI("Modo Claro", "translateX(20px)", 
            document.getElementById('theme-icon-dark'), 
            document.getElementById('theme-icon-light'), 
            true);
    }
}

// ==========================================
// CARREGAMENTO DE DADOS - SUPER OTIMIZADO ⚡⚡⚡
// ==========================================
async function loadAppointments() {
    // ⚡ Prevenir múltiplas requisições simultâneas
    if (isLoading) {
        console.log('⏸️ Carregamento já em andamento, ignorando...');
        return;
    }
    
    const idBarb = userSession.id_barbearia;
    
    if (!idBarb) {
        console.error('❌ ID da barbearia não encontrado');
        showToast('Erro: Barbearia não configurada', 'error');
        return;
    }
    
    isLoading = true;
    console.log(`🔍 Carregando agendamentos da barbearia: ${idBarb}`);
    
    // ⚡ AbortController para cancelar requisições longas
    loadingController = new AbortController();
    const signal = loadingController.signal;
    
    try {
        showLoading();
        
        // ⚡ TIMEOUT de 10 segundos para evitar travamentos
        const timeoutId = setTimeout(() => {
            loadingController.abort();
        }, 10000);
        
        // ⚡ Carregar em paralelo com timeout
        const [horariosResponse, agendamentosResponse] = await Promise.all([
            fetch(`${API_URL}/horarios/${idBarb}`, { signal }),
            fetch(`${API_URL}/agendamentos/${idBarb}`, { signal })
        ]);
        
        clearTimeout(timeoutId);
        
        // Processar horários
        if (horariosResponse.ok) {
            const horariosData = await horariosResponse.json();
            console.log(`⏰ ${horariosData.length} horários recebidos`);
            
            allTimeSlots = horariosData.map(item => 
                item.horario ? item.horario.substring(0, 5) : item
            ).filter(Boolean);
            
            if (allTimeSlots.length === 0) {
                console.log('⚠️ Nenhum horário encontrado, usando fallback');
                allTimeSlots = generateDefaultTimeSlots();
            }
        } else {
            console.warn('⚠️ Erro ao buscar horários:', horariosResponse.status);
            allTimeSlots = generateDefaultTimeSlots();
        }
        
        // Processar agendamentos
        if (!agendamentosResponse.ok) {
            throw new Error(`Erro HTTP ${agendamentosResponse.status}`);
        }
        
        const data = await agendamentosResponse.json();
        console.log(`✅ ${data.length} agendamentos recebidos`);
        
        allAppointments = processAppointmentsData(data);
        console.log(`📊 ${allAppointments.length} agendamentos processados`);
        
        // ⚡ Usar requestAnimationFrame para renderização suave
        requestAnimationFrame(() => {
            applyFilters();
            updateStatistics();
            hideLoading();
        });
        
    } catch (error) {
        if (error.name === 'AbortError') {
            console.error('⏱️ Requisição cancelada por timeout');
            showToast('Tempo de carregamento excedido. Tente novamente.', 'error');
        } else {
            console.error('❌ Erro ao carregar:', error);
            showToast(`Erro: ${error.message}`, 'error');
        }
        hideLoading();
    } finally {
        isLoading = false;
        loadingController = null;
    }
}

function generateDefaultTimeSlots() {
    const slots = [];
    const intervalo = parseInt(localStorage.getItem('intervaloCortes')) || 30;
    
    for (let h = 8; h < 18; h++) {
        for (let m = 0; m < 60; m += intervalo) {
            slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
        }
    }
    
    return slots;
}

function processAppointmentsData(data) {
    if (!Array.isArray(data)) {
        console.error('❌ Dados não são array');
        return [];
    }
    
    // ⚡ Map otimizado sem múltiplas conversões de data
    return data.map((app, index) => {
        const dataObj = new Date(app.data_agendamento);
        const dataFormatada = formatDate(dataObj);
        
        return {
            ...app,
            id_agendamento: app.id_agendamento || index + 1,
            data_agendamento: dataFormatada,
            nome_cliente: app.nome_cliente || `Cliente ${index + 1}`,
            telefone_cliente: app.telefone_cliente || 'Sem telefone',
            nome_barbeiro: app.nome_barbeiro || 'Não definido',
            nome_servico: app.nome_servico || 'Serviço',
            preco: parseFloat(app.preco || 0),
            status_agendamento: app.status_agendamento || 'agendado',
            horario_inicio: app.horario_inicio || '09:00:00',
            horario_fim: app.horario_fim || '09:30:00'
        };
    });
}

function applyFilters() {
    const now = new Date();
    const today = formatDate(now);
    const tomorrow = formatDate(new Date(now.getTime() + 24 * 60 * 60 * 1000));
    const weekEnd = formatDate(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000));
    
    filteredAppointments = allAppointments.filter(app => {
        const appDate = app.data_agendamento;
        
        switch(currentFilter) {
            case 'hoje':
                return appDate === today;
            case 'amanha':
                return appDate === tomorrow;
            case 'semana':
                return appDate >= today && appDate <= weekEnd;
            default:
                return true;
        }
    });
    
    // Ordenação otimizada
    filteredAppointments.sort((a, b) => {
        const dateCompare = a.data_agendamento.localeCompare(b.data_agendamento);
        if (dateCompare !== 0) return dateCompare;
        return (a.horario_inicio || '').localeCompare(b.horario_inicio || '');
    });
    
    renderAppointments();
}

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// ==========================================
// RENDERIZAÇÃO - OTIMIZADA ⚡
// ==========================================
function renderAppointments() {
    console.log('🎨 Renderizando agendamentos...');
    
    const tbody = document.getElementById('appointments-tbody');
    if (!tbody) return;
    
    // ⚡ Usar DocumentFragment para renderização eficiente
    const fragment = document.createDocumentFragment();
    
    const hoje = formatDate(new Date());
    const agora = new Date();
    const horaAtual = agora.getHours() * 60 + agora.getMinutes();
    
    if (!showingFreeSlots) {
        if (filteredAppointments.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td colspan="7" class="px-6 py-12 text-center">
                    <div class="flex flex-col items-center gap-3 text-slate-500">
                        <i data-lucide="calendar-x" class="w-12 h-12 opacity-50"></i>
                        <p class="text-sm">Nenhum agendamento encontrado</p>
                    </div>
                </td>
            `;
            fragment.appendChild(tr);
        } else {
            // ⚡ Batch rendering
            filteredAppointments.forEach(app => {
                const row = createAppointmentRow(app);
                fragment.appendChild(row);
            });
        }
    } else {
        if (allTimeSlots.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td colspan="7" class="px-6 py-12 text-center">
                    <div class="flex flex-col items-center gap-3 text-slate-500">
                        <i data-lucide="clock-alert" class="w-12 h-12 opacity-50"></i>
                        <p class="text-sm">Nenhum horário configurado</p>
                    </div>
                </td>
            `;
            fragment.appendChild(tr);
        } else {
            const sortedSlots = [...allTimeSlots].sort();
            const agendamentosPorHorario = {};
            
            filteredAppointments.forEach(app => {
                if (app.data_agendamento === hoje) {
                    const horario = app.horario_inicio?.substring(0, 5);
                    if (horario) {
                        agendamentosPorHorario[horario] = app;
                    }
                }
            });
            
            sortedSlots.forEach(horario => {
                const [horas, minutos] = horario.split(':').map(Number);
                const minutosHorario = horas * 60 + minutos;
                const isHorarioPassado = hoje === formatDate(new Date()) && minutosHorario < horaAtual;
                
                const agendamento = agendamentosPorHorario[horario];
                const tr = createTimeSlotRow(horario, agendamento, isHorarioPassado);
                fragment.appendChild(tr);
            });
        }
    }
    
    // ⚡ Uma única operação de DOM
    tbody.innerHTML = '';
    tbody.appendChild(fragment);
    
    // ⚡ Event delegation em vez de listeners individuais
    tbody.addEventListener('click', handleTableClick);
    
    // ⚡ Batch icon creation
    requestAnimationFrame(() => {
        lucide.createIcons();
    });
}

// ⚡ Event delegation para melhor performance
function handleTableClick(e) {
    const row = e.target.closest('tr[data-appointment-id]');
    if (row) {
        const id = parseInt(row.getAttribute('data-appointment-id'));
        viewDetails(id);
    }
}

function createTimeSlotRow(horario, agendamento, isHorarioPassado) {
    const tr = document.createElement('tr');
    tr.className = 'transition-colors hover:bg-slate-900/40';
    
    if (agendamento) {
        tr.className = 'transition-colors hover:bg-slate-900/40 cursor-pointer';
        tr.setAttribute('data-appointment-id', agendamento.id_agendamento);
        
        const statusInfo = getStatusInfo(agendamento.status_agendamento);
        const statusClass = getStatusClass(agendamento.status_agendamento);
        
        tr.innerHTML = `
            <td class="px-4 md:px-6 py-3">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow-lg">
                        ${agendamento.nome_cliente?.substring(0, 2).toUpperCase() || 'CL'}
                    </div>
                    <div class="min-w-0 flex-1">
                        <p class="text-white font-medium text-sm md:text-base truncate">${agendamento.nome_cliente || 'Cliente'}</p>
                        <p class="text-xs text-slate-500 truncate md:hidden">${horario}</p>
                    </div>
                </div>
            </td>
            <td class="px-4 md:px-6 py-3 text-white font-mono text-xs md:text-sm hidden md:table-cell">
                ${horario}
            </td>
            <td class="px-4 md:px-6 py-3 text-slate-300 hidden lg:table-cell">
                <span class="text-xs">${agendamento.nome_barbeiro}</span>
            </td>
            <td class="px-4 md:px-6 py-3 text-slate-300 hidden xl:table-cell">
                <span class="text-xs">${agendamento.nome_servico}</span>
            </td>
            <td class="px-4 md:px-6 py-3 text-right text-emerald-400 font-mono font-bold text-xs md:text-sm hidden sm:table-cell">
                R$ ${parseFloat(agendamento.preco || 0).toFixed(2)}
            </td>
            <td class="px-4 md:px-6 py-3 text-right hidden xl:table-cell">
                <span class="status-badge ${statusClass.badge} inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold">
                    <i data-lucide="${statusInfo.icon}" class="w-3 h-3"></i> ${statusInfo.text}
                </span>
            </td>
            <td class="px-4 md:px-6 py-3 text-center hidden md:table-cell">
                <div class="p-2 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all">
                    <i data-lucide="eye" class="w-4 h-4"></i>
                </div>
            </td>
        `;
    } else if (isHorarioPassado) {
        tr.innerHTML = `
            <td colspan="7" class="px-4 md:px-6 py-3">
                <div class="flex items-center justify-between opacity-40">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full bg-slate-800/50 border border-slate-700 flex items-center justify-center flex-shrink-0">
                            <i data-lucide="clock" class="w-5 h-5 text-slate-600"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="flex flex-col md:flex-row md:items-center gap-1 md:gap-3">
                                <p class="text-slate-500 font-mono font-bold text-sm md:text-base">${horario}</p>
                                <span class="text-xs text-slate-600">Horário indisponível</span>
                            </div>
                        </div>
                    </div>
                    <span class="px-3 py-1 rounded-full bg-slate-800/30 text-slate-600 border border-slate-700/50 text-xs font-bold hidden sm:inline-block">
                        Passado
                    </span>
                </div>
            </td>
        `;
    } else {
        tr.innerHTML = `
            <td colspan="7" class="px-4 md:px-6 py-3">
                <div class="flex items-center justify-between opacity-80">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                            <i data-lucide="clock" class="w-5 h-5 text-emerald-400"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-emerald-400 font-mono font-bold text-sm md:text-base">${horario}</p>
                            <p class="text-xs text-emerald-400/80">Horário disponível</p>
                        </div>
                    </div>
                    <span class="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold hidden sm:inline-block">
                        Livre
                    </span>
                </div>
            </td>
        `;
    }
    
    return tr;
}

function createAppointmentRow(app) {
    const tr = document.createElement('tr');
    tr.className = 'table-row-hover transition-colors group cursor-pointer';
    tr.setAttribute('data-appointment-id', app.id_agendamento);
    
    const statusInfo = getStatusInfo(app.status_agendamento);
    const statusClass = getStatusClass(app.status_agendamento);
    const horarioFormatado = app.horario_inicio ? app.horario_inicio.substring(0, 5) : '--:--';
    const nomeCliente = app.nome_cliente || 'Cliente';
    const iniciais = nomeCliente.substring(0, 2).toUpperCase();
    
    tr.innerHTML = `
        <td class="px-3 md:px-6 py-3">
            <div class="flex items-center gap-3">
                <div class="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow-lg">
                    ${iniciais}
                </div>
                <div class="min-w-0 flex-1">
                    <p class="text-white font-medium text-sm md:text-base truncate">${nomeCliente}</p>
                    <p class="text-[10px] md:text-xs text-slate-500 truncate md:hidden">${horarioFormatado}</p>
                </div>
            </div>
        </td>
        <td class="px-3 md:px-6 py-3 text-white font-mono text-xs md:text-sm hidden md:table-cell">
            ${horarioFormatado}
        </td>
        <td class="px-3 md:px-6 py-3 text-slate-300 hidden lg:table-cell">
            <span class="text-xs">${app.nome_barbeiro}</span>
        </td>
        <td class="px-3 md:px-6 py-3 text-slate-300 hidden xl:table-cell">
            <span class="text-xs">${app.nome_servico}</span>
        </td>
        <td class="px-3 md:px-6 py-3 text-right text-emerald-400 font-mono font-bold text-xs md:text-sm hidden sm:table-cell">
            R$ ${parseFloat(app.preco || 0).toFixed(2)}
        </td>
        <td class="px-3 md:px-6 py-3 text-right hidden xl:table-cell">
            <span class="status-badge ${statusClass.badge} inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold">
                <i data-lucide="${statusInfo.icon}" class="w-3 h-3"></i> ${statusInfo.text}
            </span>
        </td>
        <td class="px-3 md:px-6 py-3 text-center hidden md:table-cell">
            <div class="p-2 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all">
                <i data-lucide="eye" class="w-4 h-4"></i>
            </div>
        </td>
    `;
    
    return tr;
}

function getStatusInfo(status) {
    switch(status) {
        case 'agendado': return { text: 'Agendado', icon: 'check-circle-2' };
        case 'concluido': return { text: 'Concluído', icon: 'check-check' };
        case 'cancelado': return { text: 'Cancelado', icon: 'x-circle' };
        default: return { text: 'Pendente', icon: 'clock' };
    }
}

function getStatusClass(status) {
    switch(status) {
        case 'agendado': return { badge: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' };
        case 'concluido': return { badge: 'bg-blue-500/10 text-blue-400 border border-blue-500/20' };
        case 'cancelado': return { badge: 'bg-red-500/10 text-red-400 border border-red-500/20' };
        default: return { badge: 'bg-slate-800/30 text-slate-600 border border-slate-700/50' };
    }
}

// ==========================================
// FUNÇÕES DE FILTRO E BUSCA - OTIMIZADAS ⚡
// ==========================================
function filterByDate(filter) {
    console.log('🔍 Filtro alterado para:', filter);
    currentFilter = filter;
    showingFreeSlots = false;
    
    const btnFreeSlots = document.getElementById('btn-toggle-free-slots');
    if (btnFreeSlots) {
        btnFreeSlots.innerHTML = '<i data-lucide="calendar-plus" class="w-4 h-4"></i> <span class="hidden sm:inline">Ver Todos Horários</span><span class="sm:hidden">Horários</span>';
        btnFreeSlots.classList.remove('bg-emerald-500/10', 'text-emerald-400', 'border-emerald-500/20');
        btnFreeSlots.classList.add('bg-blue-500/10', 'text-blue-400', 'border-blue-500/20');
        lucide.createIcons();
    }
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-filter') === filter) {
            btn.classList.add('active');
        }
    });
    
    applyFilters();
}

// ⚡ Debounce para busca
function debounceSearch(e) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        searchAppointments(e.target.value);
    }, 300); // 300ms de delay
}

function searchAppointments(searchTerm) {
    const term = searchTerm.toLowerCase().trim();
    
    if (!term) {
        applyFilters();
        return;
    }
    
    filteredAppointments = allAppointments.filter(app => {
        const nomeCliente = (app.nome_cliente || '').toLowerCase();
        const telefone = (app.telefone_cliente || '').toLowerCase().replace(/\D/g, '');
        const nomeBarbeiro = (app.nome_barbeiro || '').toLowerCase();
        const searchTermClean = term.replace(/\D/g, '');
        
        return nomeCliente.includes(term) || 
               (telefone && telefone.includes(searchTermClean)) || 
               nomeBarbeiro.includes(term);
    });
    
    renderAppointments();
}

function toggleFreeSlots() {
    console.log('🔄 Toggle horários - Estado anterior:', showingFreeSlots);
    showingFreeSlots = !showingFreeSlots;
    
    const btn = document.getElementById('btn-toggle-free-slots');
    
    if (showingFreeSlots) {
        btn.innerHTML = '<i data-lucide="calendar-check" class="w-4 h-4"></i> <span class="hidden sm:inline">Ver Agendados</span><span class="sm:hidden">Agendados</span>';
        btn.classList.remove('bg-blue-500/10', 'text-blue-400', 'border-blue-500/20');
        btn.classList.add('bg-emerald-500/10', 'text-emerald-400', 'border-emerald-500/20');
    } else {
        btn.innerHTML = '<i data-lucide="calendar-plus" class="w-4 h-4"></i> <span class="hidden sm:inline">Ver Todos Horários</span><span class="sm:hidden">Horários</span>';
        btn.classList.remove('bg-emerald-500/10', 'text-emerald-400', 'border-emerald-500/20');
        btn.classList.add('bg-blue-500/10', 'text-blue-400', 'border-blue-500/20');
    }
    
    lucide.createIcons();
    renderAppointments();
}

// ==========================================
// MODAL DE DETALHES
// ==========================================
function criarModalDetalhes() {
    const modalExistente = document.getElementById('modal-detalhes');
    if (modalExistente) {
        modalExistente.remove();
    }
    
    const modalDiv = document.createElement('div');
    modalDiv.id = 'modal-detalhes';
    modalDiv.className = 'fixed inset-0 z-[100] hidden items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4';
    modalDiv.innerHTML = `
        <div class="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
            <div class="p-4 border-b border-slate-800 flex justify-between items-center">
                <h3 class="text-lg font-bold text-white flex items-center gap-2">
                    <i data-lucide="calendar-check" class="w-5 h-5 text-emerald-400"></i> Detalhes do Agendamento
                </h3>
                <div id="modal-close-btn" class="cursor-pointer text-slate-400 hover:text-white transition-colors">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </div>
            </div>
            <div id="modal-detalhes-content" class="p-4 max-h-[60vh] overflow-y-auto">
                <!-- Conteúdo dinâmico -->
            </div>
            <div id="modal-botoes-container" class="p-4 bg-slate-950/50 border-t border-slate-800">
                <!-- Botões dinâmicos -->
            </div>
        </div>
    `;
    
    document.body.appendChild(modalDiv);
    
    const closeBtn = document.getElementById('modal-close-btn');
    closeBtn.addEventListener('click', closeDetailsModal);
    
    modalDiv.addEventListener('click', function(e) {
        if (e.target === this) {
            closeDetailsModal();
        }
    });
    
    return modalDiv;
}

function criarBotoesAcoes(status, idAgendamento) {
    const container = document.createElement('div');
    container.className = 'flex gap-3';
    
    if (status === 'cancelado' || status === 'concluido') {
        container.innerHTML = `
            <div class="w-full text-center py-2">
                <p class="text-slate-400 text-sm">Este agendamento já foi ${status === 'concluido' ? 'concluído' : 'cancelado'}</p>
            </div>
        `;
    } else {
        container.innerHTML = `
            <div class="flex-1 px-4 py-2.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all font-bold text-sm flex items-center justify-center gap-2 cursor-pointer btn-cancelar">
                <i data-lucide="x-circle" class="w-4 h-4"></i>
                <span>Cancelar</span>
            </div>
            <div class="flex-1 px-4 py-2.5 rounded-lg bg-emerald-500 text-slate-900 hover:bg-emerald-400 transition-all font-bold text-sm flex items-center justify-center gap-2 cursor-pointer btn-concluir">
                <i data-lucide="check-circle-2" class="w-4 h-4"></i>
                <span>Concluir</span>
            </div>
        `;
    }
    
    return container;
}

function viewDetails(idAgendamento) {
    const app = allAppointments.find(a => a.id_agendamento === idAgendamento);
    if (!app) {
        showToast("Agendamento não encontrado.", "error");
        return;
    }
    
    selectedAppointmentId = idAgendamento;
    
    let modal = document.getElementById('modal-detalhes');
    if (!modal) {
        modal = criarModalDetalhes();
    }
    
    const content = document.getElementById('modal-detalhes-content');
    const botoesContainer = document.getElementById('modal-botoes-container');
    
    const dataFormatada = formatDisplayDateFull(app.data_agendamento);
    const horarioInicio = app.horario_inicio ? app.horario_inicio.substring(0, 5) : '--:--';
    const horarioFim = app.horario_fim ? app.horario_fim.substring(0, 5) : '--:--';
    
    let statusDisplay = '';
    switch(app.status_agendamento) {
        case 'agendado': statusDisplay = 'Confirmado'; break;
        case 'concluido': statusDisplay = 'Concluído'; break;
        case 'cancelado': statusDisplay = 'Cancelado'; break;
        default: statusDisplay = 'Pendente';
    }
    
    content.innerHTML = `
        <div class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="text-xs font-bold text-slate-500 uppercase">Cliente</label>
                    <p class="text-white font-medium mt-1 text-sm break-words">${app.nome_cliente || 'Não informado'}</p>
                </div>
                <div>
                    <label class="text-xs font-bold text-slate-500 uppercase">Telefone</label>
                    <p class="text-white font-medium mt-1 font-mono text-sm break-all">${formatTelefone(app.telefone_cliente)}</p>
                </div>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="text-xs font-bold text-slate-500 uppercase">Data</label>
                    <p class="text-white font-medium mt-1 text-sm">${dataFormatada}</p>
                </div>
                <div>
                    <label class="text-xs font-bold text-slate-500 uppercase">Horário</label>
                    <p class="text-white font-medium mt-1 font-mono text-sm">${horarioInicio} - ${horarioFim}</p>
                </div>
            </div>
            
            <div>
                <label class="text-xs font-bold text-slate-500 uppercase">Profissional</label>
                <p class="text-white font-medium mt-1 flex items-center gap-2 text-sm">
                    <i data-lucide="user" class="w-4 h-4 text-purple-400 flex-shrink-0"></i>
                    <span class="break-words">${app.nome_barbeiro || 'Não definido'}</span>
                </p>
            </div>
            
            <div>
                <label class="text-xs font-bold text-slate-500 uppercase">Serviço</label>
                <p class="text-white font-medium mt-1 flex items-center gap-2 text-sm">
                    <i data-lucide="scissors" class="w-4 h-4 text-purple-400 flex-shrink-0"></i>
                    <span class="break-words">${app.nome_servico || 'Não definido'}</span>
                </p>
            </div>
            
            <div>
                <label class="text-xs font-bold text-slate-500 uppercase">Valor</label>
                <p class="text-emerald-400 font-bold text-xl font-mono mt-1">R$ ${parseFloat(app.preco || 0).toFixed(2)}</p>
            </div>
            
            <div>
                <label class="text-xs font-bold text-slate-500 uppercase">Status</label>
                <div class="mt-2">
                    ${getStatusBadge(app.status_agendamento, statusDisplay)}
                </div>
            </div>
        </div>
    `;
    
    botoesContainer.innerHTML = '';
    botoesContainer.appendChild(criarBotoesAcoes(app.status_agendamento, idAgendamento));
    
    if (app.status_agendamento === 'agendado') {
        const btnCancelar = botoesContainer.querySelector('.btn-cancelar');
        const btnConcluir = botoesContainer.querySelector('.btn-concluir');
        
        if (btnCancelar) {
            btnCancelar.addEventListener('click', () => confirmarCancelamento(idAgendamento));
        }
        
        if (btnConcluir) {
            btnConcluir.addEventListener('click', () => concluirAgendamento(idAgendamento));
        }
    }
    
    lucide.createIcons();
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.style.overflow = 'hidden';
}

function closeDetailsModal() {
    const modal = document.getElementById('modal-detalhes');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        document.body.style.overflow = '';
        selectedAppointmentId = null;
    }
}

// ==========================================
// FUNÇÕES DE AÇÃO
// ==========================================
async function confirmarCancelamento(idAgendamento) {
    if (!idAgendamento) return;
    
    const confirmModal = document.createElement('div');
    confirmModal.className = 'fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4';
    confirmModal.innerHTML = `
        <div class="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
            <div class="p-4 border-b border-slate-800">
                <h3 class="text-lg font-bold text-white flex items-center gap-2">
                    <i data-lucide="alert-circle" class="w-5 h-5 text-red-400"></i> Confirmar Cancelamento
                </h3>
            </div>
            <div class="p-6">
                <p class="text-slate-300 mb-4 text-sm">Tem certeza que deseja cancelar este agendamento?</p>
                <div class="flex gap-3">
                    <div class="flex-1 px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all font-medium text-sm flex items-center justify-center gap-2 cursor-pointer btn-cancelar-confirm">
                        <i data-lucide="x" class="w-4 h-4"></i>
                        <span>Não</span>
                    </div>
                    <div class="flex-1 px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-all font-bold text-sm flex items-center justify-center gap-2 cursor-pointer btn-confirmar-cancelar">
                        <i data-lucide="check" class="w-4 h-4"></i>
                        <span>Sim, Cancelar</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(confirmModal);
    lucide.createIcons();
    
    confirmModal.querySelector('.btn-cancelar-confirm').addEventListener('click', () => {
        confirmModal.remove();
    });
    
    confirmModal.querySelector('.btn-confirmar-cancelar').addEventListener('click', async () => {
        confirmModal.remove();
        await cancelarAgendamento(idAgendamento);
    });
    
    confirmModal.addEventListener('click', function(e) {
        if (e.target === this) {
            confirmModal.remove();
        }
    });
}

async function cancelarAgendamento(idAgendamento) {
    console.log(`📤 Cancelando agendamento ${idAgendamento}`);
    
    try {
        const response = await fetch(`${API_URL}/agendamentos/cancelar`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ id_agendamento: idAgendamento })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Erro ao cancelar');
        }
        
        showToast("Agendamento cancelado com sucesso!", "success");
        closeDetailsModal();
        await loadAppointments();
        
    } catch (error) {
        console.error('❌ Erro:', error);
        showToast(`Erro: ${error.message}`, "error");
    }
}

async function concluirAgendamento(idAgendamento) {
    console.log(`📤 Concluindo agendamento ${idAgendamento}`);
    
    try {
        const response = await fetch(`${API_URL}/agendamentos/concluir`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ id_agendamento: idAgendamento })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Erro ao concluir');
        }
        
        showToast("Agendamento concluído com sucesso!", "success");
        closeDetailsModal();
        await loadAppointments();
        
    } catch (error) {
        console.error('❌ Erro:', error);
        showToast(`Erro: ${error.message}`, "error");
    }
}

// ==========================================
// FUNÇÕES AUXILIARES
// ==========================================
function formatTelefone(telefone) {
    if (!telefone || telefone === 'Sem telefone') return 'Sem telefone';
    const numeros = telefone.replace(/\D/g, '');
    if (numeros.length === 11) {
        return `(${numeros.substring(0, 2)}) ${numeros.substring(2, 7)}-${numeros.substring(7)}`;
    } else if (numeros.length === 10) {
        return `(${numeros.substring(0, 2)}) ${numeros.substring(2, 6)}-${numeros.substring(6)}`;
    }
    return telefone;
}

function formatDisplayDateFull(dateString) {
    if (!dateString) return '--/--/----';
    const [year, month, day] = dateString.split('-');
    const dateObj = new Date(year, month - 1, day);
    const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${diasSemana[dateObj.getDay()]}, ${dateObj.getDate()} de ${meses[dateObj.getMonth()]} de ${dateObj.getFullYear()}`;
}

function getStatusBadge(status, text) {
    const badges = {
        'agendado': `<div class="px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold flex items-center gap-2 w-fit">
                <i data-lucide="check-circle-2" class="w-3 h-3 flex-shrink-0"></i> ${text}
            </div>`,
        'concluido': `<div class="px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-bold flex items-center gap-2 w-fit">
                <i data-lucide="check-check" class="w-3 h-3 flex-shrink-0"></i> ${text}
            </div>`,
        'cancelado': `<div class="px-3 py-1.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-bold flex items-center gap-2 w-fit">
                <i data-lucide="x-circle" class="w-3 h-3 flex-shrink-0"></i> ${text}
            </div>`
    };
    return badges[status] || `<div class="px-3 py-1.5 rounded-full border border-slate-700 text-slate-500 text-xs font-bold">${text}</div>`;
}

function updateStatistics() {
    const hoje = formatDate(new Date());
    
    const agendamentosHoje = allAppointments.filter(app => 
        app.data_agendamento === hoje && app.status_agendamento === 'agendado'
    ).length;
    
    const faturamento = allAppointments
        .filter(app => 
            app.data_agendamento === hoje && 
            (app.status_agendamento === 'agendado' || app.status_agendamento === 'concluido')
        )
        .reduce((sum, app) => sum + parseFloat(app.preco || 0), 0);
    
    const totalAgendamentos = allAppointments.filter(app => 
        app.data_agendamento === hoje && 
        (app.status_agendamento === 'agendado' || app.status_agendamento === 'concluido')
    ).length;
    
    const ticketMedio = totalAgendamentos > 0 ? faturamento / totalAgendamentos : 0;
    
    const statHoje = document.getElementById('stat-hoje');
    const statFaturamento = document.getElementById('stat-faturamento');
    const statTicket = document.getElementById('stat-ticket');
    
    if (statHoje) statHoje.textContent = agendamentosHoje;
    if (statFaturamento) statFaturamento.textContent = `R$ ${faturamento.toFixed(2)}`;
    if (statTicket) statTicket.textContent = `R$ ${ticketMedio.toFixed(2)}`;
}

function showLoading() {
    const tbody = document.getElementById('appointments-tbody');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="px-6 py-8 text-center">
                    <i data-lucide="loader-2" class="w-8 h-8 animate-spin mx-auto text-emerald-500"></i>
                    <p class="text-slate-500 mt-3 text-sm">Carregando...</p>
                </td>
            </tr>
        `;
        lucide.createIcons();
    }
}

function hideLoading() {
    // Loading é escondido pela renderização normal
}

function showToast(msg, type) {
    const container = document.getElementById('toast-container');
    const div = document.createElement('div');
    const color = type === 'success' ? 'emerald' : 'red';
    const icon = type === 'success' ? 'check' : 'alert-circle';
    
    div.className = `flex items-center gap-3 px-4 py-3 bg-slate-900 border-l-4 border-${color}-500 text-${color}-400 rounded shadow-2xl mb-2 text-sm animate-fade-in`;
    div.innerHTML = `<i data-lucide="${icon}" class="w-4 h-4"></i> <span>${msg}</span>`;
    
    container.appendChild(div);
    lucide.createIcons();
    
    setTimeout(() => {
        div.style.opacity = '0';
        div.style.transform = 'translateX(100%)';
        setTimeout(() => div.remove(), 300);
    }, 4000);
}

// ⚡ Auto-refresh MENOS agressivo (2 minutos em vez de 1)
function startAutoRefresh() {
    setInterval(() => {
        if (!isLoading) {
            loadAppointments();
        }
    }, 120000); // 2 minutos
}

function toggleTheme() {
    const body = document.body;
    const html = document.documentElement;
    const iconDark = document.getElementById('theme-icon-dark');
    const iconLight = document.getElementById('theme-icon-light');
    
    const isLight = body.classList.contains('light');
    
    if (isLight) {
        body.classList.remove('light');
        html.classList.remove('light');
        localStorage.setItem('theme', 'dark');
        updateThemeUI("Modo Escuro", "translateX(0px)", iconDark, iconLight, false);
    } else {
        body.classList.add('light');
        html.classList.add('light');
        localStorage.setItem('theme', 'light');
        updateThemeUI("Modo Claro", "translateX(20px)", iconDark, iconLight, true);
    }
}

function updateThemeUI(text, transform, iconDark, iconLight, isLight) {
    const themeText = document.getElementById('theme-text');
    const themeDot = document.getElementById('theme-dot');
    
    if (themeText) themeText.textContent = text;
    if (themeDot) themeDot.style.transform = transform;
    if (iconDark) iconDark.classList.toggle('hidden', isLight);
    if (iconLight) iconLight.classList.toggle('hidden', !isLight);
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
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

function togglePerfilModal() {
    showToast("Funcionalidade de perfil em desenvolvimento", "info");
}

function logout() {
    localStorage.removeItem('user_data');
    window.location.href = 'login.html';
}
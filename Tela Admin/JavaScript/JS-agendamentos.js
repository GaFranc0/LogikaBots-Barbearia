// ==========================================
// ESTADO GLOBAL & CONFIGURAÇÃO - OTIMIZADO
// ==========================================
const API_URL = 'http://localhost:3000';
let userSession = {};
let allAppointments = [];
let blockedSlots = []; // ⭐ NOVO: Lista de horários bloqueados
let filteredAppointments = [];
let currentFilter = 'hoje';
let selectedAppointmentId = null;
let showingFreeSlots = false;
let allTimeSlots = [];
let allBarbers = [];
let selectedBarber = 'todos';

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
    setupEventListeners();
    await loadBarbers();
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

    const blockSlotBtn = document.getElementById('btn-block-slot');
    if (blockSlotBtn) {
        blockSlotBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            openBlockSlotModal();
        });
    }
    
    const barberFilter = document.getElementById('barber-filter');
    if (barberFilter) {
        barberFilter.addEventListener('change', function(e) {
            selectedBarber = e.target.value;
            applyAllFilters();
        });
    }
    
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
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
            usuario: userSession.usuario,
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
        const displayText = userSession.email || (userSession.usuario ? `@${userSession.usuario}` : 'admin@logika.com');
        userEmailDisplay.textContent = displayText;
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
// CARREGAR BARBEIROS
// ==========================================
async function loadBarbers() {
    const idBarb = userSession.id_barbearia;
    
    if (!idBarb) {
        console.error('❌ ID da barbearia não encontrado');
        return;
    }
    
    try {
        console.log('👨‍💼 Carregando barbeiros...');
        const response = await fetch(`${API_URL}/barbeiros/${idBarb}`);
        
        if (response.ok) {
            const data = await response.json();
            allBarbers = data.filter(b => b.situacao === 'ativo');
            console.log(`✅ ${allBarbers.length} barbeiros carregados`);
            
            const barberFilter = document.getElementById('barber-filter');
            if (barberFilter) {
                barberFilter.innerHTML = '<option value="todos">Todos os Barbeiros</option>';
                allBarbers.forEach(barber => {
                    const option = document.createElement('option');
                    option.value = barber.id_barbeiro;
                    option.textContent = barber.nome;
                    barberFilter.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error('❌ Erro ao carregar barbeiros:', error);
    }
}

// ==========================================
// 🔒 CARREGAR BLOQUEIOS - ✅ CORRIGIDO TIMEZONE
// ==========================================
async function loadBlockedSlots() {
    const idBarb = userSession.id_barbearia;
    
    if (!idBarb) {
        console.error('❌ ID da barbearia não encontrado');
        return;
    }
    
    try {
        console.log('🔒 Carregando horários bloqueados...');
        const response = await fetch(`${API_URL}/bloqueios/${idBarb}`);
        
        if (response.ok) {
            const data = await response.json();
            
            // ⭐ CORREÇÃO: Processar bloqueios SEM conversão de timezone
            blockedSlots = data.map(block => {
                let dataInicio, horaInicio, dataFim, horaFim;
                
                // ✅ Processar data_inicio
                if (block.data_inicio && typeof block.data_inicio === 'string') {
                    if (block.data_inicio.includes(' ')) {
                        // Formato MySQL: "2026-02-16 08:20:00"
                        const parts = block.data_inicio.split(' ');
                        dataInicio = parts[0]; // "2026-02-16"
                        horaInicio = parts[1] ? parts[1].substring(0, 5) : '00:00'; // "08:20"
                    } else if (block.data_inicio.includes('T')) {
                        // Formato ISO: "2026-02-16T08:20:00"
                        const parts = block.data_inicio.split('T');
                        dataInicio = parts[0];
                        horaInicio = parts[1] ? parts[1].substring(0, 5) : '00:00';
                    } else {
                        dataInicio = block.data_inicio;
                        horaInicio = '00:00';
                    }
                }
                
                // ✅ Processar data_fim
                if (block.data_fim && typeof block.data_fim === 'string') {
                    if (block.data_fim.includes(' ')) {
                        const parts = block.data_fim.split(' ');
                        dataFim = parts[0];
                        horaFim = parts[1] ? parts[1].substring(0, 5) : '00:00';
                    } else if (block.data_fim.includes('T')) {
                        const parts = block.data_fim.split('T');
                        dataFim = parts[0];
                        horaFim = parts[1] ? parts[1].substring(0, 5) : '00:00';
                    } else {
                        dataFim = block.data_fim;
                        horaFim = '00:00';
                    }
                }
                
                const bloqueio = {
                    id_bloqueio: block.id_bloqueio,
                    id_barbeiro: block.id_barbeiro,
                    nome_barbeiro: block.nome_barbeiro || 'Barbeiro',
                    data: dataInicio,           // compatibilidade
                    hora: horaInicio,           // compatibilidade
                    data_inicio: dataInicio,    // completo
                    hora_inicio: horaInicio,    // completo
                    data_fim: dataFim,          // completo
                    hora_fim: horaFim,          // completo
                    motivo: block.motivo || 'Horário bloqueado'
                };
                
                console.log('✅ Bloqueio processado:', bloqueio);
                return bloqueio;
            });
            
            console.log(`✅ ${blockedSlots.length} bloqueios carregados`);
        }
    } catch (error) {
        console.error('❌ Erro ao carregar bloqueios:', error);
    }
}

// ==========================================
// CARREGAMENTO DE DADOS - SUPER OTIMIZADO
// ==========================================
async function loadAppointments() {
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
    console.log(`🔍 Carregando dados da barbearia: ${idBarb}`);
    
    loadingController = new AbortController();
    const signal = loadingController.signal;
    
    try {
        showLoading();
        
        const timeoutId = setTimeout(() => {
            loadingController.abort();
        }, 10000);
        
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
        
        await loadBlockedSlots();
        
        requestAnimationFrame(() => {
            applyAllFilters();
            updateStatistics();
            updateFreeSlotButtonState();
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
    
    return data.map((app, index) => {
        const dataObj = new Date(app.data_agendamento);
        const dataFormatada = formatDate(dataObj);
        
        return {
            ...app,
            id_agendamento: app.id_agendamento || index + 1,
            data_agendamento: dataFormatada,
            data_obj: dataObj,
            nome_cliente: app.nome_cliente || `Cliente ${index + 1}`,
            telefone_cliente: app.telefone_cliente || 'Sem telefone',
            nome_barbeiro: app.nome_barbeiro || 'Não definido',
            id_barbeiro: app.id_barbeiro,
            nome_servico: app.nome_servico || 'Serviço',
            preco: parseFloat(app.preco || 0),
            status_agendamento: app.status_agendamento || 'agendado',
            horario_inicio: app.horario_inicio || '09:00:00',
            horario_fim: app.horario_fim || '09:30:00'
        };
    });
}

// ==========================================
// APLICAR TODOS OS FILTROS
// ==========================================
function applyAllFilters() {
    const now = new Date();
    const today = formatDate(now);
    const tomorrow = formatDate(new Date(now.getTime() + 24 * 60 * 60 * 1000));
    const weekEnd = formatDate(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000));
    
    let filtered = allAppointments.filter(app => {
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
    
    if (selectedBarber !== 'todos') {
        filtered = filtered.filter(app => app.id_barbeiro == selectedBarber);
    }
    
    const searchTerm = document.getElementById('search-input')?.value?.toLowerCase().trim();
    if (searchTerm) {
        filtered = filtered.filter(app => {
            const nomeCliente = (app.nome_cliente || '').toLowerCase();
            const telefone = (app.telefone_cliente || '').toLowerCase().replace(/\D/g, '');
            const nomeBarbeiro = (app.nome_barbeiro || '').toLowerCase();
            const searchTermClean = searchTerm.replace(/\D/g, '');
            
            return nomeCliente.includes(searchTerm) || 
                   (telefone && telefone.includes(searchTermClean)) || 
                   nomeBarbeiro.includes(searchTerm);
        });
    }
    
    filteredAppointments = filtered.sort((a, b) => {
        const dateCompare = a.data_agendamento.localeCompare(b.data_agendamento);
        if (dateCompare !== 0) return dateCompare;
        return (a.horario_inicio || '').localeCompare(b.horario_inicio || '');
    });
    
    renderAppointments();
}

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
    
    updateFreeSlotButtonState();
    applyAllFilters();
}

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function updateFreeSlotButtonState() {
    const btn = document.getElementById('btn-toggle-free-slots');
    if (!btn) return;
    
    if (currentFilter === 'hoje' || currentFilter === 'amanha') {
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
        btn.title = '';
    } else {
        btn.disabled = true;
        btn.style.opacity = '0.5';
        btn.style.cursor = 'not-allowed';
        btn.title = 'Disponível apenas para Hoje e Amanhã';
        
        if (showingFreeSlots) {
            showingFreeSlots = false;
            btn.innerHTML = '<i data-lucide="calendar-plus" class="w-4 h-4"></i> <span class="hidden sm:inline">Ver Todos Horários</span><span class="sm:hidden">Horários</span>';
            btn.classList.remove('bg-emerald-500/10', 'text-emerald-400', 'border-emerald-500/20');
            btn.classList.add('bg-blue-500/10', 'text-blue-400', 'border-blue-500/20');
            lucide.createIcons();
            renderAppointments();
        }
    }
}

// ==========================================
// RENDERIZAÇÃO - OTIMIZADA
// ==========================================
function renderAppointments() {
    console.log('🎨 Renderizando agendamentos...');
    
    const tbody = document.getElementById('appointments-tbody');
    if (!tbody) return;
    
    const fragment = document.createDocumentFragment();
    
    const targetDate = getTargetDateFromFilter();
    const agora = new Date();
    const horaAtual = agora.getHours() * 60 + agora.getMinutes();
    
    if (!showingFreeSlots) {
        if (filteredAppointments.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td colspan="8" class="px-6 py-12 text-center">
                    <div class="flex flex-col items-center gap-3 text-slate-500">
                        <i data-lucide="calendar-x" class="w-12 h-12 opacity-50"></i>
                        <p class="text-sm">Nenhum agendamento encontrado</p>
                    </div>
                </td>
            `;
            fragment.appendChild(tr);
        } else {
            filteredAppointments.forEach(app => {
                const row = createAppointmentRow(app);
                fragment.appendChild(row);
            });
        }
    } else {
        if (allTimeSlots.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td colspan="8" class="px-6 py-12 text-center">
                    <div class="flex flex-col items-center gap-3 text-slate-500">
                        <i data-lucide="clock-alert" class="w-12 h-12 opacity-50"></i>
                        <p class="text-sm">Nenhum horário configurado</p>
                    </div>
                </td>
            `;
            fragment.appendChild(tr);
        } else {
            const sortedSlots = [...allTimeSlots].sort();
            
            if (selectedBarber !== 'todos') {
                renderSlotsByBarber(sortedSlots, fragment, targetDate, horaAtual);
            } else {
                renderSlotsAllBarbers(sortedSlots, fragment, targetDate, horaAtual);
            }
        }
    }
    
    tbody.innerHTML = '';
    tbody.appendChild(fragment);
    
    tbody.addEventListener('click', handleTableClick);
    
    requestAnimationFrame(() => {
        lucide.createIcons();
    });
}

function getTargetDateFromFilter() {
    const now = new Date();
    
    switch(currentFilter) {
        case 'hoje':
            return formatDate(now);
        case 'amanha':
            return formatDate(new Date(now.getTime() + 24 * 60 * 60 * 1000));
        default:
            return formatDate(now);
    }
}

function renderSlotsByBarber(sortedSlots, fragment, targetDate, horaAtual) {
    const agendamentosPorHorario = {};
    const bloqueiosPorHorario = {};
    
    // Mapear agendamentos por horário
    filteredAppointments.forEach(app => {
        if (app.data_agendamento === targetDate) {
            const horario = app.horario_inicio?.substring(0, 5);
            if (horario) {
                agendamentosPorHorario[horario] = app;
            }
        }
    });
    
    // ⭐ CORREÇÃO: Mapear bloqueios por intervalo completo
    blockedSlots.forEach(block => {
        if (block.data_inicio === targetDate && block.id_barbeiro == selectedBarber) {
            // Verificar todos os horários que este bloqueio afeta
            const [bloqInicioHora, bloqInicioMin] = (block.hora_inicio || '00:00').split(':').map(Number);
            const [bloqFimHora, bloqFimMin] = (block.hora_fim || '23:59').split(':').map(Number);
            
            const bloqInicioMinutos = bloqInicioHora * 60 + bloqInicioMin;
            const bloqFimMinutos = bloqFimHora * 60 + bloqFimMin;
            
            // Marcar todos os horários dentro deste intervalo
            sortedSlots.forEach(horario => {
                const [hora, min] = horario.split(':').map(Number);
                const horarioMinutos = hora * 60 + min;
                
                // ✅ Lógica correta: horário está bloqueado se está dentro do intervalo
                if (horarioMinutos >= bloqInicioMinutos && horarioMinutos < bloqFimMinutos) {
                    bloqueiosPorHorario[horario] = block;
                }
            });
        }
    });
    
    sortedSlots.forEach(horario => {
        const [horas, minutos] = horario.split(':').map(Number);
        const minutosHorario = horas * 60 + minutos;
        const isHorarioPassado = targetDate === formatDate(new Date()) && minutosHorario < horaAtual;
        
        const agendamento = agendamentosPorHorario[horario];
        const bloqueio = bloqueiosPorHorario[horario];
        
        const tr = createTimeSlotRow(horario, agendamento, isHorarioPassado, bloqueio);
        fragment.appendChild(tr);
    });
}

function renderSlotsAllBarbers(sortedSlots, fragment, targetDate, horaAtual) {
    sortedSlots.forEach(horario => {
        const [horas, minutos] = horario.split(':').map(Number);
        const minutosHorario = horas * 60 + minutos;
        const isHorarioPassado = targetDate === formatDate(new Date()) && minutosHorario < horaAtual;
        
        // Buscar todos os agendamentos para este horário
        const agendamentosHorario = filteredAppointments.filter(app => {
            if (app.data_agendamento !== targetDate) return false;
            const horarioApp = app.horario_inicio?.substring(0, 5);
            return horarioApp === horario;
        });
        
        // ⭐ CORREÇÃO: Buscar bloqueios que afetam este horário (intervalo completo)
        const bloqueiosHorario = blockedSlots.filter(block => {
            if (block.data_inicio !== targetDate) return false;
            
            // Verificar se este horário está dentro do intervalo de bloqueio
            const [hora, min] = horario.split(':').map(Number);
            const horarioMinutos = hora * 60 + min;
            
            const [bloqInicioHora, bloqInicioMin] = (block.hora_inicio || '00:00').split(':').map(Number);
            const [bloqFimHora, bloqFimMin] = (block.hora_fim || '23:59').split(':').map(Number);
            
            const bloqInicioMinutos = bloqInicioHora * 60 + bloqInicioMin;
            const bloqFimMinutos = bloqFimHora * 60 + bloqFimMin;
            
            // ✅ Lógica correta: horário está bloqueado se está dentro do intervalo
            return horarioMinutos >= bloqInicioMinutos && horarioMinutos < bloqFimMinutos;
        });
        
        // Mostrar agendamentos
        if (agendamentosHorario.length > 0) {
            agendamentosHorario.forEach(agendamento => {
                const tr = createTimeSlotRow(horario, agendamento, isHorarioPassado, null);
                fragment.appendChild(tr);
            });
        }
        
        // Mostrar bloqueios (mesmo que haja agendamentos - para outros barbeiros)
        if (bloqueiosHorario.length > 0) {
            bloqueiosHorario.forEach(bloqueio => {
                // Verificar se já não há um agendamento deste barbeiro neste horário
                const temAgendamento = agendamentosHorario.some(ag => ag.id_barbeiro == bloqueio.id_barbeiro);
                if (!temAgendamento) {
                    const tr = createTimeSlotRow(horario, null, isHorarioPassado, bloqueio);
                    fragment.appendChild(tr);
                }
            });
        }
        
        // Se não tem nem agendamento nem bloqueio, mostrar horário livre
        if (agendamentosHorario.length === 0 && bloqueiosHorario.length === 0) {
            const tr = createTimeSlotRow(horario, null, isHorarioPassado, null);
            fragment.appendChild(tr);
        }
    });
}

function handleTableClick(e) {
    const row = e.target.closest('tr[data-appointment-id]');
    if (row) {
        const id = parseInt(row.getAttribute('data-appointment-id'));
        viewDetails(id);
    }
    
    const unblockBtn = e.target.closest('.btn-unblock-slot');
    if (unblockBtn) {
        e.stopPropagation();
        const blockId = parseInt(unblockBtn.getAttribute('data-block-id'));
        unblockTimeSlot(blockId);
    }
}

function createTimeSlotRow(horario, agendamento, isHorarioPassado, bloqueio) {
    const tr = document.createElement('tr');
    tr.className = 'transition-colors hover:bg-slate-900/40';
    
    if (agendamento) {
        tr.className = 'transition-colors hover:bg-slate-900/40 cursor-pointer';
        tr.setAttribute('data-appointment-id', agendamento.id_agendamento);
        
        const statusInfo = getStatusInfo(agendamento.status_agendamento);
        const statusClass = getStatusClass(agendamento.status_agendamento);
        const dataFormatada = formatDisplayDateShort(agendamento.data_agendamento);
        
        tr.innerHTML = `
            <td class="px-4 md:px-6 py-3">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow-lg">
                        ${agendamento.nome_cliente?.substring(0, 2).toUpperCase() || 'CL'}
                    </div>
                    <div class="min-w-0 flex-1">
                        <p class="text-white font-medium text-sm md:text-base truncate">${agendamento.nome_cliente || 'Cliente'}</p>
                        <p class="text-xs text-slate-500 truncate sm:hidden">${horario}</p>
                    </div>
                </div>
            </td>
            <td class="px-4 md:px-6 py-3 text-white font-mono text-xs md:text-sm hidden sm:table-cell">
                ${horario}
            </td>
            <td class="px-4 md:px-6 py-3 text-slate-300 text-xs hidden md:table-cell">
                ${dataFormatada}
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
    }
    else if (bloqueio) {
        tr.className = 'transition-colors hover:bg-slate-900/40';
        
        tr.innerHTML = `
            <td colspan="8" class="px-4 md:px-6 py-3">
                <div class="flex items-center justify-between bg-red-500/5 border border-red-500/20 rounded-lg p-2">
                    <div class="flex items-center gap-3 flex-1">
                        <div class="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                            <i data-lucide="ban" class="w-5 h-5 text-red-400"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="flex flex-col md:flex-row md:items-center gap-1 md:gap-3">
                                <p class="text-red-400 font-mono font-bold text-sm md:text-base">${horario}</p>
                                <span class="text-xs text-red-400/80">BLOQUEADO</span>
                                <span class="text-xs text-slate-400 hidden md:inline">• ${bloqueio.nome_barbeiro}</span>
                            </div>
                            <p class="text-xs text-slate-500 mt-0.5">${bloqueio.motivo}</p>
                        </div>
                    </div>
                    <button class="btn-unblock-slot px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all text-xs font-bold flex items-center gap-1.5" 
                            data-block-id="${bloqueio.id_bloqueio}">
                        <i data-lucide="unlock" class="w-3 h-3"></i>
                        <span class="hidden sm:inline">Desbloquear</span>
                    </button>
                </div>
            </td>
        `;
    }
    else if (isHorarioPassado) {
        tr.innerHTML = `
            <td colspan="8" class="px-4 md:px-6 py-3">
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
    }
    else {
        tr.innerHTML = `
            <td colspan="8" class="px-4 md:px-6 py-3">
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
    const dataFormatada = formatDisplayDateShort(app.data_agendamento);
    
    tr.innerHTML = `
        <td class="px-3 md:px-6 py-3">
            <div class="flex items-center gap-3">
                <div class="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow-lg">
                    ${iniciais}
                </div>
                <div class="min-w-0 flex-1">
                    <p class="text-white font-medium text-sm md:text-base truncate">${nomeCliente}</p>
                    <p class="text-[10px] md:text-xs text-slate-500 truncate sm:hidden">${horarioFormatado}</p>
                </div>
            </div>
        </td>
        <td class="px-3 md:px-6 py-3 text-white font-mono text-xs md:text-sm hidden sm:table-cell">
            ${horarioFormatado}
        </td>
        <td class="px-3 md:px-6 py-3 text-slate-300 text-xs hidden md:table-cell">
            ${dataFormatada}
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
// FUNÇÕES DE FILTRO E BUSCA
// ==========================================
function debounceSearch(e) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        applyAllFilters();
    }, 300);
}

function toggleFreeSlots() {
    if (currentFilter !== 'hoje' && currentFilter !== 'amanha') {
        showToast('Função disponível apenas para Hoje e Amanhã', 'error');
        return;
    }
    
    console.log('🔄 Toggle horários - Estado anterior:', showingFreeSlots);
    console.log('🔄 Filtro ativo:', currentFilter);
    
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
// MODAL DE BLOQUEIO DE HORÁRIO
// ==========================================
function openBlockSlotModal() {
    const modal = document.createElement('div');
    modal.id = 'modal-block-slot';
    modal.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4';
    
    const hoje = new Date();
    const hojeStr = hoje.toISOString().split('T')[0];
    
    let defaultDate = hojeStr;
    if (currentFilter === 'amanha') {
        const amanha = new Date(hoje.getTime() + 24 * 60 * 60 * 1000);
        defaultDate = amanha.toISOString().split('T')[0];
    }
    
    modal.innerHTML = `
        <div class="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
            <div class="p-6 border-b border-slate-800 flex justify-between items-center">
                <h3 class="text-xl font-bold text-white flex items-center gap-2">
                    <i data-lucide="ban" class="w-5 h-5 text-red-400"></i> Bloquear Horário
                </h3>
                <button onclick="closeBlockSlotModal()" class="text-slate-400 hover:text-white transition-colors">
                    <i data-lucide="x" class="w-6 h-6"></i>
                </button>
            </div>
            <div class="p-6 space-y-4">
                <div class="space-y-1.5">
                    <label class="text-xs font-bold text-slate-500 uppercase">Data</label>
                    <input type="date" 
                           id="block-date" 
                           min="${hojeStr}"
                           value="${defaultDate}"
                           class="input-dark">
                </div>
                
                <div class="space-y-1.5">
                    <label class="text-xs font-bold text-slate-500 uppercase">Horário</label>
                    <select id="block-time" class="input-dark">
                        ${allTimeSlots.map(slot => `<option value="${slot}">${slot}</option>`).join('')}
                    </select>
                </div>
                
                <div class="space-y-1.5">
                    <label class="text-xs font-bold text-slate-500 uppercase">Barbeiro</label>
                    <select id="block-barber" class="input-dark">
                        ${allBarbers.map(barber => `<option value="${barber.id_barbeiro}">${barber.nome}</option>`).join('')}
                    </select>
                </div>
                
                <div class="space-y-1.5">
                    <label class="text-xs font-bold text-slate-500 uppercase">Motivo (Opcional)</label>
                    <input type="text" 
                           id="block-reason" 
                           placeholder="Ex: Almoço, Manutenção..."
                           class="input-dark">
                </div>
            </div>
            <div class="p-6 bg-slate-950/50 border-t border-slate-800 flex gap-3">
                <button onclick="closeBlockSlotModal()" 
                        class="flex-1 px-4 py-3 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all font-medium">
                    Cancelar
                </button>
                <button onclick="blockTimeSlot()" 
                        class="flex-1 px-4 py-3 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-all font-bold">
                    Bloquear
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    lucide.createIcons();
}

function closeBlockSlotModal() {
    const modal = document.getElementById('modal-block-slot');
    if (modal) {
        modal.remove();
    }
}

// ==========================================
// ✅ CORRIGIDO: INTERVALO DINÂMICO
// ==========================================
async function blockTimeSlot() {
    const date = document.getElementById('block-date').value;
    const time = document.getElementById('block-time').value;
    const barberId = document.getElementById('block-barber').value;
    const reason = document.getElementById('block-reason').value || 'Horário bloqueado manualmente';
    
    if (!date || !time || !barberId) {
        showToast('Preencha todos os campos obrigatórios', 'error');
        return;
    }
    
    const selectedDate = new Date(date + 'T00:00:00');
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    if (selectedDate < hoje) {
        showToast('Não é possível bloquear datas passadas', 'error');
        return;
    }
    
    // ⭐ VALIDAÇÃO: Verificar se horário já está bloqueado (intervalo completo)
    const jaExiste = blockedSlots.some(block => {
        if (block.data_inicio !== date || block.id_barbeiro != barberId) return false;
        
        // Verificar se há sobreposição de horários
        const [novoHora, novoMin] = time.split(':').map(Number);
        const novoMinutos = novoHora * 60 + novoMin;
        
        const [bloqInicioHora, bloqInicioMin] = (block.hora_inicio || '00:00').split(':').map(Number);
        const [bloqFimHora, bloqFimMin] = (block.hora_fim || '23:59').split(':').map(Number);
        
        const bloqInicioMinutos = bloqInicioHora * 60 + bloqInicioMin;
        const bloqFimMinutos = bloqFimHora * 60 + bloqFimMin;
        
        // ✅ Retorna true se há sobreposição
        return novoMinutos >= bloqInicioMinutos && novoMinutos < bloqFimMinutos;
    });
    
    if (jaExiste) {
        showToast('Este horário já está bloqueado para este barbeiro', 'error');
        return;
    }
    
    const temAgendamento = allAppointments.some(app => 
        app.data_agendamento === date &&
        app.horario_inicio?.substring(0, 5) === time &&
        app.id_barbeiro == barberId &&
        app.status_agendamento === 'agendado'
    );
    
    if (temAgendamento) {
        showToast('Já existe um agendamento neste horário. Cancele-o primeiro.', 'error');
        return;
    }
    
    try {
        // ⭐ CORREÇÃO: Usar intervalo configurado ao invés de 30 fixo
        const intervalo = parseInt(localStorage.getItem('intervaloCortes')) || 20;
        console.log(`⏱️ Intervalo configurado: ${intervalo} minutos`);
        
        const [hora, minuto] = time.split(':').map(Number);
        
        let minutoFim = minuto + intervalo;
        let horaFim = hora;
        
        if (minutoFim >= 60) {
            horaFim = hora + Math.floor(minutoFim / 60);
            minutoFim = minutoFim % 60;
        }
        
        const horaFimFormatada = `${String(horaFim).padStart(2, '0')}:${String(minutoFim).padStart(2, '0')}`;
        
        console.log(`🕐 Bloqueando: ${time} até ${horaFimFormatada} (${intervalo} minutos)`);
        
        const response = await fetch(`${API_URL}/bloqueios`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({
                id_barbearia: userSession.id_barbearia,
                bloqueios: [{
                    id_barbeiro: barberId,
                    data_inicio: date,
                    hora_inicio: time,
                    data_fim: date,
                    hora_fim: horaFimFormatada,
                    motivo: reason
                }],
                deleted_ids: []
            })
        });
        
        if (!response.ok) {
            throw new Error('Erro ao bloquear horário');
        }
        
        showToast(`Horário bloqueado com sucesso! (${time} - ${horaFimFormatada})`, 'success');
        closeBlockSlotModal();
        await loadAppointments();
        
    } catch (error) {
        console.error('❌ Erro ao bloquear:', error);
        showToast(`Erro: ${error.message}`, 'error');
    }
}

async function unblockTimeSlot(blockId) {
    if (!blockId) {
        showToast('ID de bloqueio inválido', 'error');
        return;
    }
    
    const confirmed = confirm('Deseja realmente desbloquear este horário?');
    if (!confirmed) return;
    
    try {
        const response = await fetch(`${API_URL}/bloqueios`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({
                id_barbearia: userSession.id_barbearia,
                bloqueios: [],
                deleted_ids: [blockId]
            })
        });
        
        if (!response.ok) {
            throw new Error('Erro ao desbloquear horário');
        }
        
        showToast('Horário desbloqueado com sucesso!', 'success');
        await loadAppointments();
        
    } catch (error) {
        console.error('❌ Erro ao desbloquear:', error);
        showToast(`Erro: ${error.message}`, 'error');
    }
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
            </div>
            <div id="modal-botoes-container" class="p-4 bg-slate-950/50 border-t border-slate-800">
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

function formatDisplayDateShort(dateString) {
    if (!dateString) return '--/--';
    const [year, month, day] = dateString.split('-');
    const dateObj = new Date(year, month - 1, day);
    const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return `${diasSemana[dateObj.getDay()]}, ${day}/${month}`;
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
                <td colspan="8" class="px-6 py-8 text-center">
                    <i data-lucide="loader-2" class="w-8 h-8 animate-spin mx-auto text-emerald-500"></i>
                    <p class="text-slate-500 mt-3 text-sm">Carregando...</p>
                </td>
            </tr>
        `;
        lucide.createIcons();
    }
}

function hideLoading() {
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

function startAutoRefresh() {
    setInterval(() => {
        if (!isLoading) {
            loadAppointments();
        }
    }, 120000);
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
    const modal = document.getElementById('modal-perfil');
    const isHidden = modal.classList.contains('hidden');
    
    if (isHidden) {
        document.getElementById('edit-profile-name').value = userSession.nome || '';
        document.getElementById('edit-profile-usuario').value = userSession.usuario || '';
        document.getElementById('edit-profile-pass').value = '';
        
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        lucide.createIcons();
    } else {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

async function updateUserProfile() {
    const btn = document.getElementById('btn-save-profile');
    const originalText = btn.innerText;
    
    const novoNome = document.getElementById('edit-profile-name').value.trim();
    const novoUsuario = document.getElementById('edit-profile-usuario').value.trim();
    const novaSenha = document.getElementById('edit-profile-pass').value.trim();
    
    if (!validateProfileData(novoNome, novoUsuario)) return;
    
    try {
        btn.innerText = "Salvando...";
        btn.disabled = true;
        
        const result = await saveProfileToServer(novoNome, novoUsuario, novaSenha);
        
        updateLocalSession(novoNome, novoUsuario);
        updateProfileUI(novoNome, novoUsuario);
        
        showToast("Perfil atualizado!", "success");
        togglePerfilModal();
    } catch (error) {
        console.error(error);
        showToast(error.message, "error");
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

function validateProfileData(nome, usuario) {
    if (!nome || !usuario) {
        showToast("Nome e Usuário são obrigatórios.", "error");
        return false;
    }
    
    if (usuario.length < 3) {
        showToast("Usuário deve ter pelo menos 3 caracteres.", "error");
        document.getElementById('edit-profile-usuario').focus();
        return false;
    }
    
    return true;
}

async function saveProfileToServer(nome, usuario, senha) {
    const payload = {
        id_usuario: userSession.id_usuario || userSession.id,
        nome: nome,
        usuario: usuario,
        senha_hash: senha || null
    };
    
    const response = await fetch(`${API_URL}/usuarios/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Erro ao atualizar');
    return result;
}

function updateLocalSession(nome, usuario) {
    userSession.nome = nome;
    userSession.usuario = usuario;
    localStorage.setItem('user_data', JSON.stringify(userSession));
}

function updateProfileUI(nome, usuario) {
    document.getElementById('user-name-display').innerText = nome;
    document.getElementById('user-email-display').innerText = `@${usuario}`;
}

function logout() {
    localStorage.removeItem('user_data');
    window.location.href = 'login.html';
}
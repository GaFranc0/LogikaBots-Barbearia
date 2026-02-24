// ==========================================
// ESTADO GLOBAL & CONFIGURAÇÃO
// ==========================================
const API_URL = 'http://localhost:3000';
let userSession = {};
let servicosList = [];
let barbeirosList = [];
let bloqueiosList = [];
let duvidasList = [];
const deletedServices = new Set();
const deletedBarbers = new Set();
const deletedBlocks = new Set();
const deletedDuvidas = new Set();

// ⚡ NOVOS: Configurações da barbearia para validação
let barbeariaConfig = {
    horario_inicio: '09:00',
    horario_fim: '19:00',
    dia_inicio: 2, // Segunda
    dia_fim: 6     // Sexta
};

// ==========================================
// INICIALIZAÇÃO
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    lucide.createIcons();
    checkAuth();
    initTheme();
    initUI();
    await loadAllData();
    setupBusinessHoursListeners(); // ⚡ NOVO
});

function checkAuth() {
    const rawUser = localStorage.getItem('user_data');
    if (!rawUser) {
        window.location.href = 'login.html';
        return;
    }
    try {
        userSession = JSON.parse(rawUser);
    } catch (e) {
        console.error('Erro ao parsear user_data:', e);
        localStorage.removeItem('user_data');
        window.location.href = 'login.html';
    }
}

function initUI() {
    const userNameDisplay = document.getElementById('user-name-display');
    const userEmailDisplay = document.getElementById('user-email-display');
    
    if (userNameDisplay) {
        userNameDisplay.innerText = userSession.nome || 'Admin';
    }
    
    if (userEmailDisplay) {
        // ⚡ COMPATIBILIDADE: Mostra email OU @usuario
        const displayText = userSession.email || (userSession.usuario ? `@${userSession.usuario}` : 'admin@logika.com');
        userEmailDisplay.innerText = displayText;
    }
    
    const savedInterval = localStorage.getItem('intervaloCortes');
    if (savedInterval) {
        document.getElementById('intervalo-cortes').value = savedInterval;
    }
}

function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        toggleTheme();
    }
}

// ==========================================
// ⚡ NOVO: LISTENERS PARA CONFIGURAÇÕES GERAIS
// ==========================================
function setupBusinessHoursListeners() {
    const horarioAbertura = document.getElementById('horario-abertura');
    const horarioFechamento = document.getElementById('horario-fechamento');
    const diaInicio = document.getElementById('dia-inicio');
    const diaFim = document.getElementById('dia-fim');
    
    if (horarioAbertura) {
        horarioAbertura.addEventListener('change', () => {
            barbeariaConfig.horario_inicio = horarioAbertura.value;
            validateAllBarbers();
        });
    }
    
    if (horarioFechamento) {
        horarioFechamento.addEventListener('change', () => {
            barbeariaConfig.horario_fim = horarioFechamento.value;
            validateAllBarbers();
        });
    }
    
    if (diaInicio) {
        diaInicio.addEventListener('change', () => {
            barbeariaConfig.dia_inicio = parseInt(diaInicio.value);
            validateAllBarbers();
        });
    }
    
    if (diaFim) {
        diaFim.addEventListener('change', () => {
            barbeariaConfig.dia_fim = parseInt(diaFim.value);
            validateAllBarbers();
        });
    }
}

// ==========================================
// ⚡ NOVO: FUNÇÕES DE VALIDAÇÃO
// ==========================================
function isDayAllowed(dayNumber) {
    // dayNumber: 1=domingo, 2=segunda, ..., 7=sábado
    // Converte de dia da semana para número se necessário
    const dayMap = {
        'dom': 1, 'seg': 2, 'ter': 3, 'qua': 4, 
        'qui': 5, 'sex': 6, 'sab': 7
    };
    
    if (typeof dayNumber === 'string') {
        dayNumber = dayMap[dayNumber];
    }
    
    const inicio = barbeariaConfig.dia_inicio;
    const fim = barbeariaConfig.dia_fim;
    
    // Se a faixa cruza a semana (ex: sábado a segunda)
    if (fim < inicio) {
        return dayNumber >= inicio || dayNumber <= fim;
    }
    
    // Faixa normal (ex: segunda a sexta)
    return dayNumber >= inicio && dayNumber <= fim;
}

function isTimeAllowed(time) {
    if (!time) return false;
    const inicio = barbeariaConfig.horario_inicio;
    const fim = barbeariaConfig.horario_fim;
    return time >= inicio && time <= fim;
}

function validateTimeInput(input, type = 'both') {
    const value = input.value;
    // Só valida se o horário estiver completo (formato HH:MM)
    if (!value || value.length < 5) return;
    
    const inicio = barbeariaConfig.horario_inicio;
    const fim = barbeariaConfig.horario_fim;
    
    // Validar contra horário da barbearia
    if (type === 'start' || type === 'both') {
        if (value < inicio) {
            input.value = inicio;
            showToast(`Horário mínimo de abertura: ${inicio}`, 'error');
            return;
        }
    }
    
    if (type === 'end' || type === 'both') {
        if (value > fim) {
            input.value = fim;
            showToast(`Horário máximo de fechamento: ${fim}`, 'error');
            return;
        }
    }
    
    // Validar horário de fim vs início (para jornada de trabalho)
    if (input.classList.contains('end-time')) {
        const row = input.closest('div').parentElement;
        const startInput = row.querySelector('.start-time');
        if (startInput && startInput.value && value <= startInput.value) {
            showToast(`Horário de saída deve ser maior que o de entrada!`, 'error');
            // Define um horário padrão 1 hora depois do início
            const [h, m] = startInput.value.split(':').map(Number);
            const newHour = Math.min(h + 1, 23);
            input.value = `${String(newHour).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        }
    }
    
    // Validar horário de almoço fim vs início
    if (input.classList.contains('lunch-end')) {
        const card = input.closest('.barber-card');
        const lunchStart = card.querySelector('.lunch-start');
        if (lunchStart && lunchStart.value && value <= lunchStart.value) {
            showToast(`Horário de fim do almoço deve ser maior que o de início!`, 'error');
            // Define um horário padrão 1 hora depois do início
            const [h, m] = lunchStart.value.split(':').map(Number);
            const newHour = Math.min(h + 1, 23);
            input.value = `${String(newHour).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        }
    }
}

function validateAllBarbers() {
    document.querySelectorAll('.barber-card').forEach(card => {
        validateBarberCard(card);
    });
}

function validateBarberCard(card) {
    const dayChecks = card.querySelectorAll('.day-check');
    
    dayChecks.forEach(checkbox => {
        const dayId = checkbox.dataset.day;
        const allowed = isDayAllowed(dayId);
        const row = checkbox.closest('div').parentElement;
        const timeDiv = row.querySelector('[id^="times_"]');
        const startInput = timeDiv.querySelector('.start-time');
        const endInput = timeDiv.querySelector('.end-time');
        
        if (!allowed) {
            // Dia não permitido - desmarcar e desabilitar
            checkbox.checked = false;
            checkbox.disabled = true;
            row.style.opacity = '0.3';
            row.style.pointerEvents = 'none';
            
            // Adicionar indicador visual
            const label = row.querySelector('label');
            if (label && !label.querySelector('.not-allowed-badge')) {
                const badge = document.createElement('span');
                badge.className = 'not-allowed-badge text-[9px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded ml-2';
                badge.textContent = 'Fora do horário';
                label.appendChild(badge);
            }
        } else {
            // Dia permitido - habilitar
            checkbox.disabled = false;
            row.style.opacity = '';
            row.style.pointerEvents = '';
            
            // Remover badge se existir
            const label = row.querySelector('label');
            if (label) {
                const badge = label.querySelector('.not-allowed-badge');
                if (badge) badge.remove();
            }
            
            // Validar horários se o checkbox estiver marcado
            if (checkbox.checked && startInput.value && endInput.value) {
                // Validar contra horário da barbearia
                if (startInput.value < barbeariaConfig.horario_inicio) {
                    startInput.value = barbeariaConfig.horario_inicio;
                }
                if (endInput.value > barbeariaConfig.horario_fim) {
                    endInput.value = barbeariaConfig.horario_fim;
                }
                
                // Validar horário fim > início
                if (endInput.value <= startInput.value) {
                    const [h, m] = startInput.value.split(':').map(Number);
                    const newHour = Math.min(h + 1, 23);
                    endInput.value = `${String(newHour).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                }
            }
        }
    });
    
    // Validar horário de almoço
    const lunchStart = card.querySelector('.lunch-start');
    const lunchEnd = card.querySelector('.lunch-end');
    if (lunchStart && lunchStart.value) {
        if (lunchStart.value < barbeariaConfig.horario_inicio) {
            lunchStart.value = barbeariaConfig.horario_inicio;
        }
        if (lunchStart.value > barbeariaConfig.horario_fim) {
            lunchStart.value = barbeariaConfig.horario_fim;
        }
    }
    if (lunchEnd && lunchEnd.value) {
        if (lunchEnd.value > barbeariaConfig.horario_fim) {
            lunchEnd.value = barbeariaConfig.horario_fim;
        }
        if (lunchEnd.value < barbeariaConfig.horario_inicio) {
            lunchEnd.value = barbeariaConfig.horario_inicio;
        }
        // Validar horário fim do almoço > início do almoço
        if (lunchStart && lunchStart.value && lunchEnd.value <= lunchStart.value) {
            const [h, m] = lunchStart.value.split(':').map(Number);
            const newHour = Math.min(h + 1, 23);
            lunchEnd.value = `${String(newHour).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        }
    }
}

// ==========================================
// CARREGAMENTO DE DADOS
// ==========================================
async function loadAllData() {
    const idBarb = userSession.id_barbearia;
    try {
        const [servicos, barbeiros, bloqueios, barbearia, duvidas] = await Promise.all([
            fetchData(`${API_URL}/servicos/${idBarb}`),
            fetchData(`${API_URL}/barbeiros/${idBarb}`),
            fetchData(`${API_URL}/bloqueios/${idBarb}`),
            fetchData(`${API_URL}/barbearia/${idBarb}`),
            fetchData(`${API_URL}/duvidas/${idBarb}`)
        ]);
        
        // ⚡ NOVO: Atualizar configurações da barbearia ANTES de renderizar barbeiros
        if (barbearia.horario_funcionamento_inicio) {
            barbeariaConfig.horario_inicio = barbearia.horario_funcionamento_inicio.substring(0, 5);
        }
        if (barbearia.horario_funcionamento_fim) {
            barbeariaConfig.horario_fim = barbearia.horario_funcionamento_fim.substring(0, 5);
        }
        if (barbearia.dia_inicio) {
            barbeariaConfig.dia_inicio = parseInt(barbearia.dia_inicio);
        }
        if (barbearia.dia_fim) {
            barbeariaConfig.dia_fim = parseInt(barbearia.dia_fim);
        }
        
        renderServices(servicos);
        renderBarbers(barbeiros);
        renderBlocks(bloqueios);
        renderBusinessHours(barbearia);
        renderDuvidas(duvidas);
        
        updateBarberSelects();
    } catch (error) {
        console.error("Erro ao carregar dados:", error);
        showToast("Erro ao carregar dados do servidor.", "error");
    }
}

async function fetchData(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
}

function renderServices(servicos) {
    const container = document.getElementById('services-list');
    container.innerHTML = '';
    if (Array.isArray(servicos)) {
        servicos.forEach(s => addServiceToDOM(s));
    }
}

function renderBarbers(barbeiros) {
    const container = document.getElementById('barbers-list');
    container.innerHTML = '';
    barbeirosList = Array.isArray(barbeiros) ? barbeiros : [];
    barbeirosList.forEach(b => addBarberToDOM(b));
}

function renderBlocks(bloqueios) {
    const container = document.getElementById('blocks-list');
    container.innerHTML = '';
    const emptyMsg = document.getElementById('no-blocks-msg');
    if (emptyMsg && bloqueios.length > 0) emptyMsg.style.display = 'none';
    
    if (Array.isArray(bloqueios)) {
        bloqueios.forEach(b => addBlockToDOM(b));
    }
}

function renderBusinessHours(barbearia) {
    if (barbearia.horario_funcionamento_inicio) {
        document.getElementById('horario-abertura').value = barbearia.horario_funcionamento_inicio.substring(0,5);
    }
    if (barbearia.horario_funcionamento_fim) {
        document.getElementById('horario-fechamento').value = barbearia.horario_funcionamento_fim.substring(0,5);
    }
    
    // Renderizar dias de funcionamento
    if (barbearia.dia_inicio) {
        document.getElementById('dia-inicio').value = barbearia.dia_inicio;
    }
    if (barbearia.dia_fim) {
        document.getElementById('dia-fim').value = barbearia.dia_fim;
    }
    
    // Renderizar localização
    if (barbearia.localizacao) {
        document.getElementById('localizacao-text').value = barbearia.localizacao;
    }
}

function renderDuvidas(duvidas) {
    const container = document.getElementById('duvidas-list');
    container.innerHTML = '';
    const emptyMsg = document.getElementById('no-duvidas-msg');
    
    if (emptyMsg) {
        if (duvidas.length > 0) {
            emptyMsg.style.display = 'none';
        } else {
            emptyMsg.style.display = 'flex';
        }
    }
    
    if (Array.isArray(duvidas)) {
        duvidasList = duvidas;
        duvidas.forEach(d => addDuvidaToDOM(d));
    }
}

// ==========================================
// MODO CLARO
// ==========================================
function toggleTheme() {
    const body = document.body;
    const html = document.documentElement;
    const themeText = document.getElementById('theme-text');
    const themeDot = document.getElementById('theme-dot');
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
    if (document.getElementById('theme-text')) document.getElementById('theme-text').innerText = text;
    if (document.getElementById('theme-dot')) document.getElementById('theme-dot').style.transform = transform;
    
    if (iconDark) iconDark.classList.toggle('hidden', isLight);
    if (iconLight) iconLight.classList.toggle('hidden', !isLight);
}

// ==========================================
// NAVEGAÇÃO
// ==========================================
function updateActivePill(id) {
    const pills = document.querySelectorAll('.nav-pill');
    pills.forEach(pill => {
        pill.classList.remove('active');
        if (pill.getAttribute('href') === `#${id}`) {
            pill.classList.add('active');
        }
    });
}

const observerOptions = {
    root: null,
    rootMargin: '-20% 0px -70% 0px',
    threshold: 0
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            updateActivePill(entry.target.id);
        }
    });
}, observerOptions);

document.querySelectorAll('section[id], div[id^="section-"]').forEach((section) => {
    observer.observe(section);
});

function setActivePill(element) {
    const id = element.getAttribute('href').replace('#', '');
    updateActivePill(id);
}

// ==========================================
// SERVIÇOS
// ==========================================
function filterServices() {
    const searchTerm = document.getElementById('search-service').value.toLowerCase();
    const cards = document.querySelectorAll('.service-card');
    
    cards.forEach(card => {
        const nameInput = card.querySelector('.service-name');
        const serviceName = nameInput ? nameInput.value.toLowerCase() : "";
        card.style.display = serviceName.includes(searchTerm) ? "" : "none";
    });
}

function addService() {
    addServiceToDOM();
}

function addServiceToDOM(data = null) {
    const container = document.getElementById('services-list');
    const id = data ? data.id_servico : null;
    const nome = data ? data.nome_servico : '';
    const preco = data ? data.preco : '';
    const minutos = data ? timeToMinutes(data.tempo) : 30;
    
    const div = document.createElement('div');
    div.className = "flex flex-col md:flex-row gap-4 items-start md:items-center bg-slate-900/60 p-4 rounded-xl border border-slate-800 hover:border-emerald-500/40 transition-all group-item relative overflow-hidden animate-slide-in-right service-card";
    if (id) div.dataset.id = id;
    
    div.innerHTML = getServiceHTML(id, nome, preco, minutos);
    
    setupServiceEvents(div, id);
    container.prepend(div);
    lucide.createIcons();
}

function getServiceHTML(id, nome, preco, minutos) {
    return `
        <div class="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500/50"></div>
        <div class="flex flex-col gap-4 w-full pl-3">
            <div class="w-full space-y-1.5">
                <label class="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Nome do Serviço</label>
                <div class="relative">
                    <i data-lucide="tag" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600"></i>
                    <input type="text" value="${nome}" placeholder="Ex: Corte Degrade" class="input-dark py-2.5 pl-10 service-name w-full text-sm">
                </div>
            </div>
            <div class="flex gap-3 w-full">
                <div class="flex-1 space-y-1.5 min-w-0">
                    <label class="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Valor (R$)</label>
                    <div class="relative">
                        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-500">R$</span>
                        <input type="number" 
                               value="${preco}" 
                               oninput="if(this.value.length > 6) this.value = this.value.slice(0,6);" 
                               placeholder="0.00" 
                               step="0.50" 
                               class="input-dark py-2.5 pl-8 pr-2 font-mono font-bold service-price w-full text-sm text-right">
                    </div>
                </div>
                <div class="flex-1 space-y-1.5 min-w-0">
                    <label class="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Minutos</label>
                    <div class="relative">
                        <i data-lucide="clock" class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500"></i>
                        <input type="number" 
                               value="${minutos}" 
                               oninput="if(this.value.length > 3) this.value = this.value.slice(0,3);" 
                               placeholder="30" 
                               class="input-dark py-2.5 pl-8 pr-2 font-mono service-duration w-full text-sm text-right">
                    </div>
                </div>
                <div class="flex items-end pb-0.5">
                    <button type="button" class="btn-remove btn-trash-service p-2 text-slate-500 rounded-lg transition-all">
                        <i data-lucide="trash-2" class="w-5 h-5"></i>
                    </button>
                </div>
            </div>
        </div>`;
}

function setupServiceEvents(div, id) {
    div.querySelector('.btn-remove').addEventListener('click', () => {
        if (id) deletedServices.add(id);
        div.remove();
    });
}

// ==========================================
// BARBEIROS
// ==========================================
function filterBarbers() {
    const searchTerm = document.getElementById('search-barber').value.toLowerCase();
    const cards = document.querySelectorAll('.barber-card');
    
    cards.forEach(card => {
        const nameInput = card.querySelector('.barber-name');
        const barberName = nameInput ? nameInput.value.toLowerCase() : "";
        card.style.display = barberName.includes(searchTerm) ? "block" : "none";
    });
}

function addBarber() {
    addBarberToDOM();
}

function addBarberToDOM(data = null) {
    const container = document.getElementById('barbers-list');
    const id = data ? data.id_barbeiro : null;
    const nome = data ? data.nome : '';
    const almocoIni = (data && data.almoco_inicio) ? data.almoco_inicio.substring(0,5) : '12:00';
    const almocoFim = (data && data.almoco_fim) ? data.almoco_fim.substring(0,5) : '13:00';
    
    const div = document.createElement('div');
    div.className = "barber-card bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden animate-fade-in-up shadow-xl mb-6";
    if (id) div.dataset.id = id;
    
    div.innerHTML = getBarberHTML(id, nome, almocoIni, almocoFim, data);
    
    setupBarberEvents(div, id);
    container.prepend(div);
    lucide.createIcons();
    updateBarberSelects();
    
    // ⚡ NOVO: Validar o card após criação
    setTimeout(() => validateBarberCard(div), 100);
}

function getBarberHTML(id, nome, almocoIni, almocoFim, data) {
    const dias = [
        {id:'seg', l:'Segunda'}, {id:'ter', l:'Terça'}, {id:'qua', l:'Quarta'},
        {id:'qui', l:'Quinta'}, {id:'sex', l:'Sexta'}, {id:'sab', l:'Sábado'}, {id:'dom', l:'Domingo'}
    ];
    
    let diasHtml = dias.map(d => getDayHTML(id, d, data)).join('');
    
    return `
        <div class="absolute left-0 top-0 bottom-0 w-1 bg-purple-500"></div>
        <div class="p-4 sm:p-5 bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div class="flex gap-3 items-center w-full sm:flex-1">
                <div class="w-10 h-10 rounded-full bg-purple-500/20 flex-shrink-0 flex items-center justify-center text-purple-400">
                    <i data-lucide="user" class="w-5 h-5"></i>
                </div>
                <input type="text" value="${nome}" placeholder="Nome do Profissional" 
                       class="barber-name input-dark bg-transparent border-none focus:ring-0 text-base sm:text-lg font-medium w-full p-0">
            </div>
            <button type="button" class="btn-remove-barber btn-remover-centralizado p-2 rounded-lg transition-all">
                <i data-lucide="trash-2" class="w-5 h-5"></i>
            </button>
        </div>
        <div class="p-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div class="lg:col-span-2 bg-slate-950/50 rounded-xl border border-slate-800 overflow-hidden">
                <div class="p-3 border-b border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Jornada de Trabalho</div>
                <div class="divide-y divide-slate-800/30">
                    ${diasHtml}
                </div>
            </div>
            <div class="space-y-4">
                <div class="bg-slate-950/50 rounded-xl border border-slate-800 p-4">
                    <label class="text-xs font-bold text-purple-500 uppercase mb-3 flex items-center gap-2">
                        <i data-lucide="coffee" class="w-4 h-4"></i> Horário de Almoço
                    </label>
                    <div class="flex items-center gap-2 mt-4">
                        <input type="time" value="${almocoIni}" class="input-dark text-center py-2 px-1 text-sm flex-1 lunch-start">
                        <span class="text-slate-600">-</span>
                        <input type="time" value="${almocoFim}" class="input-dark text-center py-2 px-1 text-sm flex-1 lunch-end">
                    </div>
                </div>
            </div>
        </div>`;
}

function getDayHTML(id, d, data) {
    let ativo = true;
    let ini = barbeariaConfig.horario_inicio || '09:00';
    let fim = barbeariaConfig.horario_fim || '19:00';
    
    if (data && data.agenda) {
        const ag = data.agenda.find(a => a.dia_semana === d.id);
        if (ag) {
            ini = ag.hora_inicio.substring(0,5);
            fim = ag.hora_fim.substring(0,5);
        } else {
            ativo = false;
        }
    }
    
    // 🔥 CORREÇÃO: ID único mesmo para barbeiros novos
    const uniqueId = id || `new_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const checkboxId = `chk_${uniqueId}_${d.id}`;
    const timesId = `times_${uniqueId}_${d.id}`;
    
    return `
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border-b border-slate-800/50 last:border-0 hover:bg-slate-800/10 gap-3">
            <div class="flex items-center gap-3 w-full sm:w-32">
                <input type="checkbox" 
                       id="${checkboxId}" 
                       class="checkbox-custom day-check" 
                       data-day="${d.id}" 
                       ${ativo ? 'checked' : ''}>
                <label for="${checkboxId}" 
                       class="text-sm font-medium text-slate-300 cursor-pointer flex-1">
                    ${d.l}
                </label>
            </div>
            <div class="flex items-center gap-2 w-full sm:w-auto transition-opacity ${ativo ? '' : 'opacity-25 pointer-events-none'}" 
                 id="${timesId}">
                <div class="relative w-24">
                    <input type="time" 
                           value="${ini}" 
                           class="input-dark text-center py-1.5 px-1 text-sm w-full start-time">
                </div>
                <span class="text-slate-600 self-center">-</span>
                <div class="relative w-24">
                    <input type="time" 
                           value="${fim}" 
                           class="input-dark text-center py-1.5 px-1 text-sm w-full end-time">
                </div>
            </div>
        </div>`;
}

function setupBarberEvents(div, id) {
    // ⚡ NOVO: Eventos de checkbox com validação
    div.querySelectorAll('.day-check').forEach(chk => {
        chk.addEventListener('change', (e) => {
            const timeDiv = e.target.closest('div').nextElementSibling;
            timeDiv.classList.toggle('opacity-25', !e.target.checked);
            timeDiv.classList.toggle('pointer-events-none', !e.target.checked);
        });
    });
    
    // ⚡ NOVO: Validar horários ao SAIR do campo (blur), não durante digitação
    div.querySelectorAll('.start-time').forEach(input => {
        input.addEventListener('blur', () => validateTimeInput(input, 'start'));
    });
    
    div.querySelectorAll('.end-time').forEach(input => {
        input.addEventListener('blur', () => validateTimeInput(input, 'end'));
    });
    
    // ⚡ NOVO: Validar horário de almoço ao SAIR do campo
    const lunchStart = div.querySelector('.lunch-start');
    const lunchEnd = div.querySelector('.lunch-end');
    if (lunchStart) {
        lunchStart.addEventListener('blur', () => validateTimeInput(lunchStart, 'start'));
    }
    if (lunchEnd) {
        lunchEnd.addEventListener('blur', () => validateTimeInput(lunchEnd, 'end'));
    }
    
    div.querySelector('.btn-remove-barber').addEventListener('click', () => {
        if (id) deletedBarbers.add(id);
        div.remove();
        updateBarberSelects();
    });
}

// ==========================================
// BLOQUEIOS
// ==========================================
function updateBarberSelects() {
    const currentBarbers = getCurrentBarbers();
    
    document.querySelectorAll('.barber-select-block').forEach(select => {
        const currentVal = select.value;
        select.innerHTML = `<option value="todos">Todos os Profissionais</option>` + 
                          currentBarbers.map(b => `<option value="${b.id}">${b.nome}</option>`).join('');
        if (currentVal) select.value = currentVal;
    });
}

function getCurrentBarbers() {
    const currentBarbers = [];
    document.querySelectorAll('.barber-card').forEach(card => {
        const id = card.dataset.id;
        const nome = card.querySelector('.barber-name').value || 'Sem Nome';
        if (id) currentBarbers.push({id, nome});
    });
    return currentBarbers;
}

function addBlock() {
    addBlockToDOM();
}

function addBlockToDOM(data = null) {
    const container = document.getElementById('blocks-list');
    const emptyMsg = document.getElementById('no-blocks-msg');
    if (emptyMsg) emptyMsg.style.display = 'none';
    
    const id = data ? data.id_bloqueio : null;
    const motivo = data ? data.motivo : '';
    const { dIni, hIni, dFim, hFim, barberId } = extractBlockData(data);
    
    const div = document.createElement('div');
    div.className = "bg-slate-950/80 border border-red-900/30 rounded-xl p-5 animate-fade-in-up relative overflow-hidden shadow-lg group block-card mb-4";
    if (id) div.dataset.id = id;
    
    div.innerHTML = getBlockHTML(id, dIni, hIni, dFim, hFim, barberId, motivo);
    
    setupBlockEvents(div, id);
    container.prepend(div);
    lucide.createIcons();
}

function extractBlockData(data) {
    let dIni = '', hIni = '', dFim = '', hFim = '';
    let barberId = 'todos';
    
    if (data && data.data_inicio && data.data_fim) {
        // ✅ Processar data_inicio SEM conversão de timezone
        if (typeof data.data_inicio === 'string') {
            if (data.data_inicio.includes(' ')) {
                // Formato MySQL: "2026-02-16 08:20:00"
                const parts = data.data_inicio.split(' ');
                dIni = parts[0]; // "2026-02-16"
                hIni = parts[1] ? parts[1].substring(0, 5) : '00:00'; // "08:20"
            } else if (data.data_inicio.includes('T')) {
                // Formato ISO: "2026-02-16T08:20:00"
                const parts = data.data_inicio.split('T');
                dIni = parts[0];
                hIni = parts[1] ? parts[1].substring(0, 5) : '00:00';
            } else {
                dIni = data.data_inicio;
                hIni = '00:00';
            }
        }
        
        // ✅ Processar data_fim SEM conversão de timezone
        if (typeof data.data_fim === 'string') {
            if (data.data_fim.includes(' ')) {
                const parts = data.data_fim.split(' ');
                dFim = parts[0];
                hFim = parts[1] ? parts[1].substring(0, 5) : '00:00';
            } else if (data.data_fim.includes('T')) {
                const parts = data.data_fim.split('T');
                dFim = parts[0];
                hFim = parts[1] ? parts[1].substring(0, 5) : '00:00';
            } else {
                dFim = data.data_fim;
                hFim = '00:00';
            }
        }
        
        barberId = data.id_barbeiro || 'todos';
    }
    
    console.log('📅 Dados do bloqueio extraídos:', { dIni, hIni, dFim, hFim, barberId });
    return { dIni, hIni, dFim, hFim, barberId };
}

// ⭐ NOVA FUNÇÃO: Formatar data para português
function formatarDataPtBr(dataString) {
    if (!dataString) return 'Data inválida';
    
    try {
        // ✅ Extrair partes da data sem usar Date()
        const parts = dataString.split('-');
        if (parts.length !== 3) return dataString;
        
        const [ano, mes, dia] = parts;
        
        // Nomes dos meses
        const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 
                       'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        
        const mesNome = meses[parseInt(mes) - 1] || mes;
        
        return `${dia}/${mesNome}/${ano}`;
    } catch (error) {
        console.error('Erro ao formatar data:', error);
        return dataString;
    }
}

function getBlockHTML(id, dIni, hIni, dFim, hFim, barberId, motivo) {
    const barberOptions = getBarberSelectOptions(barberId);
    
    return `
        <div class="absolute top-0 left-0 w-1 h-full bg-red-500/50 group-hover:bg-red-500 transition-colors"></div>
        <div class="flex justify-between items-center mb-4 pl-3">
            <span class="text-[10px] font-bold text-red-400 uppercase tracking-widest bg-red-500/10 px-2 py-1 rounded flex items-center gap-1.5">
                <i data-lucide="lock" class="w-3 h-3"></i> Bloqueio
            </span>
            <button type="button" class="btn-remove-block text-slate-500 p-1 transition-colors">
                <i data-lucide="x" class="w-5 h-5"></i>
            </button>
        </div>
        <div class="pl-3 grid grid-cols-1 gap-4">
            <div>
                <label class="text-[10px] text-slate-500 font-bold uppercase mb-2 block">Profissional</label>
                <select class="input-dark text-sm barber-select-block">
                    ${barberOptions}
                </select>
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="text-[10px] text-slate-500 font-bold uppercase mb-2 block">Data Início</label>
                    <input type="date" value="${dIni}" class="input-dark text-sm block-d-ini">
                </div>
                <div>
                    <label class="text-[10px] text-slate-500 font-bold uppercase mb-2 block">Hora Início</label>
                    <input type="time" value="${hIni}" class="input-dark text-sm block-h-ini">
                </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="text-[10px] text-slate-500 font-bold uppercase mb-2 block">Data Fim</label>
                    <input type="date" value="${dFim}" class="input-dark text-sm block-d-fim">
                </div>
                <div>
                    <label class="text-[10px] text-slate-500 font-bold uppercase mb-2 block">Hora Fim</label>
                    <input type="time" value="${hFim}" class="input-dark text-sm block-h-fim">
                </div>
            </div>
            <div>
                <label class="text-[10px] text-slate-500 font-bold uppercase mb-2 block">Motivo</label>
                <input type="text" value="${motivo}" placeholder="Ex: Férias, Viagem..." class="input-dark text-sm block-motivo">
            </div>
        </div>`;
}

function getBarberSelectOptions(selectedId) {
    let options = '<option value="todos">Todos os Profissionais</option>';
    document.querySelectorAll('.barber-card').forEach(card => {
        const id = card.dataset.id;
        const nome = card.querySelector('.barber-name').value || 'Sem Nome';
        if (id) {
            const selected = id == selectedId ? 'selected' : '';
            options += `<option value="${id}" ${selected}>${nome}</option>`;
        }
    });
    return options;
}

function setupBlockEvents(div, id) {
    div.querySelector('.btn-remove-block').addEventListener('click', () => {
        if (id) deletedBlocks.add(id);
        div.remove();
        const container = document.getElementById('blocks-list');
        if (container.children.length === 0) {
            const emptyMsg = document.getElementById('no-blocks-msg');
            if (emptyMsg) emptyMsg.style.display = 'flex';
        }
    });
}

// ==========================================
// DÚVIDAS FREQUENTES
// ==========================================
function addDuvida() {
    addDuvidaToDOM();
}

function addDuvidaToDOM(data = null) {
    const container = document.getElementById('duvidas-list');
    const emptyMsg = document.getElementById('no-duvidas-msg');
    if (emptyMsg) emptyMsg.style.display = 'none';
    
    const id = data ? data.id_duvida : null;
    const titulo = data ? data.duvida_titulo : '';
    const resposta = data ? data.duvida_resposta : '';
    
    const div = document.createElement('div');
    div.className = "duvida-card bg-slate-900/60 border border-slate-800 rounded-xl p-5 animate-fade-in-up relative overflow-hidden shadow-lg mb-4";
    if (id) div.dataset.id = id;
    
    div.innerHTML = getDuvidaHTML(titulo, resposta);
    
    setupDuvidaEvents(div, id);
    container.prepend(div);
    lucide.createIcons();
}

function getDuvidaHTML(titulo, resposta) {
    return `
        <div class="absolute top-0 left-0 w-1 h-full bg-purple-500/50"></div>
        <div class="flex justify-between items-center mb-4 pl-3">
            <span class="text-[10px] font-bold text-purple-400 uppercase tracking-widest bg-purple-500/10 px-2 py-1 rounded flex items-center gap-1.5">
                <i data-lucide="help-circle" class="w-3 h-3"></i> Dúvida Frequente
            </span>
            <button type="button" class="btn-remove-duvida text-slate-500 p-1 transition-colors">
                <i data-lucide="x" class="w-5 h-5"></i>
            </button>
        </div>
        <div class="pl-3 space-y-4">
            <div>
                <label class="text-[10px] text-slate-500 font-bold uppercase mb-2 block">Pergunta</label>
                <input type="text" value="${titulo}" placeholder="Ex: Qual o horário de funcionamento?" class="input-dark text-sm duvida-titulo">
            </div>
            <div>
                <label class="text-[10px] text-slate-500 font-bold uppercase mb-2 block">Resposta</label>
                <textarea class="input-dark text-sm resize-none duvida-resposta" rows="3" placeholder="Digite aqui a resposta que será enviada ao cliente...">${resposta}</textarea>
            </div>
        </div>`;
}

function setupDuvidaEvents(div, id) {
    div.querySelector('.btn-remove-duvida').addEventListener('click', () => {
        if (id) deletedDuvidas.add(id);
        div.remove();
        const container = document.getElementById('duvidas-list');
        if (container.children.length === 0) {
            const emptyMsg = document.getElementById('no-duvidas-msg');
            if (emptyMsg) emptyMsg.style.display = 'flex';
        }
    });
}

// ==========================================
// HELPERS
// ==========================================
function timeToMinutes(mysqlTime) {
    if (!mysqlTime) return 30;
    const [h, m] = mysqlTime.split(':').map(Number);
    return h * 60 + m;
}

function toggleMobileMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    
    sidebar.classList.toggle('-translate-x-full');
    overlay.classList.toggle('hidden');
}

document.getElementById('mobile-menu-button')?.addEventListener('click', toggleMobileMenu);

// ==========================================
// ⚡ VALIDAÇÃO ANTES DE SALVAR
// ==========================================
async function saveConfig() {
    const idBarb = userSession.id_barbearia;
    const fab = document.querySelector('.fab');
    
    fab.classList.add('scale-90');
    setTimeout(() => fab.classList.remove('scale-90'), 150);
    
    try {
        // ⚡ NOVO: Validar todos os barbeiros antes de salvar
        const invalidBarbers = validateAllBarbersBeforeSave();
        if (invalidBarbers.length > 0) {
            const message = `Atenção! Os seguintes profissionais têm configurações inválidas:\n\n${invalidBarbers.join('\n')}\n\nPor favor, corrija antes de salvar.`;
            alert(message);
            return;
        }
        
        const servicosData = collectServicesData();
        const barbeirosData = collectBarbersData();
        const bloqueiosData = collectBlocksData();
        const horarioData = collectBusinessHoursData();
        const duvidasData = collectDuvidasData();
        
        const [servRes, barbRes, blockRes, hourRes, duvidasRes] = await Promise.all([
            saveServices(idBarb, servicosData),
            saveBarbers(idBarb, barbeirosData),
            saveBlocks(idBarb, bloqueiosData),
            saveBusinessHours(idBarb, horarioData),
            saveDuvidas(idBarb, duvidasData)
        ]);
        
        if ([servRes, barbRes, blockRes, hourRes, duvidasRes].every(r => r.ok)) {
            await calculateTimeSlots(idBarb, horarioData);
            showToast("✅ Configurações salvas com sucesso!", "success");
            clearDeletedItems();
            
            const intervaloSelect = document.getElementById('intervalo-cortes');
            if (intervaloSelect) localStorage.setItem('intervaloCortes', intervaloSelect.value);
        } else {
            throw new Error('Falha em alguma etapa do salvamento');
        }
        
    } catch (error) {
        console.error("Erro ao salvar:", error);
        showToast("❌ Erro ao salvar as configurações.", "error");
    }
}

// ⚡ NOVO: Validar todos os barbeiros antes de salvar
function validateAllBarbersBeforeSave() {
    const invalidBarbers = [];
    
    document.querySelectorAll('.barber-card').forEach(card => {
        const nome = card.querySelector('.barber-name').value || 'Profissional sem nome';
        const issues = [];
        
        // Verificar dias inválidos
        card.querySelectorAll('.day-check:checked').forEach(checkbox => {
            const dayId = checkbox.dataset.day;
            if (!isDayAllowed(dayId)) {
                const dayNames = {
                    'seg': 'Segunda', 'ter': 'Terça', 'qua': 'Quarta',
                    'qui': 'Quinta', 'sex': 'Sexta', 'sab': 'Sábado', 'dom': 'Domingo'
                };
                issues.push(`${dayNames[dayId]} está fora dos dias de funcionamento`);
            }
        });
        
        // Verificar horários inválidos e inconsistentes
        card.querySelectorAll('.day-check:checked').forEach(checkbox => {
            const row = checkbox.closest('div').parentElement;
            const startInput = row.querySelector('.start-time');
            const endInput = row.querySelector('.end-time');
            
            if (startInput && endInput && startInput.value && endInput.value) {
                // Validar contra horário da barbearia
                if (!isTimeAllowed(startInput.value)) {
                    issues.push(`Horário início (${startInput.value}) está fora do horário de funcionamento`);
                }
                if (!isTimeAllowed(endInput.value)) {
                    issues.push(`Horário fim (${endInput.value}) está fora do horário de funcionamento`);
                }
                // Validar horário fim > início
                if (endInput.value <= startInput.value) {
                    issues.push(`Horário de saída (${endInput.value}) deve ser maior que horário de entrada (${startInput.value})`);
                }
            }
        });
        
        // Verificar horário de almoço
        const lunchStart = card.querySelector('.lunch-start');
        const lunchEnd = card.querySelector('.lunch-end');
        if (lunchStart && lunchStart.value && !isTimeAllowed(lunchStart.value)) {
            issues.push(`Almoço início (${lunchStart.value}) está fora do horário de funcionamento`);
        }
        if (lunchEnd && lunchEnd.value && !isTimeAllowed(lunchEnd.value)) {
            issues.push(`Almoço fim (${lunchEnd.value}) está fora do horário de funcionamento`);
        }
        if (lunchStart && lunchEnd && lunchStart.value && lunchEnd.value && lunchEnd.value <= lunchStart.value) {
            issues.push(`Horário fim do almoço (${lunchEnd.value}) deve ser maior que horário início (${lunchStart.value})`);
        }
        
        if (issues.length > 0) {
            invalidBarbers.push(`• ${nome}:\n  - ${issues.join('\n  - ')}`);
        }
    });
    
    return invalidBarbers;
}

function saveInterval() {
    const intervaloSelect = document.getElementById('intervalo-cortes');
    localStorage.setItem('intervaloCortes', intervaloSelect.value);
}

function collectServicesData() {
    const servicosData = [];
    document.querySelectorAll('.service-card').forEach(el => {
        servicosData.push({
            id_servico: el.dataset.id || null,
            nome: el.querySelector('.service-name').value.trim(),
            preco: parseFloat(el.querySelector('.service-price').value) || 0,
            duracao: parseInt(el.querySelector('.service-duration').value) || 30
        });
    });
    return servicosData;
}

function collectBarbersData() {
    const barbeirosData = [];
    
    document.querySelectorAll('.barber-card').forEach(el => {
        const diasProcessados = new Set();
        const agenda = [];
        
        el.querySelectorAll('.day-check:checked').forEach(chk => {
            const diaSemana = chk.dataset.day;
            
            if (diasProcessados.has(diaSemana)) {
                console.warn(`Dia ${diaSemana} duplicado ignorado`);
                return;
            }
            
            // ⚡ NOVO: Validar se o dia está permitido
            if (!isDayAllowed(diaSemana)) {
                console.warn(`Dia ${diaSemana} está fora do horário de funcionamento - ignorado`);
                return;
            }
            
            diasProcessados.add(diaSemana);
            
            const row = chk.closest('div').parentElement;
            const inicio = row.querySelector('.start-time').value;
            const fim = row.querySelector('.end-time').value;
            
            // ⚡ NOVO: Validar horários
            if (!inicio || !fim) {
                console.warn(`Horário faltando para ${diaSemana} - ignorado`);
                return;
            }
            
            // ⚡ NOVO: Validar se horário fim > início
            if (fim <= inicio) {
                console.warn(`Horário inválido para ${diaSemana}: ${inicio}-${fim} (fim deve ser maior que início) - ignorado`);
                return;
            }
            
            // ⚡ NOVO: Validar se os horários estão dentro do permitido
            if (isTimeAllowed(inicio) && isTimeAllowed(fim)) {
                agenda.push({
                    dia_semana: diaSemana,
                    inicio: inicio,
                    fim: fim
                });
            } else {
                console.warn(`Horário fora do permitido para ${diaSemana}: ${inicio}-${fim} - ignorado`);
            }
        });
        
        const lunchStart = el.querySelector('.lunch-start').value;
        const lunchEnd = el.querySelector('.lunch-end').value;
        
        // Validar horário de almoço
        let validLunchStart = lunchStart;
        let validLunchEnd = lunchEnd;
        
        if (lunchStart && lunchEnd && lunchEnd <= lunchStart) {
            console.warn(`Horário de almoço inválido (fim deve ser maior que início) - usando padrão`);
            validLunchStart = '12:00';
            validLunchEnd = '13:00';
        }
        
        barbeirosData.push({
            id_barbeiro: el.dataset.id || null,
            nome: el.querySelector('.barber-name').value.trim(),
            agenda: agenda,
            almoco_inicio: validLunchStart,
            almoco_fim: validLunchEnd
        });
    });
    
    return barbeirosData;
}

function collectBlocksData() {
    const bloqueiosData = [];
    document.querySelectorAll('.block-card').forEach(el => {
        const dIni = el.querySelector('.block-d-ini').value;
        const hIni = el.querySelector('.block-h-ini').value;
        const dFim = el.querySelector('.block-d-fim').value;
        const hFim = el.querySelector('.block-h-fim').value;
        
        if (dIni && hIni && dFim && hFim) {
            bloqueiosData.push({
                id_bloqueio: el.dataset.id || null,
                id_barbeiro: el.querySelector('.barber-select-block').value,
                data_inicio: dIni,
                hora_inicio: hIni,
                data_fim: dFim,
                hora_fim: hFim,
                motivo: el.querySelector('.block-motivo').value.trim()
            });
        }
    });
    return bloqueiosData;
}

function collectBusinessHoursData() {
    const inicio = document.getElementById('horario-abertura').value;
    const fim = document.getElementById('horario-fechamento').value;
    const intervalo = parseInt(document.getElementById('intervalo-cortes').value) || 30;
    const diaInicio = parseInt(document.getElementById('dia-inicio').value);
    const diaFim = parseInt(document.getElementById('dia-fim').value);
    const localizacao = document.getElementById('localizacao-text').value.trim();
    
    return { inicio, fim, intervalo, diaInicio, diaFim, localizacao };
}

function collectDuvidasData() {
    const duvidasData = [];
    document.querySelectorAll('.duvida-card').forEach(el => {
        const titulo = el.querySelector('.duvida-titulo').value.trim();
        const resposta = el.querySelector('.duvida-resposta').value.trim();
        
        if (titulo && resposta) {
            duvidasData.push({
                id_duvida: el.dataset.id || null,
                titulo: titulo,
                resposta: resposta
            });
        }
    });
    return duvidasData;
}

async function saveServices(idBarb, servicosData) {
    return fetch(`${API_URL}/servicos`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ 
            id_barbearia: idBarb, 
            servicos: servicosData, 
            deleted_ids: Array.from(deletedServices) 
        })
    });
}

async function saveBarbers(idBarb, barbeirosData) {
    return fetch(`${API_URL}/barbeiros`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ 
            id_barbearia: idBarb, 
            barbeiros_data: barbeirosData, 
            deleted_ids: Array.from(deletedBarbers) 
        })
    });
}

async function saveBlocks(idBarb, bloqueiosData) {
    return fetch(`${API_URL}/bloqueios`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ 
            id_barbearia: idBarb, 
            bloqueios: bloqueiosData, 
            deleted_ids: Array.from(deletedBlocks) 
        })
    });
}

async function saveBusinessHours(idBarb, horarioData) {
    return fetch(`${API_URL}/barbearia/config`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ 
            id_barbearia: idBarb, 
            inicio: horarioData.inicio, 
            fim: horarioData.fim,
            dia_inicio: horarioData.diaInicio,
            dia_fim: horarioData.diaFim,
            localizacao: horarioData.localizacao
        })
    });
}

async function saveDuvidas(idBarb, duvidasData) {
    return fetch(`${API_URL}/duvidas`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ 
            id_barbearia: idBarb, 
            duvidas: duvidasData, 
            deleted_ids: Array.from(deletedDuvidas) 
        })
    });
}

async function calculateTimeSlots(idBarb, horarioData) {
    if (horarioData.inicio && horarioData.fim) {
        return fetch(`${API_URL}/horarios/calcular`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ 
                id_barbearia: idBarb, 
                intervalo_min: horarioData.intervalo, 
                abertura: horarioData.inicio, 
                fechamento: horarioData.fim 
            })
        });
    }
}

function clearDeletedItems() {
    deletedServices.clear();
    deletedBarbers.clear();
    deletedBlocks.clear();
    deletedDuvidas.clear();
}

function discardChanges() {
    if (confirm('Tem certeza? Todas as alterações não salvas serão perdidas.')) {
        window.location.reload();
    }
}

// ==========================================
// NOTIFICAÇÕES
// ==========================================
function showToast(msg, type) {
    const container = document.getElementById('toast-container');
    const div = document.createElement('div');
    const color = type === 'success' ? 'emerald' : 'red';
    const icon = type === 'success' ? 'check' : 'alert-circle';
    
    div.className = `flex items-center gap-3 px-6 py-4 border-l-4 border-${color}-500 text-${color}-400 rounded shadow-2xl animate-slide-in-right mb-3`;
    div.innerHTML = `<i data-lucide="${icon}"></i> <span>${msg}</span>`;
    
    container.appendChild(div);
    lucide.createIcons();
    setTimeout(() => div.remove(), 4000);
}

// ==========================================
// LOGOUT
// ==========================================
function logout() {
    localStorage.removeItem('user_data');
    window.location.href = 'login.html';
}
// ==========================================
// MODAL DE PERFIL
// ==========================================
function togglePerfilModal() {
    const modal = document.getElementById('modal-perfil');
    const isHidden = modal.classList.contains('hidden');
    
    if (isHidden) {
        // Abrindo modal - preenche os campos com dados atuais
        document.getElementById('edit-profile-name').value = userSession.nome || '';
        document.getElementById('edit-profile-usuario').value = userSession.usuario || '';
        document.getElementById('edit-profile-pass').value = ''; // Sempre começa vazio
        
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    } else {
        // Fechando modal
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

async function updateUserProfile() {
    const nome = document.getElementById('edit-profile-name').value.trim();
    const usuario = document.getElementById('edit-profile-usuario').value.trim();
    const senha = document.getElementById('edit-profile-pass').value.trim();
    const btnSave = document.getElementById('btn-save-profile');
    
    // Validações
    if (!nome) {
        showToast('O nome não pode estar vazio', 'error');
        return;
    }
    
    if (!usuario) {
        showToast('O usuário não pode estar vazio', 'error');
        return;
    }
    
    // Desabilita botão durante o salvamento
    const originalText = btnSave.innerHTML;
    btnSave.innerHTML = '<i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i> Salvando...';
    btnSave.disabled = true;
    
    try {
        const body = {
            id_usuario: userSession.id_usuario,
            nome: nome,
            usuario: usuario
        };
        
        // Só envia senha se foi preenchida
        if (senha && senha.length > 0) {
            body.senha_hash = senha;
        }
        
        const response = await fetch(`${API_URL}/usuarios/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Atualiza a sessão local
            userSession.nome = nome;
            userSession.usuario = usuario;
            localStorage.setItem('user_data', JSON.stringify(userSession));
            
            // Atualiza a UI
            document.getElementById('user-name-display').innerText = nome;
            document.getElementById('user-email-display').innerText = `@${usuario}`;
            
            showToast('Perfil atualizado com sucesso!', 'success');
            togglePerfilModal();
        } else {
            throw new Error(data.error || 'Erro ao atualizar perfil');
        }
        
    } catch (error) {
        console.error('Erro ao atualizar perfil:', error);
        showToast(error.message || 'Erro ao atualizar perfil', 'error');
    } finally {
        btnSave.innerHTML = originalText;
        btnSave.disabled = false;
        lucide.createIcons();
    }
}
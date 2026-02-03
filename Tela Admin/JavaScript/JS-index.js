// ==========================================
// ESTADO GLOBAL & CONFIGURAÇÃO
// ==========================================
const API_URL = 'http://localhost:3000';
let userSession = {};
let servicosList = [];
let barbeirosList = [];
let bloqueiosList = [];
const deletedServices = new Set();
const deletedBarbers = new Set();
const deletedBlocks = new Set();

// ==========================================
// INICIALIZAÇÃO
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    lucide.createIcons();
    checkAuth();
    initTheme();
    initUI();
    await loadAllData();
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
    
    if (userNameDisplay) userNameDisplay.innerText = userSession.nome || 'Admin';
    if (userEmailDisplay) userEmailDisplay.innerText = userSession.email || 'admin@logika.com';
    
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
// CARREGAMENTO DE DADOS
// ==========================================
async function loadAllData() {
    const idBarb = userSession.id_barbearia;
    try {
        const [servicos, barbeiros, bloqueios, barbearia] = await Promise.all([
            fetchData(`${API_URL}/servicos/${idBarb}`),
            fetchData(`${API_URL}/barbeiros/${idBarb}`),
            fetchData(`${API_URL}/bloqueios/${idBarb}`),
            fetchData(`${API_URL}/barbearia/${idBarb}`)
        ]);
        
        renderServices(servicos);
        renderBarbers(barbeiros);
        renderBlocks(bloqueios);
        renderBusinessHours(barbearia);
        
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
// 1. Função para gerenciar o estado visual (CSS)
function updateActivePill(id) {
    const pills = document.querySelectorAll('.nav-pill');
    pills.forEach(pill => {
        pill.classList.remove('active');
        if (pill.getAttribute('href') === `#${id}`) {
            pill.classList.add('active');
        }
    });
}

// 2. Configuração do Observer para detectar as seções
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

// 3. Seleciona as seções que devem ser monitoradas
document.querySelectorAll('section[id], div[id^="section-"]').forEach((section) => {
    observer.observe(section);
});

// 4. Mantém o suporte ao clique manual
function setActivePill(element) {
    const id = element.getAttribute('href').replace('#', '');
    updateActivePill(id);
}

// ==========================================
// UTILITÁRIOS
// ==========================================
function timeToMinutes(timeStr) {
    if (!timeStr) return 30;
    const parts = timeStr.split(':');
    return (parseInt(parts[0]) * 60) + parseInt(parts[1]);
}

// ==========================================
// MENU MOBILE
// ==========================================
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const mobileMenuButton = document.getElementById('mobile-menu-button');

mobileMenuButton.addEventListener('click', toggleSidebar);
sidebarOverlay.addEventListener('click', toggleSidebar);

function toggleSidebar() {
    const isHidden = sidebar.classList.contains('-translate-x-full');
    if (isHidden) {
        sidebar.classList.remove('-translate-x-full');
        sidebarOverlay.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    } else {
        sidebar.classList.add('-translate-x-full');
        sidebarOverlay.classList.add('hidden');
        document.body.style.overflow = '';
    }
}

// ==========================================
// MENU CONTA CLIENTE
// ==========================================
function togglePerfilModal() {
    const modal = document.getElementById('modal-perfil');
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
}

async function updateUserProfile() {
    const btn = document.getElementById('btn-save-profile');
    const originalText = btn.innerText;
    
    const novoNome = document.getElementById('edit-profile-name').value.trim();
    const novoEmail = document.getElementById('edit-profile-email').value.trim();
    const novaSenha = document.getElementById('edit-profile-pass').value.trim();
    
    if (!validateProfileData(novoNome, novoEmail)) return;
    
    try {
        btn.innerText = "Salvando...";
        btn.disabled = true;
        
        const result = await saveProfileToServer(novoNome, novoEmail, novaSenha);
        
        updateLocalSession(novoNome, novoEmail);
        updateProfileUI(novoNome, novoEmail);
        
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

function validateProfileData(nome, email) {
    if (!nome || !email) {
        showToast("Nome e E-mail são obrigatórios.", "error");
        return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showToast("Por favor, insira um e-mail válido (ex@email.com).", "error");
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
            nome: nome,
            email: email,
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
    document.getElementById('user-name-display').innerText = nome;
    document.getElementById('user-email-display').innerText = email;
}

// ==========================================
// SERVIÇOS
// ==========================================
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
    let ini = '09:00';
    let fim = '19:00';
    
    if (data && data.agenda) {
        const ag = data.agenda.find(a => a.dia_semana === d.id);
        if (ag) {
            ini = ag.hora_inicio.substring(0,5);
            fim = ag.hora_fim.substring(0,5);
        } else {
            ativo = false;
        }
    }
    
    return `
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border-b border-slate-800/50 last:border-0 hover:bg-slate-800/10 gap-3">
            <div class="flex items-center gap-3 w-full sm:w-32">
                <input type="checkbox" id="chk_${id || 'new'}_${d.id}" class="checkbox-custom day-check" data-day="${d.id}" ${ativo ? 'checked' : ''}>
                <label for="chk_${id || 'new'}_${d.id}" class="text-sm font-medium text-slate-300 cursor-pointer flex-1">${d.l}</label>
            </div>
            <div class="flex items-center gap-2 w-full sm:w-auto transition-opacity ${ativo ? '' : 'opacity-25 pointer-events-none'}" id="times_${id || 'new'}_${d.id}">
                <div class="relative w-24">
                    <input type="time" value="${ini}" class="input-dark text-center py-1.5 px-1 text-sm w-full start-time">
                </div>
                <span class="text-slate-600 self-center">-</span>
                <div class="relative w-24">
                    <input type="time" value="${fim}" class="input-dark text-center py-1.5 px-1 text-sm w-full end-time">
                </div>
            </div>
        </div>`;
}

function setupBarberEvents(div, id) {
    div.querySelectorAll('.day-check').forEach(chk => {
        chk.addEventListener('change', (e) => {
            const timeDiv = e.target.closest('div').nextElementSibling;
            timeDiv.classList.toggle('opacity-25', !e.target.checked);
            timeDiv.classList.toggle('pointer-events-none', !e.target.checked);
        });
    });
    
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
        const startDate = data.data_inicio.split(' ')[0];
        const startTime = data.data_inicio.split(' ')[1]?.substring(0,5) || '';
        const endDate = data.data_fim.split(' ')[0];
        const endTime = data.data_fim.split(' ')[1]?.substring(0,5) || '';
        dIni = startDate;
        hIni = startTime;
        dFim = endDate;
        hFim = endTime;
        barberId = data.id_barbeiro || 'todos';
    }
    
    return { dIni, hIni, dFim, hFim, barberId };
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
                <label class="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Quem será bloqueado?</label>
                <select class="input-dark mt-1 barber-select-block py-2">
                    ${barberOptions}
                </select>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label class="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Início</label>
                    <div class="flex flex-wrap xs:flex-nowrap gap-2 mt-1">
                        <input type="date" value="${dIni}" class="input-dark flex-1 min-w-[130px] block-d-ini text-sm px-2">
                        <input type="time" value="${hIni}" class="input-dark w-full xs:w-24 block-h-ini text-sm px-2">
                    </div>
                </div>
                <div>
                    <label class="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Fim</label>
                    <div class="flex flex-wrap xs:flex-nowrap gap-2 mt-1">
                        <input type="date" value="${dFim}" class="input-dark flex-1 min-w-[130px] block-d-fim text-sm px-2">
                        <input type="time" value="${hFim}" class="input-dark w-full xs:w-24 block-h-fim text-sm px-2">
                    </div>
                </div>
            </div>
            <div>
                <label class="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Motivo</label>
                <input type="text" value="${motivo}" placeholder="Ex: Feriado, Reforma..." class="input-dark mt-1 block-motivo py-2.5">
            </div>
        </div>`;
}

function getBarberSelectOptions(selectedBarberId) {
    const barbers = getCurrentBarbers();
    const options = barbers.map(b => 
        `<option value="${b.id}" ${selectedBarberId == b.id ? 'selected' : ''}>${b.nome}</option>`
    ).join('');
    return `<option value="todos">Todos os Profissionais</option>` + options;
}

function setupBlockEvents(div, id) {
    div.querySelector('.btn-remove-block').addEventListener('click', () => {
        if (id) deletedBlocks.add(id);
        div.remove();
        
        const remainingBlocks = document.querySelectorAll('.block-card').length;
        const emptyMsg = document.getElementById('no-blocks-msg');
        if (emptyMsg && remainingBlocks === 0) {
            emptyMsg.style.display = 'flex';
        }
    });
}

// ==========================================
// SALVAR TUDO
// ==========================================
async function saveConfig() {
    const btn = document.querySelector('button[onclick="saveConfig()"]');
    const originalText = btn.innerHTML;
    
    btn.innerHTML = `<i data-lucide="loader-2" class="animate-spin w-4 h-4"></i> Salvando...`;
    btn.disabled = true;
    lucide.createIcons();
    
    try {
        await saveAllData();
        showToast('Configurações salvas com sucesso!', 'success');
        clearDeletedItems();
        setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
        console.error('Erro ao salvar:', err);
        showToast('Erro ao salvar. Tente novamente mais tarde.', 'error');
        btn.innerHTML = originalText;
        btn.disabled = false;
        lucide.createIcons();
    }
}

async function saveAllData() {
    const idBarb = userSession.id_barbearia;
    saveIntervalToLocalStorage();
    
    const [
        servicosData,
        barbeirosData,
        bloqueiosData,
        horarioData
    ] = await Promise.all([
        collectServicesData(),
        collectBarbersData(),
        collectBlocksData(),
        collectBusinessHoursData()
    ]);
    
    await Promise.all([
        saveServices(idBarb, servicosData),
        saveBarbers(idBarb, barbeirosData),
        saveBlocks(idBarb, bloqueiosData),
        saveBusinessHours(idBarb, horarioData),
        calculateTimeSlots(idBarb, horarioData)
    ]);
}

function saveIntervalToLocalStorage() {
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
        const agenda = [];
        el.querySelectorAll('.day-check:checked').forEach(chk => {
            const row = chk.closest('div').parentElement;
            agenda.push({
                dia_semana: chk.dataset.day,
                inicio: row.querySelector('.start-time').value,
                fim: row.querySelector('.end-time').value
            });
        });
        barbeirosData.push({
            id_barbeiro: el.dataset.id || null,
            nome: el.querySelector('.barber-name').value.trim(),
            agenda,
            almoco_inicio: el.querySelector('.lunch-start').value,
            almoco_fim: el.querySelector('.lunch-end').value
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
    
    return { inicio, fim, intervalo };
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
            fim: horarioData.fim 
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
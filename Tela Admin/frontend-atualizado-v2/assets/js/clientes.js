// ==========================================
// ESTADO GLOBAL & CONFIGURAÇÃO
// ==========================================
const API_URL = window.API_BASE_URL;
let userSession = {};
let allClientes = [];
let filteredClientes = [];

let isLoading = false;
let loadingController = null;
let debounceTimer = null;

// ==========================================
// INICIALIZAÇÃO
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🔄 Inicializando tela de clientes...');
    lucide.createIcons();
    checkAuth();
    initTheme();
    initUI();
    setupEventListeners();
    await loadClientes();
});

function setupEventListeners() {
    const mobileMenuBtn = document.getElementById('mobile-menu-button');
    const sidebarOverlay = document.getElementById('sidebar-overlay');

    if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', toggleSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', toggleSidebar);

    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) themeToggle.addEventListener('click', toggleTheme);

    const perfilBtn = document.getElementById('perfil-btn');
    if (perfilBtn) perfilBtn.addEventListener('click', togglePerfilModal);

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', logout);

    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.addEventListener('input', debounceSearch);

    const refreshBtn = document.getElementById('btn-refresh-clientes');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            if (!isLoading) loadClientes();
        });
    }
}

// ==========================================
// AUTENTICAÇÃO
// ==========================================
function checkAuth() {
    const rawUser = localStorage.getItem('user_data');

    if (!rawUser) {
        window.location.href = 'index.html';
        return;
    }

    try {
        userSession = JSON.parse(rawUser);
    } catch (e) {
        console.error('❌ Erro ao parsear user_data:', e);
        localStorage.removeItem('user_data');
        window.location.href = 'index.html';
    }
}

function initUI() {
    const userNameDisplay = document.getElementById('user-name-display');
    const userEmailDisplay = document.getElementById('user-email-display');

    if (userNameDisplay) userNameDisplay.textContent = userSession.nome || 'Admin';

    if (userEmailDisplay) {
        const displayText = userSession.email || (userSession.usuario ? `@${userSession.usuario}` : 'admin@logika.com');
        userEmailDisplay.textContent = displayText;
    }
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
// CARREGAR CLIENTES
// ==========================================
async function loadClientes() {
    if (isLoading) return;

    const idBarb = userSession.id_barbearia;

    if (!idBarb) {
        console.error('❌ ID da barbearia não encontrado');
        showToast('Erro: Barbearia não configurada', 'error');
        return;
    }

    isLoading = true;
    loadingController = new AbortController();
    const signal = loadingController.signal;

    try {
        showLoading();

        const timeoutId = setTimeout(() => loadingController.abort(), 10000);

        const response = await fetch(`${API_URL}/clientes/${idBarb}`, { signal });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`Erro HTTP ${response.status}`);
        }

        const data = await response.json();
        console.log(`✅ ${data.length} clientes recebidos`);

        allClientes = processClientesData(data);

        requestAnimationFrame(() => {
            applyFilters();
            updateStatistics();
        });

    } catch (error) {
        if (error.name === 'AbortError') {
            showToast('Tempo de carregamento excedido. Tente novamente.', 'error');
        } else {
            console.error('❌ Erro ao carregar clientes:', error);
            showToast(`Erro ao carregar clientes: ${error.message}`, 'error');
        }
        showEmptyState('Não foi possível carregar os clientes.');
    } finally {
        isLoading = false;
        loadingController = null;
    }
}

function processClientesData(data) {
    if (!Array.isArray(data)) {
        console.error('❌ Dados não são array');
        return [];
    }

    return data.map((cliente) => ({
        ...cliente,
        nome: cliente.nome || 'Sem nome',
        telefone: cliente.telefone || '',
        remoteJid: cliente.remoteJid || '',
        data_cadastro_obj: cliente.data_cadastro ? new Date(cliente.data_cadastro) : null
    }));
}

// ==========================================
// FILTRO / BUSCA
// ==========================================
function debounceSearch() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => applyFilters(), 300);
}

function applyFilters() {
    const searchInput = document.getElementById('search-input');
    const termo = searchInput ? searchInput.value.trim().toLowerCase() : '';

    filteredClientes = allClientes.filter(c => {
        if (!termo) return true;
        const nome = (c.nome || '').toLowerCase();
        const telefone = (c.telefone || '').toLowerCase();
        return nome.includes(termo) || telefone.includes(termo);
    });

    // Ordena por nome
    filteredClientes.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

    renderClientes();
}

// ==========================================
// RENDERIZAÇÃO
// ==========================================
function renderClientes() {
    const tbody = document.getElementById('clientes-tbody');
    if (!tbody) return;

    updateResultsCount();

    if (filteredClientes.length === 0) {
        showEmptyState(allClientes.length === 0
            ? 'Nenhum cliente cadastrado ainda.'
            : 'Nenhum cliente encontrado para essa busca.');
        return;
    }

    tbody.innerHTML = filteredClientes.map((cliente, index) => {
        const iniciais = getIniciais(cliente.nome);
        const telefoneFormatado = formatPhone(cliente.telefone);
        const dataFormatada = formatDataCadastro(cliente.data_cadastro_obj);
        const whatsappLink = buildWhatsappLink(cliente.telefone, cliente.remoteJid);

        return `
            <tr class="table-row-hover">
                <td class="px-3 md:px-6 py-3 hidden lg:table-cell text-slate-500 font-mono text-xs">
                    #${cliente.id_cliente ?? index + 1}
                </td>
                <td class="px-3 md:px-6 py-3">
                    <div class="flex items-center gap-3">
                        <div class="avatar-cliente">${iniciais}</div>
                        <div class="min-w-0">
                            <p class="font-semibold text-white truncate">${escapeHtml(cliente.nome)}</p>
                            <p class="text-slate-500 text-xs sm:hidden">${telefoneFormatado || 'Sem telefone'}</p>
                        </div>
                    </div>
                </td>
                <td class="px-3 md:px-6 py-3 hidden sm:table-cell text-slate-300 font-mono text-xs">
                    ${telefoneFormatado || '<span class="text-slate-600">Sem telefone</span>'}
                </td>
                <td class="px-3 md:px-6 py-3 hidden md:table-cell text-slate-400 text-xs">
                    ${dataFormatada}
                </td>
                <td class="px-3 md:px-6 py-3 text-center">
                    ${whatsappLink
                        ? `<a href="${whatsappLink}" target="_blank" rel="noopener noreferrer" class="btn-whatsapp">
                                <i data-lucide="message-circle" class="w-3.5 h-3.5"></i>
                                <span class="hidden sm:inline">WhatsApp</span>
                           </a>`
                        : '<span class="text-slate-600 text-xs">—</span>'}
                </td>
            </tr>
        `;
    }).join('');

    lucide.createIcons();
}

function showEmptyState(message) {
    const tbody = document.getElementById('clientes-tbody');
    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="5" class="px-6 py-10 text-center">
                <i data-lucide="users" class="w-8 h-8 mx-auto text-slate-700"></i>
                <p class="text-slate-500 mt-3 text-sm">${message}</p>
            </td>
        </tr>
    `;
    lucide.createIcons();
}

function showLoading() {
    const tbody = document.getElementById('clientes-tbody');
    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="5" class="px-6 py-10 text-center">
                <i data-lucide="loader-2" class="w-8 h-8 animate-spin mx-auto text-emerald-500"></i>
                <p class="text-slate-500 mt-3 text-sm">Carregando clientes...</p>
            </td>
        </tr>
    `;
    lucide.createIcons();

    const resultsCount = document.getElementById('results-count');
    if (resultsCount) resultsCount.textContent = 'Carregando clientes...';
}

function updateResultsCount() {
    const resultsCount = document.getElementById('results-count');
    if (!resultsCount) return;

    const total = filteredClientes.length;
    resultsCount.textContent = total === 1
        ? '1 cliente encontrado'
        : `${total} clientes encontrados`;
}

// ==========================================
// ESTATÍSTICAS
// ==========================================
function updateStatistics() {
    const hoje = new Date();
    const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    const seteDiasAtras = new Date(inicioHoje.getTime() - 7 * 24 * 60 * 60 * 1000);

    const total = allClientes.length;

    const novosHoje = allClientes.filter(c =>
        c.data_cadastro_obj && c.data_cadastro_obj >= inicioHoje
    ).length;

    const novosSemana = allClientes.filter(c =>
        c.data_cadastro_obj && c.data_cadastro_obj >= seteDiasAtras
    ).length;

    const statTotal = document.getElementById('stat-total');
    const statHoje = document.getElementById('stat-hoje');
    const statSemana = document.getElementById('stat-semana');

    if (statTotal) statTotal.textContent = total;
    if (statHoje) statHoje.textContent = novosHoje;
    if (statSemana) statSemana.textContent = novosSemana;
}

// ==========================================
// HELPERS
// ==========================================
function getIniciais(nome) {
    if (!nome) return '?';
    const partes = nome.trim().split(/\s+/);
    const primeira = partes[0]?.[0] || '';
    const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
    return (primeira + ultima).toUpperCase();
}

function formatPhone(telefone) {
    if (!telefone) return '';
    const digits = telefone.replace(/\D/g, '');

    // Formato BR com DDI: 55 + DDD (2) + número
    if (digits.length === 13) {
        return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
    }
    if (digits.length === 12) {
        return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 8)}-${digits.slice(8)}`;
    }
    if (digits.length === 11) {
        return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }
    if (digits.length === 10) {
        return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    return telefone;
}

function buildWhatsappLink(telefone, remoteJid) {
    let digits = '';
    if (remoteJid) {
        digits = remoteJid.split('@')[0].replace(/\D/g, '');
    } else if (telefone) {
        digits = telefone.replace(/\D/g, '');
    }
    if (!digits) return null;
    if (!digits.startsWith('55')) digits = `55${digits}`;
    return `https://wa.me/${digits}`;
}

function formatDataCadastro(dataObj) {
    if (!dataObj || isNaN(dataObj.getTime())) return '<span class="text-slate-600">—</span>';

    const dia = String(dataObj.getDate()).padStart(2, '0');
    const mes = String(dataObj.getMonth() + 1).padStart(2, '0');
    const ano = dataObj.getFullYear();
    const hora = String(dataObj.getHours()).padStart(2, '0');
    const min = String(dataObj.getMinutes()).padStart(2, '0');

    return `${dia}/${mes}/${ano} <span class="text-slate-600">${hora}:${min}</span>`;
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function showToast(msg, type) {
    const container = document.getElementById('toast-container');
    if (!container) return;

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

// ==========================================
// TEMA / SIDEBAR
// ==========================================
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

// ==========================================
// PERFIL
// ==========================================
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

        await saveProfileToServer(novoNome, novoUsuario, novaSenha);

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
    window.location.href = 'index.html';
}

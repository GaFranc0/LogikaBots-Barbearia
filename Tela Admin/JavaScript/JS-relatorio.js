// ==========================================
// ESTADO GLOBAL & CONFIGURAÇÃO
// ==========================================
const API_URL = 'http://localhost:3000';
let userSession = {};

// ==========================================
// INICIALIZAÇÃO
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    lucide.createIcons();
    checkAuth();
    initTheme();
    initUI();
    initMobileMenu();
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
}

function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        applyLightTheme();
    }
}

// ==========================================
// MODO CLARO/ESCURO
// ==========================================
function toggleTheme() {
    const body = document.body;
    const html = document.documentElement;
    const isLight = body.classList.contains('light');
    
    if (isLight) {
        // Muda para escuro
        body.classList.remove('light');
        html.classList.remove('light');
        localStorage.setItem('theme', 'dark');
        updateThemeUI("Modo Escuro", "translateX(0px)", false);
    } else {
        // Muda para claro
        applyLightTheme();
    }
}

function applyLightTheme() {
    const body = document.body;
    const html = document.documentElement;
    
    body.classList.add('light');
    html.classList.add('light');
    localStorage.setItem('theme', 'light');
    updateThemeUI("Modo Claro", "translateX(20px)", true);
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
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const mobileMenuButton = document.getElementById('mobile-menu-button');

    if (mobileMenuButton) {
        mobileMenuButton.addEventListener('click', toggleSidebar);
    }
    
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', toggleSidebar);
    }
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
// MODAL DE PERFIL
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
    
    // Recria os ícones após abrir/fechar modal
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
        btn.innerText = "Salvando...";
        btn.disabled = true;
        
        await saveProfileToServer(novoNome, novoEmail, novaSenha);
        
        updateLocalSession(novoNome, novoEmail);
        updateProfileUI(novoNome, novoEmail);
        
        showToast("Perfil atualizado com sucesso!", "success");
        togglePerfilModal();
    } catch (error) {
        console.error(error);
        showToast(error.message || "Erro ao atualizar perfil.", "error");
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
        showToast("Por favor, insira um e-mail válido.", "error");
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
    const nameDisplay = document.getElementById('user-name-display');
    const emailDisplay = document.getElementById('user-email-display');
    
    if (nameDisplay) nameDisplay.innerText = nome;
    if (emailDisplay) emailDisplay.innerText = email;
}

// ==========================================
// NOTIFICAÇÕES TOAST
// ==========================================
function showToast(msg, type = 'info') {
    // Cria container se não existir
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
        <span class="text-sm font-medium">${msg}</span>
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
        window.location.href = 'login.html';
    }
}

// ==========================================
// ANIMAÇÕES DOS GRÁFICOS
// ==========================================
window.addEventListener('load', () => {
    // Anima as barras do gráfico
    const bars = document.querySelectorAll('.bar-fill');
    bars.forEach((bar, index) => {
        setTimeout(() => {
            bar.style.height = bar.style.height || '0%';
        }, index * 100);
    });
    
    // Anima as barras de progresso
    const progressBars = document.querySelectorAll('.progress-fill');
    progressBars.forEach((bar, index) => {
        const targetWidth = bar.style.width;
        bar.style.width = '0%';
        setTimeout(() => {
            bar.style.width = targetWidth;
        }, 500 + (index * 150));
    });
});

// ==========================================
// INICIALIZA ÍCONES LUCIDE
// ==========================================
setInterval(() => {
    lucide.createIcons();
}, 1000);
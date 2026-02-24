lucide.createIcons();

// Verifica se já está logado
if(localStorage.getItem('user_data')) {
    // window.location.href = 'index.html'; 
}

async function handleLogin(e) {
    e.preventDefault();
    
    // MUDANÇA: Pegando pelo ID 'usuario' em vez de 'email'
    const usuario = document.getElementById('usuario').value;
    const password = document.getElementById('password').value;
    const btn = document.getElementById('btnSubmit');
    const errorMsg = document.getElementById('errorMsg');

    // Estado de Loading
    const originalContent = btn.innerHTML;
    btn.innerHTML = `<i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i> Autenticando...`;
    btn.disabled = true;
    errorMsg.classList.add('hidden');
    lucide.createIcons();

    localStorage.setItem('user_data', JSON.stringify(data.user));
            
            // Feedback visual
            btn.classList.remove('bg-emerald-600', 'hover:bg-emerald-500');
            btn.classList.add('bg-green-500');
            btn.innerHTML = `<i data-lucide="check" class="w-5 h-5"></i> Sucesso!`;

            setTimeout(() => {
                window.location.href = 'index.html';
            }, 800);
}
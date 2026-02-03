lucide.createIcons();

// Verifica se já está logado e redireciona (opcional)

        if(localStorage.getItem('user_data')) {

            // window.location.href = 'index.html';

        }

// Simulação de banco de dados com Vetores
const usuariosCadastrados = [
    { 
        id: 1, 
        nome: "Gabriel Franco", 
        email: "gafranco.contato@gmail.com", 
        senha: "123" 
    },
    { 
        id: 2, 
        nome: "Admin Logikabots", 
        email: "admin@logikabots.com", 
        senha: "admin" 
    }
];

function handleLogin(e) {
    e.preventDefault();
    
    const emailInput = document.getElementById('email').value;
    const passwordInput = document.getElementById('password').value;
    const btn = document.getElementById('btnSubmit');
    const errorMsg = document.getElementById('errorMsg');

    // Estado de Loading (Visual)
    const originalContent = btn.innerHTML;
    btn.innerHTML = `<i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i> Autenticando...`;
    btn.disabled = true;
    errorMsg.classList.add('hidden');
    lucide.createIcons();

    // Simulando um delay de rede de 500ms para ficar profissional
    setTimeout(() => {
        // BUSCA NO VETOR: Verifica se existe usuário com email e senha correspondentes
        const usuarioEncontrado = usuariosCadastrados.find(user => 
            user.email === emailInput && user.senha === passwordInput
        );

        if (usuarioEncontrado) {
            // SUCESSO: Salva os dados (exceto a senha por segurança)
            const { senha, ...dadosParaSalvar } = usuarioEncontrado;
            localStorage.setItem('user_data', JSON.stringify(dadosParaSalvar));
            
            // Feedback visual
            btn.classList.remove('bg-emerald-600', 'hover:bg-emerald-500');
            btn.classList.add('bg-green-500');
            btn.innerHTML = `<i data-lucide="check" class="w-5 h-5"></i> Sucesso!`;
            
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 800);
        } else {
            // ERRO: Usuário não encontrado
            errorMsg.textContent = "E-mail ou senha incorretos.";
            errorMsg.classList.remove('hidden');
            
            // Restaura botão
            btn.innerHTML = originalContent;
            btn.disabled = false;
            lucide.createIcons();
        }
    }, 500);
}


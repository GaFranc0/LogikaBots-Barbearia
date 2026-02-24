// 1. Sua "Base de Dados" em Vetor (Array)
const USERS_DB = [
    {
        id_usuario: 1,
        nome: "Administrador",
        usuario: "admin",
        password: "123", // Senha em texto simples para o teste
        id_barbearia: 10,
        role: "admin"
    },
    {
        id_usuario: 2,
        nome: "João Barbeiro",
        usuario: "joao",
        password: "456",
        id_barbearia: 10,
        role: "user"
    }
];

async function handleLogin(e) {
    e.preventDefault();

    const btn = document.getElementById('btnSubmit');
    const errorMsg = document.getElementById('errorMsg');
    
    // Captura o que o usuário digitou nos inputs do HTML
    const usuarioDigitado = document.getElementById('usuario').value;
    const senhaDigitada = document.getElementById('password').value;

    // Estado de Loading (Visual)
    const originalBtnContent = btn.innerHTML;
    btn.innerHTML = `<i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i> Autenticando...`;
    btn.disabled = true;
    errorMsg.classList.add('hidden');
    lucide.createIcons();

    // Simular um pequeno atraso de rede (opcional, para ver o efeito de loading)
    setTimeout(() => {
        
        // 2. Lógica de busca no Vetor:
        // Procuramos um usuário onde o login E a senha coincidam
        const userFound = USERS_DB.find(u => 
            u.usuario === usuarioDigitado && 
            u.password === senhaDigitada
        );

        if (userFound) {
            // Se achou, removemos a senha antes de salvar no LocalStorage por "boa prática"
            const { password, ...userDataSafe } = userFound;
            
            localStorage.setItem('user_data', JSON.stringify(userDataSafe));

            // Feedback visual de sucesso
            btn.classList.remove('bg-emerald-600', 'hover:bg-emerald-500');
            btn.classList.add('bg-green-500');
            btn.innerHTML = `<i data-lucide="check" class="w-5 h-5"></i> Sucesso!`;

            setTimeout(() => {
                window.location.href = 'index.html';
            }, 800);
        } else {
            // Se não achou no vetor
            errorMsg.innerText = "Usuário ou senha incorretos!";
            errorMsg.classList.remove('hidden');
            btn.innerHTML = originalBtnContent;
            btn.disabled = false;
            lucide.createIcons();
        }
    }, 1000); // 1 segundo de delay simulado
}
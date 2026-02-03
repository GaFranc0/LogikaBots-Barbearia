           document.addEventListener('DOMContentLoaded', () => {
            // Inicializa os ícones
            lucide.createIcons();

            // 1. Define os dados de um usuário fictício para manter a integridade do Dashboard
            const usuarioDemo = {
                id: 1,
                nome: "Visitante Logikabots",
                email: "demo@logikabots.com",
                role: "admin",
                dataAcesso: new Date().toLocaleDateString()
            };

            // 2. Salva no localStorage para que o index.html reconheça o "login"
            localStorage.setItem('user_data', JSON.stringify(usuarioDemo));

            // 3. Pequeno delay de 800ms apenas para dar um efeito visual profissional de "autenticação"
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 800);
        });

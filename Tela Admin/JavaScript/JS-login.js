         lucide.createIcons();

        // Verifica se já está logado e redireciona (opcional)
        if(localStorage.getItem('user_data')) {
            // window.location.href = 'index.html'; 
        }

        async function handleLogin(e) {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const btn = document.getElementById('btnSubmit');
            const errorMsg = document.getElementById('errorMsg');

            // Estado de Loading
            const originalContent = btn.innerHTML;
            btn.innerHTML = `<i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i> Autenticando...`;
            btn.disabled = true;
            errorMsg.classList.add('hidden');
            lucide.createIcons();

            try {
                // IMPORTANTE: Se o servidor estiver na VPS, troque localhost pelo IP
                const response = await fetch('http://localhost:3000/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();

                if (response.ok) {
                    // SUCESSO: Salva os dados no navegador
                    localStorage.setItem('user_data', JSON.stringify(data.user));
                    
                    // Feedback visual
                    btn.classList.remove('bg-emerald-600', 'hover:bg-emerald-500');
                    btn.classList.add('bg-green-500');
                    btn.innerHTML = `<i data-lucide="check" class="w-5 h-5"></i> Sucesso!`;
                    
                    // Redireciona para o painel principal
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 800);
                } else {
                    throw new Error(data.message || 'Erro ao fazer login');
                }

            } catch (error) {
                errorMsg.textContent = error.message;
                errorMsg.classList.remove('hidden');
                
                // Restaura botão
                btn.innerHTML = originalContent;
                btn.classList.remove('bg-green-500');
                btn.classList.add('bg-emerald-600');
                btn.disabled = false;
                lucide.createIcons();
            }
        }
// Controle de acesso por perfil.
// admin  -> acesso a tudo (Configurações, Agendamentos, Relatórios, Clientes)
// demais -> somente Agendamentos e Clientes
(function () {
    var PAGINAS_SOMENTE_ADMIN = ['admin.html', 'relatorios.html'];
    var PAGINA_PADRAO_FUNCIONARIO = 'agendamentos.html';

    var user = null;
    try {
        user = JSON.parse(localStorage.getItem('user_data'));
    } catch (e) {
        user = null;
    }

    // Sem sessão: o checkAuth de cada página já manda para o login.
    if (!user) return;

    var perfil = String(user.role || user.nivel || '').trim().toLowerCase();
    var isAdmin = perfil === 'admin';
    window.USER_IS_ADMIN = isAdmin;

    if (isAdmin) return;

    var pagina = (window.location.pathname.split('/').pop() || '').toLowerCase();
    if (PAGINAS_SOMENTE_ADMIN.indexOf(pagina) !== -1) {
        window.location.replace(PAGINA_PADRAO_FUNCIONARIO);
        window.stop();
        return;
    }

    // Esconde os itens do menu que o funcionário não pode acessar
    document.addEventListener('DOMContentLoaded', function () {
        var links = document.querySelectorAll('a[href="admin.html"], a[href="relatorios.html"]');
        links.forEach(function (a) { a.style.display = 'none'; });
    });
})();

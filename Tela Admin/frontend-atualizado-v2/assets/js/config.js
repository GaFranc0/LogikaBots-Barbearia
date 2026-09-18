// Ative para testar com o backend rodando em http://localhost:3000.
// Desative antes de publicar o frontend.
const USE_LOCAL_API = false;

const FRONTEND_IS_LOCAL = ['localhost', '127.0.0.1'].includes(window.location.hostname);

window.API_BASE_URL = USE_LOCAL_API && FRONTEND_IS_LOCAL
    ? 'http://localhost:3000'
    : 'https://back-end-logika-barbeiros.vercel.app';

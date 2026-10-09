// Ative para testar com o backend rodando em http://localhost:3000.
// Desative antes de publicar o frontend.
const USE_LOCAL_API = true;

// A seleção é explícita, independentemente do endereço usado para abrir o frontend.
window.API_BASE_URL = USE_LOCAL_API
    ? 'http://localhost:3000'
    : 'https://back-end-logika-barbeiros.vercel.app';

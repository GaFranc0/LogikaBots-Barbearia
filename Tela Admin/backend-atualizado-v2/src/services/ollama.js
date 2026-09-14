const OLLAMA_URL = process.env.OLLAMA_URL?.replace(/\/$/, '');
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:1.5b';


async function ollamaChat(messages, opcoes = {}) {

    if (!OLLAMA_URL) {
        throw new Error('OLLAMA_URL não configurada.');
    }

    const body = {
        model: OLLAMA_MODEL,
        messages,
        stream: false,

        options: {
            temperature: opcoes.temperature ?? 0
        },

        // Mantém o modelo carregado por pouco tempo.
        // Podemos alterar depois dependendo do consumo de RAM.
        keep_alive: opcoes.keepAlive ?? '2m'
    };

    if (opcoes.json) {
        body.format = 'json';
    }

    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
        method: 'POST',

        headers: {
            'Content-Type': 'application/json'
        },

        body: JSON.stringify(body)
    });

    if (!response.ok) {

        const texto = await response.text();

        throw new Error(
            `Ollama respondeu ${response.status}: ${texto}`
        );
    }

    const data = await response.json();

    return data.message?.content || '';
}


module.exports = {
    ollamaChat
};
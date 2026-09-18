const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:1.5b';

function getOllamaEndpoint(path) {
    const configuredUrl = process.env.OLLAMA_URL?.trim();

    if (!configuredUrl) {
        throw new Error('OLLAMA_URL não configurada.');
    }

    const hasScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(configuredUrl);
    const address = hasScheme ? configuredUrl : `http://${configuredUrl}`;

    let baseUrl;
    try {
        baseUrl = new URL(address);
    } catch {
        throw new Error('OLLAMA_URL inválida. Use http://host:porta ou https://host:porta.');
    }

    if (!['http:', 'https:'].includes(baseUrl.protocol) ||
        baseUrl.username || baseUrl.password || baseUrl.search || baseUrl.hash) {
        throw new Error('OLLAMA_URL inválida. Use http://host:porta ou https://host:porta.');
    }

    return new URL(path.replace(/^\/+/, ''), `${baseUrl.href.replace(/\/+$/, '')}/`).toString();
}


async function ollamaChat(messages, opcoes = {}) {
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

    if (opcoes.numPredict) body.options.num_predict = opcoes.numPredict;

    if (opcoes.schema) {
        body.format = opcoes.schema;
    } else if (opcoes.json) {
        body.format = 'json';
    }

    const response = await fetch(getOllamaEndpoint('/api/chat'), {
        method: 'POST',

        headers: {
            'Content-Type': 'application/json'
        },

        body: JSON.stringify(body),
        ...(opcoes.timeoutMs ? { signal: AbortSignal.timeout(opcoes.timeoutMs) } : {})
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
    ollamaChat,
    getOllamaEndpoint
};

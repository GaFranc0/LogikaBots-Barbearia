const express = require('express');

const router = express.Router();

const {
    perguntarIA
} = require('../services/iarelatorios');

const OLLAMA_URL = process.env.OLLAMA_URL;
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:1.5b';

router.post('/teste', async (req, res) => {
    try {
        const { pergunta } = req.body;

        if (!pergunta) {
            return res.status(400).json({
                error: 'Pergunta não informada.'
            });
        }

        const response = await fetch(`${OLLAMA_URL}/api/chat`, {
            method: 'POST',

            headers: {
                'Content-Type': 'application/json'
            },

            body: JSON.stringify({
                model: OLLAMA_MODEL,
                messages: [
                    {
                        role: 'user',
                        content: pergunta
                    }
                ],
                stream: false
            })
        });

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json(data);
        }

        return res.json({
            resposta: data.message?.content || ''
        });

    } catch (error) {
        console.error('Erro Ollama:', error);

        return res.status(500).json({
            error: 'Erro ao comunicar com a IA.'
        });
    }
});

router.get('/status', async (req, res) => {
    try {
        const response = await fetch(
            `${process.env.OLLAMA_URL}/api/tags`
        );

        const data = await response.json();

        return res.json({
            sucesso: true,
            statusOllama: response.status,
            dados: data
        });

    } catch (error) {

        console.error('Erro completo ao acessar Ollama:');
        console.error(error);

        return res.status(500).json({
            error: 'Erro ao acessar Ollama',
            detalhe: error.message,
            causa: error.cause?.message || null,
            codigo: error.cause?.code || null
        });
    }
});

router.post('/perguntar', async (req, res) => {

    try {

        const {
            pergunta,
            id_barbearia,
            ano,
            mes,
            historico = []
        } = req.body;


        if (!pergunta) {
            return res.status(400).json({
                error: 'Pergunta não informada.'
            });
        }


        if (!id_barbearia) {
            return res.status(400).json({
                error: 'Barbearia não informada.'
            });
        }


        if (!ano || !mes) {
            return res.status(400).json({
                error: 'Período não informado.'
            });
        }


        if (!Array.isArray(historico)) {
            return res.status(400).json({
                error: 'Histórico inválido.'
            });
        }


        const resultado =
            await perguntarIA(
                pergunta,
                Number(id_barbearia),
                Number(ano),
                Number(mes),
                historico.slice(-6)
            );


        return res.json(resultado);


    } catch (error) {

        console.error(
            'Erro /ia/perguntar:',
            error
        );


        return res.status(500).json({
            error:
                'Erro ao processar pergunta.',

            detalhe:
                error.message
        });
    }
});

module.exports = router;

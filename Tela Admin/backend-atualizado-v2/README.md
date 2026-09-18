# Backend da tela admin

## Rodar localmente

1. Instale o Node.js 24 e execute `npm install` nesta pasta.
2. Copie `.env.example` para `.env` e preencha `DB_HOST`, `DB_USER`, `DB_PASSWORD` e `DB_NAME` com os dados do MySQL remoto. `DB_PORT` usa 3306 quando não for informado.
3. Execute `npm start`. O servidor usa a porta 3000 por padrão e mostra `Conectado ao MySQL com sucesso!` quando a conexão funciona.

O comando `npm start` carrega `.env` quando ele existe. As variáveis já definidas no ambiente também são aceitas. O arquivo `.env` contém credenciais e está excluído do Git.

As consultas de relatórios com IA usam `DB_IA_USER` e `DB_IA_PASSWORD`. Configure essas variáveis se for testar essa funcionalidade. As rotas de IA também usam `OLLAMA_URL` e `OLLAMA_MODEL`. Para `OLLAMA_URL`, use por exemplo `http://localhost:11434`; um endereço sem protocolo também é aceito e usa `http://` automaticamente.

## Deploy na Vercel

Configure `DB_HOST`, `DB_USER`, `DB_PASSWORD` e `DB_NAME` nas variáveis de ambiente do projeto na Vercel. Configure também `DB_PORT` se o servidor não usar 3306 e as variáveis de IA quando necessárias. A Vercel fornece essas variáveis ao `server.js`; o `.env` local não deve ser enviado ao GitHub.

## IA de relatórios

Execute `npm test` para verificar as regras e as consultas sem acessar serviços externos. O [roteiro de testes da IA](docs/testes-ia-relatorios.md) descreve as métricas, as limitações, o contrato do histórico e uma bateria de perguntas para testar no frontend. As respostas monetárias usam os preços atuais dos serviços, pois a tabela de agendamentos ainda não registra o preço histórico cobrado.

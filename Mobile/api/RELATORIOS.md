# Relatórios no Mobile

- Faça login novamente após atualizar o aplicativo. O login agora retorna um token com validade padrão de 8 horas.
- O menu Relatórios aparece somente para usuários ativos com `usuarios_admin.nivel = 'admin'`.
- As rotas de relatórios e perguntas validam o token, o nível atual no banco e a barbearia vinculada ao usuário. Não é suficiente alterar o nível no aplicativo.
- A tabela `api_tokens` já foi criada no banco configurado deste ambiente. Em outro banco, execute `api/sql/001_tokens.sql` antes de atualizar a API. Não apague as demais tabelas.
- Sem variáveis `DB_HOST`, os novos endpoints reutilizam `config/database.php`. Com configuração por ambiente, informe `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` e, para os relatórios, `DB_IA_USER` / `DB_IA_PASSWORD`. Recomenda-se uma conta somente leitura para as consultas de relatórios.
- O acesso do Flutter usa `public/index.php?route=/relatorios/dashboard` e `public/index.php?route=/ia/perguntar`, sem necessidade de rewrite.
- Faturamento e ticket consideram atendimentos concluídos e preços atuais dos serviços, não preços históricos. A ocupação é estimada por horários de início; não desconta bloqueios nem duração dos serviços.
- Perguntas diretas são resolvidas pelo planejador existente. Formulações adicionais e sugestões por IA dependem do Ollama em `http://127.0.0.1:11434`, modelo `qwen2.5:1.5b` (ou `OLLAMA_URL` / `OLLAMA_MODEL`). A indisponibilidade da IA não impede carregar as métricas.
- Revise a configuração de produção: HTTPS, credenciais fora do código e limpeza periódica de tokens expirados. A proteção adicionada é dos relatórios; não substitui uma revisão de autenticação dos endpoints legados.

## Verificação

```text
php api/tests/planner.php
php api/tests/report_access.php
```

O segundo teste requer a API local na porta 8000 e um administrador ativo. Cria apenas um token temporário e o remove ao terminar. Não altera agendamentos ou usuários.

Na pasta `Mobile/Mobile`:

```text
flutter test test/relatorios_test.dart test/ver_agendamentos_test.dart
flutter build web
```

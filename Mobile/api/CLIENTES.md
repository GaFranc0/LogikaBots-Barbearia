# Clientes (administradores)

O menu **Clientes** abre `/clientes` no Flutter. A API atende `GET /api/public/index.php?route=/clientes` com `Authorization: Bearer <token>`.

- Reutiliza o token do login atual. Caso esteja usando uma sessão anterior à atualização da API, faça login novamente.
- Valida usuário ativo e `usuarios_admin.nivel = 'admin'` em cada requisição.
- A loja vem do usuário autenticado no banco, nunca de um identificador informado pelo aplicativo. `id_barbearia` diferente retorna 403.
- Lista e indicadores usam `WHERE id_barbearia = ?`. A busca visual não muda os indicadores totais da loja.
- Novos hoje considera o dia local em São Paulo. Novos na semana considera segunda-feira a domingo.
- Tocar no cartão ou linha abre os dados cadastrados do cliente. WhatsApp fica desabilitado quando não há telefone válido; identificadores `@lid` não são tratados como telefone.
- Não altera registros ou tabelas de clientes. Usa o esquema existente.

Verificação, na raiz do projeto, com API local na porta 8000:

```text
php api/tests/client_access.php
```

O teste compara a resposta com o banco para cada barbearia com administrador ativo, testa acesso sem token, token inválido/expirado e tentativa de consultar outra loja. Os tokens de teste são assinados e não ficam gravados no banco.

Na pasta `Mobile/Mobile`:

```text
flutter test test/clientes_test.dart test/relatorios_test.dart test/ver_agendamentos_test.dart
```

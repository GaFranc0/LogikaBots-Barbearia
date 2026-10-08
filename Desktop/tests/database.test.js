const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const path = require('node:path')

function carregar(execute) {
  const handlers = {}
  const chamadas = []
  const conn = {
    execute: async (sql, valores) => { chamadas.push({ sql, valores }); return execute(sql, valores) },
    beginTransaction: async () => chamadas.push('begin'),
    commit: async () => chamadas.push('commit'),
    rollback: async () => chamadas.push('rollback'),
    end: async () => chamadas.push('end')
  }
  const dependencias = {
    electron: { app: { whenReady: () => ({ then() {} }), on() {} }, ipcMain: { handle: (nome, fn) => { handlers[nome] = fn } } },
    path,
    'mysql2/promise': { createConnection: async () => conn },
    bcryptjs: { hash: async senha => `hash:${senha}` }
  }
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/main/index.js'), 'utf8'), {
    require: nome => dependencias[nome], __dirname, process, console: { error() {} }
  })
  return { handlers, chamadas }
}

const usuario = { nome: 'João Silva', usuario: 'joao', nivel: 'admin', senha_hash: 'senha123' }

test('adiciona usuário à barbearia existente e grava hash', async () => {
  const { handlers, chamadas } = carregar(sql => sql.startsWith('SELECT') ? [[{ id_barbearia: 7 }]] : [{ insertId: 20 }])
  assert.equal((await handlers['salvar-usuario']({}, { id_barbearia: 7, usuario })).sucesso, true)
  const insert = chamadas.find(item => item.sql?.startsWith('INSERT'))
  assert.equal(insert.sql.includes('INSERT INTO usuarios_admin'), true)
  assert.deepEqual(Array.from(insert.valores), ['João Silva', 'joao', 'admin', 'hash:senha123', 7])
  assert.equal(chamadas.at(-1), 'end')
})

test('edição sem senha preserva hash e restringe a barbearia', async () => {
  const { handlers, chamadas } = carregar(sql => sql.startsWith('SELECT') ? [[{ id_usuario: 20 }]] : [{ affectedRows: 1 }])
  assert.equal((await handlers['salvar-usuario']({}, { id_barbearia: 7, id_usuario: 20, usuario: { ...usuario, senha_hash: '' } })).sucesso, true)
  const update = chamadas.find(item => item.sql?.startsWith('UPDATE'))
  assert.equal(update.sql.includes('senha_hash'), false)
  assert.equal(update.sql.endsWith('WHERE id_usuario = ? AND id_barbearia = ?'), true)
  assert.deepEqual(Array.from(update.valores).slice(-2), [20, 7])
})

test('impede editar usuário de outra barbearia', async () => {
  const { handlers, chamadas } = carregar(sql => [sql.includes('FROM barbearias') ? [{ id_barbearia: 7 }] : []])
  const resultado = await handlers['salvar-usuario']({}, { id_barbearia: 7, id_usuario: 20, usuario })
  assert.equal(resultado.sucesso, false)
  assert.equal(chamadas.some(item => item.sql?.startsWith('UPDATE')), false)
})

test('login duplicado retorna mensagem e fecha conexão', async () => {
  const { handlers, chamadas } = carregar(sql => {
    if (sql.startsWith('INSERT')) throw Object.assign(new Error('duplicate'), { code: 'ER_DUP_ENTRY' })
    return [[{ id_barbearia: 7 }]]
  })
  const resultado = await handlers['salvar-usuario']({}, { id_barbearia: 7, usuario })
  assert.equal(resultado.sucesso, false)
  assert.match(resultado.erro, /login já está em uso/)
  assert.equal(chamadas.at(-1), 'end')
})

test('listagem não retorna hashes de senhas', async () => {
  const { handlers, chamadas } = carregar(() => [[]])
  assert.equal((await handlers['listar-usuarios']({}, { id_barbearia: 7 })).sucesso, true)
  assert.equal(chamadas[0].sql.includes('senha_hash'), false)
  assert.deepEqual(Array.from(chamadas[0].valores), [7])
})

test('desativação fica restrita à barbearia selecionada', async () => {
  const { handlers, chamadas } = carregar(() => [{ affectedRows: 1 }])
  assert.equal((await handlers['alterar-status-usuario']({}, { id_barbearia: 7, id_usuario: 20, ativo: false })).sucesso, true)
  assert.deepEqual(Array.from(chamadas[0].valores), [0, 20, 7])
})

test('falha no primeiro usuário desfaz a criação da barbearia', async () => {
  const { handlers, chamadas } = carregar(sql => {
    if (sql.includes('INSERT INTO usuarios_admin')) throw new Error('Login duplicado')
    return [{ insertId: 7 }]
  })
  const barbearia = { nome: 'Teste', telefone_whatsapp: '5511999999999', horario_funcionamento_inicio: '08:00', horario_funcionamento_fim: '18:00', id_instance: 'teste', token_evolution: 'token123', timezone: 'America/Sao_Paulo' }
  assert.equal((await handlers['inserir-cadastro']({}, { barbearia, usuario })).sucesso, false)
  assert.equal(chamadas.includes('begin'), true)
  assert.equal(chamadas.includes('rollback'), true)
  assert.equal(chamadas.includes('commit'), false)
})

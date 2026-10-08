let dadosBarbearia = null
let barbeariaSelecionada = null
let usuarioEmEdicao = null
let modoGerenciamento = false
let salvando = false
let versaoLista = 0

function mostrarTela(id) {
  document.querySelectorAll('.card').forEach(card => { card.style.display = card.id === id ? 'block' : 'none' })
  document.querySelector('.steps').style.display = ['tela-barbearia', 'tela-usuario', 'tela-sucesso-card'].includes(id) && !modoGerenciamento ? 'flex' : 'none'
  versaoLista++
}

function mensagemLista(lista, texto) {
  const mensagem = document.createElement('p')
  mensagem.className = 'lista-mensagem'
  mensagem.textContent = texto
  lista.replaceChildren(mensagem)
}

async function listarBarbearias() {
  modoGerenciamento = false
  mostrarTela('tela-lista-barbearias')
  const versao = versaoLista
  const lista = document.getElementById('lista-barbearias')
  mensagemLista(lista, 'Carregando barbearias...')
  try {
    const resultado = await window.api.listarBarbearias()
    if (versao !== versaoLista) return
    if (!resultado.sucesso) throw new Error(resultado.erro)
    lista.replaceChildren()
    if (!resultado.barbearias.length) mensagemLista(lista, 'Nenhuma barbearia cadastrada. Volte à tela principal para criar a primeira.')
    resultado.barbearias.forEach(barbearia => {
      const botao = document.createElement('button')
      botao.className = 'registro'
      preencherRegistro(botao, barbearia.nome, `${barbearia.telefone_whatsapp || 'Sem telefone'} · ${barbearia.total_usuarios} usuário(s)`)
      botao.addEventListener('click', () => {
        barbeariaSelecionada = barbearia
        listarUsuarios()
      })
      lista.appendChild(botao)
    })
  } catch (erro) {
    if (versao !== versaoLista) return
    mensagemLista(lista, 'Não foi possível carregar as barbearias. Clique em Atualizar para tentar novamente.')
    mostrarToast(erro.message)
  }
}

function preencherRegistro(elemento, nome, detalhes) {
  const titulo = document.createElement('span')
  titulo.className = 'registro-nome'
  titulo.textContent = nome
  const descricao = document.createElement('span')
  descricao.className = 'registro-detalhes'
  descricao.textContent = detalhes
  elemento.append(titulo, descricao)
}

async function listarUsuarios() {
  modoGerenciamento = true
  mostrarTela('tela-gerenciar-usuarios')
  const versao = versaoLista
  document.getElementById('nome-barbearia-selecionada').textContent = barbeariaSelecionada.nome
  const lista = document.getElementById('lista-usuarios')
  mensagemLista(lista, 'Carregando usuários...')
  try {
    const resultado = await window.api.listarUsuarios({ id_barbearia: barbeariaSelecionada.id_barbearia })
    if (versao !== versaoLista) return
    if (!resultado.sucesso) throw new Error(resultado.erro)
    lista.replaceChildren()
    if (!resultado.usuarios.length) mensagemLista(lista, 'Esta barbearia ainda não tem usuários. Clique em Adicionar usuário.')
    resultado.usuarios.forEach(usuario => {
      const registro = document.createElement('div')
      registro.className = 'registro'
      preencherRegistro(registro, usuario.nome || usuario.usuario, `${usuario.usuario} · ${usuario.nivel} · ${Number(usuario.ativo) === 1 ? 'Ativo' : 'Inativo'}`)
      const acoes = document.createElement('div')
      acoes.className = 'actions'
      const editar = document.createElement('button')
      editar.className = 'btn btn-secondary'
      editar.textContent = 'Editar'
      editar.addEventListener('click', () => abrirFormularioUsuario(usuario))
      const status = document.createElement('button')
      status.className = 'btn btn-secondary'
      status.textContent = Number(usuario.ativo) === 1 ? 'Desativar' : 'Ativar'
      status.addEventListener('click', async () => {
        status.disabled = true
        editar.disabled = true
        try {
          const resultado = await window.api.alterarStatusUsuario({ id_barbearia: barbeariaSelecionada.id_barbearia, id_usuario: usuario.id_usuario, ativo: Number(usuario.ativo) !== 1 })
          if (!resultado.sucesso) throw new Error(resultado.erro)
          if (versao === versaoLista) {
            mostrarToast('Status atualizado.', 'ok')
            await listarUsuarios()
          }
        } catch (erro) { mostrarToast(erro.message) }
        finally { status.disabled = false; editar.disabled = false }
      })
      acoes.append(editar, status)
      registro.appendChild(acoes)
      lista.appendChild(registro)
    })
  } catch (erro) {
    if (versao !== versaoLista) return
    mensagemLista(lista, 'Não foi possível carregar os usuários.')
    const tentar = document.createElement('button')
    tentar.className = 'btn btn-secondary'
    tentar.textContent = 'Tentar novamente'
    tentar.addEventListener('click', listarUsuarios)
    lista.appendChild(tentar)
    mostrarToast(erro.message)
  }
}

function configurarFormularioUsuario() {
  const tela = document.getElementById('tela-usuario')
  tela.querySelector('.card-title').textContent = modoGerenciamento ? (usuarioEmEdicao ? 'Editar usuário' : 'Novo usuário') : 'Usuário administrador'
  tela.querySelector('.card-subtitle').textContent = modoGerenciamento ? `Acesso para ${barbeariaSelecionada.nome}.` : 'Crie o acesso inicial para esta barbearia.'
  document.getElementById('u-senha').placeholder = usuarioEmEdicao ? 'Deixe em branco para manter a senha atual' : 'Mínimo 6 caracteres, 1 letra e 1 número'
  document.getElementById('btn-finalizar').textContent = modoGerenciamento ? 'Salvar usuário' : 'Finalizar cadastro'
  document.getElementById('btn-finalizar').disabled = false
}

function abrirFormularioUsuario(usuario = null) {
  usuarioEmEdicao = usuario
  ;['u-nome', 'u-usuario', 'u-senha'].forEach(id => {
    document.getElementById(id).value = ''
    limparFeedback(id)
  })
  document.getElementById('u-nome').value = usuario?.nome || ''
  document.getElementById('u-usuario').value = usuario?.usuario || ''
  document.getElementById('u-nivel').value = usuario?.nivel || 'admin'
  configurarFormularioUsuario()
  mostrarTela('tela-usuario')
}

const DDDS_VALIDOS = [
'11','12','13','14','15','16','17','18','19', '21','22','24','27','28','31','32','33','34','35','37','38','41','42',
'43','44','45','46', '47','48','49','51','53','54','55','61','62','64','63','65','66','67','68','69','71','73','74',
'75','77','79','81','87','82','83','84','85','88','86','89','91','93','94','92','97','95','96','98','99'
]

const VALIDACOES = {
  'b-nome': (v) => {
    if (v.length < 3) return 'Nome deve ter pelo menos 3 letras.'
    if (!/[a-zA-ZÀ-ú]{3}/.test(v)) return 'Nome deve conter letras.'
    return null
  },
  'b-telefone': (v) => {
    const digits = v.replace(/\D/g, '')
    if (digits.length < 12 || digits.length > 13) return 'Formato: 55 + DDD + número (12 ou 13 dígitos).'
    if (!digits.startsWith('55')) return 'Número deve começar com 55 (código do Brasil).'
    const ddd = digits.slice(2, 4)
    if (!DDDS_VALIDOS.includes(ddd)) return `DDD ${ddd} inválido para o Brasil.`
    const numero = digits.slice(4)
    if (numero.length === 9 && numero[0] !== '9') return 'Celular de 9 dígitos deve começar com 9.'
    return null
  },
  'b-abertura': (v) => {
    if (!v) return 'Informe o horário de abertura.'
    return null
  },
  'b-fechamento': (v, campos) => {
    if (!v) return 'Informe o horário de fechamento.'
    const abertura = campos['b-abertura']
    if (abertura && v <= abertura) return 'Fechamento deve ser depois da abertura.'
    return null
  },
  'b-id-instance': (v) => {
    if (v.length < 3) return 'ID da instância muito curto (mín. 3 caracteres).'
    if (!/^[a-zA-Z0-9_\-]+$/.test(v)) return 'Use apenas letras, números, _ e -.'
    return null
  },
  'b-token': (v) => {
    if (v.length < 8) return 'Token parece inválido (mín. 8 caracteres).'
    return null
  },
  'u-nome': (v) => {
    if (v.length > 100) return 'Nome deve ter até 100 caracteres.'
    if (v.length < 3) return 'Nome deve ter pelo menos 3 letras.'
    if (v.trim().split(/\s+/).length < 2) return 'Informe nome e sobrenome.'
    if (!/[a-zA-ZÀ-ú]/.test(v)) return 'Nome deve conter apenas letras.'
    return null
  },
  'u-usuario': (v) => {
    if (v.length > 50) return 'Login deve ter até 50 caracteres.'
    if (v.length < 3) return 'Login deve ter pelo menos 3 caracteres.'
    if (!/^[a-zA-Z0-9_]+$/.test(v)) return 'Use apenas letras, números e _.'
    return null
  },
  'u-senha': (v) => {
    if (v.length < 6) return 'Senha deve ter pelo menos 6 caracteres.'
    if (!/[A-Za-z]/.test(v)) return 'Inclua pelo menos uma letra.'
    if (!/[0-9]/.test(v)) return 'Inclua pelo menos um número.'
    return null
  }
}

function marcarErro(id, mensagem) {
  const input = document.getElementById(id)
  const group = input.closest('.form-group')
  input.classList.add('campo-erro')
  input.classList.remove('campo-ok')

  let hint = group.querySelector('.field-hint')
  if (!hint) {
    hint = document.createElement('span')
    hint.className = 'field-hint'
    group.appendChild(hint)
  }
  hint.textContent = mensagem
  hint.style.color = 'var(--danger)'
}

function marcarOk(id) {
  const input = document.getElementById(id)
  const group = input.closest('.form-group')
  input.classList.remove('campo-erro')
  input.classList.add('campo-ok')

  let hint = group.querySelector('.field-hint')
  if (!hint) {
    hint = document.createElement('span')
    hint.className = 'field-hint'
    group.appendChild(hint)
  }
  hint.textContent = '✓'
  hint.style.color = 'var(--success)'
}

function limparFeedback(id) {
  const input = document.getElementById(id)
  const group = input.closest('.form-group')
  input.classList.remove('campo-erro', 'campo-ok')
  const hint = group.querySelector('.field-hint')
  if (hint) hint.textContent = ''
}

function ativarValidacaoAoSair(ids) {
  ids.forEach(id => {
    const el = document.getElementById(id)
    if (!el || !VALIDACOES[id]) return
    el.addEventListener('blur', () => {
      const v = el.value.trim()
      if (!v) { limparFeedback(id); return }
      const campos = {}
      ids.forEach(i => { campos[i] = document.getElementById(i)?.value.trim() })
      const erro = VALIDACOES[id](v, campos)
      erro ? marcarErro(id, erro) : marcarOk(id)
    })
    el.addEventListener('input', () => {
      if (el.classList.contains('campo-erro')) limparFeedback(id)
    })
  })
}

function mostrarToast(msg, tipo = 'erro') {
  const t = document.getElementById('toast')
  t.textContent = msg
  t.className = `show ${tipo}`
  setTimeout(() => { t.className = '' }, 3500)
}

function abrirModal() {
  document.getElementById('modal-sair').classList.add('show')
}

function fecharModal() {
  document.getElementById('modal-sair').classList.remove('show')
}

function confirmarSaida() {
  if (window.api && window.api.fecharJanela) {
    window.api.fecharJanela()
  } else {
    window.close()
  }
}

function minimizarParaTray() {
  if (window.api && window.api.minimizarTray) {
    window.api.minimizarTray()
  }
}

async function alternarFullscreen() {
  if (!window.api || !window.api.toggleFullscreen) return
  await window.api.toggleFullscreen()
}

async function atualizarIconeFullscreen() {
  if (!window.api || !window.api.getFullscreen) return
  const isFull = await window.api.getFullscreen()
  const btn = document.getElementById('btn-fs')
  if (!btn) return
  if (isFull) {
    btn.innerHTML = '&#x2922;'
    btn.title = 'Sair da tela cheia'
  } else {
    btn.innerHTML = '&#x26F6;'
    btn.title = 'Entrar em tela cheia'
  }
}

function irParaPasso2() {
  modoGerenciamento = false
  usuarioEmEdicao = null
  configurarFormularioUsuario()
  const campos = {
    'b-nome':        document.getElementById('b-nome').value.trim(),
    'b-telefone':    document.getElementById('b-telefone').value.trim(),
    'b-abertura':    document.getElementById('b-abertura').value,
    'b-fechamento':  document.getElementById('b-fechamento').value,
    'b-id-instance': document.getElementById('b-id-instance').value.trim(),
    'b-token':       document.getElementById('b-token').value.trim(),
  }

  let temErro = false
  for (const [id, valor] of Object.entries(campos)) {
    if (!valor) {
      marcarErro(id, 'Campo obrigatório.')
      temErro = true
      continue
    }
    const fn = VALIDACOES[id]
    if (fn) {
      const erro = fn(valor, campos)
      if (erro) { marcarErro(id, erro); temErro = true }
      else marcarOk(id)
    }
  }

  if (temErro) {
    mostrarToast('Corrija os campos em vermelho antes de continuar.')
    return
  }

  dadosBarbearia = {
    nome:                          campos['b-nome'],
    telefone_whatsapp:             campos['b-telefone'].replace(/\D/g, ''),
    horario_funcionamento_inicio:  campos['b-abertura'],
    horario_funcionamento_fim:     campos['b-fechamento'],
    id_instance:                   campos['b-id-instance'],
    token_evolution:               campos['b-token'],
    timezone:                      document.getElementById('b-timezone').value
  }

  document.getElementById('tela-barbearia').style.display = 'none'
  document.getElementById('tela-usuario').style.display = 'block'
  document.getElementById('step1-indicator').className = 'step done'
  document.getElementById('step1-indicator').querySelector('.step-dot').textContent = '✓'
  document.getElementById('step2-indicator').className = 'step active'
  document.getElementById('step-line').className = 'step-line done'
}

function voltarPasso1() {
  if (salvando) return
  if (modoGerenciamento) { listarUsuarios(); return }
  document.getElementById('tela-usuario').style.display = 'none'
  document.getElementById('tela-barbearia').style.display = 'block'
  document.getElementById('step1-indicator').className = 'step active'
  document.getElementById('step1-indicator').querySelector('.step-dot').textContent = '1'
  document.getElementById('step2-indicator').className = 'step'
  document.getElementById('step-line').className = 'step-line'
}

async function finalizar() {
  if (salvando) return
  const campos = {
    'u-nome':    document.getElementById('u-nome').value.trim(),
    'u-usuario': document.getElementById('u-usuario').value.trim(),
    'u-senha':   document.getElementById('u-senha').value,
  }

  let temErro = false
  for (const [id, valor] of Object.entries(campos)) {
    if (id === 'u-senha' && usuarioEmEdicao && !valor) { limparFeedback(id); continue }
    if (!valor) {
      marcarErro(id, 'Campo obrigatório.')
      temErro = true
      continue
    }
    const fn = VALIDACOES[id]
    if (fn) {
      const erro = fn(valor, campos)
      if (erro) { marcarErro(id, erro); temErro = true }
      else marcarOk(id)
    }
  }

  if (temErro) {
    mostrarToast('Corrija os campos em vermelho antes de finalizar.')
    return
  }

  const btn = document.getElementById('btn-finalizar')
  btn.disabled = true
  btn.textContent = 'Inserindo...'

  salvando = true
  document.getElementById('btn-voltar').disabled = true
  try {
    const usuario = {
      nome:       campos['u-nome'],
      usuario:    campos['u-usuario'],
      senha_hash: campos['u-senha'],
      nivel:      document.getElementById('u-nivel').value
    }
    const resultado = modoGerenciamento
      ? await window.api.salvarUsuario({ id_barbearia: barbeariaSelecionada.id_barbearia, id_usuario: usuarioEmEdicao?.id_usuario, usuario })
      : await window.api.inserirCadastro({ barbearia: dadosBarbearia, usuario })

    if (resultado.sucesso) {
      document.getElementById('u-senha').value = ''
      if (modoGerenciamento) {
        mostrarToast('Usuário salvo com sucesso.', 'ok')
        await listarUsuarios()
        return
      }
      mostrarTela('tela-sucesso-card')
      document.getElementById('step2-indicator').className = 'step done'
    } else {
      mostrarToast('Erro: ' + resultado.erro)
    }
  } catch (erro) { mostrarToast('Erro: ' + erro.message) }
  finally {
    salvando = false
    document.getElementById('btn-voltar').disabled = false
    btn.disabled = false
    btn.textContent = modoGerenciamento ? 'Salvar usuário' : 'Finalizar cadastro'
  }
}

function novoCadastro() {
  modoGerenciamento = false
  usuarioEmEdicao = null
  barbeariaSelecionada = null
  mostrarTela('tela-barbearia')
  configurarFormularioUsuario()
  dadosBarbearia = null
  document.querySelectorAll('input').forEach(i => {
    i.value = ''
    i.classList.remove('campo-erro', 'campo-ok')
  })
  document.querySelectorAll('.field-hint').forEach(h => h.textContent = '')
  document.getElementById('u-nivel').value = 'admin'
  document.getElementById('b-timezone').value = 'America/Sao_Paulo'
  document.getElementById('tela-sucesso-card').style.display = 'none'
  document.getElementById('tela-barbearia').style.display = 'block'
  document.getElementById('step1-indicator').className = 'step active'
  document.getElementById('step1-indicator').querySelector('.step-dot').textContent = '1'
  document.getElementById('step2-indicator').className = 'step'
  document.getElementById('step-line').className = 'step-line'
}

document.addEventListener('DOMContentLoaded', () => {
  ativarValidacaoAoSair(['b-nome','b-telefone','b-abertura','b-fechamento','b-id-instance','b-token'])
  ativarValidacaoAoSair(['u-nome','u-usuario','u-senha'])
  atualizarIconeFullscreen()

  document.getElementById('btn-cancelar-modal').addEventListener('click', fecharModal)
  document.getElementById('btn-confirmar-saida').addEventListener('click', confirmarSaida)
  document.getElementById('btn-continuar').addEventListener('click', irParaPasso2)
  document.getElementById('btn-voltar').addEventListener('click', voltarPasso1)
  document.getElementById('btn-finalizar').addEventListener('click', finalizar)
  document.getElementById('btn-novo-cadastro').addEventListener('click', novoCadastro)
  document.getElementById('btn-ver-barbearias').addEventListener('click', listarBarbearias)
  document.getElementById('btn-lista-inicio').addEventListener('click', novoCadastro)
  document.getElementById('btn-atualizar-barbearias').addEventListener('click', listarBarbearias)
  document.getElementById('btn-usuarios-voltar').addEventListener('click', listarBarbearias)
  document.getElementById('btn-adicionar-usuario').addEventListener('click', () => abrirFormularioUsuario())
})

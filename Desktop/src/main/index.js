const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } = require('electron')
const path = require('path')
const mysql = require('mysql2/promise')
const bcrypt = require('bcryptjs')

const DB_CONFIG = {
  host: '72.62.115.30',
  user: 'root',
  password: 'GaFranco@2024',
  database: 'schema_barbearia'
}

let win
let tray = null

function criarJanela() {
  win = new BrowserWindow({
    fullscreen: false,
    frame: true,
    show: false,
    resizable: true,
    movable: true,
    minimizable: true,
    maximizable: true,
    closable: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  win.setMenuBarVisibility(false)
  win.maximize()
  win.once('ready-to-show', () => win.show())
  win.loadFile(path.join(__dirname, '../renderer/index.html'))

  const iconePath = path.join(__dirname, '../../Images/logikabots.png')
  const icone = nativeImage.createFromPath(iconePath).resize({ width: 32, height: 32 })

  tray = new Tray(icone)
  tray.setToolTip('Logika Bots')

  const menuTray = Menu.buildFromTemplate([
    {
      label: 'Abrir',
      click: () => { win.show() }
    },
    { type: 'separator' },
    {
      label: 'Sair',
      click: () => {
        app.isQuitting = true
        app.quit()
      }
    }
  ])

  tray.setContextMenu(menuTray)

  tray.on('double-click', () => { win.show() })

}

app.whenReady().then(criarJanela)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

ipcMain.handle('fechar-janela', () => {
  app.isQuitting = true
  win.destroy()
})

ipcMain.handle('minimizar-tray', () => {
  win.hide()
})

ipcMain.handle('toggle-fullscreen', () => {
  win.setFullScreen(!win.isFullScreen())
})

ipcMain.handle('get-fullscreen', () => {
  return win.isFullScreen()
})

ipcMain.handle('inserir-cadastro', async (event, { barbearia, usuario }) => {
  let conn
  try {
    validarUsuario(usuario, true)
    conn = await mysql.createConnection(DB_CONFIG)
    await conn.beginTransaction()

    const [resultBarbearia] = await conn.execute(
      `INSERT INTO barbearias
        (nome, telefone_whatsapp, horario_funcionamento_inicio, horario_funcionamento_fim,
         id_instance, token_evolution, timezone)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        barbearia.nome,
        barbearia.telefone_whatsapp,
        barbearia.horario_funcionamento_inicio,
        barbearia.horario_funcionamento_fim,
        barbearia.id_instance,
        barbearia.token_evolution,
        barbearia.timezone
      ]
    )

    const idBarbearia = resultBarbearia.insertId
    const senhaHashada = await bcrypt.hash(usuario.senha_hash, 10)

    await conn.execute(
      `INSERT INTO usuarios_admin
        (id_barbearia, nome, usuario, senha_hash, nivel)
       VALUES (?, ?, ?, ?, ?)`,
      [
        idBarbearia,
        usuario.nome,
        usuario.usuario,
        senhaHashada,
        usuario.nivel
      ]
    )

    await conn.commit()
    return { sucesso: true }
  } catch (err) {
    if (conn) await conn.rollback().catch(() => {})
    console.error('Erro no INSERT:', err)
    return { sucesso: false, erro: err.code === 'ER_DUP_ENTRY' ? 'Login ou dados da barbearia já cadastrados. Verifique os campos.' : err.message }
  } finally {
    if (conn) await conn.end()
  }
})

function validarId(id) {
  if (!/^[1-9]\d*$/.test(String(id))) throw new Error('Identificador inválido.')
}

function validarUsuario(usuario, novo) {
  if (!usuario || typeof usuario.nome !== 'string' || usuario.nome.trim().length < 3 ||
      usuario.nome.trim().split(/\s+/).length < 2 || usuario.nome.trim().length > 100) {
    throw new Error('Informe nome e sobrenome (até 100 caracteres).')
  }
  if (typeof usuario.usuario !== 'string' || !/^[a-zA-Z0-9_]{3,50}$/.test(usuario.usuario)) {
    throw new Error('Login deve ter de 3 a 50 caracteres: letras, números ou _.')
  }
  if (!['admin', 'gerente', 'atendente'].includes(usuario.nivel)) throw new Error('Nível de acesso inválido.')
  const senha = usuario.senha_hash
  if ((novo || senha) && (typeof senha !== 'string' || senha.length < 6 || !/[A-Za-z]/.test(senha) || !/[0-9]/.test(senha))) {
    throw new Error('Senha deve ter pelo menos 6 caracteres, uma letra e um número.')
  }
}

function registrarOperacao(canal, operacao) {
  ipcMain.handle(canal, async (event, dados) => {
    let conn
    try {
      conn = await mysql.createConnection(DB_CONFIG)
      return { sucesso: true, ...await operacao(conn, dados) }
    } catch (err) {
      return { sucesso: false, erro: err.code === 'ER_DUP_ENTRY' ? 'Este login já está em uso. Escolha outro.' : err.message }
    } finally {
      if (conn) await conn.end()
    }
  })
}

registrarOperacao('listar-barbearias', async (conn) => {
  const [barbearias] = await conn.execute(
    `SELECT b.id_barbearia, b.nome, b.telefone_whatsapp, COUNT(u.id_usuario) AS total_usuarios
     FROM barbearias b LEFT JOIN usuarios_admin u ON u.id_barbearia = b.id_barbearia
     GROUP BY b.id_barbearia, b.nome, b.telefone_whatsapp ORDER BY b.nome, b.id_barbearia`
  )
  return { barbearias }
})

registrarOperacao('listar-usuarios', async (conn, { id_barbearia }) => {
  validarId(id_barbearia)
  const [usuarios] = await conn.execute(
    'SELECT id_usuario, nome, usuario, nivel, ativo FROM usuarios_admin WHERE id_barbearia = ? ORDER BY nome, id_usuario',
    [id_barbearia]
  )
  return { usuarios }
})

registrarOperacao('salvar-usuario', async (conn, { id_barbearia, id_usuario, usuario }) => {
  validarId(id_barbearia)
  const novo = id_usuario == null
  if (!novo) validarId(id_usuario)
  validarUsuario(usuario, novo)
  const [barbearias] = await conn.execute('SELECT id_barbearia FROM barbearias WHERE id_barbearia = ?', [id_barbearia])
  if (!barbearias.length) throw new Error('Barbearia não encontrada.')
  const valores = [usuario.nome.trim(), usuario.usuario, usuario.nivel]
  let senhaSql = ''
  if (novo || usuario.senha_hash) {
    valores.push(await bcrypt.hash(usuario.senha_hash, 10))
    senhaSql = ', senha_hash = ?'
  }
  if (novo) {
    await conn.execute('INSERT INTO usuarios_admin (nome, usuario, nivel, senha_hash, id_barbearia) VALUES (?, ?, ?, ?, ?)', [...valores, id_barbearia])
  } else {
    const [existentes] = await conn.execute('SELECT id_usuario FROM usuarios_admin WHERE id_usuario = ? AND id_barbearia = ?', [id_usuario, id_barbearia])
    if (!existentes.length) throw new Error('Usuário não encontrado nesta barbearia.')
    await conn.execute(`UPDATE usuarios_admin SET nome = ?, usuario = ?, nivel = ?${senhaSql} WHERE id_usuario = ? AND id_barbearia = ?`, [...valores, id_usuario, id_barbearia])
  }
  return {}
})

registrarOperacao('alterar-status-usuario', async (conn, { id_barbearia, id_usuario, ativo }) => {
  validarId(id_barbearia)
  validarId(id_usuario)
  if (typeof ativo !== 'boolean') throw new Error('Status inválido.')
  const [resultado] = await conn.execute('UPDATE usuarios_admin SET ativo = ? WHERE id_usuario = ? AND id_barbearia = ?', [ativo ? 1 : 0, id_usuario, id_barbearia])
  if (!resultado.affectedRows) throw new Error('Usuário não encontrado nesta barbearia.')
  return {}
})

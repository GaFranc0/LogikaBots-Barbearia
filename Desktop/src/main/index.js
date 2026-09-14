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
    fullscreen: true,
    frame: false,
    resizable: true,
    movable: true,
    minimizable: false,
    maximizable: true,
    closable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  })

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

  win.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault()
      win.hide()
    }
  })
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
    conn = await mysql.createConnection(DB_CONFIG)

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

    return { sucesso: true }
  } catch (err) {
    console.error('Erro no INSERT:', err)
    return { sucesso: false, erro: err.message }
  } finally {
    if (conn) await conn.end()
  }
})

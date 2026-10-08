const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  listarBarbearias: () => ipcRenderer.invoke('listar-barbearias'),
  listarUsuarios: (dados) => ipcRenderer.invoke('listar-usuarios', dados),
  salvarUsuario: (dados) => ipcRenderer.invoke('salvar-usuario', dados),
  alterarStatusUsuario: (dados) => ipcRenderer.invoke('alterar-status-usuario', dados),
  inserirCadastro:  (dados) => ipcRenderer.invoke('inserir-cadastro', dados),
  fecharJanela:     ()      => ipcRenderer.invoke('fechar-janela'),
  minimizarTray:    ()      => ipcRenderer.invoke('minimizar-tray'),
  toggleFullscreen: ()      => ipcRenderer.invoke('toggle-fullscreen'),
  getFullscreen:    ()      => ipcRenderer.invoke('get-fullscreen')
})

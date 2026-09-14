const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  inserirCadastro:  (dados) => ipcRenderer.invoke('inserir-cadastro', dados),
  fecharJanela:     ()      => ipcRenderer.invoke('fechar-janela'),
  minimizarTray:    ()      => ipcRenderer.invoke('minimizar-tray'),
  toggleFullscreen: ()      => ipcRenderer.invoke('toggle-fullscreen'),
  getFullscreen:    ()      => ipcRenderer.invoke('get-fullscreen')
})

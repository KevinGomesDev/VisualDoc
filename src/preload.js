const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  saveData: (data) => ipcRenderer.invoke("save-data", data),
  loadData: () => ipcRenderer.invoke("load-data"),
  saveSVG: (svgContent) => ipcRenderer.invoke("save-svg", svgContent),
  exportSVG: (svgContent) => ipcRenderer.invoke("export-svg", svgContent),
  getDataPath: () => ipcRenderer.invoke("get-data-path"),
  getAppDirectory: () => ipcRenderer.invoke("get-app-directory"),
  setProjectName: (name) => ipcRenderer.invoke("set-project-name", name),
  getProjectName: () => ipcRenderer.invoke("get-project-name"),
  listProjects: () => ipcRenderer.invoke("list-projects"),
  saveProjectAs: (data) => ipcRenderer.invoke("save-project-as", data),
  loadProject: () => ipcRenderer.invoke("load-project"),
});

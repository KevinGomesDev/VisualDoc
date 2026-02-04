const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  saveData: (data) => ipcRenderer.invoke("save-data", data),
  loadData: () => ipcRenderer.invoke("load-data"),
  saveTXT: (txtContent) => ipcRenderer.invoke("save-txt", txtContent),
  openTXT: () => ipcRenderer.invoke("open-txt"),
  getDataPath: () => ipcRenderer.invoke("get-data-path"),
  getAppDirectory: () => ipcRenderer.invoke("get-app-directory"),
  setProjectName: (name) => ipcRenderer.invoke("set-project-name", name),
  getProjectName: () => ipcRenderer.invoke("get-project-name"),
  listProjects: () => ipcRenderer.invoke("list-projects"),
  saveProjectAs: (data) => ipcRenderer.invoke("save-project-as", data),
  loadProject: () => ipcRenderer.invoke("load-project"),
});

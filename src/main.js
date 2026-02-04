const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");

let mainWindow;
let currentProjectName = null;
let currentProjectPath = null;

// Pasta onde o executável está rodando
function getAppDirectory() {
  // Em desenvolvimento, usa a pasta do projeto
  // Em produção, usa a pasta onde o exe está
  if (app.isPackaged) {
    return path.dirname(app.getPath("exe"));
  }
  return process.cwd();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    backgroundColor: "#1a1a2e",
    icon: path.join(__dirname, "../assets/icon.png"),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  mainWindow.loadFile(path.join(__dirname, "renderer/index.html"));
  mainWindow.setMenuBarVisibility(false);
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC Handlers para salvar e carregar dados
ipcMain.handle("save-data", async (event, data) => {
  try {
    if (!currentProjectName) {
      return { success: false, error: "Nenhum projeto aberto" };
    }

    const appDir = getAppDirectory();
    const projectFile = path.join(appDir, `${currentProjectName}.vdoc`);
    const svgFile = path.join(appDir, `${currentProjectName}.svg`);

    // Salva o arquivo .vdoc
    fs.writeFileSync(projectFile, JSON.stringify(data, null, 2), "utf-8");

    // Atualiza o caminho atual
    currentProjectPath = projectFile;

    return { success: true, projectPath: projectFile };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Salvar SVG automaticamente
ipcMain.handle("save-svg", async (event, svgContent) => {
  try {
    if (!currentProjectName) {
      return { success: false, error: "Nenhum projeto aberto" };
    }

    const appDir = getAppDirectory();
    const svgFile = path.join(appDir, `${currentProjectName}.svg`);

    fs.writeFileSync(svgFile, svgContent, "utf-8");

    return { success: true, svgPath: svgFile };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("load-data", async () => {
  try {
    if (currentProjectPath && fs.existsSync(currentProjectPath)) {
      const data = fs.readFileSync(currentProjectPath, "utf-8");
      return { success: true, data: JSON.parse(data) };
    }
    return { success: true, data: null };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("export-svg", async (event, svgContent) => {
  try {
    const defaultName = currentProjectName || "visualdoc";
    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      title: "Exportar VisualDoc",
      defaultPath: `${defaultName}.svg`,
      filters: [
        { name: "SVG", extensions: ["svg"] },
        { name: "PNG", extensions: ["png"] },
      ],
    });

    if (filePath) {
      if (filePath.endsWith(".svg")) {
        fs.writeFileSync(filePath, svgContent, "utf-8");
      } else if (filePath.endsWith(".png")) {
        // Para PNG, salvamos o SVG e o usuário pode converter
        const svgPath = filePath.replace(".png", ".svg");
        fs.writeFileSync(svgPath, svgContent, "utf-8");
      }
      return { success: true, filePath };
    }
    return { success: false, cancelled: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("get-data-path", async () => {
  return currentProjectPath;
});

// Obter pasta do aplicativo
ipcMain.handle("get-app-directory", async () => {
  return getAppDirectory();
});

// Definir nome do projeto atual
ipcMain.handle("set-project-name", async (event, name) => {
  currentProjectName = name;
  const appDir = getAppDirectory();
  currentProjectPath = path.join(appDir, `${name}.vdoc`);

  // Atualiza título da janela
  mainWindow.setTitle(`VisualDoc - ${name}`);

  return { success: true, projectPath: currentProjectPath };
});

// Obter nome do projeto atual
ipcMain.handle("get-project-name", async () => {
  return currentProjectName;
});

// Listar projetos existentes na pasta
ipcMain.handle("list-projects", async () => {
  try {
    const appDir = getAppDirectory();
    const files = fs.readdirSync(appDir);
    const projects = files
      .filter((f) => f.endsWith(".vdoc"))
      .map((f) => f.replace(".vdoc", ""));
    return { success: true, projects };
  } catch (error) {
    return { success: false, error: error.message, projects: [] };
  }
});

// Salvar projeto como arquivo
ipcMain.handle("save-project-as", async (event, data) => {
  try {
    const defaultName = currentProjectName || "meu-projeto";
    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      title: "Salvar Projeto",
      defaultPath: `${defaultName}.vdoc`,
      filters: [{ name: "VisualDoc Project", extensions: ["vdoc"] }],
    });

    if (filePath) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
      return { success: true, filePath };
    }
    return { success: false, cancelled: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Carregar projeto de arquivo
ipcMain.handle("load-project", async () => {
  try {
    const { filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: "Carregar Projeto",
      filters: [{ name: "VisualDoc Project", extensions: ["vdoc"] }],
      properties: ["openFile"],
    });

    if (filePaths && filePaths.length > 0) {
      const data = fs.readFileSync(filePaths[0], "utf-8");
      currentProjectPath = filePaths[0];
      currentProjectName = path.basename(filePaths[0], ".vdoc");
      mainWindow.setTitle(`VisualDoc - ${currentProjectName}`);
      return {
        success: true,
        data: JSON.parse(data),
        filePath: filePaths[0],
        projectName: currentProjectName,
      };
    }
    return { success: false, cancelled: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

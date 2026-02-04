const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");

let mainWindow;
let currentProjectName = null;
let currentProjectPath = null;

// Pasta onde os projetos são salvos
function getAppDirectory() {
  // Em produção, usa a pasta de dados do usuário (AppData)
  // Em desenvolvimento, usa a pasta do projeto
  if (app.isPackaged) {
    // Usa AppData/VisualDoc para salvar os projetos
    const userDataPath = path.join(app.getPath("documents"), "VisualDoc");
    // Cria a pasta se não existir
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }
    return userDataPath;
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

    // Garante que a pasta existe
    if (!fs.existsSync(appDir)) {
      fs.mkdirSync(appDir, { recursive: true });
    }

    const projectFile = path.join(appDir, `${currentProjectName}.vdoc`);

    // PROTEÇÃO: Cria backup antes de salvar
    if (fs.existsSync(projectFile)) {
      const backupDir = path.join(appDir, ".backups");
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      // Mantém até 5 backups por projeto
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const backupFile = path.join(
        backupDir,
        `${currentProjectName}_${timestamp}.vdoc.bak`,
      );
      fs.copyFileSync(projectFile, backupFile);

      // Remove backups antigos (mantém os 5 mais recentes)
      const backups = fs
        .readdirSync(backupDir)
        .filter(
          (f) => f.startsWith(currentProjectName) && f.endsWith(".vdoc.bak"),
        )
        .sort()
        .reverse();

      if (backups.length > 5) {
        backups.slice(5).forEach((oldBackup) => {
          fs.unlinkSync(path.join(backupDir, oldBackup));
        });
      }
    }

    // Salva o arquivo .vdoc
    fs.writeFileSync(projectFile, JSON.stringify(data, null, 2), "utf-8");

    // Atualiza o caminho atual
    currentProjectPath = projectFile;

    return { success: true, projectPath: projectFile };
  } catch (error) {
    console.error("Erro ao salvar dados:", error);
    return { success: false, error: error.message };
  }
});

// Salvar TXT automaticamente
ipcMain.handle("save-txt", async (event, txtContent) => {
  try {
    if (!currentProjectName) {
      return { success: false, error: "Nenhum projeto aberto" };
    }

    const appDir = getAppDirectory();
    const txtFile = path.join(appDir, `${currentProjectName}.txt`);

    fs.writeFileSync(txtFile, txtContent, "utf-8");

    return { success: true, txtPath: txtFile };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Abrir arquivo TXT no programa padrão
ipcMain.handle("open-txt", async () => {
  try {
    if (!currentProjectName) {
      return { success: false, error: "Nenhum projeto aberto" };
    }

    const appDir = getAppDirectory();
    const txtFile = path.join(appDir, `${currentProjectName}.txt`);

    if (fs.existsSync(txtFile)) {
      const { shell } = require("electron");
      await shell.openPath(txtFile);
      return { success: true, txtPath: txtFile };
    }
    return { success: false, error: "Arquivo TXT não encontrado" };
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

ipcMain.handle("get-data-path", async () => {
  return currentProjectPath;
});

// Obter pasta do aplicativo
ipcMain.handle("get-app-directory", async () => {
  return getAppDirectory();
});

// Definir nome do projeto atual
ipcMain.handle("set-project-name", async (event, name) => {
  try {
    currentProjectName = name;
    const appDir = getAppDirectory();

    // Garante que a pasta existe
    if (!fs.existsSync(appDir)) {
      fs.mkdirSync(appDir, { recursive: true });
    }

    currentProjectPath = path.join(appDir, `${name}.vdoc`);

    // Cria arquivo inicial se não existir
    if (!fs.existsSync(currentProjectPath)) {
      const initialData = {
        cards: [],
        connections: [],
        categories: [
          { id: 1, name: "Geral", color: "#6c5ce7" },
          { id: 2, name: "Importante", color: "#e74c3c" },
          { id: 3, name: "Em Progresso", color: "#f39c12" },
          { id: 4, name: "Concluído", color: "#27ae60" },
        ],
        projectName: name,
        lastModified: new Date().toISOString(),
      };
      fs.writeFileSync(
        currentProjectPath,
        JSON.stringify(initialData, null, 2),
        "utf-8",
      );
    }

    // Atualiza título da janela
    mainWindow.setTitle(`VisualDoc - ${name}`);

    return { success: true, projectPath: currentProjectPath };
  } catch (error) {
    console.error("Erro ao definir nome do projeto:", error);
    return { success: false, error: error.message };
  }
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

// ==========================================
// Platform Abstraction Layer
// Suporta: Electron, Capacitor (Mobile), Browser
// ==========================================

class PlatformAPI {
  constructor() {
    this.platform = this.detectPlatform();
    this.currentProjectName = null;
    this.currentProjectPath = null;
  }

  detectPlatform() {
    if (window.electronAPI) {
      return "electron";
    } else if (window.Capacitor) {
      return "capacitor";
    } else {
      return "browser";
    }
  }

  isElectron() {
    return this.platform === "electron";
  }

  isCapacitor() {
    return this.platform === "capacitor";
  }

  isBrowser() {
    return this.platform === "browser";
  }

  isMobile() {
    return (
      this.platform === "capacitor" ||
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      )
    );
  }

  // ==========================================
  // Storage - Salvar/Carregar Dados
  // ==========================================

  async saveData(data) {
    if (this.isElectron()) {
      return await window.electronAPI.saveData(data);
    } else {
      // Browser/Capacitor - usa localStorage
      try {
        const key = `visualdoc_project_${this.currentProjectName || "default"}`;
        localStorage.setItem(key, JSON.stringify(data));
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
  }

  async loadData() {
    if (this.isElectron()) {
      return await window.electronAPI.loadData();
    } else {
      try {
        const key = `visualdoc_project_${this.currentProjectName || "default"}`;
        const data = localStorage.getItem(key);
        return { success: true, data: data ? JSON.parse(data) : null };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
  }

  // ==========================================
  // Projetos
  // ==========================================

  async setProjectName(name) {
    if (this.isElectron()) {
      return await window.electronAPI.setProjectName(name);
    } else {
      this.currentProjectName = name;
      localStorage.setItem("visualdoc_current_project", name);
      return { success: true, projectPath: `local://${name}` };
    }
  }

  async getProjectName() {
    if (this.isElectron()) {
      return await window.electronAPI.getProjectName();
    } else {
      return (
        this.currentProjectName ||
        localStorage.getItem("visualdoc_current_project")
      );
    }
  }

  async listProjects() {
    if (this.isElectron()) {
      return await window.electronAPI.listProjects();
    } else {
      try {
        const projects = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key.startsWith("visualdoc_project_")) {
            projects.push(key.replace("visualdoc_project_", ""));
          }
        }
        return { success: true, projects };
      } catch (error) {
        return { success: false, error: error.message, projects: [] };
      }
    }
  }

  async getAppDirectory() {
    if (this.isElectron()) {
      return await window.electronAPI.getAppDirectory();
    } else {
      return "localStorage://visualdoc";
    }
  }

  async getDataPath() {
    if (this.isElectron()) {
      return await window.electronAPI.getDataPath();
    } else {
      return `localStorage://visualdoc/${this.currentProjectName || "default"}`;
    }
  }

  // ==========================================
  // Salvar/Carregar Projeto Externo
  // ==========================================

  async saveProjectAs(data) {
    if (this.isElectron()) {
      return await window.electronAPI.saveProjectAs(data);
    } else {
      // Browser/Capacitor - download como arquivo
      try {
        const blob = new Blob([JSON.stringify(data, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${data.projectName || "projeto"}.vdoc`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
  }

  async loadProject() {
    if (this.isElectron()) {
      return await window.electronAPI.loadProject();
    } else {
      // Browser/Capacitor - file input
      return new Promise((resolve) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".vdoc";
        input.onchange = async (e) => {
          const file = e.target.files[0];
          if (file) {
            try {
              const text = await file.text();
              const data = JSON.parse(text);
              this.currentProjectName =
                data.projectName || file.name.replace(".vdoc", "");
              localStorage.setItem(
                "visualdoc_current_project",
                this.currentProjectName,
              );
              resolve({
                success: true,
                data,
                projectName: this.currentProjectName,
              });
            } catch (error) {
              resolve({ success: false, error: error.message });
            }
          } else {
            resolve({ success: false, cancelled: true });
          }
        };
        input.click();
      });
    }
  }

  // ==========================================
  // Exportação TXT
  // ==========================================

  async saveTXT(txtContent) {
    if (this.isElectron()) {
      return await window.electronAPI.saveTXT(txtContent);
    } else {
      try {
        const key = `visualdoc_txt_${this.currentProjectName || "default"}`;
        localStorage.setItem(key, txtContent);
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
  }

  async openTXT() {
    if (this.isElectron()) {
      return await window.electronAPI.openTXT();
    } else {
      // Browser/Capacitor - abre em nova aba ou download
      try {
        const key = `visualdoc_txt_${this.currentProjectName || "default"}`;
        const txtContent = localStorage.getItem(key);
        if (txtContent) {
          const blob = new Blob([txtContent], { type: "text/plain" });
          const url = URL.createObjectURL(blob);

          if (this.isMobile()) {
            // Mobile - download
            const a = document.createElement("a");
            a.href = url;
            a.download = `${this.currentProjectName || "projeto"}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          } else {
            // Browser - nova aba
            window.open(url, "_blank");
          }

          setTimeout(() => URL.revokeObjectURL(url), 1000);
          return { success: true };
        }
        return { success: false, error: "Arquivo não encontrado" };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
  }
}

// Instância global
window.platformAPI = new PlatformAPI();

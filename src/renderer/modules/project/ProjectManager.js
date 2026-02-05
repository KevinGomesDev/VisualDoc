// ==========================================
// ProjectManager - Gerenciamento de Projetos
// ==========================================

class ProjectManager {
  constructor(app) {
    this.app = app;
    this.currentProjectPath = null;
    this.projectName = null;
    this.saveTimeout = null;
    this.projectNameDisplay = document.getElementById("project-name-display");
  }

  // Atualiza o display do nome do projeto na interface
  updateProjectDisplay() {
    if (this.projectNameDisplay) {
      this.projectNameDisplay.textContent = this.projectName || "Sem projeto";
    }
  }

  // Verifica ou cria projeto
  async checkOrCreate() {
    const projectName = await window.electronAPI.getProjectName();

    if (projectName) {
      this.projectName = projectName;
      this.updateProjectDisplay();
      await this.loadData();
      return;
    }

    const result = await window.electronAPI.listProjects();
    const existingProjects = result.projects || [];
    await this.showSelectionModal(existingProjects);
  }

  // Mostra modal de seleção de projeto
  async showSelectionModal(existingProjects) {
    return new Promise((resolve) => {
      const modalOverlay = document.createElement("div");
      modalOverlay.className = "modal project-selection-modal";
      modalOverlay.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
          <div class="modal-header">
            <h2>📄 VisualDoc</h2>
          </div>
          <div class="modal-body" style="padding: 20px;">
            <div class="form-group" style="margin-bottom: 20px;">
              <label>Nome do Novo Projeto:</label>
              <input type="text" id="new-project-name" class="form-input" 
                     placeholder="Digite o nome do projeto..." 
                     style="width: 100%; padding: 10px; margin-top: 8px;">
            </div>
            <button id="btn-create-project" class="btn btn-primary" style="width: 100%; padding: 12px; font-size: 1rem;">
              ✨ Criar Novo Projeto
            </button>
            
            ${
              existingProjects.length > 0
                ? `
              <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid var(--border-color);">
                <label style="margin-bottom: 10px; display: block;">Ou abrir projeto existente:</label>
                <div class="existing-projects" style="max-height: 200px; overflow-y: auto;">
                  ${existingProjects
                    .map(
                      (name) => `
                    <button class="btn btn-secondary existing-project-btn" data-name="${name}" 
                            style="width: 100%; margin-bottom: 8px; text-align: left; padding: 10px;">
                      📁 ${name}
                    </button>
                  `,
                    )
                    .join("")}
                </div>
              </div>
            `
                : ""
            }
            
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--border-color);">
              <button id="btn-load-other-project" class="btn btn-secondary" style="width: 100%;">
                📂 Carregar outro arquivo .vdoc
              </button>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(modalOverlay);

      const nameInput = modalOverlay.querySelector("#new-project-name");
      const createBtn = modalOverlay.querySelector("#btn-create-project");
      const loadOtherBtn = modalOverlay.querySelector(
        "#btn-load-other-project",
      );

      setTimeout(() => nameInput.focus(), 100);

      const createProject = async () => {
        const name = nameInput.value.trim();
        if (!name) {
          nameInput.style.borderColor = "var(--danger)";
          return;
        }

        const safeName = name.replace(/[<>:"/\\|?*]/g, "-");
        await window.electronAPI.setProjectName(safeName);
        this.projectName = safeName;
        this.updateProjectDisplay();
        await this.loadData();
        modalOverlay.remove();
        resolve();
      };

      createBtn.addEventListener("click", createProject);
      nameInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") createProject();
      });

      modalOverlay.querySelectorAll(".existing-project-btn").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const name = btn.dataset.name;
          await window.electronAPI.setProjectName(name);
          this.projectName = name;
          this.updateProjectDisplay();
          await this.loadData();
          modalOverlay.remove();
          resolve();
        });
      });

      loadOtherBtn.addEventListener("click", async () => {
        const result = await window.electronAPI.loadProject();
        if (result.success && result.data) {
          this.app.cards = result.data.cards || [];
          this.app.connections = result.data.connections || [];
          if (result.data.categories && result.data.categories.length > 0) {
            this.app.categories = result.data.categories;
          }
          this.projectName = result.projectName;
          this.updateProjectDisplay();
          this.currentProjectPath = result.filePath;
          modalOverlay.remove();
          resolve();
        }
      });
    });
  }

  // Carrega dados do projeto
  async loadData() {
    try {
      const result = await window.electronAPI.loadData();
      if (result.success && result.data) {
        this.app.cards = result.data.cards || [];
        this.app.connections = result.data.connections || [];
        this.app.texts = result.data.texts || [];
        this.app.columns = result.data.columns || [];

        // Migrate old connections
        this.app.connections = this.app.connections.map((conn) => {
          if (!conn.id) {
            conn.id = `conn_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
          }
          if (!conn.waypoints) conn.waypoints = [];
          if (!conn.fixedFromPoint) conn.fixedFromPoint = null;
          if (!conn.fixedToPoint) conn.fixedToPoint = null;
          return conn;
        });

        if (result.data.categories && result.data.categories.length > 0) {
          this.app.categories = result.data.categories;
        }
      }

      // Inicializa histórico
      this.app.historyManager.init({
        cards: this.app.cards,
        connections: this.app.connections,
        texts: this.app.texts,
        columns: this.app.columns,
        categories: this.app.categories,
      });
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
  }

  // Salva dados do projeto
  async saveData() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    this.app.saveStatus.textContent = "⏳ Salvando...";
    this.app.saveStatus.classList.add("saving");

    this.saveTimeout = setTimeout(async () => {
      try {
        const data = {
          cards: this.app.cards,
          connections: this.app.connections,
          texts: this.app.texts,
          columns: this.app.columns,
          categories: this.app.categories,
          projectName: this.projectName,
          lastModified: new Date().toISOString(),
        };

        await window.electronAPI.saveData(data);

        // Salva o mapa em TXT automaticamente
        await this.app.exportManager.saveTextMap();

        this.app.saveStatus.textContent = "✓ Salvo";
        this.app.saveStatus.classList.remove("saving");
      } catch (error) {
        console.error("Erro ao salvar dados:", error);
        this.app.saveStatus.textContent = "❌ Erro ao salvar";
      }
    }, 500);

    // Salva estado no histórico
    if (!this.app.historyManager.isInUndoRedo()) {
      this.app.historyManager.save({
        cards: this.app.cards,
        connections: this.app.connections,
        texts: this.app.texts,
        columns: this.app.columns,
        categories: this.app.categories,
      });
    }
  }

  // Salva dados sem histórico (para undo/redo)
  async saveDataWithoutHistory() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    this.app.saveStatus.textContent = "⏳ Salvando...";
    this.app.saveStatus.classList.add("saving");

    this.saveTimeout = setTimeout(async () => {
      try {
        const data = {
          cards: this.app.cards,
          connections: this.app.connections,
          texts: this.app.texts,
          columns: this.app.columns,
          categories: this.app.categories,
          projectName: this.projectName,
          lastModified: new Date().toISOString(),
        };

        await window.electronAPI.saveData(data);

        this.app.saveStatus.textContent = "✓ Salvo";
        this.app.saveStatus.classList.remove("saving");
      } catch (error) {
        console.error("Erro ao salvar dados:", error);
        this.app.saveStatus.textContent = "❌ Erro ao salvar";
      }
    }, 500);
  }

  // Novo projeto
  async newProject() {
    if (this.projectName) {
      await this.saveData();
    }

    const name = await this.promptProjectName();
    if (!name) return;

    const safeName = name.replace(/[<>:"/\\|?*]/g, "-");
    await window.electronAPI.setProjectName(safeName);
    this.projectName = safeName;
    this.updateProjectDisplay();

    this.app.cards = [];
    this.app.connections = [];
    this.app.texts = [];
    this.app.columns = [];
    this.currentProjectPath = null;

    this.app.historyManager.init({
      cards: [],
      connections: [],
      texts: [],
      columns: [],
      categories: this.app.categories,
    });

    this.app.render();
    this.app.canvasManager.resetView();
    this.saveData();
  }

  // Prompt para nome do projeto
  promptProjectName() {
    return new Promise((resolve) => {
      const modalOverlay = document.createElement("div");
      modalOverlay.className = "modal";
      modalOverlay.innerHTML = `
        <div class="modal-content" style="max-width: 400px;">
          <div class="modal-header">
            <h2>Novo Projeto</h2>
          </div>
          <div class="modal-body" style="padding: 20px;">
            <div class="form-group">
              <label>Nome do Projeto:</label>
              <input type="text" id="prompt-project-name" class="form-input" 
                     placeholder="Digite o nome do projeto..." 
                     style="width: 100%; padding: 10px; margin-top: 8px;">
            </div>
            <div style="display: flex; gap: 10px; margin-top: 20px;">
              <button id="btn-prompt-create" class="btn btn-primary" style="flex: 1;">
                Criar
              </button>
              <button id="btn-prompt-cancel" class="btn btn-secondary" style="flex: 1;">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(modalOverlay);

      const nameInput = modalOverlay.querySelector("#prompt-project-name");
      const createBtn = modalOverlay.querySelector("#btn-prompt-create");
      const cancelBtn = modalOverlay.querySelector("#btn-prompt-cancel");

      setTimeout(() => nameInput.focus(), 100);

      createBtn.addEventListener("click", () => {
        const name = nameInput.value.trim();
        modalOverlay.remove();
        resolve(name || null);
      });

      cancelBtn.addEventListener("click", () => {
        modalOverlay.remove();
        resolve(null);
      });

      nameInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          const name = nameInput.value.trim();
          modalOverlay.remove();
          resolve(name || null);
        }
        if (e.key === "Escape") {
          modalOverlay.remove();
          resolve(null);
        }
      });
    });
  }

  // Carregar projeto
  async loadProject() {
    try {
      const result = await window.electronAPI.loadProject();
      if (result.success && result.data) {
        this.app.cards = result.data.cards || [];
        this.app.connections = result.data.connections || [];
        this.app.texts = result.data.texts || [];
        this.app.columns = result.data.columns || [];
        if (result.data.categories && result.data.categories.length > 0) {
          this.app.categories = result.data.categories;
        }
        this.currentProjectPath = result.filePath;
        this.projectName = result.projectName;
        this.updateProjectDisplay();

        this.app.historyManager.init({
          cards: this.app.cards,
          connections: this.app.connections,
          texts: this.app.texts,
          columns: this.app.columns,
          categories: this.app.categories,
        });

        this.app.render();
        this.app.canvasManager.resetView();
      }
    } catch (error) {
      console.error("Erro ao carregar projeto:", error);
    }
  }

  // Salvar projeto como
  async saveProjectAs() {
    try {
      const data = {
        cards: this.app.cards,
        connections: this.app.connections,
        texts: this.app.texts,
        columns: this.app.columns,
        categories: this.app.categories,
        lastModified: new Date().toISOString(),
      };

      const result = await window.electronAPI.saveProjectAs(data);
      if (result.success) {
        this.currentProjectPath = result.filePath;
        this.app.saveStatus.textContent = "✓ Projeto salvo";
      }
    } catch (error) {
      console.error("Erro ao salvar projeto:", error);
    }
  }
}

// Exporta para uso global
window.ProjectManager = ProjectManager;

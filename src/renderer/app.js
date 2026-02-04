// ==========================================
// VisualDoc - Aplicativo de Documentação Visual
// ==========================================

class VisualDocApp {
  constructor() {
    this.cards = [];
    this.connections = [];
    this.categories = [
      { id: "cat-1", name: "Geral", color: "#6c5ce7" },
      { id: "cat-2", name: "Frontend", color: "#00b894" },
      { id: "cat-3", name: "Backend", color: "#e17055" },
      { id: "cat-4", name: "Design", color: "#fdcb6e" },
    ];
    this.selectedCardId = null;
    this.selectedCardIds = []; // Multi-seleção
    this.clipboard = []; // Cards copiados
    this.selectedCategoryIds = [];
    this.isDragging = false;
    this.isPanning = false;
    this.isConnecting = false;
    this.isDraggingConnector = false;
    this.isResizing = false;
    this.resizingCardId = null;
    this.resizeStart = { width: 0, height: 0, mouseX: 0, mouseY: 0 };
    this.dragOffset = { x: 0, y: 0 };
    this.panStart = { x: 0, y: 0 };
    this.connectingFromCard = null;
    this.connectingFromChecklist = null;
    this.zoom = 1;
    this.pan = { x: 0, y: 0 };
    this.saveTimeout = null;
    this.currentProjectPath = null;
    this.projectName = null;

    // Histórico para undo/redo
    this.history = [];
    this.historyIndex = -1;
    this.maxHistory = 50;
    this.isUndoRedo = false;

    this.init();
  }

  async init() {
    this.bindElements();
    this.bindEvents();
    this.loadTheme();

    // Verifica se há um projeto aberto ou pede para criar/abrir um
    await this.checkOrCreateProject();

    this.render();
  }

  bindElements() {
    // Containers
    this.cardsContainer = document.getElementById("cards-container");
    this.connectionsLayer = document.getElementById("connections-layer");
    this.canvasContainer = document.getElementById("canvas-container");

    // Toolbar
    this.btnExport = document.getElementById("btn-export");
    this.btnToggleTheme = document.getElementById("btn-toggle-theme");
    this.btnNewProject = document.getElementById("btn-new-project");
    this.btnLoadProject = document.getElementById("btn-load-project");
    this.btnSaveProject = document.getElementById("btn-save-project");
    this.saveStatus = document.getElementById("save-status");
    this.themeIconDark = document.getElementById("theme-icon-dark");
    this.themeIconLight = document.getElementById("theme-icon-light");

    // Modal
    this.cardModal = document.getElementById("card-modal");
    this.modalTitle = document.getElementById("modal-title");
    this.cardTitleInput = document.getElementById("card-title");
    this.categoryButtons = document.getElementById("category-buttons");
    this.checklistsContainer = document.getElementById("checklists-container");
    this.cardDetailsInput = document.getElementById("card-details");
    this.btnCloseModal = document.getElementById("btn-close-modal");
    this.btnDeleteCard = document.getElementById("btn-delete-card");
    this.btnAddChecklist = document.getElementById("btn-add-checklist");

    // Categories Modal
    this.btnCategories = document.getElementById("btn-categories");
    this.categoriesModal = document.getElementById("categories-modal");
    this.btnCloseCategories = document.getElementById("btn-close-categories");
    this.btnCloseCategoriesFooter = document.getElementById(
      "btn-close-categories-footer",
    );
    this.newCategoryName = document.getElementById("new-category-name");
    this.newCategoryColor = document.getElementById("new-category-color");
    this.btnAddCategory = document.getElementById("btn-add-category");
    this.categoriesList = document.getElementById("categories-list");

    // Context Menu
    this.contextMenu = document.getElementById("context-menu");
    this.ctxConnect = document.getElementById("ctx-connect");
    this.ctxDisconnect = document.getElementById("ctx-disconnect");
    this.ctxEdit = document.getElementById("ctx-edit");
    this.ctxDelete = document.getElementById("ctx-delete");

    // Canvas Context Menu
    this.canvasContextMenu = document.getElementById("canvas-context-menu");
    this.ctxNewCard = document.getElementById("ctx-new-card");
    this.ctxNewText = document.getElementById("ctx-new-text");
    this.ctxNewColumn = document.getElementById("ctx-new-column");
  }

  bindEvents() {
    // Toolbar events
    this.btnExport.addEventListener("click", () => this.exportSVG());
    this.btnToggleTheme.addEventListener("click", () => this.toggleTheme());
    this.btnNewProject.addEventListener("click", () => this.newProject());
    this.btnLoadProject.addEventListener("click", () => this.loadProject());
    this.btnSaveProject.addEventListener("click", () => this.saveProjectAs());
    this.btnCategories.addEventListener("click", () =>
      this.openCategoriesModal(),
    );

    // Categories Modal events
    this.btnCloseCategories.addEventListener("click", () =>
      this.closeCategoriesModal(),
    );
    this.btnCloseCategoriesFooter.addEventListener("click", () =>
      this.closeCategoriesModal(),
    );
    this.btnAddCategory.addEventListener("click", () => this.addCategory());

    // Modal events
    this.btnCloseModal.addEventListener("click", () => this.closeModal());
    this.btnDeleteCard.addEventListener("click", () =>
      this.deleteSelectedCard(),
    );
    this.btnAddChecklist.addEventListener("click", () =>
      this.addChecklistInput(),
    );

    // Canvas events
    this.canvasContainer.addEventListener("mousedown", (e) =>
      this.onCanvasMouseDown(e),
    );
    this.canvasContainer.addEventListener("contextmenu", (e) =>
      this.onCanvasContextMenu(e),
    );
    document.addEventListener("mousemove", (e) => this.onMouseMove(e));
    document.addEventListener("mouseup", (e) => this.onMouseUp(e));
    this.canvasContainer.addEventListener("wheel", (e) => this.onWheel(e));

    // Context menu events
    this.ctxConnect.addEventListener("click", () => this.startConnecting());
    this.ctxDisconnect.addEventListener("click", () => this.disconnectCard());
    this.ctxEdit.addEventListener("click", () => this.editSelectedCard());
    this.ctxDelete.addEventListener("click", () => this.deleteSelectedCard());

    // Canvas context menu events
    this.ctxNewCard.addEventListener("click", () => this.createNewCard());
    this.ctxNewText.addEventListener("click", () => this.createNewText());
    this.ctxNewColumn.addEventListener("click", () => this.createNewColumn());

    // Close context menu on click outside
    document.addEventListener("click", (e) => {
      if (!this.contextMenu.contains(e.target)) {
        this.hideContextMenu();
      }
      if (!this.canvasContextMenu.contains(e.target)) {
        this.hideCanvasContextMenu();
      }
    });

    // Close modal on Escape, undo/redo, copy/paste
    document.addEventListener("keydown", (e) => {
      // Ignora se estiver em input/textarea
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") {
        if (e.key === "Escape") {
          this.closeModal();
          this.hideContextMenu();
          this.hideCanvasContextMenu();
        }
        return;
      }

      if (e.key === "Escape") {
        this.closeModal();
        this.hideContextMenu();
        this.hideCanvasContextMenu();
        this.cancelConnecting();
        this.clearSelection();
      }
      // Undo: Ctrl+Z
      if (e.ctrlKey && e.key === "z") {
        e.preventDefault();
        this.undo();
      }
      // Redo: Ctrl+Y
      if (e.ctrlKey && e.key === "y") {
        e.preventDefault();
        this.redo();
      }
      // Copy: Ctrl+C
      if (e.ctrlKey && e.key === "c") {
        e.preventDefault();
        this.copySelectedCards();
      }
      // Paste: Ctrl+V
      if (e.ctrlKey && e.key === "v") {
        e.preventDefault();
        this.pasteCards();
      }
      // Select All: Ctrl+A
      if (e.ctrlKey && e.key === "a") {
        e.preventDefault();
        this.selectAllCards();
      }
      // Delete selected cards
      if (e.key === "Delete" && this.selectedCardIds.length > 0) {
        e.preventDefault();
        this.deleteSelectedCards();
      }
    });
  }

  // ==========================================
  // Project Initialization
  // ==========================================

  async checkOrCreateProject() {
    // Verifica se já tem um projeto aberto
    const projectName = await window.electronAPI.getProjectName();

    if (projectName) {
      this.projectName = projectName;
      await this.loadData();
      return;
    }

    // Lista projetos existentes
    const result = await window.electronAPI.listProjects();
    const existingProjects = result.projects || [];

    // Mostra modal para criar ou abrir projeto
    await this.showProjectSelectionModal(existingProjects);
  }

  async showProjectSelectionModal(existingProjects) {
    return new Promise((resolve) => {
      // Cria modal de seleção de projeto
      const modalOverlay = document.createElement("div");
      modalOverlay.className = "modal project-selection-modal";
      modalOverlay.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
          <div class="modal-header">
            <h2>� VisualDoc</h2>
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

      // Foca no input
      setTimeout(() => nameInput.focus(), 100);

      // Criar novo projeto
      const createProject = async () => {
        const name = nameInput.value.trim();
        if (!name) {
          nameInput.style.borderColor = "var(--danger)";
          return;
        }

        // Remove caracteres inválidos para nome de arquivo
        const safeName = name.replace(/[<>:"/\\|?*]/g, "-");

        const result = await window.electronAPI.setProjectName(safeName);
        this.projectName = safeName;

        // Carrega os dados iniciais do arquivo criado
        await this.loadData();

        modalOverlay.remove();
        resolve();
      };

      createBtn.addEventListener("click", createProject);
      nameInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") createProject();
      });

      // Abrir projeto existente da lista
      modalOverlay.querySelectorAll(".existing-project-btn").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const name = btn.dataset.name;
          await window.electronAPI.setProjectName(name);
          this.projectName = name;
          await this.loadData();
          modalOverlay.remove();
          resolve();
        });
      });

      // Carregar outro arquivo
      loadOtherBtn.addEventListener("click", async () => {
        const result = await window.electronAPI.loadProject();
        if (result.success && result.data) {
          this.cards = result.data.cards || [];
          this.connections = result.data.connections || [];
          if (result.data.categories && result.data.categories.length > 0) {
            this.categories = result.data.categories;
          }
          this.projectName = result.projectName;
          this.currentProjectPath = result.filePath;
          modalOverlay.remove();
          resolve();
        }
      });
    });
  }

  // ==========================================
  // Data Management
  // ==========================================

  async loadData() {
    try {
      const result = await window.electronAPI.loadData();
      if (result.success && result.data) {
        this.cards = result.data.cards || [];
        this.connections = result.data.connections || [];
        if (result.data.categories && result.data.categories.length > 0) {
          this.categories = result.data.categories;
        }
      }
      // Inicializa histórico com estado atual
      this.history = [
        {
          cards: JSON.parse(JSON.stringify(this.cards)),
          connections: JSON.parse(JSON.stringify(this.connections)),
        },
      ];
      this.historyIndex = 0;
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
  }

  async saveData() {
    // Debounce para evitar salvamentos excessivos
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    this.saveStatus.textContent = "⏳ Salvando...";
    this.saveStatus.classList.add("saving");

    this.saveTimeout = setTimeout(async () => {
      try {
        const data = {
          cards: this.cards,
          connections: this.connections,
          categories: this.categories,
          projectName: this.projectName,
          lastModified: new Date().toISOString(),
        };

        await window.electronAPI.saveData(data);

        this.saveStatus.textContent = "✓ Salvo";
        this.saveStatus.classList.remove("saving");
      } catch (error) {
        console.error("Erro ao salvar dados:", error);
        this.saveStatus.textContent = "❌ Erro ao salvar";
      }
    }, 500);

    // Salva estado no histórico (para undo/redo)
    if (!this.isUndoRedo) {
      this.saveToHistory();
    }
  }

  saveToHistory() {
    // Remove estados futuros se estamos no meio do histórico
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }

    // Salva cópia profunda do estado atual
    const state = {
      cards: JSON.parse(JSON.stringify(this.cards)),
      connections: JSON.parse(JSON.stringify(this.connections)),
    };

    this.history.push(state);

    // Limita tamanho do histórico
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    } else {
      this.historyIndex++;
    }
  }

  undo() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.restoreFromHistory();
    }
  }

  redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      this.restoreFromHistory();
    }
  }

  restoreFromHistory() {
    const state = this.history[this.historyIndex];
    if (state) {
      this.isUndoRedo = true;
      this.cards = JSON.parse(JSON.stringify(state.cards));
      this.connections = JSON.parse(JSON.stringify(state.connections));
      this.render();

      // Salva no arquivo (mas não adiciona ao histórico)
      this.saveDataWithoutHistory();
      this.isUndoRedo = false;
    }
  }

  async saveDataWithoutHistory() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    this.saveStatus.textContent = "⏳ Salvando...";
    this.saveStatus.classList.add("saving");

    this.saveTimeout = setTimeout(async () => {
      try {
        const data = {
          cards: this.cards,
          connections: this.connections,
          lastModified: new Date().toISOString(),
        };

        await window.electronAPI.saveData(data);

        this.saveStatus.textContent = "✓ Salvo";
        this.saveStatus.classList.remove("saving");
      } catch (error) {
        console.error("Erro ao salvar dados:", error);
        this.saveStatus.textContent = "❌ Erro ao salvar";
      }
    }, 500);
  }

  // ==========================================
  // Card Management
  // ==========================================

  createNewCard() {
    const id = this.generateId();
    const containerRect = this.canvasContainer.getBoundingClientRect();

    // Usa a primeira categoria disponível
    const defaultCategory = this.categories[0] || {
      id: "cat-1",
      name: "Geral",
      color: "#6c5ce7",
    };

    const card = {
      id,
      title: "Novo Card",
      categoryIds: [defaultCategory.id],
      categoryId: defaultCategory.id, // Compatibilidade
      category: defaultCategory.name,
      details: "",
      color: defaultCategory.color,
      x: (containerRect.width / 2 - 140) / this.zoom - this.pan.x,
      y: (containerRect.height / 2 - 60) / this.zoom - this.pan.y,
      checklists: [],
    };

    this.cards.push(card);
    this.renderCard(card);
    this.saveData();

    // Abre modal para edição imediata
    this.selectedCardId = id;
    this.openModal(card);
  }

  renderCard(card) {
    const existingElement = document.getElementById(`card-${card.id}`);
    if (existingElement) {
      existingElement.remove();
    }

    const cardElement = document.createElement("div");
    cardElement.className = "card";
    cardElement.id = `card-${card.id}`;
    cardElement.style.left = `${card.x}px`;
    cardElement.style.top = `${card.y}px`;
    cardElement.style.borderColor = this.getCardPrimaryColor(card);

    // Aplica tamanho personalizado se existir
    if (card.width) cardElement.style.width = `${card.width}px`;
    if (card.height) cardElement.style.minHeight = `${card.height}px`;

    const completedCount = card.checklists.filter((c) => c.completed).length;
    const totalCount = card.checklists.length;
    const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

    cardElement.innerHTML = `
      <div class="card-connector top" data-side="top" data-card-id="${card.id}"></div>
      <div class="card-connector bottom" data-side="bottom" data-card-id="${card.id}"></div>
      <div class="card-connector left" data-side="left" data-card-id="${card.id}"></div>
      <div class="card-connector right" data-side="right" data-card-id="${card.id}"></div>
      <div class="card-resize-handle"></div>
      ${card.details ? `<div class="card-tooltip">${this.escapeHtml(card.details)}</div>` : ""}
      <div class="card-header">
        <span class="card-title">${this.escapeHtml(card.title)}</span>
        <div class="card-categories">
          ${this.getCardCategories(card)
            .map(
              (cat) => `
            <span class="card-category" style="background-color: ${cat.color}20; color: ${cat.color}">
              ${this.escapeHtml(cat.name)}
            </span>
          `,
            )
            .join("")}
        </div>
      </div>
      ${
        card.checklists.length > 0
          ? `
        <div class="card-checklists">
          ${card.checklists
            .map((checklist) => {
              const itemCategory = checklist.categoryId
                ? this.categories.find((c) => c.id === checklist.categoryId)
                : null;
              const itemStyle = itemCategory
                ? `border-left: 3px solid ${itemCategory.color}; background: linear-gradient(90deg, ${itemCategory.color}15 0%, transparent 100%);`
                : "";
              const categoryLabel = itemCategory
                ? `<span class="checklist-category-label" style="background-color: ${itemCategory.color}30; color: ${itemCategory.color}">${this.escapeHtml(itemCategory.name)}</span>`
                : "";
              return `
            <div class="card-checklist-item ${checklist.completed ? "completed" : ""}" 
                 data-checklist-id="${checklist.id}" 
                 data-card-id="${card.id}"
                 style="${itemStyle}">
              <div class="checklist-item-content">
                <input type="checkbox" ${checklist.completed ? "checked" : ""}>
                <span>${this.escapeHtml(checklist.name)}</span>
                ${categoryLabel}
              </div>
              <div class="checklist-connector" 
                   data-checklist-id="${checklist.id}" 
                   data-card-id="${card.id}"
                   title="Conectar"></div>
              ${checklist.details ? `<div class="checklist-tooltip">${this.escapeHtml(checklist.details)}</div>` : ""}
            </div>
          `;
            })
            .join("")}
        </div>
        <div class="card-progress">
          <div class="card-progress-bar" style="width: ${progress}%"></div>
        </div>
      `
          : ""
      }
    `;

    // Event listeners para o card
    cardElement.addEventListener("mousedown", (e) =>
      this.onCardMouseDown(e, card.id),
    );
    cardElement.addEventListener("dblclick", (e) =>
      this.onCardDoubleClick(e, card.id),
    );
    cardElement.addEventListener("contextmenu", (e) =>
      this.onCardContextMenu(e, card.id),
    );

    // Event listeners para checkboxes
    cardElement
      .querySelectorAll('.card-checklist-item input[type="checkbox"]')
      .forEach((checkbox, index) => {
        checkbox.addEventListener("change", (e) => {
          e.stopPropagation();
          this.toggleChecklist(
            card.id,
            card.checklists[index].id,
            checkbox.checked,
          );
        });
      });

    // Event listeners para conectores do card
    cardElement.querySelectorAll(".card-connector").forEach((connector) => {
      connector.addEventListener("mousedown", (e) =>
        this.onConnectorMouseDown(e, card.id),
      );
    });

    // Event listeners para conectores de checklist
    cardElement
      .querySelectorAll(".checklist-connector")
      .forEach((connector) => {
        connector.addEventListener("mousedown", (e) => {
          e.stopPropagation();
          const checklistId = connector.dataset.checklistId;
          const cardId = connector.dataset.cardId;
          this.onChecklistConnectorMouseDown(e, cardId, checklistId);
        });
      });

    // Event listener para resize
    const resizeHandle = cardElement.querySelector(".card-resize-handle");
    if (resizeHandle) {
      resizeHandle.addEventListener("mousedown", (e) =>
        this.onResizeMouseDown(e, card.id),
      );
    }

    this.cardsContainer.appendChild(cardElement);
  }

  toggleChecklist(cardId, checklistId, completed) {
    const card = this.cards.find((c) => c.id === cardId);
    if (card) {
      const checklist = card.checklists.find((c) => c.id === checklistId);
      if (checklist) {
        checklist.completed = completed;
        this.renderCard(card);
        this.saveData();
      }
    }
  }

  updateCardPosition(cardId, x, y) {
    const card = this.cards.find((c) => c.id === cardId);
    if (card) {
      card.x = x;
      card.y = y;
      this.saveData();
    }
  }

  deleteCard(cardId) {
    this.cards = this.cards.filter((c) => c.id !== cardId);
    // Remove conexões usando fromCardId/toCardId para suportar conexões de checklist
    this.connections = this.connections.filter((conn) => {
      const fromCard = conn.fromCardId || conn.from;
      const toCard = conn.toCardId || conn.to;
      return fromCard !== cardId && toCard !== cardId;
    });

    const element = document.getElementById(`card-${cardId}`);
    if (element) {
      element.remove();
    }

    this.renderConnections();
    this.saveData();
  }

  // ==========================================
  // Connection Management
  // ==========================================

  addConnection(
    fromCardId,
    toCardId,
    fromChecklistId = null,
    toChecklistId = null,
  ) {
    // Cria identificadores únicos para a conexão
    const fromId = fromChecklistId
      ? `${fromCardId}:${fromChecklistId}`
      : fromCardId;
    const toId = toChecklistId ? `${toCardId}:${toChecklistId}` : toCardId;

    // Evita conexões duplicadas
    const exists = this.connections.some(
      (conn) =>
        (conn.from === fromId && conn.to === toId) ||
        (conn.from === toId && conn.to === fromId),
    );

    if (!exists && fromId !== toId) {
      this.connections.push({
        from: fromId,
        to: toId,
        fromCardId: fromCardId,
        toCardId: toCardId,
        fromChecklistId: fromChecklistId,
        toChecklistId: toChecklistId,
      });
      this.renderConnections();
      this.saveData();
    }
  }

  removeConnection(fromId, toId) {
    this.connections = this.connections.filter(
      (conn) =>
        !(conn.from === fromId && conn.to === toId) &&
        !(conn.from === toId && conn.to === fromId),
    );
    this.renderConnections();
    this.saveData();
  }

  removeAllConnectionsFromCard(cardId) {
    this.connections = this.connections.filter(
      (conn) => conn.fromCardId !== cardId && conn.toCardId !== cardId,
    );
    this.renderConnections();
    this.saveData();
  }

  renderConnections() {
    this.connectionsLayer.innerHTML = "";

    // Adiciona definição de marcador de seta
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    defs.innerHTML = `
      <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
        <polygon points="0 0, 10 3.5, 0 7" class="connection-arrow" />
      </marker>
      <marker id="arrowhead-item" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
        <polygon points="0 0, 10 3.5, 0 7" class="connection-arrow" />
      </marker>
    `;
    this.connectionsLayer.appendChild(defs);

    // Cria dois grupos: um para conexões de card, outro para conexões de item
    const cardConnectionsGroup = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "g",
    );
    cardConnectionsGroup.setAttribute("class", "card-connections-group");

    const itemConnectionsGroup = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "g",
    );
    itemConnectionsGroup.setAttribute("class", "item-connections-group");

    this.connections.forEach((conn) => {
      // Suporta formato antigo (só cardId) e novo (com checklistId)
      const fromCardId = conn.fromCardId || conn.from;
      const toCardId = conn.toCardId || conn.to;
      const fromChecklistId = conn.fromChecklistId || null;
      const toChecklistId = conn.toChecklistId || null;

      const fromCard = this.cards.find((c) => c.id === fromCardId);
      const toCard = this.cards.find((c) => c.id === toCardId);

      if (fromCard && toCard) {
        const isItemConnection = fromChecklistId || toChecklistId;
        const targetGroup = isItemConnection
          ? itemConnectionsGroup
          : cardConnectionsGroup;
        this.drawConnection(
          fromCard,
          toCard,
          fromChecklistId,
          toChecklistId,
          targetGroup,
        );
      }
    });

    // Adiciona grupos na ordem: primeiro cards, depois items (ficam por cima)
    this.connectionsLayer.appendChild(cardConnectionsGroup);
    this.connectionsLayer.appendChild(itemConnectionsGroup);
  }

  drawConnection(
    fromCard,
    toCard,
    fromChecklistId = null,
    toChecklistId = null,
    targetGroup = null,
  ) {
    const fromElement = document.getElementById(`card-${fromCard.id}`);
    const toElement = document.getElementById(`card-${toCard.id}`);

    if (!fromElement || !toElement) return;

    const isItemConnection = fromChecklistId || toChecklistId;

    // Calcula posição de origem
    let fromX, fromY, fromWidth, fromHeight;

    if (fromChecklistId) {
      // Conectando de um item de checklist
      const checklistItem = fromElement.querySelector(
        `[data-checklist-id="${fromChecklistId}"]`,
      );
      if (checklistItem) {
        const connector = checklistItem.querySelector(".checklist-connector");
        if (connector) {
          // Usa offsetLeft/offsetTop relativos ao card
          const itemRect = checklistItem.getBoundingClientRect();
          const cardRect = fromElement.getBoundingClientRect();
          const connectorRect = connector.getBoundingClientRect();

          // Posição do conector relativa ao card + posição do card
          fromX =
            fromCard.x +
            (connectorRect.left - cardRect.left + connectorRect.width / 2) /
              this.zoom;
          fromY =
            fromCard.y +
            (connectorRect.top - cardRect.top + connectorRect.height / 2) /
              this.zoom;
        } else {
          // Fallback para o item
          const itemRect = checklistItem.getBoundingClientRect();
          const cardRect = fromElement.getBoundingClientRect();

          fromX = fromCard.x + (itemRect.right - cardRect.left) / this.zoom;
          fromY =
            fromCard.y +
            (itemRect.top - cardRect.top + itemRect.height / 2) / this.zoom;
        }
      }
    } else {
      // Conectando do card
      fromWidth = fromElement.offsetWidth || 280;
      fromHeight = fromElement.offsetHeight || 100;
    }

    // Calcula posição de destino
    let toX, toY, toWidth, toHeight;

    if (toChecklistId) {
      // Conectando a um item de checklist
      const checklistItem = toElement.querySelector(
        `[data-checklist-id="${toChecklistId}"]`,
      );
      if (checklistItem) {
        const connector = checklistItem.querySelector(".checklist-connector");
        if (connector) {
          // Usa offsetLeft/offsetTop relativos ao card
          const itemRect = checklistItem.getBoundingClientRect();
          const cardRect = toElement.getBoundingClientRect();
          const connectorRect = connector.getBoundingClientRect();

          // Posição do conector relativa ao card + posição do card
          toX =
            toCard.x +
            (connectorRect.left - cardRect.left + connectorRect.width / 2) /
              this.zoom;
          toY =
            toCard.y +
            (connectorRect.top - cardRect.top + connectorRect.height / 2) /
              this.zoom;
        } else {
          const itemRect = checklistItem.getBoundingClientRect();
          const cardRect = toElement.getBoundingClientRect();

          toX = toCard.x + (itemRect.left - cardRect.left) / this.zoom;
          toY =
            toCard.y +
            (itemRect.top - cardRect.top + itemRect.height / 2) / this.zoom;
        }
      }
    } else {
      // Conectando ao card
      toWidth = toElement.offsetWidth || 280;
      toHeight = toElement.offsetHeight || 100;
    }

    // Se ainda não temos posições definidas, calcula baseado nos cards
    if (fromX === undefined || toX === undefined) {
      fromWidth = fromWidth || fromElement.offsetWidth || 280;
      fromHeight = fromHeight || fromElement.offsetHeight || 100;
      toWidth = toWidth || toElement.offsetWidth || 280;
      toHeight = toHeight || toElement.offsetHeight || 100;

      const fromCenterX = fromCard.x + fromWidth / 2;
      const fromCenterY = fromCard.y + fromHeight / 2;
      const toCenterX = toCard.x + toWidth / 2;
      const toCenterY = toCard.y + toHeight / 2;

      const dx = toCenterX - fromCenterX;
      const dy = toCenterY - fromCenterY;

      if (fromX === undefined) {
        if (Math.abs(dx) > Math.abs(dy)) {
          if (dx > 0) {
            fromX = fromCard.x + fromWidth;
            fromY = fromCard.y + fromHeight / 2;
          } else {
            fromX = fromCard.x;
            fromY = fromCard.y + fromHeight / 2;
          }
        } else {
          if (dy > 0) {
            fromX = fromCard.x + fromWidth / 2;
            fromY = fromCard.y + fromHeight;
          } else {
            fromX = fromCard.x + fromWidth / 2;
            fromY = fromCard.y;
          }
        }
      }

      if (toX === undefined) {
        if (Math.abs(dx) > Math.abs(dy)) {
          if (dx > 0) {
            toX = toCard.x;
            toY = toCard.y + toHeight / 2;
          } else {
            toX = toCard.x + toWidth;
            toY = toCard.y + toHeight / 2;
          }
        } else {
          if (dy > 0) {
            toX = toCard.x + toWidth / 2;
            toY = toCard.y;
          } else {
            toX = toCard.x + toWidth / 2;
            toY = toCard.y + toHeight;
          }
        }
      }
    }

    // Cria curva bezier
    const dx = toX - fromX;
    const dy = toY - fromY;
    let pathD;

    if (Math.abs(dx) > Math.abs(dy)) {
      const midX = (fromX + toX) / 2;
      pathD = `M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`;
    } else {
      const midY = (fromY + toY) / 2;
      pathD = `M ${fromX} ${fromY} C ${fromX} ${midY}, ${toX} ${midY}, ${toX} ${toY}`;
    }

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", pathD);
    path.setAttribute(
      "class",
      isItemConnection ? "connection-line item-connection" : "connection-line",
    );
    path.setAttribute("marker-end", "url(#arrowhead)");
    path.style.stroke = this.getCardPrimaryColor(fromCard);

    // Adiciona ao grupo correto
    if (targetGroup) {
      targetGroup.appendChild(path);
    } else {
      this.connectionsLayer.appendChild(path);
    }
  }

  // ==========================================
  // Mouse Events
  // ==========================================

  onCanvasMouseDown(e) {
    // Se clicou no fundo, inicia pan
    if (
      e.target === this.canvasContainer ||
      e.target === this.cardsContainer ||
      e.target.id === "connections-layer"
    ) {
      this.hideContextMenu();
      this.hideCanvasContextMenu();

      // Se está no modo de conexão, cancela
      if (this.isConnecting) {
        this.cancelConnecting();
        return;
      }

      // Limpa seleção ao clicar no fundo (se não for Ctrl)
      if (!e.ctrlKey) {
        this.clearSelection();
      }

      // Inicia pan da câmera
      if (e.button === 0) {
        this.isPanning = true;
        this.panStart = {
          x: e.clientX - this.pan.x,
          y: e.clientY - this.pan.y,
        };
        this.canvasContainer.style.cursor = "grabbing";
      }
    }
  }

  onCardMouseDown(e, cardId) {
    if (e.target.classList.contains("card-connector")) return;
    if (e.target.tagName === "INPUT") return;
    if (e.button === 2) return; // Right click

    e.preventDefault();

    if (this.isConnecting) {
      // Se estamos no modo de conexão, conecta os cards
      if (this.connectingFromCard !== cardId) {
        this.addConnection(this.connectingFromCard, cardId);
      }
      this.cancelConnecting();
      return;
    }

    // Multi-seleção com Ctrl
    if (e.ctrlKey) {
      if (this.selectedCardIds.includes(cardId)) {
        // Remove da seleção
        this.selectedCardIds = this.selectedCardIds.filter(
          (id) => id !== cardId,
        );
        const cardElement = document.getElementById(`card-${cardId}`);
        if (cardElement) cardElement.classList.remove("selected");
      } else {
        // Adiciona à seleção
        this.selectedCardIds.push(cardId);
        const cardElement = document.getElementById(`card-${cardId}`);
        if (cardElement) cardElement.classList.add("selected");
      }
      this.selectedCardId = cardId;
      return;
    }

    // Clique normal - limpa seleção se o card não está selecionado
    if (!this.selectedCardIds.includes(cardId)) {
      this.clearSelection();
      this.selectedCardIds = [cardId];
    }

    this.isDragging = true;
    this.selectedCardId = cardId;

    const card = this.cards.find((c) => c.id === cardId);
    const cardElement = document.getElementById(`card-${cardId}`);

    // Salva offset para cada card selecionado
    this.dragOffsets = {};
    this.selectedCardIds.forEach((id) => {
      const c = this.cards.find((card) => card.id === id);
      if (c) {
        this.dragOffsets[id] = {
          x: e.clientX - c.x,
          y: e.clientY - c.y,
        };
      }
    });

    this.dragOffset = {
      x: e.clientX - card.x,
      y: e.clientY - card.y,
    };

    // Marca todos os selecionados como dragging
    this.selectedCardIds.forEach((id) => {
      const el = document.getElementById(`card-${id}`);
      if (el) el.classList.add("dragging", "selected");
    });
  }

  onCardDoubleClick(e, cardId) {
    e.preventDefault();
    const card = this.cards.find((c) => c.id === cardId);
    if (card) {
      this.selectedCardId = cardId;
      this.openModal(card);
    }
  }

  onCardContextMenu(e, cardId) {
    e.preventDefault();
    this.selectedCardId = cardId;
    this.showContextMenu(e.clientX, e.clientY);
  }

  onCanvasContextMenu(e) {
    // Se clicou no fundo (não em um card), mostra menu do canvas
    if (
      e.target === this.canvasContainer ||
      e.target === this.cardsContainer ||
      e.target.id === "connections-layer"
    ) {
      e.preventDefault();
      this.hideContextMenu(); // Esconde menu de card se estiver aberto
      this.showCanvasContextMenu(e.clientX, e.clientY);
    }
  }

  onConnectorMouseDown(e, cardId) {
    e.preventDefault();
    e.stopPropagation();
    this.isDraggingConnector = true;
    this.connectingFromChecklist = null;
    this.startConnectingFrom(cardId);
  }

  onChecklistConnectorMouseDown(e, cardId, checklistId) {
    e.preventDefault();
    e.stopPropagation();
    this.isDraggingConnector = true;
    this.connectingFromChecklist = checklistId;
    this.startConnectingFrom(cardId, checklistId);
  }

  onResizeMouseDown(e, cardId) {
    e.preventDefault();
    e.stopPropagation();

    const cardElement = document.getElementById(`card-${cardId}`);
    if (!cardElement) return;

    this.isResizing = true;
    this.resizingCardId = cardId;
    this.resizeStart = {
      width: cardElement.offsetWidth,
      height: cardElement.offsetHeight,
      mouseX: e.clientX,
      mouseY: e.clientY,
    };

    cardElement.classList.add("resizing");
  }

  onMouseMove(e) {
    // Resize de card
    if (this.isResizing && this.resizingCardId) {
      const card = this.cards.find((c) => c.id === this.resizingCardId);
      const cardElement = document.getElementById(
        `card-${this.resizingCardId}`,
      );

      if (card && cardElement) {
        const deltaX = (e.clientX - this.resizeStart.mouseX) / this.zoom;
        const deltaY = (e.clientY - this.resizeStart.mouseY) / this.zoom;

        const newWidth = Math.max(200, this.resizeStart.width + deltaX);
        const newHeight = Math.max(100, this.resizeStart.height + deltaY);

        cardElement.style.width = `${newWidth}px`;
        cardElement.style.minHeight = `${newHeight}px`;

        card.width = newWidth;
        card.height = newHeight;

        this.renderConnections();
      }
      return;
    }

    // Pan da câmera
    if (this.isPanning) {
      this.pan.x = e.clientX - this.panStart.x;
      this.pan.y = e.clientY - this.panStart.y;
      this.applyTransform();
      return;
    }

    // Arrastar cards (suporta múltiplos)
    if (this.isDragging && this.selectedCardIds.length > 0) {
      this.selectedCardIds.forEach((cardId) => {
        const card = this.cards.find((c) => c.id === cardId);
        const cardElement = document.getElementById(`card-${cardId}`);
        const offset = this.dragOffsets?.[cardId] || this.dragOffset;

        if (card && cardElement && offset) {
          card.x = e.clientX - offset.x;
          card.y = e.clientY - offset.y;

          cardElement.style.left = `${card.x}px`;
          cardElement.style.top = `${card.y}px`;
        }
      });

      this.renderConnections();
    }
  }

  onMouseUp(e) {
    // Finaliza resize
    if (this.isResizing && this.resizingCardId) {
      const cardElement = document.getElementById(
        `card-${this.resizingCardId}`,
      );
      if (cardElement) {
        cardElement.classList.remove("resizing");
      }
      this.isResizing = false;
      this.resizingCardId = null;
      this.saveData();
      return;
    }

    // Finaliza pan
    if (this.isPanning) {
      this.isPanning = false;
      this.canvasContainer.style.cursor = "default";
    }

    // Finaliza conexão por drag
    if (this.isDraggingConnector && this.isConnecting) {
      // Verifica se soltou sobre um card ou checklist
      const target = document.elementFromPoint(e.clientX, e.clientY);

      // Verifica se soltou sobre um checklist connector
      const checklistConnector = target?.closest(".checklist-connector");
      const checklistItem = target?.closest(".card-checklist-item");
      const cardElement = target?.closest(".card");

      if (checklistConnector || checklistItem) {
        // Conectar a um checklist
        const targetChecklistId =
          checklistConnector?.dataset.checklistId ||
          checklistItem?.dataset.checklistId;
        const targetCardId =
          checklistConnector?.dataset.cardId || checklistItem?.dataset.cardId;

        if (targetCardId && targetChecklistId) {
          // Evita conectar ao mesmo item
          if (
            !(
              targetCardId === this.connectingFromCard &&
              targetChecklistId === this.connectingFromChecklist
            )
          ) {
            this.addConnection(
              this.connectingFromCard,
              targetCardId,
              this.connectingFromChecklist,
              targetChecklistId,
            );
          }
        }
      } else if (cardElement) {
        const targetCardId = cardElement.id.replace("card-", "");
        // Evita conectar ao mesmo card quando não há checklist envolvido
        if (
          targetCardId !== this.connectingFromCard ||
          this.connectingFromChecklist
        ) {
          this.addConnection(
            this.connectingFromCard,
            targetCardId,
            this.connectingFromChecklist,
            null,
          );
        }
      }
      this.cancelConnecting();
      this.isDraggingConnector = false;
    }

    // Finaliza drag de cards (múltiplos)
    if (this.isDragging && this.selectedCardIds.length > 0) {
      this.selectedCardIds.forEach((cardId) => {
        const cardElement = document.getElementById(`card-${cardId}`);
        if (cardElement) {
          cardElement.classList.remove("dragging");
        }
      });
      this.dragOffsets = {};
      this.saveData();
    }
    this.isDragging = false;
  }

  onWheel(e) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    this.adjustZoom(delta);
  }

  // ==========================================
  // Connection Mode
  // ==========================================

  startConnecting() {
    this.hideContextMenu();
    this.startConnectingFrom(this.selectedCardId);
  }

  startConnectingFrom(cardId, checklistId = null) {
    this.isConnecting = true;
    this.connectingFromCard = cardId;
    this.connectingFromChecklist = checklistId;
    this.canvasContainer.classList.add("connecting-mode");

    const cardElement = document.getElementById(`card-${cardId}`);
    if (cardElement) {
      cardElement.classList.add("connecting");

      // Se está conectando de um checklist, destaca o item
      if (checklistId) {
        const checklistItem = cardElement.querySelector(
          `[data-checklist-id="${checklistId}"]`,
        );
        if (checklistItem) {
          checklistItem.classList.add("connecting");
        }
      }
    }
  }

  cancelConnecting() {
    this.isConnecting = false;
    this.canvasContainer.classList.remove("connecting-mode");

    if (this.connectingFromCard) {
      const cardElement = document.getElementById(
        `card-${this.connectingFromCard}`,
      );
      if (cardElement) {
        cardElement.classList.remove("connecting");
        // Remove destaque do checklist
        cardElement
          .querySelectorAll(".card-checklist-item.connecting")
          .forEach((item) => {
            item.classList.remove("connecting");
          });
      }
    }
    this.connectingFromCard = null;
    this.connectingFromChecklist = null;
  }

  disconnectCard() {
    this.hideContextMenu();
    if (this.selectedCardId) {
      this.removeAllConnectionsFromCard(this.selectedCardId);
    }
  }

  // ==========================================
  // Context Menu
  // ==========================================

  showContextMenu(x, y) {
    this.hideCanvasContextMenu(); // Esconde menu do canvas se estiver aberto
    this.contextMenu.classList.remove("hidden");
    this.contextMenu.style.left = `${x}px`;
    this.contextMenu.style.top = `${y}px`;
  }

  hideContextMenu() {
    this.contextMenu.classList.add("hidden");
  }

  showCanvasContextMenu(x, y) {
    this.hideContextMenu(); // Esconde menu de card se estiver aberto
    this.canvasContextMenu.classList.remove("hidden");
    this.canvasContextMenu.style.left = `${x}px`;
    this.canvasContextMenu.style.top = `${y}px`;
  }

  hideCanvasContextMenu() {
    this.canvasContextMenu.classList.add("hidden");
  }

  // ==========================================
  // Modal
  // ==========================================

  openModal(card) {
    this.selectedCardId = card.id;
    // Suporta formato antigo e novo
    this.selectedCategoryIds =
      card.categoryIds || (card.categoryId ? [card.categoryId] : []);
    this.cardModal.classList.remove("hidden");
    this.modalTitle.textContent = card.title ? "Editar Card" : "Novo Card";
    this.cardTitleInput.value = card.title;
    this.cardDetailsInput.value = card.details || "";

    // Renderiza botões de categoria
    this.renderCategoryButtons();

    this.renderChecklistInputs(card.checklists);
  }

  renderCategoryButtons() {
    this.categoryButtons.innerHTML = "";

    this.categories.forEach((cat) => {
      const isSelected = this.selectedCategoryIds.includes(cat.id);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `category-btn ${isSelected ? "selected" : ""}`;
      btn.style.backgroundColor = isSelected ? cat.color : "transparent";
      btn.style.borderColor = cat.color;
      btn.style.color = isSelected ? "#fff" : cat.color;
      btn.textContent = cat.name;
      btn.dataset.categoryId = cat.id;

      btn.addEventListener("click", () => {
        if (this.selectedCategoryIds.includes(cat.id)) {
          // Remove a categoria (mantém pelo menos uma)
          if (this.selectedCategoryIds.length > 1) {
            this.selectedCategoryIds = this.selectedCategoryIds.filter(
              (id) => id !== cat.id,
            );
          }
        } else {
          // Adiciona a categoria
          this.selectedCategoryIds.push(cat.id);
        }
        this.renderCategoryButtons();
      });

      this.categoryButtons.appendChild(btn);
    });
  }

  closeModal() {
    this.cardModal.classList.add("hidden");
    this.selectedCardId = null;
    this.selectedCategoryIds = [];
  }

  renderChecklistInputs(checklists) {
    this.checklistsContainer.innerHTML = "";
    checklists.forEach((checklist) => {
      this.addChecklistInput(checklist);
    });
  }

  addChecklistInput(checklist = null) {
    const id = checklist?.id || this.generateId();
    const div = document.createElement("div");
    div.className = "checklist-item";
    div.dataset.id = id;

    // Gera opções de categorias
    const categoryOptions = this.categories
      .map(
        (cat) =>
          `<option value="${cat.id}" ${checklist?.categoryId === cat.id ? "selected" : ""}>${this.escapeHtml(cat.name)}</option>`,
      )
      .join("");

    div.innerHTML = `
      <div class="checklist-item-header">
        <input type="text" class="checklist-name" placeholder="Nome do item" value="${checklist ? this.escapeHtml(checklist.name) : ""}">
        <select class="checklist-category-select" title="Categoria do item">
          <option value="">Sem categoria</option>
          ${categoryOptions}
        </select>
        <button class="btn-toggle-details" title="Descrição">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
            <path d="m15 5 4 4"/>
          </svg>
        </button>
        <button class="btn-remove-checklist" title="Remover">&times;</button>
      </div>
      <div class="checklist-item-details ${checklist?.details ? "" : "hidden"}">
        <textarea class="checklist-details" placeholder="Descrição do item (aparece ao passar o mouse)">${checklist?.details ? this.escapeHtml(checklist.details) : ""}</textarea>
      </div>
    `;

    div.querySelector(".btn-remove-checklist").addEventListener("click", () => {
      div.remove();
    });

    div.querySelector(".btn-toggle-details").addEventListener("click", () => {
      const detailsDiv = div.querySelector(".checklist-item-details");
      detailsDiv.classList.toggle("hidden");
    });

    this.checklistsContainer.appendChild(div);
  }

  saveCardFromModal() {
    const card = this.cards.find((c) => c.id === this.selectedCardId);
    if (!card) return;

    // Salva categorias selecionadas (múltiplas)
    const categoryIds =
      this.selectedCategoryIds.length > 0
        ? this.selectedCategoryIds
        : [this.categories[0]?.id].filter(Boolean);

    card.title = this.cardTitleInput.value || "Sem título";
    card.categoryIds = categoryIds;
    // Mantém compatibilidade com formato antigo
    card.categoryId = categoryIds[0] || null;
    card.category =
      this.categories.find((c) => c.id === categoryIds[0])?.name || "Geral";
    card.color = this.getCardPrimaryColor(card);
    card.details = this.cardDetailsInput.value || "";

    // Coleta checklists preservando dados existentes
    const oldChecklists = [...card.checklists];
    card.checklists = [];
    this.checklistsContainer
      .querySelectorAll(".checklist-item")
      .forEach((item) => {
        const name =
          item.querySelector(".checklist-name")?.value ||
          item.querySelector('input[type="text"]').value;
        const detailsTextarea = item.querySelector(".checklist-details");
        const details = detailsTextarea ? detailsTextarea.value : "";
        const categorySelect = item.querySelector(".checklist-category-select");
        const categoryId = categorySelect?.value || null;

        if (name.trim()) {
          // Preserva o estado completed do checklist existente
          const existingChecklist = oldChecklists.find(
            (c) => c.id === item.dataset.id,
          );
          card.checklists.push({
            id: item.dataset.id,
            name: name.trim(),
            details: details.trim(),
            completed: existingChecklist?.completed || false,
            categoryId: categoryId,
          });
        }
      });

    this.renderCard(card);
    this.renderConnections();
    this.saveData();
    this.closeModal();
  }

  editSelectedCard() {
    this.hideContextMenu();
    const card = this.cards.find((c) => c.id === this.selectedCardId);
    if (card) {
      this.openModal(card);
    }
  }

  deleteSelectedCard() {
    this.hideContextMenu();
    const cardIdToDelete = this.selectedCardId;
    this.cardModal.classList.add("hidden"); // Fecha modal sem limpar selectedCardId
    if (cardIdToDelete) {
      this.deleteCard(cardIdToDelete);
      this.selectedCardId = null;
      this.selectedCategoryIds = [];
    }
  }

  // ==========================================
  // Zoom & Pan
  // ==========================================

  adjustZoom(delta) {
    this.zoom = Math.max(0.5, Math.min(2, this.zoom + delta));
    this.applyTransform();
  }

  applyTransform() {
    const transform = `translate(${this.pan.x}px, ${this.pan.y}px) scale(${this.zoom})`;
    this.cardsContainer.style.transform = transform;
    this.connectionsLayer.style.transform = transform;
  }

  resetView() {
    this.zoom = 1;
    this.pan = { x: 0, y: 0 };
    this.applyTransform();
  }

  // ==========================================
  // Theme Management
  // ==========================================

  toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute("data-theme");
    const newTheme = currentTheme === "light" ? "dark" : "light";

    html.setAttribute("data-theme", newTheme === "dark" ? "" : "light");

    // Toggle icons
    if (newTheme === "light") {
      this.themeIconDark.classList.add("hidden");
      this.themeIconLight.classList.remove("hidden");
    } else {
      this.themeIconDark.classList.remove("hidden");
      this.themeIconLight.classList.add("hidden");
    }

    // Salva preferência
    localStorage.setItem("visualdoc-theme", newTheme);
  }

  loadTheme() {
    const savedTheme = localStorage.getItem("visualdoc-theme") || "dark";
    const html = document.documentElement;

    if (savedTheme === "light") {
      html.setAttribute("data-theme", "light");
      this.themeIconDark.classList.add("hidden");
      this.themeIconLight.classList.remove("hidden");
    } else {
      html.removeAttribute("data-theme");
      this.themeIconDark.classList.remove("hidden");
      this.themeIconLight.classList.add("hidden");
    }
  }

  // ==========================================
  // Project Management
  // ==========================================

  async newProject() {
    // Salva o projeto atual primeiro
    if (this.projectName) {
      await this.saveData();
    }

    // Pede nome do novo projeto
    const name = await this.promptProjectName();
    if (!name) return;

    // Remove caracteres inválidos
    const safeName = name.replace(/[<>:"/\\|?*]/g, "-");

    await window.electronAPI.setProjectName(safeName);
    this.projectName = safeName;

    // Limpa tudo
    this.cards = [];
    this.connections = [];
    this.currentProjectPath = null;

    // Inicializa histórico
    this.history = [
      {
        cards: [],
        connections: [],
      },
    ];
    this.historyIndex = 0;

    this.render();
    this.resetView();
    this.saveData();
  }

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

  async loadProject() {
    try {
      const result = await window.electronAPI.loadProject();
      if (result.success && result.data) {
        this.cards = result.data.cards || [];
        this.connections = result.data.connections || [];
        if (result.data.categories && result.data.categories.length > 0) {
          this.categories = result.data.categories;
        }
        this.currentProjectPath = result.filePath;
        this.projectName = result.projectName;

        // Inicializa histórico
        this.history = [
          {
            cards: JSON.parse(JSON.stringify(this.cards)),
            connections: JSON.parse(JSON.stringify(this.connections)),
          },
        ];
        this.historyIndex = 0;

        this.render();
        this.resetView();
      }
    } catch (error) {
      console.error("Erro ao carregar projeto:", error);
    }
  }

  async saveProjectAs() {
    try {
      const data = {
        cards: this.cards,
        connections: this.connections,
        categories: this.categories,
        lastModified: new Date().toISOString(),
      };

      const result = await window.electronAPI.saveProjectAs(data);
      if (result.success) {
        this.currentProjectPath = result.filePath;
        this.saveStatus.textContent = "✓ Projeto salvo";
      }
    } catch (error) {
      console.error("Erro ao salvar projeto:", error);
    }
  }

  // ==========================================
  // Export
  // ==========================================

  async exportSVG() {
    const svgContent = this.generateSVG();
    await window.electronAPI.exportSVG(svgContent);
  }

  generateSVG() {
    // Calcula bounds baseado no tamanho real dos cards
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    this.cards.forEach((card) => {
      const cardWidth = card.width || 280;
      const cardHeight =
        card.height || Math.max(120, 80 + card.checklists.length * 22);
      minX = Math.min(minX, card.x);
      minY = Math.min(minY, card.y);
      maxX = Math.max(maxX, card.x + cardWidth);
      maxY = Math.max(maxY, card.y + cardHeight);
    });

    const padding = 50;
    const width = maxX - minX + padding * 2;
    const height = maxY - minY + padding * 2;
    const offsetX = -minX + padding;
    const offsetY = -minY + padding;

    let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
      <polygon points="0 0, 10 3.5, 0 7" fill="#6c5ce7"/>
    </marker>
  </defs>
  
  <rect width="100%" height="100%" fill="#0f0f1a"/>
  
  <!-- Connections -->
  <g id="connections">`;

    // Desenha conexões
    this.connections.forEach((conn) => {
      const fromCard = this.cards.find((c) => c.id === conn.from);
      const toCard = this.cards.find((c) => c.id === conn.to);

      if (fromCard && toCard) {
        const fromCardWidth = fromCard.width || 280;
        const fromCardHeight =
          fromCard.height ||
          Math.max(120, 80 + fromCard.checklists.length * 22);
        const toCardHeight =
          toCard.height || Math.max(120, 80 + toCard.checklists.length * 22);

        const fromX = fromCard.x + fromCardWidth + offsetX;
        const fromY = fromCard.y + fromCardHeight / 2 + offsetY;
        const toX = toCard.x + offsetX;
        const toY = toCard.y + toCardHeight / 2 + offsetY;
        const midX = (fromX + toX) / 2;

        svg += `
    <path d="M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}" 
          stroke="${fromCard.color}" stroke-width="3" fill="none" 
          stroke-linecap="round" marker-end="url(#arrowhead)"/>`;
      }
    });

    svg += `
  </g>
  
  <!-- Cards -->
  <g id="cards">`;

    // Desenha cards
    this.cards.forEach((card) => {
      const x = card.x + offsetX;
      const y = card.y + offsetY;
      const cardWidth = card.width || 280;
      const cardHeight =
        card.height || Math.max(120, 80 + card.checklists.length * 22);
      const completedCount = card.checklists.filter((c) => c.completed).length;
      const totalCount = card.checklists.length;
      const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

      svg += `
    <g transform="translate(${x}, ${y})">
      <rect width="${cardWidth}" height="${cardHeight}" rx="12" fill="#1a1a2e" stroke="${card.color}" stroke-width="2"/>
      <text x="15" y="28" fill="#ffffff" font-family="Segoe UI, sans-serif" font-size="16" font-weight="600">${this.escapeHtml(card.title)}</text>
      <rect x="15" y="38" width="80" height="18" rx="9" fill="${card.color}" opacity="0.2"/>
      <text x="25" y="51" fill="${card.color}" font-family="Segoe UI, sans-serif" font-size="10" font-weight="500">${this.escapeHtml(card.category.toUpperCase())}</text>`;

      // Desenha cada item do checklist
      if (card.checklists.length > 0) {
        card.checklists.forEach((item, index) => {
          const itemY = 70 + index * 22;
          const textColor = item.completed ? "#6b7280" : "#e5e7eb";
          const checkColor = item.completed ? "#2ecc71" : "#4b5563";

          // Checkbox
          svg += `
      <rect x="15" y="${itemY}" width="14" height="14" rx="3" fill="${checkColor}" opacity="0.3" stroke="${checkColor}" stroke-width="1"/>`;

          // Checkmark se completado
          if (item.completed) {
            svg += `
      <path d="M ${18} ${itemY + 7} l 3 3 l 5 -6" stroke="#2ecc71" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
          }

          // Texto do item
          const textDecoration = item.completed ? "line-through" : "none";
          svg += `
      <text x="35" y="${itemY + 11}" fill="${textColor}" font-family="Segoe UI, sans-serif" font-size="12" text-decoration="${textDecoration}">${this.escapeHtml(item.name)}</text>`;
        });

        // Barra de progresso no final
        const progressY = 70 + card.checklists.length * 22 + 5;
        svg += `
      <rect x="15" y="${progressY}" width="${cardWidth - 30}" height="4" rx="2" fill="#25253a"/>
      <rect x="15" y="${progressY}" width="${(progress / 100) * (cardWidth - 30)}" height="4" rx="2" fill="#2ecc71"/>`;
      }

      svg += `
    </g>`;
    });

    svg += `
  </g>
</svg>`;

    return svg;
  }

  // ==========================================
  // Rendering
  // ==========================================

  render() {
    this.cardsContainer.innerHTML = "";
    this.cards.forEach((card) => this.renderCard(card));
    this.renderConnections();
  }

  // ==========================================
  // Categories Management
  // ==========================================

  openCategoriesModal() {
    this.categoriesModal.classList.remove("hidden");
    this.renderCategoriesList();
    this.newCategoryName.value = "";
    this.newCategoryColor.value = "#6366f1";
  }

  closeCategoriesModal() {
    this.categoriesModal.classList.add("hidden");
  }

  renderCategoriesList() {
    this.categoriesList.innerHTML = "";

    this.categories.forEach((cat) => {
      const item = document.createElement("div");
      item.className = "category-list-item";
      item.innerHTML = `
        <input type="color" class="category-color-input" value="${cat.color}" title="Alterar cor">
        <input type="text" class="category-name-input" value="${this.escapeHtml(cat.name)}" placeholder="Nome da categoria">
        <button class="btn-delete-category" data-id="${cat.id}" title="Excluir">&times;</button>
      `;

      // Event listener para mudança de cor
      item
        .querySelector(".category-color-input")
        .addEventListener("change", (e) => {
          cat.color = e.target.value;
          this.updateCardsWithCategory(cat.id);
          this.saveData();
        });

      // Event listener para mudança de nome
      item
        .querySelector(".category-name-input")
        .addEventListener("change", (e) => {
          cat.name = e.target.value.trim() || "Sem nome";
          this.updateCardsWithCategory(cat.id);
          this.saveData();
        });

      item
        .querySelector(".btn-delete-category")
        .addEventListener("click", () => {
          this.deleteCategory(cat.id);
        });

      this.categoriesList.appendChild(item);
    });
  }

  updateCardsWithCategory(categoryId) {
    // Atualiza todos os cards que usam essa categoria
    this.cards.forEach((card) => {
      const ids =
        card.categoryIds || (card.categoryId ? [card.categoryId] : []);
      if (ids.includes(categoryId)) {
        card.color = this.getCardPrimaryColor(card);
        card.category =
          this.categories.find((c) => c.id === card.categoryId)?.name ||
          "Geral";
        this.renderCard(card);
      }
    });
    this.renderConnections();
  }

  addCategory() {
    const name = this.newCategoryName.value.trim();
    const color = this.newCategoryColor.value;

    if (!name) {
      alert("Digite um nome para a categoria.");
      return;
    }

    const newCategory = {
      id: "cat_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9),
      name: name,
      color: color,
    };

    this.categories.push(newCategory);
    this.newCategoryName.value = "";
    this.newCategoryColor.value = "#6366f1";
    this.renderCategoriesList();
    this.saveData();
  }

  deleteCategory(categoryId) {
    // Não permite excluir se houver apenas uma categoria
    if (this.categories.length <= 1) {
      alert("Você precisa ter pelo menos uma categoria.");
      return;
    }

    // Verifica se há cards usando essa categoria
    const cardsUsingCategory = this.cards.filter((c) => {
      const ids = c.categoryIds || (c.categoryId ? [c.categoryId] : []);
      return ids.includes(categoryId);
    });

    if (cardsUsingCategory.length > 0) {
      if (
        !confirm(
          `Existem ${cardsUsingCategory.length} card(s) usando esta categoria. Deseja excluir mesmo assim? A categoria será removida dos cards.`,
        )
      ) {
        return;
      }

      // Remove a categoria dos cards
      const firstCategory = this.categories.find((c) => c.id !== categoryId);
      cardsUsingCategory.forEach((card) => {
        card.categoryIds = (card.categoryIds || [card.categoryId]).filter(
          (id) => id !== categoryId,
        );
        // Se ficou sem categorias, adiciona a primeira disponível
        if (card.categoryIds.length === 0) {
          card.categoryIds = [firstCategory.id];
        }
        card.categoryId = card.categoryIds[0];
        card.category =
          this.categories.find((c) => c.id === card.categoryId)?.name ||
          "Geral";
        card.color = this.getCardPrimaryColor(card);
        this.renderCard(card);
      });
    }

    this.categories = this.categories.filter((c) => c.id !== categoryId);
    this.renderCategoriesList();
    this.saveData();
  }

  // ==========================================
  // Multi-seleção e Copiar/Colar
  // ==========================================

  clearSelection() {
    this.selectedCardIds.forEach((cardId) => {
      const cardElement = document.getElementById(`card-${cardId}`);
      if (cardElement) {
        cardElement.classList.remove("selected");
      }
    });
    this.selectedCardIds = [];
  }

  selectAllCards() {
    this.clearSelection();
    this.selectedCardIds = this.cards.map((c) => c.id);
    this.selectedCardIds.forEach((cardId) => {
      const cardElement = document.getElementById(`card-${cardId}`);
      if (cardElement) {
        cardElement.classList.add("selected");
      }
    });
  }

  copySelectedCards() {
    if (this.selectedCardIds.length === 0) return;

    // Copia os cards selecionados (deep copy)
    this.clipboard = this.selectedCardIds
      .map((cardId) => {
        const card = this.cards.find((c) => c.id === cardId);
        if (card) {
          return JSON.parse(JSON.stringify(card));
        }
        return null;
      })
      .filter(Boolean);

    // Feedback visual
    const saveStatus = document.getElementById("save-status");
    if (saveStatus) {
      saveStatus.textContent = `📋 ${this.clipboard.length} card(s) copiado(s)`;
      setTimeout(() => {
        saveStatus.textContent = "✓ Salvo";
      }, 1500);
    }
  }

  pasteCards() {
    if (this.clipboard.length === 0) return;

    const offset = 30; // Offset para não sobrepor exatamente
    const newCards = [];

    this.clipboard.forEach((cardData, index) => {
      const newCard = {
        ...cardData,
        id: this.generateId(),
        x: cardData.x + offset + index * 10,
        y: cardData.y + offset + index * 10,
        checklists: cardData.checklists.map((cl) => ({
          ...cl,
          id: this.generateId(),
        })),
      };
      this.cards.push(newCard);
      newCards.push(newCard);
    });

    // Renderiza os novos cards
    newCards.forEach((card) => this.renderCard(card));

    // Seleciona os novos cards
    this.clearSelection();
    this.selectedCardIds = newCards.map((c) => c.id);
    this.selectedCardIds.forEach((cardId) => {
      const cardElement = document.getElementById(`card-${cardId}`);
      if (cardElement) {
        cardElement.classList.add("selected");
      }
    });

    this.renderConnections();
    this.saveData();

    // Feedback visual
    const saveStatus = document.getElementById("save-status");
    if (saveStatus) {
      saveStatus.textContent = `📋 ${newCards.length} card(s) colado(s)`;
      setTimeout(() => {
        saveStatus.textContent = "✓ Salvo";
      }, 1500);
    }
  }

  deleteSelectedCards() {
    if (this.selectedCardIds.length === 0) return;

    const count = this.selectedCardIds.length;
    if (!confirm(`Deseja excluir ${count} card(s) selecionado(s)?`)) {
      return;
    }

    // Remove cada card selecionado
    this.selectedCardIds.forEach((cardId) => {
      this.deleteCard(cardId);
    });

    this.clearSelection();
    this.selectedCardId = null;
  }

  // ==========================================
  // Utilities
  // ==========================================

  generateId() {
    return "card_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
  }

  getCardCategories(card) {
    // Suporta formato antigo (categoryId único) e novo (categoryIds array)
    const categoryIds =
      card.categoryIds || (card.categoryId ? [card.categoryId] : []);
    return categoryIds
      .map((id) => this.categories.find((c) => c.id === id))
      .filter(Boolean);
  }

  getCardPrimaryColor(card) {
    const categories = this.getCardCategories(card);
    return categories.length > 0 ? categories[0].color : "#6366f1";
  }

  getRandomColor() {
    const colors = [
      "#6c5ce7",
      "#00b894",
      "#0984e3",
      "#e17055",
      "#fdcb6e",
      "#e84393",
      "#00cec9",
      "#a29bfe",
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
}

// Inicializa a aplicação
document.addEventListener("DOMContentLoaded", () => {
  window.visualDocApp = new VisualDocApp();
});

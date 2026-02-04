// ==========================================
// VisualDoc - Aplicativo de Documentação Visual
// ==========================================

class VisualDocApp {
  constructor() {
    this.cards = [];
    this.connections = [];
    this.selectedCardId = null;
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
    this.btnAddCard = document.getElementById("btn-add-card");
    this.btnExport = document.getElementById("btn-export");
    this.btnResetView = document.getElementById("btn-reset-view");
    this.btnNewProject = document.getElementById("btn-new-project");
    this.btnLoadProject = document.getElementById("btn-load-project");
    this.btnSaveProject = document.getElementById("btn-save-project");
    this.saveStatus = document.getElementById("save-status");

    // Modal
    this.cardModal = document.getElementById("card-modal");
    this.modalTitle = document.getElementById("modal-title");
    this.cardTitleInput = document.getElementById("card-title");
    this.cardCategoryInput = document.getElementById("card-category");
    this.cardColorInput = document.getElementById("card-color");
    this.checklistsContainer = document.getElementById("checklists-container");
    this.cardDetailsInput = document.getElementById("card-details");
    this.btnCloseModal = document.getElementById("btn-close-modal");
    this.btnSaveCard = document.getElementById("btn-save-card");
    this.btnDeleteCard = document.getElementById("btn-delete-card");
    this.btnAddChecklist = document.getElementById("btn-add-checklist");

    // Context Menu
    this.contextMenu = document.getElementById("context-menu");
    this.ctxConnect = document.getElementById("ctx-connect");
    this.ctxDisconnect = document.getElementById("ctx-disconnect");
    this.ctxEdit = document.getElementById("ctx-edit");
    this.ctxDelete = document.getElementById("ctx-delete");
  }

  bindEvents() {
    // Toolbar events
    this.btnAddCard.addEventListener("click", () => this.createNewCard());
    this.btnExport.addEventListener("click", () => this.exportSVG());
    this.btnResetView.addEventListener("click", () => this.resetView());
    this.btnNewProject.addEventListener("click", () => this.newProject());
    this.btnLoadProject.addEventListener("click", () => this.loadProject());
    this.btnSaveProject.addEventListener("click", () => this.saveProjectAs());

    // Modal events
    this.btnCloseModal.addEventListener("click", () => this.closeModal());
    this.btnSaveCard.addEventListener("click", () => this.saveCardFromModal());
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
    document.addEventListener("mousemove", (e) => this.onMouseMove(e));
    document.addEventListener("mouseup", (e) => this.onMouseUp(e));
    this.canvasContainer.addEventListener("wheel", (e) => this.onWheel(e));

    // Context menu events
    this.ctxConnect.addEventListener("click", () => this.startConnecting());
    this.ctxDisconnect.addEventListener("click", () => this.disconnectCard());
    this.ctxEdit.addEventListener("click", () => this.editSelectedCard());
    this.ctxDelete.addEventListener("click", () => this.deleteSelectedCard());

    // Close context menu on click outside
    document.addEventListener("click", (e) => {
      if (!this.contextMenu.contains(e.target)) {
        this.hideContextMenu();
      }
    });

    // Close modal on Escape, undo/redo
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.closeModal();
        this.hideContextMenu();
        this.cancelConnecting();
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

        await window.electronAPI.setProjectName(safeName);
        this.projectName = safeName;
        this.cards = [];
        this.connections = [];

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
          projectName: this.projectName,
          lastModified: new Date().toISOString(),
        };

        await window.electronAPI.saveData(data);

        // Também salva o SVG automaticamente
        if (this.cards.length > 0) {
          const svgContent = this.generateSVG();
          await window.electronAPI.saveSVG(svgContent);
        }

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

    const card = {
      id,
      title: "Novo Card",
      category: "Geral",
      details: "",
      color: this.getRandomColor(),
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
    cardElement.style.borderColor = card.color;

    // Aplica tamanho personalizado se existir
    if (card.width) cardElement.style.width = `${card.width}px`;
    if (card.height) cardElement.style.minHeight = `${card.height}px`;

    const completedCount = card.checklists.filter((c) => c.completed).length;
    const totalCount = card.checklists.length;
    const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

    cardElement.innerHTML = `
      <div class="card-connector top" data-side="top"></div>
      <div class="card-connector bottom" data-side="bottom"></div>
      <div class="card-connector left" data-side="left"></div>
      <div class="card-connector right" data-side="right"></div>
      <div class="card-resize-handle"></div>
      ${card.details ? `<div class="card-tooltip">${this.escapeHtml(card.details)}</div>` : ""}
      <div class="card-header">
        <span class="card-title">${this.escapeHtml(card.title)}</span>
        <span class="card-category" style="background-color: ${card.color}20; color: ${card.color}">
          ${this.escapeHtml(card.category)}
        </span>
      </div>
      ${
        card.checklists.length > 0
          ? `
        <div class="card-checklists">
          ${card.checklists
            .map(
              (checklist) => `
            <div class="card-checklist-item ${checklist.completed ? "completed" : ""}" data-checklist-id="${checklist.id}">
              <input type="checkbox" ${checklist.completed ? "checked" : ""}>
              <span>${this.escapeHtml(checklist.name)}</span>
            </div>
          `,
            )
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

    // Event listeners para conectores
    cardElement.querySelectorAll(".card-connector").forEach((connector) => {
      connector.addEventListener("mousedown", (e) =>
        this.onConnectorMouseDown(e, card.id),
      );
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
    this.connections = this.connections.filter(
      (conn) => conn.from !== cardId && conn.to !== cardId,
    );

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

  addConnection(fromId, toId) {
    // Evita conexões duplicadas
    const exists = this.connections.some(
      (conn) =>
        (conn.from === fromId && conn.to === toId) ||
        (conn.from === toId && conn.to === fromId),
    );

    if (!exists && fromId !== toId) {
      this.connections.push({ from: fromId, to: toId });
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
      (conn) => conn.from !== cardId && conn.to !== cardId,
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
    `;
    this.connectionsLayer.appendChild(defs);

    this.connections.forEach((conn) => {
      const fromCard = this.cards.find((c) => c.id === conn.from);
      const toCard = this.cards.find((c) => c.id === conn.to);

      if (fromCard && toCard) {
        this.drawConnection(fromCard, toCard);
      }
    });
  }

  drawConnection(fromCard, toCard) {
    const fromElement = document.getElementById(`card-${fromCard.id}`);
    const toElement = document.getElementById(`card-${toCard.id}`);

    if (!fromElement || !toElement) return;

    // Calcula centro de cada card
    const fromWidth = fromElement.offsetWidth || 280;
    const fromHeight = fromElement.offsetHeight || 100;
    const toWidth = toElement.offsetWidth || 280;
    const toHeight = toElement.offsetHeight || 100;

    const fromCenterX = fromCard.x + fromWidth / 2;
    const fromCenterY = fromCard.y + fromHeight / 2;
    const toCenterX = toCard.x + toWidth / 2;
    const toCenterY = toCard.y + toHeight / 2;

    // Calcula diferença entre centros
    const dx = toCenterX - fromCenterX;
    const dy = toCenterY - fromCenterY;

    // Determina qual lado usar baseado na direção predominante
    let fromSide, toSide;
    let fromX, fromY, toX, toY;

    if (Math.abs(dx) > Math.abs(dy)) {
      // Conexão horizontal predominante
      if (dx > 0) {
        // Card destino está à direita
        fromSide = "right";
        toSide = "left";
        fromX = fromCard.x + fromWidth;
        fromY = fromCard.y + fromHeight / 2;
        toX = toCard.x;
        toY = toCard.y + toHeight / 2;
      } else {
        // Card destino está à esquerda
        fromSide = "left";
        toSide = "right";
        fromX = fromCard.x;
        fromY = fromCard.y + fromHeight / 2;
        toX = toCard.x + toWidth;
        toY = toCard.y + toHeight / 2;
      }
    } else {
      // Conexão vertical predominante
      if (dy > 0) {
        // Card destino está abaixo
        fromSide = "bottom";
        toSide = "top";
        fromX = fromCard.x + fromWidth / 2;
        fromY = fromCard.y + fromHeight;
        toX = toCard.x + toWidth / 2;
        toY = toCard.y;
      } else {
        // Card destino está acima
        fromSide = "top";
        toSide = "bottom";
        fromX = fromCard.x + fromWidth / 2;
        fromY = fromCard.y;
        toX = toCard.x + toWidth / 2;
        toY = toCard.y + toHeight;
      }
    }

    // Cria curva bezier adaptada ao tipo de conexão
    let pathD;
    if (fromSide === "left" || fromSide === "right") {
      // Conexão horizontal
      const midX = (fromX + toX) / 2;
      pathD = `M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`;
    } else {
      // Conexão vertical
      const midY = (fromY + toY) / 2;
      pathD = `M ${fromX} ${fromY} C ${fromX} ${midY}, ${toX} ${midY}, ${toX} ${toY}`;
    }

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", pathD);
    path.setAttribute("class", "connection-line");
    path.setAttribute("marker-end", "url(#arrowhead)");
    path.style.stroke = fromCard.color;

    this.connectionsLayer.appendChild(path);
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

      // Se está no modo de conexão, cancela
      if (this.isConnecting) {
        this.cancelConnecting();
        return;
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

    this.isDragging = true;
    this.selectedCardId = cardId;

    const card = this.cards.find((c) => c.id === cardId);
    const cardElement = document.getElementById(`card-${cardId}`);

    this.dragOffset = {
      x: e.clientX - card.x,
      y: e.clientY - card.y,
    };

    cardElement.classList.add("dragging");
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

  onConnectorMouseDown(e, cardId) {
    e.preventDefault();
    e.stopPropagation();
    this.isDraggingConnector = true;
    this.startConnectingFrom(cardId);
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

    // Arrastar card
    if (this.isDragging && this.selectedCardId) {
      const card = this.cards.find((c) => c.id === this.selectedCardId);
      const cardElement = document.getElementById(
        `card-${this.selectedCardId}`,
      );

      if (card && cardElement) {
        card.x = e.clientX - this.dragOffset.x;
        card.y = e.clientY - this.dragOffset.y;

        cardElement.style.left = `${card.x}px`;
        cardElement.style.top = `${card.y}px`;

        this.renderConnections();
      }
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
      // Verifica se soltou sobre um card
      const target = document.elementFromPoint(e.clientX, e.clientY);
      const cardElement = target?.closest(".card");
      if (cardElement) {
        const targetCardId = cardElement.id.replace("card-", "");
        if (targetCardId !== this.connectingFromCard) {
          this.addConnection(this.connectingFromCard, targetCardId);
        }
      }
      this.cancelConnecting();
      this.isDraggingConnector = false;
    }

    // Finaliza drag de card
    if (this.isDragging && this.selectedCardId) {
      const cardElement = document.getElementById(
        `card-${this.selectedCardId}`,
      );
      if (cardElement) {
        cardElement.classList.remove("dragging");
      }
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

  startConnectingFrom(cardId) {
    this.isConnecting = true;
    this.connectingFromCard = cardId;
    this.canvasContainer.classList.add("connecting-mode");

    const cardElement = document.getElementById(`card-${cardId}`);
    if (cardElement) {
      cardElement.classList.add("connecting");
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
      }
    }
    this.connectingFromCard = null;
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
    this.contextMenu.classList.remove("hidden");
    this.contextMenu.style.left = `${x}px`;
    this.contextMenu.style.top = `${y}px`;
  }

  hideContextMenu() {
    this.contextMenu.classList.add("hidden");
  }

  // ==========================================
  // Modal
  // ==========================================

  openModal(card) {
    this.selectedCardId = card.id;
    this.cardModal.classList.remove("hidden");
    this.modalTitle.textContent = card.title ? "Editar Card" : "Novo Card";
    this.cardTitleInput.value = card.title;
    this.cardCategoryInput.value = card.category;
    this.cardColorInput.value = card.color;
    this.cardDetailsInput.value = card.details || "";

    this.renderChecklistInputs(card.checklists);
  }

  closeModal() {
    this.cardModal.classList.add("hidden");
    this.selectedCardId = null;
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
    div.innerHTML = `
      <div class="checklist-item-header">
        <input type="text" placeholder="Nome do item" value="${checklist ? this.escapeHtml(checklist.name) : ""}">
        <button class="btn-remove-checklist" title="Remover">&times;</button>
      </div>
    `;

    div.querySelector(".btn-remove-checklist").addEventListener("click", () => {
      div.remove();
    });

    this.checklistsContainer.appendChild(div);
  }

  saveCardFromModal() {
    const card = this.cards.find((c) => c.id === this.selectedCardId);
    if (!card) return;

    card.title = this.cardTitleInput.value || "Sem título";
    card.category = this.cardCategoryInput.value || "Geral";
    card.color = this.cardColorInput.value;
    card.details = this.cardDetailsInput.value || "";

    // Coleta checklists
    card.checklists = [];
    this.checklistsContainer
      .querySelectorAll(".checklist-item")
      .forEach((item) => {
        const name = item.querySelector('input[type="text"]').value;
        if (name.trim()) {
          card.checklists.push({
            id: item.dataset.id,
            name: name.trim(),
            details: "",
            completed: false,
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
    this.closeModal();
    if (this.selectedCardId) {
      this.deleteCard(this.selectedCardId);
      this.selectedCardId = null;
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
  // Utilities
  // ==========================================

  generateId() {
    return "card_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
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

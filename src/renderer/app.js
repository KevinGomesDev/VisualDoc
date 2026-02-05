// ==========================================
// VisualDoc - Aplicativo de Documentação Visual
// Main Application - Orquestra todos os módulos
// ==========================================

class VisualDocApp {
  constructor() {
    // Dados
    this.cards = [];
    this.connections = [];
    this.texts = [];
    this.columns = [];
    this.categories = [
      { id: "cat-1", name: "Geral", color: "#6c5ce7" },
      { id: "cat-2", name: "Frontend", color: "#00b894" },
      { id: "cat-3", name: "Backend", color: "#e17055" },
      { id: "cat-4", name: "Design", color: "#fdcb6e" },
    ];

    // Estado de conexão
    this.isConnecting = false;
    this.isDraggingConnector = false;
    this.connectingFromCard = null;
    this.connectingFromChecklist = null;
    this.connectingFromSide = null;

    // Estado de resize
    this.isResizing = false;
    this.resizingCardId = null;
    this.resizingItemType = null;
    this.resizeStart = { width: 0, height: 0, mouseX: 0, mouseY: 0 };

    // Legacy compatibility (usados pelos módulos)
    this.selectedCardId = null;
    this.selectedConnectionIndex = null;

    // Managers serão inicializados no init()
    this.historyManager = null;
    this.cardManager = null;
    this.textManager = null;
    this.columnManager = null;
    this.categoryManager = null;
    this.connectionManager = null;
    this.contextMenuManager = null;
    this.modalManager = null;
    this.projectManager = null;
    this.selectionManager = null;
    this.canvasManager = null;
    this.exportManager = null;
    this.themeManager = null;

    this.init();
  }

  async init() {
    this.bindElements();
    this.initManagers();
    this.bindEvents();
    this.themeManager.load();

    await this.projectManager.checkOrCreate();
    this.render();
  }

  // Inicializa todos os managers
  initManagers() {
    this.historyManager = new HistoryManager(this);
    this.cardManager = new CardManager(this);
    this.textManager = new TextManager(this);
    this.columnManager = new ColumnManager(this);
    this.categoryManager = new CategoryManager(this);
    this.connectionManager = new ConnectionManager(this);
    this.contextMenuManager = new ContextMenuManager(this);
    this.modalManager = new ModalManager(this);
    this.projectManager = new ProjectManager(this);
    this.selectionManager = new SelectionManager(this);
    this.canvasManager = new CanvasManager(this);
    this.exportManager = new ExportManager(this);
    this.themeManager = new ThemeManager(this);
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

    // Context Menu (Cards)
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

    // Text Context Menu
    this.textContextMenu = document.getElementById("text-context-menu");
    this.ctxTextDelete = document.getElementById("ctx-text-delete");

    // Column Context Menu
    this.columnContextMenu = document.getElementById("column-context-menu");
    this.ctxColumnColor = document.getElementById("ctx-column-color");
    this.ctxColumnDelete = document.getElementById("ctx-column-delete");
  }

  bindEvents() {
    // Toolbar events
    this.btnExport.addEventListener("click", () =>
      this.exportManager.openTextMap(),
    );
    this.btnToggleTheme.addEventListener("click", () =>
      this.themeManager.toggle(),
    );
    this.btnNewProject.addEventListener("click", () =>
      this.projectManager.newProject(),
    );
    this.btnLoadProject.addEventListener("click", () =>
      this.projectManager.loadProject(),
    );
    this.btnSaveProject.addEventListener("click", () =>
      this.projectManager.saveProjectAs(),
    );
    this.btnCategories.addEventListener("click", () =>
      this.categoryManager.openModal(),
    );

    // Categories Modal events
    this.btnCloseCategories.addEventListener("click", () =>
      this.categoryManager.closeModal(),
    );
    this.btnCloseCategoriesFooter.addEventListener("click", () =>
      this.categoryManager.closeModal(),
    );
    this.btnAddCategory.addEventListener("click", () =>
      this.categoryManager.add(),
    );

    // Modal events
    this.modalManager.bindEvents();

    // Context Menu events
    this.contextMenuManager.bindEvents();

    // Canvas events
    this.canvasContainer.addEventListener("mousedown", (e) =>
      this.canvasManager.onMouseDown(e),
    );
    this.canvasContainer.addEventListener("contextmenu", (e) =>
      this.canvasManager.onContextMenu(e),
    );
    document.addEventListener("mousemove", (e) => this.onMouseMove(e));
    document.addEventListener("mouseup", (e) => this.onMouseUp(e));
    this.canvasContainer.addEventListener("wheel", (e) =>
      this.canvasManager.onWheel(e),
    );

    // Keyboard events
    document.addEventListener("keydown", (e) => this.onKeyDown(e));
  }

  // ==========================================
  // Event Handlers
  // ==========================================

  onKeyDown(e) {
    // Ignora se estiver em input/textarea
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") {
      if (e.key === "Escape") {
        this.modalManager.closeCardModal();
        this.contextMenuManager.hideAll();
      }
      return;
    }

    if (e.key === "Escape") {
      this.modalManager.closeCardModal();
      this.contextMenuManager.hideAll();
      this.cancelConnecting();
      this.selectionManager.clear();
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
      this.selectionManager.copy();
    }

    // Paste: Ctrl+V
    if (e.ctrlKey && e.key === "v") {
      e.preventDefault();
      this.selectionManager.paste();
    }

    // Select All: Ctrl+A
    if (e.ctrlKey && e.key === "a") {
      e.preventDefault();
      this.selectionManager.selectAll();
    }

    // Delete
    if (e.key === "Delete") {
      e.preventDefault();
      if (this.selectedConnectionIndex !== null) {
        this.deleteSelectedConnection();
      } else if (this.selectionManager.selectedItemIds.length > 0) {
        this.selectionManager.deleteSelected();
      }
    }
  }

  onMouseMove(e) {
    // Linha temporária de conexão
    if (
      this.isDraggingConnector &&
      this.isConnecting &&
      this.connectingFromCard
    ) {
      this.updateTempConnectionLine(e);
    }

    // Resize
    if (this.isResizing && this.resizingCardId) {
      if (this.resizingItemType === "text") {
        this.textManager.handleResize(e);
        return;
      }
      if (this.resizingItemType === "column") {
        this.columnManager.handleResize(e);
        return;
      }
      this.handleCardResize(e);
      return;
    }

    // Canvas manager handles pan and drag
    if (this.canvasManager.onMouseMove(e)) {
      return;
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
      this.resizingItemType = null;
      this.saveData();
      return;
    }

    // Canvas manager handles pan and drag
    this.canvasManager.onMouseUp(e);

    // Finaliza conexão por drag
    if (this.isDraggingConnector && this.isConnecting) {
      this.finishConnectionDrag(e);
    }

    this.resizingItemType = null;
  }

  // ==========================================
  // Item Mouse Events (delegados pelos managers)
  // ==========================================

  onItemMouseDown(e, itemId, itemType) {
    if (e.target.tagName === "INPUT") return;
    if (e.button === 2) return;

    const isEditingText =
      e.target.contentEditable === "true" &&
      document.activeElement === e.target;
    if (isEditingText) return;

    e.preventDefault();
    e.stopPropagation();

    // Handle connection mode
    if (this.isConnecting && itemType === "card") {
      if (this.connectingFromCard !== itemId) {
        this.addConnection(this.connectingFromCard, itemId);
      }
      this.cancelConnecting();
      return;
    }

    // Deselect connections
    if (this.selectedConnectionIndex !== null) {
      this.connectionManager.deselect();
      this.selectedConnectionIndex = null;
    }

    // Multi-selection with Ctrl
    if (e.ctrlKey) {
      this.selectionManager.addToSelection(itemId, itemType);
      return;
    }

    // Normal click
    if (!this.selectionManager.isSelected(itemId, itemType)) {
      this.selectionManager.select(itemId, itemType);
    }

    // Start dragging
    this.canvasManager.startDragging(e, itemId, itemType);
  }

  onItemContextMenu(e, itemId, itemType) {
    e.preventDefault();
    e.stopPropagation();
    this.selectionManager.select(itemId, itemType);
    this.contextMenuManager.showItemMenu(e.clientX, e.clientY, itemType);
  }

  onCardContextMenu(e, cardId) {
    e.preventDefault();
    this.selectedCardId = cardId;
    this.contextMenuManager.showItemMenu(e.clientX, e.clientY, "card");
  }

  // ==========================================
  // Connection Events
  // ==========================================

  onConnectorMouseDown(e, cardId, side) {
    e.preventDefault();
    e.stopPropagation();
    this.isDraggingConnector = true;
    this.connectingFromChecklist = null;
    this.connectingFromSide = side;
    this.startConnectingFrom(cardId);
  }

  onChecklistConnectorMouseDown(e, cardId, checklistId) {
    e.preventDefault();
    e.stopPropagation();
    this.isDraggingConnector = true;
    this.connectingFromChecklist = checklistId;
    this.startConnectingFrom(cardId, checklistId);
  }

  startConnectingFrom(cardId, checklistId = null) {
    this.isConnecting = true;
    this.connectingFromCard = cardId;
    this.connectingFromChecklist = checklistId;
    this.canvasContainer.classList.add("connecting-mode");

    const cardElement = document.getElementById(`card-${cardId}`);
    if (cardElement) {
      cardElement.classList.add("connecting");
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
    this.removeTempConnectionLine();

    if (this.connectingFromCard) {
      const cardElement = document.getElementById(
        `card-${this.connectingFromCard}`,
      );
      if (cardElement) {
        cardElement.classList.remove("connecting");
        cardElement
          .querySelectorAll(".card-checklist-item.connecting")
          .forEach((item) => {
            item.classList.remove("connecting");
          });
      }
    }
    this.connectingFromCard = null;
    this.connectingFromChecklist = null;
    this.connectingFromSide = null;
  }

  finishConnectionDrag(e) {
    const elements = document.elementsFromPoint(e.clientX, e.clientY);

    let checklistConnector = null;
    let cardConnector = null;
    let cardElement = null;

    for (const el of elements) {
      if (
        !checklistConnector &&
        el.classList?.contains("checklist-connector")
      ) {
        checklistConnector = el;
      }
      if (!cardConnector && el.classList?.contains("card-connector")) {
        cardConnector = el;
      }
      if (!cardElement && el.classList?.contains("card")) {
        cardElement = el;
      }
    }

    if (checklistConnector) {
      const targetChecklistId = checklistConnector.dataset.checklistId;
      const targetCardId = checklistConnector.dataset.cardId;

      if (targetCardId && targetChecklistId) {
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
    } else if (cardConnector) {
      const targetCardId = cardConnector.dataset.cardId;
      if (targetCardId && targetCardId !== this.connectingFromCard) {
        this.addConnection(
          this.connectingFromCard,
          targetCardId,
          this.connectingFromChecklist,
          null,
        );
      }
    } else if (cardElement) {
      const targetCardId = cardElement.id.replace("card-", "");
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

  updateTempConnectionLine(e) {
    const cardElement = document.getElementById(
      `card-${this.connectingFromCard}`,
    );
    if (!cardElement) return;

    const card = this.cards.find((c) => c.id === this.connectingFromCard);
    if (!card) return;

    let fromX, fromY;
    const cardWidth = cardElement.offsetWidth || 280;
    const cardHeight = cardElement.offsetHeight || 100;

    if (this.connectingFromChecklist) {
      const checklistItem = cardElement.querySelector(
        `[data-checklist-id="${this.connectingFromChecklist}"]`,
      );
      if (checklistItem) {
        const connector = checklistItem.querySelector(".checklist-connector");
        if (connector) {
          const cardRect = cardElement.getBoundingClientRect();
          const connRect = connector.getBoundingClientRect();
          fromX =
            card.x +
            (connRect.left - cardRect.left + connRect.width / 2) /
              this.canvasManager.zoom;
          fromY =
            card.y +
            (connRect.top - cardRect.top + connRect.height / 2) /
              this.canvasManager.zoom;
        }
      }
    } else if (this.connectingFromSide) {
      // Usa a posição da bolinha clicada
      switch (this.connectingFromSide) {
        case "top":
          fromX = card.x + cardWidth / 2;
          fromY = card.y;
          break;
        case "bottom":
          fromX = card.x + cardWidth / 2;
          fromY = card.y + cardHeight;
          break;
        case "left":
          fromX = card.x;
          fromY = card.y + cardHeight / 2;
          break;
        case "right":
          fromX = card.x + cardWidth;
          fromY = card.y + cardHeight / 2;
          break;
        default:
          fromX = card.x + cardWidth / 2;
          fromY = card.y + cardHeight / 2;
      }
    }

    if (fromX === undefined) {
      fromX = card.x + cardWidth / 2;
      fromY = card.y + cardHeight / 2;
    }

    const canvasRect = this.canvasContainer.getBoundingClientRect();
    const toX =
      (e.clientX - canvasRect.left - this.canvasManager.pan.x) /
      this.canvasManager.zoom;
    const toY =
      (e.clientY - canvasRect.top - this.canvasManager.pan.y) /
      this.canvasManager.zoom;

    let tempLine = this.connectionsLayer.querySelector(".temp-connection-line");
    if (!tempLine) {
      tempLine = document.createElementNS("http://www.w3.org/2000/svg", "path");
      tempLine.setAttribute("class", "temp-connection-line");
      tempLine.style.stroke = this.getCardPrimaryColor(card);
      tempLine.style.strokeWidth = "3";
      tempLine.style.fill = "none";
      tempLine.style.strokeDasharray = "8 4";
      tempLine.style.pointerEvents = "none";
      this.connectionsLayer.appendChild(tempLine);
    }

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

    tempLine.setAttribute("d", pathD);
  }

  removeTempConnectionLine() {
    const tempLine = this.connectionsLayer?.querySelector(
      ".temp-connection-line",
    );
    if (tempLine) tempLine.remove();
  }

  // ==========================================
  // Resize Events
  // ==========================================

  onResizeMouseDown(e, cardId) {
    e.preventDefault();
    e.stopPropagation();

    const cardElement = document.getElementById(`card-${cardId}`);
    if (!cardElement) return;

    this.isResizing = true;
    this.resizingCardId = cardId;
    this.resizingItemType = "card";
    this.resizeStart = {
      width: cardElement.offsetWidth,
      height: cardElement.offsetHeight,
      mouseX: e.clientX,
      mouseY: e.clientY,
    };

    cardElement.classList.add("resizing");
  }

  handleCardResize(e) {
    const card = this.cards.find((c) => c.id === this.resizingCardId);
    const cardElement = document.getElementById(`card-${this.resizingCardId}`);

    if (card && cardElement) {
      const deltaX =
        (e.clientX - this.resizeStart.mouseX) / this.canvasManager.zoom;
      const deltaY =
        (e.clientY - this.resizeStart.mouseY) / this.canvasManager.zoom;

      const newWidth = Math.max(200, this.resizeStart.width + deltaX);
      const newHeight = Math.max(100, this.resizeStart.height + deltaY);

      cardElement.style.width = `${newWidth}px`;
      cardElement.style.minHeight = `${newHeight}px`;
      card.width = newWidth;
      card.height = newHeight;

      this.renderConnections();
    }
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
    const fromId = fromChecklistId
      ? `${fromCardId}:${fromChecklistId}`
      : fromCardId;
    const toId = toChecklistId ? `${toCardId}:${toChecklistId}` : toCardId;

    const exists = this.connections.some(
      (conn) =>
        (conn.from === fromId && conn.to === toId) ||
        (conn.from === toId && conn.to === fromId),
    );

    if (!exists && fromId !== toId) {
      this.connections.push({
        id: `conn_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        from: fromId,
        to: toId,
        fromCardId: fromCardId,
        toCardId: toCardId,
        fromChecklistId: fromChecklistId,
        toChecklistId: toChecklistId,
        waypoints: [],
        fixedFromPoint: null,
        fixedToPoint: null,
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

  deleteSelectedConnection() {
    if (this.connectionManager && this.selectedConnectionIndex !== null) {
      this.connections.splice(this.selectedConnectionIndex, 1);
      this.selectedConnectionIndex = null;
      this.renderConnections();
      this.saveData();
    }
  }

  renderConnections() {
    if (this.connectionManager) {
      this.connectionManager.render();
    }
  }

  // ==========================================
  // Item Management
  // ==========================================

  deleteItem(id, type) {
    if (type === "card") {
      this.cardManager.delete(id);
    } else if (type === "text") {
      this.textManager.delete(id);
    } else if (type === "column") {
      this.columnManager.delete(id);
    }
  }

  selectItem(id, type) {
    this.selectionManager.select(id, type);
  }

  clearSelection() {
    this.selectionManager.clear();
  }

  // ==========================================
  // History
  // ==========================================

  undo() {
    const state = this.historyManager.undo();
    if (state) {
      this.cards = state.cards;
      this.connections = state.connections;
      this.texts = state.texts || [];
      this.columns = state.columns || [];
      if (state.categories) {
        this.categories = state.categories;
      }
      this.render();
      this.projectManager.saveDataWithoutHistory();
    }
  }

  redo() {
    const state = this.historyManager.redo();
    if (state) {
      this.cards = state.cards;
      this.connections = state.connections;
      this.texts = state.texts || [];
      this.columns = state.columns || [];
      if (state.categories) {
        this.categories = state.categories;
      }
      this.render();
      this.projectManager.saveDataWithoutHistory();
    }
  }

  // ==========================================
  // Data Management (delegates to ProjectManager)
  // ==========================================

  saveData() {
    this.projectManager.saveData();
  }

  // ==========================================
  // Modal (delegates to ModalManager)
  // ==========================================

  openModal(card) {
    this.modalManager.openCardModal(card);
  }

  closeModal() {
    this.modalManager.closeCardModal();
  }

  // ==========================================
  // Rendering
  // ==========================================

  render() {
    this.cardsContainer.innerHTML = "";
    this.columnManager.renderAll();
    this.cardManager.renderAll();
    this.textManager.renderAll();
    this.renderConnections();
  }

  // ==========================================
  // Utilities
  // ==========================================

  generateId() {
    return "card_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
  }

  getCardCategories(card) {
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

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  // Getters para compatibilidade com managers
  get zoom() {
    return this.canvasManager?.zoom || 1;
  }

  get pan() {
    return this.canvasManager?.pan || { x: 0, y: 0 };
  }

  get contextMenuPosition() {
    return this.contextMenuManager?.contextMenuPosition || { x: 0, y: 0 };
  }

  get selectedItemId() {
    return this.selectionManager?.selectedItemId || null;
  }

  get selectedItemType() {
    return this.selectionManager?.selectedItemType || null;
  }

  get selectedItemIds() {
    return this.selectionManager?.selectedItemIds || [];
  }
}

// Inicializa a aplicação
document.addEventListener("DOMContentLoaded", () => {
  window.visualDocApp = new VisualDocApp();
});

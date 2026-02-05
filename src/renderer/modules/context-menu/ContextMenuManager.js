// ==========================================
// ContextMenuManager - Gerenciamento de Menus de Contexto
// ==========================================

class ContextMenuManager {
  constructor(app) {
    this.app = app;
    this.contextMenuPosition = { x: 0, y: 0 };
  }

  // Mostra menu de contexto de card
  showCardMenu(x, y) {
    this.hideAll();
    this.app.contextMenu.classList.remove("hidden");
    this.app.contextMenu.style.left = `${x}px`;
    this.app.contextMenu.style.top = `${y}px`;
  }

  // Mostra menu de contexto de texto
  showTextMenu(x, y) {
    this.hideAll();
    this.app.textContextMenu.classList.remove("hidden");
    this.app.textContextMenu.style.left = `${x}px`;
    this.app.textContextMenu.style.top = `${y}px`;
  }

  // Mostra menu de contexto de coluna
  showColumnMenu(x, y) {
    this.hideAll();
    this.app.columnContextMenu.classList.remove("hidden");
    this.app.columnContextMenu.style.left = `${x}px`;
    this.app.columnContextMenu.style.top = `${y}px`;
  }

  // Mostra menu de contexto baseado no tipo de item
  showItemMenu(x, y, itemType = "card") {
    if (itemType === "text") {
      this.showTextMenu(x, y);
    } else if (itemType === "column") {
      this.showColumnMenu(x, y);
    } else {
      this.showCardMenu(x, y);
    }
  }

  // Esconde menu de contexto de item (card)
  hideItemMenu() {
    this.app.contextMenu.classList.add("hidden");
  }

  // Esconde menu de contexto de texto
  hideTextMenu() {
    this.app.textContextMenu.classList.add("hidden");
  }

  // Esconde menu de contexto de coluna
  hideColumnMenu() {
    this.app.columnContextMenu.classList.add("hidden");
  }

  // Mostra menu de contexto do canvas
  showCanvasMenu(x, y) {
    this.hideAll();
    this.contextMenuPosition = { x, y };
    this.app.canvasContextMenu.classList.remove("hidden");
    this.app.canvasContextMenu.style.left = `${x}px`;
    this.app.canvasContextMenu.style.top = `${y}px`;
  }

  // Esconde menu de contexto do canvas
  hideCanvasMenu() {
    this.app.canvasContextMenu.classList.add("hidden");
    this.contextMenuPosition = { x: 0, y: 0 };
  }

  // Esconde todos os menus
  hideAll() {
    this.hideItemMenu();
    this.hideTextMenu();
    this.hideColumnMenu();
    this.hideCanvasMenu();
  }

  // Retorna posição do context menu
  getPosition() {
    return this.contextMenuPosition;
  }

  // Vincula eventos
  bindEvents() {
    // Context menu item events (Cards)
    this.app.ctxConnect.addEventListener("click", () => {
      this.hideItemMenu();
      this.app.startConnectingFrom(this.app.selectedCardId);
    });

    this.app.ctxDisconnect.addEventListener("click", () => {
      this.hideItemMenu();
      if (this.app.selectedCardId) {
        this.app.removeAllConnectionsFromCard(this.app.selectedCardId);
      }
    });

    this.app.ctxEdit.addEventListener("click", () => {
      this.hideItemMenu();
      const card = this.app.cards.find((c) => c.id === this.app.selectedCardId);
      if (card) {
        this.app.openModal(card);
      }
    });

    this.app.ctxDelete.addEventListener("click", () => {
      this.hideItemMenu();
      if (this.app.selectedItemId && this.app.selectedItemType) {
        this.app.deleteItem(this.app.selectedItemId, this.app.selectedItemType);
      }
    });

    // Text context menu events
    this.app.ctxTextDelete.addEventListener("click", () => {
      this.hideTextMenu();
      if (this.app.selectedItemId && this.app.selectedItemType === "text") {
        this.app.deleteItem(this.app.selectedItemId, "text");
      }
    });

    // Column context menu events
    this.app.ctxColumnColor.addEventListener("click", () => {
      this.hideColumnMenu();
      if (this.app.selectedItemId && this.app.selectedItemType === "column") {
        const column = this.app.columns.find(
          (c) => c.id === this.app.selectedItemId,
        );
        if (column) {
          this.app.columnManager.openColorPicker(column);
        }
      }
    });

    this.app.ctxColumnDelete.addEventListener("click", () => {
      this.hideColumnMenu();
      if (this.app.selectedItemId && this.app.selectedItemType === "column") {
        this.app.deleteItem(this.app.selectedItemId, "column");
      }
    });

    // Canvas context menu events
    this.app.ctxNewCard.addEventListener("click", () => {
      const card = this.app.cardManager.create();
      this.hideCanvasMenu();
      this.app.selectedCardId = card.id;
      this.app.openModal(card);
    });

    this.app.ctxNewText.addEventListener("click", () => {
      const text = this.app.textManager.create();
      this.hideCanvasMenu();
      this.app.selectItem(text.id, "text");
    });

    this.app.ctxNewColumn.addEventListener("click", () => {
      const column = this.app.columnManager.create();
      this.hideCanvasMenu();
      this.app.selectItem(column.id, "column");
    });

    // Close context menus on click outside
    document.addEventListener("click", (e) => {
      if (!this.app.contextMenu.contains(e.target)) {
        this.hideItemMenu();
      }
      if (!this.app.textContextMenu.contains(e.target)) {
        this.hideTextMenu();
      }
      if (!this.app.columnContextMenu.contains(e.target)) {
        this.hideColumnMenu();
      }
      if (!this.app.canvasContextMenu.contains(e.target)) {
        this.hideCanvasMenu();
      }
    });
  }
}

// Exporta para uso global
window.ContextMenuManager = ContextMenuManager;

// ==========================================
// ContextMenuManager - Gerenciamento de Menus de Contexto
// ==========================================

class ContextMenuManager {
  constructor(app) {
    this.app = app;
    this.contextMenuPosition = { x: 0, y: 0 };
  }

  // Mostra menu de contexto de item (card, text, column)
  showItemMenu(x, y) {
    this.hideCanvasMenu();
    this.app.contextMenu.classList.remove("hidden");
    this.app.contextMenu.style.left = `${x}px`;
    this.app.contextMenu.style.top = `${y}px`;
  }

  // Esconde menu de contexto de item
  hideItemMenu() {
    this.app.contextMenu.classList.add("hidden");
  }

  // Mostra menu de contexto do canvas
  showCanvasMenu(x, y) {
    this.hideItemMenu();
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
    this.hideCanvasMenu();
  }

  // Retorna posição do context menu
  getPosition() {
    return this.contextMenuPosition;
  }

  // Vincula eventos
  bindEvents() {
    // Context menu item events
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
      if (!this.app.canvasContextMenu.contains(e.target)) {
        this.hideCanvasMenu();
      }
    });
  }
}

// Exporta para uso global
window.ContextMenuManager = ContextMenuManager;

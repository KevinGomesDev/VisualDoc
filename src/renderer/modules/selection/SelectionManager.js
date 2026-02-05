// ==========================================
// SelectionManager - Gerenciamento de Seleção e Clipboard
// ==========================================

class SelectionManager {
  constructor(app) {
    this.app = app;
    this.selectedItemId = null;
    this.selectedItemType = null;
    this.selectedItemIds = [];
    this.clipboard = [];

    // Legacy compatibility
    this.selectedCardId = null;
    this.selectedCardIds = [];
  }

  // Seleciona um item
  select(id, type) {
    this.clear();
    this.selectedItemId = id;
    this.selectedItemType = type;
    this.selectedItemIds = [{ id, type }];

    // Legacy compatibility
    if (type === "card") {
      this.selectedCardId = id;
      this.selectedCardIds = [id];
    }

    // Add visual selection
    const prefix =
      type === "card" ? "card" : type === "text" ? "text" : "column";
    const element = document.getElementById(`${prefix}-${id}`);
    if (element) {
      element.classList.add("selected");
    }
  }

  // Adiciona item à seleção
  addToSelection(id, type) {
    const idx = this.selectedItemIds.findIndex(
      (i) => i.id === id && i.type === type,
    );

    if (idx >= 0) {
      // Remove da seleção
      this.selectedItemIds.splice(idx, 1);
      const prefix =
        type === "card" ? "card" : type === "text" ? "text" : "column";
      const element = document.getElementById(`${prefix}-${id}`);
      if (element) element.classList.remove("selected");

      if (type === "card") {
        this.selectedCardIds = this.selectedCardIds.filter((cid) => cid !== id);
      }
    } else {
      // Adiciona à seleção
      this.selectedItemIds.push({ id, type });
      const prefix =
        type === "card" ? "card" : type === "text" ? "text" : "column";
      const element = document.getElementById(`${prefix}-${id}`);
      if (element) element.classList.add("selected");

      if (type === "card") {
        this.selectedCardIds.push(id);
      }
    }

    this.selectedItemId = id;
    this.selectedItemType = type;
    if (type === "card") {
      this.selectedCardId = id;
    }
  }

  // Limpa a seleção
  clear(keepConnections = false) {
    this.selectedItemIds.forEach(({ id, type }) => {
      const prefix =
        type === "card" ? "card" : type === "text" ? "text" : "column";
      const element = document.getElementById(`${prefix}-${id}`);
      if (element) {
        element.classList.remove("selected", "dragging");
      }
    });

    this.selectedCardIds.forEach((cardId) => {
      const cardElement = document.getElementById(`card-${cardId}`);
      if (cardElement) {
        cardElement.classList.remove("selected", "dragging");
      }
    });

    this.selectedItemIds = [];
    this.selectedItemId = null;
    this.selectedItemType = null;
    this.selectedCardIds = [];
    this.selectedCardId = null;

    // Deselect connections (unless we're selecting a connection)
    if (!keepConnections && this.app.connectionManager) {
      this.app.connectionManager.deselect();
    }
  }

  // Seleciona todos os cards
  selectAll() {
    this.clear();
    this.selectedCardIds = this.app.cards.map((c) => c.id);
    this.selectedItemIds = this.app.cards.map((c) => ({
      id: c.id,
      type: "card",
    }));
    this.selectedCardIds.forEach((cardId) => {
      const cardElement = document.getElementById(`card-${cardId}`);
      if (cardElement) {
        cardElement.classList.add("selected");
      }
    });
  }

  // Copia itens selecionados (cards, textos, colunas)
  copy() {
    if (this.selectedItemIds.length === 0) return;

    this.clipboard = this.selectedItemIds
      .map(({ id, type }) => {
        let item = null;
        if (type === "card") {
          item = this.app.cards.find((c) => c.id === id);
        } else if (type === "text") {
          item = this.app.texts.find((t) => t.id === id);
        } else if (type === "column") {
          item = this.app.columns.find((c) => c.id === id);
        }
        if (item) {
          return { type, data: JSON.parse(JSON.stringify(item)) };
        }
        return null;
      })
      .filter(Boolean);

    if (this.app.saveStatus && this.clipboard.length > 0) {
      this.app.saveStatus.textContent = `📋 ${this.clipboard.length} item(s) copiado(s)`;
      setTimeout(() => {
        this.app.saveStatus.textContent = "✓ Salvo";
      }, 1500);
    }
  }

  // Cola itens
  paste() {
    if (this.clipboard.length === 0) return;

    const offset = 30;
    const newItems = [];

    this.clipboard.forEach((clipboardItem, index) => {
      const { type, data } = clipboardItem;
      const newId = this.app.generateId();
      const newX = data.x + offset + index * 10;
      const newY = data.y + offset + index * 10;

      if (type === "card") {
        const newCard = {
          ...data,
          id: newId,
          x: newX,
          y: newY,
          checklists: data.checklists.map((cl) => ({
            ...cl,
            id: this.app.generateId(),
          })),
        };
        this.app.cards.push(newCard);
        this.app.cardManager.render(newCard);
        newItems.push({ id: newId, type: "card" });
      } else if (type === "text") {
        const newText = {
          ...data,
          id: newId,
          x: newX,
          y: newY,
        };
        this.app.texts.push(newText);
        this.app.textManager.render(newText);
        newItems.push({ id: newId, type: "text" });
      } else if (type === "column") {
        const newColumn = {
          ...data,
          id: newId,
          x: newX,
          y: newY,
        };
        this.app.columns.push(newColumn);
        this.app.columnManager.render(newColumn);
        newItems.push({ id: newId, type: "column" });
      }
    });

    this.clear();
    this.selectedItemIds = newItems;
    
    // Seleciona visualmente os novos itens
    newItems.forEach(({ id, type }) => {
      let el = null;
      if (type === "card") {
        el = document.getElementById(`card-${id}`);
        this.selectedCardIds.push(id);
      } else if (type === "text") {
        el = document.getElementById(`text-${id}`);
      } else if (type === "column") {
        el = document.getElementById(`column-${id}`);
      }
      if (el) {
        el.classList.add("selected");
      }
    });

    this.app.renderConnections();
    this.app.saveData();

    if (this.app.saveStatus) {
      this.app.saveStatus.textContent = `📋 ${newItems.length} item(s) colado(s)`;
      setTimeout(() => {
        this.app.saveStatus.textContent = "✓ Salvo";
      }, 1500);
    }
  }

  // Deleta itens selecionados
  deleteSelected() {
    if (this.selectedItemIds.length === 0) return;

    const count = this.selectedItemIds.length;
    if (!confirm(`Deseja excluir ${count} item(s) selecionado(s)?`)) {
      return;
    }

    this.selectedItemIds.forEach(({ id, type }) => {
      this.app.deleteItem(id, type);
    });

    this.clear();
  }

  // Verifica se um item está selecionado
  isSelected(id, type) {
    return this.selectedItemIds.some((i) => i.id === id && i.type === type);
  }

  // Retorna itens selecionados
  getSelectedItems() {
    return this.selectedItemIds;
  }
}

// Exporta para uso global
window.SelectionManager = SelectionManager;

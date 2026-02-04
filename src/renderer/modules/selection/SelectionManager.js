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
  clear() {
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

    // Deselect connections
    if (this.app.connectionManager) {
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

  // Copia cards selecionados
  copy() {
    if (this.selectedCardIds.length === 0) return;

    this.clipboard = this.selectedCardIds
      .map((cardId) => {
        const card = this.app.cards.find((c) => c.id === cardId);
        if (card) {
          return JSON.parse(JSON.stringify(card));
        }
        return null;
      })
      .filter(Boolean);

    if (this.app.saveStatus) {
      this.app.saveStatus.textContent = `📋 ${this.clipboard.length} card(s) copiado(s)`;
      setTimeout(() => {
        this.app.saveStatus.textContent = "✓ Salvo";
      }, 1500);
    }
  }

  // Cola cards
  paste() {
    if (this.clipboard.length === 0) return;

    const offset = 30;
    const newCards = [];

    this.clipboard.forEach((cardData, index) => {
      const newCard = {
        ...cardData,
        id: this.app.generateId(),
        x: cardData.x + offset + index * 10,
        y: cardData.y + offset + index * 10,
        checklists: cardData.checklists.map((cl) => ({
          ...cl,
          id: this.app.generateId(),
        })),
      };
      this.app.cards.push(newCard);
      newCards.push(newCard);
    });

    newCards.forEach((card) => this.app.cardManager.render(card));

    this.clear();
    this.selectedCardIds = newCards.map((c) => c.id);
    this.selectedItemIds = newCards.map((c) => ({ id: c.id, type: "card" }));
    this.selectedCardIds.forEach((cardId) => {
      const cardElement = document.getElementById(`card-${cardId}`);
      if (cardElement) {
        cardElement.classList.add("selected");
      }
    });

    this.app.renderConnections();
    this.app.saveData();

    if (this.app.saveStatus) {
      this.app.saveStatus.textContent = `📋 ${newCards.length} card(s) colado(s)`;
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

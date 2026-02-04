// ==========================================
// CardManager - Gerenciamento de Cards
// ==========================================

class CardManager {
  constructor(app) {
    this.app = app;
  }

  // Cria um novo card
  create(position = null) {
    const id = this.app.generateId();
    const containerRect = this.app.canvasContainer.getBoundingClientRect();

    // Usa a primeira categoria disponível
    const defaultCategory = this.app.categories[0] || {
      id: "cat-1",
      name: "Geral",
      color: "#6c5ce7",
    };

    // Calculate position
    let x, y;
    if (position) {
      x = position.x;
      y = position.y;
    } else if (
      this.app.contextMenuPosition.x !== 0 ||
      this.app.contextMenuPosition.y !== 0
    ) {
      x =
        (this.app.contextMenuPosition.x - containerRect.left - this.app.pan.x) /
        this.app.zoom;
      y =
        (this.app.contextMenuPosition.y - containerRect.top - this.app.pan.y) /
        this.app.zoom;
    } else {
      x = (containerRect.width / 2 - 140) / this.app.zoom - this.app.pan.x;
      y = (containerRect.height / 2 - 60) / this.app.zoom - this.app.pan.y;
    }

    const card = {
      id,
      title: "Novo Card",
      categoryIds: [defaultCategory.id],
      categoryId: defaultCategory.id,
      category: defaultCategory.name,
      details: "",
      color: defaultCategory.color,
      x,
      y,
      checklists: [],
    };

    this.app.cards.push(card);
    this.render(card);
    this.app.saveData();

    return card;
  }

  // Renderiza um card
  render(card) {
    const existingElement = document.getElementById(`card-${card.id}`);
    if (existingElement) {
      existingElement.remove();
    }

    const cardElement = document.createElement("div");
    cardElement.className = "card";
    cardElement.id = `card-${card.id}`;
    cardElement.style.left = `${card.x}px`;
    cardElement.style.top = `${card.y}px`;
    cardElement.style.borderColor = this.app.getCardPrimaryColor(card);

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
      ${card.details ? `<div class="card-tooltip">${this.app.escapeHtml(card.details)}</div>` : ""}
      <div class="card-header">
        <span class="card-title">${this.app.escapeHtml(card.title)}</span>
        <div class="card-categories">
          ${this.app
            .getCardCategories(card)
            .map(
              (cat) => `
            <span class="card-category" style="background-color: ${cat.color}20; color: ${cat.color}">
              ${this.app.escapeHtml(cat.name)}
            </span>
          `,
            )
            .join("")}
        </div>
      </div>
      ${this.renderChecklists(card, progress)}
    `;

    this.bindEvents(cardElement, card);
    this.app.cardsContainer.appendChild(cardElement);
  }

  // Renderiza checklists do card
  renderChecklists(card, progress) {
    if (card.checklists.length === 0) return "";

    return `
      <div class="card-checklists">
        ${card.checklists
          .map((checklist) => {
            const itemCategory =
              checklist.categoryId !== null &&
              checklist.categoryId !== undefined
                ? this.app.categories.find(
                    (c) => String(c.id) === String(checklist.categoryId),
                  )
                : null;
            const itemStyle = itemCategory
              ? `border-left: 3px solid ${itemCategory.color}; background: linear-gradient(90deg, ${itemCategory.color}15 0%, transparent 100%);`
              : "";
            const categoryLabel = itemCategory
              ? `<span class="checklist-category-label" style="background-color: ${itemCategory.color}30; color: ${itemCategory.color}">${this.app.escapeHtml(itemCategory.name)}</span>`
              : "";
            return `
            <div class="card-checklist-item ${checklist.completed ? "completed" : ""}" 
                 data-checklist-id="${checklist.id}" 
                 data-card-id="${card.id}"
                 style="${itemStyle}">
              <div class="checklist-item-content">
                <input type="checkbox" ${checklist.completed ? "checked" : ""}>
                <span>${this.app.escapeHtml(checklist.name)}</span>
                ${categoryLabel}
              </div>
              <div class="checklist-connector" 
                   data-checklist-id="${checklist.id}" 
                   data-card-id="${card.id}"
                   title="Conectar"></div>
              ${checklist.details ? `<div class="checklist-tooltip">${this.app.escapeHtml(checklist.details)}</div>` : ""}
            </div>
          `;
          })
          .join("")}
      </div>
      <div class="card-progress">
        <div class="card-progress-bar" style="width: ${progress}%"></div>
      </div>
    `;
  }

  // Vincula eventos do card
  bindEvents(cardElement, card) {
    // Mouse down
    cardElement.addEventListener("mousedown", (e) => {
      if (e.target.classList.contains("card-connector")) return;
      if (e.target.classList.contains("card-resize-handle")) return;
      this.app.onItemMouseDown(e, card.id, "card");
    });

    // Double click para editar
    cardElement.addEventListener("dblclick", (e) =>
      this.onDoubleClick(e, card.id),
    );

    // Context menu
    cardElement.addEventListener("contextmenu", (e) =>
      this.app.onCardContextMenu(e, card.id),
    );

    // Checkboxes
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

    // Conectores do card
    cardElement.querySelectorAll(".card-connector").forEach((connector) => {
      connector.addEventListener("mousedown", (e) =>
        this.app.onConnectorMouseDown(e, card.id),
      );
    });

    // Conectores de checklist
    cardElement
      .querySelectorAll(".checklist-connector")
      .forEach((connector) => {
        connector.addEventListener("mousedown", (e) => {
          e.stopPropagation();
          const checklistId = connector.dataset.checklistId;
          const cardId = connector.dataset.cardId;
          this.app.onChecklistConnectorMouseDown(e, cardId, checklistId);
        });
      });

    // Resize handle
    const resizeHandle = cardElement.querySelector(".card-resize-handle");
    if (resizeHandle) {
      resizeHandle.addEventListener("mousedown", (e) =>
        this.app.onResizeMouseDown(e, card.id),
      );
    }
  }

  // Double click para editar
  onDoubleClick(e, cardId) {
    e.preventDefault();
    const card = this.app.cards.find((c) => c.id === cardId);
    if (card) {
      this.app.selectedCardId = cardId;
      this.app.openModal(card);
    }
  }

  // Toggle checklist item
  toggleChecklist(cardId, checklistId, completed) {
    const card = this.app.cards.find((c) => c.id === cardId);
    if (card) {
      const checklist = card.checklists.find((c) => c.id === checklistId);
      if (checklist) {
        checklist.completed = completed;
        this.render(card);
        this.app.saveData();
      }
    }
  }

  // Atualiza posição do card
  updatePosition(cardId, x, y) {
    const card = this.app.cards.find((c) => c.id === cardId);
    if (card) {
      card.x = x;
      card.y = y;
      this.app.saveData();
    }
  }

  // Deleta um card
  delete(cardId) {
    this.app.cards = this.app.cards.filter((c) => c.id !== cardId);

    // Remove conexões
    this.app.connections = this.app.connections.filter((conn) => {
      const fromCard = conn.fromCardId || conn.from;
      const toCard = conn.toCardId || conn.to;
      return fromCard !== cardId && toCard !== cardId;
    });

    const element = document.getElementById(`card-${cardId}`);
    if (element) {
      element.remove();
    }

    this.app.renderConnections();
    this.app.saveData();
  }

  // Encontra um card por ID
  find(cardId) {
    return this.app.cards.find((c) => c.id === cardId);
  }

  // Renderiza todos os cards
  renderAll() {
    this.app.cards.forEach((card) => this.render(card));
  }
}

// Exporta para uso global
window.CardManager = CardManager;

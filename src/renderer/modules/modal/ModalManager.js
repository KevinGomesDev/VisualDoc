// ==========================================
// ModalManager - Gerenciamento de Modais
// ==========================================

class ModalManager {
  constructor(app) {
    this.app = app;
    this.selectedCategoryIds = [];
  }

  // Abre o modal de edição de card
  openCardModal(card) {
    this.app.selectedCardId = card.id;
    this.selectedCategoryIds = card.categoryIds
      ? [...card.categoryIds]
      : card.categoryId
        ? [card.categoryId]
        : [];

    this.app.cardModal.classList.remove("hidden");
    this.app.modalTitle.textContent = card.title ? "Editar Card" : "Novo Card";
    this.app.cardTitleInput.value = card.title;
    this.app.cardDetailsInput.value = card.details || "";

    this.renderCategoryButtons();
    this.renderChecklistInputs(card.checklists);
  }

  // Fecha o modal de card
  closeCardModal() {
    if (this.app.selectedCardId) {
      this.saveCardFromModal();
    } else {
      this.app.cardModal.classList.add("hidden");
      this.selectedCategoryIds = [];
    }
  }

  // Renderiza botões de categoria
  renderCategoryButtons() {
    this.app.categoryButtons.innerHTML = "";

    this.app.categories.forEach((cat) => {
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
          if (this.selectedCategoryIds.length > 1) {
            this.selectedCategoryIds = this.selectedCategoryIds.filter(
              (id) => id !== cat.id,
            );
          }
        } else {
          this.selectedCategoryIds.push(cat.id);
        }
        this.renderCategoryButtons();
      });

      this.app.categoryButtons.appendChild(btn);
    });
  }

  // Renderiza inputs de checklist
  renderChecklistInputs(checklists) {
    this.app.checklistsContainer.innerHTML = "";
    checklists.forEach((checklist) => {
      this.addChecklistInput(checklist);
    });
  }

  // Adiciona input de checklist
  addChecklistInput(checklist = null) {
    const id = checklist?.id || this.app.generateId();
    const div = document.createElement("div");
    div.className = "checklist-item";
    div.dataset.id = id;
    div.draggable = true;

    const checklistCategoryId = checklist?.categoryId;
    const categoryOptions = this.app.categories
      .map(
        (cat) =>
          `<option value="${cat.id}" ${
            checklistCategoryId !== null &&
            checklistCategoryId !== undefined &&
            String(checklistCategoryId) === String(cat.id)
              ? "selected"
              : ""
          }>${this.app.escapeHtml(cat.name)}</option>`,
      )
      .join("");

    div.innerHTML = `
      <div class="checklist-item-header">
        <span class="checklist-drag-handle" title="Arrastar para reordenar">⋮⋮</span>
        <input type="text" class="checklist-name" placeholder="Nome do item" value="${
          checklist ? this.app.escapeHtml(checklist.name) : ""
        }">
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
        <textarea class="checklist-details" placeholder="Descrição do item (aparece ao passar o mouse)">${
          checklist?.details ? this.app.escapeHtml(checklist.details) : ""
        }</textarea>
      </div>
    `;

    div.querySelector(".btn-remove-checklist").addEventListener("click", () => {
      div.remove();
    });

    div.querySelector(".btn-toggle-details").addEventListener("click", () => {
      const detailsDiv = div.querySelector(".checklist-item-details");
      detailsDiv.classList.toggle("hidden");
    });

    // Drag and drop events
    div.addEventListener("dragstart", (e) => {
      div.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", id);
    });

    div.addEventListener("dragend", () => {
      div.classList.remove("dragging");
    });

    div.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      const draggingItem =
        this.app.checklistsContainer.querySelector(".dragging");
      if (draggingItem && draggingItem !== div) {
        const rect = div.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        if (e.clientY < midY) {
          div.parentNode.insertBefore(draggingItem, div);
        } else {
          div.parentNode.insertBefore(draggingItem, div.nextSibling);
        }
      }
    });

    this.app.checklistsContainer.appendChild(div);
  }

  // Salva card do modal
  saveCardFromModal() {
    const card = this.app.cards.find((c) => c.id === this.app.selectedCardId);
    if (!card) return;

    const categoryIds =
      this.selectedCategoryIds.length > 0
        ? [...this.selectedCategoryIds]
        : [this.app.categories[0]?.id].filter(Boolean);

    card.title = this.app.cardTitleInput.value || "Sem título";
    card.categoryIds = categoryIds;
    card.categoryId = categoryIds[0] || null;
    card.category =
      this.app.categories.find((c) => c.id === categoryIds[0])?.name || "Geral";
    card.color = this.app.getCardPrimaryColor(card);
    card.details = this.app.cardDetailsInput.value || "";

    // Coleta checklists
    const oldChecklists = [...card.checklists];
    card.checklists = [];
    this.app.checklistsContainer
      .querySelectorAll(".checklist-item")
      .forEach((item) => {
        const name =
          item.querySelector(".checklist-name")?.value ||
          item.querySelector('input[type="text"]').value;
        const detailsTextarea = item.querySelector(".checklist-details");
        const details = detailsTextarea ? detailsTextarea.value : "";
        const categorySelect = item.querySelector(".checklist-category-select");
        const categoryId =
          categorySelect && categorySelect.value !== ""
            ? categorySelect.value
            : null;

        if (name.trim()) {
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

    this.app.cardManager.render(card);
    this.app.renderConnections();
    this.app.saveData();

    this.app.cardModal.classList.add("hidden");
    this.app.selectedCardId = null;
    this.selectedCategoryIds = [];
  }

  // Vincula eventos do modal
  bindEvents() {
    this.app.btnCloseModal.addEventListener("click", () =>
      this.closeCardModal(),
    );
    this.app.btnAddChecklist.addEventListener("click", () =>
      this.addChecklistInput(),
    );

    // Fechar modal ao clicar fora
    this.app.cardModal.addEventListener("click", (e) => {
      if (e.target === this.app.cardModal) {
        this.closeCardModal();
      }
    });

    // Fechar modal de categorias ao clicar fora
    this.app.categoriesModal.addEventListener("click", (e) => {
      if (e.target === this.app.categoriesModal) {
        this.app.categoryManager.closeModal();
      }
    });
  }
}

// Exporta para uso global
window.ModalManager = ModalManager;

// ==========================================
// CategoryManager - Gerenciamento de Categorias
// ==========================================

class CategoryManager {
  constructor(app) {
    this.app = app;
  }

  // Abre o modal de categorias
  openModal() {
    this.app.categoriesModal.classList.remove("hidden");
    this.renderList();
    this.app.newCategoryName.value = "";
    this.app.newCategoryColor.value = "#6366f1";
  }

  // Fecha o modal de categorias
  closeModal() {
    this.app.categoriesModal.classList.add("hidden");
  }

  // Renderiza a lista de categorias
  renderList() {
    this.app.categoriesList.innerHTML = "";

    this.app.categories.forEach((cat) => {
      const item = document.createElement("div");
      item.className = "category-list-item";
      item.innerHTML = `
        <input type="color" class="category-color-input" value="${cat.color}" title="Alterar cor">
        <input type="text" class="category-name-input" value="${this.app.escapeHtml(cat.name)}" placeholder="Nome da categoria">
        <button class="btn-delete-category" data-id="${cat.id}" title="Excluir">&times;</button>
      `;

      // Event listener para mudança de cor
      item
        .querySelector(".category-color-input")
        .addEventListener("change", (e) => {
          cat.color = e.target.value;
          this.updateCardsWithCategory(cat.id);
          this.app.saveData();
        });

      // Event listener para mudança de nome
      item
        .querySelector(".category-name-input")
        .addEventListener("change", (e) => {
          cat.name = e.target.value.trim() || "Sem nome";
          this.updateCardsWithCategory(cat.id);
          this.app.saveData();
        });

      // Event listener para deletar
      item
        .querySelector(".btn-delete-category")
        .addEventListener("click", () => {
          this.delete(cat.id);
        });

      this.app.categoriesList.appendChild(item);
    });
  }

  // Atualiza cards que usam uma categoria (no card ou em checklists)
  updateCardsWithCategory(categoryId) {
    this.app.cards.forEach((card) => {
      const cardIds =
        card.categoryIds || (card.categoryId ? [card.categoryId] : []);

      // Verifica se o card ou algum checklist usa essa categoria
      const cardUsesCategory = cardIds.includes(categoryId);
      const checklistUsesCategory = card.checklists?.some(
        (checklist) => String(checklist.categoryId) === String(categoryId),
      );

      if (cardUsesCategory || checklistUsesCategory) {
        card.color = this.app.getCardPrimaryColor(card);
        card.category =
          this.app.categories.find((c) => c.id === card.categoryId)?.name ||
          "Geral";
        this.app.cardManager.render(card);
      }
    });
    this.app.renderConnections();
  }

  // Adiciona uma nova categoria
  add() {
    const name = this.app.newCategoryName.value.trim();
    const color = this.app.newCategoryColor.value;

    if (!name) {
      alert("Digite um nome para a categoria.");
      return;
    }

    const newCategory = {
      id: "cat_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9),
      name: name,
      color: color,
    };

    this.app.categories.push(newCategory);
    this.app.newCategoryName.value = "";
    this.app.newCategoryColor.value = "#6366f1";
    this.renderList();
    this.app.saveData();
  }

  // Deleta uma categoria
  delete(categoryId) {
    // Não permite excluir se houver apenas uma categoria
    if (this.app.categories.length <= 1) {
      alert("Você precisa ter pelo menos uma categoria.");
      return;
    }

    // Verifica se há cards usando essa categoria
    const cardsUsingCategory = this.app.cards.filter((c) => {
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
      const firstCategory = this.app.categories.find(
        (c) => c.id !== categoryId,
      );
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
          this.app.categories.find((c) => c.id === card.categoryId)?.name ||
          "Geral";
        card.color = this.app.getCardPrimaryColor(card);
        this.app.cardManager.render(card);
      });
    }

    this.app.categories = this.app.categories.filter(
      (c) => c.id !== categoryId,
    );
    this.renderList();
    this.app.saveData();
  }

  // Retorna categorias de um card
  getCardCategories(card) {
    const categoryIds =
      card.categoryIds || (card.categoryId ? [card.categoryId] : []);
    return categoryIds
      .map((id) => this.app.categories.find((c) => c.id === id))
      .filter(Boolean);
  }

  // Retorna cor primária do card
  getCardPrimaryColor(card) {
    const categories = this.getCardCategories(card);
    return categories.length > 0 ? categories[0].color : "#6366f1";
  }
}

// Exporta para uso global
window.CategoryManager = CategoryManager;

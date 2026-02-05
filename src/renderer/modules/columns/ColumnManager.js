// ==========================================
// ColumnManager - Gerenciamento de Colunas/Divisores
// ==========================================

class ColumnManager {
  constructor(app) {
    this.app = app;
  }

  // Cria uma nova coluna
  create(position = null) {
    const id = this.app.generateId();
    const containerRect = this.app.canvasContainer.getBoundingClientRect();

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
      x = (containerRect.width / 2 - 150) / this.app.zoom - this.app.pan.x;
      y = (containerRect.height / 2 - 200) / this.app.zoom - this.app.pan.y;
    }

    const column = {
      id,
      x,
      y,
      width: 300,
      height: 200,
      color: "#6c5ce7",
    };

    this.app.columns.push(column);
    this.render(column);
    this.app.saveData();

    return column;
  }

  // Renderiza uma coluna
  render(column) {
    const existingElement = document.getElementById(`column-${column.id}`);
    if (existingElement) {
      existingElement.remove();
    }

    const columnElement = document.createElement("div");
    columnElement.className = "canvas-column";
    columnElement.id = `column-${column.id}`;
    columnElement.style.left = `${column.x}px`;
    columnElement.style.top = `${column.y}px`;
    columnElement.style.width = `${column.width || 300}px`;
    columnElement.style.height = `${column.height || 400}px`;
    columnElement.style.backgroundColor = column.color || "#6c5ce7";

    // Check if selected
    if (
      this.app.selectedItemId === column.id &&
      this.app.selectedItemType === "column"
    ) {
      columnElement.classList.add("selected");
    }

    columnElement.innerHTML = `<div class="column-resize-handle"></div>`;

    this.bindEvents(columnElement, column);
    this.app.cardsContainer.appendChild(columnElement);
  }

  // Vincula eventos
  bindEvents(columnElement, column) {
    // Mouse down
    columnElement.addEventListener("mousedown", (e) => {
      if (!e.target.classList.contains("column-resize-handle")) {
        this.app.onItemMouseDown(e, column.id, "column");
      }
    });

    // Double click para mudar cor
    columnElement.addEventListener("dblclick", (e) => {
      e.stopPropagation();
      this.openColorPicker(column);
    });

    // Resize handle
    const resizeHandle = columnElement.querySelector(".column-resize-handle");
    resizeHandle.addEventListener("mousedown", (e) => {
      e.stopPropagation();
      this.app.isResizing = true;
      this.app.resizingCardId = column.id;
      this.app.resizingItemType = "column";
      this.app.resizeStart = {
        width: column.width || 300,
        height: column.height || 400,
        mouseX: e.clientX,
        mouseY: e.clientY,
      };
    });

    // Context menu
    columnElement.addEventListener("contextmenu", (e) =>
      this.app.onItemContextMenu(e, column.id, "column"),
    );
  }

  // Abre color picker
  openColorPicker(column) {
    const colorInput = document.createElement("input");
    colorInput.type = "color";
    colorInput.value = column.color || "#6c5ce7";
    colorInput.style.position = "fixed";
    colorInput.style.left = "50%";
    colorInput.style.top = "50%";
    colorInput.style.transform = "translate(-50%, -50%)";
    colorInput.style.opacity = "0";
    colorInput.style.pointerEvents = "none";
    document.body.appendChild(colorInput);

    colorInput.addEventListener("input", (e) => {
      column.color = e.target.value;
      const el = document.getElementById(`column-${column.id}`);
      if (el) el.style.backgroundColor = column.color;
    });

    colorInput.addEventListener("change", () => {
      this.app.saveData();
      colorInput.remove();
    });

    colorInput.addEventListener("blur", () => {
      colorInput.remove();
    });

    colorInput.click();
  }

  // Deleta uma coluna
  delete(columnId) {
    this.app.columns = this.app.columns.filter((c) => c.id !== columnId);
    const el = document.getElementById(`column-${columnId}`);
    if (el) el.remove();
    this.app.saveData();
  }

  // Encontra uma coluna por ID
  find(columnId) {
    return this.app.columns.find((c) => c.id === columnId);
  }

  // Renderiza todas as colunas
  renderAll() {
    this.app.columns.forEach((column) => this.render(column));
  }

  // Atualiza o resize durante o arraste
  handleResize(e) {
    const column = this.app.columns.find(
      (c) => c.id === this.app.resizingCardId,
    );
    const columnElement = document.getElementById(
      `column-${this.app.resizingCardId}`,
    );

    if (column && columnElement) {
      const deltaX = (e.clientX - this.app.resizeStart.mouseX) / this.app.zoom;
      const deltaY = (e.clientY - this.app.resizeStart.mouseY) / this.app.zoom;
      const newWidth = Math.max(100, this.app.resizeStart.width + deltaX);
      const newHeight = Math.max(100, this.app.resizeStart.height + deltaY);
      column.width = newWidth;
      column.height = newHeight;
      columnElement.style.width = `${newWidth}px`;
      columnElement.style.height = `${newHeight}px`;
    }
  }
}

// Exporta para uso global
window.ColumnManager = ColumnManager;

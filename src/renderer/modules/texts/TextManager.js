// ==========================================
// TextManager - Gerenciamento de Textos no Canvas
// ==========================================

class TextManager {
  constructor(app) {
    this.app = app;
  }

  // Cria um novo texto
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
      x = (containerRect.width / 2 - 100) / this.app.zoom - this.app.pan.x;
      y = (containerRect.height / 2 - 20) / this.app.zoom - this.app.pan.y;
    }

    const text = {
      id,
      content: "Novo Texto",
      x,
      y,
      fontSize: 16,
      color: "#ffffff",
      width: 200,
    };

    this.app.texts.push(text);
    this.render(text);
    this.app.saveData();

    return text;
  }

  // Renderiza um texto
  render(text) {
    const existingElement = document.getElementById(`text-${text.id}`);
    if (existingElement) {
      existingElement.remove();
    }

    const textElement = document.createElement("div");
    textElement.className = "canvas-text";
    textElement.id = `text-${text.id}`;
    textElement.style.left = `${text.x}px`;
    textElement.style.top = `${text.y}px`;
    textElement.style.fontSize = `${text.fontSize || 16}px`;
    textElement.style.color = text.color || "#ffffff";
    if (text.width) textElement.style.width = `${text.width}px`;
    textElement.contentEditable = "false";
    textElement.textContent = text.content || "Novo Texto";

    // Check if selected
    if (
      this.app.selectedItemId === text.id &&
      this.app.selectedItemType === "text"
    ) {
      textElement.classList.add("selected");
    }

    // Add resize handle for font size
    const resizeHandle = document.createElement("div");
    resizeHandle.className = "text-resize-handle";
    textElement.appendChild(resizeHandle);

    this.bindEvents(textElement, text, resizeHandle);
    this.app.cardsContainer.appendChild(textElement);
  }

  // Vincula eventos
  bindEvents(textElement, text, resizeHandle) {
    // Mouse down
    textElement.addEventListener("mousedown", (e) => {
      if (e.target.classList.contains("text-resize-handle")) return;
      this.app.onItemMouseDown(e, text.id, "text");
    });

    // Double click para editar
    textElement.addEventListener("dblclick", (e) => {
      e.stopPropagation();
      textElement.contentEditable = "true";
      textElement.focus();
      // Select all text for easy editing
      const range = document.createRange();
      range.selectNodeContents(textElement);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    });

    // Blur para salvar
    textElement.addEventListener("blur", () => {
      textElement.contentEditable = "false";
      text.content = textElement.textContent;
      this.app.saveData();
    });

    // Escape para cancelar
    textElement.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        textElement.blur();
      }
    });

    // Context menu
    textElement.addEventListener("contextmenu", (e) =>
      this.app.onItemContextMenu(e, text.id, "text"),
    );

    // Resize handle para font size
    resizeHandle.addEventListener("mousedown", (e) => {
      e.stopPropagation();
      this.app.isResizing = true;
      this.app.resizingCardId = text.id;
      this.app.resizingItemType = "text";
      this.app.resizeStart = {
        fontSize: text.fontSize || 16,
        mouseY: e.clientY,
      };
    });
  }

  // Deleta um texto
  delete(textId) {
    this.app.texts = this.app.texts.filter((t) => t.id !== textId);
    const el = document.getElementById(`text-${textId}`);
    if (el) el.remove();
    this.app.saveData();
  }

  // Encontra um texto por ID
  find(textId) {
    return this.app.texts.find((t) => t.id === textId);
  }

  // Renderiza todos os textos
  renderAll() {
    this.app.texts.forEach((text) => this.render(text));
  }

  // Atualiza o resize durante o arraste
  handleResize(e) {
    const text = this.app.texts.find((t) => t.id === this.app.resizingCardId);
    const textElement = document.getElementById(
      `text-${this.app.resizingCardId}`,
    );

    if (text && textElement) {
      const deltaY = (e.clientY - this.app.resizeStart.mouseY) / this.app.zoom;
      const newFontSize = Math.max(
        6,
        this.app.resizeStart.fontSize + deltaY * 0.5,
      );
      text.fontSize = newFontSize;
      textElement.style.fontSize = `${newFontSize}px`;
    }
  }
}

// Exporta para uso global
window.TextManager = TextManager;

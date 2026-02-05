// ====================================================================================
// TextManager - Gerenciamento de Textos no Canvas
// ====================================================================================

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
    if (text.height) textElement.style.height = `${text.height}px`;
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

    // Resize handle para tamanho (width/height como cards e colunas)
    resizeHandle.addEventListener("mousedown", (e) => {
      e.stopPropagation();
      this.app.isResizing = true;
      this.app.resizingCardId = text.id;
      this.app.resizingItemType = "text";
      this.app.resizeStart = {
        width: text.width || 200,
        height: text.height || textElement.offsetHeight,
        fontSize: text.fontSize || 16,
        mouseX: e.clientX,
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

  // Atualiza o resize durante o arraste (width/height como cards e colunas)
  handleResize(e) {
    const text = this.app.texts.find((t) => t.id === this.app.resizingCardId);
    const textElement = document.getElementById(
      `text-${this.app.resizingCardId}`,
    );

    if (text && textElement) {
      const deltaX = (e.clientX - this.app.resizeStart.mouseX) / this.app.zoom;
      const deltaY = (e.clientY - this.app.resizeStart.mouseY) / this.app.zoom;
      const newWidth = Math.max(50, this.app.resizeStart.width + deltaX);
      const newHeight = Math.max(20, this.app.resizeStart.height + deltaY);

      // Calcula o fator de escala baseado na mudança de tamanho
      const scaleX = newWidth / this.app.resizeStart.width;
      const scaleY = newHeight / this.app.resizeStart.height;
      // Usa a média dos fatores para um crescimento proporcional
      const scaleFactor = (scaleX + scaleY) / 2;

      // Ajusta o fontSize proporcionalmente
      const baseFontSize = this.app.resizeStart.fontSize || 16;
      const newFontSize = Math.max(
        8,
        Math.min(200, baseFontSize * scaleFactor),
      );

      text.width = newWidth;
      text.height = newHeight;
      text.fontSize = newFontSize;
      textElement.style.width = `${newWidth}px`;
      textElement.style.height = `${newHeight}px`;
      textElement.style.fontSize = `${newFontSize}px`;
    }
  }
}

// Exporta para uso global
window.TextManager = TextManager;

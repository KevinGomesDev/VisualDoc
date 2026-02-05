// ==========================================
// CanvasManager - Gerenciamento do Canvas (Pan, Zoom, Eventos)
// ==========================================

class CanvasManager {
  constructor(app) {
    this.app = app;
    this.zoom = 1;
    this.pan = { x: 0, y: 0 };
    this.isPanning = false;
    this.panStart = { x: 0, y: 0 };
    this.isDragging = false;
    this.dragOffsets = {};

    // Touch state
    this.isTouchPanning = false;
    this.touchPanStart = { x: 0, y: 0 };
    this.lastPinchDistance = 0;
    this.isPinching = false;
    this.touchDragItem = null;
    this.touchDragStartPos = null;
    this.touchMoved = false;
  }

  // Inicializa eventos touch (chamado após bindElements)
  initTouchEvents() {
    const canvas = this.app.canvasContainer;
    if (!canvas) return;

    // Touch Start
    canvas.addEventListener("touchstart", (e) => this.onTouchStart(e), {
      passive: false,
    });

    // Touch Move - no document para capturar movimentos fora do canvas
    document.addEventListener("touchmove", (e) => this.onTouchMove(e), {
      passive: false,
    });

    // Touch End
    document.addEventListener("touchend", (e) => this.onTouchEnd(e), {
      passive: false,
    });
    document.addEventListener("touchcancel", (e) => this.onTouchEnd(e), {
      passive: false,
    });

    // Previne zoom do navegador
    canvas.addEventListener("gesturestart", (e) => e.preventDefault(), {
      passive: false,
    });
    canvas.addEventListener("gesturechange", (e) => e.preventDefault(), {
      passive: false,
    });
    canvas.addEventListener("gestureend", (e) => e.preventDefault(), {
      passive: false,
    });
  }

  // Touch Start Handler
  onTouchStart(e) {
    // Ignora inputs
    if (this.isInputElement(e.target)) return;

    const touches = e.touches;

    // Fecha menus de contexto
    this.app.contextMenuManager.hideAll();

    // 2 dedos = Pinch Zoom
    if (touches.length === 2) {
      e.preventDefault();
      this.isPinching = true;
      this.isTouchPanning = false;
      this.lastPinchDistance = this.getDistance(touches[0], touches[1]);
      return;
    }

    // 1 dedo
    if (touches.length === 1) {
      const touch = touches[0];
      const target = touch.target;

      this.touchMoved = false;

      // Verifica se tocou em um card, texto ou coluna
      const cardEl = target.closest(".card");
      const textEl = target.closest(".text-element");
      const columnEl = target.closest(".column-element");

      if (cardEl || textEl || columnEl) {
        e.preventDefault();

        let itemId, itemType, item;

        if (cardEl) {
          itemId = cardEl.id.replace("card-", "");
          itemType = "card";
          item = this.app.cards.find((c) => c.id === itemId);
        } else if (textEl) {
          itemId = textEl.id.replace("text-", "");
          itemType = "text";
          item = this.app.texts.find((t) => t.id === itemId);
        } else if (columnEl) {
          itemId = columnEl.id.replace("column-", "");
          itemType = "column";
          item = this.app.columns.find((c) => c.id === itemId);
        }

        if (item) {
          // Seleciona o item se não estiver selecionado
          if (!this.app.selectionManager.isSelected(itemId, itemType)) {
            this.app.selectionManager.clear();
            this.app.selectionManager.select(itemId, itemType);
          }

          // Prepara para drag
          this.touchDragItem = { id: itemId, type: itemType, item };
          this.touchDragStartPos = {
            x: touch.clientX,
            y: touch.clientY,
            itemX: item.x,
            itemY: item.y,
          };
        }
      } else {
        // Tocou no fundo - inicia pan
        e.preventDefault();
        this.isTouchPanning = true;
        this.touchPanStart = {
          x: touch.clientX - this.pan.x,
          y: touch.clientY - this.pan.y,
        };

        // Limpa seleção
        this.app.selectionManager.clear();
      }
    }
  }

  // Touch Move Handler
  onTouchMove(e) {
    const touches = e.touches;

    // Ignora inputs
    if (this.isInputElement(e.target)) return;

    // Pinch Zoom com 2 dedos
    if (touches.length === 2 && this.isPinching) {
      e.preventDefault();

      const newDistance = this.getDistance(touches[0], touches[1]);
      const center = this.getCenter(touches[0], touches[1]);

      // Calcula o fator de zoom
      const scale = newDistance / this.lastPinchDistance;
      const newZoom = Math.max(0.2, Math.min(3, this.zoom * scale));

      // Zoom centralizado no ponto de pinch
      const canvasRect = this.app.canvasContainer.getBoundingClientRect();
      const centerX = center.x - canvasRect.left;
      const centerY = center.y - canvasRect.top;

      // Ajusta pan para manter o centro
      const zoomDelta = newZoom / this.zoom;
      this.pan.x = centerX - (centerX - this.pan.x) * zoomDelta;
      this.pan.y = centerY - (centerY - this.pan.y) * zoomDelta;

      this.zoom = newZoom;
      this.lastPinchDistance = newDistance;
      this.applyTransform();
      return;
    }

    // 1 dedo
    if (touches.length === 1) {
      const touch = touches[0];

      // Pan do canvas
      if (this.isTouchPanning) {
        e.preventDefault();
        this.pan.x = touch.clientX - this.touchPanStart.x;
        this.pan.y = touch.clientY - this.touchPanStart.y;
        this.applyTransform();
        return;
      }

      // Drag de item
      if (this.touchDragItem && this.touchDragStartPos) {
        e.preventDefault();

        const dx = touch.clientX - this.touchDragStartPos.x;
        const dy = touch.clientY - this.touchDragStartPos.y;

        // Só começa o drag se moveu mais de 5px (evita toques acidentais)
        if (!this.touchMoved && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
          this.touchMoved = true;
          this.isDragging = true;

          // Adiciona classe de dragging
          const prefix =
            this.touchDragItem.type === "card"
              ? "card"
              : this.touchDragItem.type === "text"
                ? "text"
                : "column";
          const el = document.getElementById(
            `${prefix}-${this.touchDragItem.id}`,
          );
          if (el) el.classList.add("dragging");
        }

        if (this.touchMoved) {
          // Atualiza posição do item
          const item = this.touchDragItem.item;
          item.x = this.touchDragStartPos.itemX + dx / this.zoom;
          item.y = this.touchDragStartPos.itemY + dy / this.zoom;

          const prefix =
            this.touchDragItem.type === "card"
              ? "card"
              : this.touchDragItem.type === "text"
                ? "text"
                : "column";
          const element = document.getElementById(
            `${prefix}-${this.touchDragItem.id}`,
          );
          if (element) {
            element.style.left = `${item.x}px`;
            element.style.top = `${item.y}px`;
          }

          this.app.renderConnections();
        }
      }
    }
  }

  // Touch End Handler
  onTouchEnd(e) {
    // Ignora inputs
    if (this.isInputElement(e.target)) return;

    // Finaliza pinch
    if (this.isPinching) {
      this.isPinching = false;
      this.lastPinchDistance = 0;
    }

    // Finaliza pan
    if (this.isTouchPanning) {
      this.isTouchPanning = false;
    }

    // Finaliza drag de item
    if (this.touchDragItem) {
      if (this.touchMoved) {
        // Remove classe de dragging
        const prefix =
          this.touchDragItem.type === "card"
            ? "card"
            : this.touchDragItem.type === "text"
              ? "text"
              : "column";
        const el = document.getElementById(
          `${prefix}-${this.touchDragItem.id}`,
        );
        if (el) el.classList.remove("dragging");

        // Salva
        this.app.saveData();
      }

      this.touchDragItem = null;
      this.touchDragStartPos = null;
      this.touchMoved = false;
      this.isDragging = false;
    }
  }

  // Helpers
  isInputElement(target) {
    return (
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.tagName === "SELECT" ||
      target.isContentEditable
    );
  }

  getDistance(touch1, touch2) {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  getCenter(touch1, touch2) {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2,
    };
  }

  // Mouse down no canvas
  onMouseDown(e) {
    // Ignora se clicou em controles de conexão
    if (
      e.target.closest(".waypoint-handle") ||
      e.target.closest(".endpoint-handle") ||
      e.target.closest(".add-waypoint-btn") ||
      e.target.closest(".connection-hit-area")
    ) {
      return;
    }

    // Se clicou no fundo
    if (
      e.target === this.app.canvasContainer ||
      e.target === this.app.cardsContainer ||
      e.target.id === "connections-layer" ||
      e.target.closest("#connections-layer")
    ) {
      this.app.contextMenuManager.hideAll();

      // Se está no modo de conexão, cancela
      if (this.app.isConnecting) {
        this.app.cancelConnecting();
        return;
      }

      // Limpa seleção ao clicar no fundo (se não for Ctrl)
      if (!e.ctrlKey) {
        this.app.selectionManager.clear();
      }

      // Inicia pan da câmera
      if (e.button === 0) {
        this.isPanning = true;
        this.panStart = {
          x: e.clientX - this.pan.x,
          y: e.clientY - this.pan.y,
        };
        this.app.canvasContainer.style.cursor = "grabbing";
      }
    }
  }

  // Context menu do canvas
  onContextMenu(e) {
    if (
      e.target === this.app.canvasContainer ||
      e.target === this.app.cardsContainer ||
      e.target.id === "connections-layer"
    ) {
      e.preventDefault();
      this.app.contextMenuManager.showCanvasMenu(e.clientX, e.clientY);
    }
  }

  // Mouse move
  onMouseMove(e) {
    // Pan da câmera
    if (this.isPanning) {
      this.pan.x = e.clientX - this.panStart.x;
      this.pan.y = e.clientY - this.panStart.y;
      this.applyTransform();
      return true;
    }

    // Arrastar items
    if (
      this.isDragging &&
      this.app.selectionManager.selectedItemIds.length > 0
    ) {
      const canvasRect = this.app.canvasContainer.getBoundingClientRect();
      const canvasX = (e.clientX - canvasRect.left - this.pan.x) / this.zoom;
      const canvasY = (e.clientY - canvasRect.top - this.pan.y) / this.zoom;

      this.app.selectionManager.selectedItemIds.forEach(({ id, type }) => {
        let item, element;
        const offsetKey = `${type}-${id}`;
        const offset = this.dragOffsets?.[offsetKey];

        if (type === "card") {
          item = this.app.cards.find((c) => c.id === id);
          element = document.getElementById(`card-${id}`);
        } else if (type === "text") {
          item = this.app.texts.find((t) => t.id === id);
          element = document.getElementById(`text-${id}`);
        } else if (type === "column") {
          item = this.app.columns.find((c) => c.id === id);
          element = document.getElementById(`column-${id}`);
        }

        if (item && element && offset) {
          item.x = canvasX - offset.x;
          item.y = canvasY - offset.y;
          element.style.left = `${item.x}px`;
          element.style.top = `${item.y}px`;
        }
      });

      this.app.renderConnections();
      return true;
    }

    return false;
  }

  // Mouse up
  onMouseUp(e) {
    // Finaliza pan
    if (this.isPanning) {
      this.isPanning = false;
      this.app.canvasContainer.style.cursor = "default";
    }

    // Finaliza drag
    if (
      this.isDragging &&
      this.app.selectionManager.selectedItemIds.length > 0
    ) {
      this.app.selectionManager.selectedItemIds.forEach(({ id, type }) => {
        const prefix =
          type === "card" ? "card" : type === "text" ? "text" : "column";
        const element = document.getElementById(`${prefix}-${id}`);
        if (element) {
          element.classList.remove("dragging");
        }
      });
      this.dragOffsets = {};
      this.app.saveData();
    }
    this.isDragging = false;
  }

  // Wheel para zoom
  onWheel(e) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    this.adjustZoom(delta);
  }

  // Ajusta zoom
  adjustZoom(delta) {
    this.zoom = Math.max(0.1, this.zoom + delta);
    this.applyTransform();
  }

  // Aplica transformação
  applyTransform() {
    const transform = `translate(${this.pan.x}px, ${this.pan.y}px) scale(${this.zoom})`;
    this.app.cardsContainer.style.transform = transform;
    this.app.connectionsLayer.style.transform = transform;
  }

  // Reseta a view
  resetView() {
    this.zoom = 1;
    this.pan = { x: 0, y: 0 };
    this.applyTransform();
  }

  // Inicia arraste de item
  startDragging(e, itemId, itemType) {
    this.isDragging = true;

    const canvasRect = this.app.canvasContainer.getBoundingClientRect();
    const canvasX = (e.clientX - canvasRect.left - this.pan.x) / this.zoom;
    const canvasY = (e.clientY - canvasRect.top - this.pan.y) / this.zoom;

    this.dragOffsets = {};
    this.app.selectionManager.selectedItemIds.forEach(({ id, type }) => {
      let item;
      if (type === "card") item = this.app.cards.find((c) => c.id === id);
      else if (type === "text") item = this.app.texts.find((t) => t.id === id);
      else if (type === "column")
        item = this.app.columns.find((c) => c.id === id);

      if (item) {
        this.dragOffsets[`${type}-${id}`] = {
          x: canvasX - item.x,
          y: canvasY - item.y,
          type,
        };
      }
    });

    this.app.selectionManager.selectedItemIds.forEach(({ id, type }) => {
      const prefix =
        type === "card" ? "card" : type === "text" ? "text" : "column";
      const el = document.getElementById(`${prefix}-${id}`);
      if (el) el.classList.add("dragging");
    });
  }

  // Getters
  getZoom() {
    return this.zoom;
  }

  getPan() {
    return this.pan;
  }
}

// Exporta para uso global
window.CanvasManager = CanvasManager;

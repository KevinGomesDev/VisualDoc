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

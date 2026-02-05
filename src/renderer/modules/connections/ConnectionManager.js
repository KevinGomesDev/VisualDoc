/**
 * ConnectionManager - Gerencia conexões entre cards
 * Funcionalidades:
 * - Clicar na linha: seleciona
 * - Delete: remove conexão selecionada
 * - Double-click: adiciona waypoint
 * - Arrastar waypoints: move pontos de controle
 * - Arrastar endpoints: reposiciona extremidades
 */

class ConnectionManager {
  constructor(app) {
    this.app = app;
    this.selectedIndex = null;
    this.dragging = null; // { type: 'waypoint' | 'endpoint', index?: number, endType?: 'from' | 'to' }

    this.setupEvents();
  }

  get connections() {
    return this.app.connections;
  }

  get connectionsLayer() {
    return this.app.connectionsLayer;
  }

  setupEvents() {
    // Mouse move global
    document.addEventListener("mousemove", (e) => this.onMouseMove(e));
    document.addEventListener("mouseup", (e) => this.onMouseUp(e));

    // Keyboard
    document.addEventListener("keydown", (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")
        return;

      if (e.key === "Delete" && this.selectedIndex !== null) {
        e.preventDefault();
        this.deleteSelected();
      }

      if (e.key === "Escape" && this.selectedIndex !== null) {
        this.deselect();
      }
    });
  }

  // ==========================================
  // Seleção
  // ==========================================

  select(index) {
    this.selectedIndex = index;
    this.app.selectedConnectionIndex = index;
    // Limpa seleção de itens mas mantém a conexão selecionada
    if (this.app.selectionManager) {
      this.app.selectionManager.clear(true);
    }
    this.render();
  }

  deselect() {
    this.selectedIndex = null;
    this.app.selectedConnectionIndex = null;
    this.render();
  }

  deleteSelected() {
    if (this.selectedIndex === null) return;
    if (this.selectedIndex < 0 || this.selectedIndex >= this.connections.length)
      return;

    this.connections.splice(this.selectedIndex, 1);
    this.selectedIndex = null;
    this.render();
    this.app.saveData();
  }

  // ==========================================
  // Waypoints
  // ==========================================

  addWaypoint(connIndex, x, y) {
    const conn = this.connections[connIndex];
    if (!conn) return;

    if (!conn.waypoints) conn.waypoints = [];
    conn.waypoints.push({ x, y });
    this.render();
    this.app.saveData();

    return conn.waypoints.length - 1; // Retorna índice do novo waypoint
  }

  removeWaypoint(connIndex, wpIndex) {
    const conn = this.connections[connIndex];
    if (!conn || !conn.waypoints) return;

    conn.waypoints.splice(wpIndex, 1);
    this.render();
    this.app.saveData();
  }

  clearWaypoints(connIndex) {
    const conn = this.connections[connIndex];
    if (!conn) return;

    conn.waypoints = [];
    this.render();
    this.app.saveData();
  }

  // ==========================================
  // Dragging
  // ==========================================

  startDragWaypoint(connIndex, wpIndex, e) {
    e.preventDefault();
    e.stopPropagation();

    this.selectedIndex = connIndex;
    this.dragging = {
      type: "waypoint",
      connIndex,
      wpIndex,
    };

    document.body.style.cursor = "grabbing";
  }

  startDragEndpoint(connIndex, endType, e) {
    e.preventDefault();
    e.stopPropagation();

    const conn = this.connections[connIndex];
    if (!conn) return;

    // Guarda a posição/conexão original para restaurar se não soltar em connector
    const originalData = {
      fromCardId: conn.fromCardId,
      toCardId: conn.toCardId,
      from: conn.from,
      to: conn.to,
      fromChecklistId: conn.fromChecklistId,
      toChecklistId: conn.toChecklistId,
      fixedFromPoint: conn.fixedFromPoint,
      fixedToPoint: conn.fixedToPoint,
      fixedFromSide: conn.fixedFromSide,
      fixedToSide: conn.fixedToSide,
    };

    this.selectedIndex = connIndex;
    this.dragging = {
      type: "endpoint",
      connIndex,
      endType,
      originalData,
    };

    document.body.style.cursor = "grabbing";
  }

  onMouseMove(e) {
    if (!this.dragging) return;

    const canvasRect = this.app.canvasContainer.getBoundingClientRect();
    const x = (e.clientX - canvasRect.left - this.app.pan.x) / this.app.zoom;
    const y = (e.clientY - canvasRect.top - this.app.pan.y) / this.app.zoom;

    if (this.dragging.type === "waypoint") {
      const conn = this.connections[this.dragging.connIndex];
      if (conn && conn.waypoints && conn.waypoints[this.dragging.wpIndex]) {
        conn.waypoints[this.dragging.wpIndex].x = x;
        conn.waypoints[this.dragging.wpIndex].y = y;
        this.render();
      }
    } else if (this.dragging.type === "endpoint") {
      const conn = this.connections[this.dragging.connIndex];
      if (conn) {
        // Atualiza posição temporária do endpoint
        if (this.dragging.endType === "from") {
          conn.fixedFromPoint = { x, y };
        } else {
          conn.fixedToPoint = { x, y };
        }
        this.render();
      }
    }
  }

  onMouseUp(e) {
    if (!this.dragging) return;

    document.body.style.cursor = "";

    // Se estava arrastando endpoint, verifica se soltou em um connector (bolinha)
    if (this.dragging.type === "endpoint") {
      const conn = this.connections[this.dragging.connIndex];
      if (conn) {
        // Usa elementsFromPoint para pegar todos os elementos naquela posição
        const elements = document.elementsFromPoint(e.clientX, e.clientY);

        // Procura por connectors em todos os elementos
        let cardConnector = null;
        let checklistConnector = null;

        for (const el of elements) {
          if (el.classList.contains("checklist-connector")) {
            checklistConnector = el;
            break;
          }
          if (el.classList.contains("card-connector")) {
            cardConnector = el;
            break;
          }
        }

        const currentFromId = conn.fromCardId;
        const currentToId = conn.toCardId;

        let connected = false;

        if (checklistConnector) {
          // Soltou em um connector de checklist
          const newCardId = checklistConnector.dataset.cardId;
          const checklistId = checklistConnector.dataset.checklistId;

          if (this.dragging.endType === "from") {
            if (newCardId === currentToId) {
              // Soltou no card de destino - não permitido
              connected = true;
            } else {
              // Card diferente ou mesmo card de origem - conecta ao checklist
              conn.fromCardId = newCardId;
              conn.from = `${newCardId}:${checklistId}`;
              conn.fromChecklistId = checklistId;
              conn.fixedFromPoint = null;
              connected = true;
            }
          } else {
            if (newCardId === currentFromId) {
              // Soltou no card de origem - não permitido
              connected = true;
            } else {
              // Card diferente ou mesmo card de destino - conecta ao checklist
              conn.toCardId = newCardId;
              conn.to = `${newCardId}:${checklistId}`;
              conn.toChecklistId = checklistId;
              conn.fixedToPoint = null;
              connected = true;
            }
          }
        } else if (cardConnector) {
          // Soltou em um connector de card (bolinha principal)
          const newCardId = cardConnector.dataset.cardId;
          const connectorSide = cardConnector.dataset.side; // top, bottom, left, right

          if (this.dragging.endType === "from") {
            // Não pode conectar 'from' ao mesmo card que 'to'
            if (newCardId === currentToId) {
              connected = true;
            } else if (newCardId === currentFromId) {
              // Soltou no mesmo card - atualiza apenas o side se diferente
              conn.fixedFromSide = connectorSide;
              conn.fixedFromPoint = null;
              conn.fromChecklistId = null;
              connected = true;
            } else {
              // Card diferente - conecta
              conn.fromCardId = newCardId;
              conn.from = newCardId;
              conn.fromChecklistId = null;
              conn.fixedFromPoint = null;
              conn.fixedFromSide = connectorSide; // Salva o lado escolhido
              connected = true;
            }
          } else {
            // Não pode conectar 'to' ao mesmo card que 'from'
            if (newCardId === currentFromId) {
              connected = true;
            } else if (newCardId === currentToId) {
              // Soltou no mesmo card - atualiza apenas o side se diferente
              conn.fixedToSide = connectorSide;
              conn.fixedToPoint = null;
              conn.toChecklistId = null; // Limpa checklist se tinha
              connected = true;
            } else {
              // Card diferente - conecta
              conn.toCardId = newCardId;
              conn.to = newCardId;
              conn.toChecklistId = null;
              conn.fixedToPoint = null;
              conn.fixedToSide = connectorSide; // Salva o lado escolhido
              connected = true;
            }
          }
        }

        if (!connected) {
          // Não soltou em nenhum connector válido - restaura posição original
          const orig = this.dragging.originalData;
          if (orig) {
            conn.fromCardId = orig.fromCardId;
            conn.toCardId = orig.toCardId;
            conn.from = orig.from;
            conn.to = orig.to;
            conn.fromChecklistId = orig.fromChecklistId;
            conn.toChecklistId = orig.toChecklistId;
            conn.fixedFromPoint = orig.fixedFromPoint;
            conn.fixedToPoint = orig.fixedToPoint;
            conn.fixedFromSide = orig.fixedFromSide;
            conn.fixedToSide = orig.fixedToSide;
          }
        }
      }
    }

    this.dragging = null;
    this.render();
    this.app.saveData();
  }

  // ==========================================
  // Context Menu
  // ==========================================

  showContextMenu(e, connIndex) {
    e.preventDefault();
    this.select(connIndex);

    let menu = document.getElementById("conn-ctx-menu");
    if (!menu) {
      menu = document.createElement("div");
      menu.id = "conn-ctx-menu";
      menu.className = "connection-context-menu";
      menu.innerHTML = `
        <div class="ctx-item" data-action="add-point">+ Adicionar Ponto</div>
        <div class="ctx-item" data-action="clear-points">Limpar Pontos</div>
        <div class="ctx-item" data-action="reset-endpoints">Resetar Posições</div>
        <div class="ctx-item ctx-danger" data-action="delete">Remover Conexão</div>
      `;
      document.body.appendChild(menu);

      menu.addEventListener("click", (ev) => {
        const action = ev.target.dataset.action;
        if (!action) return;

        menu.classList.add("hidden");

        if (this.selectedIndex === null) return;
        const conn = this.connections[this.selectedIndex];
        if (!conn) return;

        switch (action) {
          case "add-point":
            const fromCard = this.app.cards.find(
              (c) => c.id === conn.fromCardId,
            );
            const toCard = this.app.cards.find((c) => c.id === conn.toCardId);
            if (fromCard && toCard) {
              const midX = (fromCard.x + toCard.x) / 2 + 140;
              const midY = (fromCard.y + toCard.y) / 2 + 50;
              this.addWaypoint(this.selectedIndex, midX, midY);
            }
            break;
          case "clear-points":
            this.clearWaypoints(this.selectedIndex);
            break;
          case "reset-endpoints":
            conn.fixedFromPoint = null;
            conn.fixedToPoint = null;
            this.render();
            this.app.saveData();
            break;
          case "delete":
            this.deleteSelected();
            break;
        }
      });

      document.addEventListener("click", (ev) => {
        if (!menu.contains(ev.target)) {
          menu.classList.add("hidden");
        }
      });
    }

    menu.classList.remove("hidden");
    menu.style.left = `${e.clientX}px`;
    menu.style.top = `${e.clientY}px`;
  }

  // ==========================================
  // Renderização
  // ==========================================

  render() {
    this.connectionsLayer.innerHTML = "";

    // Definições SVG (setas)
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    defs.innerHTML = `
      <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
        <polygon points="0 0, 10 3.5, 0 7" class="connection-arrow" />
      </marker>
    `;
    this.connectionsLayer.appendChild(defs);

    // Renderiza cada conexão
    this.connections.forEach((conn, index) => {
      this.renderConnection(conn, index);
    });
  }

  renderConnection(conn, index) {
    const fromCardId = conn.fromCardId || conn.from;
    const toCardId = conn.toCardId || conn.to;

    const fromCard = this.app.cards.find((c) => c.id === fromCardId);
    const toCard = this.app.cards.find((c) => c.id === toCardId);

    if (!fromCard || !toCard) return;

    const fromEl = document.getElementById(`card-${fromCard.id}`);
    const toEl = document.getElementById(`card-${toCard.id}`);

    if (!fromEl || !toEl) return;

    const isSelected = this.selectedIndex === index;

    // Calcula posições
    const positions = this.calculatePositions(
      conn,
      fromCard,
      toCard,
      fromEl,
      toEl,
    );
    const { fromX, fromY, toX, toY } = positions;

    // Cria o path
    const pathD = this.createPath(fromX, fromY, conn.waypoints || [], toX, toY);

    // Grupo para a conexão
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.setAttribute("class", "connection-group");

    // Hit area (área clicável invisível)
    const hitArea = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path",
    );
    hitArea.setAttribute("d", pathD);
    hitArea.setAttribute("class", "connection-hit-area");
    hitArea.addEventListener("click", (e) => {
      e.stopPropagation();
      this.select(index);
    });
    hitArea.addEventListener("dblclick", (e) => {
      e.stopPropagation();
      e.preventDefault();

      const canvasRect = this.app.canvasContainer.getBoundingClientRect();
      const x = (e.clientX - canvasRect.left - this.app.pan.x) / this.app.zoom;
      const y = (e.clientY - canvasRect.top - this.app.pan.y) / this.app.zoom;

      this.select(index);
      const wpIndex = this.addWaypoint(index, x, y);

      // Inicia arrastar imediatamente
      this.dragging = {
        type: "waypoint",
        connIndex: index,
        wpIndex,
      };
      document.body.style.cursor = "grabbing";
    });
    hitArea.addEventListener("contextmenu", (e) =>
      this.showContextMenu(e, index),
    );
    group.appendChild(hitArea);

    // Linha principal
    const line = document.createElementNS("http://www.w3.org/2000/svg", "path");
    line.setAttribute("d", pathD);
    line.setAttribute(
      "class",
      `connection-line${isSelected ? " selected" : ""}`,
    );
    line.setAttribute("marker-end", "url(#arrowhead)");
    line.style.stroke = this.app.getCardPrimaryColor(fromCard);
    line.style.pointerEvents = "none";
    group.appendChild(line);

    // Controles quando selecionado
    if (isSelected) {
      this.renderControls(group, conn, index, fromX, fromY, toX, toY);
    }

    this.connectionsLayer.appendChild(group);
  }

  renderControls(group, conn, index, fromX, fromY, toX, toY) {
    // Waypoints
    if (conn.waypoints) {
      conn.waypoints.forEach((wp, wpIndex) => {
        const handle = this.createHandle(
          wp.x,
          wp.y,
          "#00d9ff",
          "waypoint-handle",
        );
        handle.addEventListener("mousedown", (e) =>
          this.startDragWaypoint(index, wpIndex, e),
        );
        handle.addEventListener("dblclick", (e) => {
          e.stopPropagation();
          this.removeWaypoint(index, wpIndex);
        });
        handle.addEventListener("contextmenu", (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.removeWaypoint(index, wpIndex);
        });
        group.appendChild(handle);
      });
    }

    // Endpoint de origem (verde)
    const fromHandle = this.createHandle(
      fromX,
      fromY,
      "#4caf50",
      "endpoint-handle endpoint-from",
    );
    fromHandle.addEventListener("mousedown", (e) =>
      this.startDragEndpoint(index, "from", e),
    );
    group.appendChild(fromHandle);

    // Endpoint de destino (vermelho)
    const toHandle = this.createHandle(
      toX,
      toY,
      "#f44336",
      "endpoint-handle endpoint-to",
    );
    toHandle.addEventListener("mousedown", (e) =>
      this.startDragEndpoint(index, "to", e),
    );
    group.appendChild(toHandle);
  }

  createHandle(x, y, color, className) {
    const handle = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "circle",
    );
    handle.setAttribute("cx", x);
    handle.setAttribute("cy", y);
    handle.setAttribute("r", "8");
    handle.setAttribute("fill", color);
    handle.setAttribute("class", className);
    handle.style.cursor = "grab";
    return handle;
  }

  // ==========================================
  // Cálculo de Posições
  // ==========================================

  calculatePositions(conn, fromCard, toCard, fromEl, toEl) {
    let fromX, fromY, toX, toY;

    // Posição de origem
    if (conn.fixedFromPoint) {
      fromX = conn.fixedFromPoint.x;
      fromY = conn.fixedFromPoint.y;
    } else if (conn.fromChecklistId) {
      const pos = this.getChecklistPosition(
        fromEl,
        fromCard,
        conn.fromChecklistId,
      );
      if (pos) {
        fromX = pos.x;
        fromY = pos.y;
      }
    } else if (conn.fixedFromSide) {
      // Side fixado manualmente
      const pos = this.getConnectorPosition(
        fromEl,
        fromCard,
        conn.fixedFromSide,
      );
      fromX = pos.x;
      fromY = pos.y;
    }

    // Posição de destino
    if (conn.fixedToPoint) {
      toX = conn.fixedToPoint.x;
      toY = conn.fixedToPoint.y;
    } else if (conn.toChecklistId) {
      const pos = this.getChecklistPosition(toEl, toCard, conn.toChecklistId);
      if (pos) {
        toX = pos.x;
        toY = pos.y;
      }
    } else if (conn.fixedToSide) {
      // Side fixado manualmente
      const pos = this.getConnectorPosition(toEl, toCard, conn.fixedToSide);
      toX = pos.x;
      toY = pos.y;
    }

    // Calcula posições automáticas se não definidas
    if (fromX === undefined || toX === undefined) {
      const auto = this.calculateAutoPositions(fromCard, toCard, fromEl, toEl);
      if (fromX === undefined) {
        fromX = auto.fromX;
        fromY = auto.fromY;
      }
      if (toX === undefined) {
        toX = auto.toX;
        toY = auto.toY;
      }
    }

    return { fromX, fromY, toX, toY };
  }

  getConnectorPosition(cardEl, card, side) {
    const width = cardEl.offsetWidth || 280;
    const height = cardEl.offsetHeight || 120;

    switch (side) {
      case "top":
        return { x: card.x + width / 2, y: card.y };
      case "bottom":
        return { x: card.x + width / 2, y: card.y + height };
      case "left":
        return { x: card.x, y: card.y + height / 2 };
      case "right":
        return { x: card.x + width, y: card.y + height / 2 };
      default:
        return { x: card.x + width / 2, y: card.y + height / 2 };
    }
  }

  getChecklistPosition(cardEl, card, checklistId) {
    const checklistItem = cardEl.querySelector(
      `[data-checklist-id="${checklistId}"]`,
    );
    if (!checklistItem) return null;

    const connector = checklistItem.querySelector(".checklist-connector");
    if (!connector) return null;

    const cardRect = cardEl.getBoundingClientRect();
    const connRect = connector.getBoundingClientRect();

    return {
      x:
        card.x +
        (connRect.left - cardRect.left + connRect.width / 2) / this.app.zoom,
      y:
        card.y +
        (connRect.top - cardRect.top + connRect.height / 2) / this.app.zoom,
    };
  }

  calculateAutoPositions(fromCard, toCard, fromEl, toEl) {
    const fromWidth = fromEl.offsetWidth || 280;
    const fromHeight = fromEl.offsetHeight || 120;
    const toWidth = toEl.offsetWidth || 280;
    const toHeight = toEl.offsetHeight || 120;

    const fromCenterX = fromCard.x + fromWidth / 2;
    const fromCenterY = fromCard.y + fromHeight / 2;
    const toCenterX = toCard.x + toWidth / 2;
    const toCenterY = toCard.y + toHeight / 2;

    const dx = toCenterX - fromCenterX;
    const dy = toCenterY - fromCenterY;

    let fromX, fromY, toX, toY;

    if (Math.abs(dx) > Math.abs(dy)) {
      // Horizontal
      if (dx > 0) {
        fromX = fromCard.x + fromWidth;
        toX = toCard.x;
      } else {
        fromX = fromCard.x;
        toX = toCard.x + toWidth;
      }
      fromY = fromCenterY;
      toY = toCenterY;
    } else {
      // Vertical
      if (dy > 0) {
        fromY = fromCard.y + fromHeight;
        toY = toCard.y;
      } else {
        fromY = fromCard.y;
        toY = toCard.y + toHeight;
      }
      fromX = fromCenterX;
      toX = toCenterX;
    }

    return { fromX, fromY, toX, toY };
  }

  // ==========================================
  // Criação de Path
  // ==========================================

  createPath(fromX, fromY, waypoints, toX, toY) {
    const points = [{ x: fromX, y: fromY }, ...waypoints, { x: toX, y: toY }];

    if (points.length === 2) {
      // Linha direta com curva bezier
      return this.createBezierPath(fromX, fromY, toX, toY);
    }

    // Catmull-Rom spline para waypoints
    return this.createCatmullRomPath(points);
  }

  createBezierPath(fromX, fromY, toX, toY) {
    const dx = toX - fromX;
    const dy = toY - fromY;

    if (Math.abs(dx) > Math.abs(dy)) {
      const midX = (fromX + toX) / 2;
      return `M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`;
    } else {
      const midY = (fromY + toY) / 2;
      return `M ${fromX} ${fromY} C ${fromX} ${midY}, ${toX} ${midY}, ${toX} ${toY}`;
    }
  }

  createCatmullRomPath(points) {
    if (points.length < 2) return "";

    const tension = 0.5;
    let path = `M ${points[0].x} ${points[0].y}`;

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(points.length - 1, i + 2)];

      const cp1x = p1.x + ((p2.x - p0.x) * tension) / 3;
      const cp1y = p1.y + ((p2.y - p0.y) * tension) / 3;
      const cp2x = p2.x - ((p3.x - p1.x) * tension) / 3;
      const cp2y = p2.y - ((p3.y - p1.y) * tension) / 3;

      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }

    return path;
  }
}

// Export para uso modular
if (typeof module !== "undefined" && module.exports) {
  module.exports = ConnectionManager;
}

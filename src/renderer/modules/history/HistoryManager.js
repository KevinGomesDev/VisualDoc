// ==========================================
// HistoryManager - Gerenciamento de Undo/Redo
// ==========================================

class HistoryManager {
  constructor(app) {
    this.app = app;
    this.history = [];
    this.historyIndex = -1;
    this.maxHistory = 50;
    this.isUndoRedo = false;
  }

  // Inicializa o histórico com o estado atual
  init(state) {
    this.history = [this.deepCopy(state)];
    this.historyIndex = 0;
  }

  // Salva estado no histórico
  save(state) {
    if (this.isUndoRedo) return;

    // Remove estados futuros se estamos no meio do histórico
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }

    // Salva cópia profunda do estado atual
    this.history.push(this.deepCopy(state));

    // Limita tamanho do histórico
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    } else {
      this.historyIndex++;
    }
  }

  // Desfazer
  undo() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      return this.restore();
    }
    return null;
  }

  // Refazer
  redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      return this.restore();
    }
    return null;
  }

  // Restaura estado do histórico
  restore() {
    const state = this.history[this.historyIndex];
    if (state) {
      this.isUndoRedo = true;
      const restored = this.deepCopy(state);
      this.isUndoRedo = false;
      return restored;
    }
    return null;
  }

  // Verifica se está em operação de undo/redo
  isInUndoRedo() {
    return this.isUndoRedo;
  }

  // Cópia profunda de objeto
  deepCopy(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  // Pode desfazer?
  canUndo() {
    return this.historyIndex > 0;
  }

  // Pode refazer?
  canRedo() {
    return this.historyIndex < this.history.length - 1;
  }
}

// Exporta para uso global
window.HistoryManager = HistoryManager;

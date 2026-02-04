// ==========================================
// Touch Support Layer
// Adiciona suporte a eventos touch para mobile
// ==========================================

class TouchSupport {
  constructor() {
    this.isTouchDevice =
      "ontouchstart" in window || navigator.maxTouchPoints > 0;
    this.activeTouches = new Map();
    this.lastTap = 0;
    this.lastPinchDistance = 0;
  }

  // Converte touch event para mouse-like event
  touchToMouse(touch, type) {
    return {
      clientX: touch.clientX,
      clientY: touch.clientY,
      pageX: touch.pageX,
      pageY: touch.pageY,
      screenX: touch.screenX,
      screenY: touch.screenY,
      target: touch.target,
      type: type,
      button: 0, // Simula clique esquerdo
      buttons: 1,
      preventDefault: () => {},
      stopPropagation: () => {},
    };
  }

  // Calcula distância entre dois pontos (para pinch zoom)
  getDistance(touch1, touch2) {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // Calcula ponto central entre dois toques
  getCenter(touch1, touch2) {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2,
    };
  }

  // Detecta double tap
  isDoubleTap() {
    const now = Date.now();
    const timeDiff = now - this.lastTap;
    this.lastTap = now;
    return timeDiff < 300;
  }

  // Adiciona suporte touch a um elemento com callbacks
  addTouchSupport(element, callbacks = {}) {
    if (!element) return;

    const {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      onDoubleTap,
      onPinchStart,
      onPinchMove,
      onPinchEnd,
      onLongPress,
      convertToMouse = true,
    } = callbacks;

    let longPressTimer = null;
    let isPinching = false;

    // Helper para verificar se o target e um input
    const isInputElement = (target) => {
      return (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      );
    };

    element.addEventListener(
      "touchstart",
      (e) => {
        // Ignora inputs para nao interferir com digitacao
        if (isInputElement(e.target)) return;

        const touches = e.touches;

        // Long press detection
        if (touches.length === 1) {
          longPressTimer = setTimeout(() => {
            if (onLongPress) {
              onLongPress(this.touchToMouse(touches[0], "longpress"), e);
            }
          }, 500);
        }

        // Pinch gesture start
        if (touches.length === 2) {
          isPinching = true;
          this.lastPinchDistance = this.getDistance(touches[0], touches[1]);
          if (onPinchStart) {
            onPinchStart(
              {
                center: this.getCenter(touches[0], touches[1]),
                distance: this.lastPinchDistance,
              },
              e,
            );
          }
        }

        // Double tap detection
        if (touches.length === 1 && this.isDoubleTap()) {
          if (onDoubleTap) {
            onDoubleTap(this.touchToMouse(touches[0], "doubletap"), e);
          }
        }

        // Regular touch start
        if (onTouchStart) {
          onTouchStart(this.touchToMouse(touches[0], "touchstart"), e);
        }

        // Convert to mousedown
        if (convertToMouse && touches.length === 1) {
          const mouseEvent = new MouseEvent("mousedown", {
            clientX: touches[0].clientX,
            clientY: touches[0].clientY,
            button: 0,
            bubbles: true,
          });
          element.dispatchEvent(mouseEvent);
        }
      },
      { passive: false },
    );

    element.addEventListener(
      "touchmove",
      (e) => {
        clearTimeout(longPressTimer);

        // Ignora inputs
        if (isInputElement(e.target)) return;

        const touches = e.touches;

        // Pinch gesture
        if (touches.length === 2 && isPinching) {
          const newDistance = this.getDistance(touches[0], touches[1]);
          const scale = newDistance / this.lastPinchDistance;

          if (onPinchMove) {
            onPinchMove(
              {
                center: this.getCenter(touches[0], touches[1]),
                distance: newDistance,
                scale: scale,
                delta: newDistance - this.lastPinchDistance,
              },
              e,
            );
          }

          this.lastPinchDistance = newDistance;
          e.preventDefault();
          return;
        }

        // Regular touch move
        if (touches.length === 1) {
          if (onTouchMove) {
            onTouchMove(this.touchToMouse(touches[0], "touchmove"), e);
          }

          // Convert to mousemove
          if (convertToMouse) {
            const mouseEvent = new MouseEvent("mousemove", {
              clientX: touches[0].clientX,
              clientY: touches[0].clientY,
              button: 0,
              bubbles: true,
            });
            document.dispatchEvent(mouseEvent);
          }
        }
      },
      { passive: false },
    );

    element.addEventListener(
      "touchend",
      (e) => {
        clearTimeout(longPressTimer);

        // Ignora inputs para nao interferir com digitacao
        if (isInputElement(e.target)) return;

        if (isPinching && e.touches.length < 2) {
          isPinching = false;
          if (onPinchEnd) {
            onPinchEnd(e);
          }
        }

        if (onTouchEnd) {
          const touch = e.changedTouches[0];
          onTouchEnd(this.touchToMouse(touch, "touchend"), e);
        }

        // Convert to mouseup
        if (convertToMouse && e.changedTouches.length > 0) {
          const touch = e.changedTouches[0];
          const mouseEvent = new MouseEvent("mouseup", {
            clientX: touch.clientX,
            clientY: touch.clientY,
            button: 0,
            bubbles: true,
          });
          document.dispatchEvent(mouseEvent);
        }
      },
      { passive: false },
    );

    element.addEventListener("touchcancel", (e) => {
      clearTimeout(longPressTimer);
      isPinching = false;

      if (onTouchEnd) {
        if (e.changedTouches.length > 0) {
          onTouchEnd(this.touchToMouse(e.changedTouches[0], "touchcancel"), e);
        }
      }
    });
  }

  // Previne zoom do navegador em mobile
  preventBrowserZoom() {
    const isInputElement = (target) => {
      return (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      );
    };

    document.addEventListener("gesturestart", (e) => {
      // Não previne em inputs
      if (isInputElement(e.target)) return;
      e.preventDefault();
    });
    document.addEventListener("gesturechange", (e) => {
      if (isInputElement(e.target)) return;
      e.preventDefault();
    });
    document.addEventListener("gestureend", (e) => {
      if (isInputElement(e.target)) return;
      e.preventDefault();
    });

    // Previne double-tap zoom (mas não em inputs)
    let lastTouchEnd = 0;
    document.addEventListener(
      "touchend",
      (e) => {
        // Não interfere com inputs
        if (isInputElement(e.target)) return;

        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
          e.preventDefault();
        }
        lastTouchEnd = now;
      },
      false,
    );
  }
}

// Instância global
window.touchSupport = new TouchSupport();

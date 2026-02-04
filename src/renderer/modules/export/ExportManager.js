// ==========================================
// ExportManager - Gerenciamento de Exportação
// ==========================================

class ExportManager {
  constructor(app) {
    this.app = app;
  }

  // Exporta para SVG
  async exportSVG() {
    const svgContent = this.generateSVG();
    await window.electronAPI.exportSVG(svgContent);
  }

  // Gera conteúdo SVG
  generateSVG() {
    // Calcula bounds
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    this.app.cards.forEach((card) => {
      const cardWidth = card.width || 280;
      const cardHeight =
        card.height || Math.max(120, 80 + card.checklists.length * 22);
      minX = Math.min(minX, card.x);
      minY = Math.min(minY, card.y);
      maxX = Math.max(maxX, card.x + cardWidth);
      maxY = Math.max(maxY, card.y + cardHeight);
    });

    const padding = 50;
    const width = maxX - minX + padding * 2;
    const height = maxY - minY + padding * 2;
    const offsetX = -minX + padding;
    const offsetY = -minY + padding;

    let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
      <polygon points="0 0, 10 3.5, 0 7" fill="#6c5ce7"/>
    </marker>
  </defs>
  
  <rect width="100%" height="100%" fill="#0f0f1a"/>
  
  <!-- Connections -->
  <g id="connections">`;

    // Desenha conexões
    this.app.connections.forEach((conn) => {
      const fromCard = this.app.cards.find((c) => c.id === conn.from);
      const toCard = this.app.cards.find((c) => c.id === conn.to);

      if (fromCard && toCard) {
        const fromCardWidth = fromCard.width || 280;
        const fromCardHeight =
          fromCard.height ||
          Math.max(120, 80 + fromCard.checklists.length * 22);
        const toCardHeight =
          toCard.height || Math.max(120, 80 + toCard.checklists.length * 22);

        const fromX = fromCard.x + fromCardWidth + offsetX;
        const fromY = fromCard.y + fromCardHeight / 2 + offsetY;
        const toX = toCard.x + offsetX;
        const toY = toCard.y + toCardHeight / 2 + offsetY;
        const midX = (fromX + toX) / 2;

        svg += `
    <path d="M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}" 
          stroke="${fromCard.color}" stroke-width="3" fill="none" 
          stroke-linecap="round" marker-end="url(#arrowhead)"/>`;
      }
    });

    svg += `
  </g>
  
  <!-- Cards -->
  <g id="cards">`;

    // Desenha cards
    this.app.cards.forEach((card) => {
      const x = card.x + offsetX;
      const y = card.y + offsetY;
      const cardWidth = card.width || 280;
      const cardHeight =
        card.height || Math.max(120, 80 + card.checklists.length * 22);
      const completedCount = card.checklists.filter((c) => c.completed).length;
      const totalCount = card.checklists.length;
      const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

      svg += `
    <g transform="translate(${x}, ${y})">
      <rect width="${cardWidth}" height="${cardHeight}" rx="12" fill="#1a1a2e" stroke="${card.color}" stroke-width="2"/>
      <text x="15" y="28" fill="#ffffff" font-family="Segoe UI, sans-serif" font-size="16" font-weight="600">${this.escapeHtml(card.title)}</text>
      <rect x="15" y="38" width="80" height="18" rx="9" fill="${card.color}" opacity="0.2"/>
      <text x="25" y="51" fill="${card.color}" font-family="Segoe UI, sans-serif" font-size="10" font-weight="500">${this.escapeHtml(card.category.toUpperCase())}</text>`;

      // Desenha checklist
      if (card.checklists.length > 0) {
        card.checklists.forEach((item, index) => {
          const itemY = 70 + index * 22;
          const textColor = item.completed ? "#6b7280" : "#e5e7eb";
          const checkColor = item.completed ? "#2ecc71" : "#4b5563";

          svg += `
      <rect x="15" y="${itemY}" width="14" height="14" rx="3" fill="${checkColor}" opacity="0.3" stroke="${checkColor}" stroke-width="1"/>`;

          if (item.completed) {
            svg += `
      <path d="M ${18} ${itemY + 7} l 3 3 l 5 -6" stroke="#2ecc71" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
          }

          const textDecoration = item.completed ? "line-through" : "none";
          svg += `
      <text x="35" y="${itemY + 11}" fill="${textColor}" font-family="Segoe UI, sans-serif" font-size="12" text-decoration="${textDecoration}">${this.escapeHtml(item.name)}</text>`;
        });

        const progressY = 70 + card.checklists.length * 22 + 5;
        svg += `
      <rect x="15" y="${progressY}" width="${cardWidth - 30}" height="4" rx="2" fill="#25253a"/>
      <rect x="15" y="${progressY}" width="${(progress / 100) * (cardWidth - 30)}" height="4" rx="2" fill="#2ecc71"/>`;
      }

      svg += `
    </g>`;
    });

    svg += `
  </g>
</svg>`;

    return svg;
  }

  // Escape HTML
  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
}

// Exporta para uso global
window.ExportManager = ExportManager;

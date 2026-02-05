// ==========================================
// ExportManager - Gerenciamento de Exportação em Texto
// ==========================================

class ExportManager {
  constructor(app) {
    this.app = app;
  }

  // Abre o arquivo TXT no programa padrão
  async openTextMap() {
    // Salva antes de abrir
    await this.saveTextMap();
    await window.electronAPI.openTXT();
  }

  // Salva o mapa em TXT (chamado automaticamente junto com saveData)
  async saveTextMap() {
    const txtContent = this.generateTextMap();
    await window.electronAPI.saveTXT(txtContent);
  }

  // Gera o mapa completo em texto
  generateTextMap() {
    const lines = [];
    const separator = "=".repeat(60);
    const subSeparator = "-".repeat(40);
    const now = new Date().toLocaleString("pt-BR");

    // Cabeçalho
    lines.push(separator);
    lines.push("VISUALDOC - MAPA DO PROJETO");
    lines.push(separator);
    lines.push(`Projeto: ${this.app.projectManager.projectName || "Sem nome"}`);
    lines.push(`Última atualização: ${now}`);
    lines.push("");

    // Estatísticas
    lines.push("📊 ESTATÍSTICAS");
    lines.push(subSeparator);
    lines.push(`• Total de Cards: ${this.app.cards.length}`);
    lines.push(`• Total de Colunas: ${this.app.columns.length}`);
    lines.push(`• Total de Textos: ${this.app.texts.length}`);
    lines.push(`• Total de Conexões: ${this.app.connections.length}`);
    lines.push(`• Total de Categorias: ${this.app.categories.length}`);

    // Estatísticas de checklists
    let totalChecklists = 0;
    let completedChecklists = 0;
    this.app.cards.forEach((card) => {
      totalChecklists += card.checklists.length;
      completedChecklists += card.checklists.filter((c) => c.completed).length;
    });
    lines.push(`• Total de Checklists: ${totalChecklists}`);
    lines.push(
      `• Checklists Concluídos: ${completedChecklists}/${totalChecklists} (${totalChecklists > 0 ? Math.round((completedChecklists / totalChecklists) * 100) : 0}%)`,
    );
    lines.push("");

    // Categorias
    lines.push("🏷️ CATEGORIAS");
    lines.push(subSeparator);
    if (this.app.categories.length === 0) {
      lines.push("  (Nenhuma categoria cadastrada)");
    } else {
      this.app.categories.forEach((cat, index) => {
        lines.push(`  ${index + 1}. ${cat.name} (${cat.color})`);
      });
    }
    lines.push("");

    // Colunas
    lines.push("📁 COLUNAS");
    lines.push(subSeparator);
    if (this.app.columns.length === 0) {
      lines.push("  (Nenhuma coluna criada)");
    } else {
      this.app.columns.forEach((column, index) => {
        lines.push(`  [${index + 1}] COLUNA`);
        lines.push(`      Título: ${column.title || "Sem título"}`);
        lines.push(`      Cor: ${column.color}`);
        lines.push(
          `      Posição: (${Math.round(column.x)}, ${Math.round(column.y)})`,
        );
        lines.push(
          `      Tamanho: ${Math.round(column.width || 200)}x${Math.round(column.height || 400)}px`,
        );
        lines.push("");
      });
    }
    lines.push("");

    // Textos
    lines.push("📝 TEXTOS");
    lines.push(subSeparator);
    if (this.app.texts.length === 0) {
      lines.push("  (Nenhum texto criado)");
    } else {
      this.app.texts.forEach((text, index) => {
        lines.push(`  [${index + 1}] TEXTO`);
        lines.push(`      Conteúdo: "${text.content || ""}"`);
        lines.push(
          `      Posição: (${Math.round(text.x)}, ${Math.round(text.y)})`,
        );
        lines.push(
          `      Tamanho: ${Math.round(text.width || 200)}x${Math.round(text.height || 50)}px`,
        );
        lines.push(`      Fonte: ${text.fontSize || 16}px`);
        lines.push(`      Cor: ${text.color || "#ffffff"}`);
        lines.push("");
      });
    }
    lines.push("");

    // Cards
    lines.push("📋 CARDS");
    lines.push(subSeparator);
    if (this.app.cards.length === 0) {
      lines.push("  (Nenhum card criado)");
    } else {
      this.app.cards.forEach((card, index) => {
        const categories = this.app.getCardCategories(card);
        const categoryNames =
          categories.map((c) => c.name).join(", ") || "Sem categoria";
        const completedCount = card.checklists.filter(
          (c) => c.completed,
        ).length;
        const totalCount = card.checklists.length;
        const progress =
          totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

        lines.push(`  [${index + 1}] CARD: ${card.title || "Sem título"}`);
        lines.push(`      ID: ${card.id}`);
        lines.push(`      Categorias: ${categoryNames}`);
        lines.push(`      Cor: ${card.color}`);
        lines.push(
          `      Posição: (${Math.round(card.x)}, ${Math.round(card.y)})`,
        );
        lines.push(
          `      Tamanho: ${Math.round(card.width || 280)}x${Math.round(card.height || 120)}px`,
        );

        if (card.details) {
          lines.push(`      Descrição: ${card.details}`);
        }

        if (card.checklists.length > 0) {
          lines.push(
            `      Progresso: ${completedCount}/${totalCount} (${progress}%)`,
          );
          lines.push(`      Checklist:`);
          card.checklists.forEach((item, itemIndex) => {
            const status = item.completed ? "[✓]" : "[ ]";
            const itemCategory = item.categoryId
              ? this.app.categories.find(
                  (c) => String(c.id) === String(item.categoryId),
                )?.name
              : null;
            const categoryInfo = itemCategory ? ` [${itemCategory}]` : "";
            lines.push(`        ${status} ${item.name}${categoryInfo}`);
            if (item.details) {
              lines.push(`            └─ ${item.details}`);
            }
          });
        }
        lines.push("");
      });
    }
    lines.push("");

    // Conexões
    lines.push("🔗 CONEXÕES");
    lines.push(subSeparator);

    // Filtra conexões válidas (ambos os cards existem)
    const validConnections = this.app.connections.filter((conn) => {
      // Prioriza campos dedicados, depois tenta extrair do ID composto
      let fromCardId = conn.fromCardId;
      let toCardId = conn.toCardId;

      // Fallback: tenta extrair do from/to se não tiver os campos dedicados
      if (!fromCardId && conn.from) {
        // Se from contém ":", pega a primeira parte apenas se parece com card_xxx
        const parts = conn.from.split(":");
        fromCardId = parts[0].startsWith("card_") ? parts[0] : conn.from;
      }
      if (!toCardId && conn.to) {
        const parts = conn.to.split(":");
        toCardId = parts[0].startsWith("card_") ? parts[0] : conn.to;
      }

      const fromCard = this.app.cards.find((c) => c.id === fromCardId);
      const toCard = this.app.cards.find((c) => c.id === toCardId);
      return fromCard && toCard;
    });

    if (validConnections.length === 0) {
      lines.push("  (Nenhuma conexão criada)");
    } else {
      validConnections.forEach((conn, index) => {
        // Extrai os IDs dos cards
        let fromCardId = conn.fromCardId;
        let toCardId = conn.toCardId;

        if (!fromCardId && conn.from) {
          const parts = conn.from.split(":");
          fromCardId = parts[0].startsWith("card_") ? parts[0] : conn.from;
        }
        if (!toCardId && conn.to) {
          const parts = conn.to.split(":");
          toCardId = parts[0].startsWith("card_") ? parts[0] : conn.to;
        }

        const fromCard = this.app.cards.find((c) => c.id === fromCardId);
        const toCard = this.app.cards.find((c) => c.id === toCardId);

        const fromName = fromCard?.title || "Card desconhecido";
        const toName = toCard?.title || "Card desconhecido";

        let connectionDesc = `  ${index + 1}. "${fromName}"`;

        // Verifica se é conexão de checklist (origem)
        // Prioriza o campo dedicado, senão verifica se o from tem formato cardId:checklistId
        let fromChecklistId = conn.fromChecklistId;
        if (!fromChecklistId && conn.from?.includes(":") && fromCard) {
          const parts = conn.from.split(":");
          // Verifica se a segunda parte é um ID de checklist (não um card_xxx)
          if (parts[1] && !parts[1].startsWith("card_")) {
            fromChecklistId = parts[1];
          }
        }

        if (fromChecklistId && fromCard) {
          const checklistItem = fromCard.checklists.find(
            (cl) => cl.id === fromChecklistId,
          );
          if (checklistItem) {
            connectionDesc += ` (item: "${checklistItem.name}")`;
          }
        }

        connectionDesc += ` → "${toName}"`;

        // Verifica se é conexão de checklist (destino)
        let toChecklistId = conn.toChecklistId;
        if (!toChecklistId && conn.to?.includes(":") && toCard) {
          const parts = conn.to.split(":");
          if (parts[1] && !parts[1].startsWith("card_")) {
            toChecklistId = parts[1];
          }
        }

        if (toChecklistId && toCard) {
          const checklistItem = toCard.checklists.find(
            (cl) => cl.id === toChecklistId,
          );
          if (checklistItem) {
            connectionDesc += ` (item: "${checklistItem.name}")`;
          }
        }

        lines.push(connectionDesc);
      });
    }
    lines.push("");

    // Rodapé
    lines.push(separator);
    lines.push("Gerado automaticamente pelo VisualDoc");
    lines.push(separator);

    return lines.join("\n");
  }
}

// Exporta para uso global
window.ExportManager = ExportManager;

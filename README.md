# 🗺️ RoadMap - Aplicativo de Mapeamento de Projetos

Um aplicativo desktop para criar e gerenciar roadmaps visuais de projetos.

## 📋 Funcionalidades

- **Canvas Interativo**: Interface escura com grid visual
- **Cards Customizáveis**: Crie cards com título, categoria e cor personalizada
- **Checklists**: Adicione itens de checklist com nome e detalhes em cada card
- **Conexões**: Vincule cards entre si para formar fluxos e dependências
- **Arrastar e Soltar**: Posicione os cards livremente no canvas
- **Salvamento Automático**: Todas as alterações são salvas automaticamente
- **Exportação SVG**: Exporte seu roadmap como imagem vetorial

## 🚀 Instalação

### Pré-requisitos

- Node.js 18 ou superior
- npm ou yarn

### Passos

1. **Instale as dependências:**

   ```bash
   npm install
   ```

2. **Execute o aplicativo:**
   ```bash
   npm start
   ```

## 🎮 Como Usar

### Criar um Card

1. Clique no botão **"+ Novo Card"** na barra de ferramentas
2. Edite o título, categoria e cor
3. Adicione checklists conforme necessário
4. Clique em **"Salvar"**

### Mover Cards

- Clique e arraste qualquer card para reposicioná-lo

### Conectar Cards

- **Opção 1**: Clique nos conectores (pontos) nas laterais do card e arraste até outro card
- **Opção 2**: Clique com botão direito em um card > "Conectar a..." > clique no card de destino
- **Opção 3**: Dê duplo-clique no card e marque as conexões na seção "Conexões"

### Editar Cards

- Dê **duplo-clique** em um card para abrir o editor
- Ou clique com **botão direito** > "Editar"

### Excluir Cards

- Clique com botão direito no card > "Excluir"
- Ou abra o editor e clique em "Excluir Card"

### Zoom

- Use **Ctrl + Scroll** para zoom
- Ou use os botões 🔍+ e 🔍- na barra de ferramentas

### Exportar

- Clique em **"📤 Exportar SVG"** para salvar o roadmap como arquivo SVG

## 📁 Estrutura do Projeto

```
RoadMap/
├── package.json          # Configurações e dependências
├── src/
│   ├── main.js           # Processo principal do Electron
│   ├── preload.js        # Bridge de segurança
│   └── renderer/
│       ├── index.html    # Interface principal
│       ├── styles.css    # Estilos da aplicação
│       └── app.js        # Lógica da aplicação
└── assets/
    └── icon.svg          # Ícone do aplicativo
```

## 💾 Dados

Os dados são salvos automaticamente em:

- **Windows**: `%APPDATA%/roadmap-app/roadmap-data.json`
- **macOS**: `~/Library/Application Support/roadmap-app/roadmap-data.json`
- **Linux**: `~/.config/roadmap-app/roadmap-data.json`

## 🛠️ Desenvolvimento

### Build para produção

```bash
npm run build
```

## 📄 Licença

MIT License

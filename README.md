# � VisualDoc - Documentação Visual de Projetos

<p align="center">
  <img src="assets/icon.svg" width="120" alt="VisualDoc Logo">
</p>

<p align="center">
  <strong>Aplicativo desktop para documentação visual e mapeamento de projetos</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Electron-28.0.0-47848F?logo=electron&logoColor=white" alt="Electron">
  <img src="https://img.shields.io/badge/Capacitor-5.7.0-119EFF?logo=capacitor&logoColor=white" alt="Capacitor">
  <img src="https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux%20%7C%20Android%20%7C%20iOS-blue" alt="Platforms">
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License">
</p>

---

## ✨ Sobre

**VisualDoc** é uma ferramenta poderosa para criar documentação visual de projetos de software. Organize suas ideias, funcionalidades, tarefas e fluxos em um canvas interativo com cards, conexões e colunas.

---

## 🎯 Funcionalidades

### 📌 Cards
- Crie cards com título, descrição e categorias coloridas
- Adicione **checklists** com itens detalhados em cada card
- Redimensione cards conforme necessário
- Categorize com cores personalizadas (Frontend, Backend, Design, etc.)

### 🔗 Conexões
- Conecte cards entre si para criar fluxos e dependências
- Conexões visuais com linhas curvas estilizadas
- Conecte checklists específicos de um card a outro card

### 📝 Textos Livres
- Adicione textos livres no canvas
- Suporte a **Markdown** para formatação rica
- Ideal para anotações, títulos de seção e documentação

### 📊 Colunas
- Crie colunas para organizar cards (estilo Kanban)
- Cores personalizáveis
- Títulos editáveis

### 🎨 Interface
- **Tema claro e escuro** com alternância
- Canvas infinito com **zoom** e **pan**
- Grid visual para alinhamento
- Interface responsiva e moderna

### 📁 Projetos
- Salve e carregue projetos em formato `.vdoc`
- Gerenciamento completo de projetos
- Exportação para texto/markdown

### ⌨️ Produtividade
- **Ctrl+Z / Ctrl+Y** - Desfazer/Refazer
- **Ctrl+S** - Salvar projeto
- **Delete** - Excluir selecionado
- **Ctrl+Scroll** - Zoom
- Menu de contexto com clique direito
- Seleção múltipla de elementos

---

## 🚀 Instalação

### Pré-requisitos

- **Node.js** 18 ou superior
- **npm** ou **yarn**

### Desktop (Electron)

```bash
# Clone o repositório
git clone https://github.com/KevinGomesDev/VisualDoc.git
cd VisualDoc

# Instale as dependências
npm install

# Execute o aplicativo
npm start
```

### Build para Produção (Windows)

```bash
npm run build
```

O executável será gerado na pasta `dist/`.

### Mobile (Capacitor)

```bash
# Sincronizar com plataformas mobile
npm run cap:sync

# Android
npm run cap:open:android

# iOS (requer macOS)
npm run cap:open:ios
```

---

## 🎮 Como Usar

### Criar um Card
1. **Clique direito** no canvas > "Novo Card"
2. Ou use a barra de ferramentas
3. Preencha título, selecione categoria
4. Adicione checklists se necessário
5. Clique em "Salvar"

### Conectar Cards
- Arraste dos **conectores** (círculos nas bordas do card) até outro card
- Ou clique direito > "Conectar a..." > clique no destino

### Adicionar Textos
- **Clique direito** no canvas > "Novo Texto"
- Suporta Markdown para formatação

### Criar Colunas
- **Clique direito** no canvas > "Nova Coluna"
- Arraste cards para dentro das colunas

### Navegar no Canvas
- **Arrastar** com mouse para mover
- **Ctrl + Scroll** para zoom
- **Ctrl + 0** para resetar zoom

---

## 📁 Estrutura do Projeto

```
VisualDoc/
├── src/
│   ├── main.js              # Processo principal Electron
│   ├── preload.js           # Bridge de segurança IPC
│   └── renderer/
│       ├── index.html       # Interface principal
│       ├── app.js           # Orquestrador da aplicação
│       ├── main.css         # Estilos globais
│       ├── platform.js      # Detecção de plataforma
│       ├── touch.js         # Suporte touch/mobile
│       └── modules/
│           ├── canvas/      # Gerenciamento do canvas
│           ├── cards/       # Sistema de cards
│           ├── connections/ # Sistema de conexões
│           ├── texts/       # Textos livres
│           ├── columns/     # Sistema de colunas
│           ├── categories/  # Categorias
│           ├── history/     # Undo/Redo
│           ├── project/     # Gerenciamento de projetos
│           ├── export/      # Exportação
│           ├── modal/       # Sistema de modais
│           ├── context-menu/# Menus de contexto
│           ├── selection/   # Seleção de elementos
│           └── theme/       # Tema claro/escuro
├── assets/
│   └── icon.svg             # Ícone da aplicação
├── capacitor.config.json    # Configuração Capacitor
└── package.json             # Dependências e scripts
```

---

## 🛠️ Arquitetura

O projeto utiliza uma **arquitetura modular** onde cada funcionalidade é encapsulada em seu próprio manager:

| Manager | Responsabilidade |
|---------|------------------|
| `CanvasManager` | Zoom, pan, grid |
| `CardManager` | CRUD de cards |
| `ConnectionManager` | Conexões entre elementos |
| `TextManager` | Textos livres |
| `ColumnManager` | Colunas organizacionais |
| `CategoryManager` | Categorias e cores |
| `HistoryManager` | Undo/Redo |
| `ProjectManager` | Salvar/Carregar projetos |
| `ExportManager` | Exportação |
| `SelectionManager` | Seleção de elementos |
| `ThemeManager` | Tema claro/escuro |
| `ModalManager` | Sistema de modais |
| `ContextMenuManager` | Menus de contexto |

---

## 💾 Formato de Arquivo

Os projetos são salvos em formato `.vdoc` (JSON) contendo:

```json
{
  "name": "Meu Projeto",
  "cards": [...],
  "connections": [...],
  "texts": [...],
  "columns": [...],
  "categories": [...],
  "canvas": { "zoom": 1, "panX": 0, "panY": 0 }
}
```

---

## 🤝 Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para:

1. Fazer um Fork do projeto
2. Criar uma branch (`git checkout -b feature/NovaFuncionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/NovaFuncionalidade`)
5. Abrir um Pull Request

---

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

## 👨‍💻 Autor

Desenvolvido por **Kevin Gomes**

---

<p align="center">
  <sub>Feito com ❤️ para documentação de projetos</sub>
</p>

// ==========================================
// ThemeManager - Gerenciamento de Temas
// ==========================================

class ThemeManager {
  constructor(app) {
    this.app = app;
  }

  // Alterna o tema
  toggle() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute("data-theme");
    const newTheme = currentTheme === "light" ? "dark" : "light";

    html.setAttribute("data-theme", newTheme === "dark" ? "" : "light");

    // Toggle icons
    if (newTheme === "light") {
      this.app.themeIconDark.classList.add("hidden");
      this.app.themeIconLight.classList.remove("hidden");
    } else {
      this.app.themeIconDark.classList.remove("hidden");
      this.app.themeIconLight.classList.add("hidden");
    }

    // Salva preferência
    localStorage.setItem("visualdoc-theme", newTheme);
  }

  // Carrega o tema salvo
  load() {
    const savedTheme = localStorage.getItem("visualdoc-theme") || "dark";
    const html = document.documentElement;

    if (savedTheme === "light") {
      html.setAttribute("data-theme", "light");
      this.app.themeIconDark.classList.add("hidden");
      this.app.themeIconLight.classList.remove("hidden");
    } else {
      html.removeAttribute("data-theme");
      this.app.themeIconDark.classList.remove("hidden");
      this.app.themeIconLight.classList.add("hidden");
    }
  }
}

// Exporta para uso global
window.ThemeManager = ThemeManager;

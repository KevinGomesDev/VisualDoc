const fs = require("fs");

// Le o arquivo como buffer para manter os bytes originais
let buffer = fs.readFileSync("src/renderer/app.js");
let content = buffer.toString("utf8");

// Lista de substituicoes a fazer
const replacements = [
  // Caracteres corrompidos comuns de UTF-8 mal interpretado
  ["Ã§Ã£o", "ção"],
  ["Ã¡", "á"],
  ["Ã©", "é"],
  ["Ã­", "í"],
  ["Ãº", "ú"],
  ["Ã£", "ã"],
  ["Ã±", "ñ"],
  ["Ã³", "ó"],
  ["selecao", "seleção"],
  ["invalidos", "inválidos"],
];

// Aplica substituicoes
for (const [from, to] of replacements) {
  content = content.split(from).join(to);
}

// Escreve de volta
fs.writeFileSync("src/renderer/app.js", content, "utf8");
console.log("Arquivo corrigido!");

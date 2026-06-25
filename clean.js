const fs = require('fs');
const path = require('path');

const dir = __dirname;

// 1. Remove placeholders from index.html
let htmlPath = path.join(dir, 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');
html = html.replace(/ placeholder="[^"]*"/g, '');

// 2. Fix Section 8 fields
const targetS8 = `<tr><td>% de Asistencia (julio 2025)</td><td><input type="number" disabled title="No aplica"></td><td><input type="number" disabled title="No aplica"></td><td><input type="number" step="0.01" name="s8_asis_2025"></td></tr>`;
const replacementS8 = `<tr><td>% de Asistencia (julio 2025)</td><td><input type="number" step="0.01" name="s8_asis_2023"></td><td><input type="number" step="0.01" name="s8_asis_2024"></td><td><input type="number" step="0.01" name="s8_asis_2025"></td></tr>`;
html = html.replace(targetS8, replacementS8);

fs.writeFileSync(htmlPath, html);

// 3. Fix styles.css (Remove gradient text on header h1)
let cssPath = path.join(dir, 'styles.css');
let css = fs.readFileSync(cssPath, 'utf8');
css = css.replace(/  background: linear-gradient[^\n]+\n/g, '');
css = css.replace(/  -webkit-background-clip: text;\n/g, '');
css = css.replace(/  -webkit-text-fill-color: transparent;\n/g, '');
fs.writeFileSync(cssPath, css);

// 4. Fix login.html title
let loginPath = path.join(dir, 'login.html');
let login = fs.readFileSync(loginPath, 'utf8');
// The user might have a different file encoding, let's use a regex to be safe
login = login.replace(/<h2[^>]*>.*<\/h2>/, '<h2 style="margin-bottom: 20px; font-family: var(--font-display); color: #085F96;">Ficha Padem 2027</h2>');
fs.writeFileSync(loginPath, login);

console.log("Cleanup done.");

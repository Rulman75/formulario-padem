const fs = require('fs');
const { Pool } = require('pg');
require('dotenv').config();

async function main() {
    console.log("Reading index.html...");
    let html = fs.readFileSync('public/index.html', 'utf8');

    // 2. Section 3: Add placeholder
    html = html.replace('<input type="text" name="espec_reg_int">', '<input type="text" name="espec_reg_int" placeholder="Indicar si cuenta con las especificaciones para educación parvularia">');

    // 3. Section 3 PME: change radios to text
    html = html.replace(
        /<tr>\s*<td>PME<\/td>[\s\S]*?name="diag_pme" value="en_proceso"><\/label><\/td>\s*<td><\/td>\s*<\/tr>/,
        `<tr>
                                <td>PME</td>
                                <td class="center" colspan="2" style="text-align: right; font-size: 0.9rem; color: var(--text-muted); padding-right: 15px;">Año de ejecución:</td>
                                <td><input type="number" name="diag_pme_anio" placeholder="Ej: 2026"></td>
                            </tr>`
    );

    // 4. Section 4 title
    html = html.replace('<h2>4. Dotación por subvención regular cantidad actual y Proyección 2026</h2>', '<h2>4. Dotación por subvención regular cantidad actual 2026</h2>');

    // 5. Section 4 delete subtitle
    html = html.replace('<p class="subtitle">La justificación se debe realizar sobre situaciones concretas que ameriten un aumento de dotación.</p>', '');

    // 6. Section 4 select box for Contrato
    html = html.replace(/<input type="text" name="(s4_\d+_con)"( value="Estatuto Docente")?>/g, (match, p1, p2) => {
        const selected = p2 ? 'selected' : '';
        return `<select name="${p1}"><option value=""></option><option value="Estatuto Docente" ${selected}>Estatuto Docente</option><option value="Código del Trabajo">Código del Trabajo</option></select>`;
    });

    // 7. Section 6 title and select box
    html = html.replace('<th>Contrato</th>', '<th>Contrato (Estatuto Docente / C. del Trabajo)</th>');
    html = html.replace(/<input type="text" name="(s6_\d+_con)"( value="CT")?>/g, (match, p1, p2) => {
        const selected = p2 ? 'selected' : '';
        return `<select name="${p1}"><option value=""></option><option value="Estatuto Docente">Estatuto Docente</option><option value="Código del Trabajo" ${selected}>Código del Trabajo</option></select>`;
    });

    // 8. Section 6 Asistente de Aula (SEP)
    html = html.replace('<td>Asistente de Aula (SEP)</td>', '<td>Asistente de Aula</td>');

    // 9. Section 6 column 2025 -> 2026
    html = html.replace(/<th style="width: 100px;">2025<\/th>/, '<th style="width: 100px;">2026</th>');
    html = html.replace(/name="s6_(\d+)_2025"/g, 'name="s6_$1_2026"');

    // 10. Section 6 delete subtitle
    html = html.replace('<p class="subtitle">Informar contrato por estatuto docente o código del trabajo. La justificación se debe realizar sobre situaciones concretas que ameriten un aumento de dotación.</p>', '');

    // 11, 12. Section 7 Years and subtitle
    html = html.replace('*Se debe considerar información al 30 de julio 2026.', '*Se debe considerar información al 31 de mayo 2026.');
    // Re-map 2023->2024, 2024->2025, 2025->2026
    html = html.replace(/<th>2023<\/th>\s*<th>2024<\/th>\s*<th>2025<\/th>/, '<th>2024</th>\n                                <th>2025</th>\n                                <th>2026</th>');
    // Replace section 7 body precisely using a block replacement to avoid regex issues
    html = html.replace(
        /<tbody>\s*<tr>\s*<td>2023<\/td>[\s\S]*?<td>2025 \(\*\)<\/td>[\s\S]*?class="s7_reten"><\/td>\s*<\/tr>/,
        `<tbody>
                            <tr>
                                <td>2024</td>
                                <td><input type="number" name="s7_mat_2024" class="s7_mat"></td>
                                <td><input type="number" step="0.01" name="s7_asis_2024" class="s7_asis"></td>
                                <td><input type="number" name="s7_ret_2024" class="s7_ret"></td>
                                <td><input type="number" step="0.01" name="s7_reten_2024" class="s7_reten"></td>
                            </tr>
                            <tr>
                                <td>2025</td>
                                <td><input type="number" name="s7_mat_2025" class="s7_mat"></td>
                                <td><input type="number" step="0.01" name="s7_asis_2025" class="s7_asis"></td>
                                <td><input type="number" name="s7_ret_2025" class="s7_ret"></td>
                                <td><input type="number" step="0.01" name="s7_reten_2025" class="s7_reten"></td>
                            </tr>
                            <tr>
                                <td>2026 (*)</td>
                                <td><input type="number" name="s7_mat_2026" class="s7_mat"></td>
                                <td><input type="number" step="0.01" name="s7_asis_2026" class="s7_asis"></td>
                                <td><input type="number" name="s7_ret_2026" class="s7_ret"></td>
                                <td><input type="number" step="0.01" name="s7_reten_2026" class="s7_reten"></td>
                            </tr>`
    );

    // 13. Section 8 Headers and Asistencia
    html = html.replace(/<th>2023<\/th>\s*<th>2024<\/th>\s*<th>2025<\/th>/, '<th>2024</th>\n                                <th>2025</th>\n                                <th>2026</th>');
    html = html.replace('% de Asistencia (julio 2025)', '% de Asistencia (junio 2026)');
    
    // Replace name attributes in section 8 (2023->2024, 2024->2025, 2025->2026)
    html = html.replace(/name="s8_([a-z]+)_2023"/g, 'name="s8_$1_2024_temp"');
    html = html.replace(/name="s8_([a-z]+)_2024"/g, 'name="s8_$1_2025"');
    html = html.replace(/name="s8_([a-z]+)_2025"/g, 'name="s8_$1_2026"');
    html = html.replace(/name="s8_([a-z]+)_2024_temp"/g, 'name="s8_$1_2024"');

    // 14. Section 9 Columns
    html = html.replace(/<th>2023<\/th>\s*<th>2024<\/th>\s*<th>2025<\/th>/, '<th>2024</th>\n                                <th>2025</th>\n                                <th>2026</th>');
    html = html.replace(/name="s9_([a-z]+)_2023"/g, 'name="s9_$1_2024_temp"');
    html = html.replace(/name="s9_([a-z]+)_2024"/g, 'name="s9_$1_2025"');
    html = html.replace(/name="s9_([a-z]+)_2025"/g, 'name="s9_$1_2026"');
    html = html.replace(/name="s9_([a-z]+)_2024_temp"/g, 'name="s9_$1_2024"');

    fs.writeFileSync('public/index.html', html);
    console.log("index.html updated successfully!");

    // 1. Password input style fix in styles.css
    let css = fs.readFileSync('public/styles.css', 'utf8');
    css = css.replace('input[type="date"],', 'input[type="date"],\r\ninput[type="password"],');
    fs.writeFileSync('public/styles.css', css);
    console.log("styles.css updated successfully!");

    // 15. Clear Neon DB form_data
    console.log("Connecting to Neon DB...");
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    await pool.query('DELETE FROM form_data');
    console.log("form_data cleared successfully!");
    
    // Check form_data content
    const res = await pool.query('SELECT COUNT(*) FROM form_data');
    console.log(`Current form_data count: ${res.rows[0].count}`);

    await pool.end();
}

main().catch(console.error);

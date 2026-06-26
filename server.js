const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const path = require('path');
const ExcelJS = require('exceljs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from 'public'
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

app.set('trust proxy', 1);

// DB Initialization
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.use(session({
    store: new pgSession({
        pool: pool,
        tableName: 'session'
    }),
    secret: process.env.SESSION_SECRET || 'cmds_secret_key_2026',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === 'production', maxAge: 24 * 60 * 60 * 1000 } // 1 day
}));

pool.on('connect', () => {
  console.log('Connected to the Neon PostgreSQL database.');
});

// Initialize DB schema
async function initDB() {
    try {
        // Create session table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS "session" (
                "sid" varchar NOT NULL COLLATE "default",
                "sess" json NOT NULL,
                "expire" timestamp(6) NOT NULL,
                PRIMARY KEY ("sid")
            )
        `);
        await pool.query(`CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire")`);

        // Create users table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(50) DEFAULT 'user',
                must_change_password BOOLEAN DEFAULT TRUE,
                school_name VARCHAR(255),
                director_name VARCHAR(255)
            )
        `);

        // Create form_data table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS form_data (
                user_id INTEGER PRIMARY KEY REFERENCES users(id),
                data TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Check if admin exists
        const adminRes = await pool.query(`SELECT id FROM users WHERE username = 'admin'`);
        if (adminRes.rowCount === 0) {
            const salt = bcrypt.genSaltSync(10);
            const adminHash = bcrypt.hashSync('admin123', salt);
            await pool.query(
                `INSERT INTO users (username, password, role, must_change_password) VALUES ($1, $2, $3, $4)`,
                ['admin', adminHash, 'admin', false]
            );
        }

        // Seed Schools (only if no regular users exist to avoid recreating them)
        const usersRes = await pool.query(`SELECT id FROM users WHERE role = 'user' LIMIT 1`);
        if (usersRes.rowCount === 0) {
            const seedData = [
              { id: '12972', school: 'COLEGIO LA CONCEPCIÓN', director: 'CLAUDIA ROJAS GATICA' },
              { id: '297', school: 'ESCUELA ALCALDE MAXIMILIANO POBLETE', director: 'MONICA ALEJANDRA BECERRA RIVAS' },
              { id: '313', school: 'ESCUELA ARTURO PRAT CHACÓN', director: 'ROSA AREVALO ZEPEDA' },
              { id: '310', school: 'ESCUELA CLAUDIO MATTE PEREZ', director: 'ROXANA ARNAO SALLES' },
              { id: '298', school: 'ESCUELA DARIO SALAS DIAZ', director: 'MARCELA ASTIGUETA MUÑOZ' },
              { id: '312', school: 'ESCUELA ECUADOR', director: 'MARCELO CAÑAS SILVA' },
              { id: '318', school: 'ESCUELA EDDA CUNEO', director: 'ANDREA VIDAL SANCHEZ' },
              { id: '12962', school: 'ESCUELA ELMO FUNEZ CARRIZO', director: 'KALAJAN AVENDAÑO KREUZFELAT' },
              { id: '289', school: 'ESCUELA ESPAÑA', director: 'VERONICA CASTRO BARRIENTOS' },
              { id: '324', school: 'ESCUELA FUNDACION MINERA ESCONDIDA', director: 'RUDITH ESQUIVEL LEDESMA' },
              { id: '332', school: 'ESCUELA GABRIELA MISTRAL', director: 'ANDREA MORALES FERNANDEZ' },
              { id: '322', school: 'ESCUELA GENERAL MANUEL BAQUEDANO', director: 'VERONICA ESPINOZA TORO' },
              { id: '315', school: 'ESCUELA HÉROES DE LA CONCEPCIÓN', director: 'XIMENA PEREZ OYANADEL' },
              { id: '306', school: 'ESCUELA HUANCHACA', director: 'CIRO MILLAN MENESES' },
              { id: '305', school: 'ESCUELA HUMBERTO GONZÁLEZ ECHEGOYEN', director: 'CLAUDIA ILLESCA ANDRADE' },
              { id: '292', school: 'ESCUELA ITALIA', director: 'JULIA TORO ARAYA' },
              { id: '288', school: 'ESCUELA JAPÓN', director: 'IVAN POZO CAMPOS' },
              { id: '293', school: 'ESCUELA JOSÉ PAPIC RADNIC', director: 'MARCO JIL CISTERNAS' },
              { id: '302', school: 'ESCUELA JUAN LOPEZ', director: 'JAVIER ALTAMIRANO CASTILLO' },
              { id: '12840', school: 'ESCUELA JUAN PABLO II', director: 'JOCELYNE COVARRUBIAS BARAHONA' },
              { id: '311', school: 'ESCUELA JUAN SANDOVAL CARRASCO', director: 'RUTH SAEZ RUBILAR' },
              { id: '319', school: 'ESCUELA LA BANDERA', director: 'JUAN MORENO PERALTA' },
              { id: '316', school: 'ESCUELA LAS AMERICAS PROFESOR JUSTO V.', director: 'SABBAS SPATARIS VEGA' },
              { id: '317', school: 'ESCUELA LAS ROCAS', director: 'LORENA ROJAS BERENGUELA' },
              { id: '294', school: 'ESCUELA LJUBICA DOMIC W.', director: 'DANILO MORALES ALVAREZ' },
              { id: '12945', school: 'ESCUELA PADRE ALBERTO HURTADO', director: 'MARIA ROJAS ELGUETA' },
              { id: '291', school: 'ESCUELA PADRE GUSTAVO LE PAIGE', director: 'ELIZABETH OSORIO LAZCANO' },
              { id: '303', school: 'ESCUELA REPUBLICA ARGENTINA', director: 'JENNY YEVENES TOLEDO' },
              { id: '296', school: 'ESCUELA REPUBLICA EE.UU', director: 'PAOLA ASTUDILLO GOMEZ' },
              { id: '12944', school: 'ESCUELA REVERENDO PADRE PATRICIO CARIO', director: 'DAHIAN VEGA CUELLO' },
              { id: '301', school: 'ESCUELA ROMULO J. PEÑA', director: 'CARLOS GUERRA FATIGATTI' },
              { id: '326', school: 'ESCUELA SANTIAGO AMENGUAL', director: 'DANIELA PAZ PAEZ' },
              { id: '333', school: 'ESCUELA PARVULOS BLANCA NIEVES', director: 'GEORGINA A CARVAJAL ASTUDILLO' },
              { id: '330', school: 'ESCUELA PARVULOS LOS PINGUINITOS', director: 'LUCILA CARVAJAL ZAMORA' },
              { id: '307', school: 'ESCUELA PARVULOS MARCELA PAZ', director: 'PAULINA SALINAS RIVERA' },
              { id: '12822', school: 'ESCUELA PARVULOS SEMILLITA', director: 'XIMENA GALVEZ ASTUDILLO' },
              { id: '329', school: 'INSTITUTO CIENTIFICO EDUC. JOSE MAZA SANC', director: 'ALEJANDRO SUAREZ ROJO' },
              { id: '501', school: 'JARDIN ESPERANZA', director: 'KARLA RAMALLO VÉLIZ' },
              { id: '502', school: 'JARDIN RIQUEZA ESCONDIDA', director: 'FRANCHESCA MIRANDA FUENZALILDA' },
              { id: '503', school: 'JARDIN RINCONCITO FELIZ', director: 'FRANCIS VALDERRAMA RAMOS' },
              { id: '504', school: 'SALA CUNA PEDACITO DE SOL', director: 'SANDRA PÉREZ PÉREZ' },
              { id: '505', school: 'JARDIN CABALLITO DE MAR', director: 'MARJORIE ESTAY ULLOA' },
              { id: '506', school: 'JARDIN ARBOLIA', director: 'JESSICA ROCO SEGOVIA' },
              { id: '507', school: 'JARDIN PANKARITA', director: 'MÓNICA LETELIER TORO' },
              { id: '508', school: 'JARDIN PORTAL DE BELEN', director: 'YESICA MOYA CORTES' },
              { id: '509', school: 'JARDIN SUEÑO DE COLORES', director: 'MARÍA PAZ NIEVAS SILVA' },
              { id: '510', school: 'JARDIN PERLITAS DE DESIERTO', director: 'KARLA RAMALLO VÉLIZ' },
              { id: '304', school: 'LICEO ANDRÉS SABELLA GALVEZ', director: 'PAULINA MONTENEGRO MATUS' },
              { id: '287', school: 'LICEO DOMINGO HERRERA RIVERA', director: 'VICTOR ESCOBAR DIAZ' },
              { id: '282', school: 'LICEO DR. ANTONIO RENDIC', director: 'MERCEDES ORELLANA PIZARRO' },
              { id: '279', school: 'LICEO EULOGIO GORDO MONEO', director: 'CLAUDIA TRABUCCO SAMIT' },
              { id: '31343', school: 'LICEO LA CHIMBA', director: 'PATRICIO DAVILA CONTRERAS' },
              { id: '286', school: 'LICEO LA PORTADA', director: 'ELENA PALACIOS MONTAÑA' },
              { id: '284', school: 'LICEO MARIO BAHAMONDE SILVA', director: 'SERGIO ALVAREZ ROJAS' },
              { id: '285', school: 'LICEO MARTA NAREA DIAZ', director: 'WILLIAMS BUTLER PORTALES' },
              { id: '10968', school: 'LICEO OSCAR BONILLA BRADANOVIC', director: 'GENOVEVA WILLIAMS BAUSSA' },
              { id: '283', school: 'LICEO TECNICO', director: 'BORIS GARCIA ROSALES' },
              { id: '320', school: 'LICEO ARTÍSTICO ARMANDO CARRERA', director: 'LUIS TOBAR CONTRERAS' },
              { id: '280', school: 'LICEO COMERCIAL JERARDO MUÑOZ CAMPOS', director: 'SERGIO FRANCO DUBO' },
              { id: '31345', school: 'LICEO POLITÉCNICO LOS ARENALES', director: 'GARY MUÑOZ VILLENA' }
            ];
            
            const salt = bcrypt.genSaltSync(10);
            const defaultHash = bcrypt.hashSync('12345678', salt);
            
            for (const s of seedData) {
                await pool.query(
                    `INSERT INTO users (username, password, role, must_change_password, school_name, director_name) VALUES ($1, $2, 'user', true, $3, $4) ON CONFLICT (username) DO NOTHING`,
                    [s.id, defaultHash, s.school, s.director]
                );
            }
            console.log('Seeding de colegios en Postgres finalizado.');
        }
    } catch (err) {
        console.error('Error inicializando base de datos', err);
    }
}
initDB();

// Middlewares
const requireAuth = (req, res, next) => {
    if (!req.session.userId) return res.redirect('/login');
    if (req.session.must_change_password && req.path !== '/change-password' && !req.path.startsWith('/api/change-password') && !req.path.startsWith('/api/logout')) {
        return res.redirect('/change-password');
    }
    next();
};

const requireAdmin = (req, res, next) => {
    if (!req.session.userId || req.session.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden' });
    }
    next();
};

// HTML Routes - Vercel serves from 'public' but we intercept these
app.get('/', requireAuth, (req, res) => {
    if (req.session.role === 'admin') {
        res.redirect('/admin');
    } else {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }
});

app.get('/login', (req, res) => {
    if (req.session.userId) return res.redirect('/');
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/change-password', (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    if (!req.session.must_change_password) return res.redirect('/');
    res.sendFile(path.join(__dirname, 'public', 'change-password.html'));
});

app.get('/admin', requireAuth, (req, res) => {
    if (req.session.role !== 'admin') return res.redirect('/');
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// API Routes
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const { rows } = await pool.query(`SELECT * FROM users WHERE username = $1`, [username]);
        if (rows.length === 0) return res.status(401).json({ error: 'Credenciales inválidas' });
        
        const user = rows[0];
        if (!bcrypt.compareSync(password, user.password)) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }
        
        req.session.userId = user.id;
        req.session.username = user.username;
        req.session.role = user.role;
        req.session.must_change_password = user.must_change_password;

        if (user.must_change_password) {
            res.json({ success: true, redirect: '/change-password' });
        } else if (user.role === 'admin') {
            res.json({ success: true, redirect: '/admin' });
        } else {
            res.json({ success: true, redirect: '/' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Error del servidor' });
    }
});

app.post('/api/change-password', async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
    
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    try {
        const hash = bcrypt.hashSync(newPassword, 10);
        await pool.query(`UPDATE users SET password = $1, must_change_password = false WHERE id = $2`, [hash, req.session.userId]);
        req.session.must_change_password = false;
        res.json({ success: true, redirect: '/' });
    } catch (err) {
        res.status(500).json({ error: 'DB Error' });
    }
});

app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true, redirect: '/login' });
});

// Form APIs
app.get('/api/form-data', requireAuth, async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT u.username, u.school_name, u.director_name, f.data 
            FROM users u LEFT JOIN form_data f ON u.id = f.user_id 
            WHERE u.id = $1`, [req.session.userId]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
        
        const row = rows[0];
        const responseData = {
            username: row.username,
            school_name: row.school_name,
            director_name: row.director_name,
            formData: row.data ? JSON.parse(row.data) : {}
        };
        res.json({ success: true, data: responseData });
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/form-data', requireAuth, async (req, res) => {
    const jsonString = JSON.stringify(req.body);
    try {
        await pool.query(`
            INSERT INTO form_data (user_id, data, updated_at) VALUES ($1, $2, CURRENT_TIMESTAMP)
            ON CONFLICT (user_id) DO UPDATE SET data = EXCLUDED.data, updated_at = CURRENT_TIMESTAMP`, 
            [req.session.userId, jsonString]
        );
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'DB Error' });
    }
});

// Admin APIs
app.get('/api/admin/users', requireAdmin, async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT u.id, u.username, u.school_name, u.must_change_password,
            CASE WHEN f.user_id IS NOT NULL THEN 1 ELSE 0 END as has_data,
            f.updated_at
            FROM users u 
            LEFT JOIN form_data f ON u.id = f.user_id 
            WHERE u.role != 'admin'
            ORDER BY u.school_name ASC
        `);
        // Transform for frontend boolean expectations
        const formattedRows = rows.map(r => ({
            ...r,
            has_data: r.has_data === 1
        }));
        res.json({ success: true, users: formattedRows });
    } catch (err) {
        res.status(500).json({ error: 'DB error' });
    }
});

app.post('/api/admin/reset-password', requireAdmin, async (req, res) => {
    const { userId } = req.body;
    try {
        const defaultHash = bcrypt.hashSync('12345678', 10);
        await pool.query(`UPDATE users SET password = $1, must_change_password = true WHERE id = $2`, [defaultHash, userId]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'DB error' });
    }
});

app.get('/api/admin/export', requireAdmin, async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT u.username, u.school_name, u.director_name, f.data, f.updated_at 
            FROM users u JOIN form_data f ON u.id = f.user_id WHERE u.role != 'admin'
        `);

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Reporte PADEM 2027');

        const allKeys = new Set();
        const processedRows = rows.map(r => {
            const parsedData = JSON.parse(r.data);
            Object.keys(parsedData).forEach(k => allKeys.add(k));
            return {
                RBD: r.username,
                Establecimiento: r.school_name,
                Director: r.director_name,
                UltimaActualizacion: r.updated_at,
                ...parsedData
            };
        });

        function formatHeader(key) {
            const parts = key.split('_');
            const sectionMap = {
                's1': 'Sec1', 's2': 'Sec2', 's3': 'Sec3', 's4': 'Sec4', 's5': 'Sec5',
                's6': 'Sec6', 's7': 'Sec7', 's8': 'Sec8', 's9': 'Sec9', 's10': 'Sec10',
                'diag': 'Diag'
            };
            const termMap = {
                'mat': 'Matrícula', 'asis': 'Asistencia', 'ret': 'Retiros', 'reten': 'Retención',
                'vul': 'Vulnerabilidad', 'rac': 'Raciones', 'bec': 'Becas', 'pc': 'PC_Séptimo',
                'delta': 'DELTA', 'pace': 'PACE', 'aula': 'Aula_Segura', 'con': 'Contrato',
                'obs': 'Observación', 'q1': 'Pregunta_1', 'q2': 'Pregunta_2',
                'pei': 'PEI', 'reg': 'Reglamento', 'man': 'Manual', 'prot': 'Protocolos',
                'epa1': 'EPA-1', 'eval': 'Evaluación', 'prac': 'Práctica', 'pise': 'PISE',
                'pme': 'PME', 'plan': 'Plan', 'conv': 'Convivencia', 'ciu': 'Ciudadana',
                'sex': 'Sexualidad', 'doc': 'Docente', 'inc': 'Inclusión', 'seg': 'Seguridad',
                'esp': 'Especificación', 'anio': 'Año', 'int': 'Interno', 'apr': 'Aprobados',
                'rep': 'Repetición', 'egr': 'Egresados', 'tit': 'Titulados'
            };

            let formattedParts = parts.map((p, index) => {
                if (index === 0 && sectionMap[p]) return sectionMap[p];
                if (termMap[p]) return termMap[p];
                return p.charAt(0).toUpperCase() + p.slice(1);
            });

            return formattedParts.join(' ').replace(/_/g, ' ');
        }

        const columns = [
            { header: 'RBD', key: 'RBD', width: 10 },
            { header: 'Establecimiento', key: 'Establecimiento', width: 40 },
            { header: 'Director', key: 'Director', width: 30 },
            { header: 'Última Actualización', key: 'UltimaActualizacion', width: 25 },
            ...Array.from(allKeys).map(k => ({ header: formatHeader(k), key: k, width: 25 }))
        ];

        sheet.columns = columns;
        sheet.addRows(processedRows);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="Reporte_PADEM_2027.xlsx"');

        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        res.status(500).send('Database error');
    }
});

app.listen(PORT, () => console.log(`Servidor ejecutándose en puerto ${PORT}`));
module.exports = app;

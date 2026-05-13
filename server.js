const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
const https = require('https');
const fs = require('fs');

const app = express();

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'DELETE', 'PUT'] }));
app.use(bodyParser.json());

const db = mysql.createPool({
    host: 'localhost',
    user: 'sis_biblioteca',
    password: 'biblioteca123',
    database: 'biblioteca',
    connectionLimit: 10
});

// RUTAS DE BITÁCORA (Puestas al principio para prioridad)
app.get('/api/logs-acceso', (req, res) => {
    db.query("SELECT * FROM logs_acceso ORDER BY fecha DESC LIMIT 50", (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

app.get('/api/log-libros', (req, res) => {
    db.query("SELECT * FROM log_libros ORDER BY fecha DESC LIMIT 50", (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

// RUTA LOGIN CON INSERT
app.post('/api/login', (req, res) => {
    const { usuario, password } = req.body;
    db.query("SELECT * FROM usuarios WHERE usuario = ? AND password = ?", [usuario, password], (err, results) => {
        if (results && results.length > 0) {
            const nombre = results[0].nombre_completo;
            db.query("INSERT INTO logs_acceso (usuario, fecha) VALUES (?, NOW())", [nombre]);
            res.json({ auth: true, user: { usuario: results[0].usuario, nombre_completo: nombre } });
        } else {
            res.status(401).json({ auth: false });
        }
    });
});

// TUS OTRAS RUTAS (Libros, Usuarios, etc. mantén las que ya tienes)
app.get('/api/libros', (req, res) => {
    db.query("SELECT * FROM libros ORDER BY id DESC", (err, r) => res.json(r));
});

app.post('/api/registrar-libro', (req, res) => {
    const { codigo, titulo, autor, editorial, estado, usuario_accion } = req.body;
    db.query("INSERT INTO libros (codigo, titulo, autor, editorial, estado) VALUES (?,?,?,?,?)", [codigo, titulo, autor, editorial, estado], () => {
        db.query("INSERT INTO log_libros (usuario, accion, detalles, fecha) VALUES (?, 'Registro', ?, NOW())", [usuario_accion, `Libro: ${titulo}`]);
        res.json({ success: true });
    });
});

app.get('/api/usuarios', (req, res) => {
    db.query("SELECT id, nombre_completo, usuario FROM usuarios", (err, r) => res.json(r));
});

// INICIO DE SERVIDOR
const PORT = 3001;
try {
    const certs = {
        key: fs.readFileSync('./certs/biblioteca.key'),
        cert: fs.readFileSync('./certs/biblioteca.crt')
    };
    https.createServer(certs, app).listen(PORT, '0.0.0.0', () => {
        console.log("🚀 HTTPS en 3001 con Logs");
    });
} catch (e) {
}

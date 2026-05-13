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

// --- BITÁCORA ---
app.get('/api/logs-acceso', (req, res) => {
    db.query("SELECT * FROM logs_acceso ORDER BY fecha_hora DESC LIMIT 15", (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

app.get('/api/log-libros', (req, res) => {
    db.query("SELECT * FROM log_libros ORDER BY fecha DESC LIMIT 15", (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

// --- LOGIN ---
app.post('/api/login', (req, res) => {
    const { usuario, password } = req.body;
    db.query("SELECT * FROM usuarios WHERE usuario = ? AND password = ?", [usuario, password], (err, results) => {
        if (err) return res.status(500).json(err);
        if (results.length > 0) {
            const user = results[0];
            db.query("INSERT INTO logs_acceso (nombre_usuario, fecha_hora) VALUES (?, NOW())", [user.nombre_completo]);
            res.json({ auth: true, user: user });
        } else {
            res.status(401).json({ auth: false });
        }
    });
});

// --- GESTIÓN DE USUARIOS (EL QUE NO ESTÁ REGISTRANDO) ---
app.post('/api/usuarios', (req, res) => {
    const { nombre_completo, usuario, password } = req.body;
    
    console.log("Intentando registrar usuario:", usuario); // Log para debug

    const query = "INSERT INTO usuarios (nombre_completo, usuario, password) VALUES (?, ?, ?)";
    db.query(query, [nombre_completo, usuario, password], (err, result) => {
        if (err) {
            console.error("Error en SQL al registrar usuario:", err.message);
            return res.status(500).json({ error: err.message });
        }
        console.log("Usuario registrado con éxito ID:", result.insertId);
        res.json({ success: true, id: result.insertId });
    });
});

app.get('/api/usuarios', (req, res) => {
    db.query("SELECT id, nombre_completo, usuario FROM usuarios", (err, r) => {
        if (err) return res.status(500).json(err);
        res.json(r);
    });
});

app.delete('/api/usuarios/:id', (req, res) => {
    db.query("DELETE FROM usuarios WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json(err);
        res.json({ success: true });
    });
});

// --- LIBROS ---
app.get('/api/libros', (req, res) => {
    db.query("SELECT * FROM libros ORDER BY id DESC", (err, r) => res.json(r));
});

app.post('/api/registrar-libro', (req, res) => {
    const { codigo, titulo, autor, editorial, estado, usuario_accion } = req.body;
    db.query("INSERT INTO libros (codigo, titulo, autor, editorial, estado) VALUES (?,?,?,?,?)", 
    [codigo, titulo, autor, editorial, estado], (err) => {
        if (err) return res.status(500).json(err);
        db.query("INSERT INTO log_libros (usuario, accion, detalles, fecha) VALUES (?, 'Registro', ?, NOW())", 
        [usuario_accion, `Libro: ${titulo}`]);
        res.json({ success: true });
    });
});

// --- HTTPS ---
const PORT = 3001;
try {
    const certs = {
        key: fs.readFileSync('./certs/biblioteca.key'),
        cert: fs.readFileSync('./certs/biblioteca.crt')
    };
    https.createServer(certs, app).listen(PORT, '0.0.0.0', () => {
        console.log("🚀 Backend HTTPS en 3001");
    });
} catch (e) {
    console.error("Error Certificados:", e.message);
}

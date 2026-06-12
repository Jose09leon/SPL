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

// --- GESTIÓN DE USUARIOS ---
app.post('/api/usuarios', (req, res) => {
    const { nombre_completo, usuario, password } = req.body;
    
    console.log("Intentando registrar usuario:", usuario);

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
    db.query("SELECT * FROM libros ORDER BY id DESC", (err, r) => {
        if (err) return res.status(500).json(err);
        res.json(r);
    });
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

// --- VERIFICAR SI UN LIBRO EXISTE ANTES DE PRESTAR ---
app.get('/api/verificar-libro/:codigo', (req, res) => {
    const { codigo } = req.params;
    const query = "SELECT * FROM libros WHERE codigo = ?";
    
    db.query(query, [codigo], (err, results) => {
        if (err) return res.status(500).json(err);
        
        if (results.length === 0) {
            return res.status(404).json({ existe: false, message: "Libro no encontrado" });
        }
        res.json({ existe: true, libro: results[0] });
    });
});

// --- BUSCADOR EN CASCADA INTELIGENTE BLINDADO CONTRA ERRORES DE COLUMNAS ---
app.get('/api/buscar-alumno/:matricula', (req, res) => {
    const { matricula } = req.params;
    
    // 1. Buscamos primero en la tabla alumnos usando tus nombres de columna reales
    const queryAlumnos = `
        SELECT 
            CONCAT(nombre_alumno, ' ', apellido_paterno, ' ', apellido_materno) AS nombre, 
            carrera 
        FROM alumnos 
        WHERE no_de_control = ?
    `;
    
    db.query(queryAlumnos, [matricula], (err, alumnoResults) => {
        if (err) {
            console.error("Error al consultar la tabla alumnos:", err.message);
            return res.status(500).json({ error: "Error en base de datos al buscar alumno" });
        }
        
        // Si el registro se encuentra en alumnos, respondemos de inmediato al frontend
        if (alumnoResults.length > 0) {
            return res.json({ encontrado: true, alumno: alumnoResults[0] });
        }
        
        // 2. Si no se encuentra en alumnos, pasamos a buscar en la tabla maestros usando '*' de manera segura
        const queryMaestros = "SELECT * FROM maestros WHERE no_tarjeta = ?";
        
        db.query(queryMaestros, [matricula], (errMaestros, maestroResults) => {
            if (errMaestros) {
                console.error("Error al consultar la tabla maestros:", errMaestros.message);
                return res.status(500).json({ error: "Error en base de datos al buscar maestro" });
            }
            
            // Si se encuentra en maestros, extraemos el nombre dinámicamente según tus columnas
            if (maestroResults.length > 0) {
                const fila = maestroResults[0];
                let nombreDetectado = "Docente Registrado";

                // Caso A: Si usaste columnas separadas para el maestro como en los alumnos
                if (fila.nombre_maestro || fila.nombre_docente) {
                    nombreDetectado = fila.nombre_maestro || fila.nombre_docente;
                } else if (fila.nombre_alumno) {
                    // Si clonaste la estructura de la tabla alumnos
                    nombreDetectado = `${fila.nombre_alumno} ${fila.apellido_paterno || ''} ${fila.apellido_materno || ''}`.trim();
                } else {
                    // Caso B: Buscar cualquier columna de texto que contenga el nombre del docente
                    const llaves = Object.keys(fila);
                    for (let llave of llaves) {
                        if (llave.toLowerCase().includes('nom') || llave.toLowerCase().includes('maestro') || llave.toLowerCase().includes('docente')) {
                            nombreDetectado = fila[llave];
                            break;
                        }
                    }
                }

                return res.json({ 
                    encontrado: true, 
                    alumno: {
                        nombre: nombreDetectado,
                        carrera: 'Docente LSI'
                    }
                });
            }
            
            // 3. Si no existe en ninguna de las dos tablas, enviamos un estado 404
            res.status(404).json({ encontrado: false, message: "Usuario no registrado en el sistema" });
        });
    });
});

// --- PROCESAR EL PRÉSTAMO Y REGISTRAR EN BITÁCORA ---
app.post('/api/prestar-libro', (req, res) => {
    const { codigo, alumno, matricula, carrera, usuario_accion } = req.body;

    const queryUpdate = "UPDATE libros SET estado = 'Prestado' WHERE codigo = ?";
    
    db.query(queryUpdate, [codigo], (err, result) => {
        if (err) return res.status(500).json(err);

        const detallesLog = `Prestado a: ${alumno} | Identificador: ${matricula} | Tipo: ${carrera} | Cód. Libro: ${codigo}`;
        const queryLog = "INSERT INTO log_libros (usuario, accion, detalles, fecha) VALUES (?, 'Préstamo', ?, NOW())";
        
        db.query(queryLog, [usuario_accion, detallesLog], (logErr) => {
            if (logErr) console.error("Error al registrar movimiento de préstamo:", logErr);
        });

        res.json({ success: true });
    });
});

// --- NUEVO INICIO DEL SERVIDOR EN HTTP PLANO (HÍBRIDO LAN/TAILSCALE) ---
const PORT = 3001;
app.listen(PORT, '0.0.0.0', () => {
    console.log("🚀 Backend híbrido libre de certificados corriendo en el puerto 3001");
});

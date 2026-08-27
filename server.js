const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const xlsx = require('xlsx');

const app = express();

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'DELETE', 'PUT'] }));
app.use(bodyParser.json());

// Buffer de memoria para Multer (sin archivos temporales en disco)
const upload = multer({ storage: multer.memoryStorage() });

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

// --- AUTENTICACIÓN / LOGIN ---
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

// --- ADMINISTRACIÓN DE USUARIOS ---
app.post('/api/usuarios', (req, res) => {
    const { nombre_completo, usuario, password } = req.body;
    const query = "INSERT INTO usuarios (nombre_completo, usuario, password) VALUES (?, ?, ?)";
    db.query(query, [nombre_completo, usuario, password], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
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

// --- CATÁLOGO DE LIBROS ---
app.get('/api/libros', (req, res) => {
    db.query("SELECT * FROM libros ORDER BY id DESC", (err, r) => {
        if (err) return res.status(500).json(err);
        res.json(r);
    });
});

app.post('/api/registrar-libro', (req, res) => {
    const { codigo, titulo, autor, editorial, estado, usuario_accion, ubicacion, confirmarModificacion } = req.body;
    
    const queryCheck = "SELECT * FROM libros WHERE codigo = ?";
    db.query(queryCheck, [codigo], (errCheck, resultsCheck) => {
        if (errCheck) return res.status(500).json(errCheck);
        
        if (resultsCheck.length > 0) {
            if (confirmarModificacion) {
                const queryUpdate = "UPDATE libros SET titulo = ?, autor = ?, editorial = ?, ubicacion = ? WHERE codigo = ?";
                db.query(queryUpdate, [titulo, autor, editorial, ubicacion || 'Mueble Temas Diversos', codigo], (errUpdate) => {
                    if (errUpdate) return res.status(500).json(errUpdate);
                    
                    db.query("INSERT INTO log_libros (usuario, accion, detalles, fecha) VALUES (?, 'Modificación', ?, NOW())", 
                    [usuario_accion || 'Admin', `Modificó libro: ${titulo} | Nueva Ubicación: ${ubicacion}`]);
                    
                    return res.json({ success: true, modificado: true });
                });
            } else {
                return res.status(200).json({ 
                    existe: true, 
                    mensaje: "El libro ya se encuentra registrado en el sistema.",
                    libro: resultsCheck[0] 
                });
            }
        } else {
            db.query("INSERT INTO libros (codigo, titulo, autor, editorial, estado, ubicacion) VALUES (?,?,?,?,?,?)", 
            [codigo, titulo, autor, editorial, estado || 'Disponible', ubicacion || 'Mueble Temas Diversos'], (err) => {
                if (err) return res.status(500).json(err);
                db.query("INSERT INTO log_libros (usuario, accion, detalles, fecha) VALUES (?, 'Registro', ?, NOW())", 
                [usuario_accion, `Libro: ${titulo}`]);
                res.json({ success: true, registrado: true });
            });
        }
    });
});

app.get('/api/verificar-libro/:codigo', (req, res) => {
    const { codigo } = req.params;
    db.query("SELECT * FROM libros WHERE codigo = ?", [codigo], (err, results) => {
        if (err) return res.status(500).json(err);
        if (results.length === 0) return res.status(404).json({ existe: false, message: "Libro no encontrado" });
        res.json({ existe: true, libro: results[0] });
    });
});

// --- BUSCADOR EN CASCADA INTELIGENTE (ALUMNOS Y MAESTROS) ---
app.get('/api/buscar-alumno/:matricula', (req, res) => {
    const matricula = req.params.matricula.trim().toLowerCase();
    
    const queryAlumnos = `
        SELECT 
            CONCAT(nombre_alumno, ' ', apellido_paterno, ' ', apellido_materno) AS nombre, 
            carrera 
        FROM alumnos 
        WHERE LOWER(no_de_control) = ?
    `;
    
    db.query(queryAlumnos, [matricula], (err, alumnoResults) => {
        if (err) return res.status(500).json({ error: "Error en base de datos al buscar alumno" });
        
        if (alumnoResults.length > 0) {
            return res.json({ encontrado: true, alumno: alumnoResults[0], esMaestro: false });
        }
        
        const queryMaestros = "SELECT * FROM maestros WHERE LOWER(no_tarjeta) = ?";
        db.query(queryMaestros, [matricula], (errMaestros, maestroResults) => {
            if (errMaestros) return res.status(500).json({ error: "Error en base de datos al buscar maestro" });
            
            if (maestroResults.length > 0) {
                const fila = maestroResults[0];
                let nombreDetectado = "";
                let departamentoDetectado = "Docente LSI";
                const llaves = Object.keys(fila);

                for (let llave of llaves) {
                    const llaveMin = llave.toLowerCase();
                    if (llaveMin.includes('nom') || llaveMin.includes('maestro') || llaveMin.includes('docente')) {
                        nombreDetectado = fila[llave];
                        break;
                    }
                }
                
                if (!nombreDetectado) {
                    nombreDetectado = fila.nombre_maestro || fila.nombre_docente || "Docente Identificado";
                }

                if (fila.departamento || fila.adscripcion || fila.carrera || fila.materia) {
                    departamentoDetectado = fila.departamento || fila.adscripcion || fila.carrera || fila.materia;
                } else {
                    for (let llave of llaves) {
                        if (llave.toLowerCase().includes('dep') || llave.toLowerCase().includes('ads') || llave.toLowerCase().includes('area')) {
                            departamentoDetectado = fila[llave];
                            break;
                        }
                    }
                }

                return res.json({ 
                    encontrado: true, 
                    alumno: {
                        nombre: nombreDetectado,
                        carrera: departamentoDetectado
                    },
                    esMaestro: true
                });
            }
            
            res.status(404).json({ encontrado: false, message: "Usuario no registrado en el sistema escolar" });
        });
    });
});

app.get('/api/info-prestamo/:codigo', (req, res) => {
    const { codigo } = req.params;
    const query = "SELECT detalles, fecha FROM log_libros WHERE detalles LIKE ? AND accion = 'Préstamo' ORDER BY fecha DESC LIMIT 1";
    
    db.query(query, [`%Cód. Libro: ${codigo}%`], (err, results) => {
        if (err) return res.status(500).json(err);
        if (results.length === 0) return res.json({ encontrado: false });
        
        const logData = results[0];
        const detalles = logData.detalles;
        const alumnoMatch = detalles.match(/Prestado\s+(?:de\s+forma\s+AUTÓNOMA\s+)?a:\s*([^|]+)/i);
        const matriculaMatch = detalles.match(/Identificador:\s*([^|]+)/i);
        const carreraMatch = detalles.match(/(?:Carrera|Departamento|Tipo):\s*([^|]+)/i);
        
        res.json({
            encontrado: true,
            prestamo: {
                alumno: alumnoMatch ? alumnoMatch[1].trim() : "Desconocido",
                matricula: matriculaMatch ? matriculaMatch[1].trim() : "N/A",
                carrera: carreraMatch ? carreraMatch[1].trim() : "N/A",
                fecha_prestamo: logData.fecha
            }
        });
    });
});

// --- PRÉSTAMOS MANUALES ADMIN ---
app.post('/api/prestar-libro', (req, res) => {
    const { codigo, alumno, matricula, carrera, usuario_accion } = req.body;

    db.query("SELECT estado, titulo FROM libros WHERE codigo = ?", [codigo], (err, results) => {
        if (err) return res.status(500).json(err);
        if (results.length === 0) return res.status(404).json({ error: "Libro no encontrado" });

        const libro = results[0];
        if (libro.estado !== 'Disponible') {
            return res.status(400).json({ error: `El libro "${libro.titulo}" ya está asignado como Prestado.` });
        }

        db.query("UPDATE libros SET estado = 'Prestado' WHERE codigo = ?", [codigo], (updateErr) => {
            if (updateErr) return res.status(500).json(updateErr);

            const esMaestro = matricula.trim().length < 5; 
            const etiquetaRol = esMaestro ? "Departamento" : "Carrera";
            const detallesLog = `Prestado a: ${alumno} | Identificador: ${matricula} | ${etiquetaRol}: ${carrera} | Cód. Libro: ${codigo}`;
            
            db.query("INSERT INTO log_libros (usuario, accion, detalles, fecha) VALUES (?, 'Préstamo', ?, NOW())", [usuario_accion, detallesLog], (logErr) => {
                if (logErr) console.error(logErr);
                res.json({ success: true });
            });
        });
    });
});

// --- DEVOLUCIONES MANUALES ADMIN ---
app.post('/api/devolver-libro', (req, res) => {
    const { codigo, matricula, usuario_accion } = req.body;

    if (!matricula || !matricula.trim()) {
        return res.status(400).json({ error: "El identificador (matrícula/tarjeta) es requerido para validar." });
    }

    const queryVerificar = "SELECT detalles FROM log_libros WHERE detalles LIKE ? AND detalles LIKE ? AND accion = 'Préstamo' ORDER BY fecha DESC LIMIT 1";

    db.query(queryVerificar, [`%Cód. Libro: ${codigo}%`, `%Identificador: ${matricula.trim().toLowerCase()}%`], (err, results) => {
        if (err) return res.status(500).json(err);
        if (results.length === 0) {
            return res.status(400).json({ error: "Validación denegada: La matrícula o tarjeta no corresponde al deudor de este libro." });
        }

        const logOriginal = results[0].detalles;
        const deudorMatch = logOriginal.match(/Prestado\s+(?:de\s+forma\s+AUTÓNOMA\s+)?a:\s*([^|]+)/i);
        const nombreAlumno = deudorMatch ? deudorMatch[1].trim() : "Usuario Identificado";

        db.query("SELECT titulo FROM libros WHERE codigo = ?", [codigo], (errLibro, libroResults) => {
            if (errLibro) return res.status(500).json(errLibro);
            const tituloLibro = libroResults.length > 0 ? libroResults[0].titulo : "Libro Desconocido";

            db.query("UPDATE libros SET estado = 'Disponible' WHERE codigo = ?", [codigo], (updateErr) => {
                if (updateErr) return res.status(500).json(updateErr);

                const detallesLog = `Devolución de: ${nombreAlumno} | Identificador: ${matricula.trim().toLowerCase()} | Cód. Libro: ${codigo} | Título: "${tituloLibro}"`;
                db.query("INSERT INTO log_libros (usuario, accion, detalles, fecha) VALUES (?, 'Devolución', ?, NOW())", [usuario_accion, detallesLog], (logErr) => {
                    if (logErr) console.error(logErr);
                    res.json({ success: true, message: "Libro devuelto con éxito" });
                });
            });
        });
    });
});

// --- PRÉSTAMO AUTÓNOMO ALUMNOS / DOCENTES ---
app.post('/api/prestamo-autonomo', (req, res) => {
    const { codigo, matricula, mesa } = req.body;

    if (!matricula || !matricula.trim() || !codigo || !codigo.trim()) {
        return res.status(400).json({ error: "Todos los campos son obligatorios." });
    }

    const matriculaLimpia = matricula.trim().toLowerCase();
    const queryAlumnos = "SELECT CONCAT(nombre_alumno, ' ', apellido_paterno, ' ', apellido_materno) AS nombre, carrera FROM alumnos WHERE LOWER(no_de_control) = ?";
    
    db.query(queryAlumnos, [matriculaLimpia], (err, alumnoResults) => {
        if (err) return res.status(500).json({ error: "Error al validar alumno" });

        let nombreUsuario = "";
        let tipoUsuario = "";
        let etiquetaRol = "Carrera";

        if (alumnoResults.length > 0) {
            nombreUsuario = alumnoResults[0].nombre;
            tipoUsuario = alumnoResults[0].carrera;
            ejecutarSalida(nombreUsuario, tipoUsuario, etiquetaRol);
        } else {
            const queryMaestros = "SELECT * FROM maestros WHERE LOWER(no_tarjeta) = ?";
            db.query(queryMaestros, [matriculaLimpia], (errM, maestroResults) => {
                if (errM || maestroResults.length === 0) {
                    return res.status(404).json({ error: "Usuario (Matrícula/Tarjeta) no registrado en el sistema escolar." });
                }
                const maestro = maestroResults[0];
                const llaves = Object.keys(maestro);
                
                for (let llave of llaves) {
                    const llaveMin = llave.toLowerCase();
                    if (llaveMin.includes('nom') || llaveMin.includes('maestro') || llaveMin.includes('docente')) {
                        nombreUsuario = maestro[llave];
                        break;
                    }
                }
                if (!nombreUsuario) {
                    nombreUsuario = maestro.nombre_maestro || maestro.nombre_docente || "Docente Identificado";
                }
                
                let deptoLocalizado = "Docente LSI";
                if (maestro.departamento || maestro.adscripcion || maestro.carrera || maestro.materia) {
                    deptoLocalizado = maestro.departamento || maestro.adscripcion || maestro.carrera || maestro.materia;
                } else {
                    for (let llave of llaves) {
                        const llaveMin = llave.toLowerCase();
                        if (llaveMin.includes('dep') || llaveMin.includes('ads') || llaveMin.includes('area')) {
                            deptoLocalizado = maestro[llave];
                            break;
                        }
                    }
                }
                
                tipoUsuario = deptoLocalizado;
                etiquetaRol = "Departamento";
                ejecutarSalida(nombreUsuario, tipoUsuario, etiquetaRol);
            });
        }
    });

    function ejecutarSalida(nombre, tipo, etiqueta) {
        db.query("SELECT estado, titulo FROM libros WHERE codigo = ?", [codigo.trim()], (err, libroResults) => {
            if (err) return res.status(500).json({ error: "Error al validar libro" });
            if (libroResults.length === 0) return res.status(404).json({ error: "El libro no existe en el inventario." });

            const libro = libroResults[0];
            if (libro.estado !== 'Disponible') {
                return res.status(400).json({ error: `El libro "${libro.titulo}" ya está Prestado.` });
            }

            db.query("UPDATE libros SET estado = 'Prestado' WHERE codigo = ?", [codigo.trim()], (updateErr) => {
                if (updateErr) return res.status(500).json({ error: "Error al actualizar inventario" });

                const detallesLog = `Prestado de forma AUTÓNOMA a: ${nombre} | Identificador: ${matriculaLimpia} | ${etiqueta}: ${tipo} | Cód. Libro: ${codigo.trim()} | Tomado de: ${mesa}`;
                db.query("INSERT INTO log_libros (usuario, accion, detalles, fecha) VALUES ('Autoservicio Alumno', 'Préstamo', ?, NOW())", [detallesLog], (logErr) => {
                    if (logErr) console.error(logErr);
                    res.json({ success: true, message: `¡Préstamo exitoso! Te has llevado "${libro.titulo}".` });
                });
            });
        });
    }
});

// --- DEVOLUCIÓN AUTÓNOMA CON UBICACIÓN DE ESTANTE ---
app.post('/api/devolucion-autonoma', (req, res) => {
    const { codigo } = req.body;
    if (!codigo || !codigo.trim()) return res.status(400).json({ error: "Código de libro requerido." });

    db.query("SELECT titulo, estado, ubicacion FROM libros WHERE codigo = ?", [codigo.trim()], (err, libroResults) => {
        if (err) return res.status(500).json({ error: "Error al consultar el libro" });
        if (libroResults.length === 0) return res.status(404).json({ error: "Libro no registrado en el sistema." });

        const libro = libroResults[0];
        if (libro.estado !== 'Prestado') {
            return res.status(400).json({ error: `El libro "${libro.titulo}" ya figura como Disponible en el estante.` });
        }

        const queryLogActivo = "SELECT detalles FROM log_libros WHERE detalles LIKE ? AND accion = 'Préstamo' ORDER BY fecha DESC LIMIT 1";
        db.query(queryLogActivo, [`%Cód. Libro: ${codigo.trim()}%`], (errLog, logResults) => {
            let nombreDeudor = "Usuario Identificado";
            if (!errLog && logResults.length > 0) {
                const deudorMatch = logResults[0].detalles.match(/Prestado\s+(?:de\s+forma\s+AUTÓNOMA\s+)?a:\s*([^|]+)/i);
                if (deudorMatch) nombreDeudor = deudorMatch[1].trim();
            }

            db.query("UPDATE libros SET estado = 'Disponible' WHERE codigo = ?", [codigo.trim()], (updateErr) => {
                if (updateErr) return res.status(500).json({ error: "Error al actualizar inventario" });

                const detallesLog = `Devolución AUTÓNOMA de: ${nombreDeudor} | Cód. Libro: ${codigo.trim()} | Título: "${libro.titulo}" | Reingresado a: ${libro.ubicacion || 'Mueble Temas Diversos'}`;
                db.query("INSERT INTO log_libros (usuario, accion, detalles, fecha) VALUES ('Autoservicio Alumno', 'Devolución', ?, NOW())", [detallesLog], (logErr) => {
                    if (logErr) console.error(logErr);
                    res.json({ 
                        success: true, 
                        titulo: libro.titulo,
                        ubicacion: libro.ubicacion || "Mueble Temas Diversos"
                    });
                });
            });
        });
    });
});

// --- CARGA MASIVA DESDE ARCHIVOS EXCEL (.XLSX / .XLS) ---
app.post('/api/cargar-excel', upload.single('archivo'), (req, res) => {
    const { tabla, usuario_accion } = req.body;

    if (!req.file) {
        return res.status(400).json({ error: "No se seleccionó ningún archivo de Excel." });
    }

    const tablasPermitidas = ['alumnos', 'maestros', 'libros'];
    if (!tablasPermitidas.includes(tabla)) {
        return res.status(400).json({ error: "Tabla de destino no válida." });
    }

    try {
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const primeraHoja = workbook.SheetNames[0];
        const filas = xlsx.utils.sheet_to_json(workbook.Sheets[primeraHoja], { defval: "" });

        if (filas.length === 0) {
            return res.status(400).json({ error: "El archivo de Excel no contiene registros o está vacío." });
        }

        let queryInsert = "";
        let valores = [];

        const obtenerValor = (fila, nombresPosibles) => {
            const llaves = Object.keys(fila);
            for (let llave of llaves) {
                const llaveNormalizada = llave.trim().toLowerCase();
                for (let pos of nombresPosibles) {
                    if (llaveNormalizada === pos.toLowerCase()) {
                        return String(fila[llave]).trim();
                    }
                }
            }
            return "";
        };

        if (tabla === 'alumnos') {
            queryInsert = "INSERT INTO alumnos (no_de_control, apellido_paterno, apellido_materno, nombre_alumno, carrera, correo_electronico) VALUES ?";
            
            filas.forEach(f => {
                const control = obtenerValor(f, ['no_de_control', 'control', 'matricula']);
                const paterno = obtenerValor(f, ['apellido_paterno', 'paterno']);
                const materno = obtenerValor(f, ['apellido_materno', 'materno']);
                const nombre = obtenerValor(f, ['nombre_alumno', 'nombre', 'nombres']);
                const carrera = obtenerValor(f, ['carrera', 'plan']) || "INGENIERIA MECANICA";
                const correo = obtenerValor(f, ['correo_electronico', 'correo', 'email']);

                if (control) {
                    valores.push([control, paterno, materno, nombre, carrera, correo]);
                }
            });
        } else if (tabla === 'maestros') {
            queryInsert = "INSERT INTO maestros (no_tarjeta, nombre_maestro, departamento) VALUES ?";
            filas.forEach(f => {
                const tarjeta = obtenerValor(f, ['no_tarjeta', 'tarjeta', 'id']);
                const nombre = obtenerValor(f, ['nombre_maestro', 'nombre', 'docente']);
                const depto = obtenerValor(f, ['departamento', 'adscripcion', 'area']) || "Docente LSI";

                if (tarjeta && nombre) {
                    valores.push([tarjeta, nombre, depto]);
                }
            });
        } else if (tabla === 'libros') {
            queryInsert = "INSERT INTO libros (codigo, titulo, autor, editorial, ubicacion, estado) VALUES ?";
            filas.forEach(f => {
                const codigo = obtenerValor(f, ['codigo', 'qr', 'isbn']);
                const titulo = obtenerValor(f, ['titulo', 'nombre_libro', 'libro']);
                const autor = obtenerValor(f, ['autor', 'autores']) || "Desconocido";
                const editorial = obtenerValor(f, ['editorial']) || "General";
                const ubicacion = obtenerValor(f, ['ubicacion', 'mueble']) || "Mueble Temas Diversos";
                const estado = obtenerValor(f, ['estado', 'status']) || "Disponible";

                if (codigo && titulo) {
                    valores.push([codigo, titulo, autor, editorial, ubicacion, estado]);
                }
            });
        }

        if (valores.length === 0) {
            return res.status(400).json({ error: "No se pudieron extraer datos válidos del archivo. Revisa los nombres de las columnas." });
        }

        db.query(`TRUNCATE TABLE ${tabla}`, (errTruncate) => {
            if (errTruncate) {
                console.error("Error al vaciar la tabla:", errTruncate);
                return res.status(500).json({ error: "Error al limpiar los registros anteriores." });
            }

            db.query(queryInsert, [valores], (errInsert, resultInsert) => {
                if (errInsert) {
                    console.error("Error en inserción masiva:", errInsert);
                    return res.status(500).json({ error: "Error al insertar en MySQL: " + errInsert.message });
                }

                const total = resultInsert.affectedRows;
                const detallesLog = `Carga masiva Excel en [${tabla}]: ${total} registros cargados`;
                db.query("INSERT INTO log_libros (usuario, accion, detalles, fecha) VALUES (?, 'Carga Masiva', ?, NOW())", [usuario_accion || 'Admin', detallesLog]);

                return res.json({
                    success: true,
                    mensaje: `✅ ¡Tabla "${tabla}" actualizada con éxito! Se importaron ${total} registros correctamente.`
                });
            });
        });

    } catch (error) {
        console.error("Error general en carga de Excel:", error);
        res.status(500).json({ error: "Error interno al procesar el archivo Excel." });
    }
});

const PORT = 3001;
app.listen(PORT, '127.0.0.1', () => {
    console.log("🚀 Backend operando internamente de forma segura en el puerto 3001");
});

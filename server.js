const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors({
  origin: '*', // Permite que cualquier origen consulte (ideal para pruebas en red local)
  methods: ['GET', 'POST']
}));
app.use(bodyParser.json());

const db = mysql.createConnection({
  host: 'localhost',
  user: 'sis_biblioteca',
  password: 'biblioteca123',
  database: 'biblioteca'
});

db.connect(err => {
  if (err) console.error('Error conectando a MySQL:', err);
  else console.log('Conectado a la base de datos MySQL');
});

// Ruta para registrar libros (con validación de duplicados)
app.post('/api/registrar-libro', (req, res) => {
  const { codigo, titulo, autor, editorial, estado } = req.body;
  const sqlCheck = "SELECT * FROM libros WHERE codigo = ?";
  
  db.query(sqlCheck, [codigo], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length > 0) {
      return res.status(400).json({ message: 'Este libro ya está registrado' });
    }

    const sqlInsert = "INSERT INTO libros (codigo, titulo, autor, editorial, estado) VALUES (?, ?, ?, ?, ?)";
    db.query(sqlInsert, [codigo, titulo || 'S/N', autor || 'S/N', editorial || 'S/N', estado || 'Disponible'], (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Libro guardado con éxito' });
    });
  });
});

// Ruta para obtener la lista de libros
app.get('/api/libros', (req, res) => {
  const sql = "SELECT * FROM libros ORDER BY id DESC";
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.listen(3001, () => console.log('Servidor corriendo en puerto 3001'));

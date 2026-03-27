import React, { useState, useEffect } from 'react';
<<<<<<< HEAD
import { Html5QrcodeScanner } from 'html5-qrcode';

function ScannerLibros() {
  const [datos, setDatos] = useState({
    codigo: '', 
    titulo: '', 
    autor: '', 
    editorial: '', 
    estado: 'Disponible' // Se asume disponible por defecto
  });
  const [mostrarForm, setMostrarForm] = useState(false);

  useEffect(() => {
    // Solo inicializa el escáner si no se está mostrando el formulario
    if (!mostrarForm) {
      const scanner = new Html5QrcodeScanner("reader", {
        fps: 10,
        qrbox: { width: 250, height: 150 }, // Caja para códigos de barras
      });

      scanner.render((codigoDetectado) => {
        setDatos((prev) => ({ ...prev, codigo: codigoDetectado }));
        setMostrarForm(true);
        scanner.clear(); // Apaga la cámara al detectar el código
      }, (error) => {
        // Error silencioso mientras busca códigos
      });

      return () => scanner.clear(); // Limpia al desmontar
    }
  }, [mostrarForm]);

  const guardar = () => {
    fetch('/api/registrar-libro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos)
    })
    .then(res => res.json())
    .then(res => {
      alert("¡Libro registrado exitosamente!");
      setMostrarForm(false);
      setDatos({ codigo: '', titulo: '', autor: '', editorial: '', estado: 'Disponible' });
    })
    .catch(err => alert("Error al conectar con el servidor"));
  };

  return (
    <div style={{ textAlign: 'center', fontFamily: 'Arial, sans-serif', padding: '20px' }}>
      <h1>Escáner de Biblioteca</h1>

      {!mostrarForm ? (
        <div style={{ maxWidth: '500px', margin: '0 auto' }}>
          <p>Coloque el código de barras frente a la cámara</p>
          <div id="reader"></div>
        </div>
      ) : (
        <div style={{ 
          padding: '30px', 
          border: '1px solid #ddd', 
          borderRadius: '8px',
          display: 'inline-block',
          backgroundColor: '#fff',
          boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ marginTop: 0 }}>Registro de Libro</h2>
          <p style={{ fontSize: '1.2em' }}><strong>Código:</strong> {datos.codigo}</p>
          
          <input 
            type="text" 
            placeholder="Título del libro" 
            style={estiloInput} 
            onChange={e => setDatos({...datos, titulo: e.target.value})} 
          />
          <input 
            type="text" 
            placeholder="Autor" 
            style={estiloInput} 
            onChange={e => setDatos({...datos, autor: e.target.value})} 
          />
          <input 
            type="text" 
            placeholder="Editorial" 
            style={estiloInput} 
            onChange={e => setDatos({...datos, editorial: e.target.value})} 
          />
          
          <div style={{ marginTop: '20px' }}>
            <button onClick={guardar} style={estiloBotonGuardar}>
              Confirmar Registro
            </button>
            <button 
              onClick={() => setMostrarForm(false)} 
              style={{ ...estiloBotonGuardar, backgroundColor: '#f44336', marginTop: '10px' }}
            >
              Cancelar / Volver a escanear
            </button>
          </div>
=======
import { Html5QrcodeScanner } from "html5-qrcode";

function App() {
  const [scannedCode, setScannedCode] = useState("");
  const [mostrarForm, setMostrarForm] = useState(false);
  const [verLista, setVerLista] = useState(false);
  const [libros, setLibros] = useState([]);
  const [datosLibro, setDatosLibro] = useState({ 
    titulo: '', 
    autor: '', 
    editorial: ''
  });

  const cargarLibros = () => {
    fetch('/api/libros')
      .then(res => res.json())
      .then(data => setLibros(data))
      .catch(err => console.error("Error cargando libros:", err));
  };

  useEffect(() => {
    if (verLista) cargarLibros();
  }, [verLista]);

  useEffect(() => {
    if (!mostrarForm && !verLista) {
      const scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: { width: 250, height: 150 } });
      scanner.render((text) => { 
        setScannedCode(text); 
        setMostrarForm(true); 
        scanner.clear(); 
      }, () => {});
      return () => { scanner.clear().catch(() => {}); };
    }
  }, [mostrarForm, verLista]);

  const guardarLibro = () => {
    fetch('/api/registrar-libro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Enviamos Título, Autor, Editorial + el estado fijo "Disponible"
      body: JSON.stringify({ 
        codigo: scannedCode, 
        ...datosLibro, 
        estado: 'Disponible' 
      })
    })
    .then(async res => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      alert("✅ Libro registrado como DISPONIBLE");
      setMostrarForm(false); 
      setScannedCode("");
      setDatosLibro({ titulo: '', autor: '', editorial: '' });
    })
    .catch(err => alert("⚠️ Error: " + err.message));
  };

  return (
    <div style={{ textAlign: 'center', fontFamily: 'Segoe UI, sans-serif', padding: '20px' }}>
      <h1 style={{ color: '#2c3e50' }}>📚 Sistema Biblioteca ITH</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <button onClick={() => setVerLista(false)} style={navBtn(!verLista)}>📸 Escanear</button>
        <button onClick={() => setVerLista(true)} style={navBtn(verLista)}>📋 Ver Inventario</button>
      </div>

      {!verLista ? (
        !mostrarForm ? (
          <div style={{ maxWidth: '400px', margin: 'auto' }}>
            <div id="reader"></div>
            <p style={{color: '#7f8c8d'}}>Escanea el código de barras</p>
          </div>
        ) : (
          <div style={cardStyle}>
            <h3 style={{color: '#27ae60'}}>Código Detectado: {scannedCode}</h3>
            <div style={{textAlign: 'left', maxWidth: '300px', margin: 'auto'}}>
                <label style={labelStyle}>Título:</label>
                <input style={inputStyle} placeholder="Nombre del libro" onChange={e => setDatosLibro({...datosLibro, titulo: e.target.value})} />
                
                <label style={labelStyle}>Autor:</label>
                <input style={inputStyle} placeholder="Nombre del autor" onChange={e => setDatosLibro({...datosLibro, autor: e.target.value})} />
                
                <label style={labelStyle}>Editorial:</label>
                <input style={inputStyle} placeholder="Ej. Pearson, Alfaomega..." onChange={e => setDatosLibro({...datosLibro, editorial: e.target.value})} />
            </div>
            <button onClick={guardarLibro} style={btnOk}>Registrar Libro</button>
            <button onClick={() => setMostrarForm(false)} style={btnCancel}>Cancelar</button>
          </div>
        )
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr style={{ backgroundColor: '#27ae60', color: 'white' }}>
                <th>Código</th><th>Título</th><th>Autor</th><th>Editorial</th><th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {libros.map(l => (
                <tr key={l.id} style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{padding: '10px'}}>{l.codigo}</td>
                  <td>{l.titulo}</td>
                  <td>{l.autor}</td>
                  <td>{l.editorial}</td>
                  <td style={{fontWeight: 'bold', color: '#27ae60'}}>{l.estado}</td>
                </tr>
              ))}
            </tbody>
          </table>
>>>>>>> 497b563 (Registro de libros con escáner, backend server.js y conexión MySQL)
        </div>
      )}
    </div>
  );
}

<<<<<<< HEAD
// Estilos rápidos
const estiloInput = {
  display: 'block',
  width: '100%',
  padding: '12px',
  margin: '10px 0',
  borderRadius: '4px',
  border: '1px solid #ccc',
  boxSizing: 'border-box',
  fontSize: '16px'
};

const estiloBotonGuardar = {
  backgroundColor: '#4CAF50',
  color: 'white',
  padding: '14px 20px',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  width: '100%',
  fontSize: '16px',
  fontWeight: 'bold'
};

export default ScannerLibros;
=======
// Estilos
const navBtn = (sel) => ({ padding: '10px 20px', cursor: 'pointer', border: 'none', backgroundColor: sel ? '#27ae60' : '#bdc3c7', color: 'white', borderRadius: '5px', margin: '0 5px', fontWeight: 'bold' });
const cardStyle = { padding: '25px', border: '1px solid #ddd', borderRadius: '15px', display: 'inline-block', backgroundColor: '#f9f9f9', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' };
const labelStyle = { display: 'block', marginTop: '10px', fontWeight: 'bold', fontSize: '14px' };
const inputStyle = { display: 'block', width: '100%', padding: '10px', marginTop: '5px', boxSizing: 'border-box', borderRadius: '5px', border: '1px solid #ccc' };
const btnOk = { backgroundColor: '#27ae60', color: 'white', border: 'none', padding: '12px', borderRadius: '5px', width: '100%', cursor: 'pointer', marginTop: '20px', fontWeight: 'bold' };
const btnCancel = { backgroundColor: '#e74c3c', color: 'white', border: 'none', padding: '8px', borderRadius: '5px', width: '100%', marginTop: '10px', cursor: 'pointer' };
const tableStyle = { width: '100%', maxWidth: '900px', margin: '20px auto', borderCollapse: 'collapse', backgroundColor: 'white' };

export default App;
>>>>>>> 497b563 (Registro de libros con escáner, backend server.js y conexión MySQL)

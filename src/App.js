import React, { useState, useEffect } from 'react';
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
        </div>
      )}
    </div>
  );
}

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
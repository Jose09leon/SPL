import React, { useState } from 'react';

function ScannerLibros() {
  const [datos, setDatos] = useState({
    codigo: '', titulo: '', autor: '', editorial: '', estado: 'Disponible'
  });
  const [mostrarForm, setMostrarForm] = useState(false);

  // Esta función se activa cuando el escáner detecta algo
  const alEscanear = (codigoDetectado) => {
    setDatos({ ...datos, codigo: codigoDetectado });
    setMostrarForm(true); // Aparece el formulario
  };

  const guardar = () => {
    fetch('/api/registrar-libro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos)
    })
    .then(res => res.json())
    .then(res => {
      alert(res.message);
      setMostrarForm(false); // Ocultar tras guardar
      setDatos({ codigo: '', titulo: '', autor: '', editorial: '', estado: 'Disponible' });
    });
  };

  return (
    <div>
      {/* Aquí va tu componente de Cámara/Escáner actual */}
      
      {mostrarForm && (
        <div style={{ padding: '20px', border: '1px solid #ccc', marginTop: '10px' }}>
          <h3>Registro de Libro</h3>
          <p><strong>Código:</strong> {datos.codigo}</p>
          
          <input type="text" placeholder="Título" onChange={e => setDatos({...datos, titulo: e.target.value})} />
          <input type="text" placeholder="Autor" onChange={e => setDatos({...datos, autor: e.target.value})} />
          <input type="text" placeholder="Editorial" onChange={e => setDatos({...datos, editorial: e.target.value})} />
          
          <select onChange={e => setDatos({...datos, estado: e.target.value})}>
            <option value="Disponible">Disponible</option>
            <option value="Prestado">Prestado</option>
            <option value="Dañado">Dañado</option>
          </select>
          
          <button onClick={guardar}>Guardar en MySQL</button>
        </div>
      )}
    </div>
  );
}
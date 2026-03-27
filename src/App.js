import React, { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from "html5-qrcode";

function App() {
  const [scannedCode, setScannedCode] = useState("");
  const [mostrarForm, setMostrarForm] = useState(false);
  const [verLista, setVerLista] = useState(false);
  const [libros, setLibros] = useState([]);
  const [datosLibro, setDatosLibro] = useState({ titulo: '', autor: '', editorial: '' });

  const cargarLibros = () => {
    fetch('/api/libros').then(res => res.json()).then(data => setLibros(data));
  };

  useEffect(() => { if (verLista) cargarLibros(); }, [verLista]);

  useEffect(() => {
    if (!mostrarForm && !verLista) {
      const scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: { width: 250, height: 150 } });
      scanner.render((text) => { setScannedCode(text); setMostrarForm(true); scanner.clear(); }, () => {});
      return () => { scanner.clear().catch(() => {}); };
    }
  }, [mostrarForm, verLista]);

  const guardarLibro = () => {
    fetch('/api/registrar-libro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigo: scannedCode, ...datosLibro, estado: 'Disponible' })
    }).then(() => {
      alert("✅ Libro registrado con éxito");
      setMostrarForm(false);
      setDatosLibro({ titulo: '', autor: '', editorial: '' });
    });
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>📚 Biblioteca Laboratorio Sistemas <span style={styles.subtitle}>ITH</span></h1>
        <div style={styles.nav}>
          <button onClick={() => setVerLista(false)} style={!verLista ? styles.btnNavActive : styles.btnNav}>📸 Escáner</button>
          <button onClick={() => setVerLista(true)} style={verLista ? styles.btnNavActive : styles.btnNav}>📋 Ver Lista</button>
        </div>
      </header>

      <main style={styles.main}>
        {!verLista ? (
          !mostrarForm ? (
            <div style={styles.card}>
              <p style={styles.instructions}>Coloque el código de barras frente a la cámara</p>
              <div id="reader" style={styles.reader}></div>
            </div>
          ) : (
            <div style={styles.cardForm}>
              <h2 style={styles.cardTitle}>Nuevo Registro</h2>
              <p style={styles.codeText}>Código: <strong>{scannedCode}</strong></p>
              <div style={styles.formGroup}>
                <label style={styles.label}>Título</label>
                <input style={styles.input} placeholder="Nombre del libro" onChange={e => setDatosLibro({...datosLibro, titulo: e.target.value})} />
                
                <label style={styles.label}>Autor</label>
                <input style={styles.input} placeholder="Nombre del autor" onChange={e => setDatosLibro({...datosLibro, autor: e.target.value})} />
                
                <label style={styles.label}>Editorial</label>
                <input style={styles.input} placeholder="Editorial" onChange={e => setDatosLibro({...datosLibro, editorial: e.target.value})} />
              </div>
              <button onClick={guardarLibro} style={styles.btnSave}>Guardar Libro</button>
              <button onClick={() => setMostrarForm(false)} style={styles.btnCancel}>Cancelar</button>
            </div>
          )
        ) : (
          <div style={styles.cardTable}>
            <h2 style={styles.cardTitle}>Inventario Actual</h2>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHead}>
                  <th>Código</th><th>Título</th><th>Autor</th><th>Editorial</th><th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {libros.map((l, i) => (
                  <tr key={l.id} style={i % 2 === 0 ? styles.trEven : styles.trOdd}>
                    <td style={styles.td}>{l.codigo}</td>
                    <td style={styles.td}>{l.titulo}</td>
                    <td style={styles.td}>{l.autor}</td>
                    <td style={styles.td}>{l.editorial}</td>
                    <td style={styles.td}><span style={styles.statusBadge}>{l.estado}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

const styles = {
  container: { minHeight: '100vh', backgroundColor: '#f0f2f5', color: '#1a2b4c', fontFamily: '"Segoe UI", Tahoma, sans-serif' },
  header: { backgroundColor: '#003366', padding: '25px 20px', color: 'white', textAlign: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' },
  title: { margin: 0, fontSize: '26px' },
  subtitle: { color: '#ffffff', fontWeight: '300', opacity: '0.8' },
  nav: { marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '15px' },
  btnNav: { padding: '10px 25px', border: '1px solid white', borderRadius: '4px', cursor: 'pointer', backgroundColor: 'transparent', color: 'white', fontWeight: 'bold' },
  btnNavActive: { padding: '10px 25px', border: '1px solid white', borderRadius: '4px', cursor: 'pointer', backgroundColor: 'white', color: '#003366', fontWeight: 'bold' },
  main: { padding: '30px 15px', maxWidth: '1100px', margin: 'auto' },
  card: { backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', textAlign: 'center' },
  cardForm: { backgroundColor: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', maxWidth: '450px', margin: 'auto' },
  cardTable: { backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', overflowX: 'auto' },
  instructions: { color: '#555', marginBottom: '15px' },
  reader: { borderRadius: '5px', overflow: 'hidden', border: '1px solid #ccc' },
  cardTitle: { margin: '0 0 20px 0', color: '#003366', borderBottom: '2px solid #003366', display: 'inline-block', paddingBottom: '5px' },
  codeText: { backgroundColor: '#f8f9fa', padding: '10px', borderRadius: '4px', borderLeft: '4px solid #003366', marginBottom: '20px' },
  formGroup: { textAlign: 'left' },
  label: { display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px', color: '#333' },
  input: { width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' },
  btnSave: { width: '100%', padding: '12px', border: 'none', borderRadius: '4px', backgroundColor: '#003366', color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' },
  btnCancel: { width: '100%', marginTop: '10px', padding: '8px', border: 'none', background: 'none', color: '#666', cursor: 'pointer', textDecoration: 'underline' },
  table: { width: '100%', borderCollapse: 'collapse' },
  tableHead: { backgroundColor: '#003366', color: 'white', textAlign: 'left' },
  td: { padding: '12px', borderBottom: '1px solid #eee' },
  trOdd: { backgroundColor: '#fff' },
  trEven: { backgroundColor: '#f9f9f9' },
  statusBadge: { backgroundColor: '#e7f3ff', color: '#0056b3', padding: '4px 12px', borderRadius: '15px', fontSize: '12px', fontWeight: 'bold', border: '1px solid #cce5ff' }
};

export default App;

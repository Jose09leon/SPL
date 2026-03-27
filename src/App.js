import React, { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from "html5-qrcode";
import logoVenado from './assets/LogoLSI.png';

function App() {
  const [scannedCode, setScannedCode] = useState("");
  const [mostrarForm, setMostrarForm] = useState(false);
  const [verLista, setVerLista] = useState(false);
  const [libros, setLibros] = useState([]);
  const [datosLibro, setDatosLibro] = useState({ titulo: '', autor: '', editorial: '' });

  const cargarLibros = () => {
    fetch('/api/libros')
      .then(res => res.json())
      .then(data => setLibros(data))
      .catch(err => console.error("Error al cargar:", err));
  };

  useEffect(() => { 
    if (verLista) {
      cargarLibros(); 
    }
  }, [verLista]);

  useEffect(() => {
    // CAMBIO CLAVE: Solo iniciamos el scanner si el div 'reader' existe y no estamos viendo la lista
    if (!verLista && !mostrarForm) {
      const scanner = new Html5QrcodeScanner("reader", { 
        fps: 10, 
        qrbox: { width: 250, height: 150 } 
      });
      
      scanner.render((text) => { 
        setScannedCode(text); 
        setMostrarForm(true); 
        scanner.clear(); 
      }, (error) => {
        // Errores silenciosos de escaneo
      });

      return () => {
        scanner.clear().catch(err => console.error("Error al limpiar scanner", err));
      };
    }
  }, [verLista, mostrarForm]);

  const guardarLibro = () => {
    if (!datosLibro.titulo || !datosLibro.autor) {
      return alert("⚠️ Por favor rellena Título y Autor");
    }
    fetch('/api/registrar-libro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigo: scannedCode, ...datosLibro, estado: 'Disponible' })
    }).then(res => {
      if (res.ok) {
        alert("✅ Libro registrado con éxito");
        setMostrarForm(false);
        setScannedCode("");
        setDatosLibro({ titulo: '', autor: '', editorial: '' });
      } else {
        alert("❌ Error al registrar el libro");
      }
    });
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.topHeader}>
          <img src={logoVenado} alt="Logo LSI ITH" style={styles.logoImg} />
          <div style={styles.textContainer}>
            <h1 style={styles.mainTitle}>TECNOLÓGICO NACIONAL DE MÉXICO</h1>
            <h2 style={styles.subTitle}>INSTITUTO TECNOLÓGICO DE HERMOSILLO</h2>
            <h3 style={styles.appTitle}>Biblioteca Laboratorio Sistemas</h3>
          </div>
        </div>

        <div style={styles.nav}>
          <button 
            onClick={() => { setVerLista(false); setMostrarForm(false); }} 
            style={!verLista ? styles.btnNavActive : styles.btnNav}
          >
            📸 Escáner
          </button>
          <button 
            onClick={() => setVerLista(true)} 
            style={verLista ? styles.btnNavActive : styles.btnNav}
          >
            📋 Ver Lista
          </button>
        </div>
      </header>

      <main style={styles.main}>
        {!verLista ? (
          /* MODO ESCÁNER / REGISTRO */
          !mostrarForm ? (
            <div style={styles.card}>
              <p style={styles.instructions}>Coloque el código de barras frente a la cámara</p>
              {/* Solo renderizamos el div del scanner si estamos en esta sección */}
              <div id="reader" style={styles.reader}></div>
            </div>
          ) : (
            <div style={styles.cardForm}>
              <h2 style={styles.cardTitle}>Nuevo Registro</h2>
              <p style={styles.codeText}>Código: <strong>{scannedCode}</strong></p>
              <div style={styles.formGroup}>
                <label style={styles.label}>Título</label>
                <input style={styles.input} placeholder="Nombre del libro" value={datosLibro.titulo} onChange={e => setDatosLibro({...datosLibro, titulo: e.target.value})} />
                <label style={styles.label}>Autor</label>
                <input style={styles.input} placeholder="Nombre del autor" value={datosLibro.autor} onChange={e => setDatosLibro({...datosLibro, autor: e.target.value})} />
                <label style={styles.label}>Editorial</label>
                <input style={styles.input} placeholder="Editorial" value={datosLibro.editorial} onChange={e => setDatosLibro({...datosLibro, editorial: e.target.value})} />
              </div>
              <button onClick={guardarLibro} style={styles.btnSave}>Guardar Libro</button>
              <button onClick={() => setMostrarForm(false)} style={styles.btnCancel}>Cancelar</button>
            </div>
          )
        ) : (
          /* MODO INVENTARIO (TABLA) */
          <div style={styles.cardTable}>
            <h2 style={styles.cardTitle}>Inventario Actual</h2>
            <div style={{overflowX: 'auto'}}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHead}>
                    <th>Código</th><th>Título</th><th>Autor</th><th>Editorial</th><th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {libros.length > 0 ? libros.map((l, i) => (
                    <tr key={l.id || i} style={i % 2 === 0 ? styles.trEven : styles.trOdd}>
                      <td style={styles.td}>{l.codigo}</td>
                      <td style={styles.td}>{l.titulo}</td>
                      <td style={styles.td}>{l.autor}</td>
                      <td style={styles.td}>{l.editorial}</td>
                      <td style={styles.td}><span style={styles.statusBadge}>{l.estado}</span></td>
                    </tr>
                  )) : (
                    <tr><td colSpan="5" style={{padding: '20px'}}>Cargando libros...</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const styles = {
  container: { minHeight: '100vh', backgroundColor: '#f4f6f9', color: '#1a2b4c', fontFamily: '"Segoe UI", Tahoma, sans-serif' },
  header: { backgroundColor: '#003366', padding: '25px 20px', color: 'white', textAlign: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.3)', borderBottom: '4px solid #002244' },
  topHeader: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '25px', marginBottom: '20px', flexWrap: 'wrap' },
  logoImg: { height: '85px', width: 'auto' }, 
  textContainer: { textAlign: 'left', minWidth: '250px' },
  mainTitle: { margin: 0, fontSize: '15px', fontWeight: 'bold', color: '#ffffff', letterSpacing: '0.5px' },
  subTitle: { margin: '2px 0', fontSize: '13px', fontWeight: 'normal', color: '#e0e0e0', textTransform: 'uppercase' },
  appTitle: { margin: '5px 0 0 0', fontSize: '24px', fontWeight: 'bold', color: '#ffffff' },
  nav: { display: 'flex', justifyContent: 'center', gap: '15px' },
  btnNav: { padding: '10px 25px', border: '1px solid white', borderRadius: '4px', cursor: 'pointer', backgroundColor: 'transparent', color: 'white', fontWeight: 'bold', transition: '0.3s' },
  btnNavActive: { padding: '10px 25px', border: '1px solid white', borderRadius: '4px', cursor: 'pointer', backgroundColor: 'white', color: '#003366', fontWeight: 'bold' },
  main: { padding: '25px 15px', maxWidth: '1200px', margin: 'auto' },
  card: { backgroundColor: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', textAlign: 'center' },
  cardForm: { backgroundColor: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', maxWidth: '500px', margin: 'auto' },
  cardTable: { backgroundColor: 'white', padding: '25px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' },
  instructions: { color: '#666', marginBottom: '20px' },
  reader: { borderRadius: '5px', overflow: 'hidden', border: '1px solid #ccc', maxWidth: '500px', margin: 'auto' },
  cardTitle: { margin: '0 0 20px 0', color: '#003366', borderBottom: '2px solid #003366', display: 'inline-block', paddingBottom: '5px' },
  codeText: { backgroundColor: '#f8f9fa', padding: '10px', borderRadius: '4px', borderLeft: '4px solid #003366', marginBottom: '20px' },
  formGroup: { textAlign: 'left' },
  label: { display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px', color: '#333' },
  input: { width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' },
  btnSave: { width: '100%', padding: '14px', border: 'none', borderRadius: '4px', backgroundColor: '#003366', color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' },
  btnCancel: { width: '100%', marginTop: '10px', padding: '8px', border: 'none', background: 'none', color: '#666', cursor: 'pointer', textDecoration: 'underline' },
  table: { width: '100%', borderCollapse: 'collapse' },
  tableHead: { backgroundColor: '#003366', color: 'white', textAlign: 'left' },
  td: { padding: '15px', borderBottom: '1px solid #eee', fontSize: '14px' },
  trOdd: { backgroundColor: '#fff' },
  trEven: { backgroundColor: '#f9f9f9' },
  statusBadge: { backgroundColor: '#e7f3ff', color: '#0056b3', padding: '5px 12px', borderRadius: '15px', fontSize: '12px', fontWeight: 'bold', border: '1px solid #cce5ff' }
};

export default App;
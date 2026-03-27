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
    fetch('/api/libros').then(res => res.json()).then(data => setLibros(data));
  };

  useEffect(() => {
    if (verLista) cargarLibros();
  }, [verLista]);

  useEffect(() => {
    // Solo intentamos crear el scanner si el elemento 'reader' existe físicamente
    const element = document.getElementById('reader');
    
    if (!verLista && !mostrarForm && element) {
      const scanner = new Html5QrcodeScanner("reader", { 
        fps: 10, 
        qrbox: { width: 250, height: 150 },
        rememberLastUsedCamera: false
      });

      scanner.render((text) => {
        setScannedCode(text);
        setMostrarForm(true);
        scanner.clear();
      }, () => {});

      return () => {
        scanner.clear().catch(e => console.log("Limpieza normal"));
      };
    }
  }, [verLista, mostrarForm]);

  const guardarLibro = () => {
    fetch('/api/registrar-libro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigo: scannedCode, ...datosLibro, estado: 'Disponible' })
    }).then(() => {
      alert("✅ Libro registrado");
      setMostrarForm(false);
      setScannedCode("");
      setDatosLibro({ titulo: '', autor: '', editorial: '' });
    });
  };

  return (
    // La 'key' basada en verLista obliga a React a RECONSTRUIR todo el HTML al cambiar de pestaña
    <div style={styles.container} key={verLista ? "lista" : "scanner"}>
      <header style={styles.header}>
        <div style={styles.topHeader}>
          <img src={logoVenado} alt="Logo" style={styles.logoImg} />
          <div style={styles.textContainer}>
            <h1 style={styles.mainTitle}>TECNOLÓGICO NACIONAL DE MÉXICO</h1>
            <h2 style={styles.subTitle}>INSTITUTO TECNOLÓGICO DE HERMOSILLO</h2>
            <h3 style={styles.appTitle}>Biblioteca Laboratorio Sistemas</h3>
          </div>
        </div>
        <div style={styles.nav}>
          <button onClick={() => { setVerLista(false); setMostrarForm(false); }} style={!verLista ? styles.btnNavActive : styles.btnNav}>📸 Escáner</button>
          <button onClick={() => setVerLista(true)} style={verLista ? styles.btnNavActive : styles.btnNav}>📋 Ver Lista</button>
        </div>
      </header>

      <main style={styles.main}>
        {verLista ? (
          /* VISTA DE INVENTARIO: Aquí no hay rastro del div 'reader' */
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
                  {libros.map((l, i) => (
                    <tr key={i} style={i % 2 === 0 ? styles.trEven : styles.trOdd}>
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
          </div>
        ) : (
          /* VISTA DE ESCANEO / REGISTRO */
          !mostrarForm ? (
            <div style={styles.card}>
              <p style={{marginBottom: '15px'}}>Coloque el código de barras frente a la cámara</p>
              {/* Este DIV desaparece por completo cuando verLista es true */}
              <div id="reader" style={styles.reader}></div>
            </div>
          ) : (
            <div style={styles.cardForm}>
              <h2 style={styles.cardTitle}>Nuevo Registro</h2>
              <p style={styles.codeText}>Código: <strong>{scannedCode}</strong></p>
              <div style={styles.formGroup}>
                <input style={styles.input} placeholder="Título" onChange={e => setDatosLibro({...datosLibro, titulo: e.target.value})} />
                <input style={styles.input} placeholder="Autor" onChange={e => setDatosLibro({...datosLibro, autor: e.target.value})} />
                <input style={styles.input} placeholder="Editorial" onChange={e => setDatosLibro({...datosLibro, editorial: e.target.value})} />
              </div>
              <button onClick={guardarLibro} style={styles.btnSave}>Guardar Libro</button>
              <button onClick={() => setMostrarForm(false)} style={styles.btnCancel}>Cancelar</button>
            </div>
          )
        )}
      </main>
    </div>
  );
}

const styles = {
  container: { minHeight: '100vh', backgroundColor: '#f4f6f9', color: '#1a2b4c', fontFamily: '"Segoe UI", sans-serif' },
  header: { backgroundColor: '#003366', padding: '20px', textAlign: 'center', color: 'white' },
  topHeader: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', marginBottom: '15px' },
  logoImg: { height: '80px', width: 'auto' },
  textContainer: { textAlign: 'left' },
  mainTitle: { margin: 0, fontSize: '14px', color: '#fff' },
  subTitle: { margin: 0, fontSize: '12px', color: '#ccc' },
  appTitle: { margin: '5px 0 0 0', fontSize: '22px', fontWeight: 'bold' },
  nav: { display: 'flex', justifyContent: 'center', gap: '10px' },
  btnNav: { padding: '8px 20px', border: '1px solid white', backgroundColor: 'transparent', color: 'white', cursor: 'pointer', borderRadius: '4px' },
  btnNavActive: { padding: '8px 20px', border: '1px solid white', backgroundColor: 'white', color: '#003366', cursor: 'pointer', borderRadius: '4px', fontWeight: 'bold' },
  main: { padding: '20px', maxWidth: '1200px', margin: 'auto' },
  card: { backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', textAlign: 'center' },
  cardForm: { backgroundColor: 'white', padding: '30px', borderRadius: '8px', maxWidth: '450px', margin: 'auto' },
  cardTable: { backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' },
  reader: { maxWidth: '500px', margin: 'auto', overflow: 'hidden', border: '1px solid #ddd', borderRadius: '8px' },
  cardTitle: { borderBottom: '2px solid #003366', display: 'inline-block', marginBottom: '15px', color: '#003366' },
  codeText: { backgroundColor: '#eee', padding: '10px', borderRadius: '4px', marginBottom: '15px' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '10px' },
  input: { padding: '12px', borderRadius: '4px', border: '1px solid #ccc' },
  btnSave: { padding: '14px', backgroundColor: '#003366', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' },
  btnCancel: { background: 'none', border: 'none', color: '#666', cursor: 'pointer', marginTop: '10px', textDecoration: 'underline' },
  table: { width: '100%', borderCollapse: 'collapse' },
  tableHead: { backgroundColor: '#003366', color: 'white', textAlign: 'left' },
  td: { padding: '12px', borderBottom: '1px solid #eee' },
  trOdd: { backgroundColor: '#fff' },
  trEven: { backgroundColor: '#f9f9f9' },
  statusBadge: { backgroundColor: '#e7f3ff', color: '#0056b3', padding: '4px 10px', borderRadius: '15px', fontSize: '12px', fontWeight: 'bold' }
};

export default App;
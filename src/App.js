import React, { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from "html5-qrcode";
import logoVenado from './assets/LogoLSI.png';

function App() {
  const [user, setUser] = useState(null);
  const [vistaActual, setVistaActual] = useState("login"); // login, menu, registro, inventario
  
  const [libros, setLibros] = useState([]);
  const [scannedCode, setScannedCode] = useState("");
  const [mostrarForm, setMostrarForm] = useState(false);
  const [datosLibro, setDatosLibro] = useState({ titulo: '', autor: '', editorial: '', ubicacion: 'Mueble 1 - Nivel 1' });

  // Credenciales temporales
  const [credenciales, setCredenciales] = useState({ usuario: '', pass: '' });
  
  const manejarLogin = (e) => {
    e.preventDefault();
    if (credenciales.usuario === "admin" && credenciales.pass === "lsi123") {
      setUser("Administrador");
      setVistaActual("menu");
    } else {
      alert("Credenciales incorrectas");
    }
  };

  const cargarLibros = () => {
    fetch('/api/libros').then(res => res.json()).then(data => setLibros(data));
  };

  useEffect(() => {
    if (vistaActual === "inventario") cargarLibros();
  }, [vistaActual]);

  useEffect(() => {
    const element = document.getElementById('reader');
    if (vistaActual === "registro" && !mostrarForm && element) {
      const scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 });
      scanner.render((text) => {
        setScannedCode(text);
        setMostrarForm(true);
        scanner.clear();
      }, () => {});
      return () => { scanner.clear().catch(e => {}); };
    }
  }, [vistaActual, mostrarForm]);

  const guardarLibro = () => {
    fetch('/api/registrar-libro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigo: scannedCode, ...datosLibro, estado: 'Disponible' })
    }).then(() => {
      alert("✅ Libro registrado");
      setMostrarForm(false);
      setScannedCode("");
      setVistaActual("inventario"); // Al guardar, vamos a ver que aparezca en el inventario
    });
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.topHeader}>
          <img src={logoVenado} alt="Logo" style={styles.logoImg} />
          <div style={styles.textContainer}>
            <h1 style={styles.mainTitle}>TECNOLÓGICO NACIONAL DE MÉXICO</h1>
            <h2 style={styles.subTitle}>INSTITUTO TECNOLÓGICO DE HERMOSILLO</h2>
            <h3 style={styles.appTitle}>Biblioteca Laboratorio Sistemas</h3>
          </div>
        </div>
      </header>

      <main style={styles.main}>
        
        {/* VISTA 1: LOGIN */}
        {vistaActual === "login" && (
          <div style={styles.cardLogin}>
            <h2 style={styles.cardTitle}>Acceso al Sistema</h2>
            <form onSubmit={manejarLogin} style={styles.formGroup}>
              <input style={styles.input} placeholder="Usuario" onChange={e => setCredenciales({...credenciales, usuario: e.target.value})} />
              <input type="password" style={styles.input} placeholder="Contraseña" onChange={e => setCredenciales({...credenciales, pass: e.target.value})} />
              <button type="submit" style={styles.btnSave}>Entrar</button>
            </form>
          </div>
        )}

        {/* VISTA 2: MENÚ (DASHBOARD) */}
        {vistaActual === "menu" && (
          <div style={styles.menuGrid}>
            <div style={styles.menuItem} onClick={() => setVistaActual("registro")}>
              <span style={styles.icon}>📸</span>
              <h3>Registro</h3>
              <p>Escanear nuevos libros</p>
            </div>
            <div style={styles.menuItem} onClick={() => setVistaActual("inventario")}>
              <span style={styles.icon}>📊</span>
              <h3>Inventario</h3>
              <p>Ver lista completa</p>
            </div>
            <div style={styles.menuItemDisabled}>
              <span style={styles.icon}>🤝</span>
              <h3>Préstamos</h3>
              <p>Próximamente</p>
            </div>
            <div style={styles.menuItemDisabled}>
              <span style={styles.icon}>🔄</span>
              <h3>Devoluciones</h3>
              <p>Próximamente</p>
            </div>
            <button onClick={() => setVistaActual("login")} style={styles.btnLogOut}>Cerrar Sesión</button>
          </div>
        )}

        {/* VISTA 3: INVENTARIO (TU TABLA) */}
        {vistaActual === "inventario" && (
          <div style={styles.cardTable}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
              <h2 style={styles.cardTitle}>Inventario Actual</h2>
              <button onClick={() => setVistaActual("menu")} style={styles.btnBack}>Volver al Menú</button>
            </div>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHead}>
                  <th>Código</th><th>Título</th><th>Autor</th><th>Ubicación</th><th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {libros.map((l, i) => (
                  <tr key={i} style={i % 2 === 0 ? styles.trEven : styles.trOdd}>
                    <td style={styles.td}>{l.codigo}</td>
                    <td style={styles.td}>{l.titulo}</td>
                    <td style={styles.td}>{l.autor}</td>
                    <td style={styles.td}>{l.ubicacion}</td>
                    <td style={styles.td}><span style={styles.statusBadge}>{l.estado}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* VISTA 4: REGISTRO (ESCÁNER) */}
        {vistaActual === "registro" && (
          !mostrarForm ? (
            <div style={styles.card}>
              <button onClick={() => setVistaActual("menu")} style={styles.btnBack}>← Cancelar</button>
              <div id="reader" style={{marginTop:'20px'}}></div>
            </div>
          ) : (
            <div style={styles.cardForm}>
              <h2 style={styles.cardTitle}>Datos del Libro</h2>
              <div style={styles.formGroup}>
                <p style={styles.codeText}>Código: {scannedCode}</p>
                <input style={styles.input} placeholder="Título" onChange={e => setDatosLibro({...datosLibro, titulo: e.target.value})} />
                <input style={styles.input} placeholder="Autor" onChange={e => setDatosLibro({...datosLibro, autor: e.target.value})} />
                <select style={styles.input} onChange={e => setDatosLibro({...datosLibro, ubicacion: e.target.value})}>
                  <option>Mueble 1 - Nivel 1</option>
                  <option>Mueble 1 - Nivel 2</option>
                  <option>Mueble 2 - Nivel 1</option>
                  <option>Mueble 2 - Nivel 2</option>
                </select>
              </div>
              <button onClick={guardarLibro} style={styles.btnSave}>Guardar</button>
              <button onClick={() => setMostrarForm(false)} style={styles.btnCancel}>Reintentar Escaneo</button>
            </div>
          )
        )}
      </main>
    </div>
  );
}

const styles = {
  container: { minHeight: '100vh', backgroundColor: '#f4f6f9', fontFamily: '"Segoe UI", sans-serif' },
  header: { backgroundColor: '#003366', padding: '20px', color: 'white', textAlign: 'center' },
  topHeader: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px' },
  logoImg: { height: '80px' },
  textContainer: { textAlign: 'left' },
  mainTitle: { margin: 0, fontSize: '14px' },
  subTitle: { margin: 0, fontSize: '11px', color: '#ccc' },
  appTitle: { margin: '5px 0 0 0', fontSize: '22px', fontWeight: 'bold' },
  main: { padding: '30px 20px', maxWidth: '1100px', margin: 'auto' },
  cardLogin: { backgroundColor: 'white', padding: '40px', borderRadius: '15px', maxWidth: '400px', margin: 'auto', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', textAlign:'center' },
  menuGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '25px' },
  menuItem: { backgroundColor: 'white', padding: '40px', borderRadius: '15px', textAlign: 'center', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.05)', transition: '0.3s', borderBottom: '6px solid #003366' },
  menuItemDisabled: { backgroundColor: '#eee', padding: '40px', borderRadius: '15px', textAlign: 'center', color: '#888' },
  icon: { fontSize: '45px', display: 'block', marginBottom: '15px' },
  cardTable: { backgroundColor: 'white', padding: '30px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' },
  cardTitle: { borderBottom: '3px solid #003366', display: 'inline-block', paddingBottom: '5px', color: '#003366' },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: '10px' },
  tableHead: { backgroundColor: '#003366', color: 'white', textAlign: 'left' },
  td: { padding: '15px', borderBottom: '1px solid #eee' },
  trEven: { backgroundColor: '#f9f9f9' },
  trOdd: { backgroundColor: '#fff' },
  statusBadge: { backgroundColor: '#e7f3ff', color: '#0056b3', padding: '5px 12px', borderRadius: '20px', fontWeight: 'bold', fontSize: '12px' },
  btnBack: { backgroundColor: '#003366', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
  btnLogOut: { gridColumn: '1 / -1', background: 'none', border: 'none', color: '#666', textDecoration: 'underline', cursor: 'pointer', marginTop: '20px' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' },
  input: { padding: '12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '16px' },
  btnSave: { backgroundColor: '#003366', color: 'white', padding: '15px', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' },
  codeText: { background: '#f0f0f0', padding: '10px', borderRadius: '5px', fontWeight: 'bold' },
  btnCancel: { background: 'none', border: 'none', color: '#888', textDecoration: 'underline', cursor: 'pointer' },
  card: { backgroundColor: 'white', padding: '20px', borderRadius: '15px' },
  cardForm: { backgroundColor: 'white', padding: '30px', borderRadius: '15px', maxWidth: '500px', margin: 'auto' }
};

export default App;
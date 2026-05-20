import React, { useState, useEffect, useCallback } from 'react';
import { Html5QrcodeScanner } from "html5-qrcode";
import logoVenado from './assets/LogoLSI.png';

function App() {
  const [user, setUser] = useState(null);
  const [vistaActual, setVistaActual] = useState("login");
  
  const [libros, setLibros] = useState([]);
  const [usuarios, setUsuarios] = useState([]); 
  const [logsAcceso, setLogsAcceso] = useState([]);
  const [logsLibros, setLogsLibros] = useState([]);
  const [scannedCode, setScannedCode] = useState("");
  const [mostrarForm, setMostrarForm] = useState(false);
  
  const [datosLibro, setDatosLibro] = useState({ titulo: '', autor: '', editorial: '', ubicacion: 'Mueble 1 - Nivel 1' });
  const [nuevoUser, setNuevoUser] = useState({ nombre_completo: '', usuario: '', password: '' });
  const [credenciales, setCredenciales] = useState({ usuario: '', pass: '' });

  // --- MÓDULO DE PRÉSTAMOS (Se añade campo 'carrera' y 'tituloLibro') ---
  const [datosPrestamo, setDatosPrestamo] = useState({ alumno: '', matricula: '', carrera: '' });
  const [tituloLibroDetectado, setTituloLibroDetectado] = useState("");
  const [codigoManual, setCodigoManual] = useState("");

  // --- LÓGICA DE CIERRE DE SESIÓN ---
  const cerrarSesion = useCallback(() => {
    setUser(null);
    setVistaActual("login");
    setCredenciales({ usuario: '', pass: '' });
  }, []);

  // --- TEMPORIZADOR DE INACTIVIDAD (5 MINUTOS) ---
  useEffect(() => {
    let timeoutId;

    const reiniciarTemporizador = () => {
      if (timeoutId) clearTimeout(timeoutId);

      timeoutId = setTimeout(() => {
        const esAdmin = credenciales.usuario.toLowerCase() === 'admin' || credenciales.usuario.toLowerCase() === 'ad';
        if (user && !esAdmin) {
          alert("Tu sesión ha expirado por inactividad (5 minutos).");
          cerrarSesion();
        }
      }, 300000); 
    };

    if (user) {
      const eventos = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart'];
      eventos.forEach(evento => window.addEventListener(evento, reiniciarTemporizador));
      reiniciarTemporizador();

      return () => {
        if (timeoutId) clearTimeout(timeoutId);
        eventos.forEach(evento => window.removeEventListener(evento, reiniciarTemporizador));
      };
    }
  }, [user, credenciales.usuario, cerrarSesion]);

  // --- LÓGICA DE LOGIN ---
  const manejarLogin = async (e) => {
    e.preventDefault();

    if (credenciales.usuario === 'ad' && credenciales.pass === '12345') {
      setUser("Administrador Local");
      setVistaActual("menu");
      return; 
    }
    
    try {
      const respuesta = await fetch('https://10.19.11.249:3001/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario: credenciales.usuario, password: credenciales.pass })
      });
      const datos = await respuesta.json();
      if (respuesta.ok && datos.auth) {
        setUser(datos.user.nombre_completo);
        setVistaActual("menu");
      } else {
        alert("Usuario o contraseña incorrectos");
      }
    } catch (error) {
      alert("Error de conexión con el servidor.");
    }
  };

  // --- CARGA DE DATOS ---
  const cargarLogs = () => {
    fetch('https://10.19.11.249:3001/api/logs-acceso').then(res => res.json()).then(data => setLogsAcceso(data));
    fetch('https://10.19.11.249:3001/api/log-libros').then(res => res.json()).then(data => setLogsLibros(data));
  };

  const cargarUsuarios = () => {
    fetch('https://10.19.11.249:3001/api/usuarios').then(res => res.json()).then(data => setUsuarios(data));
  };

  const cargarLibros = () => {
    fetch('https://10.19.11.249:3001/api/libros').then(res => res.json()).then(data => setLibros(data));
  };

  useEffect(() => {
    if (vistaActual === "inventario") cargarLibros();
    if (vistaActual === "admin_usuarios") cargarUsuarios();
    if (vistaActual === "logs") cargarLogs();
  }, [vistaActual]);

  const manejarCambioNombre = (e) => {
    const nombreCompleto = e.target.value;
    const partes = nombreCompleto.trim().split(/\s+/);
    let usuarioSugerido = "";
    if (partes.length >= 2) {
      usuarioSugerido = `${partes[0]}.${partes[1]}`.toLowerCase();
    } else if (partes.length === 1) {
      usuarioSugerido = partes[0].toLowerCase();
    }
    usuarioSugerido = usuarioSugerido.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    setNuevoUser({ ...nuevoUser, nombre_completo: nombreCompleto, usuario: usuarioSugerido });
  };

  // --- VALIDACIÓN ESTRICTA DE EXISTENCIA DE LIBRO ---
  const validarYProcederLibro = async (codigo) => {
    try {
      const respuesta = await fetch(`https://10.19.11.249:3001/api/verificar-libro/${codigo}`);
      const data = await respuesta.json();
      
      if (!respuesta.ok || !data.existe) {
        alert(`❌ ERROR: El libro con código "${codigo}" NO existe en la base de datos. Registro cancelado.`);
        return;
      }
      
      // Si el libro sí existe, guardamos los datos y avanzamos
      setScannedCode(codigo);
      setTituloLibroDetectado(data.libro.titulo);
      setMostrarForm(true);
    } catch (error) {
      alert("Error al conectar con el servidor para validar el libro.");
    }
  };

  // --- BÚSQUEDA AUTOMÁTICA DE ALUMNO ---
  const buscarAlumnoPorMatricula = async () => {
    if (!datosPrestamo.matricula.trim()) {
      alert("⚠️ Ingresa una matrícula para buscar.");
      return;
    }
    try {
      const respuesta = await fetch(`https://10.19.11.249:3001/api/buscar-alumno/${datosPrestamo.matricula.trim()}`);
      const data = await respuesta.json();
      
      if (!respuesta.ok || !data.encontrado) {
        alert("⚠️ Alumno no encontrado. Por favor ingrese los datos manualmente.");
        return;
      }
      
      // Auto-rellenar campos obtenidos del backend
      setDatosPrestamo({
        ...datosPrestamo,
        alumno: data.alumno.nombre,
        carrera: data.alumno.carrera
      });
      alert("✅ Alumno cargado correctamente.");
    } catch (error) {
      alert("Error al conectar con el servidor para buscar al alumno.");
    }
  };

  // --- ESCÁNER QR ---
  useEffect(() => {
    const element = document.getElementById('reader');
    if ((vistaActual === "registro" || vistaActual === "prestamos") && !mostrarForm && element) {
      const scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 });
      scanner.render((text) => {
        if (vistaActual === "prestamos") {
          validarYProcederLibro(text.trim());
        } else {
          setScannedCode(text);
          setMostrarForm(true);
        }
        scanner.clear();
      }, () => {});
      return () => { scanner.clear().catch(() => {}); };
    }
  }, [vistaActual, mostrarForm]);

  const guardarLibro = () => {
    if (!datosLibro.titulo.trim() || !datosLibro.autor.trim() || !datosLibro.editorial.trim()) {
      alert("⚠️ No puedes dejar campos del libro en blanco");
      return;
    }

    fetch('https://10.19.11.249:3001/api/registrar-libro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigo: scannedCode, ...datosLibro, estado: 'Disponible', usuario_accion: user })
    }).then(() => {
      alert("✅ Libro registrado");
      setMostrarForm(false);
      setVistaActual("menu");
    });
  };

  const guardarUsuario = () => {
    if (!nuevoUser.nombre_completo.trim() || !nuevoUser.usuario.trim() || !nuevoUser.password.trim()) {
      alert("⚠️ Todos los campos son obligatorios. No se aceptan registros vacíos.");
      return;
    }

    fetch('https://10.19.11.249:3001/api/usuarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nuevoUser)
    }).then(() => {
      alert("🎉 Usuario Creado");
      cargarUsuarios();
      setNuevoUser({ nombre_completo: '', usuario: '', password: '' });
    });
  };

  // --- PROCESAR EL PRÉSTAMO ---
  const procesarPrestamo = () => {
    if (!datosPrestamo.alumno.trim() || !datosPrestamo.matricula.trim() || !datosPrestamo.carrera.trim()) {
      alert("⚠️ Por favor llena todos los campos del alumno (Nombre, Matrícula y Carrera)");
      return;
    }
    
    fetch('https://10.19.11.249:3001/api/prestar-libro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        codigo: scannedCode, 
        alumno: datosPrestamo.alumno, 
        matricula: datosPrestamo.matricula,
        carrera: datosPrestamo.carrera, 
        usuario_accion: user 
      })
    }).then(() => {
      alert("✅ Préstamo procesado con éxito");
      setDatosPrestamo({ alumno: '', matricula: '', carrera: '' });
      setMostrarForm(false);
      setVistaActual("menu");
    });
  };

  const procesarCodigoManual = () => {
    if (!codigoManual.trim()) {
      alert("⚠️ Debes ingresar un código válido");
      return;
    }
    validarYProcederLibro(codigoManual.trim());
    setCodigoManual(""); 
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <img src={logoVenado} alt="Logo" style={styles.logoImg} />
        <div style={styles.textContainer}>
          <h1 style={styles.mainTitle}>TECNOLÓGICO NACIONAL DE MÉXICO</h1>
          <h2 style={styles.subTitle}>INSTITUTO TECNOLÓGICO DE HERMOSILLO</h2>
          <h3 style={styles.appTitle}>Biblioteca Laboratorio Sistemas</h3>
        </div>
      </header>

      <main style={styles.main}>
        {/* LOGIN */}
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

        {/* MENÚ PRINCIPAL */}
        {vistaActual === "menu" && (
          <div style={styles.menuGrid}>
            <div style={styles.welcomeText}><h3>Bienvenido, {user}</h3></div>
            <div style={styles.menuItem} onClick={() => setVistaActual("registro")}><span style={styles.icon}>📸</span><h3>Registro</h3><p>Escanear libros</p></div>
            <div style={styles.menuItem} onClick={() => setVistaActual("inventario")}><span style={styles.icon}>📊</span><h3>Inventario</h3><p>Lista completa</p></div>
            
            <div style={styles.menuItem} onClick={() => { setVistaActual("prestamos"); setMostrarForm(false); setScannedCode(""); setCodigoManual(""); setDatosPrestamo({alumno:'', matricula:'', carrera:''}); }}>
              <span style={styles.icon}>🤝</span><h3>Préstamos</h3><p>Registrar salidas</p>
            </div>
            
            <div style={styles.menuItemDisabled}><span style={styles.icon}>🔄</span><h3>Devoluciones</h3><p>Próximamente</p></div>
            
            {(credenciales.usuario.toLowerCase() === 'admin' || credenciales.usuario.toLowerCase() === 'ad') && (
              <>
                <div style={{...styles.menuItem, borderBottom: '6px solid #ff8c00'}} onClick={() => setVistaActual("admin_usuarios")}><span style={styles.icon}>⚙️</span><h3>Administración</h3><p>Gestionar Usuarios</p></div>
                <div style={{...styles.menuItem, borderBottom: '6px solid #28a745'}} onClick={() => setVistaActual("logs")}><span style={styles.icon}>📝</span><h3>Bitácora</h3><p>Ver Historial</p></div>
              </>
            )}
            <button onClick={cerrarSesion} style={styles.btnLogOut}>Cerrar Sesión</button>
          </div>
        )}

        {/* BITÁCORA */}
        {vistaActual === "logs" && (
          <div style={styles.cardTable}>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'20px'}}>
              <h2 style={styles.cardTitle}>Bitácora del Sistema</h2>
              <button onClick={() => setVistaActual("menu")} style={styles.btnBack}>Volver</button>
            </div>
            <div style={{display:'grid', gridTemplateColumns: '1fr 1fr', gap:'20px'}}>
              <div>
                <h4 style={{color:'#003366'}}>Accesos (Login)</h4>
                <table style={styles.table}>
                  <thead><tr style={styles.tableHead}><th>Usuario</th><th>Fecha</th></tr></thead>
                  <tbody>
                    {logsAcceso.map((l, i) => (
                      <tr key={i} style={i % 2 === 0 ? styles.trEven : styles.trOdd}>
                        <td style={styles.td}>{l.nombre_usuario || l.usuario}</td>
                        <td style={styles.td}>{new Date(l.fecha_hora || l.fecha).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div>
                <h4 style={{color:'#003366'}}>Movimientos de Libros</h4>
                <table style={styles.table}>
                  <thead><tr style={styles.tableHead}><th>Admin</th><th>Detalles</th><th>Fecha</th></tr></thead>
                  <tbody>
                    {logsLibros.map((l, i) => (
                      <tr key={i} style={i % 2 === 0 ? styles.trEven : styles.trOdd}>
                        <td style={styles.td}>{l.usuario}</td><td style={styles.td}>{l.detalles}</td><td style={styles.td}>{new Date(l.fecha_hora || l.fecha).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* GESTIÓN DE USUARIOS */}
        {vistaActual === "admin_usuarios" && (
          <div style={styles.cardTable}>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'20px'}}>
              <h2 style={styles.cardTitle}>Gestión de Usuarios</h2>
              <button onClick={() => setVistaActual("menu")} style={styles.btnBack}>Volver</button>
            </div>
            <div style={styles.formSection}>
              <h4>+ Agregar Nuevo Personal</h4>
              <div style={{display:'flex', gap:'10px', flexWrap:'wrap'}}>
                <input style={styles.input} placeholder="Nombre Completo" value={nuevoUser.nombre_completo} onChange={manejarCambioNombre} />
                <input style={styles.input} placeholder="Usuario" value={nuevoUser.usuario} onChange={e => setNuevoUser({...nuevoUser, usuario: e.target.value})} />
                <input type="password" style={styles.input} placeholder="Contraseña" value={nuevoUser.password} onChange={e => setNuevoUser({...nuevoUser, password: e.target.value})} />
                <button style={{...styles.btnSave, width:'auto', backgroundColor:'#28a745'}} onClick={guardarUsuario}>Guardar</button>
              </div>
            </div>
            <table style={styles.table}>
              <thead><tr style={styles.tableHead}><th>Nombre Completo</th><th>Usuario</th><th>Acción</th></tr></thead>
              <tbody>
                {usuarios.map((u, i) => (
                  <tr key={i} style={styles.trOdd}>
                    <td style={styles.td}>{u.nombre_completo}</td><td style={styles.td}>{u.usuario}</td>
                    <td style={styles.td}>{u.usuario !== 'admin' && <button style={{color:'red', border:'none', background:'none', cursor:'pointer'}} onClick={() => fetch(`https://10.19.11.249:3001/api/usuarios/${u.id}`, {method:'DELETE'}).then(() => cargarUsuarios())}>Eliminar</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* INVENTARIO */}
        {vistaActual === "inventario" && (
          <div style={styles.cardTable}>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'20px'}}>
              <h2 style={styles.cardTitle}>Inventario Actual</h2>
              <button onClick={() => setVistaActual("menu")} style={styles.btnBack}>Volver</button>
            </div>
            <table style={styles.table}>
              <thead><tr style={styles.tableHead}><th>Código</th><th>Título</th><th>Autor</th><th>Estado</th></tr></thead>
              <tbody>
                {libros.map((l, i) => (
                  <tr key={i} style={i % 2 === 0 ? styles.trEven : styles.trOdd}>
                    <td style={styles.td}>{l.codigo}</td><td style={styles.td}>{l.titulo}</td><td style={styles.td}>{l.autor}</td><td style={styles.td}><span style={styles.statusBadge}>{l.estado}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* REGISTRO DE LIBROS */}
        {vistaActual === "registro" && (
          !mostrarForm ? (
            <div style={styles.cardTable}>
              <button onClick={() => setVistaActual("menu")} style={styles.btnBack}>← Volver</button>
              <div id="reader" style={{marginTop:'20px'}}></div>
            </div>
          ) : (
            <div style={styles.cardLogin}>
              <h2>Detalles del Libro</h2>
              <p>Código: {scannedCode}</p>
              <input style={styles.input} placeholder="Título" onChange={e => setDatosLibro({...datosLibro, titulo: e.target.value})} />
              <input style={styles.input} placeholder="Autor" onChange={e => setDatosLibro({...datosLibro, autor: e.target.value})} />
              <input style={styles.input} placeholder="Editorial" onChange={e => setDatosLibro({...datosLibro, editorial: e.target.value})} />
              <select style={styles.input} value={datosLibro.ubicacion} onChange={e => setDatosLibro({...datosLibro, ubicacion: e.target.value})}>
                <option>Mueble 1 - Nivel 1</option>
                <option>Mueble 1 - Nivel 2</option>
                <option>Mueble 2 - Nivel 1</option>
                <option>Mueble 2 - Nivel 2</option>
                <option>Mueble 3 - Nivel 1</option>
                <option>Mueble 3 - Nivel 2</option>
              </select>
              <button onClick={guardarLibro} style={{...styles.btnSave, marginTop:'10px'}}>Guardar</button>
              <button onClick={() => setMostrarForm(false)} style={{background:'none', border:'none', color:'#666', marginTop:'10px', cursor:'pointer'}}>Reintentar</button>
            </div>
          )
        )}

        {/* INTERFAZ DEL FLUJO DE PRÉSTAMOS CON CANDADOS Y BÚSQUEDA AUTOMÁTICA */}
        {vistaActual === "prestamos" && (
          !mostrarForm ? (
            <div style={styles.cardTable}>
              <button onClick={() => setVistaActual("menu")} style={styles.btnBack}>← Volver</button>
              <h3 style={{marginTop: '15px', color: '#003366'}}>Paso 1: Escanea el QR del libro o ingrésalo manualmente</h3>
              
              <div id="reader" style={{marginTop:'20px'}}></div>
              
              <div style={{
                marginTop: '30px', 
                padding: '20px', 
                borderTop: '2px dashed #ccc', 
                textAlign: 'center',
                backgroundColor: '#f9f9f9',
                borderRadius: '8px'
              }}>
                <label style={{display: 'block', marginBottom: '10px', fontWeight: 'bold', color: '#555'}}>
                  ¿No funciona la cámara? Digita el código de barras/QR:
                </label>
                <div style={{display: 'flex', gap: '10px', maxWidth: '400px', margin: '0 auto'}}>
                  <input 
                    style={{...styles.input, marginBottom: 0}} 
                    placeholder="Escribe el código aquí..." 
                    value={codigoManual}
                    onChange={e => setCodigoManual(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') procesarCodigoManual(); }}
                  />
                  <button style={{...styles.btnSave, width: 'auto', whiteSpace: 'nowrap'}} onClick={procesarCodigoManual}>
                    Continuar →
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div style={styles.cardLogin}>
              <h2 style={styles.cardTitle}>Registrar Préstamo</h2>
              <div style={{margin: '15px 0', textAlign: 'left', backgroundColor: '#eef4fa', padding: '10px', borderRadius: '8px'}}>
                <p style={{margin: '0 0 5px 0'}}><strong>Código Libro:</strong> {scannedCode}</p>
                <p style={{margin: 0}}><strong>Título:</strong> {tituloLibroDetectado}</p>
              </div>
              
              {/* Sección de número de control con botón de búsqueda integrado */}
              <div style={{display: 'flex', gap: '10px', marginBottom: '10px'}}>
                <input 
                  style={{...styles.input, marginBottom: 0}} 
                  placeholder="Número de Control / Matrícula" 
                  value={datosPrestamo.matricula}
                  onChange={e => setDatosPrestamo({...datosPrestamo, matricula: e.target.value})}
                />
                <button 
                  type="button" 
                  style={{...styles.btnSave, backgroundColor: '#ff8c00', width: 'auto', whiteSpace: 'nowrap'}}
                  onClick={buscarAlumnoPorMatricula}
                >
                  🔍 Buscar
                </button>
              </div>

              {/* Campos auto-rellenables (pero editables por si acaso) */}
              <input 
                style={styles.input} 
                placeholder="Nombre Completo del Alumno" 
                value={datosPrestamo.alumno}
                onChange={e => setDatosPrestamo({...datosPrestamo, alumno: e.target.value})} 
              />
              <input 
                style={styles.input} 
                placeholder="Carrera del Alumno" 
                value={datosPrestamo.carrera}
                onChange={e => setDatosPrestamo({...datosPrestamo, carrera: e.target.value})} 
              />

              <button style={{...styles.btnSave, marginTop:'10px', width: '100%'} } onClick={procesarPrestamo}>
                Confirmar Salida
              </button>
              
              <button onClick={() => setMostrarForm(false)} style={{background:'none', border:'none', color:'#666', marginTop:'15px', cursor:'pointer', textDecoration: 'underline'}}>
                Escanear o digitar otro libro
              </button>
            </div>
          )
        )}
      </main>
    </div>
  );
}

const styles = {
  container: { minHeight: '100vh', backgroundColor: '#f4f6f9', fontFamily: 'Segoe UI, sans-serif' },
  header: { backgroundColor: '#003366', color: 'white', padding: '20px', textAlign: 'center' },
  logoImg: { height: '80px', marginBottom:'10px' },
  textContainer: { textAlign: 'center' },
  mainTitle: { fontSize: '14px', margin: 0 },
  subTitle: { fontSize: '11px', margin: 0, color: '#ccc' },
  appTitle: { fontSize: '22px', margin: '5px 0 0 0', fontWeight:'bold' },
  main: { padding: '20px', maxWidth: '1200px', margin: 'auto' },
  cardLogin: { backgroundColor: 'white', padding: '30px', borderRadius: '15px', maxWidth: '450px', margin: 'auto', textAlign: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' },
  menuGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' },
  menuItem: { backgroundColor: 'white', padding: '30px', borderRadius: '15px', textAlign: 'center', cursor: 'pointer', borderBottom: '6px solid #003366', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' },
  menuItemDisabled: { backgroundColor: '#eeeeee', padding: '30px', borderRadius: '15px', textAlign: 'center', color: '#888888', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' },
  welcomeText: { gridColumn: '1/-1', textAlign: 'center', marginBottom: '10px' },
  icon: { fontSize: '45px', marginBottom: '10px', display: 'block' },
  cardTable: { backgroundColor: 'white', padding: '25px', borderRadius: '15px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' },
  cardTitle: { borderBottom: '3px solid #003366', display:'inline-block', paddingBottom:'5px', color:'#003366' },
  table: { width: '100%', borderCollapse: 'collapse', marginTop:'10px' },
  tableHead: { backgroundColor: '#003366', color: 'white', textAlign: 'left' },
  td: { padding: '12px', borderBottom: '1px solid #eee', fontSize: '13px' },
  trEven: { backgroundColor: '#f9f9f9' },
  trOdd: { backgroundColor: '#fff' },
  input: { padding: '12px', borderRadius: '8px', border: '1px solid #ccc', marginBottom: '10px', width: '100%', boxSizing: 'border-box' },
  btnSave: { backgroundColor: '#003366', color: 'white', padding: '12px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight:'bold' },
  btnBack: { backgroundColor: '#003366', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' },
  btnLogOut: { gridColumn: '1/-1', marginTop: '20px', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', color: '#666' },
  formSection: { marginBottom: '25px', padding: '20px', backgroundColor:'#f9f9f9', borderRadius: '12px' },
  statusBadge: { backgroundColor: '#28a745', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '11px' }
};

export default App;
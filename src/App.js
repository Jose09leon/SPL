import React, { useState, useEffect, useCallback } from 'react';
import { Html5QrcodeScanner } from "html5-qrcode";
import logoVenado from './assets/LogoLSI.png';

const API_URL = `${window.location.protocol}//${window.location.host}`;

function App() {
  const obtenerParametrosMesa = () => {
    const stringBusqueda = window.location.search || window.location.hash.split('?')[1] || '';
    const parametros = new URLSearchParams(stringBusqueda);
    return parametros.get('mesa');
  };

  const parametrosURL = new URLSearchParams(window.location.search);
  const accionDetectada = parametrosURL.get('accion') || (window.location.hash.includes('accion=devolucion') ? 'devolucion' : null);
  const mesaDetectada = obtenerParametrosMesa();

  const [user, setUser] = useState(null);
  const [vistaActual, setVistaActual] = useState(
    accionDetectada === "devolucion" ? "autonomo_devolver" : (mesaDetectada ? "autonomo_prestar" : "login")
  );
  
  const [libros, setLibros] = useState([]);
  const [usuarios, setUsuarios] = useState([]); 
  const [logsAcceso, setLogsAcceso] = useState([]);
  const [logsLibros, setLogsLibros] = useState([]);
  const [scannedCode, setScannedCode] = useState("");
  const [mostrarForm, setMostrarForm] = useState(false);
  
  const [datosLibro, setDatosLibro] = useState({ titulo: '', autor: '', editorial: '', ubicacion: 'Mueble Temas Diversos' });
  const [nuevoUser, setNuevoUser] = useState({ nombre_completo: '', usuario: '', password: '' });
  const [credenciales, setCredenciales] = useState({ usuario: '', pass: '' });

  const [datosPrestamo, setDatosPrestamo] = useState({ alumno: '', matricula: '', carrera: '' });
  const [tituloLibroDetectado, setTituloLibroDetectado] = useState("");
  const [codigoManual, setCodigoManual] = useState("");

  const [datosDevolucion, setDatosDevolucion] = useState({ alumno: '', matricula: '', carrera: '', fecha_prestamo: '' });
  
  const [autonomoMatricula, setAutonomoMatricula] = useState("");
  const [autonomoCodigoLibro, setAutonomoCodigoLibro] = useState("");
  const [resultadoDevolucionAutonoma, setResultadoDevolucionAutonoma] = useState(null);
  const [autonomoNombreDetectado, setAutonomoNombreDetectado] = useState("");
  const [autonomoCarreraDetectada, setAutonomoCarreraDetectada] = useState("");
  const [mostrarCamaraAutonoma, setMostrarCamaraAutonoma] = useState(false);
  const [mostrarCamaraDevolucion, setMostrarCamaraDevolucion] = useState(false);

  const [camposDeshabilitados, setCamposDeshabilitados] = useState(false);
  const [esModificacion, setEsModificacion] = useState(false);

  const [mostrarModalConfirmar, setMostrarModalConfirmar] = useState(false);
  const [datosLibroPendiente, setDatosLibroPendiente] = useState(null);

  const [tablaExcel, setTablaExcel] = useState("alumnos");
  const [archivoExcel, setArchivoExcel] = useState(null);
  const [cargandoExcel, setCargandoExcel] = useState(false);
  const [mensajeExcel, setMensajeExcel] = useState("");

  const nombreMesaLimpio = mesaDetectada ? mesaDetectada.replace(/_/g, ' ') : '';

  const cerrarSesion = useCallback(() => {
    setUser(null);
    setVistaActual("login");
    setCredenciales({ usuario: '', pass: '' });
  }, []);

  useEffect(() => {
    let timeoutId;
    const reiniciarTemporizador = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const esAdmin = user === "Administrador Local" || credenciales.usuario.toLowerCase() === 'admin';
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

  const manejarLogin = async (e) => {
    e.preventDefault();
    try {
      const respuesta = await fetch(`${API_URL}/api/login`, {
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

  const cargarLogs = () => {
    fetch(`${API_URL}/api/logs-acceso`).then(res => res.json()).then(data => setLogsAcceso(data));
    fetch(`${API_URL}/api/log-libros`).then(res => res.json()).then(data => setLogsLibros(data));
  };

  const cargarUsuarios = () => {
    fetch(`${API_URL}/api/usuarios`).then(res => res.json()).then(data => setUsuarios(data));
  };

  const cargarLibros = () => {
    fetch(`${API_URL}/api/libros`).then(res => res.json()).then(data => setLibros(data));
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

  const verificarLibroParaRegistro = async (codigo) => {
    try {
      const respuesta = await fetch(`${API_URL}/api/verificar-libro/${codigo}`);
      const data = await respuesta.json();
      
      if (respuesta.ok && data.existe) {
        setDatosLibro({
          titulo: data.libro.titulo || '',
          autor: data.libro.autor || '',
          editorial: data.libro.editorial || '',
          ubicacion: data.libro.ubicacion || 'Mueble Temas Diversos'
        });
        
        setDatosLibroPendiente(data.libro);
        setMostrarModalConfirmar(true);
      } else {
        setDatosLibro({ titulo: '', autor: '', editorial: '', ubicacion: 'Mueble Temas Diversos' });
        setCamposDeshabilitados(false);
        setEsModificacion(false);
      }
      setScannedCode(codigo);
      setMostrarForm(true);
    } catch (error) {
      alert("Error al validar el libro con el servidor de base de datos.");
    }
  };

  const aceptarModificacionLibro = () => {
    setCamposDeshabilitados(false);
    setEsModificacion(true);
    setMostrarModalConfirmar(false);
  };

  const cancelarModificacionLibro = () => {
    setCamposDeshabilitados(true);
    setEsModificacion(false);
    setMostrarModalConfirmar(false);
  };

  const validarYProcederLibro = async (codigo) => {
    try {
      const respuesta = await fetch(`${API_URL}/api/verificar-libro/${codigo}`);
      const data = await respuesta.json();
      
      if (!respuesta.ok || !data.existe) {
        alert(`❌ ERROR: El libro con código "${codigo}" NO existe en la base de datos. Operación cancelada.`);
        return;
      }

      if (vistaActual === "devoluciones") {
        if (data.libro.estado !== 'Prestado') {
          alert(`⚠️ El libro "${data.libro.titulo}" ya se encuentra Disponible en el inventario.`);
          return;
        }

        try {
          const resInfo = await fetch(`${API_URL}/api/info-prestamo/${codigo}`);
          const dataInfo = await resInfo.json();
          if (resInfo.ok && dataInfo.encontrado) {
            setDatosDevolucion({
              alumno: dataInfo.prestamo.alumno,
              matricula: dataInfo.prestamo.matricula,
              carrera: dataInfo.prestamo.carrera,
              fecha_prestamo: dataInfo.prestamo.fecha_prestamo || dataInfo.prestamo.fecha
            });
          } else {
            setDatosDevolucion({ alumno: 'Historial no localizado', matricula: 'N/A', carrera: 'N/A', fecha_prestamo: new Date() });
          }
        } catch (e) {
          console.error("Error al recuperar información del préstamo:", e);
        }
      }
      
      setScannedCode(codigo);
      setTituloLibroDetectado(data.libro.titulo);
      setMostrarForm(true);
    } catch (error) {
      alert("Error de conexión con el servidor al validar el libro.");
    }
  };

  const buscarAlumnoPorMatricula = async () => {
    if (!datosPrestamo.matricula.trim()) {
      alert("⚠️ Ingresa una matrícula o tarjeta para buscar.");
      return;
    }
    try {
      const respuesta = await fetch(`${API_URL}/api/buscar-alumno/${datosPrestamo.matricula.trim().toLowerCase()}`);
      const data = await respuesta.json();
      
      if (!respuesta.ok || !data.encontrado) {
        alert("⚠️ Usuario no encontrado en la base de datos externa.");
        return;
      }
      
      setDatosPrestamo({
        ...datosPrestamo,
        alumno: data.alumno.nombre,
        carrera: data.alumno.carrera
      });
      alert(`✅ Usuario localizado:\nNombre: ${data.alumno.nombre}\nCarrera: ${data.alumno.carrera}`);
    } catch (error) {
      alert("Error al conectar con el servidor para buscar al usuario.");
    }
  };

  const consultarIdentificadorAutonomo = async (valor) => {
    setAutonomoMatricula(valor);
    const valorLimpio = valor.trim().toLowerCase();
    
    if (valorLimpio.length < 2) {
      setAutonomoNombreDetectado("");
      setAutonomoCarreraDetectada("");
      return;
    }
    
    try {
      const respuesta = await fetch(`${API_URL}/api/buscar-alumno/${valorLimpio}`);
      const data = await respuesta.json();
      
      if (respuesta.ok && data.encontrado && data.alumno) {
        setAutonomoNombreDetectado(data.alumno.nombre);
        setAutonomoCarreraDetectada(data.alumno.carrera || "Docente Registrado");
      } else {
        setAutonomoNombreDetectado("");
        setAutonomoCarreraDetectada("");
      }
    } catch (e) {
      setAutonomoNombreDetectado("");
      setAutonomoCarreraDetectada("");
    }
  };

  useEffect(() => {
    const elementAdmin = document.getElementById('reader');
    const elementAutonomo = document.getElementById('reader-autonomo');
    const elementDevolucion = document.getElementById('reader-devolucion');

    if ((vistaActual === "registro" || vistaActual === "prestamos" || vistaActual === "devoluciones") && !mostrarForm && elementAdmin) {
      const scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 });
      scanner.render(async (text) => {
        const codigoLimpio = text.trim();
        if (vistaActual === "prestamos" || vistaActual === "devoluciones") {
          await scanner.clear().catch(() => {});
          validarYProcederLibro(codigoLimpio);
        } else {
          await scanner.clear().catch(() => {});
          verificarLibroParaRegistro(codigoLimpio);
        }
      }, () => {});
      return () => { scanner.clear().catch(() => {}); };
    }

    if (vistaActual === "autonomo_prestar" && mostrarCamaraAutonoma && elementAutonomo) {
      const scannerAutonomo = new Html5QrcodeScanner("reader-autonomo", { fps: 10, qrbox: 220 });
      scannerAutonomo.render(async (text) => {
        await scannerAutonomo.clear().catch(() => {});
        setAutonomoCodigoLibro(text.trim());
        setMostrarCamaraAutonoma(false);
      }, () => {});
      return () => { scannerAutonomo.clear().catch(() => {}); };
    }

    if (vistaActual === "autonomo_devolver" && mostrarCamaraDevolucion && elementDevolucion) {
      const scannerDevolucion = new Html5QrcodeScanner("reader-devolucion", { fps: 10, qrbox: 220 });
      scannerDevolucion.render(async (text) => {
        await scannerDevolucion.clear().catch(() => {});
        setAutonomoCodigoLibro(text.trim());
        setMostrarCamaraDevolucion(false);
      }, () => {});
      return () => { scannerDevolucion.clear().catch(() => {}); };
    }
  }, [vistaActual, mostrarForm, mostrarCamaraAutonoma, mostrarCamaraDevolucion]);

  const guardarLibro = async () => {
    if (!datosLibro.titulo.trim() || !datosLibro.autor.trim() || !datosLibro.editorial.trim()) {
      alert("⚠️ No puedes dejar campos del libro en blanco");
      return;
    }
    
    try {
      const respuesta = await fetch(`${API_URL}/api/registrar-libro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          codigo: scannedCode, 
          ...datosLibro, 
          estado: 'Disponible', 
          usuario_accion: user, 
          confirmarModificacion: esModificacion 
        })
      });
      
      const data = await respuesta.json();
      
      if (respuesta.ok && data.success) {
        alert(esModificacion ? "✅ Datos y ubicación física actualizados con éxito." : "✅ Libro registrado exitosamente.");
        setMostrarForm(false);
        setVistaActual("menu");
      } else {
        alert("Hubo un error al procesar la solicitud en el servidor.");
      }
    } catch (e) {
      alert("Error de conexión al procesar el libro.");
    }
  };

  const guardarUsuario = () => {
    if (!nuevoUser.nombre_completo.trim() || !nuevoUser.usuario.trim() || !nuevoUser.password.trim()) {
      alert("⚠️ Todos los campos son obligatorios.");
      return;
    }
    fetch(`${API_URL}/api/usuarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nuevoUser)
    }).then(() => {
      alert("🎉 Usuario Creado");
      cargarUsuarios();
      setNuevoUser({ nombre_completo: '', usuario: '', password: '' });
    });
  };

  const procesarPrestamo = () => {
    if (!datosPrestamo.alumno.trim() || !datosPrestamo.matricula.trim()) {
      alert("⚠️ Primero debes ingresar el Identificador y presionar 'Buscar' para cargar al deudor.");
      return;
    }
    fetch(`${API_URL}/api/prestar-libro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        codigo: scannedCode, 
        alumno: datosPrestamo.alumno, 
        matricula: datosPrestamo.matricula.trim().toLowerCase(), 
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

  const procesarDevolucion = () => {
    fetch(`${API_URL}/api/devolver-libro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        codigo: scannedCode, 
        matricula: datosDevolucion.matricula.trim().toLowerCase(),
        usuario_accion: user 
      })
    }).then(async (res) => {
      const data = await res.json();
      if (!res.ok) {
        alert(`❌ ${data.error || "Error al procesar la devolución."}`);
        return;
      }
      alert("✅ Devolución completada. El libro ha sido reingresado de forma exitosa.");
      setDatosDevolucion({ alumno: '', matricula: '', carrera: '', fecha_prestamo: '' });
      setMostrarForm(false);
      setVistaActual("menu");
    }).catch(() => {
      alert("Error de conexión con el servidor.");
    });
  };

  const procesarCodigoManual = () => {
    if (!codigoManual.trim()) {
      alert("⚠️ Debes ingresar un código válido");
      return;
    }
    if (vistaActual === "registro") {
      verificarLibroParaRegistro(codigoManual.trim());
    } else {
      validarYProcederLibro(codigoManual.trim());
    }
    setCodigoManual(""); 
  };

  const procesarSubidaExcel = async (e) => {
    e.preventDefault();
    if (!archivoExcel) {
      alert("⚠️ Por favor selecciona un archivo de Excel (.xlsx / .xls).");
      return;
    }

    const confirmarReemplazo = window.confirm(
      `⚠️ ATENCIÓN: Esta acción VACÍARÁ por completo la tabla "${tablaExcel.toUpperCase()}" y cargará los datos del archivo seleccionado.\n\n¿Deseas continuar?`
    );

    if (!confirmarReemplazo) return;

    const formData = new FormData();
    formData.append('archivo', archivoExcel);
    formData.append('tabla', tablaExcel);
    formData.append('usuario_accion', user || 'Admin');

    setCargandoExcel(true);
    setMensajeExcel("");

    try {
      const respuesta = await fetch(`${API_URL}/api/cargar-excel`, {
        method: 'POST',
        body: formData
      });
      const data = await respuesta.json();
      setCargandoExcel(false);

      if (respuesta.ok && data.success) {
        alert(data.mensaje);
        setMensajeExcel(data.mensaje);
        setArchivoExcel(null);
        const inputElem = document.getElementById("input-excel-file");
        if (inputElem) inputElem.value = "";
      } else {
        alert(`❌ ${data.error || "Error al procesar el archivo."}`);
      }
    } catch (error) {
      setCargandoExcel(false);
      alert("Error de conexión al subir el archivo.");
    }
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
            
            <div style={{...styles.menuItem, borderBottom: '6px solid #e74c3c'}} onClick={() => { setVistaActual("devoluciones"); setMostrarForm(false); setScannedCode(""); setCodigoManual(""); setDatosDevolucion({alumno:'', matricula:'', carrera:'', fecha_prestamo:''}); }}>
              <span style={styles.icon}>🔄</span><h3>Devoluciones</h3><p>Ingresar Libros</p>
            </div>
            
            {(credenciales.usuario.toLowerCase() === 'admin' || credenciales.usuario.toLowerCase() === 'ad' || user === "Administrador Local") && (
              <>
                <div style={{...styles.menuItem, borderBottom: '6px solid #ff8c00'}} onClick={() => setVistaActual("admin_usuarios")}><span style={styles.icon}>⚙️</span><h3>Administración</h3><p>Gestionar Usuarios</p></div>
                <div style={{...styles.menuItem, borderBottom: '6px solid #28a745'}} onClick={() => setVistaActual("logs")}><span style={styles.icon}>📝</span><h3>Bitácora</h3><p>Ver Historial</p></div>
                <div style={{...styles.menuItem, borderBottom: '6px solid #17a2b8'}} onClick={() => { setVistaActual("carga_excel"); setArchivoExcel(null); setMensajeExcel(""); }}>
                  <span style={styles.icon}>📑</span><h3>Carga Masiva</h3><p>Actualizar con Excel</p>
                </div>
              </>
            )}
            <button onClick={cerrarSesion} style={styles.btnLogOut}>Cerrar Sesión</button>
          </div>
        )}

        {/* CARGA MASIVA DE EXCEL */}
        {vistaActual === "carga_excel" && (
          <div style={styles.cardTable}>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'20px'}}>
              <h2 style={{...styles.cardTitle, color: '#17a2b8', borderBottom: '3px solid #17a2b8'}}>
                Carga Masiva de Datos desde Excel
              </h2>
              <button onClick={() => setVistaActual("menu")} style={styles.btnBack}>← Volver</button>
            </div>

            <p style={{color: '#555', marginBottom: '20px'}}>
              Selecciona la tabla que deseas actualizar por completo y carga tu archivo <strong>.xlsx</strong> o <strong>.xls</strong>.
            </p>

            <form onSubmit={procesarSubidaExcel} style={{maxWidth: '600px', margin: '0 auto', textAlign: 'left'}}>
              <label style={{fontWeight: 'bold', display: 'block', marginBottom: '8px'}}>
                1. Selecciona la tabla a reemplazar:
              </label>
              <select 
                style={{...styles.input, marginBottom: '20px'}}
                value={tablaExcel}
                onChange={e => setTablaExcel(e.target.value)}
              >
                <option value="alumnos">Tabla: Alumnos (no_de_control, nombres, apellidos, carrera, correo)</option>
                <option value="maestros">Tabla: Maestros (no_tarjeta, nombre, departamento)</option>
                <option value="libros">Tabla: Libros (codigo, titulo, autor, editorial, ubicacion)</option>
              </select>

              <div style={{backgroundColor: '#eef9fa', borderLeft: '4px solid #17a2b8', padding: '15px', borderRadius: '8px', marginBottom: '20px', fontSize: '13px', lineHeight: '1.6'}}>
                <strong style={{color: '#117a8b'}}>📌 Encabezados esperados en la primera fila de tu Excel:</strong>
                {tablaExcel === "alumnos" && (
                  <ul style={{margin: '8px 0 0 0', paddingLeft: '20px'}}>
                    <li><code>CARRERA</code>: Plan de estudios (ej. INGENIERIA MECANICA).</li>
                    <li><code>no_de_control</code>: Matrícula única del alumno.</li>
                    <li><code>apellido_paterno</code>, <code>apellido_materno</code> y <code>nombre_alumno</code>.</li>
                    <li><code>correo_electronico</code>: Dirección de correo.</li>
                  </ul>
                )}
                {tablaExcel === "maestros" && (
                  <ul style={{margin: '8px 0 0 0', paddingLeft: '20px'}}>
                    <li><code>no_tarjeta</code> o <code>tarjeta</code>: Número de empleado/docente.</li>
                    <li><code>nombre_maestro</code> o <code>nombre</code>: Nombre completo.</li>
                    <li><code>departamento</code> o <code>adscripcion</code>: Área académica.</li>
                  </ul>
                )}
                {tablaExcel === "libros" && (
                  <ul style={{margin: '8px 0 0 0', paddingLeft: '20px'}}>
                    <li><code>codigo</code>: Código de barras o QR único.</li>
                    <li><code>titulo</code>, <code>autor</code>, <code>editorial</code>.</li>
                    <li><code>ubicacion</code> <em>(Opcional)</em>: Mueble y estante físico.</li>
                  </ul>
                )}
              </div>

              <label style={{fontWeight: 'bold', display: 'block', marginBottom: '8px'}}>
                2. Selecciona el archivo de Excel:
              </label>
              <input 
                id="input-excel-file"
                type="file" 
                accept=".xlsx, .xls"
                style={{...styles.input, backgroundColor: '#fff'}}
                onChange={e => setArchivoExcel(e.target.files[0])}
              />

              <button 
                type="submit" 
                disabled={cargandoExcel}
                style={{
                  ...styles.btnSave, 
                  backgroundColor: cargandoExcel ? '#ccc' : '#17a2b8', 
                  width: '100%', 
                  marginTop: '15px',
                  fontSize: '16px'
                }}
              >
                {cargandoExcel ? "⏳ Procesando y actualizando base de datos..." : "🚀 Cargar y Reemplazar Tabla"}
              </button>

              {mensajeExcel && (
                <div style={{marginTop: '20px', padding: '12px', backgroundColor: '#eafaf1', borderLeft: '4px solid #28a745', borderRadius: '8px', color: '#155724'}}>
                  {mensajeExcel}
                </div>
              )}
            </form>
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
                    <td style={styles.td}>{u.usuario !== 'admin' && <button style={{color:'red', border:'none', background:'none', cursor:'pointer'}} onClick={() => fetch(`${API_URL}/api/usuarios/${u.id}`, {method:'DELETE'}).then(() => cargarUsuarios())}>Eliminar</button>}</td>
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
                    <td style={styles.td}>{l.codigo}</td><td style={styles.td}>{l.titulo}</td><td style={styles.td}>{l.autor}</td><td style={styles.td}><span style={{...styles.statusBadge, backgroundColor: l.estado === 'Disponible' ? '#28a745' : '#d9534f'}}>{l.estado}</span></td>
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
              <h3 style={{marginTop: '15px', color: '#003366'}}>Escanea el código de barras o ingrésalo manualmente para registrar</h3>
              <div id="reader" style={{marginTop:'20px'}}></div>
              <div style={{
                marginTop: '30px', 
                padding: '20px', 
                borderTop: '2px dashed #ccc', 
                textAlign: 'center',
                backgroundColor: '#f9f9f9',
                borderRadius: '8px'
              }}>
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
              <h2 style={{fontSize: '24px', fontWeight: 'bold', marginBottom: '15px'}}>Detalles del Libro</h2>
              <p style={{fontSize: '16px', marginBottom: '20px', color: '#333'}}>Código: <strong>{scannedCode}</strong></p>
              
              <input 
                style={styles.input} 
                placeholder="Título" 
                value={datosLibro.titulo} 
                onChange={e => setDatosLibro({...datosLibro, titulo: e.target.value})} 
                disabled={camposDeshabilitados} 
              />
              <input 
                style={styles.input} 
                placeholder="Autor" 
                value={datosLibro.autor} 
                onChange={e => setDatosLibro({...datosLibro, autor: e.target.value})} 
                disabled={camposDeshabilitados} 
              />
              <input 
                style={styles.input} 
                placeholder="Editorial" 
                value={datosLibro.editorial} 
                onChange={e => setDatosLibro({...datosLibro, editorial: e.target.value})} 
                disabled={camposDeshabilitados} 
              />
              <select 
                style={styles.input} 
                value={datosLibro.ubicacion} 
                onChange={e => setDatosLibro({...datosLibro, ubicacion: e.target.value})} 
                disabled={camposDeshabilitados}
              >
                <option>Mueble Temas Diversos</option>
                <option>Mueble Redes y Bases de datos</option>
                <option>Mueble Sistemas Operativos</option>
                <option>Mueble Programación</option>
              </select>

              <div style={{display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '15px'}}>
                {!camposDeshabilitados && (
                  <button onClick={guardarLibro} style={styles.btnSave}>Guardar</button>
                )}
                <button 
                  onClick={() => { setMostrarForm(false); setCamposDeshabilitados(false); setEsModificacion(false); }} 
                  style={{background: 'none', border: 'none', color: '#666', cursor: 'pointer', textDecoration: 'underline'}}
                >
                  Reintentar
                </button>
              </div>
            </div>
          )
        )}

        {/* PRÉSTAMOS ADMIN */}
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
              <label style={{fontWeight: 'bold', color: '#555', display: 'block', marginBottom: '8px', textAlign: 'left'}}>
                Paso 2: Ingrese Número de Control o Tarjeta:
              </label>
              <div style={{display: 'flex', gap: '10px', marginBottom: '20px'}}>
                <input 
                  style={{...styles.input, marginBottom: 0}} 
                  placeholder="Número de Control / Matrícula" 
                  value={datosPrestamo.matricula}
                  onChange={e => setDatosPrestamo({...datosPrestamo, matricula: e.target.value})}
                  onKeyDown={(e) => { if (e.key === 'Enter') buscarAlumnoPorMatricula(); }}
                />
                <button 
                  type="button" 
                  style={{...styles.btnSave, backgroundColor: '#ff8c00', width: 'auto', whiteSpace: 'nowrap'}}
                  onClick={buscarAlumnoPorMatricula}
                >
                  🔍 Buscar
                </button>
              </div>
              {datosPrestamo.alumno && (
                <div style={{margin: '10px 0 20px 0', textAlign: 'left', backgroundColor: '#eafaf1', padding: '10px', borderRadius: '8px', borderLeft: '4px solid #28a745'}}>
                  <p style={{margin: '0 0 4px 0', fontSize: '13px'}}><strong>Deudor:</strong> {datosPrestamo.alumno}</p>
                  <p style={{margin: 0, fontSize: '13px'}}><strong>Tipo/Carrera:</strong> {datosPrestamo.carrera}</p>
                </div>
              )}
              <button style={{...styles.btnSave, width: '100%'}} onClick={procesarPrestamo}>
                Confirmar Salida
              </button>
              <button onClick={() => setMostrarForm(false)} style={{background:'none', border:'none', color:'#666', marginTop:'15px', cursor:'pointer', textDecoration: 'underline'}}>
                Escanear o digitar otro libro
              </button>
            </div>
          )
        )}

        {/* DEVOLUCIONES ADMIN */}
        {vistaActual === "devoluciones" && (
          !mostrarForm ? (
            <div style={styles.cardTable}>
              <button onClick={() => setVistaActual("menu")} style={styles.btnBack}>← Volver</button>
              <h3 style={{marginTop: '15px', color: '#003366'}}>Paso 1: Escanea o digita el código del libro a devolver</h3>
              <div id="reader" style={{marginTop:'20px'}}></div>
              <div style={{
                marginTop: '30px', 
                padding: '20px', 
                borderTop: '2px dashed #ccc', 
                textAlign: 'center',
                backgroundColor: '#f9f9f9',
                borderRadius: '8px'
              }}>
                <div style={{display: 'flex', gap: '10px', maxWidth: '400px', margin: '0 auto'}}>
                  <input 
                    style={{...styles.input, marginBottom: 0}} 
                    placeholder="Escribe el código aquí..." 
                    value={codigoManual}
                    onChange={e => setCodigoManual(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') procesarCodigoManual(); }}
                  />
                  <button style={{...styles.btnSave, width: 'auto', whiteSpace: 'nowrap', backgroundColor: '#e74c3c'}} onClick={procesarCodigoManual}>
                    Continuar →
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div style={styles.cardLogin}>
              <h2 style={{...styles.cardTitle, borderBottom: '3px solid #e74c3c', color: '#e74c3c'}}>Confirmar Reingreso</h2>
              <div style={{margin: '15px 0', textAlign: 'left', backgroundColor: '#fdf2f2', padding: '12px', borderRadius: '8px', borderLeft: '5px solid #e74c3c'}}>
                <p style={{margin: '0 0 5px 0'}}><strong>Código Libro:</strong> {scannedCode}</p>
                <p style={{margin: '0 0 10px 0'}}><strong>Título:</strong> {tituloLibroDetectado}</p>
                {datosDevolucion.alumno && (
                  <>
                    <hr style={{border: '0', borderTop: '1px solid #f5c6cb', margin: '8px 0'}} />
                    <p style={{margin: '0 0 3px 0', fontSize: '13px'}}><strong>Solicitado por:</strong> {datosDevolucion.alumno}</p>
                    <p style={{margin: '0 0 3px 0', fontSize: '13px'}}><strong>Matrícula:</strong> {datosDevolucion.matricula}</p>
                    <p style={{margin: '0 0 3px 0', fontSize: '13px'}}><strong>Carrera/Tipo:</strong> {datosDevolucion.carrera}</p>
                    <p style={{margin: 0, fontSize: '13px'}}><strong>Fecha de Préstamo:</strong> {datosDevolucion.fecha_prestamo ? new Date(datosDevolucion.fecha_prestamo).toLocaleString() : 'N/A'}</p>
                  </>
                )}
              </div>
              <button style={{...styles.btnSave, marginTop:'15px', width: '100%', backgroundColor: '#e74c3c'}} onClick={procesarDevolucion}>
                Confirmar Reingreso a Inventario
              </button>
              <button onClick={() => setMostrarForm(false)} style={{background:'none', border:'none', color:'#666', marginTop:'15px', cursor:'pointer', textDecoration: 'underline'}}>
                Escanear o digitar otro libro
              </button>
            </div>
          )
        )}

        {/* AUTOSERVICIO PRÉSTAMO */}
        {vistaActual === "autonomo_prestar" && (
          <div style={styles.cardLogin}>
            <span style={{fontSize: '50px'}}>📤</span>
            <h2 style={{...styles.cardTitle, color: '#003366', borderBottom: '3px solid #ff8c00', display:'block'}}>
              Retirar Libro (Autoservicio)
            </h2>
            <p style={{margin: '5px 0 20px 0', color: '#666'}}>
              Estante origen: <strong style={{color: '#ff8c00'}}>{nombreMesaLimpio}</strong>
            </p>
            <div style={{textAlign: 'left'}}>
              <label style={{fontWeight: 'bold', color: '#555', display: 'block', marginBottom: '5px'}}>
                Número de Control o Tarjeta:
              </label>
              <input 
                style={styles.input} 
                placeholder="Ej. 21120456" 
                value={autonomoMatricula}
                onChange={e => consultarIdentificadorAutonomo(e.target.value)}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
                autoComplete="off"
              />
              {autonomoNombreDetectado && (
                <div style={{
                  margin: '-5px 0 15px 0', 
                  textAlign: 'left', 
                  backgroundColor: '#eafaf1', 
                  padding: '12px', 
                  borderRadius: '8px', 
                  borderLeft: '4px solid #28a745',
                  animation: 'fadeIn 0.3s'
                }}>
                  <p style={{margin: '0 0 3px 0', fontSize: '13px', color: '#155724'}}><strong>👤 Nombre:</strong> {autonomoNombreDetectado}</p>
                  <p style={{margin: 0, fontSize: '12px', color: '#212529'}}><strong>🎓 Tipo:</strong> {autonomoCarreraDetectada}</p>
                </div>
              )}
              <label style={{fontWeight: 'bold', color: '#555', display: 'block', marginBottom: '5px', marginTop: '10px'}}>
                Código del Libro (Barras o QR):
              </label>
              <div style={{display: 'flex', gap: '8px', marginBottom: '10px'}}>
                <input 
                  style={{...styles.input, marginBottom: 0}} 
                  placeholder="Código del libro físico" 
                  value={autonomoCodigoLibro}
                  onChange={e => setAutonomoCodigoLibro(e.target.value)}
                  autoCapitalize="none"
                  autoCorrect="off"
                />
                <button 
                  type="button"
                  style={{...styles.btnSave, backgroundColor: '#ff8c00', padding: '0 15px', whiteSpace: 'nowrap'}}
                  onClick={() => setMostrarCamaraAutonoma(!mostrarCamaraAutonoma)}
                >
                  {mostrarCamaraAutonoma ? "❌ Cerrar" : "📸 Escanear"}
                </button>
              </div>
              {mostrarCamaraAutonoma && (
                <div style={{
                  border: '2px dashed #ff8c00', 
                  borderRadius: '10px', 
                  padding: '10px', 
                  marginBottom: '15px',
                  backgroundColor: '#fffcf7'
                }}>
                  <div id="reader-autonomo"></div>
                </div>
              )}
            </div>
            <button 
              style={{...styles.btnSave, backgroundColor: '#003366', width: '100%', marginTop: '15px'}}
              onClick={() => {
                if (!autonomoMatricula.trim() || !autonomoCodigoLibro.trim()) {
                  alert("⚠️ Completa ambos campos antes de continuar.");
                  return;
                }
                if (!autonomoNombreDetectado) {
                  alert("❌ No puedes proceder: El número de control ingresado no es válido o no existe.");
                  return;
                }
                fetch(`${API_URL}/api/prestamo-autonomo`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ 
                    codigo: autonomoCodigoLibro.trim(), 
                    matricula: autonomoMatricula.trim().toLowerCase(), 
                    mesa: nombreMesaLimpio 
                  })
                }).then(async (res) => {
                  const data = await res.json();
                  if (!res.ok) return alert(`❌ ${data.error}`);
                  alert(`✅ ${data.message}`);
                  setAutonomoCodigoLibro("");
                  setAutonomoMatricula("");
                  setAutonomoNombreDetectado("");
                  setAutonomoCarreraDetectada("");
                  setMostrarCamaraAutonoma(false);
                });
              }}
            >
              Confirmar Retiro
            </button>
          </div>
        )}

        {/* AUTOSERVICIO DEVOLUCIÓN */}
        {vistaActual === "autonomo_devolver" && (
          <div style={styles.cardLogin}>
            <span style={{fontSize: '50px'}}>📥</span>
            <h2 style={{...styles.cardTitle, color: '#e74c3c', borderBottom: '3px solid #e74c3c', display:'block'}}>
              Devolución Autónoma
            </h2>
            <p style={{margin: '5px 0 20px 0', color: '#666'}}>Registre el reingreso para conocer su ubicación exacta de acomodo</p>
            {!resultadoDevolucionAutonoma ? (
              <>
                <div style={{textAlign: 'left'}}>
                  <label style={{fontWeight: 'bold', color: '#555', display: 'block', marginBottom: '5px'}}>
                    Código de Barras / QR del Libro:
                  </label>
                  <div style={{display: 'flex', gap: '8px', marginBottom: '10px'}}>
                    <input 
                      style={{...styles.input, marginBottom: 0}} 
                      placeholder="Ingrese el código del libro físico" 
                      value={autonomoCodigoLibro}
                      onChange={e => setAutonomoCodigoLibro(e.target.value)}
                      autoCapitalize="none"
                      autoCorrect="off"
                    />
                    <button 
                      type="button"
                      style={{...styles.btnSave, backgroundColor: '#ff8c00', padding: '0 15px', whiteSpace: 'nowrap'}}
                      onClick={() => setMostrarCamaraDevolucion(!mostrarCamaraDevolucion)}
                    >
                      {mostrarCamaraDevolucion ? "❌ Cerrar" : "📸 Escanear"}
                    </button>
                  </div>
                  {mostrarCamaraDevolucion && (
                    <div style={{
                      border: '2px dashed #ff8c00', 
                      borderRadius: '10px', 
                      padding: '10px', 
                      marginBottom: '15px',
                      backgroundColor: '#fffcf7'
                    }}>
                      <div id="reader-devolucion"></div>
                    </div>
                  )}
                </div>
                
                <button 
                  style={{...styles.btnSave, backgroundColor: '#e74c3c', width: '100%', marginTop: '15px'}}
                  onClick={() => {
                    if (!autonomoCodigoLibro.trim()) return alert("⚠️ Ingrese el código del libro.");
                    fetch(`${API_URL}/api/devolucion-autonoma`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ codigo: autonomoCodigoLibro.trim() })
                    }).then(async (res) => {
                      const data = await res.json();
                      if (!res.ok) return alert(`❌ ${data.error}`);
                      setResultadoDevolucionAutonoma(data);
                    });
                  }}
                >
                  Procesar Devolución
                </button>
              </>
            ) : (
              <div style={{animation: 'fadeIn 0.4s'}}>
                <div style={{backgroundColor: '#eafaf1', padding: '15px', borderRadius: '8px', borderLeft: '5px solid #28a745', textAlign: 'left', margin: '15px 0'}}>
                  <p style={{margin: '0 0 5px 0', color: '#28a745', fontWeight: 'bold', fontSize: '15px'}}>✅ ¡Libro Liberado del Sistema!</p>
                  <p style={{margin: 0}}><strong>Título:</strong> {resultadoDevolucionAutonoma.titulo}</p>
                </div>
                <div style={{backgroundColor: '#fff3cd', padding: '20px', borderRadius: '10px', border: '2px dashed #ffc107', margin: '20px 0'}}>
                  <p style={{margin: '0 0 5px 0', color: '#856404', fontWeight: 'bold'}}>📍 UBICACIÓN DONDE DEBES ACOMODARLO:</p>
                  <h3 style={{margin: 0, color: '#856404', fontSize: '18px'}}>{resultadoDevolucionAutonoma.ubicacion}</h3>
                </div>
                <button 
                  style={{...styles.btnSave, backgroundColor: '#666', width: '100%'}} 
                  onClick={() => { setResultadoDevolucionAutonoma(null); setAutonomoCodigoLibro(""); }}
                >
                  Devolver otro libro
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODAL INTERACTIVO DE CONFIRMACIÓN */}
      {mostrarModalConfirmar && datosLibroPendiente && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
              <span style={{ fontSize: '24px' }}>⚠️</span>
              <h4 style={{ margin: 0, color: '#f0ad4e', fontSize: '18px', fontWeight: 'bold' }}>
                El libro ya se encuentra registrado en el sistema.
              </h4>
            </div>
            
            <div style={{ textAlign: 'left', backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '8px', margin: '15px 0', fontSize: '14px', lineHeight: '1.6' }}>
              <p style={{ margin: '0 0 5px 0' }}><strong>Título:</strong> {datosLibroPendiente.titulo}</p>
              <p style={{ margin: '0 0 5px 0' }}><strong>Autor:</strong> {datosLibroPendiente.autor}</p>
              <p style={{ margin: '0 0 5px 0' }}><strong>Editorial:</strong> {datosLibroPendiente.editorial}</p>
              <p style={{ margin: 0 }}><strong>Mueble:</strong> {datosLibroPendiente.ubicacion}</p>
            </div>

            <p style={{ fontSize: '15px', fontWeight: '500', color: '#333', marginBottom: '20px' }}>
              ¿Deseas modificar sus campos o cambiar su ubicación física en el estante?
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button 
                onClick={cancelarModificacionLibro} 
                style={{ ...styles.btnSave, backgroundColor: '#6c757d', padding: '10px 20px' }}
              >
                Cancelar
              </button>
              <button 
                onClick={aceptarModificacionLibro} 
                style={{ ...styles.btnSave, backgroundColor: '#003366', padding: '10px 20px' }}
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
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
  btnSave: { backgroundColor: '#003366', color: 'white', padding: '12px 24px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight:'bold' },
  btnBack: { backgroundColor: '#003366', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' },
  btnLogOut: { gridColumn: '1/-1', marginTop: '20px', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', color: '#666' },
  formSection: { marginBottom: '25px', padding: '20px', backgroundColor:'#f9f9f9', borderRadius: '12px' },
  statusBadge: { color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '11px' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 },
  modalContent: { backgroundColor: 'white', padding: '25px', borderRadius: '12px', maxWidth: '460px', width: '90%', boxShadow: '0 5px 15px rgba(0,0,0,0.3)', animation: 'fadeIn 0.2s ease-out' }
};

export default App;

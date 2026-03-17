import { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from "html5-qrcode";

function App() {
  const [scannedCode, setScannedCode] = useState("");

  useEffect(() => {
    // 1. Configuramos el escáner con ajustes para móviles
    const scanner = new Html5QrcodeScanner("reader", { 
      fps: 10, 
      qrbox: { width: 280, height: 150 }, // Tamaño ideal para códigos de barras
      aspectRatio: 1.0,
      showTorchButtonIfSupported: true, // Botón para prender la linterna si es posible
    });

    // 2. Función al detectar éxito
    const onScanSuccess = (decodedText) => {
      console.log("Código leído:", decodedText);
      setScannedCode(decodedText);
      // Opcional: scanner.clear(); // Detener después de leer uno
    };

    // 3. Función al detectar error (la ignoramos para no saturar la consola)
    const onScanError = (errorMessage) => { };

    // 4. Renderizamos el escáner
    scanner.render(onScanSuccess, onScanError);

    // 5. Limpieza al cerrar la app
    return () => {
      scanner.clear().catch(error => console.error("Error al limpiar:", error));
    };
  }, []);

  return (
    <div style={{ textAlign: 'center', marginTop: '30px', fontFamily: 'Arial' }}>
      <h1 style={{ color: '#2c3e50' }}>📸 Escáner de Biblioteca</h1>
      
      <div style={{ padding: '10px', maxWidth: '450px', margin: 'auto' }}>
        <div id="reader"></div>
      </div>

      {scannedCode && (
        <div style={{ 
          marginTop: '20px', 
          padding: '15px', 
          backgroundColor: '#d4edda', 
          borderRadius: '8px',
          display: 'inline-block'
        }}>
          <h3 style={{ margin: 0 }}>Código Detectado:</h3>
          <p style={{ fontSize: '22px', fontWeight: 'bold', color: '#155724' }}>
            {scannedCode}
          </p>
          <button onClick={() => setScannedCode("")} style={{ marginTop: '10px', padding: '5px 15px' }}>
            Escanear de nuevo
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
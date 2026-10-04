// ============================================
// SCANNER DE TICKETS - TESSERACT.JS MEJORADO
// ============================================
// 100% gratuito, sin límites de consultas
// ============================================

let diagnostico = {
    imagenSeleccionada: false,
    imagenValida: false,
    tamano: 0,
    tipoMIME: '',
    ancho: 0,
    alto: 0,
    base64Length: 0,
    peticionEnviada: false,
    respuestaRecibida: false,
    productosDetectados: 0,
    jsonParseado: false,
    productosMostrados: 0
};

document.getElementById('fotoInput').addEventListener('change', function(e) {
    const archivo = e.target.files[0];
    if (!archivo) return;

    // Reiniciar diagnóstico
    diagnostico = {
        imagenSeleccionada: true,
        imagenValida: false,
        tamano: 0,
        tipoMIME: '',
        ancho: 0,
        alto: 0,
        base64Length: 0,
        peticionEnviada: false,
        respuestaRecibida: false,
        productosDetectados: 0,
        jsonParseado: false,
        productosMostrados: 0
    };

    // Validar imagen
    if (!validarImagen(archivo)) return;

    // Mostrar preview
    const reader = new FileReader();
    reader.onload = function(event) {
        document.getElementById('preview').innerHTML = `<img src="${event.target.result}" alt="Ticket">`;
        procesarImagen(archivo);
    };
    reader.readAsDataURL(archivo);
});

function validarImagen(archivo) {
    // Verificar tipo MIME
    if (!archivo.type.startsWith('image/')) {
        mostrarError('El archivo no es una imagen válida');
        return false;
    }

    // Verificar tamaño (máx 10MB)
    if (archivo.size > 10 * 1024 * 1024) {
        mostrarError('La imagen es demasiado grande (máx 10MB)');
        return false;
    }

    diagnostico.tamano = archivo.size;
    diagnostico.tipoMIME = archivo.type;
    diagnostico.imagenValida = true;

    console.log('IMAGE DEBUG');
    console.log('✓ Imagen seleccionada:', diagnostico.imagenSeleccionada);
    console.log('✓ Imagen válida:', diagnostico.imagenValida);
    console.log('✓ Tamaño:', (diagnostico.tamano / 1024).toFixed(2), 'KB');
    console.log('✓ Tipo MIME:', diagnostico.tipoMIME);

    return true;
}

async function procesarImagen(archivo) {
    const progreso = document.getElementById('progreso');
    const barra = document.getElementById('barra');
    const progresoTexto = document.getElementById('progresoTexto');
    const resultados = document.getElementById('resultados');

    progreso.style.display = 'block';
    resultados.style.display = 'none';
    barra.style.width = '0%';
    progresoTexto.textContent = 'Convirtiendo imagen...';

    try {
        // Convertir a Base64
        const base64 = await archivoABase64(archivo);
        diagnostico.base64Length = base64.length;

        console.log('✓ Base64 length:', diagnostico.base64Length);

        // Obtener dimensiones
        const dimensiones = await obtenerDimensiones(base64);
        diagnostico.ancho = dimensiones.ancho;
        diagnostico.alto = dimensiones.alto;

        console.log('✓ Ancho:', diagnostico.ancho);
        console.log('✓ Alto:', diagnostico.alto);

        barra.style.width = '20%';
        progresoTexto.textContent = 'Iniciando OCR...';

        // Procesar con Tesseract.js
        diagnostico.peticionEnviada = true;
        console.log('✓ Petición enviada:', diagnostico.peticionEnviada);

        const resultado = await Tesseract.recognize(base64, 'spa', {
            logger: m => {
                if (m.status === 'recognizing text') {
                    const p = Math.round(m.progress * 100);
                    barra.style.width = (20 + p * 0.6) + '%';
                    progresoTexto.textContent = `Leyendo texto... ${p}%`;
                }
            }
        });

        diagnostico.respuestaRecibida = true;
        console.log('✓ Respuesta recibida:', diagnostico.respuestaRecibida);

        const texto = resultado.data.text;
        console.log('Texto detectado:', texto);

        // Extraer productos
        const productos = extraerProductos(texto);
        diagnostico.productosDetectados = productos.length;
        console.log('✓ Productos detectados:', diagnostico.productosDetectados);

        const total = buscarTotal(texto);

        // Mostrar resultados
        mostrarResultados(productos, total);
        diagnostico.productosMostrados = productos.length;
        diagnostico.jsonParseado = true;

        barra.style.width = '100%';
        progresoTexto.textContent = 'Completado!';
        progreso.style.display = 'none';
        resultados.style.display = 'block';

        console.log('✓ JSON parseado:', diagnostico.jsonParseado);
        console.log('✓ Productos mostrados:', diagnostico.productosMostrados);

    } catch (error) {
        console.error('Error:', error);
        progresoTexto.textContent = 'Error: ' + error.message;
        barra.style.width = '0%';
    }
}

function archivoABase64(archivo) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(archivo);
    });
}

function obtenerDimensiones(base64) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            resolve({ ancho: img.width, alto: img.height });
        };
        img.src = 'data:image/jpeg;base64,' + base64;
    });
}

function extraerProductos(texto) {
    const lineas = texto.split('\n').filter(l => l.trim());
    const productos = [];

    // Palabras clave para identificar líneas que NO son productos
    const palabrasExcluir = [
        'total', 'subtotal', 'importe', 'cambio', 'efectivo', 'tarjeta',
        'iva', 'descuento', 'ticket', 'factura', 'caja', 'cajero',
        'fecha', 'hora', 'direccion', 'telefono', 'cif', 'nif',
        'codigo', 'barras', 'operacion', 'autorizacion', 'recibo',
        'gracias', 'vuelva', 'proxima', 'cliente', 'proveedor',
        'base', 'imponible', 'tipo', 'documento', 'numero', 'serie',
        'establecimiento', 'comercial', 'sociedad', 'domicilio'
    ];

    for (const linea of lineas) {
        const lineaLimpia = linea.trim();
        if (lineaLimpia.length < 3) continue;

        // Verificar si la línea contiene palabras excluidas
        const lineaLower = lineaLimpia.toLowerCase();
        const esExcluida = palabrasExcluir.some(palabra => lineaLower.includes(palabra));
        if (esExcluida) continue;

        // Buscar precio al final de la línea
        const match = lineaLimpia.match(/(\d+[.,]\d{2})\s*€?$/);
        if (match) {
            const precio = parseFloat(match[1].replace(',', '.'));
            const nombre = lineaLimpia.replace(match[0], '').trim();

            // Validar que el nombre sea razonable
            if (nombre.length > 2 && nombre.length < 100 && precio > 0 && precio < 10000) {
                const esConfiable = validarProducto(nombre, precio);
                
                productos.push({
                    nombre: nombre,
                    precio: precio,
                    confiable: esConfiable
                });
            }
        }
    }

    return productos.slice(0, 50);
}

function validarProducto(nombre, precio) {
    if (nombre.length < 3) return false;
    if (precio < 0.01 || precio > 1000) return false;
    if (/^\d+$/.test(nombre)) return false;
    if (/^[^\w\s]+$/.test(nombre)) return false;
    
    return true;
}

function buscarTotal(texto) {
    const patrones = [
        /total[:\s]*(\d+[.,]\d{2})/i,
        /importe[:\s]*(\d+[.,]\d{2})/i,
        /a\s*pagar[:\s]*(\d+[.,]\d{2})/i,
    ];

    for (const patron of patrones) {
        const match = texto.match(patron);
        if (match) {
            return parseFloat(match[1].replace(',', '.'));
        }
    }

    const lineas = texto.split('\n');
    for (let i = lineas.length - 1; i >= 0; i--) {
        const match = lineas[i].match(/(\d+[.,]\d{2})/);
        if (match) {
            const valor = parseFloat(match[1].replace(',', '.'));
            if (valor > 0 && valor < 10000) {
                return valor;
            }
        }
    }

    return 0;
}

function mostrarResultados(productos, total) {
    const lista = document.getElementById('listaProductos');
    const totalDiv = document.getElementById('total');

    if (productos.length === 0) {
        lista.innerHTML = '<tr><td colspan="3" style="text-align: center; color: #666;">No se detectaron productos</td></tr>';
    } else {
        lista.innerHTML = productos.map(p => `
            <tr>
                <td>${p.nombre}</td>
                <td class="precio">$${p.precio.toFixed(2)}</td>
                <td class="estado">
                    ${p.confiable ? 
                        '<span class="estado-ok">OK</span>' : 
                        '<span class="estado-revisar">Revisar</span>'}
                </td>
            </tr>
        `).join('');
    }

    totalDiv.innerHTML = `
        <span id="total-label">TOTAL</span>
        <span id="total-valor">$${total.toFixed(2)}</span>
    `;
}

function mostrarError(mensaje) {
    alert(mensaje);
    console.error('ERROR:', mensaje);
}

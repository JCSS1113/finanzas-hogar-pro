// Configuración de OCR.space (API gratuita)
const OCR_API_KEY = 'K88975894788957'; // API key gratuita de OCR.space

document.getElementById('fotoInput').addEventListener('change', function(e) {
    const archivo = e.target.files[0];
    if (!archivo) return;

    // Mostrar preview
    const reader = new FileReader();
    reader.onload = function(event) {
        document.getElementById('preview').innerHTML = `<img src="${event.target.result}" alt="Ticket">`;
        procesarImagen(archivo);
    };
    reader.readAsDataURL(archivo);
});

async function procesarImagen(archivo) {
    const progreso = document.getElementById('progreso');
    const barra = document.getElementById('barra');
    const progresoTexto = document.getElementById('progresoTexto');
    const resultados = document.getElementById('resultados');

    progreso.style.display = 'block';
    resultados.style.display = 'none';
    barra.style.width = '0%';
    progresoTexto.textContent = 'Subiendo imagen...';

    try {
        // Usar OCR.space API
        const formData = new FormData();
        formData.append('file', archivo);
        formData.append('language', 'spa');
        formData.append('isCreateSearchablePdf', 'false');
        formData.append('isTable', 'true');

        barra.style.width = '30%';
        progresoTexto.textContent = 'Analizando con OCR...';

        const response = await fetch('https://api.ocr.space/parse/image', {
            method: 'POST',
            headers: {
                'apikey': OCR_API_KEY,
            },
            body: formData
        });

        barra.style.width = '70%';
        progresoTexto.textContent = 'Procesando resultados...';

        const data = await response.json();

        if (data.ParsedResults && data.ParsedResults.length > 0) {
            const texto = data.ParsedResults[0].ParsedText;
            const productos = extraerProductos(texto);
            const total = buscarTotal(texto);

            mostrarResultados(productos, total);
        } else {
            alert('No se pudo leer el ticket. Intenta con otra foto más clara.');
        }

        barra.style.width = '100%';
        progresoTexto.textContent = 'Completado!';
        progreso.style.display = 'none';
        resultados.style.display = 'block';

    } catch (error) {
        console.error('Error:', error);
        progresoTexto.textContent = 'Error al procesar. Intenta de nuevo.';
        barra.style.width = '0%';
    }
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
                // Determinar si el dato es confiable
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
    // Un producto es confiable si:
    // 1. El nombre tiene al menos 3 caracteres
    // 2. El precio es razonable (entre 0.01 y 1000)
    // 3. El nombre no es solo números
    // 4. El nombre no contiene solo caracteres especiales
    
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

    // Buscar último número con decimales
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

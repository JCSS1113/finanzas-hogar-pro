// ============================================
// SCANNER DE TICKETS - GEMINI API
// ============================================
// Usa Gemini para analizar tickets con IA
// Gratis: 1,500 consultas/día
// ============================================

// La API key se carga desde config.js (archivo local, no subido a GitHub)
// Asegúrate de que config.js exista y contenga: const GEMINI_API_KEY = 'tu_key';

// Verificar que la API key esté definida
if (typeof GEMINI_API_KEY === 'undefined') {
    console.error('ERROR: GEMINI_API_KEY no está definida. Crea el archivo config.js con tu API key.');
    alert('Error: No se encontró la API key. Crea el archivo config.js');
    return;
}

document.getElementById('fotoInput').addEventListener('change', function(e) {
    const archivo = e.target.files[0];
    if (!archivo) return;

    // Validar imagen
    if (!archivo.type.startsWith('image/')) {
        alert('El archivo no es una imagen válida');
        return;
    }

    if (archivo.size > 10 * 1024 * 1024) {
        alert('La imagen es demasiado grande (máx 10MB)');
        return;
    }

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
    progresoTexto.textContent = 'Convirtiendo imagen...';

    try {
        // Convertir a Base64
        const base64 = await archivoABase64(archivo);
        const base64SinPrefijo = base64.split(',')[1];

        barra.style.width = '30%';
        progresoTexto.textContent = 'Enviando a Gemini...';

        // Prompt específico para extraer productos
        const prompt = `Analiza esta imagen de un ticket de compra. 
Extrae SOLO los productos con sus precios.
Ignora: fecha, hora, dirección, teléfono, CIF, número de ticket, códigos de barras, IVA, subtotal, total, cambio, método de pago.
Devuelve SOLO un JSON válido con este formato:
[
  {"producto": "nombre del producto", "precio": 1.29}
]
No incluyas texto antes o después del JSON. Solo el JSON.`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: prompt },
                        {
                            inline_data: {
                                mime_type: archivo.type,
                                data: base64SinPrefijo
                            }
                        }
                    ]
                }]
            })
        });

        barra.style.width = '70%';
        progresoTexto.textContent = 'Procesando respuesta...';

        const data = await response.json();

        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
            const textoRespuesta = data.candidates[0].content.parts[0].text;
            console.log('Respuesta de Gemini:', textoRespuesta);

            // Parsear JSON de la respuesta
            const productos = parsearRespuestaGemini(textoRespuesta);
            console.log('Productos parseados:', productos);

            mostrarResultados(productos);
        } else {
            alert('Gemini no pudo analizar la imagen. Intenta con otra foto.');
        }

        barra.style.width = '100%';
        progresoTexto.textContent = 'Completado!';
        progreso.style.display = 'none';
        resultados.style.display = 'block';

    } catch (error) {
        console.error('Error:', error);
        progresoTexto.textContent = 'Error: ' + error.message;
        barra.style.width = '0%';
    }
}

function archivoABase64(archivo) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(archivo);
    });
}

function parsearRespuestaGemini(texto) {
    try {
        // Buscar JSON en la respuesta
        let jsonTexto = texto;
        
        // Si está en markdown, extraer el JSON
        const match = texto.match(/```json\s*([\s\S]*?)\s*```/);
        if (match) {
            jsonTexto = match[1];
        } else {
            // Buscar array JSON directamente
            const arrayMatch = texto.match(/\[[\s\S]*?\]/);
            if (arrayMatch) {
                jsonTexto = arrayMatch[0];
            }
        }

        const productos = JSON.parse(jsonTexto);
        
        // Validar y limpiar productos
        return productos
            .filter(p => p.producto && p.precio && p.precio > 0)
            .map(p => ({
                nombre: p.producto,
                precio: parseFloat(p.precio),
                confiable: true
            }));

    } catch (error) {
        console.error('Error parseando JSON:', error);
        return [];
    }
}

function mostrarResultados(productos) {
    const lista = document.getElementById('listaProductos');
    const totalDiv = document.getElementById('total');

    if (productos.length === 0) {
        lista.innerHTML = '<tr><td colspan="3" style="text-align: center; color: #666;">No se detectaron productos</td></tr>';
        totalDiv.innerHTML = '';
        return;
    }

    lista.innerHTML = productos.map(p => `
        <tr>
            <td>${p.nombre}</td>
            <td class="precio">$${p.precio.toFixed(2)}</td>
            <td class="estado">
                <span class="estado-ok">OK</span>
            </td>
        </tr>
    `).join('');

    const total = productos.reduce((sum, p) => sum + p.precio, 0);
    totalDiv.innerHTML = `
        <span id="total-label">TOTAL</span>
        <span id="total-valor">$${total.toFixed(2)}</span>
    `;
}

document.getElementById('fotoInput').addEventListener('change', function(e) {
    const archivo = e.target.files[0];
    if (!archivo) return;

    // Mostrar preview
    const reader = new FileReader();
    reader.onload = function(event) {
        document.getElementById('preview').innerHTML = `<img src="${event.target.result}" alt="Ticket">`;
        procesarImagen(event.target.result);
    };
    reader.readAsDataURL(archivo);
});

async function procesarImagen(imagenUrl) {
    const progreso = document.getElementById('progreso');
    const barra = document.getElementById('barra');
    const progresoTexto = document.getElementById('progresoTexto');
    const resultados = document.getElementById('resultados');

    progreso.style.display = 'block';
    resultados.style.display = 'none';
    barra.style.width = '0%';

    try {
        const resultado = await Tesseract.recognize(imagenUrl, 'spa', {
            logger: m => {
                if (m.status === 'recognizing text') {
                    const p = Math.round(m.progress * 100);
                    barra.style.width = p + '%';
                    progresoTexto.textContent = `Leyendo texto... ${p}%`;
                }
            }
        });

        progresoTexto.textContent = 'Analizando productos...';
        barra.style.width = '100%';

        const texto = resultado.data.text;
        const productos = extraerProductos(texto);
        const total = buscarTotal(texto);

        mostrarResultados(productos, total);

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

    for (const linea of lineas) {
        const lineaLimpia = linea.trim();
        if (lineaLimpia.length < 3) continue;

        // Buscar precio al final: 1.50 / 1,50 / 1.50€ / 1,50€
        const match = lineaLimpia.match(/(\d+[.,]\d{2})\s*€?$/);
        if (match) {
            const precio = parseFloat(match[1].replace(',', '.'));
            const nombre = lineaLimpia.replace(match[0], '').trim();

            if (nombre.length > 2 && precio > 0 && precio < 10000) {
                productos.push({
                    nombre: nombre,
                    precio: precio
                });
            }
        }
    }

    return productos.slice(0, 50);
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
        lista.innerHTML = '<p style="color: #666; text-align: center;">No se detectaron productos</p>';
    } else {
        lista.innerHTML = productos.map(p => `
            <div class="producto">
                <span class="producto-nombre">${p.nombre}</span>
                <span class="producto-precio">$${p.precio.toFixed(2)}</span>
            </div>
        `).join('');
    }

    totalDiv.innerHTML = `
        <span id="total-label">TOTAL</span>
        <span id="total-valor">$${total.toFixed(2)}</span>
    `;
}

let conversacion = [];
let estado = 'inicio';
let productosDetectados = null;
let totalDetectado = 0;

// Iniciar conversación
window.onload = function() {
    agregarMensaje('bot', 'Hola! Soy tu asistente de gastos. Puedo ayudarte a registrar tus compras de forma rápida.');
    setTimeout(() => {
        agregarMensaje('bot', 'Toma una foto de tu ticket y yo me encargo de extraer los productos y precios por ti.');
        mostrarOpciones(['Ayuda', 'Empezar']);
    }, 500);
};

function agregarMensaje(tipo, texto, extra = null) {
    const chat = document.getElementById('chat');
    const div = document.createElement('div');
    div.className = `mensaje mensaje-${tipo}`;
    
    if (tipo === 'bot' && extra === 'productos') {
        div.classList.add('mensaje-productos');
        div.innerHTML = texto;
    } else {
        div.textContent = texto;
    }
    
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
}

function mostrarOpciones(opciones) {
    const chat = document.getElementById('chat');
    const div = document.createElement('div');
    div.className = 'mensaje mensaje-bot';
    div.innerHTML = '<div class="opciones">' + 
        opciones.map(o => `<span class="opcion" onclick="seleccionarOpcion('${o}')">${o}</span>`).join('') + 
        '</div>';
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
}

function seleccionarOpcion(opcion) {
    agregarMensaje('user', opcion);
    
    if (opcion === 'Ayuda') {
        agregarMensaje('bot', 'Simplemente toma una foto de tu ticket. Yo leeré el texto, encontraré los productos y te mostraré la lista con precios.');
        mostrarOpciones(['Empezar', 'Cancelar']);
    } else if (opcion === 'Empezar') {
        agregarMensaje('bot', 'Perfecto! Toma la foto de tu ticket cuando estés listo.');
    } else if (opcion === 'Cancelar') {
        agregarMensaje('bot', 'No hay problema. Cuando quieras registrar un gasto, solo toma la foto.');
        mostrarOpciones(['Empezar']);
    } else if (opcion === 'Guardar') {
        guardarGasto();
    } else if (opcion === 'Otro ticket') {
        agregarMensaje('bot', 'Toma otra foto cuando quieras.');
    }
}

function handleKeyPress(e) {
    if (e.key === 'Enter') {
        enviarMensaje();
    }
}

function enviarMensaje() {
    const input = document.getElementById('mensaje');
    const texto = input.value.trim();
    if (!texto) return;
    
    agregarMensaje('user', texto);
    input.value = '';
    
    // Responder según el estado
    if (estado === 'esperando_categoria') {
        procesarCategoria(texto);
    } else if (estado === 'esperando_nombre') {
        procesarNombre(texto);
    } else {
        agregarMensaje('bot', 'Puedes tomar una foto de tu ticket o escribirme si necesitas ayuda.');
        mostrarOpciones(['Ayuda', 'Empezar']);
    }
}

document.getElementById('fotoInput').addEventListener('change', function(e) {
    const archivo = e.target.files[0];
    if (!archivo) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        const imagenUrl = event.target.result;
        agregarMensaje('user', '', 'imagen');
        const chat = document.getElementById('chat');
        const mensajes = chat.querySelectorAll('.mensaje-user');
        const ultimoMensaje = mensajes[mensajes.length - 1];
        ultimoMensaje.innerHTML = `<img src="${imagenUrl}" class="imagen-chat" alt="Ticket">`;
        
        procesarImagen(imagenUrl);
    };
    reader.readAsDataURL(archivo);
});

async function procesarImagen(imagenUrl) {
    // Mostrar indicador de procesamiento
    const chat = document.getElementById('chat');
    const div = document.createElement('div');
    div.className = 'mensaje mensaje-bot';
    div.id = 'procesando';
    div.innerHTML = `
        <div class="procesando">
            <div class="spinner"></div>
            <span>Analizando tu ticket...</span>
        </div>
        <div class="barra-progreso">
            <div class="barra-relleno" id="barraProgreso"></div>
        </div>
    `;
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;

    try {
        const resultado = await Tesseract.recognize(imagenUrl, 'spa', {
            logger: m => {
                if (m.status === 'recognizing text') {
                    const barra = document.getElementById('barraProgreso');
                    if (barra) {
                        barra.style.width = Math.round(m.progress * 100) + '%';
                    }
                }
            }
        });

        const texto = resultado.data.text;
        productosDetectados = extraerProductos(texto);
        totalDetectado = buscarTotal(texto);

        // Eliminar indicador de procesamiento
        const procesando = document.getElementById('procesando');
        if (procesando) procesando.remove();

        if (productosDetectados.length > 0) {
            mostrarProductos();
        } else {
            agregarMensaje('bot', 'No pude detectar productos en la foto. Intenta con otra imagen más clara o escribe los datos manualmente.');
            mostrarOpciones(['Ayuda', 'Empezar']);
        }

    } catch (error) {
        console.error('Error:', error);
        const procesando = document.getElementById('procesando');
        if (procesando) procesando.remove();
        agregarMensaje('bot', 'Hubo un error al procesar la imagen. Intenta de nuevo.');
        mostrarOpciones(['Ayuda', 'Empezar']);
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

function mostrarProductos() {
    const chat = document.getElementById('chat');
    const div = document.createElement('div');
    div.className = 'mensaje mensaje-bot mensaje-productos';
    
    let html = '<strong>Productos detectados:</strong><br>';
    
    productosDetectados.forEach((p, i) => {
        html += `
            <div class="producto-item">
                <span class="producto-nombre">${i + 1}. ${p.nombre}</span>
                <span class="producto-precio">$${p.precio.toFixed(2)}</span>
            </div>
        `;
    });
    
    html += `
        <div class="total-item">
            <span>TOTAL</span>
            <span>$${totalDetectado.toFixed(2)}</span>
        </div>
    `;
    
    div.innerHTML = html;
    chat.appendChild(div);
    
    setTimeout(() => {
        agregarMensaje('bot', '¿Es correcto? Puedes guardarlo o hacer cambios.');
        mostrarOpciones(['Guardar', 'Otro ticket', 'Cancelar']);
    }, 500);
    
    chat.scrollTop = chat.scrollHeight;
}

function guardarGasto() {
    // Aquí se guardaría en localStorage o una base de datos
    const gasto = {
        id: Date.now(),
        productos: productosDetectados,
        total: totalDetectado,
        fecha: new Date().toISOString()
    };
    
    // Guardar en localStorage
    let gastos = JSON.parse(localStorage.getItem('gastos')) || [];
    gastos.push(gasto);
    localStorage.setItem('gastos', JSON.stringify(gastos));
    
    agregarMensaje('bot', 'Gasto guardado correctamente! ¿Quieres registrar otro ticket?');
    mostrarOpciones(['Otro ticket', 'Ver gastos']);
    
    productosDetectados = null;
    totalDetectado = 0;
}

function procesarCategoria(texto) {
    agregarMensaje('bot', `Entendido, lo registraré como "${texto}".`);
    estado = 'inicio';
}

function procesarNombre(texto) {
    agregarMensaje('bot', `Perfecto, registraré "${texto}".`);
    estado = 'inicio';
}

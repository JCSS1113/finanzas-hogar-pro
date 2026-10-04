let productosActuales = [];
let compras = JSON.parse(localStorage.getItem('compras')) || [];

function agregarProducto() {
    const nombre = document.getElementById('nombreProducto').value.trim();
    const precio = parseFloat(document.getElementById('precioProducto').value);
    const categoria = document.getElementById('categoriaProducto').value;
    const tienda = document.getElementById('tienda').value.trim();

    if (!nombre || !precio || precio <= 0) {
        alert('Ingresa un nombre y precio válidos');
        return;
    }

    productosActuales.push({
        nombre: nombre,
        precio: precio,
        categoria: categoria,
        tienda: tienda
    });

    // Limpiar campos
    document.getElementById('nombreProducto').value = '';
    document.getElementById('precioProducto').value = '';
    document.getElementById('tienda').value = '';

    mostrarListaProductos();
}

function mostrarListaProductos() {
    const listaCard = document.getElementById('listaCard');
    const lista = document.getElementById('listaProductos');
    const totalDiv = document.getElementById('totalCompra');

    if (productosActuales.length === 0) {
        listaCard.style.display = 'none';
        return;
    }

    listaCard.style.display = 'block';

    lista.innerHTML = productosActuales.map((p, i) => `
        <div class="producto-item">
            <div class="producto-info">
                <div class="producto-nombre">${p.nombre}</div>
                <div class="producto-detalle">${getCategoriaNombre(p.categoria)}${p.tienda ? ' - ' + p.tienda : ''}</div>
            </div>
            <div>
                <span class="producto-precio">$${p.precio.toFixed(2)}</span>
                <button class="btn-eliminar" onclick="eliminarProducto(${i})">X</button>
            </div>
        </div>
    `).join('');

    const total = productosActuales.reduce((sum, p) => sum + p.precio, 0);
    totalDiv.innerHTML = `
        <div class="total-item">
            <span class="total-label">TOTAL</span>
            <span class="total-valor">$${total.toFixed(2)}</span>
        </div>
    `;
}

function eliminarProducto(index) {
    productosActuales.splice(index, 1);
    mostrarListaProductos();
}

function limpiarLista() {
    productosActuales = [];
    mostrarListaProductos();
}

function guardarCompra() {
    if (productosActuales.length === 0) {
        alert('Agrega al menos un producto');
        return;
    }

    const compra = {
        id: Date.now(),
        productos: [...productosActuales],
        total: productosActuales.reduce((sum, p) => sum + p.precio, 0),
        fecha: new Date().toISOString()
    };

    compras.unshift(compra);
    localStorage.setItem('compras', JSON.stringify(compras));

    productosActuales = [];
    mostrarListaProductos();
    mostrarHistorial();

    alert('Compra guardada!');
}

function mostrarHistorial() {
    const historialCard = document.getElementById('historialCard');
    const historial = document.getElementById('historial');

    if (compras.length === 0) {
        historialCard.style.display = 'none';
        return;
    }

    historialCard.style.display = 'block';

    historial.innerHTML = compras.map(c => {
        const fecha = new Date(c.fecha);
        const fechaStr = fecha.toLocaleDateString('es-MX', { 
            day: 'numeric', 
            month: 'short', 
            hour: '2-digit', 
            minute: '2-digit' 
        });

        return `
            <div class="compra-item">
                <div class="compra-header">
                    <span>${fechaStr}</span>
                    <span class="compra-total">$${c.total.toFixed(2)}</span>
                </div>
                <div class="compra-productos">
                    ${c.productos.map(p => `<div>• ${p.nombre} - $${p.precio.toFixed(2)}</div>`).join('')}
                </div>
            </div>
        `;
    }).join('');
}

function getCategoriaNombre(cat) {
    const categorias = {
        alimentacion: 'Alimentación',
        vivienda: 'Vivienda',
        servicios: 'Servicios',
        transporte: 'Transporte',
        salud: 'Salud',
        educacion: 'Educación',
        ocio: 'Ocio',
        ropa: 'Ropa',
        aseo: 'Aseo',
        otros: 'Otros'
    };
    return categorias[cat] || cat;
}

// Cargar historial al iniciar
mostrarHistorial();

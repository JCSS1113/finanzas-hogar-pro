// ==================== DATOS ====================
let transacciones = JSON.parse(localStorage.getItem('finanzasHogar')) || [];
let presupuestos = JSON.parse(localStorage.getItem('presupuestosHogar')) || {};

// ==================== FUNCIONES ====================
function guardarDatos() {
    localStorage.setItem('finanzasHogar', JSON.stringify(transacciones));
}

function guardarPresupuestos() {
    localStorage.setItem('presupuestosHogar', JSON.stringify(presupuestos));
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN'
    }).format(amount);
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

function formatDate(fecha) {
    const opciones = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(fecha + 'T00:00:00').toLocaleDateString('es-MX', opciones);
}

// ==================== RESUMEN ====================
function actualizarResumen() {
    const gastos = transacciones.reduce((sum, t) => sum + t.monto, 0);
    document.getElementById('totalGastos').textContent = formatCurrency(gastos);

    const mesActual = new Date().toISOString().substring(0, 7);
    const presupuesto = presupuestos[mesActual] || 0;
    document.getElementById('presupuestoMensual').textContent = formatCurrency(presupuesto);

    if (presupuesto > 0) {
        const porcentaje = Math.min((gastos / presupuesto) * 100, 100);
        document.getElementById('presupuestoProgress').style.width = porcentaje + '%';

        const alertDiv = document.getElementById('budgetAlert');
        if (gastos > presupuesto) {
            alertDiv.className = 'budget-alert danger';
            alertDiv.innerHTML = `<strong>Te pasaste:</strong> Gastaste ${formatCurrency(gastos)} de ${formatCurrency(presupuesto)}`;
        } else if (porcentaje > 80) {
            alertDiv.className = 'budget-alert warning';
            alertDiv.innerHTML = `<strong>Cuidado:</strong> Ya usaste el ${porcentaje.toFixed(0)}% de tu presupuesto`;
        } else {
            alertDiv.className = 'budget-alert success';
            alertDiv.innerHTML = `<strong>Bien:</strong> Llevas el ${porcentaje.toFixed(0)}% de tu presupuesto`;
        }
    } else {
        document.getElementById('presupuestoProgress').style.width = '0%';
        document.getElementById('budgetAlert').className = 'budget-alert';
        document.getElementById('budgetAlert').innerHTML = '';
    }
}

// ==================== HISTORIAL ====================
function actualizarHistorial() {
    const filtroCategoria = document.getElementById('filtroCategoria').value;
    const filtroMes = document.getElementById('filtroMes').value;

    let filtradas = transacciones.filter(t => {
        if (filtroCategoria !== 'todas' && t.categoria !== filtroCategoria) return false;
        if (filtroMes !== 'todos') {
            const mes = t.fecha.substring(0, 7);
            if (mes !== filtroMes) return false;
        }
        return true;
    });

    filtradas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    const lista = document.getElementById('transactionList');

    if (filtradas.length === 0) {
        lista.innerHTML = `
            <div class="empty-state">
                <p>No hay gastos registrados</p>
            </div>
        `;
        return;
    }

    lista.innerHTML = filtradas.map(t => `
        <div class="transaction-item">
            <div class="transaction-info">
                <h4>${t.descripcion}</h4>
                <small>${getCategoriaNombre(t.categoria)}${t.tienda ? ' - ' + t.tienda : ''} - ${formatDate(t.fecha)}</small>
            </div>
            <div style="display: flex; align-items: center; gap: 12px;">
                <span class="transaction-amount">-${formatCurrency(t.monto)}</span>
                <button class="btn btn-danger" onclick="eliminarTransaccion(${t.id})">X</button>
            </div>
        </div>
    `).join('');
}

function eliminarTransaccion(id) {
    if (confirm('Eliminar este gasto?')) {
        transacciones = transacciones.filter(t => t.id !== id);
        guardarDatos();
        actualizarTodo();
    }
}

// ==================== GRÁFICOS ====================
function actualizarGraficos() {
    const gastosPorCategoria = {};
    transacciones.forEach(t => {
        gastosPorCategoria[t.categoria] = (gastosPorCategoria[t.categoria] || 0) + t.monto;
    });

    const categorias = Object.keys(gastosPorCategoria);
    const container = document.getElementById('chartContainer');

    if (categorias.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No hay datos para mostrar</p></div>';
        return;
    }

    const maxMonto = Math.max(...Object.values(gastosPorCategoria));

    container.innerHTML = categorias.map(cat => {
        const monto = gastosPorCategoria[cat];
        const altura = (monto / maxMonto) * 180;
        return `
            <div class="chart-bar" style="height: ${altura}px;">
                <span class="value">${formatCurrency(monto)}</span>
                <span>${getCategoriaNombre(cat)}</span>
            </div>
        `;
    }).join('');
}

// ==================== PRESUPUESTO ====================
function actualizarListaPresupuestos() {
    const container = document.getElementById('budgetList');
    const meses = Object.keys(presupuestos).sort().reverse();

    if (meses.length === 0) {
        container.innerHTML = '<p style="color: #888;">No hay presupuestos configurados</p>';
        return;
    }

    container.innerHTML = meses.map(mes => {
        const [year, month] = mes.split('-');
        const nombreMes = new Date(year, month - 1).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
        const presupuesto = presupuestos[mes];

        const gastosMes = transacciones
            .filter(t => t.fecha.startsWith(mes))
            .reduce((sum, t) => sum + t.monto, 0);

        const porcentaje = presupuesto > 0 ? (gastosMes / presupuesto) * 100 : 0;
        const color = porcentaje > 100 ? '#dc3545' : porcentaje > 80 ? '#ffc107' : '#28a745';

        return `
            <div style="padding: 16px; border: 2px solid #e0e0e0; border-radius: 12px; margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong style="text-transform: capitalize;">${nombreMes}</strong>
                        <div style="color: #666; font-size: 0.9em; margin-top: 4px;">
                            Presupuesto: ${formatCurrency(presupuesto)} - Gastado: ${formatCurrency(gastosMes)}
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 1.3em; font-weight: bold; color: ${color};">${porcentaje.toFixed(0)}%</div>
                        <button class="btn btn-danger" onclick="eliminarPresupuesto('${mes}')" style="margin-top: 4px;">X</button>
                    </div>
                </div>
                <div style="width: 100%; height: 8px; background: #e0e0e0; border-radius: 4px; margin-top: 12px; overflow: hidden;">
                    <div style="width: ${Math.min(porcentaje, 100)}%; height: 100%; background: ${color}; border-radius: 4px;"></div>
                </div>
            </div>
        `;
    }).join('');
}

function eliminarPresupuesto(mes) {
    if (confirm('Eliminar este presupuesto?')) {
        delete presupuestos[mes];
        guardarPresupuestos();
        actualizarTodo();
    }
}

// ==================== FILTROS ====================
function actualizarFiltros() {
    const categorias = [...new Set(transacciones.map(t => t.categoria))];
    const selectCategoria = document.getElementById('filtroCategoria');
    selectCategoria.innerHTML = '<option value="todas">Todas las categorías</option>' +
        categorias.map(c => `<option value="${c}">${getCategoriaNombre(c)}</option>`).join('');

    const meses = [...new Set(transacciones.map(t => t.fecha.substring(0, 7)))].sort().reverse();
    const selectMes = document.getElementById('filtroMes');
    selectMes.innerHTML = '<option value="todos">Todos los meses</option>' +
        meses.map(m => {
            const [year, month] = m.split('-');
            const nombreMes = new Date(year, month - 1).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
            return `<option value="${m}">${nombreMes}</option>`;
        }).join('');
}

// ==================== EVENTOS ====================
document.getElementById('transactionForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const nuevaTransaccion = {
        id: Date.now(),
        descripcion: document.getElementById('descripcion').value,
        monto: parseFloat(document.getElementById('monto').value),
        categoria: document.getElementById('categoria').value,
        tienda: document.getElementById('tienda').value,
        fecha: document.getElementById('fecha').value
    };

    transacciones.push(nuevaTransaccion);
    guardarDatos();
    actualizarTodo();

    this.reset();
    document.getElementById('fecha').valueAsDate = new Date();

    alert('Gasto guardado!');
});

document.getElementById('budgetForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const presupuesto = parseFloat(document.getElementById('presupuestoInput').value);
    const mes = document.getElementById('mesPresupuesto').value;

    if (!mes || presupuesto <= 0) {
        alert('Ingresa un presupuesto válido y selecciona un mes');
        return;
    }

    presupuestos[mes] = presupuesto;
    guardarPresupuestos();
    actualizarTodo();

    this.reset();
    document.getElementById('mesPresupuesto').value = new Date().toISOString().substring(0, 7);

    alert('Presupuesto guardado!');
});

// Pestañas
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', function() {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        this.classList.add('active');
        document.getElementById(this.dataset.tab).classList.add('active');
    });
});

// Filtros
document.getElementById('filtroCategoria').addEventListener('change', actualizarHistorial);
document.getElementById('filtroMes').addEventListener('change', actualizarHistorial);

// ==================== INICIALIZAR ====================
function actualizarTodo() {
    actualizarResumen();
    actualizarHistorial();
    actualizarGraficos();
    actualizarFiltros();
    actualizarListaPresupuestos();
}

document.getElementById('fecha').valueAsDate = new Date();
document.getElementById('mesPresupuesto').value = new Date().toISOString().substring(0, 7);
actualizarTodo();

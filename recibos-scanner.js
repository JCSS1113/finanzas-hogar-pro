/**
 * Recibos Scanner - Herramienta OCR para recibos
 * 
 * Uso:
 * 1. Agrega este archivo a tu web
 * 2. Agrega: <script src="https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js"></script>
 * 3. Llama: RecibosScanner.escanear(imagen)
 * 
 * Retorna: { productos: [...], total: number, texto: string }
 */

const RecibosScanner = {
    /**
     * Escanea una imagen de recibo y extrae los productos
     * @param {string|File|HTMLImageElement} imagen - Imagen, File o URL
     * @param {function} onProgress - Función de progreso (opcional)
     * @returns {Promise<{productos: Array, total: number, texto: string}>}
     */
    async escanear(imagen, onProgress = null) {
        // Convertir a URL si es un File
        let imagenUrl = imagen;
        if (imagen instanceof File) {
            imagenUrl = URL.createObjectURL(imagen);
        } else if (imagen instanceof HTMLImageElement) {
            imagenUrl = imagen.src;
        }

        // Procesar con OCR
        const resultado = await Tesseract.recognize(imagenUrl, 'spa', {
            logger: m => {
                if (onProgress && m.status === 'recognizing text') {
                    onProgress(Math.round(m.progress * 100));
                }
            }
        });

        const texto = resultado.data.text;
        const productos = this.parsearProductos(texto);
        const total = this.buscarTotal(texto);

        return {
            productos: productos,
            total: total,
            texto: texto
        };
    },

    /**
     * Separa el texto en productos individuales
     * @param {string} texto - Texto del OCR
     * @returns {Array} Lista de productos
     */
    parsearProductos(texto) {
        const lineas = texto.split('\n').filter(l => l.trim());
        const productos = [];

        for (const linea of lineas) {
            const lineaLimpia = linea.trim();
            if (lineaLimpia.length < 3) continue;

            // Buscar precio al final de la línea
            const match = lineaLimpia.match(/(\d+[.,]\d{2})\s*€?$/);
            if (match) {
                const precio = parseFloat(match[1].replace(',', '.'));
                const nombre = lineaLimpia.replace(match[0], '').trim();

                if (nombre.length > 2 && precio > 0 && precio < 10000) {
                    productos.push({
                        nombre: nombre,
                        precio: precio,
                        categoria: this.clasificarProducto(nombre)
                    });
                }
            }
        }

        return productos.slice(0, 50);
    },

    /**
     * Busca el total del recibo en el texto
     * @param {string} texto - Texto del OCR
     * @returns {number} Total del recibo
     */
    buscarTotal(texto) {
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
    },

    /**
     * Clasifica un producto por su nombre
     * @param {string} nombre - Nombre del producto
     * @returns {string} Categoría
     */
    clasificarProducto(nombre) {
        const n = nombre.toLowerCase();
        if (n.includes('leche') || n.includes('pan') || n.includes('carne') || n.includes('fruta')) return 'alimentacion';
        if (n.includes('jabon') || n.includes('detergente')) return 'aseo';
        if (n.includes('taxi') || n.includes('gasolina')) return 'transporte';
        return 'otros';
    }
};

// Exportar para uso global
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RecibosScanner;
}

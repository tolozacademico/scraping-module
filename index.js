const express = require('express');
const { chromium } = require('playwright'); 
const app = express();

app.use(express.json());

// Conectar a BD primero
const conectarDB = require('./db');
conectarDB();

// Importar modelos y clases
const Supermarket = require('./models/Supermarket');
const Scraper = require('./scraper/Scraper');

// Ruta de prueba
app.get('/', (req, res) => {
    res.send('API REST funcionando 🚀');
});

app.put('/api/supermarkets/update-all-products', async (req, res) => {
    try {
        const supermercados = await Supermarket.find();
        console.log(`Actualizando ${supermercados.length} supermercados`);
        
        for (const supermercado of supermercados) {
            console.log(`Procesando: ${supermercado.nombre}`);
            const scraper = new Scraper(
                supermercado.urlBase,
                supermercado.endpoints,
                supermercado.selectores
            );
            const productos = await scraper.scrapeAll();
            
            console.log(`${supermercado.nombre}: ${productos.length} productos extraídos`);
            supermercado.productos = productos;
            await supermercado.save();
            console.log(`${supermercado.nombre}: productos guardados en BD`);
        }
        res.json({ mensaje: 'Productos actualizados para todos los supermercados' });
    } catch (error) {
        console.error('Error completo:', error.message);
        console.error('Stack trace:', error.stack);
        res.status(500).json({ 
            error: 'Error al actualizar productos',
            detalle: error.message 
        });
    }
});

// Agregar estas funciones antes del endpoint (en index.js)

/**
 * Determina si hay coincidencia fuzzy entre dos strings (versión mejorada)
 */
/**
 * Determina si hay coincidencia fuzzy entre dos strings (versión estricta para palabras completas)
 */
function esCoincidenciaFuzzy(nombreProducto, nombreBuscado) {
    const producto = nombreProducto.toLowerCase().trim();
    const buscado = nombreBuscado.toLowerCase().trim();
    
    // 1. Coincidencia exacta
    if (producto === buscado) return true;
    
    // 2. Buscar cada palabra del término buscado como palabra completa
    const palabrasBuscado = buscado.split(/\s+/).filter(p => p.length > 0);
    
    // Todas las palabras buscadas deben estar presentes como palabras completas
    const todasLasPalabrasPresentes = palabrasBuscado.every(palabraBuscada => {
        // Crear regex que busque la palabra completa (con límites de palabra \b)
        const palabraEscapada = palabraBuscada.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regexPalabraCompleta = new RegExp(`\\b${palabraEscapada}\\b`, 'i');
        
        return regexPalabraCompleta.test(producto);
    });
    
    return todasLasPalabrasPresentes;
}

/**
 * Calcula similitud entre dos strings (versión mejorada)
 */
function calcularSimilitud(str1, str2) {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();
    
    // Coincidencia exacta
    if (s1 === s2) return 1.0;
    
    const palabrasBuscado = s2.split(/\s+/).filter(p => p.length > 0);
    let coincidenciasCompletas = 0;
    let totalPalabras = palabrasBuscado.length;
    
    // Verificar cada palabra buscada
    palabrasBuscado.forEach(palabraBuscada => {
        const palabraEscapada = palabraBuscada.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regexPalabraCompleta = new RegExp(`\\b${palabraEscapada}\\b`, 'i');
        
        if (regexPalabraCompleta.test(s1)) {
            coincidenciasCompletas++;
        }
    });
    
    // Calcular similitud base
    const similitudBase = coincidenciasCompletas / totalPalabras;
    
    if (similitudBase === 0) return 0;
    
    // Bonus por coincidencia completa de todas las palabras
    if (coincidenciasCompletas === totalPalabras) {
        // Penalizar ligeramente según la diferencia de longitud
        const penalizacionLongitud = Math.min(s2.length / s1.length, 1.0);
        return 0.9 * penalizacionLongitud;
    }
    
    // Para coincidencias parciales
    return similitudBase * 0.7;
}

/**
 * Función auxiliar: quitar la función levenshteinDistance ya que no la usamos más
 */
// Se puede eliminar la función levenshteinDistance del código anterior

// Reemplazar el endpoint /api/supermarkets/search-products existente con esta versión unificada

app.post('/api/supermarkets/search-and-compare', async (req, res) => {
    try {
        const { supermercados, productos, soloMejoresPrecios = false } = req.body;

        // Validaciones
        if (!supermercados || !Array.isArray(supermercados) || supermercados.length === 0) {
            return res.status(400).json({ 
                error: 'Se requiere una lista de supermercados válida' 
            });
        }

        if (!productos || !Array.isArray(productos) || productos.length === 0) {
            return res.status(400).json({ 
                error: 'Se requiere una lista de productos válida' 
            });
        }

        console.log(`🔍 Buscando ${productos.length} productos en ${supermercados.length} supermercados`);

        // Buscar supermercados que coincidan (búsqueda flexible)
        const supermercadosEncontrados = await Supermarket.find({
            nombre: { 
                $in: supermercados.map(s => new RegExp(s.trim(), 'i')) 
            }
        });

        if (supermercadosEncontrados.length === 0) {
            return res.status(404).json({ 
                error: 'No se encontraron supermercados que coincidan',
                supermercadosBuscados: supermercados 
            });
        }

        console.log(`✅ Supermercados encontrados: ${supermercadosEncontrados.map(s => s.nombre).join(', ')}`);

        // Estructura de resultados detallados (como antes)
        const resultadosDetallados = [];

        // Lista plana de todos los productos para análisis de precios
        const todosLosProductos = [];

        // Para cada supermercado encontrado, buscar productos
        for (const supermercado of supermercadosEncontrados) {
            const productosEncontrados = [];

            // Para cada producto buscado, encontrar coincidencias
            for (const productoBuscado of productos) {
                const coincidencias = supermercado.productos.filter(producto => {
                    return esCoincidenciaFuzzy(producto.nombre, productoBuscado);
                });

                if (coincidencias.length > 0) {
                    const coincidenciasConSimilitud = coincidencias.map(p => ({
                        nombre: p.nombre,
                        precio: p.precio,
                        precioNumerico: extraerPrecioNumerico(p.precio),
                        similitud: calcularSimilitud(p.nombre, productoBuscado)
                    })).sort((a, b) => b.similitud - a.similitud);

                    productosEncontrados.push({
                        productoBuscado: productoBuscado,
                        coincidencias: coincidenciasConSimilitud
                    });

                    // Agregar a la lista plana para análisis de precios
                    coincidenciasConSimilitud.forEach(coincidencia => {
                        todosLosProductos.push({
                            productoBuscado: productoBuscado,
                            supermercado: supermercado.nombre,
                            nombre: coincidencia.nombre,
                            precio: coincidencia.precio,
                            precioNumerico: coincidencia.precioNumerico,
                            similitud: coincidencia.similitud
                        });
                    });
                }
            }

            resultadosDetallados.push({
                supermercado: supermercado.nombre,
                totalProductosEncontrados: productosEncontrados.length,
                productos: productosEncontrados
            });
        }

        // ANÁLISIS DE MEJORES PRECIOS
        const mejoresPrecios = {};
        const comparacionCompleta = {};
        
        const productosUnicos = [...new Set(todosLosProductos.map(p => p.productoBuscado))];

        productosUnicos.forEach(productoBuscado => {
            const productosEncontrados = todosLosProductos.filter(p => p.productoBuscado === productoBuscado);
            
            // Ordenar por precio numérico ascendente
            productosEncontrados.sort((a, b) => a.precioNumerico - b.precioNumerico);
            
            mejoresPrecios[productoBuscado] = {
                productoMasBarato: productosEncontrados[0],
                totalOpciones: productosEncontrados.length,
                ahorroMaximo: productosEncontrados.length > 1 ? 
                    productosEncontrados[productosEncontrados.length - 1].precioNumerico - productosEncontrados[0].precioNumerico : 0
            };

            comparacionCompleta[productoBuscado] = {
                todasLasOpciones: productosEncontrados,
                mejorPrecio: productosEncontrados[0].precioNumerico,
                peorPrecio: productosEncontrados[productosEncontrados.length - 1].precioNumerico
            };
        });

        // Estadísticas finales
        const totalCoincidencias = resultadosDetallados.reduce(
            (total, super_result) => total + super_result.totalProductosEncontrados, 0
        );

        const productosNoEncontrados = productos.filter(productoBuscado => 
            !resultadosDetallados.some(superResult => 
                superResult.productos.some(p => p.productoBuscado === productoBuscado)
            )
        );

        // Cálculos de ahorro y costo
        const totalAhorro = Object.values(mejoresPrecios).reduce((total, producto) => total + producto.ahorroMaximo, 0);
        const costoTotal = Object.values(mejoresPrecios).reduce((total, producto) => total + producto.productoMasBarato.precioNumerico, 0);

        // Resultado final unificado
        const resultado = {
            consulta: {
                supermercadosBuscados: supermercados,
                productosBuscados: productos
            },
            supermercadosEncontrados: supermercadosEncontrados.length,
            estadisticas: {
                totalCoincidencias,
                productosNoEncontrados,
                productosAnalizados: productosUnicos.length,
                costoTotalMejoresPrecios: costoTotal,
                ahorroTotalPosible: totalAhorro,
                supermercadosComparados: [...new Set(todosLosProductos.map(p => p.supermercado))]
            },
            mejoresPrecios: mejoresPrecios,
            ...(soloMejoresPrecios ? {} : { 
                resultadosDetallados: resultadosDetallados,
                comparacionCompleta: comparacionCompleta 
            })
        };

        res.json(resultado);

    } catch (error) {
        console.error('Error en búsqueda y comparación de productos:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            detalle: error.message 
        });
    }
});

/**
 * Extrae el valor numérico de un precio en formato string
 */
function extraerPrecioNumerico(precioString) {
    if (!precioString) return 0;
    
    // Remover símbolos de moneda, espacios y otros caracteres no numéricos excepto puntos y comas
    const numeroLimpio = precioString
        .replace(/[\$\€\£\₹\¥]/g, '') // Remover símbolos de moneda
        .replace(/\s/g, '') // Remover espacios
        .replace(/[^\d.,]/g, ''); // Mantener solo dígitos, puntos y comas
    
    // Manejar diferentes formatos de números
    if (numeroLimpio.includes('.') && !numeroLimpio.includes(',')) {
        const partes = numeroLimpio.split('.');
        if (partes.length === 2 && partes[1].length === 3) {
            // Es separador de miles: 1.450 -> 1450
            return parseInt(numeroLimpio.replace('.', ''), 10);
        } else {
            // Es decimal: 1.45 -> 1.45
            return parseFloat(numeroLimpio);
        }
    }
    
    if (numeroLimpio.includes(',')) {
        return parseFloat(numeroLimpio.replace(',', '.'));
    }
    
    return parseInt(numeroLimpio, 10) || 0;
}

// Importar las rutas del supermercado
const supermarketRoutes = require('./routes/supermarketRoutes');
app.use('/api/supermarkets', supermarketRoutes);

// Puerto
const PORT = 3005;
app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
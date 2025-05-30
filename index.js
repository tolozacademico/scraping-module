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

// Importar las rutas del supermercado
const supermarketRoutes = require('./routes/supermarketRoutes');
app.use('/api/supermarkets', supermarketRoutes);

// Puerto
const PORT = 3005;
app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
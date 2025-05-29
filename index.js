const express = require('express');
const { chromium } = require('playwright'); 
const app = express();

app.use(express.json());

// Ruta de prueba
app.get('/', (req, res) => {
res.send('API REST funcionando 🚀');
});

const Supermarket = require('./models/Supermarket');
const Scraper = require('./scraper/Scraper');

app.put('/api/supermarkets/update-all-products', async (req, res) => {
    try {
        const supermercados = await Supermarket.find();
        for (const supermercado of supermercados) {
            const scraper = new Scraper(
                supermercado.urlBase,
                supermercado.endpoints,
                supermercado.selectores
            );
            const productos = await scraper.scrapeAll();
            supermercado.productos = productos;
            await supermercado.save();
        }
        res.json({ mensaje: 'Productos actualizados para todos los supermercados' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al actualizar productos' });
    }
});

// Ruta que ejecuta el scraping
app.get('/scrap', async (req, res) => {
    try {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto('https://domicilios.tiendasd1.com/ca/extraordinarios/EXTRAORDINARIOS');

    const products = await page.$$eval('.general__content', (items) =>
        items.map((item) => {
            const precio = item.querySelector('p[class*="CardBasePrice"]')?.innerText.trim();
            const nombre = item.querySelector('p[class*="CardName"]')?.innerText.trim();
            return { nombre, precio };
        })
    );

    await browser.close();
    res.json(products);
    } catch (error) {
    console.error('Error durante el scraping:', error);
    res.status(500).send('Error al realizar scraping');
    }
});

// Puerto
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
});

// Si tienes conexión a BD, la cargas al final (de forma opcional)
const conectarDB = require('./db');
conectarDB();

// Importar las rutas del supermercado
const supermarketRoutes = require('./routes/supermarketRoutes');

app.use('/api/supermarkets', supermarketRoutes);

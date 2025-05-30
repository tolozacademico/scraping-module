const { chromium } = require('playwright');

class Scraper {
    constructor(baseUrl, endpoints, selectores) {
        // Asegurar que baseUrl termine con / y endpoints no empiecen con /
        this.baseUrl = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
        this.endpoints  = endpoints.map(ep => ep.startsWith('/') ? ep.substring(1) : ep);
        this.selectores = selectores;
    }

    async scrapeAll() {
    const browser = await chromium.launch({ headless: true });
    let allProducts = [];
    try {
        console.log(`Scraper iniciando para ${this.endpoints.length} endpoints.`);
        for (const endpoint of this.endpoints) {
            const url = this.baseUrl + endpoint;
            console.log(`--- Scrapeando URL: ${url} ---`);
            
            const page = await browser.newPage();
            
            try {
                await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 80000 });
                console.log(`Página cargada: ${url}`);
                
                const selectorNombre = this.selectores.nombre;
                const selectorPrecio = this.selectores.precio;

                if (!selectorNombre || !selectorPrecio) {
                    console.error(`❌ Selectores de nombre o precio no definidos para ${url}`);
                    await page.close();
                    continue;
                }

                // ESPERA INTELIGENTE EN LUGAR DE FIJA
                console.log(`🔍 Esperando carga de productos en ${url}...`);
                try {
                    await page.waitForSelector(selectorNombre, { 
                        timeout: 20000, 
                        state: 'visible' 
                    });
                    console.log(`✅ Productos detectados en ${url}`);
                    await page.waitForTimeout(3000); // Espera adicional para más productos
                } catch (waitError) {
                    console.warn(`⚠️ No se detectaron productos iniciales en ${url}, intentando estrategias adicionales...`);
                    
                    // Scroll para activar lazy loading
                    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
                    await page.waitForTimeout(5000);
                    
                    // Buscar botón "cargar más"
                    const loadMoreButton = await page.$('button[class*="load"], button[class*="cargar"], a[class*="more"], button[class*="ver"]').catch(() => null);
                    if (loadMoreButton) {
                        console.log(`🔄 Haciendo clic en "cargar más"...`);
                        await loadMoreButton.click();
                        await page.waitForTimeout(5000);
                    }
                }

                console.log(`Usando selector de nombre: "${selectorNombre}"`);
                console.log(`Usando selector de precio: "${selectorPrecio}"`);

                // Resto del código sin cambios...
                const nombres = await page.$$eval(selectorNombre, nodes => 
                    nodes.map(n => n.innerText.trim()).filter(Boolean)
                ).catch(err => {
                    console.error(`Error extrayendo nombres de ${url}: ${err.message}`);
                    return [];
                });
                
                const precios = await page.$$eval(selectorPrecio, nodes => 
                    nodes.map(n => n.innerText.trim()).filter(Boolean)
                ).catch(err => {
                    console.error(`Error extrayendo precios de ${url}: ${err.message}`);
                    return [];
                });

                console.log(`Nombres encontrados en ${url}: ${nombres.length}`);
                console.log(`Precios encontrados en ${url}: ${precios.length}`);

                const minLength = Math.min(nombres.length, precios.length);
                const productosPagina = [];
                for (let i = 0; i < minLength; i++) {
                    productosPagina.push({
                        nombre: nombres[i],
                        precio: precios[i]
                    });
                }

                if (productosPagina.length > 0) {
                    console.log(`✅ ${productosPagina.length} productos extraídos de ${url}. Ejemplo:`, productosPagina[0]);
                } else if (nombres.length > 0 || precios.length > 0) {
                    console.warn(`⚠️ Discrepancia en ${url}: ${nombres.length} nombres vs ${precios.length} precios.`);
                } else {
                    console.log(`ℹ️ No se encontraron productos en ${url}`);
                }
                
                allProducts = allProducts.concat(productosPagina);
                
            } catch (pageError) {
                console.error(`❌ Error procesando ${url}: ${pageError.message}`);
            } finally {
                await page.close();
            }
        }
    } catch (browserError) {
        console.error(`❌ Error general del browser: ${browserError.message}`);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
    console.log(`🏁 Scraping finalizado. Total productos: ${allProducts.length}`);
    return allProducts;
}
}

module.exports = Scraper;
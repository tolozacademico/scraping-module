const { chromium } = require('playwright');

class Scraper {
    constructor(baseUrl, endpoints, selectores) {
        this.baseUrl = baseUrl;
        this.endpoints = endpoints;
        this.selectores = selectores;
    }

    async scrapeAll() {
        const browser = await chromium.launch({ headless: true });
        let allProducts = [];
        try {
            for (const endpoint of this.endpoints) {
                const url = this.baseUrl + endpoint;
                const page = await browser.newPage();
                await page.goto(url);

                const productos = await page.$$eval(this.selectores.container, (items, selectores) =>
                    items.map(item => ({
                        nombre: item.querySelector(selectores.nombre)?.innerText.trim(),
                        precio: item.querySelector(selectores.precio)?.innerText.trim()
                    })),
                    this.selectores
                );
                allProducts = allProducts.concat(productos);
                await page.close();
            }
        } finally {
            await browser.close();
        }
        return allProducts;
    }
}

module.exports = Scraper;
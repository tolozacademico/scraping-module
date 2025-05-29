const mongoose = require('mongoose');

const conectarDB = async () => {
    try {
    await mongoose.connect('mongodb+srv://module_scraping:module_scraping2025@cluster0.arp1j.mongodb.net/scraping?retryWrites=true&w=majority&appName=Cluster0', {
    });
    console.log('📦 Conexión a MongoDB exitosa');
    } catch (error) {
    console.error('❌ Error al conectar a MongoDB', error);
    process.exit(1);
    }
};

module.exports = conectarDB;


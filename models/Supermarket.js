const mongoose = require('mongoose');

const supermarketSchema = new mongoose.Schema({
    nombre: { type: String, required: true, unique: true },
    urlBase: { type: String, required: true },
    endpoints: [{ type: String }],
    selectores: {
        precio: { type: String, required: true },
        nombre: { type: String, required: true }
        // Eliminamos container
    },
    productos: [
        {
            nombre: String,
            precio: String
        }
    ]
});

module.exports = mongoose.model('Supermarket', supermarketSchema);
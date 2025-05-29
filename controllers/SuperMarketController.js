const Supermarket = require('../models/Supermarket');

// Crear un nuevo supermercado
const createSupermarket = async (req, res) => {
    try {
        const nuevoSupermercado = new Supermarket(req.body);
        const guardado = await nuevoSupermercado.save();
        res.status(201).json(guardado);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Obtener todos los supermercados
const getSupermarkets = async (req, res) => {
    try {
        const supermercados = await Supermarket.find();
        res.status(200).json(supermercados);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Obtener un supermercado por nombre
const getSupermarketByNombre = async (req, res) => {
    try {
        const supermercado = await Supermarket.findOne({ nombre: req.params.nombre });
        if (!supermercado) {
            return res.status(404).json({ error: 'Supermercado no encontrado' });
        }
        res.status(200).json(supermercado);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Actualizar un supermercado por nombre
const updateSupermarketByNombre = async (req, res) => {
    try {
        const actualizado = await Supermarket.findOneAndUpdate(
            { nombre: req.params.nombre },
            req.body,
            { new: true, runValidators: true }
        );
        if (!actualizado) {
            return res.status(404).json({ error: 'Supermercado no encontrado' });
        }
        res.status(200).json(actualizado);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Eliminar un supermercado por nombre
const deleteSupermarketByNombre = async (req, res) => {
    try {
        const eliminado = await Supermarket.findOneAndDelete({ nombre: req.params.nombre });
        if (!eliminado) {
            return res.status(404).json({ error: 'Supermercado no encontrado' });
        }
        res.status(200).json({ mensaje: 'Supermercado eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const updateProductos = async (req, res) => {
    try {
        const actualizado = await Supermarket.findOneAndUpdate(
            { nombre: req.params.nombre },
            { productos: req.body.productos },
            { new: true, runValidators: true }
        );
        if (!actualizado) {
            return res.status(404).json({ error: 'Supermercado no encontrado' });
        }
        res.status(200).json(actualizado);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

module.exports = {
    createSupermarket,
    getSupermarkets,
    getSupermarketByNombre,
    updateSupermarketByNombre,
    deleteSupermarketByNombre,
    updateProductos
};
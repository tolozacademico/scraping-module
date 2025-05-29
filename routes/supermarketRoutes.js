const express = require('express');
const router = express.Router();
const controller = require('../controllers/SuperMarketController');

router.post('/', controller.createSupermarket);
router.get('/', controller.getSupermarkets);
router.get('/:nombre', controller.getSupermarketByNombre);
router.put('/:nombre', controller.updateSupermarketByNombre);
router.put('/:nombre/productos', controller.updateProductos);
router.delete('/:nombre', controller.deleteSupermarketByNombre);


module.exports = router;

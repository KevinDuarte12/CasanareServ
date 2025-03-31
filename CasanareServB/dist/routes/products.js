"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const validate_token_1 = __importDefault(require("./validate-token"));
const product_controller_1 = require("../controllers/product.controller");
const router = (0, express_1.Router)();
// Rutas GET
router.get('/', product_controller_1.getProduct); // Obtener todos los productos validarToken,
router.get('/:id', validate_token_1.default, product_controller_1.getProductById); // Obtener un producto por ID
// Ruta POST
router.post('/', product_controller_1.createProduct); // Crear nuevo producto validarToken,
// Ruta PUT
router.put('/:id', validate_token_1.default, product_controller_1.updateProduct); // Actualizar producto
// Ruta DELETE
router.delete('/:id', validate_token_1.default, product_controller_1.deleteProduct); // Eliminar producto
exports.default = router;

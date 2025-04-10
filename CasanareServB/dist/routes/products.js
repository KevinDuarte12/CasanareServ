"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const validate_request_1 = require("../middlewares/validate-request");
const validate_token_1 = __importDefault(require("../middlewares/validate-token"));
const product_controller_1 = require("../controllers/product.controller");
const router = (0, express_1.Router)();
// Rutas públicas
router.get('/', product_controller_1.getProducts);
router.get('/:id', [
    (0, express_validator_1.check)('id', 'El ID debe ser un número válido').isNumeric(),
    validate_request_1.validateFields
], product_controller_1.getProductById);
// Rutas protegidas
router.post('/', [
    validate_token_1.default,
    (0, express_validator_1.check)('id_user', 'El ID de usuario es obligatorio').notEmpty(),
    (0, express_validator_1.check)('id_category', 'El ID de categoría es obligatorio').notEmpty(),
    (0, express_validator_1.check)('name', 'El nombre del producto es obligatorio').notEmpty(),
    (0, express_validator_1.check)('price', 'El precio es obligatorio').notEmpty(),
    (0, express_validator_1.check)('price', 'El precio debe ser un número').isNumeric(),
    validate_request_1.validateFields
], product_controller_1.createProduct);
router.put('/:id', [
    validate_token_1.default,
    (0, express_validator_1.check)('id', 'El ID debe ser un número válido').isNumeric(),
    validate_request_1.validateFields
], product_controller_1.updateProduct);
router.delete('/:id', [
    validate_token_1.default,
    (0, express_validator_1.check)('id', 'El ID debe ser un número válido').isNumeric(),
    validate_request_1.validateFields
], product_controller_1.deleteProduct);
router.patch('/:id/status', [
    validate_token_1.default,
    (0, express_validator_1.check)('id', 'El ID debe ser un número válido').isNumeric(),
    (0, express_validator_1.check)('newStatus', 'El nuevo status es obligatorio').notEmpty(),
    validate_request_1.validateFields
], product_controller_1.toggleProductStatus);
exports.default = router;

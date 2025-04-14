"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const validate_request_1 = require("../middlewares/validate-request");
const validate_token_1 = __importDefault(require("../middlewares/validate-token"));
const productController = __importStar(require("../controllers/product.controller"));
const product_controller_1 = require("../controllers/product.controller");
const router = (0, express_1.Router)();
// Rutas públicas
router.get('/recent', product_controller_1.getRecentProducts); // Ruta nueva para productos recientes
router.get('/paginated', product_controller_1.getPaginatedProducts);
router.get('/', product_controller_1.getProducts);
router.get('/:id', [
    (0, express_validator_1.check)('id', 'El ID debe ser un número válido').isNumeric(),
    validate_request_1.validateFields
], product_controller_1.getProductById);
router.get('/category/:categoryId', productController.getProductsByCategory);
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

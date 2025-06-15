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
/**
 * 📦 RUTAS DE PRODUCTOS
 * Sistema completo de gestión de productos del marketplace
 * Incluye consultas públicas, filtros avanzados y operaciones CRUD protegidas
 */
const router = (0, express_1.Router)();
//📋 RUTAS PÚBLICAS (sin autenticación)
// Obtener productos recientes (últimos agregados)
router.get('/recent', product_controller_1.getRecentProducts);
// Obtener productos con paginación (para listados grandes)
router.get('/paginated', product_controller_1.getPaginatedProducts);
// Obtener todos los productos
router.get('/', product_controller_1.getProducts);
// Obtener producto específico por ID
router.get('/:id', [
    (0, express_validator_1.check)('id', 'El ID debe ser un número válido').isNumeric(), // Validar formato ID
    validate_request_1.validateFields // Verificar errores de validación
], product_controller_1.getProductById);
// 🏷️ RUTAS DE FILTRADO POR CATEGORÍA
// Obtener productos de una categoría específica
router.get('/category/:categoryId', productController.getProductsByCategory);
// 👤 RUTAS DE CONSULTA POR USUARIO
// Obtener productos de un usuario específico
router.get('/user/:userId', [
    (0, express_validator_1.check)('userId', 'El ID del usuario debe ser un número válido').isNumeric(), // Validar ID usuario
    validate_request_1.validateFields // Verificar errores
], productController.getProductsByUser);
// 🔍 RUTAS DE FILTRADO POR DISPONIBILIDAD
// Obtener solo productos disponibles (activos y en stock)
router.get('/available', productController.getAvailableProducts);
// 🔐 RUTAS PROTEGIDAS (requieren autenticación)
// Crear nuevo producto
router.post('/', [
    validate_token_1.default, // Usuario autenticado
    (0, express_validator_1.check)('id_user', 'El ID de usuario es obligatorio').notEmpty(), // Usuario propietario
    (0, express_validator_1.check)('id_category', 'El ID de categoría es obligatorio').notEmpty(), // Categoría requerida
    (0, express_validator_1.check)('name', 'El nombre del producto es obligatorio').notEmpty(), // Nombre obligatorio
    (0, express_validator_1.check)('price', 'El precio es obligatorio').notEmpty(), // Precio requerido
    (0, express_validator_1.check)('price', 'El precio debe ser un número').isNumeric(), // Formato numérico
    validate_request_1.validateFields // Validar todos los campos
], product_controller_1.createProduct);
// Actualizar producto existente
router.put('/:id', [
    validate_token_1.default, // Usuario autenticado
    (0, express_validator_1.check)('id', 'El ID debe ser un número válido').isNumeric(), // ID válido
    validate_request_1.validateFields // Verificar errores
], product_controller_1.updateProduct);
// Eliminar producto (borrado lógico o físico)
router.delete('/:id', [
    validate_token_1.default, // Usuario autenticado
    (0, express_validator_1.check)('id', 'El ID debe ser un número válido').isNumeric(), // ID válido
    validate_request_1.validateFields // Verificar errores
], product_controller_1.deleteProduct);
// Cambiar estado del producto (activo/inactivo)
router.patch('/:id/status', [
    validate_token_1.default, // Usuario autenticado
    (0, express_validator_1.check)('id', 'El ID debe ser un número válido').isNumeric(), // ID válido
    (0, express_validator_1.check)('newStatus', 'El nuevo status es obligatorio').notEmpty(), // Estado requerido
    validate_request_1.validateFields // Validar campos
], product_controller_1.toggleProductStatus);
exports.default = router;

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const validate_request_1 = require("../middlewares/validate-request");
const validate_token_1 = __importDefault(require("../middlewares/validate-token"));
const validate_admin_1 = require("../middlewares/validate-admin");
const category_controller_1 = require("../controllers/category.controller");
/**
 * 🏷️ RUTAS DE CATEGORÍAS
 * Gestiona todas las operaciones CRUD de categorías del sistema
 * Incluye rutas públicas para consulta y rutas administrativas para gestión
 */
const router = (0, express_1.Router)();
// 📋 RUTAS PÚBLICAS (sin autenticación)
// Obtener todas las categorías disponibles
router.get('/', category_controller_1.getCategories);
// Obtener categoría específica por ID
router.get('/:id', [
    (0, express_validator_1.check)('id', 'El ID debe ser un número válido').isNumeric(), // Validar formato del ID
    validate_request_1.validateFields // Verificar errores de validación
], category_controller_1.getCategoryById);
// 👑 RUTAS ADMINISTRATIVAS (requieren autenticación y rol admin)
// Crear nueva categoría
router.post('/', [
    validate_token_1.default, // Usuario autenticado
    validate_admin_1.isAdmin, // Solo administradores
    (0, express_validator_1.check)('name', 'El nombre es obligatorio').notEmpty(), // Nombre requerido
    (0, express_validator_1.check)('name', 'El nombre debe tener entre 3 y 50 caracteres').isLength({ min: 3, max: 50 }), // Longitud válida
    validate_request_1.validateFields // Verificar errores de validación
], category_controller_1.createCategory);
// Actualizar categoría existente
router.put('/:id', [
    validate_token_1.default, // Usuario autenticado
    validate_admin_1.isAdmin, // Solo administradores
    (0, express_validator_1.check)('id', 'El ID debe ser un número válido').isNumeric(), // ID válido
    (0, express_validator_1.check)('name', 'El nombre debe tener entre 3 y 50 caracteres').optional().isLength({ min: 3, max: 50 }), // Nombre opcional pero válido
    validate_request_1.validateFields // Verificar errores de validación
], category_controller_1.updateCategory);
// Eliminar categoría (borrado lógico o físico)
router.delete('/:id', [
    validate_token_1.default, // Usuario autenticado
    validate_admin_1.isAdmin, // Solo administradores
    (0, express_validator_1.check)('id', 'El ID debe ser un número válido').isNumeric(), // ID válido
    validate_request_1.validateFields // Verificar errores de validación
], category_controller_1.deleteCategory);
// Alternar estado activo/inactivo de categoría
router.patch('/:id/toggle-status', [
    validate_token_1.default, // Usuario autenticado
    validate_admin_1.isAdmin, // Solo administradores
    (0, express_validator_1.check)('id', 'El ID debe ser un número válido').isNumeric(), // ID válido
    validate_request_1.validateFields // Verificar errores de validación
], category_controller_1.toggleCategoryStatus);
exports.default = router;

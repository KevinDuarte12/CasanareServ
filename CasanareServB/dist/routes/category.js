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
const router = (0, express_1.Router)();
// Rutas públicas
router.get('/', category_controller_1.getCategories);
router.get('/:id', [
    (0, express_validator_1.check)('id', 'El ID debe ser un número válido').isNumeric(),
    validate_request_1.validateFields
], category_controller_1.getCategoryById);
// Rutas protegidas
router.post('/', [
    validate_token_1.default,
    validate_admin_1.isAdmin,
    (0, express_validator_1.check)('name', 'El nombre es obligatorio').notEmpty(),
    (0, express_validator_1.check)('name', 'El nombre debe tener entre 3 y 50 caracteres').isLength({ min: 3, max: 50 }),
    validate_request_1.validateFields
], category_controller_1.createCategory);
router.put('/:id', [
    validate_token_1.default,
    validate_admin_1.isAdmin,
    (0, express_validator_1.check)('id', 'El ID debe ser un número válido').isNumeric(),
    (0, express_validator_1.check)('name', 'El nombre debe tener entre 3 y 50 caracteres').optional().isLength({ min: 3, max: 50 }),
    validate_request_1.validateFields
], category_controller_1.updateCategory);
router.delete('/:id', [
    validate_token_1.default,
    validate_admin_1.isAdmin,
    (0, express_validator_1.check)('id', 'El ID debe ser un número válido').isNumeric(),
    validate_request_1.validateFields
], category_controller_1.deleteCategory);
router.patch('/:id/toggle-status', [
    validate_token_1.default,
    validate_admin_1.isAdmin,
    (0, express_validator_1.check)('id', 'El ID debe ser un número válido').isNumeric(),
    validate_request_1.validateFields
], category_controller_1.toggleCategoryStatus);
exports.default = router;

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const validate_request_1 = require("../middlewares/validate-request");
const validate_token_1 = __importDefault(require("../middlewares/validate-token"));
const barter_controller_1 = require("../controllers/barter.controller");
const router = (0, express_1.Router)();
// Obtener todos los trueques
router.get('/', barter_controller_1.getBarters);
// Obtener un trueque específico por ID
router.get('/:id', barter_controller_1.getBarterById);
// Crear un nuevo trueque
router.post('/', [
    validate_token_1.default,
    (0, express_validator_1.check)('id_user_offer', 'El ID del usuario oferente es obligatorio').notEmpty(),
    validate_request_1.validateFields
], barter_controller_1.createBarter);
// Actualizar el estado de un trueque
router.patch('/:id/status', [
    validate_token_1.default,
    (0, express_validator_1.check)('status', 'El estado es obligatorio').isIn(['pendiente', 'aceptado', 'rechazado', 'completado']),
    validate_request_1.validateFields
], barter_controller_1.updateBarterStatus);
// Actualizar un trueque completo (no solo su estado)
router.put('/:id', [
    validate_token_1.default,
    (0, express_validator_1.check)('id_user_offer', 'El ID del usuario oferente es obligatorio').notEmpty(),
    validate_request_1.validateFields
], barter_controller_1.updateBarter);
// Eliminar un trueque
router.delete('/:id', [
    validate_token_1.default
], barter_controller_1.deleteBarter);
// Obtener los trueques de un usuario
router.get('/user/:userId', [
    validate_token_1.default
], barter_controller_1.getUserBarters);
// Publicar un producto para trueque (sin receptor específico)
router.post('/publication', [
    validate_token_1.default,
    (0, express_validator_1.check)('id_prod_offer', 'El ID del producto es obligatorio').notEmpty(),
    (0, express_validator_1.check)('id_user_offer', 'El ID del usuario es obligatorio').notEmpty(),
    validate_request_1.validateFields
], barter_controller_1.createBarterPublication);
exports.default = router;

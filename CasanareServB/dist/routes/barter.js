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
// Rutas públicas (solo para visualización, en un entorno real estas deberían ser protegidas)
router.get('/', barter_controller_1.getBarters);
router.get('/:id', [
    (0, express_validator_1.check)('id', 'El ID debe ser un número válido').isNumeric(),
    validate_request_1.validateFields
], barter_controller_1.getBarterById);
// Rutas protegidas
router.post('/', [
    validate_token_1.default,
    (0, express_validator_1.check)('id_prod_offer', 'El ID del producto ofrecido es obligatorio').notEmpty(),
    (0, express_validator_1.check)('id_prod_offer', 'El ID del producto ofrecido debe ser un número').isNumeric(),
    (0, express_validator_1.check)('id_prod_request', 'El ID del producto solicitado es obligatorio').notEmpty(),
    (0, express_validator_1.check)('id_prod_request', 'El ID del producto solicitado debe ser un número').isNumeric(),
    (0, express_validator_1.check)('id_user_offer', 'El ID del usuario oferente es obligatorio').notEmpty(),
    (0, express_validator_1.check)('id_user_offer', 'El ID del usuario oferente debe ser un número').isNumeric(),
    (0, express_validator_1.check)('id_user_receiving', 'El ID del usuario receptor es obligatorio').notEmpty(),
    (0, express_validator_1.check)('id_user_receiving', 'El ID del usuario receptor debe ser un número').isNumeric(),
    validate_request_1.validateFields
], barter_controller_1.createBarter);
router.patch('/:id/status', [
    validate_token_1.default
], barter_controller_1.updateBarterStatus);
router.delete('/:id', [
    validate_token_1.default,
    (0, express_validator_1.check)('id', 'El ID debe ser un número válido').isNumeric(),
    validate_request_1.validateFields
], barter_controller_1.deleteBarter);
exports.default = router;

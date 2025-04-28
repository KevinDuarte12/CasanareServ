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
// Rutas existentes...
// Añadir esta nueva ruta
router.post('/publication', [
    validate_token_1.default,
    (0, express_validator_1.check)('id_prod_offer', 'El ID del producto es obligatorio').notEmpty(),
    (0, express_validator_1.check)('id_user_offer', 'El ID del usuario es obligatorio').notEmpty(),
    validate_request_1.validateFields
], barter_controller_1.createBarterPublication);
exports.default = router;

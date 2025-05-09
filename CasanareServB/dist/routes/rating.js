"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const rating_controller_1 = require("../controllers/rating.controller");
const validate_token_1 = __importDefault(require("../middlewares/validate-token"));
const router = (0, express_1.Router)();
// Crear una calificación (requiere autenticación)
router.post('/', validate_token_1.default, rating_controller_1.createRating);
// Obtener calificaciones de un producto específico
router.get('/product/:productId', rating_controller_1.getProductRatings);
// Obtener calificaciones de un usuario específico
router.get('/user/:userId', rating_controller_1.getUserRatings);
// Eliminar una calificación (requiere autenticación)
router.delete('/:id', validate_token_1.default, rating_controller_1.deleteRating);
exports.default = router;

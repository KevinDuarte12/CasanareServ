"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const rating_controller_1 = require("../controllers/rating.controller");
const validate_token_1 = __importDefault(require("../middlewares/validate-token"));
const image_controller_1 = require("../controllers/image.controller"); // ✅ IMPORTAR upload desde image.controller
const router = (0, express_1.Router)();
// ✅ ACTUALIZAR: Crear una calificación con soporte para múltiples imágenes
router.post('/', validate_token_1.default, image_controller_1.upload.array('images', 3), // ✅ AGREGAR upload de múltiples imágenes (máximo 3)
rating_controller_1.createRating);
// Obtener calificaciones de un producto específico
router.get('/product/:productId', rating_controller_1.getProductRatings);
// Obtener calificaciones de un usuario específico
router.get('/user/:userId', rating_controller_1.getUserRatings);
// Eliminar una calificación (requiere autenticación)
router.delete('/:id', validate_token_1.default, rating_controller_1.deleteRating);
exports.default = router;

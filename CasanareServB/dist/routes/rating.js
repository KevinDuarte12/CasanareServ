"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const rating_controller_1 = require("../controllers/rating.controller");
const validate_token_1 = __importDefault(require("../middlewares/validate-token"));
const image_controller_1 = require("../controllers/image.controller");
/**
 *  RUTAS DE CALIFICACIONES Y RESEÑAS
 * Sistema de rating con soporte para imágenes de evidencia
 * Permite calificar productos con fotos y gestionar reseñas
 */
const router = (0, express_1.Router)();
//  RUTAS DE CREACIÓN DE CALIFICACIONES
// Crear una calificación con soporte para múltiples imágenes
router.post('/', validate_token_1.default, // Usuario autenticado requerido
image_controller_1.upload.array('images', 3), // Subir hasta 3 imágenes de evidencia
rating_controller_1.createRating // Procesar calificación con fotos
);
// 🔍 RUTAS DE CONSULTA DE CALIFICACIONES
// Obtener calificaciones de un producto específico
router.get('/product/:productId', rating_controller_1.getProductRatings);
// Obtener calificaciones de un usuario específico
router.get('/user/:userId', rating_controller_1.getUserRatings);
//  RUTAS DE GESTIÓN
// Eliminar una calificación (requiere autenticación)
router.delete('/:id', validate_token_1.default, // Solo usuario autenticado puede eliminar
rating_controller_1.deleteRating // Eliminar calificación y sus imágenes
);
exports.default = router;

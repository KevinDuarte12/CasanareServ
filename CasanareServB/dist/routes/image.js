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
const validate_token_1 = __importDefault(require("../middlewares/validate-token"));
const imageController = __importStar(require("../controllers/image.controller"));
/**
 * 🖼️ RUTAS DE GESTIÓN DE IMÁGENES
 * Sistema polimórfico de imágenes para múltiples entidades
 * Soporta carga individual, múltiple y gestión completa de archivos
 */
const router = (0, express_1.Router)();
// 📤 RUTAS DE CARGA DE IMÁGENES
// Subir una sola imagen
router.post('/upload', validate_token_1.default, // Autenticación requerida
imageController.upload.single('image'), // Middleware multer para un archivo
imageController.uploadImage // Procesar y guardar imagen individual
);
// Subir múltiples imágenes (máximo 5)
router.post('/upload-multiple', validate_token_1.default, // Usuario autenticado
imageController.upload.array('images', 5), // Multer para múltiples archivos (límite 5)
imageController.uploadMultipleImages // Procesar y guardar imágenes múltiples
);
// 🔍 RUTAS DE CONSULTA DE IMÁGENES
// Obtener imágenes por entidad específica (polimórfico)
router.get('/:entity_type/:entity_id', imageController.getImagesByEntity // Buscar por tipo y ID de entidad
);
// 🗑️ RUTAS DE GESTIÓN DE IMÁGENES
// Eliminar una imagen específica
router.delete('/:id', validate_token_1.default, // Usuario autenticado
imageController.deleteImage // Eliminar archivo y registro
);
// 🌟 RUTAS DE CONFIGURACIÓN
// Establecer imagen como principal/destacada
router.patch('/:id/main', validate_token_1.default, // Usuario autenticado
imageController.setMainImage // Marcar como imagen principal
);
exports.default = router;

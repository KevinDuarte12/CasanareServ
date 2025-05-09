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
const router = (0, express_1.Router)();
// Ruta existente para subir una sola imagen
router.post('/upload', validate_token_1.default, imageController.upload.single('image'), imageController.uploadImage);
// NUEVA RUTA: Para subir múltiples imágenes (máximo 5)
router.post('/upload-multiple', validate_token_1.default, imageController.upload.array('images', 5), // 'images' es el nombre del campo, 5 es el máximo
imageController.uploadMultipleImages);
// Obtener imágenes por entidad
router.get('/:entity_type/:entity_id', imageController.getImagesByEntity);
// Eliminar una imagen
router.delete('/:id', validate_token_1.default, imageController.deleteImage);
// Establecer imagen principal
router.patch('/:id/main', validate_token_1.default, imageController.setMainImage);
exports.default = router;

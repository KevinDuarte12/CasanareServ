import { Router } from 'express';
import  validateToken  from '../middlewares/validate-token';
import * as imageController from '../controllers/image.controller';
/**
 * 🖼️ RUTAS DE GESTIÓN DE IMÁGENES
 * Sistema polimórfico de imágenes para múltiples entidades
 * Soporta carga individual, múltiple y gestión completa de archivos
 */
const router = Router();
// 📤 RUTAS DE CARGA DE IMÁGENES
// Subir una sola imagen
router.post(
  '/upload',
  validateToken as any,                      // Autenticación requerida
  imageController.upload.single('image'),    // Middleware multer para un archivo
  imageController.uploadImage as any         // Procesar y guardar imagen individual
);
// Subir múltiples imágenes (máximo 5)
router.post(
  '/upload-multiple',
  validateToken as any,                      // Usuario autenticado
  imageController.upload.array('images', 5), // Multer para múltiples archivos (límite 5)
  imageController.uploadMultipleImages as any // Procesar y guardar imágenes múltiples
);
// 🔍 RUTAS DE CONSULTA DE IMÁGENES

// Obtener imágenes por entidad específica (polimórfico)
router.get(
  '/:entity_type/:entity_id',
  imageController.getImagesByEntity as any   // Buscar por tipo y ID de entidad
);
// 🗑️ RUTAS DE GESTIÓN DE IMÁGENES

// Eliminar una imagen específica
router.delete(
  '/:id',
  validateToken as any,                      // Usuario autenticado
  imageController.deleteImage as any         // Eliminar archivo y registro
);
// 🌟 RUTAS DE CONFIGURACIÓN

// Establecer imagen como principal/destacada
router.patch(
  '/:id/main',
  validateToken as any,                      // Usuario autenticado
  imageController.setMainImage as any        // Marcar como imagen principal
);
export default router;
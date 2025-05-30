import { Router } from 'express';
import  validateToken  from '../middlewares/validate-token';
import * as imageController from '../controllers/image.controller';

const router = Router();

// Ruta existente para subir una sola imagen
router.post(
  '/upload',
  validateToken as any,
  imageController.upload.single('image'),
  imageController.uploadImage as any
);

// NUEVA RUTA: Para subir múltiples imágenes (máximo 5)
router.post(
  '/upload-multiple',
  validateToken as any,
  imageController.upload.array('images', 5), // 'images' es el nombre del campo, 5 es el máximo
  imageController.uploadMultipleImages as any
);

// Obtener imágenes por entidad
router.get(
  '/:entity_type/:entity_id',
  imageController.getImagesByEntity as any
);

// Eliminar una imagen
router.delete(
  '/:id',
  validateToken as any,
  imageController.deleteImage as any
);

// Establecer imagen principal
router.patch(
  '/:id/main',
  validateToken as any,
  imageController.setMainImage as any
);

export default router;
import { Router } from 'express';
import * as imageController from '../controllers/image.controller';
import validateToken from '../middlewares/validate-token';

const router = Router();

// Subir una imagen
router.post(
  '/upload', // Cambia '/' por '/upload'
  validateToken as any, 
  imageController.upload.single('image'),
  imageController.uploadImage as any
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
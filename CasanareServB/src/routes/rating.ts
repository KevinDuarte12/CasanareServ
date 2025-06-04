import { Router } from 'express';
import { createRating, getProductRatings, getUserRatings, deleteRating } from '../controllers/rating.controller';
import validateToken from '../middlewares/validate-token';
import { upload } from '../controllers/image.controller'; // ✅ IMPORTAR upload desde image.controller
import { RequestHandler } from 'express';

const router = Router();

// ✅ ACTUALIZAR: Crear una calificación con soporte para múltiples imágenes
router.post('/', 
  validateToken as RequestHandler, 
  upload.array('images', 3) as RequestHandler, // ✅ AGREGAR upload de múltiples imágenes (máximo 3)
  createRating as RequestHandler
);

// Obtener calificaciones de un producto específico
router.get('/product/:productId', getProductRatings as RequestHandler);

// Obtener calificaciones de un usuario específico
router.get('/user/:userId', getUserRatings as RequestHandler);

// Eliminar una calificación (requiere autenticación)
router.delete('/:id', validateToken as RequestHandler, deleteRating as RequestHandler);

export default router;
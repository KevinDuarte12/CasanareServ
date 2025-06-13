import { Router } from 'express';
import { createRating, getProductRatings, getUserRatings, deleteRating } from '../controllers/rating.controller';
import validateToken from '../middlewares/validate-token';
import { upload } from '../controllers/image.controller'; 
import { RequestHandler } from 'express';

/**
 *  RUTAS DE CALIFICACIONES Y RESEÑAS
 * Sistema de rating con soporte para imágenes de evidencia
 * Permite calificar productos con fotos y gestionar reseñas
 */
const router = Router();

//  RUTAS DE CREACIÓN DE CALIFICACIONES

// Crear una calificación con soporte para múltiples imágenes
router.post('/', 
  validateToken as RequestHandler,         // Usuario autenticado requerido
  upload.array('images', 3) as RequestHandler, // Subir hasta 3 imágenes de evidencia
  createRating as RequestHandler           // Procesar calificación con fotos
);

// 🔍 RUTAS DE CONSULTA DE CALIFICACIONES

// Obtener calificaciones de un producto específico
router.get('/product/:productId', getProductRatings as RequestHandler);

// Obtener calificaciones de un usuario específico
router.get('/user/:userId', getUserRatings as RequestHandler);

//  RUTAS DE GESTIÓN

// Eliminar una calificación (requiere autenticación)
router.delete('/:id', 
  validateToken as RequestHandler, // Solo usuario autenticado puede eliminar
  deleteRating as RequestHandler   // Eliminar calificación y sus imágenes
);

export default router;
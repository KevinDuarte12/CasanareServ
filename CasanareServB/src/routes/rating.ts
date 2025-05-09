import { Router } from 'express';
import { createRating, getProductRatings, getUserRatings, deleteRating } from '../controllers/rating.controller';
import validateToken from '../middlewares/validate-token';
import { RequestHandler } from 'express';

const router = Router();
// Crear una calificación (requiere autenticación)
router.post('/', validateToken as RequestHandler, createRating as RequestHandler);

// Obtener calificaciones de un producto específico
router.get('/product/:productId', getProductRatings as RequestHandler);

// Obtener calificaciones de un usuario específico
router.get('/user/:userId', getUserRatings as RequestHandler);

// Eliminar una calificación (requiere autenticación)
router.delete('/:id', validateToken as RequestHandler, deleteRating as RequestHandler);

export default router;
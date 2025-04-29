import { Router } from 'express';
import { check } from 'express-validator';
import { validateFields } from '../middlewares/validate-request';
import validateToken from '../middlewares/validate-token';
import { isAdmin } from '../middlewares/validate-admin';
import {
    getBarters,
    getBarterById,
    createBarter,
    updateBarterStatus,
    deleteBarter,
    getUserBarters,
    createBarterPublication,
    updateBarter
} from '../controllers/barter.controller';
import { RequestHandler } from 'express';

const router = Router();

// Obtener todos los trueques
router.get('/', getBarters as RequestHandler);

// Obtener un trueque específico por ID
router.get('/:id', getBarterById as RequestHandler);

// Crear un nuevo trueque
router.post('/', [
    validateToken as RequestHandler,
    check('id_user_offer', 'El ID del usuario oferente es obligatorio').notEmpty(),
    validateFields as RequestHandler
], createBarter as RequestHandler);

// Actualizar el estado de un trueque
router.patch('/:id/status', [
    validateToken as RequestHandler,
    check('status', 'El estado es obligatorio').isIn(['pendiente', 'aceptado', 'rechazado', 'completado']),
    validateFields as RequestHandler
], updateBarterStatus as RequestHandler);

// Actualizar un trueque completo (no solo su estado)
router.put('/:id', [
    validateToken as RequestHandler,
    check('id_user_offer', 'El ID del usuario oferente es obligatorio').notEmpty(),
    validateFields as RequestHandler
], updateBarter as RequestHandler);

// Eliminar un trueque
router.delete('/:id', [
    validateToken as RequestHandler
], deleteBarter as RequestHandler);

// Obtener los trueques de un usuario
router.get('/user/:userId', [
    validateToken as RequestHandler
], getUserBarters as RequestHandler);

// Publicar un producto para trueque (sin receptor específico)
router.post('/publication', [
    validateToken as RequestHandler,
    check('id_prod_offer', 'El ID del producto es obligatorio').notEmpty(),
    check('id_user_offer', 'El ID del usuario es obligatorio').notEmpty(),
    validateFields as RequestHandler
], createBarterPublication as RequestHandler);

export default router;
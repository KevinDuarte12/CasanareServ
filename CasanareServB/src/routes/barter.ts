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
    deleteBarter
} from '../controllers/barter.controller';
import { RequestHandler } from 'express';

const router = Router();

// Rutas públicas (solo para visualización, en un entorno real estas deberían ser protegidas)
router.get('/', getBarters as RequestHandler);
router.get('/:id', [
    check('id', 'El ID debe ser un número válido').isNumeric(),
    validateFields as RequestHandler
], getBarterById as RequestHandler);

// Rutas protegidas
router.post('/', [
    validateToken as RequestHandler,
    check('id_prod_offer', 'El ID del producto ofrecido es obligatorio').notEmpty(),
    check('id_prod_offer', 'El ID del producto ofrecido debe ser un número').isNumeric(),
    check('id_prod_request', 'El ID del producto solicitado es obligatorio').notEmpty(),
    check('id_prod_request', 'El ID del producto solicitado debe ser un número').isNumeric(),
    check('id_user_offer', 'El ID del usuario oferente es obligatorio').notEmpty(),
    check('id_user_offer', 'El ID del usuario oferente debe ser un número').isNumeric(),
    check('id_user_receiving', 'El ID del usuario receptor es obligatorio').notEmpty(),
    check('id_user_receiving', 'El ID del usuario receptor debe ser un número').isNumeric(),
    validateFields as RequestHandler
], createBarter as RequestHandler);

router.patch('/:id/status', [
    validateToken as RequestHandler
], updateBarterStatus as RequestHandler);

router.delete('/:id', [
    validateToken as RequestHandler,
    check('id', 'El ID debe ser un número válido').isNumeric(),
    validateFields as RequestHandler
], deleteBarter as RequestHandler);

export default router;
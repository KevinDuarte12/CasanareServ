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
    createBarterPublication // Añadir esta importación
} from '../controllers/barter.controller';
import { RequestHandler } from 'express';

const router = Router();

// Rutas existentes...

// Añadir esta nueva ruta
router.post('/publication', [
    validateToken as RequestHandler,
    check('id_prod_offer', 'El ID del producto es obligatorio').notEmpty(),
    check('id_user_offer', 'El ID del usuario es obligatorio').notEmpty(),
    validateFields as RequestHandler
], createBarterPublication as RequestHandler);

export default router;
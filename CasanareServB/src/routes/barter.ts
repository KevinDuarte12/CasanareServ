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
    updateBarter,
    checkExistingProposal,
    getBartersByStatus,
    getBartersPendingAdminApproval
} from '../controllers/barter.controller';
import { RequestHandler } from 'express';

const router = Router();

// Obtener todos los trueques
router.get('/', getBarters as RequestHandler);

// IMPORTANTE: Rutas específicas primero, antes de /:id
router.get('/check-proposal', 
    validateToken as unknown as RequestHandler,
    checkExistingProposal as unknown as RequestHandler
);

router.get('/status/:status', getBartersByStatus as RequestHandler);

router.get('/admin/pending-approval', [
    validateToken as RequestHandler,
    isAdmin as RequestHandler
], getBartersPendingAdminApproval as RequestHandler);

// IMPORTANTE: Ruta específica con /user/ antes de /:id
router.get('/user/:userId', [
    validateToken as RequestHandler
], getUserBarters as RequestHandler);

// IMPORTANTE: Rutas POST específicas
router.post('/publication', [
    validateToken as RequestHandler,
    check('id_prod_offer', 'El ID del producto es obligatorio').notEmpty(),
    check('id_user_offer', 'El ID del usuario es obligatorio').notEmpty(),
    validateFields as RequestHandler
], createBarterPublication as RequestHandler);

// IMPORTANTE: Rutas con parámetros genéricos AL FINAL
router.get('/:id', getBarterById as RequestHandler);

router.post('/', [
    validateToken as RequestHandler,
    check('id_user_offer', 'El ID del usuario oferente es obligatorio').notEmpty(),
    validateFields as RequestHandler
], createBarter as RequestHandler);

router.patch('/:id/status', [
    validateToken as RequestHandler,
    check('status', 'El estado es obligatorio').isIn(['pendiente', 'aceptado', 'rechazado', 'completado', 'aprobado_admin']),
    validateFields as RequestHandler
], updateBarterStatus as RequestHandler);

router.put('/:id', [
    validateToken as RequestHandler,
    check('id_user_offer', 'El ID del usuario oferente es obligatorio').notEmpty(),
    validateFields as RequestHandler
], updateBarter as RequestHandler);

router.delete('/:id', [
    validateToken as RequestHandler
], deleteBarter as RequestHandler);

export default router;
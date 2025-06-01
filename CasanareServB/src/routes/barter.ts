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
    getBartersPendingAdminApproval,
    proposeForExistingBarter,
    getBartersByProductOffered,
    getBartersByProductRelated,
    completeBarterCheckout,
    checkAndUpdateBarterCompletion,
    getBarterPaymentStatus  // ✅ AGREGAR ESTA LÍNEA
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
router.patch('/:id/propose', [
    validateToken as RequestHandler,
    check('id_prod_request', 'El ID del producto solicitado es obligatorio').notEmpty(),
    check('id_user_receiving', 'El ID del usuario receptor es obligatorio').notEmpty(),
    validateFields as RequestHandler
  ], 
  // SOLUCIÓN: Usar 'as unknown as RequestHandler' en lugar de solo 'as RequestHandler'
  proposeForExistingBarter as unknown as RequestHandler);
router.get('/status/:status', getBartersByStatus as RequestHandler);

router.get('/admin/pending-approval', [
    validateToken as RequestHandler,
    isAdmin as RequestHandler
], getBartersPendingAdminApproval as RequestHandler);

// Añadir esta línea con las demás rutas específicas (ANTES de las rutas con parámetros genéricos)
router.get('/product-offered/:productId', getBartersByProductOffered as RequestHandler);

// Añadir esta línea con las demás rutas específicas (ANTES de las rutas con parámetros genéricos)
router.get('/product-related/:productId', getBartersByProductRelated as RequestHandler);

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

// En routes/barter.ts
router.post('/:id/checkout', validateToken as RequestHandler, completeBarterCheckout as RequestHandler);

// ✅ NUEVAS RUTAS PARA GESTIÓN DE COMPLETITUD DE PAGOS
router.post('/check-completion', [
    validateToken as RequestHandler,
    check('barterId', 'El ID del barter es obligatorio').notEmpty(),
    validateFields as RequestHandler
], (async (req, res) => {
    try {
        const { barterId } = req.body;
        
        const result = await checkAndUpdateBarterCompletion(barterId);
        
        res.json({
            success: true,
            message: `Verificación de completitud ejecutada para barter ${barterId}`,
            result
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: 'Error verificando completitud del barter',
            error: error.message
        });
    }
}) as RequestHandler);

// ✅ RUTA PARA VERIFICAR ESTADO DE PAGOS ESPECÍFICOS DE UN BARTER
router.get('/payment-status/:barterId', validateToken as RequestHandler, getBarterPaymentStatus as RequestHandler);

// ✅ RUTA PARA FORZAR COMPLETACIÓN MANUAL (TESTING/ADMIN)
router.put('/force-complete/:barterId', validateToken as RequestHandler, (async (req, res) => {
    try {
        const { barterId } = req.params;
        const { userId } = req; // Del middleware de autenticación
        
        if (!barterId) {
            return res.status(400).json({
                success: false,
                message: 'Se requiere el ID del barter'
            });
        }

        const { Barter } = require('../db/models');
        
        const barter = await Barter.findByPk(barterId);
        
        if (!barter) {
            return res.status(404).json({
                success: false,
                message: 'Barter no encontrado'
            });
        }

        // Verificar que el usuario tenga permisos (es parte del barter)
        const isAuthorized = barter.id_user_offer === userId || barter.id_user_receiving === userId;
        
        if (!isAuthorized) {
            return res.status(403).json({
                success: false,
                message: 'No tienes permisos para modificar este barter'
            });
        }

        // Forzar completación
        await barter.update({
            offer_payment_completed: true,
            request_payment_completed: true,
            offer_payment_date: new Date(),
            request_payment_date: new Date(),
            status: 'completado'
        });

        res.json({
            success: true,
            message: 'Barter marcado como completado manualmente',
            data: {
                barterId: barter.id_barter,
                status: barter.status,
                offer_payment_completed: barter.offer_payment_completed,
                request_payment_completed: barter.request_payment_completed
            }
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: 'Error al forzar completación del barter',
            error: error.message
        });
    }
})as RequestHandler);

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
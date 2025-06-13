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
    getBarterPaymentStatus,
    getRecentBarters
} from '../controllers/barter.controller';
import { RequestHandler } from 'express';
/**
 * 🔄 RUTAS DE TRUEQUES (BARTER)
 * Gestiona todas las operaciones CRUD y funcionalidades especiales de trueques
 * Incluye validación, autenticación y autorización según el tipo de operación
 */
const router = Router();
// 📋 RUTAS PÚBLICAS (sin autenticación)
// Obtener todos los trueques públicos
router.get('/', getBarters as RequestHandler);

// Obtener trueques recientes para homepage
router.get('/recent', getRecentBarters as RequestHandler);
// 🔐 RUTAS ESPECÍFICAS (antes de parámetros genéricos para evitar conflictos)
// Verificar propuesta existente de trueque
router.get('/check-proposal', 
    validateToken as unknown as RequestHandler, // Autenticación requerida
    checkExistingProposal as unknown as RequestHandler
);
// Proponer trueque para producto existente
router.patch('/:id/propose', [
    validateToken as RequestHandler, // Usuario autenticado
    check('id_prod_request', 'El ID del producto solicitado es obligatorio').notEmpty(),
    check('id_user_receiving', 'El ID del usuario receptor es obligatorio').notEmpty(),
    validateFields as RequestHandler // Validar campos del request
], 
proposeForExistingBarter as unknown as RequestHandler);
// Filtrar trueques por estado específico
router.get('/status/:status', getBartersByStatus as RequestHandler);
// 👑 RUTAS ADMINISTRATIVAS (requieren rol admin)
// Obtener trueques pendientes de aprobación administrativa
router.get('/admin/pending-approval', [
    validateToken as RequestHandler, // Autenticación
    isAdmin as RequestHandler // Solo administradores
], getBartersPendingAdminApproval as RequestHandler);
// 📦 RUTAS DE CONSULTA POR PRODUCTO
// Obtener trueques donde se ofrece un producto específico
router.get('/product-offered/:productId', getBartersByProductOffered as RequestHandler);
// Obtener trueques relacionados con un producto específico
router.get('/product-related/:productId', getBartersByProductRelated as RequestHandler);
// 👤 RUTAS DE USUARIO ESPECÍFICO
// Obtener trueques de un usuario específico
router.get('/user/:userId', [
    validateToken as RequestHandler // Autenticación requerida
], getUserBarters as RequestHandler);
// 📝 RUTAS DE CREACIÓN Y PUBLICACIÓN
// Crear publicación de trueque
router.post('/publication', [
    validateToken as RequestHandler, // Usuario autenticado
    check('id_prod_offer', 'El ID del producto es obligatorio').notEmpty(),
    check('id_user_offer', 'El ID del usuario es obligatorio').notEmpty(),
    validateFields as RequestHandler // Validar datos
], createBarterPublication as RequestHandler);
// 💳 RUTAS DE PAGO Y CHECKOUT
// Completar checkout de trueque (proceso de pago)
router.post('/:id/checkout', 
    validateToken as RequestHandler, // Autenticación requerida
    completeBarterCheckout as RequestHandler
);
// 🔧 RUTAS DE GESTIÓN DE COMPLETITUD DE PAGOS
// Verificar y actualizar completitud de pagos automáticamente
router.post('/check-completion', [
    validateToken as RequestHandler, // Usuario autenticado
    check('barterId', 'El ID del barter es obligatorio').notEmpty(),
    validateFields as RequestHandler // Validar ID del barter
], (async (req, res) => {
    try {
        const { barterId } = req.body;
        
        // Ejecutar verificación de completitud
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
// 📊 RUTAS DE CONSULTA DE ESTADO DE PAGOS
// Verificar estado de pagos específicos de un barter
router.get('/payment-status/:barterId', 
    validateToken as RequestHandler, // Autenticación requerida
    getBarterPaymentStatus as RequestHandler
);
// 🔗 RUTAS CON PARÁMETROS GENÉRICOS (al final para evitar conflictos)
// Obtener trueque específico por ID
router.get('/:id', getBarterById as RequestHandler);
// Crear nuevo trueque
router.post('/', [
    validateToken as RequestHandler, // Usuario autenticado
    check('id_user_offer', 'El ID del usuario oferente es obligatorio').notEmpty(),
    validateFields as RequestHandler // Validar datos
], createBarter as RequestHandler);
// Actualizar estado de trueque
router.patch('/:id/status', [
    validateToken as RequestHandler, // Usuario autenticado
    check('status', 'El estado es obligatorio').isIn([
        'pendiente', 
        'aceptado', 
        'rechazado', 
        'completado', 
        'aprobado_admin'
    ]), // Validar estados permitidos
    validateFields as RequestHandler // Validar datos
], updateBarterStatus as RequestHandler);
// Actualizar trueque completo
router.put('/:id', [
    validateToken as RequestHandler, // Usuario autenticado
    check('id_user_offer', 'El ID del usuario oferente es obligatorio').notEmpty(),
    validateFields as RequestHandler // Validar datos
], updateBarter as RequestHandler);
// Eliminar trueque
router.delete('/:id', [
    validateToken as RequestHandler // Solo usuario autenticado puede eliminar
], deleteBarter as RequestHandler);
export default router;
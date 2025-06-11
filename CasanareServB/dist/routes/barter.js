"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const validate_request_1 = require("../middlewares/validate-request");
const validate_token_1 = __importDefault(require("../middlewares/validate-token"));
const validate_admin_1 = require("../middlewares/validate-admin");
const barter_controller_1 = require("../controllers/barter.controller");
/**
 * 🔄 RUTAS DE TRUEQUES (BARTER)
 * Gestiona todas las operaciones CRUD y funcionalidades especiales de trueques
 * Incluye validación, autenticación y autorización según el tipo de operación
 */
const router = (0, express_1.Router)();
// 📋 RUTAS PÚBLICAS (sin autenticación)
// Obtener todos los trueques públicos
router.get('/', barter_controller_1.getBarters);
// 🔐 RUTAS ESPECÍFICAS (antes de parámetros genéricos para evitar conflictos)
// Verificar propuesta existente de trueque
router.get('/check-proposal', validate_token_1.default, // Autenticación requerida
barter_controller_1.checkExistingProposal);
// Proponer trueque para producto existente
router.patch('/:id/propose', [
    validate_token_1.default, // Usuario autenticado
    (0, express_validator_1.check)('id_prod_request', 'El ID del producto solicitado es obligatorio').notEmpty(),
    (0, express_validator_1.check)('id_user_receiving', 'El ID del usuario receptor es obligatorio').notEmpty(),
    validate_request_1.validateFields // Validar campos del request
], barter_controller_1.proposeForExistingBarter);
// Filtrar trueques por estado específico
router.get('/status/:status', barter_controller_1.getBartersByStatus);
// 👑 RUTAS ADMINISTRATIVAS (requieren rol admin)
// Obtener trueques pendientes de aprobación administrativa
router.get('/admin/pending-approval', [
    validate_token_1.default, // Autenticación
    validate_admin_1.isAdmin // Solo administradores
], barter_controller_1.getBartersPendingAdminApproval);
// 📦 RUTAS DE CONSULTA POR PRODUCTO
// Obtener trueques donde se ofrece un producto específico
router.get('/product-offered/:productId', barter_controller_1.getBartersByProductOffered);
// Obtener trueques relacionados con un producto específico
router.get('/product-related/:productId', barter_controller_1.getBartersByProductRelated);
// 👤 RUTAS DE USUARIO ESPECÍFICO
// Obtener trueques de un usuario específico
router.get('/user/:userId', [
    validate_token_1.default // Autenticación requerida
], barter_controller_1.getUserBarters);
// 📝 RUTAS DE CREACIÓN Y PUBLICACIÓN
// Crear publicación de trueque
router.post('/publication', [
    validate_token_1.default, // Usuario autenticado
    (0, express_validator_1.check)('id_prod_offer', 'El ID del producto es obligatorio').notEmpty(),
    (0, express_validator_1.check)('id_user_offer', 'El ID del usuario es obligatorio').notEmpty(),
    validate_request_1.validateFields // Validar datos
], barter_controller_1.createBarterPublication);
// 💳 RUTAS DE PAGO Y CHECKOUT
// Completar checkout de trueque (proceso de pago)
router.post('/:id/checkout', validate_token_1.default, // Autenticación requerida
barter_controller_1.completeBarterCheckout);
// 🔧 RUTAS DE GESTIÓN DE COMPLETITUD DE PAGOS
// Verificar y actualizar completitud de pagos automáticamente
router.post('/check-completion', [
    validate_token_1.default, // Usuario autenticado
    (0, express_validator_1.check)('barterId', 'El ID del barter es obligatorio').notEmpty(),
    validate_request_1.validateFields // Validar ID del barter
], ((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { barterId } = req.body;
        // Ejecutar verificación de completitud
        const result = yield (0, barter_controller_1.checkAndUpdateBarterCompletion)(barterId);
        res.json({
            success: true,
            message: `Verificación de completitud ejecutada para barter ${barterId}`,
            result
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error verificando completitud del barter',
            error: error.message
        });
    }
})));
// 📊 RUTAS DE CONSULTA DE ESTADO DE PAGOS
// Verificar estado de pagos específicos de un barter
router.get('/payment-status/:barterId', validate_token_1.default, // Autenticación requerida
barter_controller_1.getBarterPaymentStatus);
// 🔗 RUTAS CON PARÁMETROS GENÉRICOS (al final para evitar conflictos)
// Obtener trueque específico por ID
router.get('/:id', barter_controller_1.getBarterById);
// Crear nuevo trueque
router.post('/', [
    validate_token_1.default, // Usuario autenticado
    (0, express_validator_1.check)('id_user_offer', 'El ID del usuario oferente es obligatorio').notEmpty(),
    validate_request_1.validateFields // Validar datos
], barter_controller_1.createBarter);
// Actualizar estado de trueque
router.patch('/:id/status', [
    validate_token_1.default, // Usuario autenticado
    (0, express_validator_1.check)('status', 'El estado es obligatorio').isIn([
        'pendiente',
        'aceptado',
        'rechazado',
        'completado',
        'aprobado_admin'
    ]), // Validar estados permitidos
    validate_request_1.validateFields // Validar datos
], barter_controller_1.updateBarterStatus);
// Actualizar trueque completo
router.put('/:id', [
    validate_token_1.default, // Usuario autenticado
    (0, express_validator_1.check)('id_user_offer', 'El ID del usuario oferente es obligatorio').notEmpty(),
    validate_request_1.validateFields // Validar datos
], barter_controller_1.updateBarter);
// Eliminar trueque
router.delete('/:id', [
    validate_token_1.default // Solo usuario autenticado puede eliminar
], barter_controller_1.deleteBarter);
exports.default = router;

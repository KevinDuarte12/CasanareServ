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
const router = (0, express_1.Router)();
// Obtener todos los trueques
router.get('/', barter_controller_1.getBarters);
// IMPORTANTE: Rutas específicas primero, antes de /:id
router.get('/check-proposal', validate_token_1.default, barter_controller_1.checkExistingProposal);
router.patch('/:id/propose', [
    validate_token_1.default,
    (0, express_validator_1.check)('id_prod_request', 'El ID del producto solicitado es obligatorio').notEmpty(),
    (0, express_validator_1.check)('id_user_receiving', 'El ID del usuario receptor es obligatorio').notEmpty(),
    validate_request_1.validateFields
], 
// SOLUCIÓN: Usar 'as unknown as RequestHandler' en lugar de solo 'as RequestHandler'
barter_controller_1.proposeForExistingBarter);
router.get('/status/:status', barter_controller_1.getBartersByStatus);
router.get('/admin/pending-approval', [
    validate_token_1.default,
    validate_admin_1.isAdmin
], barter_controller_1.getBartersPendingAdminApproval);
// Añadir esta línea con las demás rutas específicas (ANTES de las rutas con parámetros genéricos)
router.get('/product-offered/:productId', barter_controller_1.getBartersByProductOffered);
// Añadir esta línea con las demás rutas específicas (ANTES de las rutas con parámetros genéricos)
router.get('/product-related/:productId', barter_controller_1.getBartersByProductRelated);
// IMPORTANTE: Ruta específica con /user/ antes de /:id
router.get('/user/:userId', [
    validate_token_1.default
], barter_controller_1.getUserBarters);
// IMPORTANTE: Rutas POST específicas
router.post('/publication', [
    validate_token_1.default,
    (0, express_validator_1.check)('id_prod_offer', 'El ID del producto es obligatorio').notEmpty(),
    (0, express_validator_1.check)('id_user_offer', 'El ID del usuario es obligatorio').notEmpty(),
    validate_request_1.validateFields
], barter_controller_1.createBarterPublication);
// En routes/barter.ts
router.post('/:id/checkout', validate_token_1.default, barter_controller_1.completeBarterCheckout);
// ✅ NUEVAS RUTAS PARA GESTIÓN DE COMPLETITUD DE PAGOS
router.post('/check-completion', [
    validate_token_1.default,
    (0, express_validator_1.check)('barterId', 'El ID del barter es obligatorio').notEmpty(),
    validate_request_1.validateFields
], ((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { barterId } = req.body;
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
// ✅ RUTA PARA VERIFICAR ESTADO DE PAGOS ESPECÍFICOS DE UN BARTER
router.get('/payment-status/:barterId', validate_token_1.default, barter_controller_1.getBarterPaymentStatus);
// ✅ RUTA PARA FORZAR COMPLETACIÓN MANUAL (TESTING/ADMIN)
router.put('/force-complete/:barterId', validate_token_1.default, ((req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const barter = yield Barter.findByPk(barterId);
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
        yield barter.update({
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
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al forzar completación del barter',
            error: error.message
        });
    }
})));
// IMPORTANTE: Rutas con parámetros genéricos AL FINAL
router.get('/:id', barter_controller_1.getBarterById);
router.post('/', [
    validate_token_1.default,
    (0, express_validator_1.check)('id_user_offer', 'El ID del usuario oferente es obligatorio').notEmpty(),
    validate_request_1.validateFields
], barter_controller_1.createBarter);
router.patch('/:id/status', [
    validate_token_1.default,
    (0, express_validator_1.check)('status', 'El estado es obligatorio').isIn(['pendiente', 'aceptado', 'rechazado', 'completado', 'aprobado_admin']),
    validate_request_1.validateFields
], barter_controller_1.updateBarterStatus);
router.put('/:id', [
    validate_token_1.default,
    (0, express_validator_1.check)('id_user_offer', 'El ID del usuario oferente es obligatorio').notEmpty(),
    validate_request_1.validateFields
], barter_controller_1.updateBarter);
router.delete('/:id', [
    validate_token_1.default
], barter_controller_1.deleteBarter);
exports.default = router;

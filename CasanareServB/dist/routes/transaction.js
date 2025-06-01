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
const transaction_controller_1 = require("../controllers/transaction.controller");
const validate_token_1 = __importDefault(require("../middlewares/validate-token"));
const express_validator_1 = require("express-validator"); // ✅ AGREGAR ESTA LÍNEA
const validate_request_1 = require("../middlewares/validate-request");
const router = (0, express_1.Router)();
// Función wrapper para manejar controladores asíncronos
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
// Iniciar proceso de pago
router.post('/create', validate_token_1.default, asyncHandler(transaction_controller_1.createPayment));
// Completar proceso de pago
router.post('/complete', validate_token_1.default, transaction_controller_1.completePayment);
// Recibir notificaciones de PayU (webhook)
// Este endpoint NO debe tener validación de token ya que lo llama PayU
router.post('/notification', asyncHandler(transaction_controller_1.paymentNotification));
// Verificar estado de un pago por referencia
router.get('/status/:reference', validate_token_1.default, asyncHandler(transaction_controller_1.checkPaymentStatus));
// Historial de transacciones del usuario
router.get('/history/:userId', validate_token_1.default, asyncHandler(transaction_controller_1.getUserTransactions));
// Productos comprados por el usuario
router.get('/purchased/:userId', validate_token_1.default, asyncHandler(transaction_controller_1.getPurchasedProducts));
// Rutas para WebCheckout de PayU (productos normales)
router.post('/web-checkout', validate_token_1.default, transaction_controller_1.createWebCheckoutPayment);
router.post('/payu-confirmation', transaction_controller_1.payuConfirmation); // Sin validación de token
router.get('/verify/:reference', validate_token_1.default, transaction_controller_1.verifyPayment);
router.get('/payu-response', transaction_controller_1.payuResponse);
// ✅ RUTAS PARA TRUEQUES CORREGIDAS
router.post('/barter-web-checkout', validate_token_1.default, asyncHandler(transaction_controller_1.createBarterWebCheckoutPayment));
router.post('/barter-payu-confirmation', asyncHandler(transaction_controller_1.barterPayuConfirmation));
router.get('/barter-verify/:reference', validate_token_1.default, asyncHandler(transaction_controller_1.verifyBarterPayment));
router.get('/barter-payu-response', transaction_controller_1.barterPayuResponse); // ✅ SIN validación de token
router.post('/check-barter-completion', validate_token_1.default, asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { barterId } = req.body;
        if (!barterId) {
            return res.status(400).json({
                success: false,
                message: 'Se requiere el ID del barter'
            });
        }
        // Importar la función desde barter.controller
        const { checkAndUpdateBarterCompletion } = require('../controllers/barter.controller');
        yield checkAndUpdateBarterCompletion(barterId);
        res.json({
            success: true,
            message: `Verificación de completitud ejecutada para barter ${barterId}`
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
router.put('/update-barter-payment-status', [
    validate_token_1.default,
    (0, express_validator_1.check)('reference', 'La referencia es obligatoria').notEmpty(),
    (0, express_validator_1.check)('status', 'El estado es obligatorio').isIn(['pendiente', 'completada', 'fallida', 'reembolsada']),
    validate_request_1.validateFields
], transaction_controller_1.updateBarterPaymentStatusEndpoint);
exports.default = router;

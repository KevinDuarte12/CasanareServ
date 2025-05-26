"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const transaction_controller_1 = require("../controllers/transaction.controller");
const validate_token_1 = __importDefault(require("../middlewares/validate-token"));
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
router.post('/update-barter-status', asyncHandler(transaction_controller_1.updateBarterPaymentStatus)); // ✅ SIN validación de token para testing
router.get('/barter-payu-response', transaction_controller_1.barterPayuResponse); // ✅ SIN validación de token
exports.default = router;

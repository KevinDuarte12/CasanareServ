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
const express_validator_1 = require("express-validator");
const validate_request_1 = require("../middlewares/validate-request");
/**
 * 💳 RUTAS DE TRANSACCIONES Y PAGOS
 * Sistema completo de pagos con PayU para productos y trueques
 * Incluye webhooks, verificación de estados y gestión de completitud
 */
const router = (0, express_1.Router)();
/**
 * Función wrapper para manejar controladores asíncronos
 * Captura errores automáticamente y los pasa al middleware de manejo de errores
 */
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
// 💰 RUTAS DE PAGOS BÁSICOS
// Iniciar proceso de pago
router.post('/create', validate_token_1.default, // Usuario autenticado
asyncHandler(transaction_controller_1.createPayment) // Crear transacción de pago
);
// Completar proceso de pago
router.post('/complete', validate_token_1.default, // Usuario autenticado
transaction_controller_1.completePayment // Finalizar transacción
);
// 🔔 WEBHOOKS DE PAYU (sin autenticación)
// Recibir notificaciones de PayU (webhook)
// Este endpoint NO debe tener validación de token ya que lo llama PayU
router.post('/notification', asyncHandler(transaction_controller_1.paymentNotification) // Procesar notificación automática
);
// 🔍 RUTAS DE CONSULTA Y VERIFICACIÓN
// Verificar estado de un pago por referencia
router.get('/status/:reference', validate_token_1.default, // Usuario autenticado
asyncHandler(transaction_controller_1.checkPaymentStatus) // Estado del pago por referencia
);
// Historial de transacciones del usuario
router.get('/history/:userId', validate_token_1.default, // Usuario autenticado
asyncHandler(transaction_controller_1.getUserTransactions) // Lista de transacciones del usuario
);
// Productos comprados por el usuario
router.get('/purchased/:userId', validate_token_1.default, // Usuario autenticado
asyncHandler(transaction_controller_1.getPurchasedProducts) // Lista de productos comprados
);
// 🛒 RUTAS PARA WEBCHECKOUT DE PAYU (productos normales)
// Crear checkout web para productos
router.post('/web-checkout', validate_token_1.default, // Usuario autenticado
transaction_controller_1.createWebCheckoutPayment // Generar URL de pago
);
// Confirmación de PayU para productos (webhook)
router.post('/payu-confirmation', transaction_controller_1.payuConfirmation // Sin validación de token (llamado por PayU)
);
// Verificar pago de producto por referencia
router.get('/verify/:reference', validate_token_1.default, // Usuario autenticado
transaction_controller_1.verifyPayment // Verificar estado del pago
);
// Respuesta de PayU después del pago
router.get('/payu-response', transaction_controller_1.payuResponse // Procesar respuesta de PayU
);
// 🔄 RUTAS PARA TRUEQUES
// Crear checkout web para trueques
router.post('/barter-web-checkout', validate_token_1.default, // Usuario autenticado
asyncHandler(transaction_controller_1.createBarterWebCheckoutPayment) // Generar URL de pago para trueque
);
// Confirmación de PayU para trueques (webhook)
router.post('/barter-payu-confirmation', asyncHandler(transaction_controller_1.barterPayuConfirmation) // Sin validación (llamado por PayU)
);
// Verificar pago de trueque por referencia
router.get('/barter-verify/:reference', validate_token_1.default, // Usuario autenticado
asyncHandler(transaction_controller_1.verifyBarterPayment) // Verificar estado del pago de trueque
);
// Respuesta de PayU después del pago de trueque
router.get('/barter-payu-response', transaction_controller_1.barterPayuResponse // Sin validación de token
);
// 🔧 RUTAS DE GESTIÓN DE COMPLETITUD DE TRUEQUES
// Verificar y actualizar completitud de trueque
router.post('/check-barter-completion', validate_token_1.default, // Usuario autenticado
asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { barterId } = req.body;
        // Validar que se proporcione ID del trueque
        if (!barterId) {
            return res.status(400).json({
                success: false,
                message: 'Se requiere el ID del barter'
            });
        }
        // Importar la función desde barter.controller
        const { checkAndUpdateBarterCompletion } = require('../controllers/barter.controller');
        // Ejecutar verificación de completitud
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
// Actualizar estado de pago de trueque manualmente
router.put('/update-barter-payment-status', [
    validate_token_1.default, // Usuario autenticado
    (0, express_validator_1.check)('reference', 'La referencia es obligatoria').notEmpty(), // Referencia requerida
    (0, express_validator_1.check)('status', 'El estado es obligatorio').isIn(['pendiente', 'completada', 'fallida', 'reembolsada']), // Estados válidos
    validate_request_1.validateFields // Validar campos
], transaction_controller_1.updateBarterPaymentStatusEndpoint);
// 📊 RUTAS DE CONSULTA DE VENTAS
// Obtener productos vendidos por el usuario
router.get('/payment/sold/:userId', validate_token_1.default, // Usuario autenticado
transaction_controller_1.getSoldProducts // Lista de productos vendidos
);
exports.default = router;

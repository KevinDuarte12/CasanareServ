import { Router, RequestHandler, Request, Response, NextFunction } from 'express';
import { 
 createPayment, 
  paymentNotification, 
  checkPaymentStatus,
  getUserTransactions,
  getPurchasedProducts,
  completePayment,
  createWebCheckoutPayment,
  payuConfirmation,
  verifyPayment,
  createBarterWebCheckoutPayment,
  barterPayuConfirmation,
  verifyBarterPayment,
  barterPayuResponse,
  payuResponse,
  updateBarterPaymentStatusEndpoint,
  getSoldProducts
} from '../controllers/transaction.controller';
import  validateToken  from '../middlewares/validate-token';
import { check } from 'express-validator';
import {validateFields} from '../middlewares/validate-request';
/**
 * 💳 RUTAS DE TRANSACCIONES Y PAGOS
 * Sistema completo de pagos con PayU para productos y trueques
 * Incluye webhooks, verificación de estados y gestión de completitud
 */
const router = Router();
/**
 * Función wrapper para manejar controladores asíncronos
 * Captura errores automáticamente y los pasa al middleware de manejo de errores
 */
const asyncHandler = 
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>): RequestHandler => 
    (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
// 💰 RUTAS DE PAGOS BÁSICOS
// Iniciar proceso de pago
router.post('/create', 
  validateToken as RequestHandler, // Usuario autenticado
  asyncHandler(createPayment)      // Crear transacción de pago
)
// Completar proceso de pago
router.post('/complete', 
  validateToken as RequestHandler, // Usuario autenticado
  completePayment as RequestHandler // Finalizar transacción
);
// 🔔 WEBHOOKS DE PAYU (sin autenticación)
// Recibir notificaciones de PayU (webhook)
// Este endpoint NO debe tener validación de token ya que lo llama PayU
router.post('/notification', 
  asyncHandler(paymentNotification) // Procesar notificación automática
);
// 🔍 RUTAS DE CONSULTA Y VERIFICACIÓN
// Verificar estado de un pago por referencia
router.get('/status/:reference', 
  validateToken as RequestHandler,   // Usuario autenticado
  asyncHandler(checkPaymentStatus)   // Estado del pago por referencia
);
// Historial de transacciones del usuario
router.get('/history/:userId', 
  validateToken as RequestHandler,    // Usuario autenticado
  asyncHandler(getUserTransactions)   // Lista de transacciones del usuario
);
// Productos comprados por el usuario
router.get('/purchased/:userId', 
  validateToken as RequestHandler,     // Usuario autenticado
  asyncHandler(getPurchasedProducts)   // Lista de productos comprados
);
// 🛒 RUTAS PARA WEBCHECKOUT DE PAYU (productos normales)
// Crear checkout web para productos
router.post('/web-checkout', 
  validateToken as RequestHandler,        // Usuario autenticado
  createWebCheckoutPayment as RequestHandler // Generar URL de pago
);
// Confirmación de PayU para productos (webhook)
router.post('/payu-confirmation', 
  payuConfirmation as RequestHandler      // Sin validación de token (llamado por PayU)
);
// Verificar pago de producto por referencia
router.get('/verify/:reference', 
  validateToken as RequestHandler, // Usuario autenticado
  verifyPayment as RequestHandler  // Verificar estado del pago
);
// Respuesta de PayU después del pago
router.get('/payu-response', 
  payuResponse as RequestHandler   // Procesar respuesta de PayU
);
// 🔄 RUTAS PARA TRUEQUES
// Crear checkout web para trueques
router.post('/barter-web-checkout', 
  validateToken as RequestHandler,              // Usuario autenticado
  asyncHandler(createBarterWebCheckoutPayment)  // Generar URL de pago para trueque
);
// Confirmación de PayU para trueques (webhook)
router.post('/barter-payu-confirmation', 
  asyncHandler(barterPayuConfirmation)  // Sin validación (llamado por PayU)
);
// Verificar pago de trueque por referencia
router.get('/barter-verify/:reference', 
  validateToken as RequestHandler,       // Usuario autenticado
  asyncHandler(verifyBarterPayment)      // Verificar estado del pago de trueque
);
// Respuesta de PayU después del pago de trueque
router.get('/barter-payu-response', 
  barterPayuResponse  // Sin validación de token
);
// 🔧 RUTAS DE GESTIÓN DE COMPLETITUD DE TRUEQUES
// Verificar y actualizar completitud de trueque
router.post('/check-barter-completion', 
  validateToken as RequestHandler, // Usuario autenticado
  asyncHandler(async (req: Request, res: Response) => {
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
      await checkAndUpdateBarterCompletion(barterId);
      
      res.json({
        success: true,
        message: `Verificación de completitud ejecutada para barter ${barterId}`
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Error verificando completitud del barter',
        error: error.message
      });
    }
  })
);
// Actualizar estado de pago de trueque manualmente
router.put('/update-barter-payment-status', [
  validateToken as RequestHandler, // Usuario autenticado
  check('reference', 'La referencia es obligatoria').notEmpty(), // Referencia requerida
  check('status', 'El estado es obligatorio').isIn(['pendiente', 'completada', 'fallida', 'reembolsada']), // Estados válidos
  validateFields as RequestHandler // Validar campos
], updateBarterPaymentStatusEndpoint as RequestHandler);
// 📊 RUTAS DE CONSULTA DE VENTAS
// Obtener productos vendidos por el usuario
router.get('/payment/sold/:userId', 
  validateToken as RequestHandler, // Usuario autenticado
  getSoldProducts as RequestHandler // Lista de productos vendidos
);
export default router;
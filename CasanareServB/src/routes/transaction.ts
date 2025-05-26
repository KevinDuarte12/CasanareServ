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
  barterPayuConfirmation, // ✅ AGREGAR ESTA IMPORTACIÓN
  verifyBarterPayment,
  updateBarterPaymentStatus,
  barterPayuResponse, // ✅ AGREGAR ESTA IMPORTACIÓN
  payuResponse
} from '../controllers/transaction.controller';
import  validateToken  from '../middlewares/validate-token';

const router = Router();

// Función wrapper para manejar controladores asíncronos
const asyncHandler = 
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>): RequestHandler => 
    (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };

// Iniciar proceso de pago
router.post('/create', validateToken as RequestHandler, asyncHandler(createPayment));

// Completar proceso de pago
router.post('/complete', validateToken as RequestHandler, completePayment as RequestHandler);

// Recibir notificaciones de PayU (webhook)
// Este endpoint NO debe tener validación de token ya que lo llama PayU
router.post('/notification', asyncHandler(paymentNotification));

// Verificar estado de un pago por referencia
router.get('/status/:reference', validateToken as RequestHandler, asyncHandler(checkPaymentStatus));

// Historial de transacciones del usuario
router.get('/history/:userId', validateToken as RequestHandler, asyncHandler(getUserTransactions));

// Productos comprados por el usuario
router.get('/purchased/:userId', validateToken as RequestHandler, asyncHandler(getPurchasedProducts));

// Rutas para WebCheckout de PayU (productos normales)
router.post('/web-checkout', validateToken as RequestHandler, createWebCheckoutPayment as RequestHandler);
router.post('/payu-confirmation', payuConfirmation as RequestHandler); // Sin validación de token
router.get('/verify/:reference', validateToken as RequestHandler, verifyPayment as RequestHandler);
router.get('/payu-response', payuResponse as RequestHandler);

// ✅ RUTAS PARA TRUEQUES CORREGIDAS
router.post('/barter-web-checkout', validateToken as RequestHandler, asyncHandler(createBarterWebCheckoutPayment));
router.post('/barter-payu-confirmation', asyncHandler(barterPayuConfirmation));
router.get('/barter-verify/:reference', validateToken as RequestHandler, asyncHandler(verifyBarterPayment));
router.post('/update-barter-status', asyncHandler(updateBarterPaymentStatus)); // ✅ SIN validación de token para testing
router.get('/barter-payu-response', barterPayuResponse); // ✅ SIN validación de token

export default router;
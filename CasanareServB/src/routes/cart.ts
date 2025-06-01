import { Router } from 'express';
import { RequestHandler } from 'express';
import {
  getActiveCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  processLoginCart,
  getCartId
} from '../controllers/cart.controller';
import  validateToken  from '../middlewares/validate-token';

const router = Router();

// Rutas protegidas por autenticación
router.get('/', validateToken as RequestHandler, getActiveCart as RequestHandler);
router.post('/add', validateToken as RequestHandler, addToCart as RequestHandler);
router.patch('/items/:itemId', validateToken as RequestHandler, updateCartItem as RequestHandler);
router.delete('/items/:itemId', validateToken as RequestHandler, removeFromCart as RequestHandler);
router.delete('/clear', validateToken as RequestHandler, clearCart as RequestHandler);
router.get('/getid', validateToken as RequestHandler, getCartId as RequestHandler);

router.post('/process-pending', validateToken as RequestHandler, processLoginCart as RequestHandler);

export default router;
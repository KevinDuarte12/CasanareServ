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
/**
 * 🛒 RUTAS DE CARRITO DE COMPRAS
 * Gestiona todas las operaciones del carrito de un usuario autenticado
 * Todas las rutas requieren autenticación JWT
 */
const router = Router();
// 📋 RUTAS DE CONSULTA DEL CARRITO
// Obtener carrito activo del usuario autenticado
router.get('/', 
    validateToken as RequestHandler, // Autenticación requerida
    getActiveCart as RequestHandler  // Retorna carrito con items
);
// Obtener solo el ID del carrito activo
router.get('/getid', 
    validateToken as RequestHandler, // Autenticación requerida
    getCartId as RequestHandler      // Retorna solo el ID del carrito
);
// 🛍️ RUTAS DE GESTIÓN DE PRODUCTOS
// Agregar producto al carrito
router.post('/add', 
    validateToken as RequestHandler, // Usuario autenticado
    addToCart as RequestHandler      // Crea item o actualiza cantidad
);
// Actualizar cantidad de item específico en carrito
router.patch('/items/:itemId', 
    validateToken as RequestHandler, // Usuario autenticado
    updateCartItem as RequestHandler // Modifica cantidad del item
);
// Remover item específico del carrito
router.delete('/items/:itemId', 
    validateToken as RequestHandler, // Usuario autenticado
    removeFromCart as RequestHandler // Elimina item del carrito
);
// 🗑️ RUTAS DE LIMPIEZA
// Vaciar completamente el carrito del usuario
router.delete('/clear', 
    validateToken as RequestHandler, // Usuario autenticado
    clearCart as RequestHandler      // Elimina todos los items
);
// 🔄 RUTAS DE PROCESAMIENTO ESPECIAL
// Procesar carrito pendiente después del login
router.post('/process-pending', 
    validateToken as RequestHandler, // Usuario recién autenticado
    processLoginCart as RequestHandler // Consolida carrito previo al login
);
export default router;
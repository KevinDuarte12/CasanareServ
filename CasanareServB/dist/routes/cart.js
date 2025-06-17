"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const cart_controller_1 = require("../controllers/cart.controller");
const validate_token_1 = __importDefault(require("../middlewares/validate-token"));
/**
 * 🛒 RUTAS DE CARRITO DE COMPRAS
 * Gestiona todas las operaciones del carrito de un usuario autenticado
 * Todas las rutas requieren autenticación JWT
 */
const router = (0, express_1.Router)();
// 📋 RUTAS DE CONSULTA DEL CARRITO
// Obtener carrito activo del usuario autenticado
router.get('/', validate_token_1.default, // Autenticación requerida
cart_controller_1.getActiveCart // Retorna carrito con items
);
// Obtener solo el ID del carrito activo
router.get('/getid', validate_token_1.default, // Autenticación requerida
cart_controller_1.getCartId // Retorna solo el ID del carrito
);
// 🛍️ RUTAS DE GESTIÓN DE PRODUCTOS
// Agregar producto al carrito
router.post('/add', validate_token_1.default, // Usuario autenticado
cart_controller_1.addToCart // Crea item o actualiza cantidad
);
// Actualizar cantidad de item específico en carrito
router.patch('/items/:itemId', validate_token_1.default, // Usuario autenticado
cart_controller_1.updateCartItem // Modifica cantidad del item
);
// Remover item específico del carrito
router.delete('/items/:itemId', validate_token_1.default, // Usuario autenticado
cart_controller_1.removeFromCart // Elimina item del carrito
);
// 🗑️ RUTAS DE LIMPIEZA
// Vaciar completamente el carrito del usuario
router.delete('/clear', validate_token_1.default, // Usuario autenticado
cart_controller_1.clearCart // Elimina todos los items
);
// 🔄 RUTAS DE PROCESAMIENTO ESPECIAL
// Procesar carrito pendiente después del login
router.post('/process-pending', validate_token_1.default, // Usuario recién autenticado
cart_controller_1.processLoginCart // Consolida carrito previo al login
);
exports.default = router;

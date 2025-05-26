"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const cart_controller_1 = require("../controllers/cart.controller");
const validate_token_1 = __importDefault(require("../middlewares/validate-token"));
const router = (0, express_1.Router)();
// Rutas protegidas por autenticación
router.get('/', validate_token_1.default, cart_controller_1.getActiveCart);
router.post('/add', validate_token_1.default, cart_controller_1.addToCart);
router.patch('/items/:itemId', validate_token_1.default, cart_controller_1.updateCartItem);
router.delete('/items/:itemId', validate_token_1.default, cart_controller_1.removeFromCart);
router.delete('/clear', validate_token_1.default, cart_controller_1.clearCart);
router.get('/getid', validate_token_1.default, cart_controller_1.getCartId);
router.post('/process-pending', validate_token_1.default, cart_controller_1.processLoginCart);
exports.default = router;

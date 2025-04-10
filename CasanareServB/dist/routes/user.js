"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_controller_1 = require("../controllers/user.controller");
const validate_token_1 = __importDefault(require("../middlewares/validate-token")); // Asegúrate de que la ruta sea correcta
const router = (0, express_1.Router)();
// Rutas públicas
router.post('/', user_controller_1.newUser);
router.get('/verify-email', user_controller_1.verifyEmail);
router.post('/login', user_controller_1.login);
router.post('/forgot-password', user_controller_1.forgotPassword);
router.post('/reset-password', user_controller_1.resetPassword);
router.get('/profile', validate_token_1.default, user_controller_1.getUserProfile);
// Rutas protegidas (necesitan token)
router.get('/', user_controller_1.getUsers); // Cambio: de /users a /
router.get('/:id', validate_token_1.default, user_controller_1.getUserById); // Añade esta ruta
router.put('/:id', validate_token_1.default, user_controller_1.updateUser);
router.delete('/:id', validate_token_1.default, user_controller_1.deleteUser);
// Añade esta ruta junto con las demás rutas protegidas
router.get('/profile', validate_token_1.default, user_controller_1.getUserProfile);
exports.default = router;

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_controller_1 = require("../controllers/user.controller");
const validate_token_1 = __importDefault(require("../middlewares/validate-token"));
const validate_admin_1 = require("../middlewares/validate-admin"); // Importar correctamente las funciones del middleware
const router = (0, express_1.Router)();
// Rutas públicas
router.post('/', user_controller_1.newUser);
router.get('/verify', user_controller_1.verifyEmail);
router.post('/login', user_controller_1.login);
router.post('/forgot-password', user_controller_1.forgotPassword);
router.post('/reset-password', user_controller_1.resetPassword);
// Rutas protegidas (necesitan token)
router.get('/profile', validate_token_1.default, user_controller_1.getUserProfile);
router.post('/profile-image/:id', validate_token_1.default, user_controller_1.uploadProfileImage);
// Nueva ruta para actualizar el propio perfil del usuario
router.put('/profile', validate_token_1.default, user_controller_1.updateUserProfile);
// Rutas que requieren autenticación pero son accesibles para todos los usuarios
router.get('/', validate_token_1.default, user_controller_1.getUsers);
router.get('/:id', validate_token_1.default, user_controller_1.getUserById);
// Rutas que requieren autenticación Y rol de administrador
router.put('/:id', [
    validate_token_1.default,
    validate_admin_1.isAdmin // Usar isAdmin en lugar de validateAdmin
], user_controller_1.updateUser);
router.delete('/:id', [
    validate_token_1.default,
    validate_admin_1.isAdmin // Usar isAdmin en lugar de validateAdmin
], user_controller_1.deleteUser);
// Ejemplo de ruta que requiere rol admin o vendedor (opcional)
// router.get('/reports/sales', [
//     validateToken as RequestHandler, 
//     hasRole('admin', 'vendedor') as unknown as RequestHandler
// ], getSalesReports as RequestHandler);
exports.default = router;

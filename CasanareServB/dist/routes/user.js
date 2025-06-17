"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_controller_1 = require("../controllers/user.controller");
const validate_token_1 = __importDefault(require("../middlewares/validate-token"));
const validate_admin_1 = require("../middlewares/validate-admin");
/**
 *  RUTAS DE USUARIOS
 * Sistema completo de gestión de usuarios y autenticación
 * Incluye registro, login, perfil, recuperación de contraseña y administración
 */
const router = (0, express_1.Router)();
// RUTAS PÚBLICAS (sin autenticación)
// Registrar nuevo usuario
router.post('/', user_controller_1.newUser);
// Verificar email después del registro
router.get('/verify', user_controller_1.verifyEmail);
// Iniciar sesión
router.post('/login', user_controller_1.login);
// Solicitar recuperación de contraseña
router.post('/forgot-password', user_controller_1.forgotPassword);
// Restablecer contraseña con token
router.post('/reset-password', user_controller_1.resetPassword);
// RUTAS PROTEGIDAS (requieren autenticación)
// Obtener perfil del usuario autenticado
router.get('/profile', validate_token_1.default, // Usuario autenticado
user_controller_1.getUserProfile // Datos del perfil propio
);
//Subir imagen de perfil
router.post('/profile-image/:id', validate_token_1.default, // Usuario autenticado
user_controller_1.uploadProfileImage // Actualizar foto de perfil
);
// Actualizar el propio perfil del usuario
router.put('/profile', validate_token_1.default, // Usuario autenticado
user_controller_1.updateUserProfile // Modificar datos propios
);
//  RUTAS DE CONSULTA (autenticadas pero accesibles para todos)
// Obtener lista de usuarios
router.get('/', validate_token_1.default, // Usuario autenticado
user_controller_1.getUsers // Lista de usuarios (puede ser filtrada)
);
// Obtener usuario específico por ID
router.get('/:id', validate_token_1.default, // Usuario autenticado
user_controller_1.getUserById // Datos de usuario específico
);
// RUTAS ADMINISTRATIVAS (requieren rol admin)
// Actualizar usuario como administrador
router.put('/:id', [
    validate_token_1.default, // Usuario autenticado
    validate_admin_1.isAdmin // Solo administradores
], user_controller_1.updateUser);
// Eliminar usuario (solo administradores)
router.delete('/:id', [
    validate_token_1.default, // Usuario autenticado
    validate_admin_1.isAdmin // Solo administradores
], user_controller_1.deleteUser);
exports.default = router;

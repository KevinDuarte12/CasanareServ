import { Router } from 'express';
import { 
    newUser, 
    login, 
    getUsers, 
    updateUser, 
    deleteUser,
    verifyEmail,
    forgotPassword,
    resetPassword,
    getUserById,
    getUserProfile,
    uploadProfileImage,
    updateUserProfile
} from '../controllers/user.controller';
import validateToken from '../middlewares/validate-token';
import { isAdmin, hasRole } from '../middlewares/validate-admin';
import { RequestHandler } from 'express';
/**
 *  RUTAS DE USUARIOS
 * Sistema completo de gestión de usuarios y autenticación
 * Incluye registro, login, perfil, recuperación de contraseña y administración
 */
const router = Router();
// RUTAS PÚBLICAS (sin autenticación)
// Registrar nuevo usuario
router.post('/', newUser);
// Verificar email después del registro
router.get('/verify', verifyEmail);
// Iniciar sesión
router.post('/login', login);
// Solicitar recuperación de contraseña
router.post('/forgot-password', forgotPassword);
// Restablecer contraseña con token
router.post('/reset-password', resetPassword);
// RUTAS PROTEGIDAS (requieren autenticación)
// Obtener perfil del usuario autenticado
router.get('/profile', 
    validateToken as RequestHandler, // Usuario autenticado
    getUserProfile as RequestHandler // Datos del perfil propio
);
//Subir imagen de perfil
router.post('/profile-image/:id', 
    validateToken as RequestHandler,   // Usuario autenticado
    uploadProfileImage as RequestHandler // Actualizar foto de perfil
);
// Actualizar el propio perfil del usuario
router.put('/profile', 
    validateToken as RequestHandler,  // Usuario autenticado
    updateUserProfile as RequestHandler // Modificar datos propios
);

//  RUTAS DE CONSULTA (autenticadas pero accesibles para todos)
// Obtener lista de usuarios
router.get('/', 
    validateToken as RequestHandler, // Usuario autenticado
    getUsers // Lista de usuarios (puede ser filtrada)
);
// Obtener usuario específico por ID
router.get('/:id', 
    validateToken as RequestHandler, // Usuario autenticado
    getUserById // Datos de usuario específico
);
// RUTAS ADMINISTRATIVAS (requieren rol admin)

// Actualizar usuario como administrador
router.put('/:id', [
    validateToken as RequestHandler,     // Usuario autenticado
    isAdmin as unknown as RequestHandler // Solo administradores
], updateUser as RequestHandler);
// Eliminar usuario (solo administradores)
router.delete('/:id', [
    validateToken as RequestHandler,     // Usuario autenticado
    isAdmin as unknown as RequestHandler // Solo administradores
], deleteUser as RequestHandler);

export default router;
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
    updateUserProfile // Nuevo controlador importado
} from '../controllers/user.controller';
import validateToken from '../middlewares/validate-token';
import { isAdmin, hasRole } from '../middlewares/validate-admin'; // Importar correctamente las funciones del middleware
import { RequestHandler } from 'express';

const router = Router();

// Rutas públicas
router.post('/', newUser);
router.get('/verify', verifyEmail);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Rutas protegidas (necesitan token)
router.get('/profile', validateToken as RequestHandler, getUserProfile as RequestHandler);
router.post('/profile-image/:id', validateToken as RequestHandler, uploadProfileImage as RequestHandler);

// Nueva ruta para actualizar el propio perfil del usuario
router.put('/profile', validateToken as RequestHandler, updateUserProfile as RequestHandler);

// Rutas que requieren autenticación pero son accesibles para todos los usuarios
router.get('/', validateToken as RequestHandler, getUsers);
router.get('/:id', validateToken as RequestHandler, getUserById);

// Rutas que requieren autenticación Y rol de administrador
router.put('/:id', [
    validateToken as RequestHandler,
    isAdmin as unknown as RequestHandler  // Usar isAdmin en lugar de validateAdmin
], updateUser as RequestHandler);

router.delete('/:id', [
    validateToken as RequestHandler,
    isAdmin as unknown as RequestHandler  // Usar isAdmin en lugar de validateAdmin
], deleteUser as RequestHandler);

// Ejemplo de ruta que requiere rol admin o vendedor (opcional)
// router.get('/reports/sales', [
//     validateToken as RequestHandler, 
//     hasRole('admin', 'vendedor') as unknown as RequestHandler
// ], getSalesReports as RequestHandler);

export default router;
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
    uploadProfileImage
} from '../controllers/user.controller';
import validateToken from '../middlewares/validate-token';
import { RequestHandler } from 'express';

const router = Router();

// Rutas públicas
router.post('/', newUser);
router.get('/verify-email', verifyEmail);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Rutas protegidas (necesitan token)
router.get('/profile', validateToken as RequestHandler, getUserProfile as RequestHandler);
router.post('/profile-image/:id', validateToken as RequestHandler, uploadProfileImage as RequestHandler);
router.get('/', validateToken as RequestHandler, getUsers);
router.get('/:id', validateToken as RequestHandler, getUserById);
router.put('/:id', validateToken as RequestHandler, updateUser);
router.delete('/:id', validateToken as RequestHandler, deleteUser);

export default router;
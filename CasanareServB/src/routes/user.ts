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
    getUserById // Importa el controlador que crearemos
} from '../controllers/user.controller';
import validateToken from '../middlewares/validate-token'; // Asegúrate de que la ruta sea correcta
import { RequestHandler } from 'express';

const router = Router();

// Rutas públicas
router.post('/', newUser);
router.get('/verify-email', verifyEmail)
router.post('/login', login );
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Rutas protegidas (necesitan token)
router.get('/',  getUsers);                    // Cambio: de /users a /
router.get('/:id', validateToken as RequestHandler, getUserById); // Añade esta ruta
router.put('/:id', validateToken as RequestHandler, updateUser );
router.delete('/:id', validateToken as RequestHandler, deleteUser );

export default router;
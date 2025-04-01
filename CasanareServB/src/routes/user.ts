import { Router } from 'express';
import { 
    newUser, 
    login, 
    getUsers, 
    updateUser, 
    deleteUser
} from '../controllers/user.controller';
import validateToken from './validate-token';
import { RequestHandler } from 'express';

const router = Router();

// Rutas públicas
router.post('/', newUser);
router.post('/login', login as RequestHandler);

// Rutas protegidas (necesitan token)
router.get('/',  getUsers);                    // Cambio: de /users a /
router.put('/:id', validateToken, updateUser as RequestHandler);
router.delete('/:id', validateToken, deleteUser as RequestHandler);

export default router;
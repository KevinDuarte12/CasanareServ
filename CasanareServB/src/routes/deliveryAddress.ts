import { RequestHandler, Router } from 'express';
import {
    getUserAddresses,
    getAddressById,
    createAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress
} from '../controllers/deliveryAddress.controller';
import validateToken from '../middlewares/validate-token'

const router = Router();

// Middleware para extraer el ID del usuario del token
const extractUserId = (req: any, _res: any, next: any) => {
    if (!req.user || !req.user.id) {
        return next(new Error('Usuario no autenticado'));
    }

    // Añadir el userId a los parámetros de la solicitud
    req.params.userId = req.user.id;
    next();
};

// Rutas protegidas que requieren autenticación
// Todas estas rutas utilizan el ID de usuario del token JWT

// Obtener todas las direcciones del usuario autenticado
router.get('/', [validateToken as RequestHandler, extractUserId], getUserAddresses);

// Obtener una dirección específica
router.get('/:id', [validateToken as RequestHandler, extractUserId], getAddressById as RequestHandler);

// Crear una nueva dirección
router.post('/', [validateToken as RequestHandler, extractUserId], createAddress as RequestHandler);

// Actualizar una dirección existente
router.put('/:id', [validateToken as RequestHandler, extractUserId], updateAddress as RequestHandler);

// Eliminar una dirección
router.delete('/:id', [validateToken as RequestHandler, extractUserId], deleteAddress as RequestHandler);

// Establecer una dirección como predeterminada
router.patch('/:id/default', [validateToken as RequestHandler, extractUserId], setDefaultAddress as RequestHandler);

export default router;
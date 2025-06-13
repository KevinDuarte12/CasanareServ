import { RequestHandler, Router } from 'express';
import {
    getUserAddresses,
    getAddressById,
    createAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress
} from '../controllers/deliveryAddress.controller';
import validateToken from '../middlewares/validate-token';
/**
 * 📍 RUTAS DE DIRECCIONES DE ENTREGA
 * Gestiona todas las operaciones CRUD de direcciones de usuarios
 * Incluye funcionalidad de dirección predeterminada y seguridad por usuario
 */
const router = Router();
/**
 * Middleware personalizado para extraer ID de usuario del token JWT
 * Automatiza la asignación del userId a los parámetros de la request
 */
const extractUserId = (req: any, _res: any, next: any) => {
    // Verificar que el usuario esté autenticado y tenga ID
    if (!req.user || !req.user.id) {
        return next(new Error('Usuario no autenticado'));
    }
    // Añadir el userId a los parámetros de la solicitud para uso posterior
    req.params.userId = req.user.id;
    next();
};
// 🔐 RUTAS PROTEGIDAS (requieren autenticación)
// Todas estas rutas utilizan el ID de usuario del token JWT
// Obtener todas las direcciones del usuario autenticado
router.get('/', [
    validateToken as RequestHandler, // Validar token JWT
    extractUserId                    // Extraer ID del usuario del token
], getUserAddresses);
// Obtener una dirección específica del usuario
router.get('/:id', [
    validateToken as RequestHandler, // Usuario autenticado
    extractUserId                    // ID del usuario del token
], getAddressById as RequestHandler);
// Crear una nueva dirección para el usuario
router.post('/', [
    validateToken as RequestHandler, // Usuario autenticado
    extractUserId                    // ID del usuario del token
], createAddress as RequestHandler);
// Actualizar una dirección existente del usuario
router.put('/:id', [
    validateToken as RequestHandler, // Usuario autenticado
    extractUserId                    // ID del usuario del token
], updateAddress as RequestHandler);
// Eliminar una dirección del usuario
router.delete('/:id', [
    validateToken as RequestHandler, // Usuario autenticado
    extractUserId                    // ID del usuario del token
], deleteAddress as RequestHandler);
// Establecer una dirección como predeterminada
router.patch('/:id/default', [
    validateToken as RequestHandler, // Usuario autenticado
    extractUserId                    // ID del usuario del token
], setDefaultAddress as RequestHandler);
// 🔍 RUTA ADMINISTRATIVA/CONSULTA
// Obtener direcciones de un usuario específico (por parámetro)
router.get('/user/:userId', [
    validateToken as RequestHandler  // Solo autenticación requerida
], getUserAddresses);

export default router;
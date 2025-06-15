"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const deliveryAddress_controller_1 = require("../controllers/deliveryAddress.controller");
const validate_token_1 = __importDefault(require("../middlewares/validate-token"));
/**
 * 📍 RUTAS DE DIRECCIONES DE ENTREGA
 * Gestiona todas las operaciones CRUD de direcciones de usuarios
 * Incluye funcionalidad de dirección predeterminada y seguridad por usuario
 */
const router = (0, express_1.Router)();
/**
 * Middleware personalizado para extraer ID de usuario del token JWT
 * Automatiza la asignación del userId a los parámetros de la request
 */
const extractUserId = (req, _res, next) => {
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
    validate_token_1.default, // Validar token JWT
    extractUserId // Extraer ID del usuario del token
], deliveryAddress_controller_1.getUserAddresses);
// Obtener una dirección específica del usuario
router.get('/:id', [
    validate_token_1.default, // Usuario autenticado
    extractUserId // ID del usuario del token
], deliveryAddress_controller_1.getAddressById);
// Crear una nueva dirección para el usuario
router.post('/', [
    validate_token_1.default, // Usuario autenticado
    extractUserId // ID del usuario del token
], deliveryAddress_controller_1.createAddress);
// Actualizar una dirección existente del usuario
router.put('/:id', [
    validate_token_1.default, // Usuario autenticado
    extractUserId // ID del usuario del token
], deliveryAddress_controller_1.updateAddress);
// Eliminar una dirección del usuario
router.delete('/:id', [
    validate_token_1.default, // Usuario autenticado
    extractUserId // ID del usuario del token
], deliveryAddress_controller_1.deleteAddress);
// Establecer una dirección como predeterminada
router.patch('/:id/default', [
    validate_token_1.default, // Usuario autenticado
    extractUserId // ID del usuario del token
], deliveryAddress_controller_1.setDefaultAddress);
// 🔍 RUTA ADMINISTRATIVA/CONSULTA
// Obtener direcciones de un usuario específico (por parámetro)
router.get('/user/:userId', [
    validate_token_1.default // Solo autenticación requerida
], deliveryAddress_controller_1.getUserAddresses);
exports.default = router;

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const deliveryAddress_controller_1 = require("../controllers/deliveryAddress.controller");
const validate_token_1 = __importDefault(require("../middlewares/validate-token"));
const router = (0, express_1.Router)();
// Middleware para extraer el ID del usuario del token
const extractUserId = (req, _res, next) => {
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
router.get('/', [validate_token_1.default, extractUserId], deliveryAddress_controller_1.getUserAddresses);
// Obtener una dirección específica
router.get('/:id', [validate_token_1.default, extractUserId], deliveryAddress_controller_1.getAddressById);
// Crear una nueva dirección
router.post('/', [validate_token_1.default, extractUserId], deliveryAddress_controller_1.createAddress);
// Actualizar una dirección existente
router.put('/:id', [validate_token_1.default, extractUserId], deliveryAddress_controller_1.updateAddress);
// Eliminar una dirección
router.delete('/:id', [validate_token_1.default, extractUserId], deliveryAddress_controller_1.deleteAddress);
// Establecer una dirección como predeterminada
router.patch('/:id/default', [validate_token_1.default, extractUserId], deliveryAddress_controller_1.setDefaultAddress);
// Agregar esta ruta en el mismo archivo deliveryAddress.ts
router.get('/user/:userId', [validate_token_1.default], deliveryAddress_controller_1.getUserAddresses);
exports.default = router;

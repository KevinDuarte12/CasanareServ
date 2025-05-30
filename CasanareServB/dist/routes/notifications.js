"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const validate_token_1 = __importDefault(require("../middlewares/validate-token"));
const express_validator_1 = require("express-validator");
const validate_request_1 = require("../middlewares/validate-request");
const notifications_controller_1 = require("../controllers/notifications.controller");
const router = (0, express_1.Router)();
// Ruta de diagnóstico sin autenticación
router.get('/debug', ((_req, res) => {
    console.log('🔍 Accediendo a ruta de diagnóstico de notificaciones');
    res.status(200).json({
        message: 'API de Notificaciones funcionando correctamente',
        timestamp: new Date().toISOString(),
        routes: [
            '/user/:userId/unread-count',
            '/user/:userId',
            '/:notificationId/read'
        ]
    });
}));
// IMPORTANTE: Rutas específicas con /user/ deben ir ANTES de /:notificationId
router.get('/user/:userId/unread-count', validate_token_1.default, notifications_controller_1.getUnreadCount);
router.get('/user/:userId', validate_token_1.default, notifications_controller_1.getUserNotifications);
router.patch('/user/:userId/read-all', validate_token_1.default, notifications_controller_1.markAllNotificationsAsRead);
// IMPORTANTE: Esta ruta debe coincidir exactamente con la URL que usas en el frontend
// Cambiado de '/:notificationId/read' a '/:id/read' para que coincida con el controlador
router.patch('/:id/read', validate_token_1.default, notifications_controller_1.markNotificationAsRead);
router.post('/', [
    validate_token_1.default,
    (0, express_validator_1.check)('id_user', 'El ID de usuario es requerido').isNumeric(),
    (0, express_validator_1.check)('type', 'El tipo de notificación es requerido').notEmpty(),
    (0, express_validator_1.check)('title', 'El título es requerido').notEmpty(),
    (0, express_validator_1.check)('message', 'El mensaje es requerido').notEmpty(),
    validate_request_1.validateFields
], notifications_controller_1.createNotification);
router.delete('/:id', validate_token_1.default, notifications_controller_1.deleteNotification);
router.delete('/user/:userId/all', validate_token_1.default, notifications_controller_1.deleteAllNotifications);
console.log('✅ Rutas de notificaciones registradas');
exports.default = router;

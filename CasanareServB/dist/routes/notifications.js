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
/**
 * 🔔 RUTAS DE NOTIFICACIONES
 * Sistema completo de notificaciones push para usuarios
 * Incluye creación, consulta, marcado de lectura y eliminación
 */
const router = (0, express_1.Router)();
// 🔍 RUTA DE DIAGNÓSTICO (sin autenticación)
// Verificar funcionamiento de la API de notificaciones
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
// 📊 RUTAS DE CONSULTA POR USUARIO
// Obtener contador de notificaciones no leídas del usuario
router.get('/user/:userId/unread-count', validate_token_1.default, // Autenticación requerida
notifications_controller_1.getUnreadCount // Retorna cantidad de no leídas
);
// Obtener todas las notificaciones del usuario
router.get('/user/:userId', validate_token_1.default, // Usuario autenticado
notifications_controller_1.getUserNotifications // Lista completa de notificaciones
);
// 📖 RUTAS DE MARCADO DE LECTURA
// Marcar todas las notificaciones del usuario como leídas
router.patch('/user/:userId/read-all', validate_token_1.default, // Usuario autenticado
notifications_controller_1.markAllNotificationsAsRead // Actualiza todas a leída
);
// Marcar notificación específica como leída
router.patch('/:id/read', validate_token_1.default, // Usuario autenticado
notifications_controller_1.markNotificationAsRead // Marca una como leída
);
// 📝 RUTAS DE CREACIÓN
// Crear nueva notificación
router.post('/', [
    validate_token_1.default, // Usuario autenticado
    (0, express_validator_1.check)('id_user', 'El ID de usuario es requerido').isNumeric(), // Validar destinatario
    (0, express_validator_1.check)('type', 'El tipo de notificación es requerido').notEmpty(), // Tipo obligatorio
    (0, express_validator_1.check)('title', 'El título es requerido').notEmpty(), // Título obligatorio
    (0, express_validator_1.check)('message', 'El mensaje es requerido').notEmpty(), // Mensaje obligatorio
    validate_request_1.validateFields // Verificar errores de validación
], notifications_controller_1.createNotification);
// 🗑️ RUTAS DE ELIMINACIÓN
// Eliminar notificación específica
router.delete('/:id', validate_token_1.default, // Usuario autenticado
notifications_controller_1.deleteNotification // Eliminar por ID
);
// Eliminar todas las notificaciones del usuario
router.delete('/user/:userId/all', validate_token_1.default, // Usuario autenticado
notifications_controller_1.deleteAllNotifications // Limpiar todas
);
console.log('✅ Rutas de notificaciones registradas');
exports.default = router;

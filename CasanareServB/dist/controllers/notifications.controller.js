"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUnreadCount = exports.deleteNotification = exports.markAllNotificationsAsRead = exports.markNotificationAsRead = exports.getUserNotifications = exports.createNotification = void 0;
const notifications_1 = __importDefault(require("../db/models/notifications"));
const user_1 = __importDefault(require("../db/models/user"));
const socket_1 = require("../sockets/socket");
console.log('🔄 Cargando controlador de notificaciones');
// Crear una nueva notificación
const createNotification = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id_user, type, title, message, entity_type, entity_id, action_url } = req.body;
        // Verificar que el usuario existe
        const userExists = yield user_1.default.findByPk(id_user);
        if (!userExists) {
            return res.status(404).json({
                msg: `No existe un usuario con el ID ${id_user}`
            });
        }
        // Crear la notificación
        const notification = yield notifications_1.default.create({
            id_user: id_user, // Cambia a user_id si ese es el nombre en la DB
            type,
            title,
            message,
            entity_type,
            entity_id,
            action_url: action_url || null,
            is_read: false
        });
        // Enviar notificación en tiempo real
        const io = (0, socket_1.getSocketServer)();
        if (io) {
            (0, socket_1.sendNotificationToUser)(io, id_user, notification);
        }
        res.status(201).json({
            msg: 'Notificación creada correctamente',
            notification
        });
    }
    catch (error) {
        console.error('Error al crear notificación:', error);
        res.status(500).json({
            msg: 'Error al crear la notificación'
        });
    }
});
exports.createNotification = createNotification;
// Obtener notificaciones de un usuario específico
const getUserNotifications = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.params;
        const { limit = 20, page = 1, unread_only = false } = req.query;
        const pageSize = parseInt(limit);
        const offset = (parseInt(page) - 1) * pageSize;
        // Configurar filtros según los parámetros
        const whereClause = { id_user: userId }; // Cambia a user_id
        if (unread_only === 'true') {
            whereClause.is_read = false;
        }
        // Obtener las notificaciones
        const { count, rows } = yield notifications_1.default.findAndCountAll({
            where: whereClause,
            limit: pageSize,
            offset,
            order: [['created_at', 'DESC']]
        });
        res.json({
            total: count,
            page: parseInt(page),
            page_size: pageSize,
            total_pages: Math.ceil(count / pageSize),
            notifications: rows
        });
    }
    catch (error) {
        console.error(`Error al obtener notificaciones del usuario:`, error);
        res.status(500).json({
            msg: 'Error al obtener las notificaciones'
        });
    }
});
exports.getUserNotifications = getUserNotifications;
// Marcar una notificación como leída
const markNotificationAsRead = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // IMPORTANTE: Usar 'id' en lugar de 'notificationId' para que coincida con la ruta
        const { id } = req.params;
        console.log(`📌 Marcando notificación como leída: ID ${id}`);
        // Verificar que la notificación existe
        const notification = yield notifications_1.default.findByPk(id);
        if (!notification) {
            console.log(`❌ Notificación con ID ${id} no encontrada`);
            return res.status(404).json({
                ok: false,
                msg: `No existe una notificación con el ID ${id}`
            });
        }
        // Actualizar a leída
        yield notification.update({ is_read: true });
        console.log(`✅ Notificación ${id} marcada como leída`);
        res.status(200).json({
            ok: true,
            msg: 'Notificación marcada como leída correctamente',
            notification
        });
    }
    catch (error) {
        console.error('❌ Error al marcar notificación como leída:', error.message);
        res.status(500).json({
            ok: false,
            msg: 'Error al actualizar la notificación'
        });
    }
});
exports.markNotificationAsRead = markNotificationAsRead;
// Marcar todas las notificaciones de un usuario como leídas
const markAllNotificationsAsRead = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.params;
        // Actualizar todas las notificaciones no leídas del usuario
        yield notifications_1.default.update({ is_read: true }, {
            where: {
                user_id: userId, // Cambia a user_id
                is_read: false
            }
        });
        res.json({
            msg: 'Todas las notificaciones marcadas como leídas correctamente'
        });
    }
    catch (error) {
        console.error('Error al marcar todas las notificaciones como leídas:', error);
        res.status(500).json({
            msg: 'Error al actualizar las notificaciones'
        });
    }
});
exports.markAllNotificationsAsRead = markAllNotificationsAsRead;
// Eliminar una notificación
const deleteNotification = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Utilizar 'id' en lugar de 'notificationId' para que coincida con la ruta
        const { id } = req.params;
        console.log(`⚡ Intentando eliminar notificación con ID: ${id}`);
        // Verificar que la notificación existe
        const notification = yield notifications_1.default.findByPk(id);
        if (!notification) {
            console.log(`❌ Notificación con ID ${id} no encontrada`);
            return res.status(404).json({
                msg: `No existe una notificación con el ID ${id}`
            });
        }
        // Eliminar la notificación
        yield notification.destroy();
        console.log(`✅ Notificación ${id} eliminada correctamente`);
        res.json({
            msg: 'Notificación eliminada correctamente'
        });
    }
    catch (error) {
        console.error('❌ Error al eliminar notificación:', error);
        res.status(500).json({
            msg: 'Error al eliminar la notificación'
        });
    }
});
exports.deleteNotification = deleteNotification;
// Obtener el conteo de notificaciones no leídas para un usuario
const getUnreadCount = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log('🔢 Ejecutando getUnreadCount');
    console.log(`📌 Parámetros:`, req.params);
    console.log(`📌 Query:`, req.query);
    try {
        const { userId } = req.params;
        console.log(`🆔 ID de usuario: ${userId}`);
        // Verificar estructura de la base de datos
        try {
            // Esta consulta comprobará si la tabla existe y tiene la estructura esperada
            const testQuery = yield notifications_1.default.findOne();
            console.log(`✅ Tabla de notificaciones encontrada: ${!!testQuery || 'Vacía pero accesible'}`);
        }
        catch (dbError) {
            console.error('❌ Problema accediendo a la tabla de notificaciones:', dbError);
            // Seguir con la función para ver si podemos recuperarnos
        }
        // Verificar que el usuario existe
        const user = yield user_1.default.findByPk(userId);
        console.log(`👤 Usuario encontrado: ${!!user}`);
        if (!user) {
            console.log(`❌ Usuario con ID ${userId} no encontrado`);
            return res.status(404).json({
                success: false,
                msg: 'Usuario no encontrado'
            });
        }
        // Contar notificaciones no leídas para el usuario
        console.log(`🔍 Contando notificaciones no leídas para usuario ${userId}`);
        const unreadCount = yield notifications_1.default.count({
            where: {
                id_user: userId, // Cambia a user_id
                is_read: false
            }
        });
        console.log(`✅ Conteo completado: ${unreadCount} notificaciones no leídas`);
        return res.status(200).json({
            success: true,
            unread_count: unreadCount
        });
    }
    catch (error) {
        console.error('❌ Error en getUnreadCount:', error);
        if (error && error.stack) {
            console.error(`Stack: ${error.stack}`);
        }
        return res.status(500).json({
            success: false,
            msg: 'Error al obtener conteo de notificaciones no leídas',
            error: error && error.message ? error.message : 'Error desconocido'
        });
    }
});
exports.getUnreadCount = getUnreadCount;

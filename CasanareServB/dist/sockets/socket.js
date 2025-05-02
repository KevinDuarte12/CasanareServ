"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitBarterUpdate = exports.sendNotificationToUser = exports.setSocketServer = exports.getSocketServer = exports.initializeSocketServer = void 0;
const socket_io_1 = require("socket.io");
// Mapa para rastrear los usuarios conectados: userId => socketId
const connectedUsers = new Map();
// Instancia global
let io = null;
const initializeSocketServer = (server) => {
    if (io) {
        console.log('⚠️ Socket.IO ya está inicializado');
        return io;
    }
    console.log('🔄 Inicializando Socket.IO server...');
    io = new socket_io_1.Server(server, {
        cors: {
            origin: "http://localhost:4200",
            methods: ["GET", "POST"],
            credentials: true
        },
        path: '/socket.io/'
    });
    io.on('connection', (socket) => {
        console.log(`🔌 Cliente conectado: ${socket.id}`);
        // Enviar un mensaje de confirmación al cliente
        socket.emit('connection_confirmed', {
            message: 'Conectado al servidor de CasanareServ',
            socketId: socket.id
        });
        // Emitir evento de prueba inmediatamente
        socket.emit('socket_connected', { message: 'Conexión establecida' });
        // Autenticar y asociar el socket con un userId
        socket.on('authenticate', (userId) => {
            console.log(`👤 Usuario ${userId} autenticado en socket ${socket.id}`);
            // Guardar la asociación userId => socketId
            connectedUsers.set(userId, socket.id);
            // Unirse a una sala personalizada para este usuario
            socket.join(`user_${userId}`);
            // Confirmar autenticación exitosa
            socket.emit('authenticated', { userId });
        });
        socket.on('disconnect', (reason) => {
            console.log(`🔌 Cliente desconectado: ${socket.id}, Razón: ${reason}`);
            // Eliminar usuario del mapa de usuarios conectados
            for (const [userId, socketId] of connectedUsers.entries()) {
                if (socketId === socket.id) {
                    console.log(`👤 Usuario ${userId} desconectado`);
                    connectedUsers.delete(userId);
                    break;
                }
            }
        });
    });
    console.log('✅ Socket.IO inicializado correctamente');
    return io;
};
exports.initializeSocketServer = initializeSocketServer;
const getSocketServer = () => {
    if (!io) {
        console.warn('⚠️ Intento de acceder a Socket.IO antes de inicializarlo');
    }
    return io;
};
exports.getSocketServer = getSocketServer;
const setSocketServer = (socketServer) => {
    io = socketServer;
    console.log('💾 Instancia Socket.IO guardada globalmente');
};
exports.setSocketServer = setSocketServer;
// Función para enviar notificación a un usuario específico
const sendNotificationToUser = (io, userId, notification) => {
    if (!io)
        return;
    try {
        // Intentar enviar a un usuario específico usando su sala
        io.to(`user_${userId}`).emit('new_notification', notification);
        console.log(`Notificación enviada a usuario ${userId}`);
    }
    catch (error) {
        console.error('Error al enviar notificación por socket:', error);
    }
};
exports.sendNotificationToUser = sendNotificationToUser;
// Función para transmitir una actualización de trueque a los usuarios involucrados
const emitBarterUpdate = (io, barterId, status, offeringUserId, receivingUserId) => {
    if (!io)
        return;
    try {
        const updateData = { barterId, status, updatedAt: new Date() };
        // Notificar al usuario que ofrece
        io.to(`user_${offeringUserId}`).emit('barter_updated', updateData);
        // Notificar al usuario que recibe (si existe)
        if (receivingUserId) {
            io.to(`user_${receivingUserId}`).emit('barter_updated', updateData);
        }
        console.log(`Actualización de trueque ${barterId} enviada a usuarios ${offeringUserId} y ${receivingUserId || 'N/A'}`);
    }
    catch (error) {
        console.error('Error al emitir actualización de trueque:', error);
    }
};
exports.emitBarterUpdate = emitBarterUpdate;

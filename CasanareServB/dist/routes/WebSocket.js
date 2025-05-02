"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const socket_1 = require("../sockets/socket");
console.log('📌 Registrando rutas WebSocket...');
const router = (0, express_1.Router)();
// Ruta para diagnóstico simple (GET)
router.get('/test', ((_req, res) => {
    console.log('📍 Test WebSocket GET recibido');
    res.json({ message: 'WebSocket diagnostics endpoint is working' });
}));
// Ruta para diagnóstico de WebSockets
router.get('/status', ((_req, res) => {
    var _a;
    console.log('📊 Consulta de estado WebSocket recibida');
    const io = (0, socket_1.getSocketServer)();
    res.json({
        socketServer: io ? 'Activo' : 'Inactivo',
        connectedClients: ((_a = io === null || io === void 0 ? void 0 : io.engine) === null || _a === void 0 ? void 0 : _a.clientsCount) || 0,
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        environment: {
            node: process.version,
            platform: process.platform
        }
    });
}));
// Ruta para forzar un mensaje de prueba a todos los clientes
router.post('/broadcast-test', ((_req, res) => {
    console.log('📣 Solicitud de broadcast WebSocket recibida');
    const io = (0, socket_1.getSocketServer)();
    if (!io) {
        console.error('❌ Socket.IO no está disponible');
        return res.status(503).json({
            success: false,
            message: 'Servidor de sockets no disponible'
        });
    }
    // Envía un mensaje de prueba a todos los clientes
    console.log('📢 Enviando broadcast de prueba...');
    io.emit('test_broadcast', {
        message: 'Mensaje de prueba enviado desde la API',
        timestamp: new Date().toISOString()
    });
    res.json({
        success: true,
        message: 'Mensaje de prueba enviado a todos los clientes',
        clientCount: io.engine.clientsCount
    });
}));
console.log('✅ Rutas WebSocket registradas correctamente');
exports.default = router;

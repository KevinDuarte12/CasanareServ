import { Router, Request, Response, RequestHandler } from 'express';
import { getSocketServer } from '../sockets/socket';

console.log('📌 Registrando rutas WebSocket...');

const router = Router();

// Ruta para diagnóstico simple (GET)
router.get('/test', ((_req: Request, res: Response) => {
    console.log('📍 Test WebSocket GET recibido');
    res.json({ message: 'WebSocket diagnostics endpoint is working' });
}) as RequestHandler);

// Ruta para diagnóstico de WebSockets
router.get('/status', ((_req: Request, res: Response) => {
    console.log('📊 Consulta de estado WebSocket recibida');
    const io = getSocketServer();
    
    res.json({
        socketServer: io ? 'Activo' : 'Inactivo',
        connectedClients: io?.engine?.clientsCount || 0,
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        environment: {
            node: process.version,
            platform: process.platform
        }
    });
}) as RequestHandler);

// Ruta para forzar un mensaje de prueba a todos los clientes
router.post('/broadcast-test', ((_req: Request, res: Response) => {
    console.log('📣 Solicitud de broadcast WebSocket recibida');
    const io = getSocketServer();
    
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
}) as RequestHandler);

console.log('✅ Rutas WebSocket registradas correctamente');

export default router;
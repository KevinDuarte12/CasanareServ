import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';

// Mapa para rastrear los usuarios conectados: userId => socketId
const connectedUsers = new Map<number, string>();

// Instancia global
let io: SocketIOServer | null = null;

export const initializeSocketServer = (server: HTTPServer) => {
    if (io) {
        console.log('⚠️ Socket.IO ya está inicializado');
        return io;
    }

    console.log('🔄 Inicializando Socket.IO server...');
    
    io = new SocketIOServer(server, {
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
        socket.on('authenticate', (userId: number) => {
            console.log(`👤 Usuario ${userId} autenticado en socket ${socket.id}`);
            
            // Guardar la asociación userId => socketId
            connectedUsers.set(userId, socket.id);
            
            // Unirse a una sala personalizada para este usuario
            socket.join(`user_${userId}`);
            
            // Confirmar autenticación exitosa
            socket.emit('authenticated', { userId });
        });

        // Manejar unión a salas
        socket.on('join_room', (roomId) => {
            console.log(`👥 Socket ${socket.id} uniéndose a sala ${roomId}`);
            socket.join(roomId);
            
            // Log las salas después de unirse
            logActiveRooms();
            
            // Confirmar al cliente
            socket.emit('joined_room', { room: roomId });
        });

        // Manejar salida de salas
        socket.on('leave_room', (roomId) => {
            console.log(`👋 Socket ${socket.id} saliendo de sala ${roomId}`);
            socket.leave(roomId);
        });

        // Manejar eventos de escritura
        socket.on('typing', (data: any) => {
            console.log(`✏️ Usuario ${data.userId} está escribiendo en sala ${data.roomId}`);
            // Emitir a todos en la sala EXCEPTO al que envía
            socket.to(data.roomId).emit('user_typing', {
                userId: data.userId,
                userName: data.userName
            });
        });

        socket.on('stop_typing', (data: any) => {
            console.log(`✏️ Usuario ${data.userId} dejó de escribir en sala ${data.roomId}`);
            socket.to(data.roomId).emit('user_stopped_typing', {
                userId: data.userId
            });
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

        // Manejar mensajes directamente (adición crítica)
        socket.on('new_message', (message: any) => {
            console.log(`📩 Mensaje recibido por socket para emisión:`, message);
            const roomId = message.chatType === 'product' 
                ? `product_${message.chatId}` 
                : `barter_${message.chatId}`;
            
            // Re-emitir a todos en la sala incluyendo metadata
            if (io) {  // <-- Añadir esta verificación
                io.to(roomId).emit('new_message', message);
                console.log(`📣 Mensaje re-emitido a sala ${roomId}`);
            } else {
                console.error('❌ No se pudo emitir mensaje: io es null');
            }
        });
    });
    
    console.log('✅ Socket.IO inicializado correctamente');
    return io;
};

export const getSocketServer = (): SocketIOServer | null => {
    if (!io) {
        console.warn('⚠️ Intento de acceder a Socket.IO antes de inicializarlo');
    }
    return io;
};

export const setSocketServer = (socketServer: SocketIOServer): void => {
    io = socketServer;
    console.log('💾 Instancia Socket.IO guardada globalmente');
};

// Función para enviar notificación a un usuario específico
export const sendNotificationToUser = (
  io: SocketIOServer | null, 
  userId: number, 
  notification: any
) => {
  if (!io) return;

  try {
    // Intentar enviar a un usuario específico usando su sala
    io.to(`user_${userId}`).emit('new_notification', notification);
    console.log(`Notificación enviada a usuario ${userId}`);
  } catch (error) {
    console.error('Error al enviar notificación por socket:', error);
  }
};

// Función para transmitir una actualización de trueque a los usuarios involucrados
export const emitBarterUpdate = (
  io: SocketIOServer | null,
  barterId: number,
  status: string,
  offeringUserId: number,
  receivingUserId: number | null
) => {
  if (!io) return;

  try {
    const updateData = { barterId, status, updatedAt: new Date() };
    
    // Notificar al usuario que ofrece
    io.to(`user_${offeringUserId}`).emit('barter_updated', updateData);
    
    // Notificar al usuario que recibe (si existe)
    if (receivingUserId) {
      io.to(`user_${receivingUserId}`).emit('barter_updated', updateData);
    }
    
    console.log(`Actualización de trueque ${barterId} enviada a usuarios ${offeringUserId} y ${receivingUserId || 'N/A'}`);
  } catch (error) {
    console.error('Error al emitir actualización de trueque:', error);
  }
};

// Añadir esta función para mostrar las salas activas periódicamente
const logActiveRooms = () => {
  if (!io) return;
  
  const rooms = io.sockets.adapter.rooms;
  console.log('🔑 SALAS ACTIVAS:');
  for (const [roomId, sockets] of rooms.entries()) {
    // Si no es un ID de socket (es decir, es una sala)
    if (!sockets.has(roomId)) {
      console.log(`📣 Sala ${roomId}: ${Array.from(sockets).length} clientes`);
    }
  }
};
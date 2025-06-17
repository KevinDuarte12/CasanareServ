import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';

// Mapa para rastrear los usuarios conectados: userId => socketId
const connectedUsers = new Map<number, string>();

// Instancia global
let io: SocketIOServer | null = null;
/**
 * 🚀 INICIALIZAR SERVIDOR SOCKET.IO
 * Configura y inicializa el servidor de WebSockets para comunicación en tiempo real
 * Gestiona conexiones, autenticación, salas de chat y eventos de mensajería
 */
export const initializeSocketServer = (server: HTTPServer) => {
    // 🛡️ PREVENIR MÚLTIPLES INICIALIZACIONES
    // Verificar si Socket.IO ya está inicializado para evitar duplicados
    if (io) {
        console.log('⚠️ Socket.IO ya está inicializado');
        return io;
    }

    console.log('🔄 Inicializando Socket.IO server...');
    
    // ⚙️ CONFIGURACIÓN DEL SERVIDOR SOCKET.IO
    // Establecer CORS, path y configuraciones básicas
    io = new SocketIOServer(server, {
        cors: {
            origin: "http://localhost:4200",    // Frontend Angular permitido
            methods: ["GET", "POST"],           // Métodos HTTP permitidos
            credentials: true                   // Permitir cookies/credenciales
        },
        path: '/socket.io/'                     // Endpoint del servidor WebSocket
    });
    
    // 🔌 MANEJO DE CONEXIONES DE CLIENTES
    io.on('connection', (socket) => {
        console.log(`🔌 Cliente conectado: ${socket.id}`);
        
        // 📡 EVENTOS DE CONFIRMACIÓN DE CONEXIÓN
        
        // Confirmar conexión exitosa al cliente recién conectado
        socket.emit('connection_confirmed', {
            message: 'Conectado al servidor de CasanareServ',
            socketId: socket.id
        });
        
        // Emitir evento de prueba inmediato para verificar conectividad
        socket.emit('socket_connected', { message: 'Conexión establecida' });

        // 🔐 AUTENTICACIÓN DE USUARIO
        
        // Asociar socket con usuario autenticado del sistema
        socket.on('authenticate', (userId: number) => {
            console.log(`👤 Usuario ${userId} autenticado en socket ${socket.id}`);
            
            // Mapear userId con socketId para notificaciones directas
            connectedUsers.set(userId, socket.id);
            
            // Crear sala personal para el usuario (notificaciones privadas)
            socket.join(`user_${userId}`);
            
            // Confirmar autenticación exitosa al cliente
            socket.emit('authenticated', { userId });
        });

        // 🏠 GESTIÓN DE SALAS DE CHAT
        
        // Unirse a sala específica (chat de producto o trueque)
        socket.on('join_room', (roomId) => {
            console.log(`👥 Socket ${socket.id} uniéndose a sala ${roomId}`);
            socket.join(roomId);
            
            // Loggear salas activas para debugging y monitoreo
            logActiveRooms();
            
            // Confirmar unión exitosa a la sala
            socket.emit('joined_room', { room: roomId });
        });

        // Salir de sala específica cuando se abandona el chat
        socket.on('leave_room', (roomId) => {
            console.log(`👋 Socket ${socket.id} saliendo de sala ${roomId}`);
            socket.leave(roomId);
        });

        // ✏️ INDICADORES DE ESCRITURA EN TIEMPO REAL
        
        // Notificar cuando usuario está escribiendo un mensaje
        socket.on('typing', (data: any) => {
            console.log(`✏️ Usuario ${data.userId} está escribiendo en sala ${data.roomId}`);
            // Emitir a todos en la sala EXCEPTO al que está escribiendo
            socket.to(data.roomId).emit('user_typing', {
                userId: data.userId,
                userName: data.userName
            });
        });

        // Notificar cuando usuario deja de escribir
        socket.on('stop_typing', (data: any) => {
            console.log(`✏️ Usuario ${data.userId} dejó de escribir en sala ${data.roomId}`);
            socket.to(data.roomId).emit('user_stopped_typing', {
                userId: data.userId
            });
        });

        // 🔌 MANEJO DE DESCONEXIÓN
        
        // Limpiar recursos cuando cliente se desconecta
        socket.on('disconnect', (reason) => {
            console.log(`🔌 Cliente desconectado: ${socket.id}, Razón: ${reason}`);
            
            // Remover usuario del mapa de usuarios conectados
            for (const [userId, socketId] of connectedUsers.entries()) {
                if (socketId === socket.id) {
                    console.log(`👤 Usuario ${userId} desconectado`);
                    connectedUsers.delete(userId);
                    break;
                }
            }
        });

        // 💬 SISTEMA DE MENSAJERÍA EN TIEMPO REAL
        
        // Retransmitir mensajes a todos los usuarios en la sala correspondiente
        socket.on('new_message', (message: any) => {
            console.log(`📩 Mensaje recibido por socket para emisión:`, message);
            
            // Determinar sala destino según tipo de chat
            const roomId = message.chatType === 'product' 
                ? `product_${message.chatId}`    // Chat de consulta de producto
                : `barter_${message.chatId}`;    // Chat de negociación de trueque
            
            // Re-emitir mensaje a todos los clientes en la sala
            if (io) {  
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
/**
 * 🔍 OBTENER INSTANCIA DEL SERVIDOR SOCKET.IO
 * Función getter para acceder a la instancia global del servidor Socket.IO
 * Permite a otros módulos del sistema utilizar las funcionalidades de WebSocket
*/
export const getSocketServer = (): SocketIOServer | null => {
    // 🚨 VALIDACIÓN DE INICIALIZACIÓN
    // Verificar si Socket.IO fue inicializado antes de intentar acceder
    if (!io) {
        console.warn('⚠️ Intento de acceder a Socket.IO antes de inicializarlo');
    }
    
    // 📤 RETORNAR INSTANCIA
    // Devolver la instancia global del servidor (puede ser null)
    return io;
};
/**
 * 💾 ESTABLECER INSTANCIA DEL SERVIDOR SOCKET.IO
 * Función setter para asignar la instancia del servidor Socket.IO globalmente
 * Permite configurar la instancia desde otros módulos o para casos especiales
 */
export const setSocketServer = (socketServer: SocketIOServer): void => {
    // 📝 ASIGNAR INSTANCIA GLOBAL
    // Establecer la referencia global del servidor Socket.IO
    io = socketServer;
    
    // 📊 LOGGING DE CONFIRMACIÓN
    // Registrar que la instancia fue guardada exitosamente
    console.log('💾 Instancia Socket.IO guardada globalmente');
};
/**
 * 🔔 ENVIAR NOTIFICACIÓN A USUARIO ESPECÍFICO
 * Función utilitaria para enviar notificaciones push en tiempo real
 * Utiliza la sala personal del usuario para entrega directa y segura
 */
export const sendNotificationToUser = (
  io: SocketIOServer | null, 
  userId: number, 
  notification: any
) => {
  // 🚨 VALIDACIÓN DE INSTANCIA SOCKET.IO
  // Verificar que el servidor Socket.IO esté disponible antes de proceder
  if (!io) return;

  try {
    // 📡 ENVÍO DE NOTIFICACIÓN A SALA PERSONAL
    // Emitir notificación a la sala personal del usuario (`user_{userId}`)
    io.to(`user_${userId}`).emit('new_notification', notification);
    
    // 📊 LOGGING DE CONFIRMACIÓN
    // Registrar envío exitoso para monitoreo y debugging
    console.log(`🔔 Notificación enviada a usuario ${userId}`);
  } catch (error) {
    // 🚨 MANEJO DE ERRORES
    // Capturar y loggear cualquier error durante el envío
    console.error('❌ Error al enviar notificación por socket:', error);
  }
};
/**
 * 🔄 EMITIR ACTUALIZACIÓN DE TRUEQUE
 * Función especializada para notificar cambios de estado en trueques
 * Envía notificaciones en tiempo real a ambos usuarios involucrados
 */
export const emitBarterUpdate = (
  io: SocketIOServer | null,
  barterId: number,
  status: string,
  offeringUserId: number,
  receivingUserId: number | null
) => {
  // 🚨 VALIDACIÓN DE INSTANCIA SOCKET.IO
  // Verificar que el servidor Socket.IO esté disponible antes de proceder
  if (!io) return;

  try {
    // 📦 PREPARAR DATOS DE ACTUALIZACIÓN
    // Crear objeto con información del cambio de estado del trueque
    const updateData = { 
      barterId, 
      status, 
      updatedAt: new Date() 
    };
    
    // 📡 NOTIFICAR AL USUARIO QUE OFRECE
    // Enviar actualización a la sala personal del usuario oferente
    io.to(`user_${offeringUserId}`).emit('barter_updated', updateData);
    
    // 📡 NOTIFICAR AL USUARIO QUE RECIBE (SI EXISTE)
    // Verificar si hay usuario receptor antes de enviar notificación
    if (receivingUserId) {
      io.to(`user_${receivingUserId}`).emit('barter_updated', updateData);
    }
    
    // 📊 LOGGING DE CONFIRMACIÓN
    // Registrar envío exitoso con detalles de usuarios notificados
    console.log(`🔄 Actualización de trueque ${barterId} enviada a usuarios ${offeringUserId} y ${receivingUserId || 'N/A'}`);
  } catch (error) {
    // 🚨 MANEJO DE ERRORES
    // Capturar y loggear cualquier error durante la emisión
    console.error('❌ Error al emitir actualización de trueque:', error);
  }
};
/**
 * 📊 LOGGING DE SALAS ACTIVAS
 * Función de debugging para monitorear y registrar las salas Socket.IO activas
 * Útil para diagnóstico, monitoreo de conexiones y resolución de problemas
 */
const logActiveRooms = () => {
  // 🚨 VALIDACIÓN DE INSTANCIA SOCKET.IO
  // Verificar que el servidor Socket.IO esté disponible antes de proceder
  if (!io) return;
  
  // 🔍 OBTENER ADAPTADOR DE SALAS
  // Acceder al mapa de salas activas del servidor Socket.IO
  const rooms = io.sockets.adapter.rooms;
  
  // 📋 ENCABEZADO DE LOGGING
  // Mostrar título del reporte de salas activas
  console.log('🔑 SALAS ACTIVAS:');
  
  // 🔄 ITERAR POR TODAS LAS SALAS
  // Recorrer el mapa de salas y mostrar información de cada una
  for (const [roomId, sockets] of rooms.entries()) {
    // 🏠 FILTRAR SALAS REALES VS SOCKETS INDIVIDUALES
    // En Socket.IO, cada socket también aparece como "sala" con su propio ID
    // Filtrar para mostrar solo salas reales (no IDs de socket individuales)
    if (!sockets.has(roomId)) {
      // 📊 MOSTRAR INFORMACIÓN DE LA SALA
      // Loggear ID de sala y cantidad de clientes conectados
      console.log(`📣 Sala ${roomId}: ${Array.from(sockets).length} clientes`);
    }
  }
};
import { RequestHandler, Router } from 'express';
import * as chatMessageController from '../controllers/chatMessage.controller';
import validateToken from '../middlewares/validate-token';
/**
 * 💬 RUTAS DE MENSAJES DE CHAT
 * Gestiona todas las operaciones de mensajería entre usuarios
 * Incluye chat contextual para productos y trueques
 */
const router = Router();
// 📝 RUTAS DE ENVÍO Y CONSULTA DE MENSAJES
// Enviar nuevo mensaje de chat
router.post('/message', chatMessageController.sendMessage as unknown as RequestHandler);
// Obtener mensajes de chat de un trueque específico
router.get('/barter/:id_barter', chatMessageController.getMessagesByBarter as unknown as RequestHandler);
// Obtener mensajes de chat de un producto específico
router.get('/product/:id_product', chatMessageController.getMessagesByProduct as unknown as RequestHandler);
// 👤 RUTAS DE GESTIÓN DE CHATS POR USUARIO
// Obtener todos los chats activos del usuario
router.get('/user/:userId/chats', 
    validateToken as RequestHandler, // Autenticación requerida
    chatMessageController.getUserChats as unknown as RequestHandler
);
// Obtener contador de mensajes no leídos del usuario
router.get('/user/:userId/unread-count', 
    validateToken as RequestHandler, // Autenticación requerida
    chatMessageController.getUserUnreadMessagesCount as unknown as RequestHandler
);
// 📖 RUTAS DE MARCADO DE LECTURA
// Marcar mensajes como leídos en chat específico
router.put('/:type/:entityId/read', 
    validateToken as RequestHandler, // Usuario autenticado
    chatMessageController.markMessagesAsRead as unknown as RequestHandler
);
// 🔚 RUTAS DE GESTIÓN DE CHATS
// Finalizar chat (cerrar conversación)
router.post('/:type/:entityId/finalize', 
    validateToken as RequestHandler, // Usuario autenticado
    chatMessageController.finalizeChat as unknown as RequestHandler
);
// Eliminar chat específico para un usuario
router.delete('/:type/:entityId/user/:userId', 
    validateToken as RequestHandler, // Usuario autenticado
    chatMessageController.deleteChat as unknown as RequestHandler
);
export default router;
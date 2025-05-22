import { RequestHandler, Router } from 'express';
import * as chatMessageController from '../controllers/chatMessage.controller';
import validateToken from '../middlewares/validate-token';

const router = Router();

router.post('/message', chatMessageController.sendMessage as unknown as RequestHandler);
router.get('/barter/:id_barter', chatMessageController.getMessagesByBarter as unknown as RequestHandler);
router.get('/product/:id_product', chatMessageController.getMessagesByProduct as unknown as RequestHandler);

router.get('/user/:userId/chats', validateToken as RequestHandler, chatMessageController.getUserChats as unknown as RequestHandler);
router.get('/user/:userId/unread-count', validateToken as RequestHandler, chatMessageController.getUserUnreadMessagesCount as unknown as RequestHandler);
router.put('/:type/:entityId/read', validateToken as RequestHandler, chatMessageController.markMessagesAsRead as unknown as RequestHandler);

// Nuevas rutas
router.post('/:type/:entityId/finalize', validateToken as RequestHandler, chatMessageController.finalizeChat as unknown as RequestHandler);
router.delete('/:type/:entityId/user/:userId', validateToken as RequestHandler, chatMessageController.deleteChat as unknown as RequestHandler);

export default router;
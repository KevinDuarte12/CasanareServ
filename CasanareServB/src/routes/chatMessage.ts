import { RequestHandler, Router } from 'express';
import { sendMessage, getMessagesByBarter, getMessagesByProduct } from '../controllers/chatMessage.controller';
import * as chatMessageController from '../controllers/chatMessage.controller';
import validateToken from '../middlewares/validate-token';

const router = Router();

router.post('/message', sendMessage as RequestHandler);
router.get('/barter/:id_barter', getMessagesByBarter);
router.get('/product/:id_product', getMessagesByProduct);

router.get('/user/:userId/chats', validateToken as RequestHandler, chatMessageController.getUserChats as RequestHandler);
router.get('/user/:userId/unread-count', validateToken as RequestHandler, chatMessageController.getUserUnreadMessagesCount as RequestHandler);
router.put('/:type/:entityId/read', validateToken as RequestHandler, chatMessageController.markMessagesAsRead as RequestHandler);
export default router;
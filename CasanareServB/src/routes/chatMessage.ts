import { RequestHandler, Router } from 'express';
import { sendMessage, getMessagesByBarter, getMessagesByProduct } from '../controllers/chatMessage.controller';

const router = Router();

router.post('/message', sendMessage as RequestHandler);
router.get('/barter/:id_barter', getMessagesByBarter);
router.get('/product/:id_product', getMessagesByProduct);

export default router;
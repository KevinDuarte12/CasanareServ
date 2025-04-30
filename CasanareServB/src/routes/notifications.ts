import { Router, RequestHandler } from 'express';
import { check } from 'express-validator';
import validateToken from '../middlewares/validate-token';
import { validateFields } from '../middlewares/validate-request'; 
import { 
  createNotification, 
  getUserNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead, 
  deleteNotification,
  getUnreadCount
} from '../controllers/notifications.controller';

const router = Router();

// Crear una nueva notificación
router.post('/', [
  validateToken as RequestHandler,
  check('id_user', 'El ID del usuario es obligatorio').isInt(),
  check('type', 'El tipo de notificación es obligatorio').notEmpty(),
  check('title', 'El título es obligatorio').notEmpty(),
  check('message', 'El mensaje es obligatorio').notEmpty(),
  check('entity_type', 'El tipo de entidad es obligatorio').notEmpty(),
  check('entity_id', 'El ID de la entidad es obligatorio').isInt(),
  validateFields as RequestHandler
], createNotification as RequestHandler);

// Obtener notificaciones de un usuario
router.get('/user/:userId', [
  validateToken as RequestHandler
], getUserNotifications as RequestHandler);

// Marcar notificación como leída
// Cambiar :id a :notificationId para que coincida con el frontend
router.patch('/:notificationId/read', [
  validateToken as RequestHandler
], markNotificationAsRead as RequestHandler);

// Marcar todas las notificaciones de un usuario como leídas
router.patch('/user/:userId/read-all', [
  validateToken as RequestHandler
], markAllNotificationsAsRead as RequestHandler);

// Obtener conteo de notificaciones no leídas
router.get('/user/:userId/unread-count', [
  validateToken as RequestHandler
], getUnreadCount as RequestHandler);

// Eliminar una notificación
// Cambiar :id a :notificationId para que coincida con el frontend
router.delete('/:notificationId', [
  validateToken as RequestHandler
], deleteNotification as RequestHandler);

export default router;
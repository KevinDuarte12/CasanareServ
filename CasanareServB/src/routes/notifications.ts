import { Router, RequestHandler } from 'express';
import validateToken from '../middlewares/validate-token';
import { check } from 'express-validator';
import { validateFields } from '../middlewares/validate-request';
import { 
  getUserNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  createNotification,
  deleteNotification
} from '../controllers/notifications.controller';

const router = Router();

// Ruta de diagnóstico sin autenticación
router.get('/debug', ((_req, res) => { 
  console.log('🔍 Accediendo a ruta de diagnóstico de notificaciones');
  res.status(200).json({
    message: 'API de Notificaciones funcionando correctamente',
    timestamp: new Date().toISOString(),
    routes: [
      '/user/:userId/unread-count', 
      '/user/:userId',
      '/:notificationId/read'
    ]
  });
}) as RequestHandler);

// IMPORTANTE: Rutas específicas con /user/ deben ir ANTES de /:notificationId
router.get('/user/:userId/unread-count', 
  validateToken as unknown as RequestHandler, 
  getUnreadCount as unknown as RequestHandler
);

router.get('/user/:userId', 
  validateToken as unknown as RequestHandler, 
  getUserNotifications as unknown as RequestHandler
);

router.patch('/user/:userId/read-all', 
  validateToken as unknown as RequestHandler, 
  markAllNotificationsAsRead as unknown as RequestHandler
);

// IMPORTANTE: Esta ruta debe coincidir exactamente con la URL que usas en el frontend
// Cambiado de '/:notificationId/read' a '/:id/read' para que coincida con el controlador
router.patch('/:id/read', 
  validateToken as unknown as RequestHandler, 
  markNotificationAsRead as unknown as RequestHandler
);

router.post('/', [
  validateToken as unknown as RequestHandler,
  check('id_user', 'El ID de usuario es requerido').isNumeric(),
  check('type', 'El tipo de notificación es requerido').notEmpty(),
  check('title', 'El título es requerido').notEmpty(),
  check('message', 'El mensaje es requerido').notEmpty(),
  validateFields as unknown as RequestHandler
], createNotification as unknown as RequestHandler);

router.delete('/:id', 
  validateToken as unknown as RequestHandler, 
  deleteNotification as unknown as RequestHandler
);

console.log('✅ Rutas de notificaciones registradas');
export default router;
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
  deleteNotification,
  deleteAllNotifications
} from '../controllers/notifications.controller';
/**
 * 🔔 RUTAS DE NOTIFICACIONES
 * Sistema completo de notificaciones push para usuarios
 * Incluye creación, consulta, marcado de lectura y eliminación
 */
const router = Router();
// 🔍 RUTA DE DIAGNÓSTICO (sin autenticación)
// Verificar funcionamiento de la API de notificaciones
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

// 📊 RUTAS DE CONSULTA POR USUARIO
// Obtener contador de notificaciones no leídas del usuario
router.get('/user/:userId/unread-count', 
  validateToken as unknown as RequestHandler, // Autenticación requerida
  getUnreadCount as unknown as RequestHandler // Retorna cantidad de no leídas
);
// Obtener todas las notificaciones del usuario
router.get('/user/:userId', 
  validateToken as unknown as RequestHandler, // Usuario autenticado
  getUserNotifications as unknown as RequestHandler // Lista completa de notificaciones
);

// 📖 RUTAS DE MARCADO DE LECTURA
// Marcar todas las notificaciones del usuario como leídas
router.patch('/user/:userId/read-all', 
  validateToken as unknown as RequestHandler, // Usuario autenticado
  markAllNotificationsAsRead as unknown as RequestHandler // Actualiza todas a leída
);
// Marcar notificación específica como leída
router.patch('/:id/read', 
  validateToken as unknown as RequestHandler, // Usuario autenticado
  markNotificationAsRead as unknown as RequestHandler // Marca una como leída
);

// 📝 RUTAS DE CREACIÓN
// Crear nueva notificación
router.post('/', [
  validateToken as unknown as RequestHandler, // Usuario autenticado
  check('id_user', 'El ID de usuario es requerido').isNumeric(), // Validar destinatario
  check('type', 'El tipo de notificación es requerido').notEmpty(), // Tipo obligatorio
  check('title', 'El título es requerido').notEmpty(), // Título obligatorio
  check('message', 'El mensaje es requerido').notEmpty(), // Mensaje obligatorio
  validateFields as unknown as RequestHandler // Verificar errores de validación
], createNotification as unknown as RequestHandler);

// 🗑️ RUTAS DE ELIMINACIÓN
// Eliminar notificación específica
router.delete('/:id', 
  validateToken as unknown as RequestHandler, // Usuario autenticado
  deleteNotification as unknown as RequestHandler // Eliminar por ID
);
// Eliminar todas las notificaciones del usuario
router.delete('/user/:userId/all', 
  validateToken as unknown as RequestHandler, // Usuario autenticado
  deleteAllNotifications as unknown as RequestHandler // Limpiar todas
);
console.log('✅ Rutas de notificaciones registradas');
export default router;
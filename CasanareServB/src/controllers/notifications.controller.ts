import { Request, Response } from 'express';
import Notification from '../db/models/notifications'; 
import User from '../db/models/user';

// Crear una nueva notificación
export const createNotification = async (req: Request, res: Response) => {
  try {
    const { id_user, type, title, message, entity_type, entity_id, action_url } = req.body;

    // Verificar que el usuario existe
    const userExists = await User.findByPk(id_user);
    if (!userExists) {
      return res.status(404).json({
        msg: `No existe un usuario con el ID ${id_user}`
      });
    }

    // Crear la notificación
    const notification = await Notification.create({
      id_user,
      type,
      title,
      message,
      entity_type,
      entity_id,
      action_url: action_url || null,
      is_read: false
    });

    res.status(201).json({
      msg: 'Notificación creada correctamente',
      notification
    });
  } catch (error) {
    console.error('Error al crear notificación:', error);
    res.status(500).json({
      msg: 'Error al crear la notificación'
    });
  }
};

// Obtener notificaciones de un usuario específico
export const getUserNotifications = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { limit = 20, page = 1, unread_only = false } = req.query;

    const pageSize = parseInt(limit as string);
    const offset = (parseInt(page as string) - 1) * pageSize;

    // Configurar filtros según los parámetros
    const whereClause: any = { id_user: userId };
    if (unread_only === 'true') {
      whereClause.is_read = false;
    }

    // Obtener las notificaciones
    const { count, rows } = await Notification.findAndCountAll({
      where: whereClause,
      limit: pageSize,
      offset,
      order: [['created_at', 'DESC']]
    });

    res.json({
      total: count,
      page: parseInt(page as string),
      page_size: pageSize,
      total_pages: Math.ceil(count / pageSize),
      notifications: rows
    });
  } catch (error) {
    console.error(`Error al obtener notificaciones del usuario:`, error);
    res.status(500).json({
      msg: 'Error al obtener las notificaciones'
    });
  }
};

// Marcar una notificación como leída
export const markNotificationAsRead = async (req: Request, res: Response) => {
  try {
    // Cambiar id a notificationId para que coincida con la ruta
    const { notificationId } = req.params;

    // Verificar que la notificación existe
    const notification = await Notification.findByPk(notificationId);
    if (!notification) {
      return res.status(404).json({
        msg: `No existe una notificación con el ID ${notificationId}`
      });
    }

    // Actualizar a leída
    await notification.update({ is_read: true });

    res.json({
      msg: 'Notificación marcada como leída correctamente',
      notification
    });
  } catch (error) {
    console.error('Error al marcar notificación como leída:', error);
    res.status(500).json({
      msg: 'Error al actualizar la notificación'
    });
  }
};

// Marcar todas las notificaciones de un usuario como leídas
export const markAllNotificationsAsRead = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // Actualizar todas las notificaciones no leídas del usuario
    await Notification.update(
      { is_read: true },
      { 
        where: { 
          id_user: userId,
          is_read: false
        } 
      }
    );

    res.json({
      msg: 'Todas las notificaciones marcadas como leídas correctamente'
    });
  } catch (error) {
    console.error('Error al marcar todas las notificaciones como leídas:', error);
    res.status(500).json({
      msg: 'Error al actualizar las notificaciones'
    });
  }
};

// Eliminar una notificación
export const deleteNotification = async (req: Request, res: Response) => {
  try {
    // Cambiar id a notificationId para que coincida con la ruta
    const { notificationId } = req.params;

    // Verificar que la notificación existe
    const notification = await Notification.findByPk(notificationId);
    if (!notification) {
      return res.status(404).json({
        msg: `No existe una notificación con el ID ${notificationId}`
      });
    }

    // Eliminar la notificación
    await notification.destroy();

    res.json({
      msg: 'Notificación eliminada correctamente'
    });
  } catch (error) {
    console.error('Error al eliminar notificación:', error);
    res.status(500).json({
      msg: 'Error al eliminar la notificación'
    });
  }
};

// Obtener el conteo de notificaciones no leídas para un usuario
export const getUnreadCount = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // Contar las notificaciones no leídas
    const count = await Notification.count({
      where: {
        id_user: userId,
        is_read: false
      }
    });

    res.json({ unread_count: count });
  } catch (error) {
    console.error('Error al obtener conteo de notificaciones no leídas:', error);
    res.status(500).json({
      msg: 'Error al obtener el conteo de notificaciones'
    });
  }
};
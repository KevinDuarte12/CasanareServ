/**
 * Controlador para gestión de notificaciones de usuarios
 * Maneja creación, consulta, marcado como leído y eliminación de notificaciones con WebSockets
 */

import { Request, Response } from 'express';
import Notification from '../db/models/notifications'; 
import User from '../db/models/user';
import { getSocketServer, sendNotificationToUser } from '../sockets/socket';

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
      id_user: id_user, // Cambia a user_id si ese es el nombre en la DB
      type,
      title,
      message,
      entity_type,
      entity_id,
      action_url: action_url || null,
      is_read: false
    });

    // Enviar notificación en tiempo real
    const io = getSocketServer();
    if (io) {
      sendNotificationToUser(io, id_user, notification);
    }

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
    const whereClause: any = { id_user: userId }; // Cambia a user_id
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
    // IMPORTANTE: Usar 'id' en lugar de 'notificationId' para que coincida con la ruta
    const { id } = req.params;
    console.log(`📌 Marcando notificación como leída: ID ${id}`);

    // Verificar que la notificación existe
    const notification = await Notification.findByPk(id);
    if (!notification) {
      console.log(`❌ Notificación con ID ${id} no encontrada`);
      return res.status(404).json({
        ok: false,
        msg: `No existe una notificación con el ID ${id}`
      });
    }

    // Actualizar a leída
    await notification.update({ is_read: true });
    console.log(`✅ Notificación ${id} marcada como leída`);

    res.status(200).json({
      ok: true,
      msg: 'Notificación marcada como leída correctamente',
      notification
    });
  } catch (error: any) {
    console.error('❌ Error al marcar notificación como leída:', error.message);
    res.status(500).json({
      ok: false,
      msg: 'Error al actualizar la notificación'
    });
  }
};

// Marcar todas las notificaciones de un usuario como leídas
export const markAllNotificationsAsRead = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    console.log(`📝 Marcando todas las notificaciones como leídas para usuario ${userId}`);
    
    // Verificar que el usuario existe
    const user = await User.findByPk(userId);
    if (!user) {
      console.log(`❌ Usuario con ID ${userId} no encontrado`);
      return res.status(404).json({
        success: false,
        msg: 'Usuario no encontrado'
      });
    }
    
    // IMPORTANTE: Usar 'id_user' que es el nombre correcto del campo
    const result = await Notification.update(
      { is_read: true },
      { 
        where: { 
          id_user: userId, // Usar id_user en lugar de user_id
          is_read: false
        } 
      }
    );
    
    console.log(`✅ Resultado de la actualización:`, result);
    console.log(`✅ ${result[0]} notificaciones marcadas como leídas`);
    
    return res.status(200).json({
      success: true,
      msg: 'Todas las notificaciones marcadas como leídas correctamente',
      updated: result[0]
    });
  } catch (error: any) {
    console.error('❌ Error al marcar notificaciones como leídas:', error);
    if (error && error.stack) {
      console.error(`Stack: ${error.stack}`);
    }
    
    return res.status(500).json({
      success: false,
      msg: 'Error al actualizar las notificaciones',
      error: error && error.message ? error.message : 'Error desconocido'
    });
  }
};

// Eliminar una notificación
export const deleteNotification = async (req: Request, res: Response) => {
  try {
    // Utilizar 'id' en lugar de 'notificationId' para que coincida con la ruta
    const { id } = req.params;

    console.log(`⚡ Intentando eliminar notificación con ID: ${id}`);

    // Verificar que la notificación existe
    const notification = await Notification.findByPk(id);
    if (!notification) {
      console.log(`❌ Notificación con ID ${id} no encontrada`);
      return res.status(404).json({
        msg: `No existe una notificación con el ID ${id}`
      });
    }

    // Eliminar la notificación
    await notification.destroy();
    console.log(`✅ Notificación ${id} eliminada correctamente`);

    res.json({
      msg: 'Notificación eliminada correctamente'
    });
  } catch (error) {
    console.error('❌ Error al eliminar notificación:', error);
    res.status(500).json({
      msg: 'Error al eliminar la notificación'
    });
  }
};

// Obtener el conteo de notificaciones no leídas para un usuario
export const getUnreadCount = async (req: Request, res: Response) => {
  console.log('🔢 Ejecutando getUnreadCount');
  console.log(`📌 Parámetros:`, req.params);
  console.log(`📌 Query:`, req.query);
  
  try {
    const { userId } = req.params;
    console.log(`🆔 ID de usuario: ${userId}`);
    
    // Verificar estructura de la base de datos
    try {
      // Esta consulta comprobará si la tabla existe y tiene la estructura esperada
      const testQuery = await Notification.findOne();
      console.log(`✅ Tabla de notificaciones encontrada: ${!!testQuery || 'Vacía pero accesible'}`);
    } catch (dbError) {
      console.error('❌ Problema accediendo a la tabla de notificaciones:', dbError);
      // Seguir con la función para ver si podemos recuperarnos
    }
    
    // Verificar que el usuario existe
    const user = await User.findByPk(userId);
    console.log(`👤 Usuario encontrado: ${!!user}`);
    
    if (!user) {
      console.log(`❌ Usuario con ID ${userId} no encontrado`);
      return res.status(404).json({
        success: false,
        msg: 'Usuario no encontrado'
      });
    }
    
    // Contar notificaciones no leídas para el usuario
    console.log(`🔍 Contando notificaciones no leídas para usuario ${userId}`);
    const unreadCount = await Notification.count({
      where: {
        id_user: userId, // Cambia a user_id
        is_read: false
      }
    });
    
    console.log(`✅ Conteo completado: ${unreadCount} notificaciones no leídas`);
    return res.status(200).json({
      success: true,
      unread_count: unreadCount
    });
    
  } catch (error: any) {
    console.error('❌ Error en getUnreadCount:', error);
    if (error && error.stack) {
      console.error(`Stack: ${error.stack}`);
    }
    return res.status(500).json({
      success: false,
      msg: 'Error al obtener conteo de notificaciones no leídas',
      error: error && error.message ? error.message : 'Error desconocido'
    });
  }
};

// Añadir este método al controlador
export const deleteAllNotifications = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    console.log(`🗑️ Eliminando todas las notificaciones del usuario: ${userId}`);
    
    // Verificar que el usuario existe
    const user = await User.findByPk(userId);
    if (!user) {
      console.log(`❌ Usuario con ID ${userId} no encontrado`);
      return res.status(404).json({
        success: false,
        msg: 'Usuario no encontrado'
      });
    }
    
    // Eliminar todas las notificaciones del usuario
    await Notification.destroy({
      where: {
        id_user: userId
      }
    });
    
    console.log(`✅ Todas las notificaciones del usuario ${userId} eliminadas correctamente`);
    
    return res.status(200).json({
      success: true,
      msg: 'Todas las notificaciones han sido eliminadas'
    });
  } catch (error: any) {
    console.error('❌ Error al eliminar todas las notificaciones:', error);
    if (error && error.stack) {
      console.error(`Stack: ${error.stack}`);
    }
    
    return res.status(500).json({
      success: false,
      msg: 'Error al eliminar las notificaciones',
      error: error && error.message ? error.message : 'Error desconocido'
    });
  }
};
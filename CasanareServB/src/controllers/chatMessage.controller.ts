import { Request, Response } from 'express';
import ChatMessage from '../db/models/chatMessage';
import User from '../db/models/user';
import Image from '../db/models/image';
import Product from '../db/models/product';
import { Op } from 'sequelize';
import sequelize from '../db/conection';
import { QueryTypes } from 'sequelize';
import { getSocketServer } from '../sockets/socket';
import Barter from '../db/models/barter';

// Utilidad para bloquear teléfonos y emails
function containsBlockedInfo(text: string): boolean {
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
  const phoneRegex = /(\+?\d{1,3})?[\s.-]?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}/;
  return emailRegex.test(text) || phoneRegex.test(text);
}

// Enviar mensaje (para trueque o producto)
export const sendMessage = async (req: Request, res: Response) => {
  console.log('📩 CHAT MESSAGE REQUEST:');
  console.log('- Body:', req.body);
  console.log('- Files:', req.files);
  console.log('- File:', req.file);
  
  // Extraer los datos con parseo de números si es necesario
  const id_barter = req.body.id_barter ? Number(req.body.id_barter) : null;
  const id_product = req.body.id_product ? Number(req.body.id_product) : null;
  const id_user = req.body.id_user ? Number(req.body.id_user) : null;
  const message = req.body.message || '';
  
  // CORRECCIÓN: Definir image_url desde req.body o del archivo subido
  let image_url = req.body.image_url || null;
  
  // Si hay un archivo adjunto, construir la URL de la imagen
  if (req.file) {
    image_url = `/uploads/${req.file.filename}`;
  }
  
  console.log('🔑 Datos extraídos:', { id_user, id_product, id_barter, message, image_url });
  
  // Verificar id_user
  if (!id_user) {
    console.error('❌ Falta ID de usuario');
    return res.status(400).json({ msg: 'Se requiere id_user' });
  }

  // Verificar producto/trueque
  if (!id_barter && !id_product) {
    console.error('❌ Falta ID de producto o trueque');
    return res.status(400).json({ msg: 'Se requiere id_product o id_barter' });
  }

  // Verificar que hay mensaje o imagen
  if (!message && !image_url && !req.file) {
    return res.status(400).json({ msg: 'Mensaje o imagen requerido' });
  }

  if (message && containsBlockedInfo(message)) {
    return res.status(400).json({ msg: 'No se permite enviar teléfonos ni emails' });
  }

  try {
    // Crear el mensaje en la base de datos
    const chatMessage = await ChatMessage.create({
      id_barter: id_barter || null,
      id_product: id_product || null,
      id_user,
      message,
      image_url,
      sent_at: new Date(),
    });

    // Obtener información adicional del usuario para incluir en el mensaje
    const userInfo = await User.findByPk(id_user, {
      attributes: ['id', 'name'],
      include: [{
        model: Image,
        as: 'userImages',
        required: false,
        attributes: ['url']
      }]
    });

    // MEJORA: Crear un objeto más completo con la información necesaria
    const enrichedMessage = {
      ...chatMessage.get({ plain: true }),
      chatUser: userInfo ? userInfo.get({ plain: true }) : { id: id_user }
    };

    // Emitir el mensaje a través de socket.io a todos los clientes en la sala
    const io = getSocketServer();
    if (io) {
      if (id_product) {
        console.log(`🔊 Emitiendo mensaje a sala product_${id_product}`);
        io.to(`product_${id_product}`).emit('new_message', enrichedMessage);
      } else if (id_barter) {
        console.log(`🔊 Emitiendo mensaje a sala barter_${id_barter}`);
        io.to(`barter_${id_barter}`).emit('new_message', enrichedMessage);
      }
    } else {
      console.error('❌ No se pudo emitir mensaje: socket.io no está inicializado');
    }

    // MEJORA: Devolver el mismo objeto enriquecido en la respuesta HTTP
    res.json(enrichedMessage);
  } catch (error) {
    console.error('Error al guardar mensaje:', error);
    res.status(500).json({ msg: 'Error al enviar mensaje', error });
  }
};

// Obtener mensajes por trueque
export const getMessagesByBarter = async (req: Request, res: Response) => {
  const { id_barter } = req.params;
  const userId = req.query.userId ? Number(req.query.userId) : null;
  
  try {
    console.log(`🔍 Obteniendo mensajes para trueque ${id_barter} ${userId ? `(usuario ${userId})` : ''}`);
    
    // Primero obtenemos información del barter
    const barter = await Barter.findByPk(id_barter);
    if (!barter) {
      return res.status(404).json({ 
        msg: 'Trueque no encontrado' 
      });
    }

    // Obtenemos todos los mensajes sin filtrar por usuario
    const messages = await ChatMessage.findAll({
      where: { id_barter },
      order: [['sent_at', 'ASC']],
      include: [{
        model: User,
        as: 'chatUser',
        attributes: ['id', 'name'],
        include: [{
          model: Image,
          as: 'userImages',
          required: false,
          attributes: ['url']
        }]
      }]
    });
    
    console.log(`✅ Encontrados ${messages.length} mensajes para trueque ${id_barter}`);
    
    // Solo filtrar mensajes que el usuario específicamente ha eliminado
    let filteredMessages = messages;
    if (userId) {
      filteredMessages = messages.filter(message => {
        let deletedForUser = message.deleted_for_user;
        
        if (typeof deletedForUser === 'string') {
          try {
            deletedForUser = JSON.parse(deletedForUser);
          } catch (e) {
            return true;
          }
        }
        
        return !Array.isArray(deletedForUser) || !deletedForUser.includes(userId);
      });
    }
    
    res.json(filteredMessages);
  } catch (error) {
    console.error('Error al obtener mensajes del trueque:', error);
    res.status(500).json({ msg: 'Error al obtener mensajes', error });
  }
};

// Corregir el método getMessagesByProduct para permitir que ambos usuarios vean los mensajes
export const getMessagesByProduct = async (req: Request, res: Response) => {
  const { id_product } = req.params;
  const userId = req.query.userId ? Number(req.query.userId) : null;
  
  try {
    console.log(`🔍 Obteniendo mensajes para producto ${id_product} ${userId ? `(usuario ${userId})` : ''}`);
    
    // Primero obtenemos información del producto para saber quién es el dueño
    const product = await Product.findByPk(id_product);
    if (!product) {
      return res.status(404).json({ 
        msg: 'Producto no encontrado' 
      });
    }

    // Obtenemos todos los mensajes del producto sin filtrar por usuario
    const messages = await ChatMessage.findAll({
      where: { id_product },
      order: [['sent_at', 'ASC']],
      include: [{
        model: User,
        as: 'chatUser',
        attributes: ['id', 'name'],
        include: [{
          model: Image,
          as: 'userImages',
          required: false,
          attributes: ['url']
        }]
      }]
    });
    
    console.log(`✅ Encontrados ${messages.length} mensajes para producto ${id_product}`);
    
    // Solo filtrar mensajes que el usuario específicamente ha eliminado
    let filteredMessages = messages;
    if (userId) {
      filteredMessages = messages.filter(message => {
        let deletedForUser = message.deleted_for_user;
        
        if (typeof deletedForUser === 'string') {
          try {
            deletedForUser = JSON.parse(deletedForUser);
          } catch (e) {
            return true;
          }
        }
        
        return !Array.isArray(deletedForUser) || !deletedForUser.includes(userId);
      });
    }
    
    res.json(filteredMessages);
  } catch (error) {
    console.error('Error al obtener mensajes del producto:', error);
    res.status(500).json({ msg: 'Error al obtener mensajes', error });
  }
};

// Modificar el método getUserChats para corregir los errores de tipado
export const getUserChats = async (req: Request, res: Response) => {
  const { userId } = req.params;
  if (!userId) {
    return res.status(400).json({ 
      success: false, 
      msg: 'ID de usuario requerido' 
    });
  }
  
  try {
    console.log(`🔍 Obteniendo chats para usuario ${userId}`);
    
    // 1. Obtener los ids de productos y trueques que el usuario ha marcado como eliminados
    const deletedChats = await ChatMessage.findAll({
      attributes: ['id_product', 'id_barter', 'deleted_for_user'],
      where: sequelize.literal(`JSON_CONTAINS(deleted_for_user, '${userId}')`)
    });
    
    // Extraer IDs de productos y trueques eliminados
    const deletedProductIds = new Set<number>();
    const deletedBarterIds = new Set<number>();
    
    deletedChats.forEach(chat => {
      const chatData = chat.get({ plain: true });
      if (chatData.id_product) deletedProductIds.add(Number(chatData.id_product));
      if (chatData.id_barter) deletedBarterIds.add(Number(chatData.id_barter));
    });
    
    console.log(`Chats eliminados para usuario ${userId}:`, {
      productIds: Array.from(deletedProductIds),
      barterIds: Array.from(deletedBarterIds)
    });
    
    // 2. Obtener los productos del usuario
    const userProducts = await Product.findAll({
      where: { id_user: userId },
      attributes: ['id_product', 'name']
    });
    
    const productIds = userProducts.map(p => p.get('id_product'));
    console.log(`📦 Productos del usuario ${userId}:`, productIds);

    // ✅ SOLUCIÓN: Variables para almacenar resultados
    let productChats: any[] = [];
    let userInitiatedChats: any[] = [];

    // ✅ CAMBIO CRÍTICO: Solo ejecutar consulta si hay productos
    if (productIds.length > 0) {
      console.log(`🔍 Ejecutando consulta de chats para ${productIds.length} productos`);
      
      // 3. Buscar todos los mensajes relacionados con los productos del usuario actual
      productChats = await sequelize.query(`
        SELECT DISTINCT cm.id_product, p.name as productName, u.id, u.name, 
          (SELECT MAX(sent_at) FROM chat_messages 
            WHERE id_product = cm.id_product) as lastMessageTime,
          (SELECT message FROM chat_messages 
            WHERE id_product = cm.id_product 
            ORDER BY sent_at DESC LIMIT 1) as lastMessage,
          (SELECT COUNT(*) FROM chat_messages 
            WHERE id_product = cm.id_product 
            AND id_user != :userId 
            AND is_read = false) as unreadCount
        FROM chat_messages cm
        JOIN products p ON cm.id_product = p.id_product
        JOIN users u ON cm.id_user = u.id
        WHERE cm.id_product IN (:productIds)
        AND cm.id_user != :userId
        GROUP BY cm.id_product, u.id
        ORDER BY lastMessageTime DESC
      `, {
        replacements: { userId, productIds },
        type: QueryTypes.SELECT
      });
      
      console.log(`✅ Chats en productos del usuario: ${productChats.length}`);
    } else {
      console.log(`ℹ️ Usuario ${userId} no tiene productos, omitiendo consulta de product chats`);
    }

    // 4. Para los productos donde el usuario actual inició el chat (SIEMPRE ejecutar)
    console.log(`🔍 Buscando chats iniciados por usuario ${userId}`);
    userInitiatedChats = await sequelize.query(`
      SELECT DISTINCT cm.id_product, p.name as productName, u.id, u.name, p.id_user as ownerId,
        (SELECT MAX(sent_at) FROM chat_messages 
          WHERE id_product = cm.id_product) as lastMessageTime,
        (SELECT message FROM chat_messages 
          WHERE id_product = cm.id_product 
          ORDER BY sent_at DESC LIMIT 1) as lastMessage,
        (SELECT COUNT(*) FROM chat_messages 
          WHERE id_product = cm.id_product 
          AND id_user != :userId 
          AND is_read = false) as unreadCount
      FROM chat_messages cm
      JOIN products p ON cm.id_product = p.id_product
      JOIN users u ON p.id_user = u.id
      WHERE cm.id_user = :userId
      AND p.id_user != :userId
      GROUP BY cm.id_product
      ORDER BY lastMessageTime DESC
    `, {
      replacements: { userId },
      type: QueryTypes.SELECT
    });
    
    console.log(`✅ Chats iniciados por usuario: ${userInitiatedChats.length}`);

    // 5. Buscar trueques donde el usuario es parte (SIEMPRE ejecutar)
    console.log(`🔍 Buscando chats de trueques para usuario ${userId}`);
    const barterChats = await sequelize.query(`
      SELECT DISTINCT cm.id_barter, 
        'Trueque' as barterName,
        CASE 
          WHEN b.id_user_offer = :userId THEN u_rec.id 
          ELSE u_off.id 
        END as id,
        CASE 
          WHEN b.id_user_offer = :userId THEN u_rec.name 
          ELSE u_off.name 
        END as name,
        (SELECT MAX(sent_at) FROM chat_messages 
          WHERE id_barter = cm.id_barter) as lastMessageTime,
        (SELECT message FROM chat_messages 
          WHERE id_barter = cm.id_barter 
          ORDER BY sent_at DESC LIMIT 1) as lastMessage,
        (SELECT COUNT(*) FROM chat_messages 
          WHERE id_barter = cm.id_barter 
          AND id_user != :userId 
          AND is_read = false) as unreadCount
      FROM chat_messages cm
      JOIN barters b ON cm.id_barter = b.id_barter
      JOIN users u_off ON b.id_user_offer = u_off.id
      JOIN users u_rec ON b.id_user_receiving = u_rec.id
      WHERE (b.id_user_offer = :userId OR b.id_user_receiving = :userId)
      GROUP BY cm.id_barter
      ORDER BY lastMessageTime DESC
    `, {
      replacements: { userId },
      type: QueryTypes.SELECT
    });
    
    console.log(`✅ Chats de trueques: ${barterChats.length}`);

    // 6. Filtrar los resultados para excluir chats eliminados y formatear
    const formattedProductChats = [...productChats, ...userInitiatedChats]
      .filter((chat): chat is { id_product: number | string } & typeof chat => 
        chat && 'id_product' in chat && !deletedProductIds.has(Number(chat.id_product))
      )
      .map((chat: any) => ({
        id_product: chat.id_product,
        productName: chat.productName,
        lastMessage: chat.lastMessage,
        lastMessageTime: chat.lastMessageTime,
        unreadCount: parseInt(chat.unreadCount || 0),
        otherUser: {
          id: chat.id,
          name: chat.name || 'Usuario',
          profileImage: null
        }
      }));

    const formattedBarterChats = barterChats
      .filter((chat): chat is { id_barter: number | string } & typeof chat => 
        chat && 'id_barter' in chat && !deletedBarterIds.has(Number(chat.id_barter))
      )
      .map((chat: any) => ({
        id_barter: chat.id_barter,
        barterName: chat.barterName,
        lastMessage: chat.lastMessage,
        lastMessageTime: chat.lastMessageTime,
        unreadCount: parseInt(chat.unreadCount || 0),
        otherUser: {
          id: chat.id,
          name: chat.name || 'Usuario',
          profileImage: null
        }
      }));

    const totalUnreadCount = [...formattedProductChats, ...formattedBarterChats].reduce(
      (sum, chat) => sum + chat.unreadCount, 0
    );

    console.log(`✅ Resumen final para usuario ${userId}:`, {
      productChats: formattedProductChats.length,
      barterChats: formattedBarterChats.length,
      totalUnread: totalUnreadCount
    });

    res.json({
      productChats: formattedProductChats,
      barterChats: formattedBarterChats,
      totalUnreadCount
    });

  } catch (error: unknown) {
    console.error('❌ Error al obtener chats del usuario:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ 
      success: false, 
      msg: 'Error al obtener chats del usuario', 
      error: errorMessage
    });
  }
};
// Corregir el método markMessagesAsRead

export const markMessagesAsRead = async (req: Request, res: Response) => {
  const { type, entityId } = req.params;
  const { userId } = req.body;
  
  if (!type || !entityId || !userId) {
    return res.status(400).json({ 
      success: false, 
      msg: 'Tipo, ID de entidad y ID de usuario son requeridos' 
    });
  }
  
  try {
    console.log(`Marcando como leídos mensajes de ${type} ${entityId} para usuario ${userId}`);
    
    const field = type === 'product' ? 'id_product' : 'id_barter';
    
    // Actualizar sólo los mensajes que NO son del usuario actual
    const updated = await ChatMessage.update(
      { is_read: true },
      {
        where: {
          [field]: entityId,
          id_user: { [Op.ne]: userId },
          is_read: false
        }
      }
    );
    
    console.log(`Mensajes actualizados: ${updated[0]}`);
    
    // Enviar evento de socket para actualizar contadores
    const io = getSocketServer();
    if (io) {
      const count = await getUnreadMessagesCount(userId);
      io.to(`user_${userId}`).emit('unread_messages_count', { count });
    }
    
    res.json({
      success: true,
      msg: `Mensajes marcados como leídos para ${type} ${entityId}`,
      updatedCount: updated[0]
    });
  } catch (error) {
    console.error('❌ Error al marcar mensajes como leídos:', error);
    res.status(500).json({ 
      success: false, 
      msg: 'Error al marcar mensajes como leídos', 
      error 
    });
  }
};

// Método para obtener conteo de mensajes no leídos
export const getUnreadMessagesCount = async (userId: string | number) => {
  try {
    return await ChatMessage.count({
      where: {
        id_user: { [Op.ne]: userId },
        is_read: false,
        [Op.or]: [
          {
            id_product: {
              [Op.in]: sequelize.literal(`(
                SELECT id_product FROM products 
                WHERE id_user = ${userId}
              )`)
            }
          },
          {
            id_barter: {
              [Op.in]: sequelize.literal(`(
                SELECT id_barter FROM barters 
                WHERE id_user_offer = ${userId} OR id_user_receiving = ${userId}
              )`)
            }
          }
        ]
      }
    });
  } catch (error) {
    console.error('❌ Error al contar mensajes no leídos:', error);
    return 0;
  }
};

// Endpoint para obtener el conteo
export const getUserUnreadMessagesCount = async (req: Request, res: Response) => {
  const { userId } = req.params;
  
  if (!userId) {
    return res.status(400).json({ 
      success: false, 
      msg: 'ID de usuario requerido' 
    });
  }
  
  try {
    const count = await getUnreadMessagesCount(userId);
    res.json({ count });
  } catch (error) {
    console.error('❌ Error al obtener conteo de mensajes no leídos:', error);
    res.status(500).json({ 
      success: false, 
      msg: 'Error al obtener conteo de mensajes no leídos', 
      error 
    });
  }
};

// Finalizar chat
export const finalizeChat = async (req: Request, res: Response) => {
  try {
    const { type, entityId } = req.params;
    const { userId } = req.body;
    
    if (!type || !entityId || !userId) {
      return res.status(400).json({ 
        success: false, 
        msg: 'Tipo de entidad, ID de entidad y ID de usuario son requeridos' 
      });
    }

    // Verificar si es un producto o un trueque
    const field = type === 'product' ? 'id_product' : 'id_barter';
    
    // Crear un mensaje de finalización
    const chatMessage = await ChatMessage.create({
      [field]: entityId,
      id_user: userId,
      message: '--- Chat finalizado ---',
      sent_at: new Date(),
      is_finalized: true
    });
    
    // Obtener información del usuario para incluir en el mensaje
    const userInfo = await User.findByPk(userId, {
      attributes: ['id', 'name'],
      include: [{
        model: Image,
        as: 'userImages',
        required: false,
        attributes: ['url']
      }]
    });
    
    const enrichedMessage = {
      ...chatMessage.get({ plain: true }),
      chatUser: userInfo ? userInfo.get({ plain: true }) : { id: userId }
    };

    // Emitir el mensaje por socket
    const io = getSocketServer();
    if (io) {
      if (type === 'product') {
        io.to(`product_${entityId}`).emit('new_message', enrichedMessage);
      } else if (type === 'barter') {
        io.to(`barter_${entityId}`).emit('new_message', enrichedMessage);
      }
    }
    
    return res.status(200).json(enrichedMessage);
  } catch (error) {
    console.error('Error al finalizar chat:', error);
    return res.status(500).json({
      success: false,
      msg: 'Error al finalizar chat',
      error
    });
  }
};

// Corregir los errores de tipado en el método deleteChat
export const deleteChat = async (req: Request, res: Response) => {
  try {
    const { type, entityId, userId } = req.params;
    
    if (!type || !entityId || !userId) {
      return res.status(400).json({ 
        success: false, 
        msg: 'Tipo de entidad, ID de entidad y ID de usuario son requeridos' 
      });
    }
    
    console.log(`🗑️ Usuario ${userId} eliminando chat de ${type} ${entityId}`);

    // Verificar si es un producto o un trueque
    const field = type === 'product' ? 'id_product' : 'id_barter';
    
    // Obtener la entidad (producto o trueque) para identificar a los participantes
    let participantIds: number[] = [];
    if (type === 'product') {
      const product = await Product.findByPk(entityId);
      if (!product) {
        return res.status(404).json({ success: false, msg: 'Producto no encontrado' });
      }
      
      // Corregir el acceso a id_user con tipado seguro
      const productUserId = product.getDataValue('id_user') as number;
      
      // Obtener todos los usuarios que han enviado mensajes en este chat
      const chatUsers = await ChatMessage.findAll({
        where: { [field]: entityId },
        attributes: ['id_user'],
        group: ['id_user']
      });
      
      // El dueño del producto y todos los que han enviado mensajes son participantes
      participantIds = [...new Set([
        productUserId, 
        ...chatUsers.map(user => user.id_user)
      ])];
    } else if (type === 'barter') {
      const barter = await Barter.findByPk(entityId);
      if (!barter) {
        return res.status(404).json({ success: false, msg: 'Trueque no encontrado' });
      }
      
      // Corregir el acceso a los IDs de usuario con tipado seguro
      const userOffer = barter.getDataValue('id_user_offer') as number;
      const userReceiving = barter.getDataValue('id_user_receiving') as number;
      
      // Los participantes son el que ofrece y el que recibe el trueque
      participantIds = [userOffer, userReceiving].filter(id => id !== null && id !== undefined);
    }
    
    // Filtrar IDs de usuarios inválidos o duplicados
    participantIds = [...new Set(participantIds.filter(id => id && id > 0))];
    console.log(`👥 Participantes del chat: ${participantIds.join(', ')}`);
    
    // Buscar todos los mensajes de este chat
    const messages = await ChatMessage.findAll({
      where: { [field]: entityId }
    });
    
    console.log(`📝 Procesando ${messages.length} mensajes`);
    
    // Para cada mensaje, añadir el ID del usuario a deleted_for_user
    for (const message of messages) {
      let deletedForUser = message.deleted_for_user || [];
      
      // Si es string, convertirlo a array
      if (typeof deletedForUser === 'string') {
        try {
          deletedForUser = JSON.parse(deletedForUser);
        } catch (e) {
          deletedForUser = [];
        }
      }
      
      // Si no es array, inicializar uno nuevo
      if (!Array.isArray(deletedForUser)) {
        deletedForUser = [];
      }
      
      // Añadir el ID del usuario si no está ya
      if (!deletedForUser.includes(Number(userId))) {
        deletedForUser.push(Number(userId));
        
        // Actualizar el mensaje con el nuevo array
        await message.update({
          deleted_for_user: deletedForUser
        });
        
        console.log(`✍️ Mensaje ID ${message.id_message} actualizado: ${deletedForUser.join(', ')}`);
      }
      
      // NUEVA FUNCIONALIDAD: Si todos los participantes han eliminado el mensaje, eliminarlo físicamente
      if (participantIds.length > 0) {
        const allParticipantsDeleted = participantIds.every(
          participantId => deletedForUser.includes(Number(participantId))
        );
        
        if (allParticipantsDeleted) {
          console.log(`🗑️ Eliminando permanentemente mensaje ${message.id_message}, todos los participantes lo han borrado`);
          await message.destroy();
        }
      }
    }
    
    return res.status(200).json({
      success: true,
      msg: 'Chat eliminado del historial para el usuario'
    });
  } catch (error) {
    console.error('❌ Error al eliminar chat:', error);
    return res.status(500).json({
      success: false,
      msg: 'Error al eliminar chat',
      error
    });
  }
};
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

// Reemplaza o añade este método en tu controlador
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

    // Obtener los productos del usuario
    const userProducts = await User.findByPk(userId, {
      include: [{ model: require('../db/models/product').default, as: 'products', attributes: ['id_product'] }]
    });
    const productIds = userProducts && (userProducts as any).products
      ? (userProducts as any).products.map((p: any) => p.id_product)
      : [];

    // Mensajes de productos donde el usuario es dueño
    const productChats = await ChatMessage.findAll({
      where: {
        id_product: { [Op.in]: productIds }
      },
      include: [
        {
          model: User,
          as: 'chatUser',
          attributes: ['id', 'name'],
          include: [{
            model: Image,
            as: 'userImages',
            required: false,
            attributes: ['url']
          }]
        }
      ],
      order: [['sent_at', 'DESC']]
    });

    // Agrupar por producto
    const productChatsMap = new Map<number, any>();
    for (const message of productChats) {
      const productId = message.get('id_product') as number;
      if (!productId) continue;
      const currentMessage = {
        ...message.get({ plain: true }),
        id_product: productId
      };
      if (!productChatsMap.has(productId) || 
          new Date(currentMessage.sent_at) > new Date(productChatsMap.get(productId).sent_at)) {
        productChatsMap.set(productId, currentMessage);
      }
    }

    // Trueques donde el usuario es parte
    const barterChats = await ChatMessage.findAll({
      where: {
        [Op.and]: [
          { id_barter: { [Op.ne]: null } },
          {
            [Op.or]: [
              { '$barter.id_user_offer$': userId },
              { '$barter.id_user_receiving$': userId }
            ]
          }
        ]
      },
      include: [
        {
          model: User,
          as: 'chatUser',
          attributes: ['id', 'name'],
          include: [{
            model: Image,
            as: 'userImages',
            required: false,
            attributes: ['url']
          }]
        },
        {
          model: require('../db/models/barter').default,
          as: 'barter',
          attributes: ['id_barter', 'id_user_offer', 'id_user_receiving']
        }
      ],
      order: [['sent_at', 'DESC']]
    });

    const barterChatsMap = new Map<number, any>();
    for (const message of barterChats) {
      const barterId = message.get('id_barter') as number;
      if (!barterId) continue;
      const currentMessage = {
        ...message.get({ plain: true }),
        id_barter: barterId
      };
      if (!barterChatsMap.has(barterId) || 
          new Date(currentMessage.sent_at) > new Date(barterChatsMap.get(barterId).sent_at)) {
        barterChatsMap.set(barterId, currentMessage);
      }
    }

    // Formatear resultados
    const formattedProductChats = Array.from(productChatsMap.values()).map(message => ({
      id_product: message.id_product,
      productName: "Producto",
      lastMessage: message.message,
      lastMessageTime: message.sent_at,
      unreadCount: 0,
      otherUser: {
        id: message.chatUser?.id,
        name: message.chatUser?.name,
        profileImage: message.chatUser?.userImages?.[0]?.url || null
      }
    }));

    const formattedBarterChats = Array.from(barterChatsMap.values()).map(message => ({
      id_barter: message.id_barter,
      barterName: "Trueque",
      lastMessage: message.message,
      lastMessageTime: message.sent_at,
      unreadCount: 0,
      otherUser: {
        id: message.chatUser?.id,
        name: message.chatUser?.name,
        profileImage: message.chatUser?.userImages?.[0]?.url || null
      }
    }));

    res.json({
      productChats: formattedProductChats,
      barterChats: formattedBarterChats,
      totalUnreadCount: 0
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

// Método para marcar mensajes como leídos
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
    const field = type === 'product' ? 'id_product' : 'id_barter';
    
    await ChatMessage.update(
      { is_read: true },
      {
        where: {
          [field]: entityId,
          id_user: { [Op.ne]: userId }
        }
      }
    );
    
    // Enviar evento de socket para actualizar contadores
    const io = getSocketServer();
    if (io) {
      io.to(`user_${userId}`).emit('unread_messages_count', { 
        count: await getUnreadMessagesCount(userId) 
      });
    }
    
    res.json({
      success: true,
      msg: `Mensajes marcados como leídos para ${type} ${entityId}`
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

// Eliminar chat del historial para un usuario específico
export const deleteChat = async (req: Request, res: Response) => {
  try {
    const { type, entityId, userId } = req.params;
    
    if (!type || !entityId || !userId) {
      return res.status(400).json({ 
        success: false, 
        msg: 'Tipo de entidad, ID de entidad y ID de usuario son requeridos' 
      });
    }

    // Verificar si es un producto o un trueque
    const field = type === 'product' ? 'id_product' : 'id_barter';
    
    // Buscar todos los mensajes de este chat
    const messages = await ChatMessage.findAll({
      where: {
        [field]: entityId
      }
    });
    
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
        
        // Actualizar el mensaje
        await message.update({
          deleted_for_user: deletedForUser
        });
      }
    }
    
    return res.status(200).json({
      success: true,
      msg: 'Chat eliminado del historial para el usuario'
    });
  } catch (error) {
    console.error('Error al eliminar chat:', error);
    return res.status(500).json({
      success: false,
      msg: 'Error al eliminar chat',
      error
    });
  }
};
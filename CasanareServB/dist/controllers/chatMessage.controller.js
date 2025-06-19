"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteChat = exports.finalizeChat = exports.getUserUnreadMessagesCount = exports.getUnreadMessagesCount = exports.markMessagesAsRead = exports.getUserChats = exports.getMessagesByProduct = exports.getMessagesByBarter = exports.sendMessage = void 0;
const chatMessage_1 = __importDefault(require("../db/models/chatMessage"));
const user_1 = __importDefault(require("../db/models/user"));
const image_1 = __importDefault(require("../db/models/image"));
const product_1 = __importDefault(require("../db/models/product"));
const sequelize_1 = require("sequelize");
const conection_1 = __importDefault(require("../db/conection"));
const sequelize_2 = require("sequelize");
const socket_1 = require("../sockets/socket");
const barter_1 = __importDefault(require("../db/models/barter"));
// Utilidad para bloquear teléfonos y emails
function containsBlockedInfo(text) {
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
    const phoneRegex = /(\+?\d{1,3})?[\s.-]?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}/;
    return emailRegex.test(text) || phoneRegex.test(text);
}
// Enviar mensaje (para trueque o producto)
const sendMessage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const chatMessage = yield chatMessage_1.default.create({
            id_barter: id_barter || null,
            id_product: id_product || null,
            id_user,
            message,
            image_url,
            sent_at: new Date(),
        });
        // Obtener información adicional del usuario para incluir en el mensaje
        const userInfo = yield user_1.default.findByPk(id_user, {
            attributes: ['id', 'name'],
            include: [{
                    model: image_1.default,
                    as: 'userImages',
                    required: false,
                    attributes: ['url']
                }]
        });
        // MEJORA: Crear un objeto más completo con la información necesaria
        const enrichedMessage = Object.assign(Object.assign({}, chatMessage.get({ plain: true })), { chatUser: userInfo ? userInfo.get({ plain: true }) : { id: id_user } });
        // Emitir el mensaje a través de socket.io a todos los clientes en la sala
        const io = (0, socket_1.getSocketServer)();
        if (io) {
            if (id_product) {
                console.log(`🔊 Emitiendo mensaje a sala product_${id_product}`);
                io.to(`product_${id_product}`).emit('new_message', enrichedMessage);
            }
            else if (id_barter) {
                console.log(`🔊 Emitiendo mensaje a sala barter_${id_barter}`);
                io.to(`barter_${id_barter}`).emit('new_message', enrichedMessage);
            }
        }
        else {
            console.error('❌ No se pudo emitir mensaje: socket.io no está inicializado');
        }
        // MEJORA: Devolver el mismo objeto enriquecido en la respuesta HTTP
        res.json(enrichedMessage);
    }
    catch (error) {
        console.error('Error al guardar mensaje:', error);
        res.status(500).json({ msg: 'Error al enviar mensaje', error });
    }
});
exports.sendMessage = sendMessage;
// Obtener mensajes por trueque
const getMessagesByBarter = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id_barter } = req.params;
    const userId = req.query.userId ? Number(req.query.userId) : null;
    try {
        console.log(`🔍 Obteniendo mensajes para trueque ${id_barter} ${userId ? `(usuario ${userId})` : ''}`);
        // Primero obtenemos información del barter
        const barter = yield barter_1.default.findByPk(id_barter);
        if (!barter) {
            return res.status(404).json({
                msg: 'Trueque no encontrado'
            });
        }
        // Obtenemos todos los mensajes sin filtrar por usuario
        const messages = yield chatMessage_1.default.findAll({
            where: { id_barter },
            order: [['sent_at', 'ASC']],
            include: [{
                    model: user_1.default,
                    as: 'chatUser',
                    attributes: ['id', 'name'],
                    include: [{
                            model: image_1.default,
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
                    }
                    catch (e) {
                        return true;
                    }
                }
                return !Array.isArray(deletedForUser) || !deletedForUser.includes(userId);
            });
        }
        res.json(filteredMessages);
    }
    catch (error) {
        console.error('Error al obtener mensajes del trueque:', error);
        res.status(500).json({ msg: 'Error al obtener mensajes', error });
    }
});
exports.getMessagesByBarter = getMessagesByBarter;
// Obtener mensajes por producto
const getMessagesByProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id_product } = req.params;
    const userId = req.query.userId ? Number(req.query.userId) : null;
    try {
        console.log(`🔍 Obteniendo mensajes para producto ${id_product} ${userId ? `(usuario ${userId})` : ''}`);
        // Primero obtenemos información del producto para saber quién es el dueño
        const product = yield product_1.default.findByPk(id_product);
        if (!product) {
            return res.status(404).json({
                msg: 'Producto no encontrado'
            });
        }
        // Obtenemos todos los mensajes del producto sin filtrar por usuario
        const messages = yield chatMessage_1.default.findAll({
            where: { id_product },
            order: [['sent_at', 'ASC']],
            include: [{
                    model: user_1.default,
                    as: 'chatUser',
                    attributes: ['id', 'name'],
                    include: [{
                            model: image_1.default,
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
                    }
                    catch (e) {
                        return true;
                    }
                }
                return !Array.isArray(deletedForUser) || !deletedForUser.includes(userId);
            });
        }
        res.json(filteredMessages);
    }
    catch (error) {
        console.error('Error al obtener mensajes del producto:', error);
        res.status(500).json({ msg: 'Error al obtener mensajes', error });
    }
});
exports.getMessagesByProduct = getMessagesByProduct;
// Obtener chats del usuario
const getUserChats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const deletedChats = yield chatMessage_1.default.findAll({
            attributes: ['id_product', 'id_barter', 'deleted_for_user'],
            where: conection_1.default.literal(`JSON_CONTAINS(deleted_for_user, '${userId}')`)
        });
        // Extraer IDs de productos y trueques eliminados
        const deletedProductIds = new Set();
        const deletedBarterIds = new Set();
        deletedChats.forEach(chat => {
            const chatData = chat.get({ plain: true });
            if (chatData.id_product)
                deletedProductIds.add(Number(chatData.id_product));
            if (chatData.id_barter)
                deletedBarterIds.add(Number(chatData.id_barter));
        });
        console.log(`Chats eliminados para usuario ${userId}:`, {
            productIds: Array.from(deletedProductIds),
            barterIds: Array.from(deletedBarterIds)
        });
        // 2. Obtener los productos del usuario
        const userProducts = yield product_1.default.findAll({
            where: { id_user: userId },
            attributes: ['id_product', 'name']
        });
        const productIds = userProducts.map(p => p.get('id_product'));
        console.log(`📦 Productos del usuario ${userId}:`, productIds);
        // ✅ SOLUCIÓN: Variables para almacenar resultados
        let productChats = [];
        let userInitiatedChats = [];
        // ✅ CAMBIO CRÍTICO: Solo ejecutar consulta si hay productos
        if (productIds.length > 0) {
            console.log(`🔍 Ejecutando consulta de chats para ${productIds.length} productos`);
            // 3. Buscar todos los mensajes relacionados con los productos del usuario actual
            productChats = yield conection_1.default.query(`
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
                type: sequelize_2.QueryTypes.SELECT
            });
            console.log(`✅ Chats en productos del usuario: ${productChats.length}`);
        }
        else {
            console.log(`ℹ️ Usuario ${userId} no tiene productos, omitiendo consulta de product chats`);
        }
        // 4. Para los productos donde el usuario actual inició el chat (SIEMPRE ejecutar)
        console.log(`🔍 Buscando chats iniciados por usuario ${userId}`);
        userInitiatedChats = yield conection_1.default.query(`
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
            type: sequelize_2.QueryTypes.SELECT
        });
        console.log(`✅ Chats iniciados por usuario: ${userInitiatedChats.length}`);
        // 5. Buscar trueques donde el usuario es parte (SIEMPRE ejecutar)
        console.log(`🔍 Buscando chats de trueques para usuario ${userId}`);
        const barterChats = yield conection_1.default.query(`
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
            type: sequelize_2.QueryTypes.SELECT
        });
        console.log(`✅ Chats de trueques: ${barterChats.length}`);
        // 6. Filtrar los resultados para excluir chats eliminados y formatear
        const formattedProductChats = [...productChats, ...userInitiatedChats]
            .filter((chat) => chat && 'id_product' in chat && !deletedProductIds.has(Number(chat.id_product)))
            .map((chat) => ({
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
            .filter((chat) => chat && 'id_barter' in chat && !deletedBarterIds.has(Number(chat.id_barter)))
            .map((chat) => ({
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
        const totalUnreadCount = [...formattedProductChats, ...formattedBarterChats].reduce((sum, chat) => sum + chat.unreadCount, 0);
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
    }
    catch (error) {
        console.error('❌ Error al obtener chats del usuario:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        res.status(500).json({
            success: false,
            msg: 'Error al obtener chats del usuario',
            error: errorMessage
        });
    }
});
exports.getUserChats = getUserChats;
// Método para marcar mensajes como leídos
const markMessagesAsRead = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const updated = yield chatMessage_1.default.update({ is_read: true }, {
            where: {
                [field]: entityId,
                id_user: { [sequelize_1.Op.ne]: userId },
                is_read: false
            }
        });
        console.log(`Mensajes actualizados: ${updated[0]}`);
        // Enviar evento de socket para actualizar contadores
        const io = (0, socket_1.getSocketServer)();
        if (io) {
            const count = yield (0, exports.getUnreadMessagesCount)(userId);
            io.to(`user_${userId}`).emit('unread_messages_count', { count });
        }
        res.json({
            success: true,
            msg: `Mensajes marcados como leídos para ${type} ${entityId}`,
            updatedCount: updated[0]
        });
    }
    catch (error) {
        console.error('❌ Error al marcar mensajes como leídos:', error);
        res.status(500).json({
            success: false,
            msg: 'Error al marcar mensajes como leídos',
            error
        });
    }
});
exports.markMessagesAsRead = markMessagesAsRead;
// Método para obtener conteo de mensajes no leídos
const getUnreadMessagesCount = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        return yield chatMessage_1.default.count({
            where: {
                id_user: { [sequelize_1.Op.ne]: userId },
                is_read: false,
                [sequelize_1.Op.or]: [
                    {
                        id_product: {
                            [sequelize_1.Op.in]: conection_1.default.literal(`(
                SELECT id_product FROM products 
                WHERE id_user = ${userId}
              )`)
                        }
                    },
                    {
                        id_barter: {
                            [sequelize_1.Op.in]: conection_1.default.literal(`(
                SELECT id_barter FROM barters 
                WHERE id_user_offer = ${userId} OR id_user_receiving = ${userId}
              )`)
                        }
                    }
                ]
            }
        });
    }
    catch (error) {
        console.error('❌ Error al contar mensajes no leídos:', error);
        return 0;
    }
});
exports.getUnreadMessagesCount = getUnreadMessagesCount;
// Endpoint para obtener el conteo
const getUserUnreadMessagesCount = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.params;
    if (!userId) {
        return res.status(400).json({
            success: false,
            msg: 'ID de usuario requerido'
        });
    }
    try {
        const count = yield (0, exports.getUnreadMessagesCount)(userId);
        res.json({ count });
    }
    catch (error) {
        console.error('❌ Error al obtener conteo de mensajes no leídos:', error);
        res.status(500).json({
            success: false,
            msg: 'Error al obtener conteo de mensajes no leídos',
            error
        });
    }
});
exports.getUserUnreadMessagesCount = getUserUnreadMessagesCount;
// Método para finalizar un chat (producto o trueque)
const finalizeChat = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const chatMessage = yield chatMessage_1.default.create({
            [field]: entityId,
            id_user: userId,
            message: '--- Chat finalizado ---',
            sent_at: new Date(),
            is_finalized: true
        });
        // Obtener información del usuario para incluir en el mensaje
        const userInfo = yield user_1.default.findByPk(userId, {
            attributes: ['id', 'name'],
            include: [{
                    model: image_1.default,
                    as: 'userImages',
                    required: false,
                    attributes: ['url']
                }]
        });
        const enrichedMessage = Object.assign(Object.assign({}, chatMessage.get({ plain: true })), { chatUser: userInfo ? userInfo.get({ plain: true }) : { id: userId } });
        // Emitir el mensaje por socket
        const io = (0, socket_1.getSocketServer)();
        if (io) {
            const roomId = type === 'product' ? `product_${entityId}` : `barter_${entityId}`;
            // ✅ EMITIR EL MENSAJE DE FINALIZACIÓN
            io.to(roomId).emit('new_message', enrichedMessage);
            // ✅ NUEVO: EMITIR EVENTO ESPECÍFICO DE CHAT FINALIZADO
            io.to(roomId).emit('chat_finalized', {
                type: type,
                entityId: entityId,
                finalizedBy: userId,
                timestamp: new Date().toISOString(),
                message: enrichedMessage
            });
            console.log(`🔒 Chat ${type} ${entityId} finalizado por usuario ${userId} - Evento emitido`);
        }
        return res.status(200).json(enrichedMessage);
    }
    catch (error) {
        console.error('Error al finalizar chat:', error);
        return res.status(500).json({
            success: false,
            msg: 'Error al finalizar chat',
            error
        });
    }
});
exports.finalizeChat = finalizeChat;
// Método para eliminar un chat del historial del usuario
const deleteChat = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        let participantIds = [];
        if (type === 'product') {
            const product = yield product_1.default.findByPk(entityId);
            if (!product) {
                return res.status(404).json({ success: false, msg: 'Producto no encontrado' });
            }
            // Corregir el acceso a id_user con tipado seguro
            const productUserId = product.getDataValue('id_user');
            // Obtener todos los usuarios que han enviado mensajes en este chat
            const chatUsers = yield chatMessage_1.default.findAll({
                where: { [field]: entityId },
                attributes: ['id_user'],
                group: ['id_user']
            });
            // El dueño del producto y todos los que han enviado mensajes son participantes
            participantIds = [...new Set([
                    productUserId,
                    ...chatUsers.map(user => user.id_user)
                ])];
        }
        else if (type === 'barter') {
            const barter = yield barter_1.default.findByPk(entityId);
            if (!barter) {
                return res.status(404).json({ success: false, msg: 'Trueque no encontrado' });
            }
            // Corregir el acceso a los IDs de usuario con tipado seguro
            const userOffer = barter.getDataValue('id_user_offer');
            const userReceiving = barter.getDataValue('id_user_receiving');
            // Los participantes son el que ofrece y el que recibe el trueque
            participantIds = [userOffer, userReceiving].filter(id => id !== null && id !== undefined);
        }
        // Filtrar IDs de usuarios inválidos o duplicados
        participantIds = [...new Set(participantIds.filter(id => id && id > 0))];
        console.log(`👥 Participantes del chat: ${participantIds.join(', ')}`);
        // Buscar todos los mensajes de este chat
        const messages = yield chatMessage_1.default.findAll({
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
                }
                catch (e) {
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
                yield message.update({
                    deleted_for_user: deletedForUser
                });
                console.log(`✍️ Mensaje ID ${message.id_message} actualizado: ${deletedForUser.join(', ')}`);
            }
            // NUEVA FUNCIONALIDAD: Si todos los participantes han eliminado el mensaje, eliminarlo físicamente
            if (participantIds.length > 0) {
                const allParticipantsDeleted = participantIds.every(participantId => deletedForUser.includes(Number(participantId)));
                if (allParticipantsDeleted) {
                    console.log(`🗑️ Eliminando permanentemente mensaje ${message.id_message}, todos los participantes lo han borrado`);
                    yield message.destroy();
                }
            }
        }
        return res.status(200).json({
            success: true,
            msg: 'Chat eliminado del historial para el usuario'
        });
    }
    catch (error) {
        console.error('❌ Error al eliminar chat:', error);
        return res.status(500).json({
            success: false,
            msg: 'Error al eliminar chat',
            error
        });
    }
});
exports.deleteChat = deleteChat;

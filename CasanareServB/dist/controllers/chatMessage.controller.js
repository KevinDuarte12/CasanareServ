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
exports.getUserUnreadMessagesCount = exports.getUnreadMessagesCount = exports.markMessagesAsRead = exports.getUserChats = exports.getMessagesByProduct = exports.getMessagesByBarter = exports.sendMessage = void 0;
const chatMessage_1 = __importDefault(require("../db/models/chatMessage"));
const user_1 = __importDefault(require("../db/models/user"));
const image_1 = __importDefault(require("../db/models/image"));
const sequelize_1 = require("sequelize");
const conection_1 = __importDefault(require("../db/conection"));
const socket_1 = require("../sockets/socket");
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
        // Emitir el mensaje completo
        const io = (0, socket_1.getSocketServer)();
        if (io) {
            // Crear objeto completo para la emisión
            const enrichedMessage = Object.assign(Object.assign({}, chatMessage.get({ plain: true })), { chatUser: userInfo ? userInfo.get({ plain: true }) : { id: id_user } });
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
        res.json(chatMessage);
    }
    catch (error) {
        res.status(500).json({ msg: 'Error al enviar mensaje', error });
    }
});
exports.sendMessage = sendMessage;
// Obtener mensajes por trueque
const getMessagesByBarter = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id_barter } = req.params;
    try {
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
                            attributes: ['url'] // Cambia 'url' si tu campo se llama diferente
                        }]
                }]
        });
        res.json(messages);
    }
    catch (error) {
        res.status(500).json({ msg: 'Error al obtener mensajes', error });
    }
});
exports.getMessagesByBarter = getMessagesByBarter;
// Obtener mensajes por producto
const getMessagesByProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id_product } = req.params;
    try {
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
                            attributes: ['url'] // Cambia 'url' si tu campo se llama diferente
                        }]
                }]
        });
        res.json(messages);
    }
    catch (error) {
        res.status(500).json({ msg: 'Error al obtener mensajes', error });
    }
});
exports.getMessagesByProduct = getMessagesByProduct;
// Reemplaza o añade este método en tu controlador
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
        // Obtener los productos del usuario
        const userProducts = yield user_1.default.findByPk(userId, {
            include: [{ model: require('../db/models/product').default, as: 'products', attributes: ['id_product'] }]
        });
        const productIds = userProducts && userProducts.products
            ? userProducts.products.map((p) => p.id_product)
            : [];
        // Mensajes de productos donde el usuario es dueño
        const productChats = yield chatMessage_1.default.findAll({
            where: {
                id_product: { [sequelize_1.Op.in]: productIds }
            },
            include: [
                {
                    model: user_1.default,
                    as: 'chatUser',
                    attributes: ['id', 'name'],
                    include: [{
                            model: image_1.default,
                            as: 'userImages',
                            required: false,
                            attributes: ['url']
                        }]
                }
            ],
            order: [['sent_at', 'DESC']]
        });
        // Agrupar por producto
        const productChatsMap = new Map();
        for (const message of productChats) {
            const productId = message.get('id_product');
            if (!productId)
                continue;
            const currentMessage = Object.assign(Object.assign({}, message.get({ plain: true })), { id_product: productId });
            if (!productChatsMap.has(productId) ||
                new Date(currentMessage.sent_at) > new Date(productChatsMap.get(productId).sent_at)) {
                productChatsMap.set(productId, currentMessage);
            }
        }
        // Trueques donde el usuario es parte
        const barterChats = yield chatMessage_1.default.findAll({
            where: {
                [sequelize_1.Op.and]: [
                    { id_barter: { [sequelize_1.Op.ne]: null } },
                    {
                        [sequelize_1.Op.or]: [
                            { '$barter.id_user_offer$': userId },
                            { '$barter.id_user_receiving$': userId }
                        ]
                    }
                ]
            },
            include: [
                {
                    model: user_1.default,
                    as: 'chatUser',
                    attributes: ['id', 'name'],
                    include: [{
                            model: image_1.default,
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
        const barterChatsMap = new Map();
        for (const message of barterChats) {
            const barterId = message.get('id_barter');
            if (!barterId)
                continue;
            const currentMessage = Object.assign(Object.assign({}, message.get({ plain: true })), { id_barter: barterId });
            if (!barterChatsMap.has(barterId) ||
                new Date(currentMessage.sent_at) > new Date(barterChatsMap.get(barterId).sent_at)) {
                barterChatsMap.set(barterId, currentMessage);
            }
        }
        // Formatear resultados
        const formattedProductChats = Array.from(productChatsMap.values()).map(message => {
            var _a, _b, _c, _d, _e;
            return ({
                id_product: message.id_product,
                productName: "Producto",
                lastMessage: message.message,
                lastMessageTime: message.sent_at,
                unreadCount: 0,
                otherUser: {
                    id: (_a = message.chatUser) === null || _a === void 0 ? void 0 : _a.id,
                    name: (_b = message.chatUser) === null || _b === void 0 ? void 0 : _b.name,
                    profileImage: ((_e = (_d = (_c = message.chatUser) === null || _c === void 0 ? void 0 : _c.userImages) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.url) || null
                }
            });
        });
        const formattedBarterChats = Array.from(barterChatsMap.values()).map(message => {
            var _a, _b, _c, _d, _e;
            return ({
                id_barter: message.id_barter,
                barterName: "Trueque",
                lastMessage: message.message,
                lastMessageTime: message.sent_at,
                unreadCount: 0,
                otherUser: {
                    id: (_a = message.chatUser) === null || _a === void 0 ? void 0 : _a.id,
                    name: (_b = message.chatUser) === null || _b === void 0 ? void 0 : _b.name,
                    profileImage: ((_e = (_d = (_c = message.chatUser) === null || _c === void 0 ? void 0 : _c.userImages) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.url) || null
                }
            });
        });
        res.json({
            productChats: formattedProductChats,
            barterChats: formattedBarterChats,
            totalUnreadCount: 0
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
        const field = type === 'product' ? 'id_product' : 'id_barter';
        yield chatMessage_1.default.update({ is_read: true }, {
            where: {
                [field]: entityId,
                id_user: { [sequelize_1.Op.ne]: userId }
            }
        });
        // Enviar evento de socket para actualizar contadores
        const io = (0, socket_1.getSocketServer)();
        if (io) {
            io.to(`user_${userId}`).emit('unread_messages_count', {
                count: yield (0, exports.getUnreadMessagesCount)(userId)
            });
        }
        res.json({
            success: true,
            msg: `Mensajes marcados como leídos para ${type} ${entityId}`
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

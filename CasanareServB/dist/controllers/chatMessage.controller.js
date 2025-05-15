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
exports.getMessagesByProduct = exports.getMessagesByBarter = exports.sendMessage = void 0;
const chatMessage_1 = __importDefault(require("../db/models/chatMessage"));
const user_1 = __importDefault(require("../db/models/user"));
// Utilidad para bloquear teléfonos y emails
function containsBlockedInfo(text) {
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
    const phoneRegex = /(\+?\d{1,3})?[\s.-]?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}/;
    return emailRegex.test(text) || phoneRegex.test(text);
}
// Enviar mensaje (para trueque o producto)
const sendMessage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id_barter, id_product, id_user, message, image_url } = req.body;
    if (!id_user || (!message && !image_url)) {
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
            include: [{ model: user_1.default, as: 'user', attributes: ['id', 'name'] }]
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
            include: [{ model: user_1.default, as: 'user', attributes: ['id', 'name'] }]
        });
        res.json(messages);
    }
    catch (error) {
        res.status(500).json({ msg: 'Error al obtener mensajes', error });
    }
});
exports.getMessagesByProduct = getMessagesByProduct;

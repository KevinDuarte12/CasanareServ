"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const chatMessageController = __importStar(require("../controllers/chatMessage.controller"));
const validate_token_1 = __importDefault(require("../middlewares/validate-token"));
/**
 * 💬 RUTAS DE MENSAJES DE CHAT
 * Gestiona todas las operaciones de mensajería entre usuarios
 * Incluye chat contextual para productos y trueques
 */
const router = (0, express_1.Router)();
// 📝 RUTAS DE ENVÍO Y CONSULTA DE MENSAJES
// Enviar nuevo mensaje de chat
router.post('/message', chatMessageController.sendMessage);
// Obtener mensajes de chat de un trueque específico
router.get('/barter/:id_barter', chatMessageController.getMessagesByBarter);
// Obtener mensajes de chat de un producto específico
router.get('/product/:id_product', chatMessageController.getMessagesByProduct);
// 👤 RUTAS DE GESTIÓN DE CHATS POR USUARIO
// Obtener todos los chats activos del usuario
router.get('/user/:userId/chats', validate_token_1.default, // Autenticación requerida
chatMessageController.getUserChats);
// Obtener contador de mensajes no leídos del usuario
router.get('/user/:userId/unread-count', validate_token_1.default, // Autenticación requerida
chatMessageController.getUserUnreadMessagesCount);
// 📖 RUTAS DE MARCADO DE LECTURA
// Marcar mensajes como leídos en chat específico
router.put('/:type/:entityId/read', validate_token_1.default, // Usuario autenticado
chatMessageController.markMessagesAsRead);
// 🔚 RUTAS DE GESTIÓN DE CHATS
// Finalizar chat (cerrar conversación)
router.post('/:type/:entityId/finalize', validate_token_1.default, // Usuario autenticado
chatMessageController.finalizeChat);
// Eliminar chat específico para un usuario
router.delete('/:type/:entityId/user/:userId', validate_token_1.default, // Usuario autenticado
chatMessageController.deleteChat);
exports.default = router;

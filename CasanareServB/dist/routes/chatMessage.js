"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const chatMessage_controller_1 = require("../controllers/chatMessage.controller");
const router = (0, express_1.Router)();
router.post('/message', chatMessage_controller_1.sendMessage);
router.get('/barter/:id_barter', chatMessage_controller_1.getMessagesByBarter);
router.get('/product/:id_product', chatMessage_controller_1.getMessagesByProduct);
exports.default = router;

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_controller_1 = require("../controllers/user.controller");
const validate_token_1 = __importDefault(require("./validate-token"));
const router = (0, express_1.Router)();
// Rutas públicas
router.post('/', user_controller_1.newUser);
router.post('/login', user_controller_1.login);
// Rutas protegidas (necesitan token)
router.get('/', user_controller_1.getUsers); // Cambio: de /users a /
router.put('/:id', validate_token_1.default, user_controller_1.updateUser);
router.delete('/:id', validate_token_1.default, user_controller_1.deleteUser);
exports.default = router;

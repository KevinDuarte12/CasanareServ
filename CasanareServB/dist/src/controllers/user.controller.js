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
exports.deleteUser = exports.updateUser = exports.getUsers = exports.login = exports.newUser = void 0;
// Importamos bcrypt para el manejo seguro de contraseñas (hash y comparación)
const bcrypt_1 = __importDefault(require("bcrypt"));
// Importamos nuestro modelo de Usuario para interactuar con la base de datos
const user_1 = __importDefault(require("../db/models/user"));
// Importamos jwt para generar tokens de autenticación
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// Controlador para crear nuevos usuarios
const newUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { username, password, email } = req.body;
        // Hash de la contraseña
        const hashedPassword = yield bcrypt_1.default.hash(password, 10);
        const user = yield user_1.default.create({
            username,
            password: hashedPassword,
            email
        });
        // Convertimos el objeto Sequelize a un objeto plano
        const userJson = user.toJSON();
        res.status(201).json({
            msg: 'Usuario creado exitosamente',
            user: {
                id: userJson.id,
                username: userJson.username,
                email: userJson.email
            }
        });
    }
    catch (error) {
        console.error('Error al crear usuario:', error);
        res.status(400).json({
            msg: 'Error al crear el usuario',
            error
        });
    }
});
exports.newUser = newUser;
// Controlador para el login de usuarios
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { username, password } = req.body;
    try {
        const user = yield user_1.default.findOne({
            where: { username }
        });
        if (!user) {
            return res.status(400).json({
                msg: `Usuario ${username} no encontrado`
            });
        }
        const userJson = user.toJSON();
        const passwordValid = yield bcrypt_1.default.compare(password, userJson.password);
        if (!passwordValid) {
            return res.status(400).json({
                msg: "Contraseña incorrecta"
            });
        }
        const token = jsonwebtoken_1.default.sign({
            id: userJson.id,
            username: userJson.username
        }, process.env.SECRET_KEY || 'hola123', {
            expiresIn: '24h'
        });
        res.json({
            msg: 'Login exitoso',
            token,
            user: {
                id: userJson.id,
                username: userJson.username,
                email: userJson.email
            }
        });
    }
    catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({
            msg: 'Error en el login',
            error
        });
    }
});
exports.login = login;
const getUsers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const users = yield user_1.default.findAll({
            attributes: ['id', 'username', 'email']
        });
        console.log('Usuarios encontrados:', users);
        res.json(users);
    }
    catch (error) {
        console.error('Error al obtener usuarios:', error);
        res.status(500).json({
            msg: 'Error al obtener usuarios',
            error
        });
    }
});
exports.getUsers = getUsers;
// Controlador para actualizar un usuario existente
const updateUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { username, email, password } = req.body;
        const user = yield user_1.default.findByPk(id);
        if (!user) {
            return res.status(404).json({
                msg: `Usuario con ID ${id} no encontrado`
            });
        }
        const updateData = {};
        if (username)
            updateData.username = username;
        if (email)
            updateData.email = email;
        if (password) {
            updateData.password = yield bcrypt_1.default.hash(password, 10);
        }
        yield user.update(updateData);
        const userJson = user.toJSON();
        res.status(200).json({
            msg: 'Usuario actualizado exitosamente',
            user: {
                id: userJson.id,
                username: userJson.username,
                email: userJson.email
            }
        });
    }
    catch (error) {
        console.error('Error al actualizar usuario:', error);
        res.status(500).json({
            msg: 'Error al actualizar el usuario',
            error
        });
    }
});
exports.updateUser = updateUser;
// Controlador para eliminar un usuario existente
const deleteUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params; // Obtener el ID del usuario desde los parámetros de la URL
        // Buscar el usuario por ID
        const user = yield user_1.default.findByPk(id);
        // Si el usuario no existe, devolver un error
        if (!user) {
            return res.status(404).json({
                msg: `Usuario con ID ${id} no encontrado`
            });
        }
        // Eliminar el usuario de la base de datos
        yield user.destroy();
        // Devolver la respuesta de éxito
        res.status(200).json({
            msg: 'Usuario eliminado exitosamente'
        });
    }
    catch (error) {
        console.error('Error al eliminar usuario:', error);
        res.status(500).json({
            msg: 'Error al eliminar el usuario',
            error
        });
    }
});
exports.deleteUser = deleteUser;

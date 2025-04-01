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
        console.log('Datos recibidos:', req.body);
        const { name, password, email } = req.body;
        // Validación de campos
        if (!name || !password || !email) {
            return res.status(400).json({
                msg: 'Todos los campos son requeridos',
                received: { name, email, hasPassword: !!password }
            });
        }
        // Hash de la contraseña
        const hashedPassword = yield bcrypt_1.default.hash(password, 10);
        console.log('Password hasheado correctamente');
        const user = yield user_1.default.create({
            name,
            email,
            password: hashedPassword, // Guardamos el hash, no la contraseña plain
            rol: 'usuario'
        });
        const userJson = user.toJSON();
        console.log('Usuario creado:', {
            id: userJson.id,
            email: userJson.email,
            name: userJson.name
        });
        return res.status(201).json({
            msg: 'Usuario creado exitosamente',
            user: {
                id: userJson.id,
                name: userJson.name,
                email: userJson.email
            }
        });
    }
    catch (error) { // Type annotation added here
        console.error('Error al crear usuario:', error);
        return res.status(400).json({
            msg: 'Error al crear el usuario',
            error: error.message
        });
    }
});
exports.newUser = newUser;
// Controlador para el login de usuarios
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // Log the entire request body
    console.log('==== Login Request ====');
    console.log('Request Body:', req.body);
    console.log('Headers:', req.headers);
    try {
        // Validar que se reciban los campos necesarios
        const { email, password } = req.body;
        console.log('Email received:', email);
        console.log('Password received:', password ? '********' : 'no password');
        if (!email || !password) {
            console.log('❌ Missing fields:', {
                hasEmail: !!email,
                hasPassword: !!password
            });
            return res.status(400).json({
                msg: 'Email y contraseña son requeridos',
                code: 'MISSING_FIELDS'
            });
        }
        // Buscar usuario por email
        console.log('🔍 Buscando usuario con email:', email);
        const user = yield user_1.default.findOne({
            where: { email }
        });
        // Verificar si el usuario existe
        if (!user) {
            console.log('❌ Usuario no encontrado:', email);
            return res.status(400).json({
                msg: 'Credenciales inválidas',
                code: 'INVALID_CREDENTIALS'
            });
        }
        console.log('✅ Usuario encontrado:', {
            id: user.get('id'),
            email: user.get('email')
        });
        // Convertir el modelo a un objeto plano
        const userJson = user.toJSON();
        // Comparar la contraseña
        const passwordValid = yield bcrypt_1.default.compare(password, userJson.password);
        console.log('🔑 Validación de contraseña:', passwordValid ? 'correcta' : 'incorrecta');
        if (!passwordValid) {
            console.log('❌ Contraseña inválida para usuario:', email);
            return res.status(400).json({
                msg: 'Credenciales inválidas',
                code: 'INVALID_CREDENTIALS'
            });
        }
        // Generar token JWT
        const token = jsonwebtoken_1.default.sign({
            id: userJson.id,
            email: userJson.email,
            name: userJson.name
        }, process.env.SECRET_KEY || 'default-secret-key', { expiresIn: '24h' });
        console.log('🔐 Token generado para usuario:', userJson.email);
        // Respuesta exitosa para el frontend
        return res.status(200).json({
            msg: 'Login exitoso',
            token: token,
            user: {
                id: userJson.id,
                name: userJson.name,
                email: userJson.email,
                rol: userJson.rol
            },
            expiresIn: 86400 // 24 horas en segundos
        });
    }
    catch (error) {
        console.error('🔥 Error en login:', error);
        return res.status(500).json({
            msg: 'Error interno del servidor',
            code: 'SERVER_ERROR',
            error: process.env.NODE_ENV === 'development' ? error : undefined
        });
    }
});
exports.login = login;
const getUsers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const users = yield user_1.default.findAll({
            attributes: ['id', 'name', 'email', 'rol']
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
        const { name, email, password } = req.body;
        const user = yield user_1.default.findByPk(id);
        if (!user) {
            return res.status(404).json({
                msg: `Usuario con ID ${id} no encontrado`
            });
        }
        const updateData = {};
        if (name)
            updateData.name = name;
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
                name: userJson.name,
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

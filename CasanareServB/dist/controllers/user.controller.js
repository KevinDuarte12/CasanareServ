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
exports.resetPassword = exports.forgotPassword = exports.deleteUser = exports.updateUser = exports.getUsers = exports.verifyEmail = exports.login = exports.newUser = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const crypto_1 = __importDefault(require("crypto"));
const nodemailer_1 = __importDefault(require("nodemailer"));
const sequelize_1 = require("sequelize");
const user_1 = __importDefault(require("../db/models/user"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// Configuración del transportador de email
const transporter = nodemailer_1.default.createTransport({
    service: 'Gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});
// Función auxiliar para enviar el email de verificación
function sendVerificationEmail(email, token) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
            yield transporter.sendMail({
                from: `"CasanareServ" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: 'Verifica tu cuenta',
                attachments: [{
                        filename: 'logo.png',
                        path: '../CasanareServF/public/img/logo.jpg',
                        cid: 'company-logo' // Este ID se usa en el HTML para referenciar la imagen
                    }],
                html: `
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #333;">Bienvenido a CasanareServ</h2>
                    <p>Gracias por registrarte. Para activar tu cuenta, haz clic en el siguiente enlace:</p>
                    <div style="text-align: center; margin: 25px 0;">
                        <a href="${verificationUrl}" 
                           style="background-color: #4CAF50; color: white; padding: 12px 25px; 
                                  text-decoration: none; border-radius: 4px;">
                            Verificar mi cuenta
                        </a>
                    </div>
                    <p style="color: #666; font-size: 0.9em;">
                        Este enlace expirará en 24 horas.
                        Si no realizaste esta solicitud, puedes ignorar este correo.
                    </p>
                </div>
            `
            });
            console.log(`✉️ Email de verificación enviado a ${email}`);
        }
        catch (error) {
            console.error('❌ Error al enviar email:', error);
            throw new Error('No se pudo enviar el email de verificación');
        }
    });
}
// Controlador para crear nuevos usuarios
const newUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('📝 Datos recibidos:', req.body);
        const { name, password, email } = req.body;
        if (!name || !password || !email) {
            return res.status(400).json({
                msg: 'Todos los campos son requeridos',
                received: { name, email, hasPassword: !!password }
            });
        }
        const existingUser = yield user_1.default.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({
                msg: 'El email ya está registrado',
                code: 'EMAIL_EXISTS'
            });
        }
        const hashedPassword = yield bcrypt_1.default.hash(password, 10);
        const verificationToken = crypto_1.default.randomBytes(20).toString('hex');
        const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const user = yield user_1.default.create({
            name,
            email,
            password: hashedPassword,
            rol: 'usuario',
            isVerified: false,
            verificationToken,
            verificationTokenExpires
        });
        yield sendVerificationEmail(email, verificationToken);
        const userJson = user.toJSON();
        console.log('✅ Usuario creado:', {
            id: userJson.id,
            email: userJson.email,
            name: userJson.name
        });
        return res.status(201).json({
            msg: 'Usuario creado exitosamente. Por favor verifica tu email.',
            user: {
                id: userJson.id,
                name: userJson.name,
                email: userJson.email
            }
        });
    }
    catch (error) {
        console.error('❌ Error al crear usuario:', error);
        return res.status(400).json({
            msg: 'Error al crear el usuario',
            error: error.message
        });
    }
});
exports.newUser = newUser;
// Controlador para el login
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log('🔑 Login Request:', req.body);
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({
                msg: 'Email y contraseña son requeridos',
                code: 'MISSING_FIELDS'
            });
        }
        const user = yield user_1.default.findOne({ where: { email } });
        if (!user) {
            return res.status(400).json({
                msg: 'Credenciales inválidas',
                code: 'INVALID_CREDENTIALS'
            });
        }
        const userJson = user.toJSON();
        if (!userJson.isVerified) {
            return res.status(400).json({
                msg: 'Por favor verifica tu cuenta primero',
                code: 'EMAIL_NOT_VERIFIED'
            });
        }
        const passwordValid = yield bcrypt_1.default.compare(password, userJson.password);
        if (!passwordValid) {
            return res.status(400).json({
                msg: 'Credenciales inválidas',
                code: 'INVALID_CREDENTIALS'
            });
        }
        const token = jsonwebtoken_1.default.sign({
            id: userJson.id,
            email: userJson.email,
            name: userJson.name,
            rol: userJson.rol
        }, process.env.SECRET_KEY || 'default-secret-key', { expiresIn: '24h' });
        console.log('✅ Login exitoso:', userJson.email);
        return res.status(200).json({
            msg: 'Login exitoso',
            token,
            user: {
                id: userJson.id,
                name: userJson.name,
                email: userJson.email,
                rol: userJson.rol
            },
            expiresIn: 86400
        });
    }
    catch (error) {
        console.error('❌ Error en login:', error);
        return res.status(500).json({
            msg: 'Error interno del servidor',
            code: 'SERVER_ERROR'
        });
    }
});
exports.login = login;
// Controlador para verificar email
const verifyEmail = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { token } = req.query;
        if (!token || typeof token !== 'string') {
            return res.status(400).json({
                msg: 'Token de verificación no proporcionado',
                code: 'MISSING_TOKEN'
            });
        }
        const user = yield user_1.default.findOne({
            where: {
                verificationToken: token,
                verificationTokenExpires: { [sequelize_1.Op.gt]: new Date() }
            }
        });
        if (!user) {
            return res.status(400).json({
                msg: 'Token inválido o expirado',
                code: 'INVALID_TOKEN'
            });
        }
        // Use undefined instead of null for Sequelize compatibility
        yield user_1.default.update({
            isVerified: true,
            verificationToken: undefined,
            verificationTokenExpires: undefined,
            estado: true
        }, {
            where: { id: user.getDataValue('id') }
        });
        console.log('✅ Email verificado:', user.get('email'));
        return res.status(200).json({
            msg: 'Email verificado exitosamente'
        });
    }
    catch (error) {
        console.error('❌ Error en verificación:', error);
        return res.status(500).json({
            msg: 'Error al verificar email',
            error: error.message
        });
    }
});
exports.verifyEmail = verifyEmail;
// Controlador para obtener usuarios
const getUsers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const users = yield user_1.default.findAll({
            attributes: ['id', 'name', 'email', 'rol', 'isVerified', 'estado']
        });
        return res.status(200).json(users);
    }
    catch (error) {
        console.error('❌ Error al obtener usuarios:', error);
        return res.status(500).json({
            msg: 'Error al obtener usuarios',
            error: error.message
        });
    }
});
exports.getUsers = getUsers;
// Controlador para actualizar usuario
const updateUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { name, email, password, rol } = req.body;
        const user = yield user_1.default.findByPk(id);
        if (!user) {
            return res.status(404).json({
                msg: 'Usuario no encontrado',
                code: 'USER_NOT_FOUND'
            });
        }
        const updates = {};
        if (name)
            updates.name = name;
        if (email)
            updates.email = email;
        if (password)
            updates.password = yield bcrypt_1.default.hash(password, 10);
        if (rol)
            updates.rol = rol;
        yield user.update(updates);
        console.log('✅ Usuario actualizado:', user.get('email'));
        return res.status(200).json({
            msg: 'Usuario actualizado exitosamente',
            user: {
                id: user.get('id'),
                name: user.get('name'),
                email: user.get('email'),
                rol: user.get('rol')
            }
        });
    }
    catch (error) {
        console.error('❌ Error al actualizar usuario:', error);
        return res.status(500).json({
            msg: 'Error al actualizar usuario',
            error: error.message
        });
    }
});
exports.updateUser = updateUser;
// Controlador para eliminar usuario
const deleteUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const user = yield user_1.default.findByPk(id);
        if (!user) {
            return res.status(404).json({
                msg: 'Usuario no encontrado',
                code: 'USER_NOT_FOUND'
            });
        }
        yield user.destroy();
        console.log('✅ Usuario eliminado:', user.get('email'));
        return res.status(200).json({
            msg: 'Usuario eliminado exitosamente'
        });
    }
    catch (error) {
        console.error('❌ Error al eliminar usuario:', error);
        return res.status(500).json({
            msg: 'Error al eliminar usuario',
            error: error.message
        });
    }
});
exports.deleteUser = deleteUser;
function sendPasswordResetEmail(email, token) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const resetUrl = `${process.env.FRONTEND_URL}/resetpassword?token=${token}`;
            yield transporter.sendMail({
                from: `"CasanareServ" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: 'Restablecer tu contraseña',
                attachments: [{
                        filename: 'logo.png',
                        path: '../CasanareServF/public/img/logo.jpg',
                        cid: 'company-logo' // Este ID se usa en el HTML para referenciar la imagen
                    }],
                html: `
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #333;">Restablecer Contraseña</h2>
                    <p>Has solicitado restablecer tu contraseña. Haz clic en el siguiente enlace:</p>
                    <div style="text-align: center; margin: 25px 0;">
                        <a href="${resetUrl}" 
                           style="background-color: #4CAF50; color: white; padding: 12px 25px; 
                                  text-decoration: none; border-radius: 4px;">
                            Restablecer Contraseña
                        </a>
                    </div>
                    <p style="color: #666; font-size: 0.9em;">
                        Este enlace expirará en 1 hora.
                        Si no realizaste esta solicitud, ignora este correo.
                    </p>
                </div>
            `
            });
            console.log(`✉️ Email de restablecimiento enviado a ${email}`);
        }
        catch (error) {
            console.error('❌ Error al enviar email de restablecimiento:', error);
            throw new Error('No se pudo enviar el email de restablecimiento');
        }
    });
}
// Controlador para solicitar restablecimiento de contraseña
const forgotPassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email } = req.body;
        // Validación básica
        if (!email) {
            return res.status(400).json({
                msg: 'El email es requerido',
                code: 'MISSING_EMAIL'
            });
        }
        // Buscar usuario verificado
        const user = yield user_1.default.findOne({
            where: {
                email,
                isVerified: true,
                estado: true
            }
        });
        if (!user) {
            return res.status(404).json({
                msg: 'No existe una cuenta verificada con este email',
                code: 'EMAIL_NOT_FOUND'
            });
        }
        // Generar token y establecer expiración
        const resetToken = crypto_1.default.randomBytes(32).toString('hex');
        const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hora
        // Actualizar usuario con el token
        yield user.update({
            passwordResetToken: resetToken,
            passwordResetExpires: resetTokenExpires
        });
        // Enviar email
        yield sendPasswordResetEmail(email, resetToken);
        return res.status(200).json({
            msg: 'Se ha enviado un email con las instrucciones'
        });
    }
    catch (error) {
        console.error('❌ Error al solicitar restablecimiento:', error);
        return res.status(500).json({
            msg: 'Error al procesar la solicitud',
            error: error.message
        });
    }
});
exports.forgotPassword = forgotPassword;
// Controlador para restablecer la contraseña
const resetPassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { token, newPassword } = req.body;
        // Validaciones
        if (!token || !newPassword) {
            return res.status(400).json({
                msg: 'Token y nueva contraseña son requeridos',
                code: 'MISSING_FIELDS'
            });
        }
        // Buscar usuario con token válido
        const user = yield user_1.default.findOne({
            where: {
                passwordResetToken: token,
                passwordResetExpires: { [sequelize_1.Op.gt]: new Date() },
                estado: true
            }
        });
        if (!user) {
            return res.status(400).json({
                msg: 'Token inválido o expirado',
                code: 'INVALID_TOKEN'
            });
        }
        // Encriptar nueva contraseña
        const hashedPassword = yield bcrypt_1.default.hash(newPassword, 10);
        // Actualizar usuario
        yield user.update({
            password: hashedPassword,
            passwordResetToken: undefined,
            passwordResetExpires: undefined
        });
        console.log('✅ Contraseña restablecida:', user.get('email'));
        return res.status(200).json({
            msg: 'Contraseña actualizada exitosamente'
        });
    }
    catch (error) {
        console.error('❌ Error al restablecer contraseña:', error);
        return res.status(500).json({
            msg: 'Error al restablecer la contraseña',
            error: error.message
        });
    }
});
exports.resetPassword = resetPassword;

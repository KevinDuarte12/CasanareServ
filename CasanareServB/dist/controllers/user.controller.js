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
exports.updateUserProfile = exports.uploadProfileImage = exports.getUserProfile = exports.resetPassword = exports.forgotPassword = exports.deleteUser = exports.updateUser = exports.getUserById = exports.getUsers = exports.verifyEmail = exports.login = exports.newUser = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const crypto_1 = __importDefault(require("crypto"));
// ❌ ELIMINAR ESTA LÍNEA:
// import sgMail from '@sendgrid/mail';
const sequelize_1 = require("sequelize");
const user_1 = __importDefault(require("../db/models/user"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const cloudinary_1 = require("cloudinary");
const image_1 = __importDefault(require("../db/models/image"));
const conection_1 = __importDefault(require("../db/conection"));
// Configuración de Cloudinary
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
    api_key: process.env.CLOUDINARY_API_KEY || '',
    api_secret: process.env.CLOUDINARY_API_SECRET || ''
});
// ✅ MANTENER SOLO ESTA DECLARACIÓN:
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');
// ✅ Resto de las funciones sin cambios...
function sendVerificationEmail(email, token) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log('🚀 Iniciando envío de email a:', email);
            console.log('🔑 API Key configurada:', process.env.SENDGRID_API_KEY ? 'Sí' : 'No');
            console.log('📧 Email FROM:', process.env.EMAIL_FROM);
            const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
            const msg = {
                to: email,
                from: process.env.EMAIL_FROM || 'tu-email-verificado@gmail.com',
                subject: 'Verifica tu cuenta en CasanareServ',
                text: `Gracias por registrarte en CasanareServ. Para activar tu cuenta, visita: ${verificationUrl}`,
                html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <title>Verifica tu cuenta</title>
                </head>
                <body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4;">
                    <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px;">
                        <h2 style="color: #333; text-align: center;">¡Bienvenido a CasanareServ!</h2>
                        <p>Gracias por registrarte. Para activar tu cuenta, haz clic en el siguiente botón:</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${verificationUrl}" 
                               style="background-color: #4CAF50; color: white; padding: 15px 30px; 
                                      text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                                Verificar mi cuenta
                            </a>
                        </div>
                        <p>Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
                        <p style="background-color: #f5f5f5; padding: 10px; word-break: break-all; border-radius: 4px;">
                            ${verificationUrl}
                        </p>
                        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                        <p style="color: #666; font-size: 14px; text-align: center;">
                            Este enlace expirará en 24 horas.<br>
                            Si no solicitaste esta verificación, puedes ignorar este correo.
                        </p>
                        <p style="color: #999; font-size: 12px; text-align: center;">
                            © ${new Date().getFullYear()} CasanareServ - Todos los derechos reservados
                        </p>
                    </div>
                </body>
                </html>
            `
            };
            console.log('📤 Enviando mensaje:', {
                to: msg.to,
                from: msg.from,
                subject: msg.subject
            });
            return sgMail
                .send(msg)
                .then((response) => {
                console.log('✅ Email enviado exitosamente');
                console.log('📊 Status Code:', response[0].statusCode);
                console.log('📋 Headers:', response[0].headers);
                return true;
            })
                .catch((error) => {
                console.error('❌ Error al enviar email:');
                console.error('📋 Error completo:', error);
                if (error.response) {
                    console.error('📊 Status Code:', error.response.statusCode);
                    console.error('📝 Response Body:', error.response.body);
                    if (error.response.body.errors) {
                        error.response.body.errors.forEach((err) => {
                            console.error(`🚨 SendGrid Error: ${err.message}`);
                        });
                    }
                }
                return false;
            });
        }
        catch (error) {
            console.error('❌ Error general al preparar el email:', error);
            return false;
        }
    });
}
function sendPasswordResetEmail(email, token) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log('🚀 Enviando email de reset a:', email);
            const resetUrl = `${process.env.FRONTEND_URL}/resetpassword?token=${token}`;
            const msg = {
                to: email,
                from: process.env.EMAIL_FROM || 'tu-email-verificado@gmail.com',
                subject: 'Restablece tu contraseña - CasanareServ',
                text: `Has solicitado restablecer tu contraseña en CasanareServ. Visita: ${resetUrl}`,
                html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <title>Restablece tu contraseña</title>
                </head>
                <body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4;">
                    <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px;">
                        <h2 style="color: #333; text-align: center;">Restablece tu contraseña</h2>
                        <p>Has solicitado restablecer tu contraseña. Haz clic en el siguiente botón:</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${resetUrl}" 
                               style="background-color: #f39c12; color: white; padding: 15px 30px; 
                                      text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                                Restablecer Contraseña
                            </a>
                        </div>
                        <p>Si el botón no funciona, copia y pega este enlace:</p>
                        <p style="background-color: #f5f5f5; padding: 10px; word-break: break-all; border-radius: 4px;">
                            ${resetUrl}
                        </p>
                        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                        <p style="color: #666; font-size: 14px; text-align: center;">
                            Este enlace expirará en 1 hora.<br>
                            Si no realizaste esta solicitud, ignora este correo.
                        </p>
                    </div>
                </body>
                </html>
            `
            };
            return sgMail
                .send(msg)
                .then((response) => {
                console.log('✅ Email de reset enviado');
                console.log('📊 Status:', response[0].statusCode);
                return true;
            })
                .catch((error) => {
                console.error('❌ Error enviando reset email:', error);
                if (error.response) {
                    console.error('Status:', error.response.statusCode);
                    console.error('Body:', error.response.body);
                }
                return false;
            });
        }
        catch (error) {
            console.error('❌ Error general en reset email:', error);
            return false;
        }
    });
}
// Controlador para crear nuevos usuarios
const newUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('📝 Datos recibidos:', req.body);
        const { name, password, email, document_type, document_number, department, city, phone } = req.body;
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
        // Modificar para incluir todos los campos
        const user = yield user_1.default.create({
            name,
            email,
            password: hashedPassword,
            rol: 'usuario',
            isVerified: false,
            verificationToken,
            verificationTokenExpires,
            // Añadir estos campos:
            document_type: document_type || null,
            document_number: document_number || null,
            department: department || null,
            city: city || null,
            phone: phone || null
        });
        yield sendVerificationEmail(email, verificationToken);
        const userJson = user.toJSON();
        console.log('✅ Usuario creado:', {
            id: userJson.id,
            email: userJson.email,
            name: userJson.name,
            // También podrías agregar logs para los campos adicionales
            document_type: userJson.document_type,
            city: userJson.city
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
    try {
        const { email, password } = req.body;
        // Validación básica
        if (!email || !password) {
            return res.status(400).json({
                msg: 'Se requieren email y password',
                code: 'MISSING_CREDENTIALS'
            });
        }
        // Verificar si existe el usuario
        const user = yield user_1.default.findOne({
            where: {
                email,
                estado: true // ¡Usar 'estado' en lugar de 'status'!
            }
        });
        if (!user) {
            return res.status(400).json({
                msg: 'Usuario o contraseña incorrectos',
                code: 'INVALID_CREDENTIALS'
            });
        }
        // Verificar que el usuario esté verificado
        if (user.get('isVerified') === false) {
            return res.status(401).json({
                msg: 'Usuario no verificado',
                code: 'UNVERIFIED_USER'
            });
        }
        // Verificar contraseña
        const validPassword = yield bcrypt_1.default.compare(password, user.get('password'));
        if (!validPassword) {
            return res.status(400).json({
                msg: 'Usuario o contraseña incorrectos',
                code: 'INVALID_CREDENTIALS'
            });
        }
        // Generar token JWT
        const token = jsonwebtoken_1.default.sign({
            id: user.get('id'),
            email: user.get('email'),
            name: user.get('name'),
            rol: user.get('rol')
        }, process.env.SECRET_KEY || "hola123", { expiresIn: '24h' });
        // Preparar datos del usuario para retornar (sin información sensible)
        const userForResponse = {
            id: user.get('id'),
            name: user.get('name'),
            email: user.get('email'),
            rol: user.get('rol')
        };
        console.log('✅ Login exitoso:', user.get('email'));
        // Respuesta exitosa
        return res.status(200).json({
            msg: 'Login exitoso',
            token,
            user: userForResponse,
            expiresIn: 86400 // 24 horas en segundos
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
// Controlador para verificar email (función existente)
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
                verificationTokenExpires: { [sequelize_1.Op.gt]: new Date() },
                isVerified: false // Asegurarse de que solo funcione para usuarios no verificados
            }
        });
        if (!user) {
            return res.status(400).json({
                msg: 'Token inválido o expirado, o la cuenta ya está verificada',
                code: 'INVALID_TOKEN'
            });
        }
        // Update con campos reseteados usando undefined en lugar de null
        yield user_1.default.update({
            isVerified: true,
            verificationToken: undefined,
            verificationTokenExpires: undefined,
            estado: true // Activar la cuenta
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
const getUserById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        // Buscar usuario con sus imágenes asociadas usando el alias correcto
        const user = yield user_1.default.findOne({
            where: { id },
            attributes: [
                'id', 'name', 'email', 'rol', 'isVerified', 'estado',
                // Añadir estos campos adicionales
                'document_type', 'document_number', 'department', 'city', 'phone'
            ],
            include: [{
                    model: image_1.default,
                    as: 'userImages',
                    required: false,
                    attributes: ['id', 'url', 'is_main']
                }]
        });
        if (!user) {
            return res.status(404).json({
                msg: 'Usuario no encontrado',
                code: 'USER_NOT_FOUND'
            });
        }
        return res.status(200).json(user);
    }
    catch (error) {
        console.error('❌ Error al obtener usuario por ID:', error);
        return res.status(500).json({
            msg: 'Error al obtener el usuario',
            error: error.message
        });
    }
});
exports.getUserById = getUserById;
// Controlador para actualizar usuario
const updateUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { name, email, password, rol, image_url } = req.body;
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
        if (rol)
            updates.rol = rol;
        // Hashear la contraseña si se proporciona una nueva
        if (password) {
            updates.password = yield bcrypt_1.default.hash(password, 10);
        }
        // Actualizar el usuario
        yield user.update(updates);
        // Si se proporciona una URL de imagen, actualizarla en el sistema de imágenes
        if (image_url) {
            // Verificar si ya existe una imagen principal para este usuario
            const mainImage = yield image_1.default.findOne({
                where: {
                    entity_type: 'user',
                    entity_id: parseInt(id),
                    is_main: true
                }
            });
            if (mainImage) {
                // Actualizar la imagen existente
                yield mainImage.update({ url: image_url });
            }
            else {
                // Crear una nueva imagen principal
                yield image_1.default.create({
                    url: image_url,
                    entity_type: 'user',
                    entity_id: parseInt(id),
                    is_main: true
                });
            }
        }
        // Obtener el usuario actualizado con sus imágenes
        const updatedUser = yield user_1.default.findOne({
            where: { id },
            attributes: ['id', 'name', 'email', 'rol', 'isVerified', 'estado'],
            include: [{
                    model: image_1.default,
                    as: 'userImages', // ¡Cambiado a 'userImages'!
                    required: false,
                    attributes: ['id', 'url', 'is_main']
                }]
        });
        console.log('✅ Usuario actualizado:', user.get('email'));
        return res.status(200).json({
            msg: 'Usuario actualizado exitosamente',
            user: updatedUser
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
// Controlador para eliminar usuario (actualizado)
// Modificación de la función deleteUser:
const deleteUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const isHardDelete = req.query.hard === 'true';
        console.log(`🔄 Iniciando ${isHardDelete ? 'eliminación permanente' : 'desactivación'} del usuario ${id}`);
        // Iniciar una transacción para asegurar consistencia
        const transaction = yield conection_1.default.transaction();
        try {
            // Buscar usuario
            const user = yield user_1.default.findByPk(id);
            if (!user) {
                yield transaction.rollback();
                return res.status(404).json({
                    msg: 'Usuario no encontrado',
                    code: 'USER_NOT_FOUND'
                });
            }
            if (isHardDelete) {
                console.log(`🗑️ Iniciando eliminación PERMANENTE del usuario ${id}`);
                // 1. Eliminar notificaciones del usuario primero
                yield handleUserNotifications(id, transaction);
                // 2. Eliminar carrito de compras
                yield handleUserCart(id, transaction);
                // 3. Obtener y eliminar imágenes del usuario
                yield handleUserImages(id, transaction);
                // 4. Manejar direcciones del usuario
                yield handleUserAddresses(id, transaction);
                // 5. Eliminar trueques donde el usuario es solicitante
                yield handleUserBarters(id, transaction);
                // 6. Obtener productos del usuario
                const products = yield getProductsByUserId(id);
                // 7. Para cada producto, eliminar sus relaciones e imágenes
                console.log(`🔄 Procesando ${products.length} productos del usuario ${id}`);
                for (const product of products) {
                    try {
                        const productId = product.get('id');
                        console.log(`🗑️ Eliminando producto ID: ${productId}`);
                        // Eliminar imágenes del producto
                        yield handleProductImages(productId, transaction);
                        // Eliminar trueques relacionados con el producto
                        yield handleProductBarters(productId, transaction);
                        // Eliminar items del carrito que contienen este producto
                        yield handleProductCarts(productId, transaction);
                        // Eliminar comentarios/reviews del producto
                        yield handleProductReviews(productId, transaction);
                        // !!! IMPORTANTE: Eliminar el producto mismo !!!
                        yield product.destroy({ transaction });
                        console.log(`✅ Producto ${productId} eliminado correctamente`);
                    }
                    catch (productError) {
                        console.error(`❌ Error al eliminar el producto:`, productError);
                        throw productError;
                    }
                }
                // 8. Eliminar físicamente al usuario
                yield user.destroy({ transaction });
                console.log(`✅ Usuario ${id} eliminado permanentemente`);
                var responseMsg = 'Usuario y todos sus datos relacionados eliminados permanentemente';
            }
            else {
                // Eliminación lógica (soft delete)
                yield user.update({ estado: false }, { transaction });
                console.log(`✅ Usuario ${id} desactivado (soft delete)`);
                var responseMsg = 'Usuario desactivado correctamente';
            }
            // Confirmar transacción
            yield transaction.commit();
            return res.status(200).json({
                msg: responseMsg
            });
        }
        catch (error) {
            // Revertir transacción en caso de error
            yield transaction.rollback();
            throw error;
        }
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
// Función auxiliar para manejar las imágenes del usuario
function handleUserImages(userId, transaction) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Obtener las imágenes asociadas al usuario
            const images = yield image_1.default.findAll({
                where: {
                    entity_type: 'user',
                    entity_id: parseInt(userId.toString())
                }
            });
            console.log(`Procesando ${images.length} imágenes del usuario ${userId}`);
            // Eliminar imágenes de Cloudinary
            for (const image of images) {
                const publicId = image.get('public_id');
                if (publicId) {
                    try {
                        yield cloudinary_1.v2.uploader.destroy(publicId);
                        console.log(`Imagen eliminada de Cloudinary: ${publicId}`);
                    }
                    catch (cloudinaryError) {
                        console.error('Error al eliminar imagen de Cloudinary:', cloudinaryError);
                        // Continuamos aunque falle la eliminación en Cloudinary
                    }
                }
            }
            // Eliminar registros de imágenes
            if (images.length > 0) {
                const deleted = yield image_1.default.destroy({
                    where: {
                        entity_type: 'user',
                        entity_id: parseInt(userId.toString())
                    },
                    transaction
                });
                console.log(`${deleted} imágenes de usuario eliminadas`);
            }
        }
        catch (error) {
            console.error('Error al eliminar imágenes del usuario:', error);
            throw error;
        }
    });
}
// Función auxiliar para obtener productos por user_id
function getProductsByUserId(userId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Importa directamente el modelo Product en lugar de usar sequelize.model
            const Product = require('../db/models/product').default; // Ajusta la ruta según tu estructura
            // Si el modelo no existe, devuelve un array vacío
            if (!Product) {
                console.warn('El modelo Product no está definido');
                return [];
            }
            return yield Product.findAll({
                where: {
                    id_user: parseInt(userId.toString())
                }
            });
        }
        catch (error) {
            console.error('Error al obtener productos del usuario:', error);
            // Devolver array vacío para evitar que el proceso se interrumpa
            return [];
        }
    });
}
// Función auxiliar para manejar las imágenes de un producto
// Función auxiliar para manejar las imágenes de un producto
function handleProductImages(productId, transaction) {
    return __awaiter(this, void 0, void 0, function* () {
        // Validar que productId no sea undefined o null
        if (productId === undefined || productId === null) {
            console.warn('ID de producto indefinido o null en handleProductImages');
            return; // Salir temprano de la función
        }
        try {
            // Convertir productId a número de forma segura
            const numericProductId = parseInt(String(productId));
            // Verificar que sea un número válido
            if (isNaN(numericProductId)) {
                console.warn(`ID de producto inválido en handleProductImages: ${productId}`);
                return;
            }
            // Obtener las imágenes asociadas al producto
            const images = yield image_1.default.findAll({
                where: {
                    entity_type: 'product',
                    entity_id: numericProductId
                }
            });
            console.log(`Procesando ${images.length} imágenes del producto ${numericProductId}`);
            // Eliminar imágenes de Cloudinary
            for (const image of images) {
                const publicId = image.get('public_id');
                if (publicId) {
                    try {
                        yield cloudinary_1.v2.uploader.destroy(publicId);
                        console.log(`Imagen de producto eliminada de Cloudinary: ${publicId}`);
                    }
                    catch (cloudinaryError) {
                        console.error('Error al eliminar imagen de producto de Cloudinary:', cloudinaryError);
                    }
                }
            }
            // Eliminar registros de imágenes
            if (images.length > 0) {
                yield image_1.default.destroy({
                    where: {
                        entity_type: 'product',
                        entity_id: numericProductId
                    },
                    transaction
                });
                console.log(`${images.length} imágenes de producto eliminadas`);
            }
        }
        catch (error) {
            console.error(`Error al procesar imágenes del producto ${productId}:`, error);
            // Opcional: aquí puedes decidir si propagar el error o manejarlo silenciosamente
            throw error; // Si quieres que interrumpa la transacción
        }
    });
}
// Función auxiliar para manejar los trueques relacionados con un producto
function handleProductBarters(productId, transaction) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Importar directamente el modelo
            const Barter = require('../db/models/barter').default; // Ajusta la ruta
            // Si el modelo no existe, salir sin error
            if (!Barter) {
                console.warn('El modelo Barter no está definido');
                return;
            }
            // Eliminar trueques donde este producto está involucrado
            yield Barter.destroy({
                where: {
                    [sequelize_1.Op.or]: [
                        { id_product_offered: parseInt(productId.toString()) },
                        { id_product_requested: parseInt(productId.toString()) }
                    ]
                },
                transaction
            });
            console.log(`Trueques relacionados con el producto ${productId} eliminados`);
        }
        catch (error) {
            console.error('Error al eliminar trueques del producto:', error);
            // No interrumpir el proceso
        }
    });
}
// Función auxiliar para manejar los carritos que contienen un producto
function handleProductCarts(productId, transaction) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Importar directamente los modelos
            const CartItem = require('../db/models/cartItem').default;
            // Si el modelo no existe, salir sin error
            if (!CartItem) {
                console.warn('El modelo CartItem no está definido');
                return;
            }
            yield CartItem.destroy({
                where: {
                    id_product: parseInt(productId.toString())
                },
                transaction
            });
            console.log(`Items de carrito con el producto ${productId} eliminados`);
        }
        catch (error) {
            console.error('Error al eliminar items de carrito del producto:', error);
            // No interrumpir el proceso
        }
    });
}
// Función auxiliar para manejar comentarios y valoraciones de un producto
function handleProductReviews(productId, transaction) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Importar directamente el modelo
            const Review = require('../db/models/review').default;
            // Si el modelo no existe, salir sin error
            if (!Review) {
                console.warn('El modelo Review no está definido');
                return;
            }
            yield Review.destroy({
                where: {
                    id_product: parseInt(productId.toString())
                },
                transaction
            });
            console.log(`Reseñas del producto ${productId} eliminadas`);
        }
        catch (error) {
            console.error('Error al eliminar reseñas del producto:', error);
            // No interrumpir el proceso
        }
    });
}
// Función auxiliar para manejar los trueques solicitados por un usuario
function handleUserBarters(userId, transaction) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Importar directamente el modelo
            const Barter = require('../db/models/barter').default;
            // Si el modelo no existe, salir sin error
            if (!Barter) {
                console.warn('El modelo Barter no está definido');
                return;
            }
            // Eliminar trueques donde este usuario es el solicitante
            yield Barter.destroy({
                where: {
                    id_user_requester: parseInt(userId.toString())
                },
                transaction
            });
            console.log(`Trueques solicitados por el usuario ${userId} eliminados`);
        }
        catch (error) {
            console.error('Error al eliminar trueques del usuario:', error);
            // No interrumpir el proceso
        }
    });
}
// Función auxiliar para manejar el carrito de compras del usuario
function handleUserCart(userId, transaction) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Importar directamente los modelos
            const Cart = require('../db/models/cart').default;
            const CartItem = require('../db/models/itemcart').default;
            // Si los modelos no existen, salir sin error
            if (!Cart || !CartItem) {
                console.warn('Los modelos Cart o CartItem no están definidos');
                return;
            }
            // Primero obtener el carrito del usuario
            const cart = yield Cart.findOne({
                where: {
                    id_user: parseInt(userId.toString())
                }
            });
            if (cart) {
                const cartId = cart.get('id_cart');
                console.log(`Encontrado carrito ID: ${cartId} para usuario ${userId}`);
                // Eliminar los items del carrito primero (registros hijos)
                const deletedItems = yield CartItem.destroy({
                    where: {
                        id_cart: cartId
                    },
                    transaction
                });
                console.log(`${deletedItems} items de carrito eliminados para usuario ${userId}`);
                // Ahora eliminar el carrito (registro padre)
                const deleted = yield Cart.destroy({
                    where: { id_cart: cartId },
                    transaction
                });
                console.log(`Carrito del usuario ${userId} eliminado: ${deleted > 0 ? 'Sí' : 'No'}`);
            }
            else {
                console.log(`No se encontró carrito para el usuario ${userId}`);
            }
        }
        catch (error) {
            console.error('Error al eliminar carrito del usuario:', error);
            // Propagar el error para poder manejar la transacción correctamente
            throw error;
        }
    });
}
// Función auxiliar para manejar las direcciones del usuario
function handleUserAddresses(userId, transaction) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Verificar si existe el módulo sin interrumpir el flujo
            let Address;
            try {
                Address = require('../db/models/address').default;
            }
            catch (importError) {
                console.log(`ℹ️ No se encontró el modelo Address en tu proyecto, continuando sin error...`);
                return; // Salir de la función sin error
            }
            // Si llegamos aquí, el modelo existe y podemos continuar
            if (!Address) {
                console.warn('El modelo Address no está definido');
                return;
            }
            const deleted = yield Address.destroy({
                where: {
                    id_user: parseInt(userId.toString())
                },
                transaction
            });
            console.log(`${deleted} direcciones del usuario ${userId} eliminadas`);
        }
        catch (error) {
            console.error('Error al eliminar direcciones del usuario:', error);
            // No propagar el error para evitar interrumpir el proceso
            console.log('Continuando con la eliminación del usuario a pesar del error con direcciones...');
        }
    });
}
// Reemplazar la función de resetPassword también
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
        // Opción 1: Usar el ID con tipo explícito
        const userId = Number(user.get('id'));
        // Actualizar usuario usando el método update directo de Sequelize
        yield user_1.default.update({
            password: hashedPassword,
            passwordResetToken: '', // Usar string vacío en lugar de null
            passwordResetExpires: new Date(0) // Usar una fecha pasada en lugar de null
        }, {
            where: { id: userId } // Usar el ID con tipo numérico explícito
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
// Actualización del método getUserProfile para incluir los nuevos campos
const getUserProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        console.log(`🔍 Obteniendo perfil para usuario ID: ${userId}`);
        if (!userId) {
            return res.status(401).json({
                msg: 'No autorizado',
                code: 'UNAUTHORIZED'
            });
        }
        // Modificar esta consulta para incluir los campos adicionales
        const user = yield user_1.default.findOne({
            where: {
                id: userId,
                estado: true
            },
            attributes: [
                'id', 'name', 'email', 'rol', 'isVerified', 'estado',
                'document_type', 'document_number', 'department', 'city', 'phone' // Asegúrate de que estos campos estén definidos en el modelo
            ],
            include: [{
                    model: image_1.default,
                    as: 'userImages',
                    required: false,
                    attributes: ['id', 'url', 'is_main']
                }]
        });
        if (!user) {
            return res.status(404).json({
                msg: 'Usuario no encontrado',
                code: 'USER_NOT_FOUND'
            });
        }
        // Encontrar la imagen principal
        let profileImage = null;
        const images = user.get('userImages');
        if (images && images.length > 0) {
            const mainImage = images.find(img => img.is_main);
            profileImage = mainImage ? mainImage.url : images[0].url;
        }
        console.log(`✅ Perfil obtenido para ${user.get('email')}`);
        return res.status(200).json({
            id: user.get('id'),
            name: user.get('name'),
            email: user.get('email'),
            rol: user.get('rol'),
            isVerified: user.get('isVerified'),
            estado: user.get('estado'),
            // Añadir estos campos que faltan:
            document_type: user.get('document_type'),
            document_number: user.get('document_number'),
            department: user.get('department'),
            city: user.get('city'),
            phone: user.get('phone'),
            profileImage,
            userImages: images
        });
    }
    catch (error) {
        console.error('❌ Error al obtener perfil de usuario:', error);
        return res.status(500).json({
            msg: 'Error interno del servidor',
            error: error.message
        });
    }
});
exports.getUserProfile = getUserProfile;
// Nuevo controlador para subir imagen de perfil
const uploadProfileImage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = parseInt(req.params.id);
        const imageUrl = req.body.image_url; // URL de imagen procesada por el controlador de imágenes
        if (!imageUrl) {
            return res.status(400).json({
                msg: 'URL de imagen requerida',
                code: 'MISSING_IMAGE_URL'
            });
        }
        // Verificar si el usuario existe
        const user = yield user_1.default.findByPk(userId);
        if (!user) {
            return res.status(404).json({
                msg: 'Usuario no encontrado',
                code: 'USER_NOT_FOUND'
            });
        }
        // Verificar si ya existe una imagen principal
        const existingMainImage = yield image_1.default.findOne({
            where: {
                entity_type: 'user',
                entity_id: userId,
                is_main: true
            }
        });
        if (existingMainImage) {
            // Actualizar imagen existente
            yield existingMainImage.update({
                url: imageUrl
            });
            console.log(`✅ Imagen de perfil actualizada para usuario ${userId}`);
            return res.status(200).json({
                msg: 'Imagen de perfil actualizada exitosamente',
                image: existingMainImage
            });
        }
        else {
            // Crear nueva imagen
            const newImage = yield image_1.default.create({
                url: imageUrl,
                entity_type: 'user',
                entity_id: userId,
                is_main: true
            });
            console.log(`✅ Imagen de perfil creada para usuario ${userId}`);
            return res.status(201).json({
                msg: 'Imagen de perfil creada exitosamente',
                image: newImage
            });
        }
    }
    catch (error) {
        console.error('❌ Error al subir imagen de perfil:', error);
        return res.status(500).json({
            msg: 'Error al subir imagen de perfil',
            error: error.message
        });
    }
});
exports.uploadProfileImage = uploadProfileImage;
// Contador de intentos fallidos por usuario
const failedAttempts = {};
// Máximo de intentos permitidos
const MAX_ATTEMPTS = 3;
const updateUserProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Obtener el ID del usuario directamente del token
        const userId = req.user.id;
        if (!userId) {
            res.status(401).json({
                msg: 'Usuario no autenticado'
            });
            return;
        }
        console.log(`📝 Actualizando perfil para usuario ID: ${userId}`);
        // Si se proporciona contraseña, verificarla
        if (req.body.password) {
            const user = yield user_1.default.findByPk(userId);
            if (!user) {
                res.status(404).json({ msg: 'Usuario no encontrado' });
                return;
            }
            // Verificar contraseña
            const validPassword = yield bcrypt_1.default.compare(req.body.password, user.getDataValue('password'));
            if (!validPassword) {
                // Incrementar contador de intentos fallidos
                failedAttempts[userId] = (failedAttempts[userId] || 0) + 1;
                // Si alcanza el máximo de intentos, señalar que debe cerrarse la sesión
                if (failedAttempts[userId] >= MAX_ATTEMPTS) {
                    delete failedAttempts[userId]; // Resetear contador
                    res.status(401).json({
                        msg: 'Contraseña incorrecta. Demasiados intentos fallidos.',
                        forceLogout: true
                    });
                    return;
                }
                res.status(401).json({
                    msg: `Contraseña incorrecta. Intentos restantes: ${MAX_ATTEMPTS - failedAttempts[userId]}`,
                    attemptsLeft: MAX_ATTEMPTS - failedAttempts[userId]
                });
                return;
            }
            // Resetear contador si la contraseña es correcta
            delete failedAttempts[userId];
        }
        // Continuar con la actualización del perfil
        const { name, phone, department, city, document_type, document_number } = req.body;
        const updateData = {};
        // Agregar solo los campos que se enviaron en la solicitud
        if (name !== undefined)
            updateData.name = name;
        if (phone !== undefined)
            updateData.phone = phone;
        if (department !== undefined)
            updateData.department = department;
        if (city !== undefined)
            updateData.city = city;
        if (document_type !== undefined)
            updateData.document_type = document_type;
        if (document_number !== undefined)
            updateData.document_number = document_number;
        // Buscar el usuario para actualizarlo
        const user = yield user_1.default.findByPk(userId);
        if (!user) {
            res.status(404).json({ msg: 'Usuario no encontrado' });
            return;
        }
        // Actualizar el usuario
        yield user.update(updateData);
        // Obtener el usuario actualizado con sus imágenes
        const updatedUser = yield user_1.default.findOne({
            where: { id: userId },
            attributes: ['id', 'name', 'email', 'rol', 'phone', 'department', 'city',
                'document_type', 'document_number'],
            include: [{
                    model: image_1.default,
                    as: 'userImages',
                    required: false,
                    attributes: ['id', 'url', 'is_main']
                }]
        });
        console.log(`✅ Perfil actualizado para usuario ${userId}`);
        res.status(200).json({
            msg: 'Perfil actualizado correctamente',
            user: updatedUser
        });
    }
    catch (error) {
        console.error('❌ Error al actualizar perfil:', error);
        res.status(500).json({
            msg: 'Error al actualizar el perfil',
            error: error.message
        });
    }
});
exports.updateUserProfile = updateUserProfile;
// Función auxiliar para manejar las notificaciones del usuario
function handleUserNotifications(userId, transaction) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Importar directamente el modelo
            const Notification = require('../db/models/notifications').default;
            // Si el modelo no existe, salir sin error
            if (!Notification) {
                console.warn('El modelo Notification no está definido');
                return;
            }
            // Eliminar todas las notificaciones del usuario
            const deleted = yield Notification.destroy({
                where: {
                    id_user: parseInt(userId.toString())
                },
                transaction
            });
            console.log(`✅ ${deleted} notificaciones del usuario ${userId} eliminadas`);
        }
        catch (error) {
            console.error('❌ Error al eliminar notificaciones del usuario:', error);
            throw error; // Propagar el error para el manejo de la transacción
        }
    });
}

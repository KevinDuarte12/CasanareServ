// Importamos los tipos necesarios de express para el tipado TypeScript
import { Response, Request } from "express";

// Importamos bcrypt para el manejo seguro de contraseñas (hash y comparación)
import bcrypt from "bcrypt";
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { Op } from "sequelize";

// Importamos nuestro modelo de Usuario para interactuar con la base de datos
import User from "../db/models/user";

// Importamos jwt para generar tokens de autenticación
import jwt from "jsonwebtoken";
import { Model } from "sequelize";
export interface UserAttributes {
    id?: number;
    name: string;
    password: string;
    email: string;
    rol?: 'usuario' | 'admin' | 'vendedor';
    estado?: boolean;
    isVerified?: boolean;
    verificationToken?: string | null;  // Permitimos null
    verificationTokenExpires?: Date | null; // Permitimos null
    passwordResetToken?: string | null; // Permitimos null
    passwordResetExpires?: Date | null; // Permitimos null
}
// Controlador para crear nuevos usuarios
export const newUser = async (req: Request, res: Response): Promise<any> => {
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

        // Verificar si el email ya está registrado (incluso no verificado)
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            // Si el usuario existe pero no está verificado, podrías permitir reenviar el email de verificación
            return res.status(400).json({
                msg: 'El email ya está registrado',
                code: 'EMAIL_EXISTS'
            });
        }

        // Hash de la contraseña
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log('Password hasheado correctamente');

        // Generar token de verificación
        const verificationToken = crypto.randomBytes(20).toString('hex');
        const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas de validez

        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            rol: 'usuario',
            isVerified: false,
            verificationToken,
            verificationTokenExpires
        });

        // Enviar email de verificación
        await sendVerificationEmail(email, verificationToken);

        const userJson = user.toJSON();
        console.log('Usuario creado:', {
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
    } catch (error: any) {
        console.error('Error al crear usuario:', error);
        return res.status(400).json({
            msg: 'Error al crear el usuario',
            error: error.message
        });
    }
};

// Función auxiliar para enviar el email de verificación
async function sendVerificationEmail(email: string, token: string) {
    try {
        const transporter = nodemailer.createTransport({
            service: 'Gmail', // Puedes usar otros servicios como SendGrid
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

        await transporter.sendMail({
            from: `"Tu Ecommerce" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Verifica tu cuenta',
            html: `
                <h2>Gracias por registrarte</h2>
                <p>Por favor haz clic en el siguiente enlace para verificar tu cuenta:</p>
                <a href="${verificationUrl}">${verificationUrl}</a>
                <p>Este enlace expirará en 24 horas.</p>
            `
        });
        console.log(`Email de verificación enviado a ${email}`);
    } catch (error) {
        console.error('Error al enviar email de verificación:', error);
        throw new Error('No se pudo enviar el email de verificación');
    }
}
// Controlador para el login de usuarios
export const login = async (req: Request, res: Response): Promise<any> => {
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
        const user = await User.findOne({
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
        const passwordValid = await bcrypt.compare(password, userJson.password);
        console.log('🔑 Validación de contraseña:', passwordValid ? 'correcta' : 'incorrecta');

        if (!passwordValid) {
            console.log('❌ Contraseña inválida para usuario:', email);
            return res.status(400).json({
                msg: 'Credenciales inválidas',
                code: 'INVALID_CREDENTIALS'
            });
        }

        // Generar token JWT
        const token = jwt.sign(
            {
                id: userJson.id,
                email: userJson.email,
                name: userJson.name
            },
            process.env.SECRET_KEY || 'default-secret-key',
            { expiresIn: '24h' }
        );

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

    } catch (error) {
        console.error('🔥 Error en login:', error);
        return res.status(500).json({
            msg: 'Error interno del servidor',
            code: 'SERVER_ERROR',
            error: process.env.NODE_ENV === 'development' ? error : undefined
        });
    }
};
export const verifyEmail = async (req: Request, res: Response): Promise<any> => {
    try {
        const { token } = req.query;

        if (!token || typeof token !== 'string') {
            return res.status(400).json({
                msg: 'Token de verificación no proporcionado',
                code: 'MISSING_TOKEN'
            });
        }

        const user = await User.findOne({
            where: {
                verificationToken: token,
                verificationTokenExpires: { [Op.gt]: new Date() }
            }
        });

        if (!user) {
            return res.status(400).json({
                msg: 'Token inválido o expirado',
                code: 'INVALID_TOKEN'
            });
        }

        // Usamos "as any" temporalmente para evitar errores de tipo
        await user.update({
            isVerified: true,
            verificationToken: null as any,
            verificationTokenExpires: null as any,
            estado: true
        });

        const userJson = user.toJSON();

        return res.status(200).json({
            msg: 'Cuenta verificada exitosamente',
            user: {
                id: userJson.id,
                name: userJson.name,
                email: userJson.email,
                isVerified: true
            }
        });
    } catch (error: any) {
        console.error('Error en verificación de email:', error);
        return res.status(500).json({
            msg: 'Error al verificar la cuenta',
            error: error.message
        });
    }
};
export const getUsers = async (req: Request, res: Response) => {
    try {
        const users = await User.findAll({
            attributes: ['id', 'name', 'email', 'rol']
        });

        console.log('Usuarios encontrados:', users);
        res.json(users);
    } catch (error) {
        console.error('Error al obtener usuarios:', error);
        res.status(500).json({
            msg: 'Error al obtener usuarios',
            error
        });
    }
};
// Controlador para actualizar un usuario existente
export const updateUser = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, email, password } = req.body;

        const user = await User.findByPk(id) as Model<UserAttributes>;

        if (!user) {
            return res.status(404).json({
                msg: `Usuario con ID ${id} no encontrado`
            });
        }

        const updateData: Partial<UserAttributes> = {};
        if (name) updateData.name = name;
        if (email) updateData.email = email;
        if (password) {
            updateData.password = await bcrypt.hash(password, 10);
        }

        await user.update(updateData);

        const userJson = user.toJSON() as UserAttributes;

        res.status(200).json({
            msg: 'Usuario actualizado exitosamente',
            user: {
                id: userJson.id,
                name: userJson.name,
                email: userJson.email
            }
        });
    } catch (error) {
        console.error('Error al actualizar usuario:', error);
        res.status(500).json({
            msg: 'Error al actualizar el usuario',
            error
        });
    }
};
// Controlador para eliminar un usuario existente
export const deleteUser = async (req: Request, res: Response) => {
    try {
        const { id } = req.params; // Obtener el ID del usuario desde los parámetros de la URL

        // Buscar el usuario por ID
        const user = await User.findByPk(id);

        // Si el usuario no existe, devolver un error
        if (!user) {
            return res.status(404).json({
                msg: `Usuario con ID ${id} no encontrado`
            });
        }

        // Eliminar el usuario de la base de datos
        await user.destroy();

        // Devolver la respuesta de éxito
        res.status(200).json({
            msg: 'Usuario eliminado exitosamente'
        });
    } catch (error) {
        console.error('Error al eliminar usuario:', error);
        res.status(500).json({
            msg: 'Error al eliminar el usuario',
            error
        });
    }
};
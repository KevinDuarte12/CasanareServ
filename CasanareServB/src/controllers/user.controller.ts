import { Response, Request } from "express";
import bcrypt from "bcrypt";
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { Op } from "sequelize";
import User from "../db/models/user";
import jwt from "jsonwebtoken";


// Interfaces
export interface UserAttributes {
    id?: number;
    name: string;
    password: string;
    email: string;
    rol?: 'usuario' | 'admin' | 'vendedor';
    estado?: boolean;
    isVerified?: boolean;
    verificationToken?: string | null;
    verificationTokenExpires?: Date | null;
    passwordResetToken?: string | null;
    passwordResetExpires?: Date | null;
}

// Configuración del transportador de email
const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Función auxiliar para enviar el email de verificación
async function sendVerificationEmail(email: string, token: string) {
    try {
        const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

        await transporter.sendMail({
            from: `"CasanareServ" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Verifica tu cuenta',
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
    } catch (error) {
        console.error('❌ Error al enviar email:', error);
        throw new Error('No se pudo enviar el email de verificación');
    }
}

// Controlador para crear nuevos usuarios
export const newUser = async (req: Request, res: Response): Promise<any> => {
    try {
        console.log('📝 Datos recibidos:', req.body);
        const { name, password, email } = req.body;

        if (!name || !password || !email) {
            return res.status(400).json({
                msg: 'Todos los campos son requeridos',
                received: { name, email, hasPassword: !!password }
            });
        }

        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({
                msg: 'El email ya está registrado',
                code: 'EMAIL_EXISTS'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const verificationToken = crypto.randomBytes(20).toString('hex');
        const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            rol: 'usuario',
            isVerified: false,
            verificationToken,
            verificationTokenExpires
        });

        await sendVerificationEmail(email, verificationToken);

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
    } catch (error: any) {
        console.error('❌ Error al crear usuario:', error);
        return res.status(400).json({
            msg: 'Error al crear el usuario',
            error: error.message
        });
    }
};

// Controlador para el login
export const login = async (req: Request, res: Response): Promise<any> => {
    console.log('🔑 Login Request:', req.body);

    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                msg: 'Email y contraseña son requeridos',
                code: 'MISSING_FIELDS'
            });
        }

        const user = await User.findOne({ where: { email } });

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

        const passwordValid = await bcrypt.compare(password, userJson.password);
        if (!passwordValid) {
            return res.status(400).json({
                msg: 'Credenciales inválidas',
                code: 'INVALID_CREDENTIALS'
            });
        }

        const token = jwt.sign(
            {
                id: userJson.id,
                email: userJson.email,
                name: userJson.name,
                rol: userJson.rol
            },
            process.env.SECRET_KEY || 'default-secret-key',
            { expiresIn: '24h' }
        );

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

    } catch (error: any) {
        console.error('❌ Error en login:', error);
        return res.status(500).json({
            msg: 'Error interno del servidor',
            code: 'SERVER_ERROR'
        });
    }
};

// Controlador para verificar email
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

        // Use undefined instead of null for Sequelize compatibility
        await User.update({
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
    } catch (error: any) {
        console.error('❌ Error en verificación:', error);
        return res.status(500).json({
            msg: 'Error al verificar email',
            error: error.message
        });
    }
};

// Controlador para obtener usuarios
export const getUsers = async (req: Request, res: Response): Promise<any> => {
    try {
        const users = await User.findAll({
            attributes: ['id', 'name', 'email', 'rol', 'isVerified', 'estado']
        });

        return res.status(200).json(users);
    } catch (error: any) {
        console.error('❌ Error al obtener usuarios:', error);
        return res.status(500).json({
            msg: 'Error al obtener usuarios',
            error: error.message
        });
    }
};

// Controlador para actualizar usuario
export const updateUser = async (req: Request, res: Response): Promise<any> => {
    try {
        const { id } = req.params;
        const { name, email, password, rol } = req.body;

        const user = await User.findByPk(id);

        if (!user) {
            return res.status(404).json({
                msg: 'Usuario no encontrado',
                code: 'USER_NOT_FOUND'
            });
        }

        const updates: any = {};
        if (name) updates.name = name;
        if (email) updates.email = email;
        if (password) updates.password = await bcrypt.hash(password, 10);
        if (rol) updates.rol = rol;

        await user.update(updates);

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
    } catch (error: any) {
        console.error('❌ Error al actualizar usuario:', error);
        return res.status(500).json({
            msg: 'Error al actualizar usuario',
            error: error.message
        });
    }
};

// Controlador para eliminar usuario
export const deleteUser = async (req: Request, res: Response): Promise<any> => {
    try {
        const { id } = req.params;

        const user = await User.findByPk(id);

        if (!user) {
            return res.status(404).json({
                msg: 'Usuario no encontrado',
                code: 'USER_NOT_FOUND'
            });
        }

        await user.destroy();
        console.log('✅ Usuario eliminado:', user.get('email'));

        return res.status(200).json({
            msg: 'Usuario eliminado exitosamente'
        });
    } catch (error: any) {
        console.error('❌ Error al eliminar usuario:', error);
        return res.status(500).json({
            msg: 'Error al eliminar usuario',
            error: error.message
        });
    }
};
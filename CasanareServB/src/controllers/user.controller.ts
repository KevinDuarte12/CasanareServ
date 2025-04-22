import { Response, Request } from "express";
import bcrypt from "bcrypt";
import crypto from 'crypto';
import sgMail from '@sendgrid/mail';
import { Op } from "sequelize";
import User from "../db/models/user";
import jwt from "jsonwebtoken";
import { v2 as cloudinary } from 'cloudinary';
import Image from '../db/models/image';
import sequelize from '../db/conection'; // Asegúrate de importar tu instancia de sequelize
// Configuración de Cloudinary si no está en otra parte
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
  api_key: process.env.CLOUDINARY_API_KEY || '',
  api_secret: process.env.CLOUDINARY_API_SECRET || ''
});

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

// Configuración de SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

// Reemplazar la función actual de sendVerificationEmail 

async function sendVerificationEmail(email: string, token: string): Promise<boolean> {
    try {
        console.log('🚀 Iniciando envío de email a:', email);
        
        const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
        
        const msg = {
            to: email,
            from: {
                email: process.env.EMAIL_FROM || 'no-reply@casanareserv.com',
                name: process.env.EMAIL_NAME || 'CasanareServ'
            },
            subject: 'Verifica tu cuenta en CasanareServ',
            text: `Gracias por registrarte. Para activar tu cuenta, visita: ${verificationUrl}`,
            html: `
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
                    <h2 style="color: #333;">Bienvenido a CasanareServ</h2>
                    <p>Gracias por registrarte. Para activar tu cuenta, haz clic en el siguiente enlace:</p>
                    <div style="text-align: center; margin: 25px 0;">
                        <a href="${verificationUrl}" 
                           style="background-color: #4CAF50; color: white; padding: 12px 25px; 
                                  text-decoration: none; border-radius: 4px; display: inline-block;">
                            Verificar mi cuenta
                        </a>
                    </div>
                    <p>Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
                    <p style="background-color: #f5f5f5; padding: 10px; word-break: break-all;">
                        ${verificationUrl}
                    </p>
                    <p style="color: #666; font-size: 0.9em;">
                        Este enlace expirará en 24 horas.
                        Si no solicitaste esta verificación, puedes ignorar este correo.
                    </p>
                </div>
            `
        };

        // Usar promesas con then/catch como en el ejemplo proporcionado
        return sgMail
            .send(msg)
            .then((response) => {
                console.log('✅ Email enviado correctamente:');
                console.log(`Status code: ${response[0].statusCode}`);
                return true;
            })
            .catch((error) => {
                console.error('❌ Error al enviar email:');
                if (error.response) {
                    console.error(`Status code: ${error.response.statusCode}`);
                    console.error(`Body: ${JSON.stringify(error.response.body)}`);
                } else {
                    console.error(`Error: ${error.message}`);
                }
                return false;
            });
    } catch (error: any) {
        console.error('❌ Error general al preparar el email:', error);
        return false;
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
        const user = await User.findOne({ 
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
        const validPassword = await bcrypt.compare(
            password,
            user.get('password') as string
        );

        if (!validPassword) {
            return res.status(400).json({
                msg: 'Usuario o contraseña incorrectos',
                code: 'INVALID_CREDENTIALS'
            });
        }

        // Generar token JWT
        const token = jwt.sign(
            {
                id: user.get('id'),
                email: user.get('email'),
                name: user.get('name'),
                rol: user.get('rol')
            },
            process.env.SECRET_KEY || "hola123",
            { expiresIn: '24h' }
        );

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

// Controlador para obtener un usuario por ID
export const getUserById = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    
    // Buscar usuario con sus imágenes asociadas usando el alias correcto
    const user = await User.findOne({
      where: { id },
      attributes: ['id', 'name', 'email', 'rol', 'isVerified', 'estado'],
      include: [{
        model: Image,
        as: 'userImages', // ¡Cambiado de 'images' a 'userImages'! (el alias correcto)
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
  } catch (error: any) {
    console.error('❌ Error al obtener usuario por ID:', error);
    return res.status(500).json({
      msg: 'Error al obtener el usuario',
      error: error.message
    });
  }
};
// Controlador para actualizar usuario
export const updateUser = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { name, email, password, rol, image_url } = req.body;

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
    if (rol) updates.rol = rol;
    
    // Hashear la contraseña si se proporciona una nueva
    if (password) {
      updates.password = await bcrypt.hash(password, 10);
    }

    // Actualizar el usuario
    await user.update(updates);

    // Si se proporciona una URL de imagen, actualizarla en el sistema de imágenes
    if (image_url) {
      // Verificar si ya existe una imagen principal para este usuario
      const mainImage = await Image.findOne({
        where: {
          entity_type: 'user',
          entity_id: parseInt(id),
          is_main: true
        }
      });
      
      if (mainImage) {
        // Actualizar la imagen existente
        await mainImage.update({ url: image_url });
      } else {
        // Crear una nueva imagen principal
        await Image.create({
          url: image_url,
          entity_type: 'user',
          entity_id: parseInt(id),
          is_main: true
        });
      }
    }

    // Obtener el usuario actualizado con sus imágenes
    const updatedUser = await User.findOne({
      where: { id },
      attributes: ['id', 'name', 'email', 'rol', 'isVerified', 'estado'],
      include: [{
        model: Image,
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
    const isHardDelete = req.query.hard === 'true';
    
    // Iniciar una transacción para asegurar consistencia
    const transaction = await sequelize.transaction();

    try {
      // Buscar usuario
      const user = await User.findByPk(id);

      if (!user) {
        await transaction.rollback();
        return res.status(404).json({
          msg: 'Usuario no encontrado',
          code: 'USER_NOT_FOUND'
        });
      }

      if (isHardDelete) {
        console.log(`Iniciando eliminación PERMANENTE del usuario ${id}`);
        
        // 1. Obtener y eliminar imágenes del usuario
        await handleUserImages(id, transaction);
        
        // 2. Obtener productos del usuario
        const products = await getProductsByUserId(id);
        
        // 3. Para cada producto, eliminar sus imágenes y relaciones
        for (const product of products) {
          // Intenta obtener el ID del producto de diferentes propiedades posibles
          const rawId = product.get('id') ?? product.get('id_product') ?? product.getDataValue('id') ?? product.getDataValue('id_product');
          
          // Asegúrate de que el ID sea un número o cadena válido
          if (rawId !== undefined && rawId !== null) {
            const productId = parseInt(String(rawId), 10);
            
            // Verificar que el ID sea un número válido
            if (!isNaN(productId)) {
              await handleProductImages(productId, transaction);
              
              // Eliminar trueques relacionados con este producto
              await handleProductBarters(productId, transaction);
              
              // También eliminar el producto del carrito de cualquier usuario
              await handleProductCarts(productId, transaction);
              
              
              // Eliminar comentarios y valoraciones del producto
              await handleProductReviews(productId, transaction);
              
              // Finalmente eliminar el producto
              await product.destroy({ transaction });
              console.log(`Producto ${productId} eliminado permanentemente`);
            } else {
              console.warn(`ID de producto inválido encontrado: ${rawId}`);
            }
          } else {
            console.warn('Producto sin ID válido encontrado, continuando...');
          }
        }
        
        // 4. Eliminar trueques donde el usuario es solicitante
        await handleUserBarters(id, transaction);
        
        // 5. Eliminar carritos de compra del usuario
        await handleUserCart(id, transaction);
        
        // 6. Eliminar direcciones del usuario
        await handleUserAddresses(id, transaction);
        
        // 7. Eliminar físicamente al usuario
        await user.destroy({ transaction });
        console.log(`Usuario ${id} eliminado permanentemente`);
        
        var responseMsg = 'Usuario y todos sus datos relacionados eliminados permanentemente';
      } else {
        // Eliminación lógica (soft delete)
        await user.update({ estado: false }, { transaction });
        console.log(`Usuario ${id} desactivado (soft delete)`);
        var responseMsg = 'Usuario desactivado correctamente';
      }

      // Confirmar transacción
      await transaction.commit();
      
      return res.status(200).json({
        msg: responseMsg
      });
    } catch (error) {
      // Revertir transacción en caso de error
      await transaction.rollback();
      throw error;
    }
  } catch (error: any) {
    console.error('❌ Error al eliminar usuario:', error);
    return res.status(500).json({
      msg: 'Error al eliminar usuario',
      error: error.message
    });
  }
};

// Función auxiliar para manejar las imágenes del usuario
async function handleUserImages(userId: string | number, transaction: any) {
  // Obtener las imágenes asociadas al usuario
  const images = await Image.findAll({
    where: {
      entity_type: 'user',
      entity_id: parseInt(userId.toString())
    }
  });

  // Eliminar imágenes de Cloudinary
  for (const image of images) {
    const publicId = image.get('public_id');
    if (publicId) {
      try {
        await cloudinary.uploader.destroy(publicId as string);
        console.log(`Imagen eliminada de Cloudinary: ${publicId}`);
      } catch (cloudinaryError) {
        console.error('Error al eliminar imagen de Cloudinary:', cloudinaryError);
        // Continuamos aunque falle la eliminación en Cloudinary
      }
    }
  }

  // Eliminar registros de imágenes
  if (images.length > 0) {
    await Image.destroy({
      where: {
        entity_type: 'user',
        entity_id: parseInt(userId.toString())
      },
      transaction
    });
    console.log(`${images.length} imágenes de usuario eliminadas`);
  }
}

// Función auxiliar para obtener productos por user_id
async function getProductsByUserId(userId: string | number) {
    try {
      // Importa directamente el modelo Product en lugar de usar sequelize.model
      const Product = require('../db/models/product').default; // Ajusta la ruta según tu estructura
      
      // Si el modelo no existe, devuelve un array vacío
      if (!Product) {
        console.warn('El modelo Product no está definido');
        return [];
      }
      
      return await Product.findAll({
        where: {
          id_user: parseInt(userId.toString())
        }
      });
    } catch (error) {
      console.error('Error al obtener productos del usuario:', error);
      // Devolver array vacío para evitar que el proceso se interrumpa
      return [];
    }
  }

// Función auxiliar para manejar las imágenes de un producto
async function handleProductImages(productId: string | number, transaction: any) {
  // Obtener las imágenes asociadas al producto
  const images = await Image.findAll({
    where: {
      entity_type: 'product',
      entity_id: parseInt(productId.toString())
    }
  });

  // Eliminar imágenes de Cloudinary
  for (const image of images) {
    const publicId = image.get('public_id');
    if (publicId) {
      try {
        await cloudinary.uploader.destroy(publicId as string);
        console.log(`Imagen de producto eliminada de Cloudinary: ${publicId}`);
      } catch (cloudinaryError) {
        console.error('Error al eliminar imagen de producto de Cloudinary:', cloudinaryError);
      }
    }
  }

  // Eliminar registros de imágenes
  if (images.length > 0) {
    await Image.destroy({
      where: {
        entity_type: 'product',
        entity_id: parseInt(productId.toString())
      },
      transaction
    });
    console.log(`${images.length} imágenes de producto eliminadas`);
  }
}

// Función auxiliar para manejar los trueques relacionados con un producto
// Función auxiliar para manejar los trueques relacionados con un producto
async function handleProductBarters(productId: string | number, transaction: any) {
    try {
      // Importar directamente el modelo
      const Barter = require('../db/models/barter').default; // Ajusta la ruta
      
      // Si el modelo no existe, salir sin error
      if (!Barter) {
        console.warn('El modelo Barter no está definido');
        return;
      }
      
      // Eliminar trueques donde este producto está involucrado
      await Barter.destroy({
        where: {
          [Op.or]: [
            { id_product_offered: parseInt(productId.toString()) },
            { id_product_requested: parseInt(productId.toString()) }
          ]
        },
        transaction
      });
      console.log(`Trueques relacionados con el producto ${productId} eliminados`);
    } catch (error) {
      console.error('Error al eliminar trueques del producto:', error);
      // No interrumpir el proceso
    }
  }

// Función auxiliar para manejar los carritos que contienen un producto
async function handleProductCarts(productId: string | number, transaction: any) {
    try {
      // Importar directamente los modelos
      const CartItem = require('../db/models/cartItem').default;
      
      // Si el modelo no existe, salir sin error
      if (!CartItem) {
        console.warn('El modelo CartItem no está definido');
        return;
      }
      
      await CartItem.destroy({
        where: {
          id_product: parseInt(productId.toString())
        },
        transaction
      });
      console.log(`Items de carrito con el producto ${productId} eliminados`);
    } catch (error) {
      console.error('Error al eliminar items de carrito del producto:', error);
      // No interrumpir el proceso
    }
  }

// Función auxiliar para manejar comentarios y valoraciones de un producto
async function handleProductReviews(productId: string | number, transaction: any) {
    try {
      // Importar directamente el modelo
      const Review = require('../db/models/review').default;
      
      // Si el modelo no existe, salir sin error
      if (!Review) {
        console.warn('El modelo Review no está definido');
        return;
      }
      
      await Review.destroy({
        where: {
          id_product: parseInt(productId.toString())
        },
        transaction
      });
      console.log(`Reseñas del producto ${productId} eliminadas`);
    } catch (error) {
      console.error('Error al eliminar reseñas del producto:', error);
      // No interrumpir el proceso
    }
  }
  
// Función auxiliar para manejar los trueques solicitados por un usuario
async function handleUserBarters(userId: string | number, transaction: any) {
    try {
      // Importar directamente el modelo
      const Barter = require('../db/models/barter').default;
      
      // Si el modelo no existe, salir sin error
      if (!Barter) {
        console.warn('El modelo Barter no está definido');
        return;
      }
      
      // Eliminar trueques donde este usuario es el solicitante
      await Barter.destroy({
        where: {
          id_user_requester: parseInt(userId.toString())
        },
        transaction
      });
      console.log(`Trueques solicitados por el usuario ${userId} eliminados`);
    } catch (error) {
      console.error('Error al eliminar trueques del usuario:', error);
      // No interrumpir el proceso
    }
  }
// Función auxiliar para manejar el carrito de compras del usuario
async function handleUserCart(userId: string | number, transaction: any) {
    try {
      // Importar directamente los modelos
      const Cart = require('../db/models/cart').default;
      const CartItem = require('../db/models/cartItem').default;
      
      // Si los modelos no existen, salir sin error
      if (!Cart || !CartItem) {
        console.warn('Los modelos Cart o CartItem no están definidos');
        return;
      }
      
      // Primero obtener el ID del carrito del usuario
      const cart = await Cart.findOne({
        where: {
          id_user: parseInt(userId.toString())
        }
      });
      
      if (cart) {
        const cartId = cart.get('id');
        
        // Eliminar los items del carrito
        await CartItem.destroy({
          where: {
            id_cart: cartId
          },
          transaction
        });
        
        // Eliminar el carrito
        await cart.destroy({ transaction });
        console.log(`Carrito del usuario ${userId} eliminado`);
      }
    } catch (error) {
      console.error('Error al eliminar carrito del usuario:', error);
      // No interrumpir el proceso
    }
  }
  

// Función auxiliar para manejar las direcciones del usuario
async function handleUserAddresses(userId: string | number, transaction: any) {
    try {
      // Importar directamente el modelo
      const Address = require('../db/models/address').default;
      
      // Si el modelo no existe, salir sin error
      if (!Address) {
        console.warn('El modelo Address no está definido');
        return;
      }
      
      await Address.destroy({
        where: {
          id_user: parseInt(userId.toString())
        },
        transaction
      });
      console.log(`Direcciones del usuario ${userId} eliminadas`);
    } catch (error) {
      console.error('Error al eliminar direcciones del usuario:', error);
      // No interrumpir el proceso
    }
  }
// Reemplazar la función de resetPassword también

async function sendPasswordResetEmail(email: string, token: string): Promise<boolean> {
    try {
        console.log('🚀 Iniciando envío de email de restablecimiento a:', email);
        
        const resetUrl = `${process.env.FRONTEND_URL}/resetpassword?token=${token}`;
        
        const msg = {
            to: email,
            from: {
                email: process.env.EMAIL_FROM || 'no-reply@casanareserv.com',
                name: process.env.EMAIL_NAME || 'CasanareServ'
            },
            subject: 'Restablece tu contraseña en CasanareServ',
            text: `Has solicitado restablecer tu contraseña. Visita: ${resetUrl}`,
            html: `
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
                    <h2 style="color: #333;">Restablecer Contraseña</h2>
                    <p>Has solicitado restablecer tu contraseña. Haz clic en el siguiente enlace:</p>
                    <div style="text-align: center; margin: 25px 0;">
                        <a href="${resetUrl}" 
                           style="background-color: #4CAF50; color: white; padding: 12px 25px; 
                                  text-decoration: none; border-radius: 4px; display: inline-block;">
                            Restablecer Contraseña
                        </a>
                    </div>
                    <p>Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
                    <p style="background-color: #f5f5f5; padding: 10px; word-break: break-all;">
                        ${resetUrl}
                    </p>
                    <p style="color: #666; font-size: 0.9em;">
                        Este enlace expirará en 1 hora.
                        Si no realizaste esta solicitud, ignora este correo.
                    </p>
                </div>
            `
        };

        // Usar promesas con then/catch
        return sgMail
            .send(msg)
            .then((response) => {
                console.log('✅ Email de restablecimiento enviado correctamente:');
                console.log(`Status code: ${response[0].statusCode}`);
                return true;
            })
            .catch((error) => {
                console.error('❌ Error al enviar email de restablecimiento:');
                if (error.response) {
                    console.error(`Status code: ${error.response.statusCode}`);
                    console.error(`Body: ${JSON.stringify(error.response.body)}`);
                    throw new Error('No se pudo enviar el email de restablecimiento: ' + 
                        (error.response.body.errors?.[0]?.message || 'Unauthorized'));
                } else {
                    throw new Error('No se pudo enviar el email de restablecimiento: ' + 
                        (error.message || 'Error desconocido'));
                }
            });
    } catch (error: any) {
        console.error('❌ Error general al preparar el email de restablecimiento:', error);
        throw error;
    }
}
// Controlador para solicitar restablecimiento de contraseña
export const forgotPassword = async (req: Request, res: Response): Promise<any> => {
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
        const user = await User.findOne({ 
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
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hora

        // Actualizar usuario con el token
        await user.update({
            passwordResetToken: resetToken,
            passwordResetExpires: resetTokenExpires
        });

        // Enviar email
        await sendPasswordResetEmail(email, resetToken);

        return res.status(200).json({
            msg: 'Se ha enviado un email con las instrucciones'
        });

    } catch (error: any) {
        console.error('❌ Error al solicitar restablecimiento:', error);
        return res.status(500).json({
            msg: 'Error al procesar la solicitud',
            error: error.message
        });
    }
};

// Controlador para restablecer la contraseña
export const resetPassword = async (req: Request, res: Response): Promise<any> => {
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
        const user = await User.findOne({
            where: {
                passwordResetToken: token,
                passwordResetExpires: { [Op.gt]: new Date() },
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
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Actualizar usuario
        await user.update({
            password: hashedPassword,
            passwordResetToken: undefined,
            passwordResetExpires: undefined
        });

        console.log('✅ Contraseña restablecida:', user.get('email'));

        return res.status(200).json({
            msg: 'Contraseña actualizada exitosamente'
        });

    } catch (error: any) {
        console.error('❌ Error al restablecer contraseña:', error);
        return res.status(500).json({
            msg: 'Error al restablecer la contraseña',
            error: error.message
        });
    }
};

// Controlador para obtener el perfil de usuario
export const getUserProfile = async (req: Request, res: Response): Promise<any> => {
  try {
    // El ID del usuario se obtiene del token a través del middleware
    const userId = (req as any).user.id;
    
    console.log(`🔍 Obteniendo perfil para usuario ID: ${userId}`);
    
    if (!userId) {
      return res.status(401).json({
        msg: 'No autorizado',
        code: 'UNAUTHORIZED'
      });
    }
    
    // Buscar usuario con sus imágenes usando el alias correcto
    const user = await User.findOne({
      where: { 
        id: userId,
        estado: true
      },
      attributes: ['id', 'name', 'email', 'rol', 'isVerified', 'estado'],
      include: [{
        model: Image,
        as: 'userImages', // ¡Cambiado a 'userImages'!
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
    
    // Encontrar la imagen principal (ajustar para usar 'userImages')
    let profileImage = null;
    const images = user.get('userImages') as any[]; // ¡Cambiado a 'userImages'!
    
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
      profileImage,
      userImages: images // ¡Cambiado a 'userImages'!
    });
  } catch (error: any) {
    console.error('❌ Error al obtener perfil de usuario:', error);
    return res.status(500).json({
      msg: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Nuevo controlador para subir imagen de perfil
export const uploadProfileImage = async (req: Request, res: Response): Promise<any> => {
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
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        msg: 'Usuario no encontrado',
        code: 'USER_NOT_FOUND'
      });
    }
    
    // Verificar si ya existe una imagen principal
    const existingMainImage = await Image.findOne({
      where: {
        entity_type: 'user',
        entity_id: userId,
        is_main: true
      }
    });
    
    if (existingMainImage) {
      // Actualizar imagen existente
      await existingMainImage.update({
        url: imageUrl
      });
      
      console.log(`✅ Imagen de perfil actualizada para usuario ${userId}`);
      return res.status(200).json({
        msg: 'Imagen de perfil actualizada exitosamente',
        image: existingMainImage
      });
    } else {
      // Crear nueva imagen
      const newImage = await Image.create({
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
  } catch (error: any) {
    console.error('❌ Error al subir imagen de perfil:', error);
    return res.status(500).json({
      msg: 'Error al subir imagen de perfil',
      error: error.message
    });
  }
};
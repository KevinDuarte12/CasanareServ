/**
 * Controlador para gestión de calificaciones y reseñas de productos
 * Maneja creación, consulta y eliminación de ratings con soporte para imágenes en Cloudinary
 */
import { Request, Response } from 'express';
import Raiting from '../db/models/rating';
import Product from '../db/models/product';
import User from '../db/models/user';
import Image from '../db/models/image';
import { v2 as cloudinary } from 'cloudinary'; 
import fs from 'fs'; 
import { Op } from 'sequelize';
//  Configuracion Cloudinary 
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
  api_key: process.env.CLOUDINARY_API_KEY || '',
  api_secret: process.env.CLOUDINARY_API_SECRET || ''
});
/**
 * Crea una nueva calificación para un producto
 * Permite agregar imágenes opcionales y valida que el usuario no califique su propio producto
 */
export const createRating = async (req: Request, res: Response) => {
  try {
    const { id_product, score, comment } = req.body;
    const id_user_qualifying = req.user?.id;
    
    if (!id_user_qualifying) {
      return res.status(401).json({
        msg: 'Usuario no autenticado'
      });
    }
    
    // Validar que el producto existe
    const product = await Product.findByPk(id_product);
    if (!product) {
      return res.status(404).json({
        msg: `No existe un producto con el ID ${id_product}`
      });
    }
    
    // Obtener el ID del vendedor (usuario calificado)
    const id_user_rated = product.getDataValue('id_user');
    
    // Validar que el usuario no se califique a sí mismo
    if (id_user_qualifying === id_user_rated) {
      return res.status(400).json({
        msg: 'No puedes calificar tu propio producto'
      });
    }
    
    // Verificar si el usuario ya calificó este producto
    const existingRating = await Raiting.findOne({
      where: {
        id_product,
        id_user_qualifying
      }
    });
    
    if (existingRating) {
      return res.status(400).json({
        msg: 'Ya has calificado este producto anteriormente'
      });
    }
    
    // ✅ COMENTARIO OPCIONAL: Procesar comentario (puede ser vacío)
    const finalComment = comment && comment.trim() ? comment.trim() : null;
    
    // Crear la calificación
    const rating = await Raiting.create({
      id_product,
      id_user_rated,
      id_user_qualifying,
      score,
      comment: finalComment // ✅ Puede ser null
    });

    // ✅ IMÁGENES OPCIONALES: Solo procesar si existen
    const uploadedImages = req.files as Express.Multer.File[];
    const imageUrls: string[] = [];
    let imagesProcessed = 0;

    if (uploadedImages && uploadedImages.length > 0) {
      console.log(`Procesando ${uploadedImages.length} imágenes para la reseña ID: ${rating.getDataValue('id_raiting')}`);

      for (const file of uploadedImages) {
        try {
          // Subir a Cloudinary usando la misma estructura que image.controller
          const result = await cloudinary.uploader.upload(file.path, {
            folder: 'casanareserv/ratings',
            transformation: [
              { width: 800, height: 600, crop: 'limit' },
              { quality: 'auto' }
            ]
          });

          console.log(`Imagen subida a Cloudinary: ${result.secure_url}`);

          // Guardar referencia en la base de datos usando el mismo patrón
          const image = await Image.create({
            url: result.secure_url,
            public_id: result.public_id,
            entity_type: 'rating', // ✅ NUEVO: Agregar 'rating' como tipo
            entity_id: rating.getDataValue('id_raiting'),
            is_main: false, // Las imágenes de rating no tienen concepto de "principal"
            alt_text: `Imagen de reseña ${rating.getDataValue('id_raiting')}`
          });

          imageUrls.push(result.secure_url);
          console.log(`Imagen guardada en BD con ID: ${image.id}`);

          // Eliminar archivo temporal
          try {
            fs.unlinkSync(file.path);
          } catch (unlinkError) {
            console.error('Error al eliminar archivo temporal:', unlinkError);
          }
          imagesProcessed++;
        } catch (uploadError) {
          console.error('Error al subir imagen:', uploadError);
          // ✅ CONTINUAR: No fallar si una imagen da error
        }
      }
    } else {
      console.log('No se enviaron imágenes - calificación solo con texto');
    }

    // ✅ RESPUESTA: Incluir información de imágenes (puede ser 0)
    res.status(201).json({
      msg: 'Calificación creada correctamente',
      rating: {
        id_raiting: rating.getDataValue('id_raiting'),
        score: rating.getDataValue('score'),
        comment: rating.getDataValue('comment'),
        id_product: rating.getDataValue('id_product'),
        createdAt: rating.getDataValue('createdAt')
      },
      imagesUploaded: imagesProcessed,
      imageUrls: imageUrls
    });
  } catch (error) {
    console.error('Error al crear calificación:', error);
    res.status(500).json({
      msg: 'Error al crear la calificación',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};
/**
 * Obtiene todas las calificaciones de un producto específico
 * Incluye información del usuario calificador, sus imágenes de perfil y las imágenes de la reseña
 */
export const getProductRatings = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    
    const ratings = await Raiting.findAll({
      where: { id_product: productId },
      include: [
        {
          model: User,
          as: 'user_qualifying',
          attributes: ['id', 'name', 'email'],
          include: [
            {
              model: Image,
              as: 'userImages',
              where: { is_main: true },
              required: false,
              limit: 1,
              attributes: ['url']
            }
          ]
        },
        // ✅ DESCOMENTAR Y CORREGIR: Incluir imágenes de rating
        {
          model: Image,
          as: 'ratingImages',
          required: false,
          where: {
            entity_type: 'rating',
            entity_id: { [Op.col]: 'raitings.id_raiting' }
          },
          attributes: ['id', 'url', 'alt_text']
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    // Calcular promedio de calificaciones
    let average = 0;
    if (ratings.length > 0) {
      const sum = ratings.reduce((acc, rating) => acc + rating.getDataValue('score'), 0);
      average = sum / ratings.length;
    }
    
    // Agrupar calificaciones por estrellas
    const stats = {
      5: 0, 4: 0, 3: 0, 2: 0, 1: 0
    };
    
    ratings.forEach(rating => {
      const score = rating.getDataValue('score');
      if (score >= 1 && score <= 5) {
        stats[score as 1|2|3|4|5]++;
      }
    });
    
    res.json({
      ratings,
      summary: {
        average,
        total: ratings.length,
        stats
      }
    });
  } catch (error) {
    console.error('Error al obtener calificaciones del producto:', error);
    res.status(500).json({
      msg: 'Error al obtener calificaciones',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};
/**
 * Obtiene todas las calificaciones recibidas por un usuario específico
 * Incluye información del usuario calificador y el producto asociado
 */
export const getUserRatings = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    const ratings = await Raiting.findAll({
      where: { id_user_rated: userId },
      include: [
        {
          model: User,
          as: 'user_qualifying',
          attributes: ['id', 'name']
        },
        {
          model: Product,
          as: 'product',
          attributes: ['id_product', 'name', 'price']
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    // Calcular promedio de calificaciones
    let average = 0;
    if (ratings.length > 0) {
      const sum = ratings.reduce((acc, rating) => acc + rating.getDataValue('score'), 0);
      average = sum / ratings.length;
    }
    
    res.json({
      ratings,
      average,
      total: ratings.length
    });
  } catch (error) {
    console.error('Error al obtener calificaciones del usuario:', error);
    res.status(500).json({
      msg: 'Error al obtener calificaciones',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};
/**
 * Elimina una calificación específica del sistema
 * Valida permisos del usuario y elimina imágenes asociadas de Cloudinary y base de datos
 */
export const deleteRating = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id; // ✅ USAR req.user?.id del middleware de autenticación
    
    if (!userId) {
      return res.status(401).json({
        msg: 'Usuario no autenticado'
      });
    }
    
    const rating = await Raiting.findByPk(id);
    
    if (!rating) {
      return res.status(404).json({
        msg: `No existe una calificación con el ID ${id}`
      });
    }
    
    // Verificar que el usuario que quiere eliminar sea quien calificó
    if (rating.getDataValue('id_user_qualifying') !== userId) {
      return res.status(403).json({
        msg: 'No tienes permiso para eliminar esta calificación'
      });
    }

    // ✅ NUEVO: Obtener todas las imágenes asociadas a esta calificación
    const ratingImages = await Image.findAll({
      where: {
        entity_type: 'rating',
        entity_id: id
      }
    });

    console.log(`🗑️ Eliminando calificación ID: ${id} con ${ratingImages.length} imágenes`);

    // ✅ NUEVO: Eliminar imágenes de Cloudinary y base de datos
    let imagesDeleted = 0;
    let cloudinaryErrors = 0;

    for (const image of ratingImages) {
      try {
        const publicId = image.getDataValue('public_id');
        
        // Eliminar de Cloudinary si tiene public_id
        if (publicId) {
          try {
            const cloudinaryResult = await cloudinary.uploader.destroy(publicId);
            console.log(`☁️ Imagen eliminada de Cloudinary: ${publicId}`, cloudinaryResult);
          } catch (cloudinaryError) {
            console.error('❌ Error al eliminar imagen de Cloudinary:', cloudinaryError);
            cloudinaryErrors++;
            // Continuar aunque falle Cloudinary
          }
        }

        // Eliminar de la base de datos
        await image.destroy();
        imagesDeleted++;
        console.log(`🗄️ Imagen eliminada de BD: ID ${image.getDataValue('id')}`);
        
      } catch (dbError) {
        console.error('❌ Error al eliminar imagen de BD:', dbError);
      }
    }

    // ✅ ELIMINAR: La calificación después de las imágenes
    await rating.destroy();
    
    console.log(`✅ Calificación eliminada exitosamente: ID ${id}`);
    console.log(`📊 Estadísticas: ${imagesDeleted} imágenes eliminadas, ${cloudinaryErrors} errores de Cloudinary`);

    res.json({
      msg: 'Calificación eliminada correctamente',
      details: {
        ratingId: id,
        imagesDeleted: imagesDeleted,
        cloudinaryErrors: cloudinaryErrors
      }
    });
  } catch (error) {
    console.error('❌ Error al eliminar calificación:', error);
    res.status(500).json({
      msg: 'Error al eliminar la calificación',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};
import { Request, Response } from 'express';
import Raiting from '../db/models/raiting';
import Product from '../db/models/product';
import User from '../db/models/user';
import Image from '../db/models/image'; // Importar el modelo completo (no solo los atributos)
import { ImageAttributes } from '../db/models/image';

export const createRating = async (req: Request, res: Response) => {
  try {
    const { id_product, score, comment, id_user_qualifying } = req.body;
    
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
    
    // Crear la calificación
    const rating = await Raiting.create({
      id_product,
      id_user_rated,
      id_user_qualifying,
      score,
      comment
    });
    
    res.status(201).json({
      msg: 'Calificación creada correctamente',
      rating
    });
  } catch (error) {
    console.error('Error al crear calificación:', error);
    res.status(500).json({
      msg: 'Error al crear la calificación',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

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

export const deleteRating = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.body.userId; // Asumiendo que tienes middleware de autenticación
    
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
    
    await rating.destroy();
    
    res.json({
      msg: 'Calificación eliminada correctamente'
    });
  } catch (error) {
    console.error('Error al eliminar calificación:', error);
    res.status(500).json({
      msg: 'Error al eliminar la calificación',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};
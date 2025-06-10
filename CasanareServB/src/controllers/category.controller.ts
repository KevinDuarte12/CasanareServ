/**
 * Controlador para gestión de categorías de productos
 * Maneja operaciones CRUD de categorías e imágenes asociadas
 */
import { Request, Response } from 'express';
import Category from '../db/models/category';
import Image from '../db/models/image';
import { Op } from 'sequelize';

/**
 * Obtiene todas las categorías
 */
export const getCategories = async (req: Request, res: Response) => {
  try {
    const categories = await Category.findAll({
      include: [
        {
          model: Image,
          as: 'categoryImages', // ← Cambiado de 'images' a 'categoryImages'
          required: false
        }
      ]
    });
    
    // Responder con las categorías encontradas
    res.json(categories);
  } catch (error: any) {
    console.error('Error al obtener categorías:', error);
    res.status(500).json({
      msg: 'Error al obtener las categorías',
      error: error.message
    });
  }
};

/**
 * Obtiene una categoría por su ID
 */
export const getCategoryById = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const category = await Category.findByPk(id, {
      include: [
        {
          model: Image,
          as: 'categoryImages', // ← CORRECTO (usar el nuevo nombre de asociación)
          required: false
        }
      ]
    });
    
    if (!category) {
      return res.status(404).json({
        msg: `No existe una categoría con el ID ${id}`
      });
    }
    
    // Antes de enviar la respuesta
    const adaptedCategory = adaptCategoryForFrontend(category);
    res.json(adaptedCategory);
  } catch (error: any) {
    console.error(`Error al obtener la categoría con ID ${id}:`, error);
    res.status(500).json({
      msg: 'Error al obtener la categoría',
      error: error.message
    });
  }
};

/**
 * Crea una nueva categoría
 */
export const createCategory = async (req: Request, res: Response) => {
  const { name, description, image } = req.body;

  try {
    // Verificar si la categoría ya existe por su nombre
    const existingCategory = await Category.findOne({ where: { name } });
    
    if (existingCategory) {
      return res.status(400).json({
        msg: `Ya existe una categoría con el nombre ${name}`
      });
    }
    
    // Crear la nueva categoría
    const newCategory = await Category.create({
      name,
      description,
      image,
      status: true
    });
    
    // Si se proporcionó una imagen URL inicial, guardarla también en la tabla de imágenes
    if (image) {
      await Image.create({
        url: image,
        entity_type: 'category',
        entity_id: newCategory.get('id_category') as number,
        is_main: true
      });
    }
    
    // Responder con la categoría creada
    res.status(201).json({
      msg: 'Categoría creada correctamente',
      category: newCategory
    });
  } catch (error: any) {
    console.error('Error al crear categoría:', error);
    res.status(500).json({
      msg: 'Error al crear la categoría',
      error: error.message
    });
  }
};

/**
 * Actualiza una categoría existente
 */
export const updateCategory = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description, image, status } = req.body;

  try {
    // Buscar la categoría por ID
    const category = await Category.findByPk(id);
    
    // Verificar si existe
    if (!category) {
      return res.status(404).json({
        msg: `No existe una categoría con el ID ${id}`
      });
    }
    
    // Si se va a cambiar el nombre, verificar que no exista otra categoría con ese nombre
    if (name && name !== category.get('name')) {
      const existingCategory = await Category.findOne({
        where: {
          name,
          id_category: { [Op.ne]: parseInt(id) }
        }
      });
      
      if (existingCategory) {
        return res.status(400).json({
          msg: `Ya existe otra categoría con el nombre ${name}`
        });
      }
    }
    
    // Actualizar la categoría
    await category.update({
      name,
      description,
      image,
      status
    });
    
    // Si se actualizó la URL de imagen y no está vacía, sincronizar con la tabla de imágenes
    if (image && image !== category.get('image')) {
      // Buscar si ya existe una imagen principal
      const mainImage = await Image.findOne({
        where: {
          entity_type: 'category',
          entity_id: parseInt(id),
          is_main: true
        }
      });
      
      if (mainImage) {
        // Si ya existe una imagen principal, actualizarla
        await mainImage.update({ 
          url: image,
          // No actualizamos public_id, ya que esta imagen no fue subida a través de Cloudinary
          // directamente, sino que es una URL externa
        });
      } else {
        // Si no existe, crear una nueva imagen principal
        await Image.create({
          url: image,
          entity_type: 'category',
          entity_id: parseInt(id),
          is_main: true
        });
      }
    }
    
    // Obtener categoría actualizada con sus imágenes
    const updatedCategory = await Category.findByPk(id);
    const images = await Image.findAll({
      where: {
        entity_type: 'category',
        entity_id: parseInt(id)
      },
      order: [
        ['is_main', 'DESC'],
        ['createdAt', 'DESC']
      ]
    });
    
    // Preparar respuesta
    const categoryData = updatedCategory!.toJSON();
    Object.assign(categoryData, { images });
    
    // Responder con la categoría actualizada
    res.json({
      msg: 'Categoría actualizada correctamente',
      category: categoryData
    });
  } catch (error: any) {
    console.error(`Error al actualizar la categoría con ID ${id}:`, error);
    res.status(500).json({
      msg: 'Error al actualizar la categoría',
      error: error.message
    });
  }
};

/**
 * Elimina una categoría y sus imágenes asociadas físicamente de la base de datos
 */
export const deleteCategory = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    // Buscar la categoría por ID para verificar que existe
    const category = await Category.findByPk(id);
    
    // Verificar si existe
    if (!category) {
      return res.status(404).json({
        msg: `No existe una categoría con el ID ${id}`
      });
    }
    
    // Buscar todas las imágenes asociadas a esta categoría
    const images = await Image.findAll({
      where: {
        entity_type: 'category',
        entity_id: parseInt(id)
      }
    });
    
    // Si hay imágenes asociadas, eliminarlas
    if (images.length > 0) {
      console.log(`Eliminando ${images.length} imágenes asociadas a la categoría ${id}`);
      
      // Para cada imagen, intentar eliminarla de Cloudinary si tiene public_id
      for (const image of images) {
        try {
          const publicId = image.get('public_id');
          
          // Si la imagen tiene un public_id (está en Cloudinary), eliminarla
          if (publicId) {
            // Importar Cloudinary solo si es necesario
            const cloudinary = require('cloudinary').v2;
            
            // Asegurarse que Cloudinary esté configurado (esto debería estar en otro lugar del código)
            if (!cloudinary.config().cloud_name) {
              cloudinary.config({
                cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
                api_key: process.env.CLOUDINARY_API_KEY,
                api_secret: process.env.CLOUDINARY_API_SECRET
              });
            }
            
            // Eliminar la imagen de Cloudinary
            await cloudinary.uploader.destroy(publicId);
            console.log(`Imagen eliminada de Cloudinary: ${publicId}`);
          }
        } catch (cloudinaryError) {
          // Loguear el error pero continuar con el proceso
          console.error('Error al eliminar imagen de Cloudinary:', cloudinaryError);
        }
      }
      
      // Eliminar todas las imágenes de la base de datos
      await Image.destroy({
        where: {
          entity_type: 'category',
          entity_id: parseInt(id)
        }
      });
      
      console.log(`Imágenes eliminadas de la base de datos para la categoría ${id}`);
    }
    
    // Eliminar físicamente la categoría
    await category.destroy();
    console.log(`Categoría ${id} eliminada físicamente`);
    
    // Responder con éxito
    res.json({
      msg: 'Categoría y sus imágenes eliminadas correctamente'
    });
  } catch (error: any) {
    console.error(`Error al eliminar la categoría con ID ${id}:`, error);
    res.status(500).json({
      msg: 'Error al eliminar la categoría',
      error: error.message
    });
  }
};

/**
 * Cambiar el estado de una categoría (activar/desactivar)
 */
export const toggleCategoryStatus = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    // Buscar la categoría por ID
    const category = await Category.findByPk(id);
    
    // Verificar si existe
    if (!category) {
      return res.status(404).json({
        msg: `No existe una categoría con el ID ${id}`
      });
    }
    
    // Obtener el estado actual y cambiarlo
    const currentStatus = category.get('status');
    
    // Actualizar el estado
    await category.update({
      status: !currentStatus
    });
    
    // Responder con el nuevo estado
    res.json({
      msg: `Categoría ${!currentStatus ? 'activada' : 'desactivada'} correctamente`,
      category
    });
  } catch (error: any) {
    console.error(`Error al cambiar estado de la categoría con ID ${id}:`, error);
    res.status(500).json({
      msg: 'Error al cambiar el estado de la categoría',
      error: error.message
    });
  }
};

// Función para adaptar categorías al formato que espera el frontend
const adaptCategoryForFrontend = (category: any) => {
  // Si es un solo objeto
  if (!Array.isArray(category)) {
    const categoryJson = category.toJSON ? category.toJSON() : category;
    // Mantener categoryImages pero también agregar images para compatibilidad
    if (categoryJson.categoryImages) {
      categoryJson.images = categoryJson.categoryImages;
    }
    return categoryJson;
  }
  
  // Si es un array
  return category.map(cat => {
    const categoryJson = cat.toJSON ? cat.toJSON() : cat;
    // Mantener categoryImages pero también agregar images para compatibilidad
    if (categoryJson.categoryImages) {
      categoryJson.images = categoryJson.categoryImages;
    }
    return categoryJson;
  });
};
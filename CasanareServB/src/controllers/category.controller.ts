import { Request, Response } from 'express';
import Category from '../db/models/category';

/**
 * Obtiene todas las categorías
 */
export const getCategories = async (req: Request, res: Response) => {
  try {
    // Obtener todas las categorías
    const categories = await Category.findAll();
    
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
    // Buscar la categoría por ID
    const category = await Category.findByPk(id);
    
    // Verificar si existe
    if (!category) {
      return res.status(404).json({
        msg: `No existe una categoría con el ID ${id}`
      });
    }
    
    // Responder con la categoría encontrada
    res.json(category);
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
      const existingCategory = await Category.findOne({ where: { name } });
      
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
    
    // Responder con la categoría actualizada
    res.json({
      msg: 'Categoría actualizada correctamente',
      category
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
 * Elimina una categoría
 */
export const deleteCategory = async (req: Request, res: Response) => {
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
    
    // Eliminar la categoría (recomendable usar soft delete en producción)
    await category.update({ status: false });
    // Para eliminar físicamente: await category.destroy();
    
    // Responder con éxito
    res.json({
      msg: 'Categoría eliminada correctamente'
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
import { Request, Response } from 'express';
import Product from '../db/models/product';
import Category from '../db/models/category';
import User from '../db/models/user';

interface CreateProductBody {
    id_user: number;
    id_category: number;
    name: string;
    stock: number
    description?: string;
    price: number;
    status?: 'disponible' | 'vendido' | 'en_trueque';
    permite_trueque?: boolean;
}

// Obtener todos los productos
export const getProducts = async (req: Request, res: Response) => {
  try {
    const products = await Product.findAll({
      include: [
        { model: Category, as: 'category', attributes: ['id_category', 'name'] },
        { model: User, as: 'user', attributes: ['id', 'name', 'email'] }
      ]
    });
    res.json(products);
  } catch (error) {
    console.error('Error al obtener productos:', error);
    res.status(500).json({
      msg: 'Error al obtener los productos'
    });
  }
};

// Obtener un producto por ID
export const getProductById = async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    const product = await Product.findByPk(id, {
      include: [
        { model: Category, as: 'category', attributes: ['id_category', 'name'] },
        { model: User, as: 'user', attributes: ['id', 'name', 'email'] }
      ]
    });
    
    if (!product) {
      return res.status(404).json({
        msg: `No existe un producto con el ID ${id}`
      });
    }
    
    res.json(product);
  } catch (error) {
    console.error('Error al obtener producto por ID:', error);
    res.status(500).json({
      msg: 'Error al obtener el producto'
    });
  }
};

// Crear un nuevo producto
export const createProduct = async (req: Request, res: Response) => {
  const { id_user, id_category, name, description, price, stock, permite_trueque } = req.body;
  
  try {
    // Verificar si existe la categoría
    const categoryExists = await Category.findByPk(id_category);
    if (!categoryExists) {
      return res.status(400).json({
        msg: `No existe una categoría con el ID ${id_category}`
      });
    }
    
    // Verificar si existe el usuario
    const userExists = await User.findByPk(id_user);
    if (!userExists) {
      return res.status(400).json({
        msg: `No existe un usuario con el ID ${id_user}`
      });
    }
    
    // Crear el producto
    const product = await Product.create({
      id_user,
      id_category,
      name,
      description,
      price,
      stock,
      permite_trueque
    });
    
    res.status(201).json({
      msg: 'Producto creado correctamente',
      product
    });
  } catch (error) {
    console.error('Error al crear producto:', error);
    res.status(500).json({
      msg: 'Error al crear el producto'
    });
  }
};

// Actualizar un producto
export const updateProduct = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { id_user, id_category, name, description, price, stock, status, permite_trueque } = req.body;
  
  try {
    // Verificar si existe el producto
    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({
        msg: `No existe un producto con el ID ${id}`
      });
    }
    
    // Si se proporciona una categoría, verificar si existe
    if (id_category) {
      const categoryExists = await Category.findByPk(id_category);
      if (!categoryExists) {
        return res.status(400).json({
          msg: `No existe una categoría con el ID ${id_category}`
        });
      }
    }
    
    // Actualizar el producto
    await product.update({
      id_category: id_category || product.getDataValue('id_category'),
      name: name || product.getDataValue('name'),
      description: description !== undefined ? description : product.getDataValue('description'),
      price: price || product.getDataValue('price'),
      stock: stock !== undefined ? stock : product.getDataValue('stock'),
      status: status || product.getDataValue('status'),
      permite_trueque: permite_trueque !== undefined ? permite_trueque : product.getDataValue('permite_trueque')
    });
    
    res.json({
      msg: 'Producto actualizado correctamente',
      product
    });
  } catch (error) {
    console.error('Error al actualizar producto:', error);
    res.status(500).json({
      msg: 'Error al actualizar el producto'
    });
  }
};

// Eliminar un producto
export const deleteProduct = async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    // Verificar si existe el producto
    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({
        msg: `No existe un producto con el ID ${id}`
      });
    }
    
    // Eliminar el producto (eliminación lógica cambiando el status)
    await product.update({ status: 'vendido' });
    
    // Si prefieres eliminación física:
    // await product.destroy();
    
    res.json({
      msg: 'Producto eliminado correctamente'
    });
  } catch (error) {
    console.error('Error al eliminar producto:', error);
    res.status(500).json({
      msg: 'Error al eliminar el producto'
    });
  }
};

// Cambiar el status de un producto
export const toggleProductStatus = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { newStatus } = req.body;
  
  // Validar que el nuevo status sea válido
  const validStatus = ['disponible', 'vendido', 'en_trueque'];
  if (!validStatus.includes(newStatus)) {
    return res.status(400).json({
      msg: `El status ${newStatus} no es válido. Valores permitidos: ${validStatus.join(', ')}`
    });
  }
  
  try {
    // Verificar si existe el producto
    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({
        msg: `No existe un producto con el ID ${id}`
      });
    }
    
    // Cambiar el status
    await product.update({ status: newStatus });
    
    res.json({
      msg: `Status del producto cambiado a ${newStatus}`
    });
  } catch (error) {
    console.error('Error al cambiar status del producto:', error);
    res.status(500).json({
      msg: 'Error al cambiar el status del producto'
    });
  }
};
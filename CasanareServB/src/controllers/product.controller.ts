/**
 * Controlador para gestión de productos
 * Maneja operaciones CRUD de productos con categorías, imágenes y funcionalidad de trueque
 */
import { Request, Response } from 'express';
import { Op } from 'sequelize';  // Importar Op directamente
import sequelize from '../db/conection';
import Product from '../db/models/product';
import Category from '../db/models/category';
import User from '../db/models/user';
import Image from '../db/models/image'; // Importar modelo de imágenes
import { v2 as cloudinary } from 'cloudinary';
import ItemCart from '../db/models/itemcart';
// Configuración de Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
  api_key: process.env.CLOUDINARY_API_KEY || '',
  api_secret: process.env.CLOUDINARY_API_SECRET || ''
});
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
// Define interfaces para representar la estructura de tus objetos
interface ProductImage {
  id: number;
  url: string;
  public_id?: string;
  entity_type: string;
  entity_id: number;
  is_main: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
interface ProductData {
  id_product?: number;
  name?: string;
  description?: string;
  price?: number | string;
  stock?: number;
  status?: 'disponible' | 'vendido' | 'en_trueque';
  type?: 'regular' | 'barter'; // Agregar el campo type
  permite_trueque?: boolean;   // Mantener para compatibilidad
  createdAt?: Date;
  updatedAt?: Date;
  category?: any;
  user?: any;
  productImages?: ProductImage[];
  images?: ProductImage[]; // Para compatibilidad
  toJSON?: () => any;
  [key: string]: any; // Para permitir otras propiedades desconocidas
}
/**
 * Adapta los productos del backend para compatibilidad con el frontend
 * Convierte datos de Sequelize a formato JSON y mantiene compatibilidad con campos legacy
 */
const adaptProductsForFrontend = (products: any): ProductData | ProductData[] => {
  // Si es null o undefined, devolver un objeto vacío
  if (!products) {
    return {};
  }
  
  // Si es un solo producto
  if (!Array.isArray(products)) {
    const productJson: ProductData = products.toJSON ? products.toJSON() : products;
    // Mantener productImages pero también agregar images para compatibilidad
    if (productJson.productImages) {
      productJson.images = productJson.productImages;
    }
    
    // Añadir permite_trueque basado en type para compatibilidad con frontend
    if ('type' in productJson) {
      productJson.permite_trueque = productJson.type === 'barter';
    }
    
    return productJson;
  }
  
  // Si es un array de productos
  return products.map(product => {
    const productJson: ProductData = product.toJSON ? product.toJSON() : product;
    // Mantener productImages pero también agregar images para compatibilidad
    if (productJson.productImages) {
      productJson.images = productJson.productImages;
    }
    
    // Añadir permite_trueque basado en type para compatibilidad con frontend
    if ('type' in productJson) {
      productJson.permite_trueque = productJson.type === 'barter';
    }
    
    return productJson;
  });
};
/**
 * Obtiene todos los productos disponibles en el sistema
 * Incluye información de categoría, usuario propietario e imágenes asociadas
 */
export const getProducts = async (req: Request, res: Response) => {
  try {
    // Versión simplificada
    const products = await Product.findAll({
      include: [
        { model: Category, as: 'category', attributes: ['id_category', 'name'] },
        { model: User, as: 'user', attributes: ['id', 'name', 'email'] },
        // Solo incluir las imágenes, sin where adicional
        { model: Image, as: 'productImages', required: false }
      ],
      // Especificar exactamente los atributos, eliminando permite_trueque
      attributes: [
        'id_product',
        'id_user',
        'id_category',
        'name',
        'stock',
        'description',
        'price',
        'status',
        'type', // usar type en lugar de permite_trueque
        'createdAt',
        'updatedAt'
      ],
      order: [['createdAt', 'DESC']]
    });
    
    // Verificar productos e imágenes
    console.log(`Encontrados ${products.length} productos`);
    
    // Usar el adaptador para mantener compatibilidad
    const adaptedProducts = adaptProductsForFrontend(products);
    
    res.json(adaptedProducts);
  } catch (error) {
    console.error('Error al obtener productos:', error);
    res.status(500).json({
      msg: 'Error al obtener los productos'
    });
  }
};
/**
 * Devuelve la configuración estándar de consulta para productos
 * Define las relaciones y atributos comunes para consultas de productos
 */
const getProductOptions = () => {
  return {
    include: [
      { 
        model: Category, 
        as: 'category',
        attributes: ['id_category', 'name'] 
      },
      { 
        model: User, 
        as: 'user',
        attributes: ['id', 'name', 'email'] 
      },
      {
        model: Image,
        as: 'productImages',
        required: false
      }
    ],
    attributes: [
      'id_product',
      'id_user',
      'id_category',
      'name',
      'description',
      'price',
      'stock',
      'status',
      'type',
      'createdAt',
      'updatedAt'
    ]
  };
};
/**
 * Obtiene un producto específico por su ID
 * Incluye información de categoría, usuario propietario e imágenes asociadas
 */
export const getProductById = async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    console.log(`Buscando producto con ID: ${id}`);
    
    // Validar el ID
    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        msg: 'ID de producto inválido'
      });
    }
    
    const product = await Product.findByPk(id, getProductOptions());
    
    if (!product) {
      console.log(`No se encontró producto con ID: ${id}`);
      return res.status(404).json({
        msg: `No existe un producto con el ID ${id}`
      });
    }
    
    // Para 'name'
    const productName = product.getDataValue('name');
    console.log(`Producto encontrado: ${productName || 'Sin nombre'}`);
    
    // Adaptar para compatibilidad
    const adaptedProduct = adaptProductsForFrontend(product);
    
    // Log adicional para verificar que hay imágenes
    const productImages = product.getDataValue('productImages');
    if (productImages && Array.isArray(productImages)) {
      console.log(`Producto tiene ${productImages.length} imágenes`);
    } else {
      console.log('Producto no tiene imágenes o el formato es inválido');
    }
    
    res.json(adaptedProduct);
  } catch (error) {
    console.error('Error al obtener producto por ID:', error);
    res.status(500).json({
      msg: 'Error al obtener el producto'
    });
  }
};
/**
 * Crea un nuevo producto en el sistema
 * Valida existencia de categoría y usuario, maneja imagen inicial y convierte permite_trueque a type
 */
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
    
    // Convertir permite_trueque a type
    const type = permite_trueque ? 'barter' : 'regular';
    
    // Crear el producto
    const product = await Product.create({
      id_user,
      id_category,
      name,
      description,
      price,
      stock,
      type // Usar type en lugar de permite_trueque
    });
    
    // Si se recibe una imagen inicial, guardarla como imagen principal
    if (req.body.image_url) {
      await Image.create({
        url: req.body.image_url,
        entity_type: 'product',
        entity_id: product.getDataValue('id_product'),
        is_main: true
      });
    }
    
    // Obtener el producto con sus relaciones (incluyendo la imagen recién creada)
    const productWithRelations = await Product.findByPk(product.getDataValue('id_product'), {
      include: [
        { model: Category, as: 'category', attributes: ['id_category', 'name'] },
        { model: User, as: 'user', attributes: ['id', 'name', 'email'] },
        { 
          model: Image,
          as: 'productImages',
          required: false // Eliminada la condición where redundante
        }
      ]
    });
    
    if (!productWithRelations) {
      return res.status(500).json({
        msg: 'Error al recuperar el producto creado'
      });
    }
    
    // Adaptar para compatibilidad
    const adaptedProduct = adaptProductsForFrontend(productWithRelations);
    
    res.status(201).json({
      msg: 'Producto creado correctamente',
      product: adaptedProduct
    });
  } catch (error) {
    console.error('Error al crear producto:', error);
    res.status(500).json({
      msg: 'Error al crear el producto',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};
/**
 * Actualiza un producto existente en el sistema
 * Valida existencia del producto y categoría, actualiza campos proporcionados
 */
export const updateProduct = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { id_category, name, description, price, stock, status, type } = req.body;
  
  try {
    // Verificar si existe el producto
    const product = await Product.findByPk(id, {
      attributes: ['id_product', 'id_user', 'id_category', 'name', 'description', 'price', 'stock', 'status', 'type']
    });
    
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
    
    // Actualizar el producto con los campos del modelo actual
    await product.update({
      id_category: id_category || product.getDataValue('id_category'),
      name: name || product.getDataValue('name'),
      description: description !== undefined ? description : product.getDataValue('description'),
      price: price || product.getDataValue('price'),
      stock: stock !== undefined ? stock : product.getDataValue('stock'),
      status: status || product.getDataValue('status'),
      type: type || product.getDataValue('type') // Usar type directamente
    });
    
    res.json({
      msg: 'Producto actualizado correctamente',
      product: adaptProductsForFrontend(product)
    });
  } catch (error) {
    console.error('Error al actualizar producto:', error);
    res.status(500).json({
      msg: 'Error al actualizar el producto'
    });
  }
};
/**
 * Elimina un producto del sistema de forma segura
 * Elimina imágenes de Cloudinary, items del carrito y el producto usando transacciones
 */
export const deleteProduct = async (req: Request, res: Response) => {
  const { id } = req.params;
  // Iniciar una transacción
  const transaction = await sequelize.transaction();
  
  try {
    // Verificar si existe el producto
    const product = await Product.findByPk(id);
    if (!product) {
      await transaction.rollback();
      return res.status(404).json({
        msg: `No existe un producto con el ID ${id}`
      });
    }
    
    // Obtener todas las imágenes asociadas al producto
    const images = await Image.findAll({
      where: {
        entity_type: 'product',
        entity_id: parseInt(id)
      }
    });
    
    // Eliminar imágenes de Cloudinary
    for (const image of images) {
      const publicId = image.get('public_id');
      if (publicId) {
        try {
          // Eliminar la imagen de Cloudinary
          await cloudinary.uploader.destroy(publicId as string);
          console.log(`Imagen eliminada de Cloudinary: ${publicId}`);
        } catch (cloudinaryError) {
          console.error('Error al eliminar imagen de Cloudinary:', cloudinaryError);
          // Continuamos aunque falle la eliminación en Cloudinary
        }
      }
    }
    
    // Eliminar elementos del carrito que referencien a este producto
    await ItemCart.destroy({
      where: {
        id_product: parseInt(id)
      },
      transaction
    });
    
    // Eliminar los registros de imágenes de la base de datos
    await Image.destroy({
      where: {
        entity_type: 'product',
        entity_id: parseInt(id)
      },
      transaction
    });
    
    // Eliminar físicamente el producto
    await product.destroy({ transaction });
    
    // Confirmar la transacción
    await transaction.commit();
    
    res.json({
      msg: 'Producto y sus imágenes eliminados correctamente'
    });
  } catch (error) {
    // Revertir la transacción en caso de error
    await transaction.rollback();
    
    console.error('Error al eliminar producto:', error);
    res.status(500).json({
      msg: 'Error al eliminar el producto',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};
/**
 * Cambia el estado de un producto específico en el sistema
 * Valida que el nuevo estado sea válido y actualiza el producto
 */
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
/**
 * Obtiene los productos más recientes del sistema con filtros opcionales
 * Permite filtrar por tipo de producto (regular/barter) y limitar cantidad de resultados
 */
export const getRecentProducts = async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 8;
    const type = req.query.type as string || null; // <-- Obtener el parámetro type
    
    console.log(`Obteniendo productos recientes. Límite: ${limit}, Tipo: ${type || 'todos'}`);
    
    // Construir condiciones where
    const whereConditions: any = {
      status: 'disponible'
    };
    
    // Si se especifica un tipo (regular o barter), filtrar por él
    if (type) {
      whereConditions.type = type;
      console.log(`Filtrando productos por tipo: ${type}`);
    }
    
    const recentProducts = await Product.findAll({
      limit,
      order: [['createdAt', 'DESC']],
      where: whereConditions, // <-- Usar las condiciones where con el filtro de tipo
      include: [
        {
          model: Image,
          as: 'productImages',
          required: false
        }
      ],
      attributes: [
        'id_product',
        'name',
        'description',
        'price',
        'stock',
        'type', // Asegurarse de incluir type en los atributos
        'createdAt'
      ]
    });
    
    // Adaptar para compatibilidad
    const adaptedProducts = adaptProductsForFrontend(recentProducts);
    
    console.log(`Productos encontrados: ${recentProducts.length} (tipo: ${type || 'todos'})`);
    
    res.json(adaptedProducts);
  } catch (error) {
    console.error('Error al obtener productos recientes:', error);
    res.status(500).json({
      msg: 'Error al obtener productos recientes',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};
/**
 * Obtiene todos los productos disponibles de una categoría específica
 * Valida la existencia de la categoría y devuelve productos con sus imágenes
 */
export const getProductsByCategory = async (req: Request, res: Response) => {
  const { categoryId } = req.params;
  
  try {
    console.log(`Buscando productos para categoría ID: ${categoryId}`);
    
    // Validar que categoryId sea un número
    if (!categoryId || isNaN(parseInt(categoryId))) {
      return res.status(400).json({
        msg: 'ID de categoría inválido'
      });
    }
    
    // Verificar si la categoría existe
    const category = await Category.findByPk(categoryId);
    if (!category) {
      return res.status(404).json({
        msg: `No existe una categoría con el ID ${categoryId}`
      });
    }
    
    // Obtener productos de la categoría
    const products = await Product.findAll({
      where: {
        id_category: categoryId,
        status: 'disponible' // Solo productos disponibles
      },
      include: [
        {
          model: Image,
          as: 'productImages',
          required: false
        }
      ],
      attributes: [
        'id_product',
        'name',
        'description',
        'price',
        'stock',
        'createdAt'
      ]
    });
    
    // Adaptar para compatibilidad
    const adaptedProducts = adaptProductsForFrontend(products);
    
    console.log(`Se encontraron ${products.length} productos para la categoría ${categoryId}`);
    
    res.json(adaptedProducts);
  } catch (error) {
    console.error(`Error al obtener productos para categoría ${categoryId}:`, error);
    res.status(500).json({
      msg: 'Error al obtener productos por categoría',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};
/**
 * Obtiene productos con paginación y filtros avanzados
 * Permite filtrar por categoría, precio, tipo de producto y término de búsqueda
 */
export const getPaginatedProducts = async (req: Request, res: Response) => {
  try {
    // Parámetros de paginación
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 12;
    const offset = (page - 1) * limit;
    
    // Parámetros de filtrado
    const categoryId = req.query.categoryId || req.query.category ? parseInt(req.query.categoryId as string || req.query.category as string) : null;
    const search = req.query.search as string || '';
    const minPrice = req.query.minPrice ? parseFloat(req.query.minPrice as string) : null;
    const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : null;
    const type = req.query.type as string || null;
    
    console.log(`Buscando productos paginados: página ${page}, límite ${limit}`);
    console.log(`Filtros: type=${type}, categoryId=${categoryId}, search=${search}`);
    
    // Construir los filtros WHERE
    const whereConditions: any = {
      status: 'disponible', // Solo productos disponibles
    };
    
    // Añadir filtro por tipo si se especifica
    if (type) {
      whereConditions.type = type;
      console.log(`Filtrando productos por tipo: ${type}`);
    }
    
    // Resto de los filtros
    if (categoryId) {
      whereConditions.id_category = categoryId;
    }
    
    // Filtrar por precio mínimo si se especifica
    if (minPrice !== null) {
      whereConditions.price = {
        ...(whereConditions.price || {}),
        [Op.gte]: minPrice
      };
    }
    
    // Filtrar por precio máximo si se especifica
    if (maxPrice !== null) {
      whereConditions.price = {
        ...(whereConditions.price || {}),
        [Op.lte]: maxPrice
      };
    }
    
    // Filtrar por término de búsqueda si se especifica
    if (search) {
      whereConditions[Op.or] = [
        {
          name: {
            [Op.like]: `%${search}%`
          }
        },
        {
          description: {
            [Op.like]: `%${search}%`
          }
        }
      ];
    }
    
    // Debug de la consulta
    console.log('Filtros completos:', JSON.stringify(whereConditions, null, 2));
    
    // Realizar la consulta con los filtros actualizados
    const { count, rows: products } = await Product.findAndCountAll({
      where: whereConditions,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      include: [
        { model: Category, as: 'category', attributes: ['id_category', 'name'] },
        {
          model: Image,
          as: 'productImages',
          required: false
        }
      ],
      attributes: [
        'id_product',
        'name',
        'description',
        'price',
        'stock',
        'status',
        'type', // ¡Añadir este campo!
        'createdAt'
      ]
    });

    // Logs detallados para depuración
    const regularProducts = products.filter(p => p.getDataValue('type') === 'regular');
    const barterProducts = products.filter(p => p.getDataValue('type') === 'barter');
    console.log(`Resultados: Total=${products.length}, Regular=${regularProducts.length}, Barter=${barterProducts.length}`);
    console.log(`Encontrados ${products.length} productos con tipo ${type || 'cualquiera'}`);
    
    // Adaptar productos para compatibilidad
    const adaptedProducts = adaptProductsForFrontend(products);
    
    // Calcular metadatos de paginación
    const totalPages = Math.ceil(count / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;
    
    // Devolver respuesta formateada
    res.json({
      data: adaptedProducts,
      meta: {
        total: count,
        totalPages,
        currentPage: page,
        pageSize: limit,
        hasNext,
        hasPrev
      }
    });
    
  } catch (error) {
    console.error('Error al obtener productos paginados:', error);
    res.status(500).json({
      msg: 'Error al obtener productos paginados',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};
/**
 * Obtiene todos los productos de un usuario específico
 * Incluye información de categoría e imágenes asociadas a cada producto
 */
export const getProductsByUser = async (req: Request, res: Response) => {
    const { userId } = req.params;

    try {
        const products = await Product.findAll({
            where: {
                id_user: userId
            },
            include: [
                { model: Category, as: 'category', attributes: ['id_category', 'name'] },
                { model: Image, as: 'productImages', required: false }
            ],
            order: [['createdAt', 'DESC']]
        });

        res.json(products);
    } catch (error) {
        console.error(`Error al obtener productos del usuario ${userId}:`, error);
        res.status(500).json({
            msg: 'Error al obtener los productos del usuario'
        });
    }
};
/**
 * Obtiene todos los productos disponibles en el sistema
 * Incluye información de categoría, usuario propietario e imágenes asociadas
 */
export const getAvailableProducts = async (req: Request, res: Response) => {
    try {
        const products = await Product.findAll({
            where: {
                status: 'disponible'
            },
            include: [
                { model: Category, as: 'category', attributes: ['id_category', 'name'] },
                { model: User, as: 'user', attributes: ['id', 'name', 'email'] },
                { model: Image, as: 'productImages', required: false }
            ],
            order: [['createdAt', 'DESC']]
        });

        res.json(products);
    } catch (error) {
        console.error('Error al obtener productos disponibles:', error);
        res.status(500).json({
            msg: 'Error al obtener los productos disponibles'
        });
    }
};
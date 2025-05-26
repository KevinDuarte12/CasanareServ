import { Request, Response } from 'express';
import Cart from '../db/models/cart';
import ItemCart from '../db/models/itemcart';
import Product from '../db/models/product';
import User from '../db/models/user';
import { Op, Model } from 'sequelize';

// Interfaz extendida de Request para incluir userId y pendingCart
interface AuthRequest extends Request {
  userId?: number;
  user?: {
    id: number;
  };
  pendingItems?: Array<{
    id_product: number;
    quantity: number;
  }>;
}

// Nueva función para procesar items pendientes
async function processPendingItems(userId: number, pendingItems: Array<{id_product: number, quantity: number}>): Promise<boolean> {
  try {
    if (!pendingItems || pendingItems.length === 0) {
      return true;
    }
    
    console.log(`🔄 Procesando ${pendingItems.length} items pendientes para usuario ${userId}`);
    
    // Buscar o crear un carrito activo para el usuario
    let [cart] = await Cart.findOrCreate({
      where: {
        id_user: userId,
        status: 'activo'
      },
      defaults: {
        id_user: userId,
        status: 'activo'
      }
    });
    
    const cartId = cart.get('id_cart') as number;
    
    // Procesar cada item pendiente
    for (const item of pendingItems) {
      // Verificar si el producto existe y está disponible
      const product = await Product.findOne({
        where: {
          id_product: item.id_product,
          status: 'disponible'
        }
      });
      
      if (!product) {
        console.warn(`⚠️ Producto ${item.id_product} no encontrado o no disponible`);
        continue; // Continuar con el siguiente item
      }
      
      // Verificar stock
      const stock = product.get('stock') as number;
      const quantity = Math.min(item.quantity, stock); // No exceder el stock disponible
      
      if (quantity <= 0) {
        console.warn(`⚠️ Producto ${item.id_product} sin stock disponible`);
        continue;
      }
      
      // Verificar si el producto ya está en el carrito
      let cartItem = await ItemCart.findOne({
        where: {
          id_cart: cartId,
          id_product: item.id_product
        }
      });
      
      if (cartItem) {
        // Si ya existe, actualizar la cantidad
        const currentQuantity = cartItem.get('quantity') as number;
        const newQuantity = Math.min(currentQuantity + quantity, stock); // No exceder el stock
        await cartItem.update({ quantity: newQuantity });
        console.log(`✅ Actualizada cantidad de producto ${item.id_product} en carrito: ${newQuantity}`);
      } else {
        // Si no existe, crear nuevo item en el carrito
        await ItemCart.create({
          id_cart: cartId,
          id_product: item.id_product,
          quantity,
          price: product.get('price') as number
        });
        console.log(`✅ Producto ${item.id_product} agregado al carrito correctamente`);
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error al procesar items pendientes:', error);
    return false;
  }
}

// Modificar la función de login para procesar items pendientes
export const processLoginCart = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId || req.user?.id;
    const pendingItems = req.body.pendingItems || [];
    
    if (!userId) {
      res.status(401).json({
        success: false,
        msg: 'Usuario no autenticado'
      });
      return;
    }
    
    const success = await processPendingItems(userId, pendingItems);
    
    res.json({
      success,
      msg: success ? 'Items pendientes agregados al carrito' : 'Error al procesar items pendientes'
    });
  } catch (error) {
    console.error('Error al procesar carrito pendiente:', error);
    res.status(500).json({
      success: false,
      msg: 'Error al procesar carrito pendiente'
    });
  }
};

// Obtener o crear carrito activo del usuario
export const getActiveCart = async (req: AuthRequest, res: Response) => {
  try {
    // Usar userId desde el middleware validateToken o del objeto user
    const userId = req.userId || req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        msg: 'Usuario no autenticado'
      });
    }
    
    // Buscar carrito activo - CAMBIO DE ALIAS: 'id_product' → 'product'
    let cart = await Cart.findOne({
      where: {
        id_user: userId,
        status: 'activo'
      },
      include: [
        {
          model: ItemCart,
          as: 'items',
          include: [
            {
              model: Product,
              as: 'product', // CORREGIDO: Usar el alias definido en las asociaciones
              attributes: ['id_product', 'name', 'price', 'stock']
            }
          ]
        }
      ]
    });
    
    // Si no existe, crear uno nuevo
    if (!cart) {
      const newCart = await Cart.create({
        id_user: userId,
        status: 'activo'
      });
      
      const cartId = newCart.getDataValue('id_cart') as number;
      
      // Cargar el carrito recién creado con sus relaciones - CAMBIO DE ALIAS: 'id_product' → 'product'
      cart = await Cart.findByPk(cartId, {
        include: [
          {
            model: ItemCart,
            as: 'items',
            include: [
              {
                model: Product,
                as: 'product', // CORREGIDO
                attributes: ['id_product', 'name', 'price', 'stock']
              }
            ]
          }
        ]
      });
    }
    
    res.json(cart);
  } catch (error) {
    console.error('Error al obtener carrito activo:', error);
    res.status(500).json({
      msg: 'Error al obtener carrito activo'
    });
  }
};

// Añadir producto al carrito (modificado para manejar usuarios no autenticados)
export const addToCart = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const userId = req.userId || req.user?.id;
    const { id_product, quantity = 1 } = req.body;

    console.log(`🛒 Intentando agregar producto ${id_product} (cantidad: ${quantity}) al carrito de usuario ${userId || 'no autenticado'}`);

    // Si no hay usuario autenticado, devolver indicación para guardar en localStorage
    if (!userId) {
      return res.status(401).json({
        msg: 'Usuario no autenticado',
        code: 'UNAUTHORIZED',
        action: 'SAVE_FOR_LATER',
        productInfo: {
          id_product,
          quantity
        }
      });
    }

    // Validaciones básicas
    if (!id_product) {
      return res.status(400).json({
        msg: 'ID de producto requerido',
        code: 'MISSING_PRODUCT_ID'
      });
    }

    // Verificar si el producto existe y está disponible
    const product = await Product.findOne({
      where: {
        id_product,
        status: 'disponible'
      }
    });

    if (!product) {
      return res.status(404).json({
        msg: 'Producto no encontrado o no disponible',
        code: 'PRODUCT_NOT_FOUND'
      });
    }

    // Verificar si hay suficiente stock - CORRECCIÓN 1: Usar as number para type casting
    const stock = product.get('stock') as number;
    if (stock < quantity) {
      return res.status(400).json({
        msg: 'No hay suficiente stock disponible',
        code: 'INSUFFICIENT_STOCK'
      });
    }

    // Buscar o crear un carrito activo para el usuario
    let [cart] = await Cart.findOrCreate({
      where: {
        id_user: userId,
        status: 'activo'
      },
      defaults: {
        id_user: userId,
        status: 'activo'
      }
    });

    const cartId = cart.get('id_cart') as number;
    
    // MODIFICACIÓN: Mejorar la búsqueda del item existente
    let cartItem = await ItemCart.findOne({
      where: {
        id_cart: cartId,
        id_product
      },
      include: [{
        model: Product,
        as: 'product'
      }]
    });

    if (cartItem) {
      // MODIFICACIÓN: Verificar stock antes de actualizar
      const currentQuantity = cartItem.get('quantity') as number;
      const newQuantity = currentQuantity + quantity;
      
      if (newQuantity > stock) {
        return res.status(400).json({
          msg: `No hay suficiente stock. Stock disponible: ${stock}`,
          code: 'INSUFFICIENT_STOCK'
        });
      }

      // Actualizar con la nueva cantidad
      await cartItem.update({ 
        quantity: newQuantity,
        price: product.get('price') as number // Actualizar también el precio
      });
      
      console.log(`✅ Cantidad actualizada en carrito: ${newQuantity}`);
    } else {
      // Crear nuevo item
      cartItem = await ItemCart.create({
        id_cart: cartId,
        id_product,
        quantity,
        price: product.get('price') as number
      });
      console.log('✅ Nuevo producto agregado al carrito');
    }

    // MODIFICACIÓN: Obtener el carrito actualizado con todos sus items
    const updatedCart = await Cart.findByPk(cartId, { 
      include: [{
        model: ItemCart,
        as: 'items',
        include: [{
          model: Product,
          as: 'product',
          attributes: ['id_product', 'name', 'price', 'stock']
        }]
      }]
    });

    return res.status(201).json(updatedCart);
  } catch (error: any) {
    console.error('❌ Error al agregar producto al carrito:', error);
    return res.status(500).json({
      msg: 'Error al agregar producto al carrito',
      error: error.message
    });
  }
};

// Actualizar cantidad de un producto en el carrito
export const updateCartItem = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId || req.user?.id;
    const { itemId } = req.params;
    const { quantity } = req.body;
    
    if (!userId) {
      return res.status(401).json({
        msg: 'Usuario no autenticado'
      });
    }
    
    if (!quantity || quantity < 0) {
      return res.status(400).json({
        msg: 'Se requiere cantidad válida'
      });
    }
    
    // Obtener item del carrito - CAMBIO DE ALIAS en Cart y Product
    const item = await ItemCart.findByPk(itemId, {
      include: [
        {
          model: Cart,
          as: 'cart', // CORREGIDO: Usar el alias definido en las asociaciones
          where: { id_user: userId, status: 'activo' },
          required: true
        },
        {
          model: Product,
          as: 'product' // CORREGIDO: Usar el alias definido en las asociaciones
        }
      ]
    });
    
    if (!item) {
      return res.status(404).json({
        msg: 'Item no encontrado o no pertenece a su carrito activo'
      });
    }
    
    // Si quantity es 0, eliminar el item
    if (quantity === 0) {
      await item.destroy();
      return res.json({
        msg: 'Item eliminado del carrito'
      });
    }
    
    // Verificar stock - CORRECCIÓN: Usar 'product' en lugar de 'id_product'
    const product = item.get('product') as Model;
    const productStock = product.get('stock') as number;
    
    if (quantity > productStock) {
      return res.status(400).json({
        msg: `Stock insuficiente. Stock disponible: ${productStock}`
      });
    }
    
    // Actualizar cantidad
    await item.update({ quantity });
    
    // CAMBIO DE ALIAS en la respuesta
    res.json({
      msg: 'Cantidad actualizada',
      item: await ItemCart.findByPk(itemId, {
        include: [
          {
            model: Product,
            as: 'product', // CORREGIDO
            attributes: ['id_product', 'name', 'price', 'stock']
          }
        ]
      })
    });
  } catch (error) {
    console.error('Error al actualizar item del carrito:', error);
    res.status(500).json({
      msg: 'Error al actualizar item del carrito'
    });
  }
};

// Eliminar un producto del carrito
export const removeFromCart = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId || req.user?.id;
    const { itemId } = req.params;
    
    if (!userId) {
      return res.status(401).json({
        msg: 'Usuario no autenticado'
      });
    }
    
    // Obtener item del carrito - CAMBIO DE ALIAS: 'id_cart' → 'cart'
    const item = await ItemCart.findByPk(itemId, {
      include: [
        {
          model: Cart,
          as: 'cart', // CORREGIDO: Usar el alias definido en las asociaciones
          where: { id_user: userId, status: 'activo' },
          required: true
        }
      ]
    });
    
    if (!item) {
      return res.status(404).json({
        msg: 'Item no encontrado o no pertenece a su carrito activo'
      });
    }
    
    // Eliminar item
    await item.destroy();
    
    res.json({
      msg: 'Producto eliminado del carrito'
    });
  } catch (error) {
    console.error('Error al eliminar producto del carrito:', error);
    res.status(500).json({
      msg: 'Error al eliminar producto del carrito'
    });
  }
};

// Vaciar carrito
export const clearCart = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId || req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        msg: 'Usuario no autenticado'
      });
    }
    
    // Obtener carrito activo
    const cart = await Cart.findOne({
      where: {
        id_user: userId,
        status: 'activo'
      }
    });
    
    if (!cart) {
      return res.status(404).json({
        msg: 'No tiene un carrito activo'
      });
    }
    
    // Eliminar todos los items del carrito - CORRECCIÓN 6: Type casting
    await ItemCart.destroy({
      where: {
        id_cart: cart.getDataValue('id_cart') as number
      }
    });
    
    res.json({
      msg: 'Carrito vaciado correctamente'
    });
  } catch (error) {
    console.error('Error al vaciar carrito:', error);
    res.status(500).json({
      msg: 'Error al vaciar carrito'
    });
  }
};

/**
 * Obtiene el ID del carrito activo del usuario
 * GET /api/cart/getid
 */
export const getCartId = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId || req.user?.id;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        msg: 'Usuario no autenticado'
      });
      return;
    }

    // Buscar o crear un carrito activo
    let [cart] = await Cart.findOrCreate({
      where: {
        id_user: userId,
        status: 'activo'
      },
      defaults: {
        id_user: userId,
        status: 'activo'
      }
    });

    const cartId = cart.get('id_cart') as number;

    res.json({
      success: true,
      cartId
    });
  } catch (error) {
    console.error('Error al obtener ID del carrito:', error);
    res.status(500).json({
      success: false,
      msg: 'Error al obtener ID del carrito'
    });
  }
};

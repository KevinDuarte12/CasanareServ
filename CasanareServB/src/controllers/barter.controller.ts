import { Request, Response } from 'express';
import { Op, QueryTypes } from 'sequelize'; // Añadir QueryTypes aquí
import Barter from '../db/models/barter';
import Product from '../db/models/product';
import User from '../db/models/user';
import sequelize from '../db/conection';
// Obtener todos los trueques
export const getBarters = async (req: Request, res: Response) => {
    try {
        const barters = await Barter.findAll({
            include: [
                {
                    model: Product,
                    as: 'offered_product',
                    attributes: ['id_product', 'name', 'price', 'description']
                },
                {
                    model: Product,
                    as: 'requested_product',
                    attributes: ['id_product', 'name', 'price', 'description']
                },
                {
                    model: User,
                    as: 'offering_user',
                    attributes: ['id', 'name', 'email']
                },
                {
                    model: User,
                    as: 'receiving_user',
                    attributes: ['id', 'name', 'email']
                }
            ],
            order: [['request_date', 'DESC']]
        });

        res.json(barters);
    } catch (error) {
        console.error('Error al obtener trueques:', error);
        res.status(500).json({
            msg: 'Error al obtener los trueques'
        });
    }
};

// Obtener un trueque por ID
export const getBarterById = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const barter = await Barter.findByPk(id, {
            include: [
                {
                    model: Product,
                    as: 'offered_product',
                    attributes: ['id_product', 'name', 'price', 'description']
                },
                {
                    model: Product,
                    as: 'requested_product',
                    attributes: ['id_product', 'name', 'price', 'description']
                },
                {
                    model: User,
                    as: 'offering_user',
                    attributes: ['id', 'name', 'email']
                },
                {
                    model: User,
                    as: 'receiving_user',
                    attributes: ['id', 'name', 'email']
                }
            ]
        });

        if (!barter) {
            return res.status(404).json({
                msg: `No existe un trueque con el ID ${id}`
            });
        }

        res.json(barter);
    } catch (error) {
        console.error('Error al obtener trueque:', error);
        res.status(500).json({
            msg: 'Error al obtener el trueque'
        });
    }
};

// Modificar tu controlador en el backend
export const createBarter = async (req: Request, res: Response) => {
  const { 
    productOffer, 
    id_prod_request, 
    id_user_offer, 
    id_user_receiving, 
    notes,
    useExistingProduct,
    id_prod_offer 
  } = req.body;

  try {
    // Verificar que los usuarios sean diferentes
    if (id_user_offer === id_user_receiving) {
      return res.status(400).json({
        msg: 'No puedes hacer un trueque contigo mismo'
      });
    }

    // Verificar si el producto solicitado existe y está disponible
    const prodRequest = await Product.findOne({ 
      where: { 
        id_product: id_prod_request,
        status: 'disponible'
      }
    });

    if (!prodRequest) {
      return res.status(400).json({
        msg: 'El producto solicitado no está disponible'
      });
    }

    let finalProdOfferId;

    // Si useExistingProduct es true, usar el id_prod_offer existente
    if (useExistingProduct && id_prod_offer) {
      // Verificar que el producto ofrecido exista
      const existingProduct = await Product.findByPk(id_prod_offer);
      if (!existingProduct) {
        return res.status(400).json({
          msg: 'El producto ofrecido no existe'
        });
      }
      
      finalProdOfferId = id_prod_offer;
      
      // Actualizar estado del producto existente
      await Product.update(
        { status: 'en_trueque' },
        { where: { id_product: id_prod_offer } }
      );
    } 
    // Si no, crear un nuevo producto para el trueque
    else {
      // Crear el producto ofrecido para el trueque
      const createdProduct = await Product.create({
        name: productOffer.name,
        description: productOffer.description,
        price: productOffer.value,
        stock: 1,
        id_user: id_user_offer,
        id_category: 1, // Categoría por defecto para trueques
        type: 'barter',
        status: 'en_trueque'
      });

      // Obtener el ID del producto y verificar que exista
      finalProdOfferId = createdProduct.getDataValue('id_product');
      if (!finalProdOfferId) {
        return res.status(500).json({
          msg: 'Error al crear el producto para el trueque'
        });
      }
    }

    // Ahora estamos seguros que finalProdOfferId es un número
    const barter = await Barter.create({
      id_prod_offer: finalProdOfferId,
      id_prod_request,
      id_user_offer,
      id_user_receiving,
      value: productOffer.value,
      status: 'pendiente',
      request_date: new Date(),
      notes: notes || ''
    });

    // Marcar producto solicitado como en_trueque
    await Product.update(
      { status: 'en_trueque' },
      { where: { id_product: id_prod_request } }
    );

    res.status(201).json({
      msg: 'Solicitud de trueque creada correctamente',
      barter
    });
  } catch (error) {
    console.error('Error al crear trueque:', error);
    res.status(500).json({
      msg: 'Error al crear el trueque'
    });
  }
};

// Actualizar el estado de un trueque
export const updateBarterStatus = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;

    console.log("Status recibido:", status); // Añadir para debugging
    console.log("Body completo:", req.body);
  
    // Si status es undefined, es posible que el frontend esté enviando un objeto distinto
    // Intenta buscar el status de otra forma como alternativa
    const statusToUse = status || req.body.estado || 'pendiente';

    // Validar que el nuevo estado sea válido
    const validStatus = ['pendiente', 'aceptado', 'rechazado', 'completado'];
    if (!statusToUse || !validStatus.includes(statusToUse)) {
        return res.status(400).json({
            msg: `El estado ${statusToUse} no es válido. Valores permitidos: ${validStatus.join(', ')}`
        });
    }

    try {
        // Verificar si existe el trueque
        const barter = await Barter.findByPk(id);
        if (!barter) {
            return res.status(404).json({
                msg: `No existe un trueque con el ID ${id}`
            });
        }

        // Actualizar el estado y fecha de resolución si es aceptado, rechazado o completado
        if (statusToUse !== 'pendiente') {
            await barter.update({
                status: statusToUse,
                resolution_date: new Date()
            });

            // Actualizar el estado de los productos según el nuevo estado del trueque
            const id_prod_offer = barter.getDataValue('id_prod_offer');
            const id_prod_request = barter.getDataValue('id_prod_request');

            if (statusToUse === 'completado') {
                // Si se completa el trueque, los productos pasan a estado "vendido"
                await Product.update(
                    { status: 'vendido' },
                    { where: { id_product: [id_prod_offer, id_prod_request] } }
                );
            } else if (statusToUse === 'rechazado') {
                // Si se rechaza, los productos vuelven a estar disponibles
                await Product.update(
                    { status: 'disponible' },
                    { where: { id_product: [id_prod_offer, id_prod_request] } }
                );
            }
        } else {
            // Si vuelve a pendiente, actualizar solo el estado
            await barter.update({ status: statusToUse });
        }

        res.json({
            msg: `Estado del trueque actualizado a ${statusToUse}`,
            barter
        });
    } catch (error) {
        console.error('Error al actualizar estado del trueque:', error);
        res.status(500).json({
            msg: 'Error al actualizar el estado del trueque'
        });
    }
};

// Eliminar un trueque (cancelar)
export const deleteBarter = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        // Verificar si existe el trueque
        const barter = await Barter.findByPk(id);
        if (!barter) {
            return res.status(404).json({
                msg: `No existe un trueque con el ID ${id}`
            });
        }

        // Solo permitir eliminar trueques pendientes
        if (barter.getDataValue('status') !== 'pendiente') {
            return res.status(400).json({
                msg: 'Solo se pueden eliminar trueques en estado pendiente'
            });
        }

        // Restaurar el estado de los productos a "disponible"
        const id_prod_offer = barter.getDataValue('id_prod_offer');
        const id_prod_request = barter.getDataValue('id_prod_request');

        await Product.update(
            { status: 'disponible' },
            { where: { id_product: [id_prod_offer, id_prod_request] } }
        );

        // Eliminar el trueque
        await barter.destroy();

        res.json({
            msg: 'Trueque eliminado correctamente'
        });
    } catch (error) {
        console.error('Error al eliminar trueque:', error);
        res.status(500).json({
            msg: 'Error al eliminar el trueque'
        });
    }
};

// Obtener trueques de un usuario específico
export const getUserBarters = async (req: Request, res: Response) => {
    const { userId } = req.params;

    try {
        const barters = await Barter.findAll({
            where: {
                [Op.or]: [
                    { id_user_offer: userId },
                    { id_user_receiving: userId }
                ]
            },
            include: [
                {
                    model: Product,
                    as: 'offered_product',
                    attributes: ['id_product', 'name', 'price', 'description', 'id_category']
                },
                {
                    model: Product,
                    as: 'requested_product',
                    attributes: ['id_product', 'name', 'price', 'description', 'id_category']
                },
                {
                    model: User,
                    as: 'offering_user',
                    attributes: ['id', 'name', 'email']
                },
                {
                    model: User,
                    as: 'receiving_user',
                    attributes: ['id', 'name', 'email']
                }
            ],
            order: [['request_date', 'DESC']]
        });

        res.json(barters);
    } catch (error) {
        console.error(`Error al obtener trueques del usuario ${userId}:`, error);
        res.status(500).json({
            msg: 'Error al obtener los trueques del usuario'
        });
    }
};

// Agregar esta función al final del archivo barter.controller.ts
export const createBarterPublication = async (req: Request, res: Response) => {
  const { id_prod_offer, id_user_offer, notes } = req.body;
  
  try {
    // Verificar que el producto existe
    const productExists = await Product.findByPk(id_prod_offer);
    if (!productExists) {
      return res.status(404).json({
        msg: `No existe un producto con el ID ${id_prod_offer}`
      });
    }
    
    // Verificar que el usuario existe
    const userExists = await User.findByPk(id_user_offer);
    if (!userExists) {
      return res.status(404).json({
        msg: `No existe un usuario con el ID ${id_user_offer}`
      });
    }
    
    // Asegurar que el producto sea de tipo 'barter'
    await productExists.update({ type: 'barter' });
    
    // Usar una consulta SQL directa para evitar problemas con valores nulos
    const [barterResult, metadata] = await sequelize.query(
      `INSERT INTO barters 
       (id_prod_offer, id_user_offer, status, request_date, notes, createdAt, updatedAt) 
       VALUES (?, ?, 'disponible', NOW(), ?, NOW(), NOW())`,
      {
        replacements: [
          id_prod_offer, 
          id_user_offer, 
          notes || 'Producto disponible para trueque'
        ],
        type: QueryTypes.INSERT // Usar QueryTypes directamente
      }
    );
    
    // Obtener el ID del barter recién creado
    const barterId = barterResult;
    
    // Opcional: Cargar el objeto Barter completo para devolverlo en la respuesta
    const createdBarter = await Barter.findByPk(barterId);
    
    res.status(201).json({
      msg: 'Publicación de trueque creada correctamente',
      barter: createdBarter
    });
  } catch (error) {
    console.error('Error al crear publicación de trueque:', error);
    res.status(500).json({
      msg: 'Error al crear la publicación de trueque',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};
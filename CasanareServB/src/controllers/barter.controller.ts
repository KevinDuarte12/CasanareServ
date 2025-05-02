import { Request, Response } from 'express';
import { Op, QueryTypes } from 'sequelize'; // Añadir QueryTypes aquí
import Barter from '../db/models/barter';
import Product from '../db/models/product';
import User from '../db/models/user';
import Notification from '../db/models/notifications'; // Añadir esta importación al principio del archivo
import Image from '../db/models/image'; // Añadir esta línea
import sequelize from '../db/conection';
// Importar funciones de Socket.IO
import { getSocketServer, sendNotificationToUser, emitBarterUpdate } from '../sockets/socket';

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

// Modificar el controlador createBarter para manejar correctamente los casos donde productOffer no existe
export const createBarter = async (req: Request, res: Response) => {
  const { 
    productOffer, 
    id_prod_request, 
    id_user_offer, 
    id_user_receiving, 
    notes,
    useExistingProduct,
    id_prod_offer,
    status // Asegúrate de recibir el status también
  } = req.body;

  try {
    // Verificar que los usuarios sean diferentes
    if (id_user_offer === id_user_receiving) {
      return res.status(400).json({
        msg: 'No puedes hacer un trueque contigo mismo'
      });
    }

    // Verificar si el producto solicitado existe y está disponible cuando hay un id_prod_request
    if (id_prod_request) {
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
      
      // MODIFICACIÓN: Marcar estado pendiente para que quede en espera
      await Product.update(
        { 
          status: 'pendiente',
          has_pending_barters: true 
        },
        { where: { id_product: id_prod_offer } }
      );
    } 
    // Si no, crear un nuevo producto para el trueque (solo si productOffer existe)
    else if (productOffer && productOffer.name) {
      // Crear el producto ofrecido para el trueque
      const createdProduct = await Product.create({
        name: productOffer.name,
        description: productOffer.description,
        price: productOffer.value,
        stock: 1,
        id_user: id_user_offer,
        id_category: 1, // Categoría por defecto para trueques
        type: 'barter',
        status: 'pendiente',
        has_pending_barters: true
      });

      // Obtener el ID del producto y verificar que exista
      finalProdOfferId = createdProduct.getDataValue('id_product');
      if (!finalProdOfferId) {
        return res.status(500).json({
          msg: 'Error al crear el producto para el trueque'
        });
      }
    } else if (id_prod_offer) {
      // Si no hay productOffer pero hay id_prod_offer, usarlo directamente
      finalProdOfferId = id_prod_offer;
    } else {
      return res.status(400).json({
        msg: 'Debe proporcionar un producto para el trueque'
      });
    }

    // Ahora estamos seguros que finalProdOfferId es un número
    const barter = await Barter.create({
      id_prod_offer: finalProdOfferId,
      id_prod_request: id_prod_request || null,
      id_user_offer: id_user_offer,
      id_user_receiving: id_user_receiving || null,
      value: productOffer?.value || 0,
      status: status || 'pendiente',
      request_date: new Date(),
      notes: notes || ''
    });

    // MODIFICACIÓN: Cambiar el producto solicitado a pendiente
    if (id_prod_request) {
      await Product.update(
        { 
          status: 'pendiente',
          has_pending_barters: true 
        },
        { where: { id_product: id_prod_request } }
      );
    }

    // MODIFICACIÓN: Log para diagnóstico
    console.log('Creando notificación para trueque:', {
      barterID: barter.id_barter || barter.getDataValue('id_barter'), 
      userReceiving: id_user_receiving
    });
    
    // Crear notificación para el receptor del trueque
    if (id_user_receiving) {
      try {
        // Cargar información adicional para una notificación más rica
        const offeringUser = await User.findByPk(id_user_offer);
        const offeringUserName = offeringUser?.get('name') || 'Un usuario';
        
        const requestedProduct = id_prod_request ? await Product.findByPk(id_prod_request) : null;
        const productName = requestedProduct?.get('name') || 'tu producto';
        
        // Crear directamente la notificación
        await Notification.create({
          id_user: id_user_receiving,
          type: 'new_barter',
          title: 'Nueva propuesta de trueque recibida',
          message: `${offeringUserName} te ha propuesto un trueque por ${productName}`,
          entity_type: 'barter',
          entity_id: barter.getDataValue('id_barter'),
          action_url: `/barters/${barter.getDataValue('id_barter')}`,
          is_read: false
        });
        
        console.log(`✅ Notificación creada para el usuario ${id_user_receiving}`);
      } catch (notificationError) {
        console.error('❌ Error al crear notificación:', notificationError);
      }
    }
    
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

// Función para actualizar un trueque completo (no solo su estado)
export const updateBarter = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { 
        id_prod_offer, 
        id_prod_request, 
        id_user_offer, 
        id_user_receiving, 
        status,
        value,
        notes 
    } = req.body;

    try {
        // Verificar si existe el trueque
        const barter = await Barter.findByPk(id);
        if (!barter) {
            return res.status(404).json({
                msg: `No existe un trueque con el ID ${id}`
            });
        }

        // Verificar que los usuarios sean diferentes
        if (id_user_offer === id_user_receiving) {
            return res.status(400).json({
                msg: 'No puedes hacer un trueque contigo mismo'
            });
        }

        // Obtener los productos actuales del trueque antes de la actualización
        const currentProdOffer = barter.getDataValue('id_prod_offer');
        const currentProdRequest = barter.getDataValue('id_prod_request');

        // Si los productos cambian, actualizar sus estados
        if (currentProdOffer && currentProdOffer !== id_prod_offer) {
            // El producto anterior vuelve a disponible
            await Product.update(
                { status: 'disponible' },
                { where: { id_product: currentProdOffer } }
            );
            
            // El nuevo producto pasa a en_trueque
            if (id_prod_offer) {
                await Product.update(
                    { status: 'en_trueque' },
                    { where: { id_product: id_prod_offer } }
                );
            }
        }

        if (currentProdRequest && currentProdRequest !== id_prod_request) {
            // El producto anterior vuelve a disponible
            await Product.update(
                { status: 'disponible' },
                { where: { id_product: currentProdRequest } }
            );
            
            // El nuevo producto pasa a en_trueque
            if (id_prod_request) {
                await Product.update(
                    { status: 'en_trueque' },
                    { where: { id_product: id_prod_request } }
                );
            }
        }

        // Actualizar el trueque
        await barter.update({
            id_prod_offer,
            id_prod_request,
            id_user_offer,
            id_user_receiving,
            status,
            value,
            notes,
            // Si el estado cambió a algo definitivo, actualizar la fecha de resolución
            ...(status !== 'pendiente' && { resolution_date: new Date() })
        });

        res.json({
            msg: 'Trueque actualizado correctamente',
            barter
        });
    } catch (error) {
        console.error('Error al actualizar trueque:', error);
        res.status(500).json({
            msg: 'Error al actualizar el trueque'
        });
    }
};

// Modificación de la función updateBarterStatus
export const updateBarterStatus = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;

    console.log("Status recibido:", status);
    console.log("Body completo:", req.body);
  
    const statusToUse = status || req.body.estado || 'pendiente';

    // Validar que el nuevo estado sea válido
    const validStatus = ['pendiente', 'aceptado', 'rechazado', 'completado', 'aprobado_admin'];
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

        // Actualizar el estado y fecha de resolución según corresponda
        if (statusToUse !== 'pendiente') {
            await barter.update({
                status: statusToUse,
                resolution_date: ['aceptado', 'rechazado', 'completado', 'aprobado_admin'].includes(statusToUse) ? new Date() : null
            });

            // Obtener IDs de productos involucrados
            const id_prod_offer = barter.getDataValue('id_prod_offer');
            const id_prod_request = barter.getDataValue('id_prod_request');
            const productIds = [id_prod_offer, id_prod_request].filter(id => id !== null && id !== undefined);

            // Manejar diferentes casos según el estado
            if (statusToUse === 'rechazado') {
                // Si se rechaza, los productos vuelven a estar disponibles
                if (productIds.length > 0) {
                    await Product.update(
                        { 
                            status: 'disponible',
                            has_pending_barters: false 
                        },
                        { where: { id_product: { [Op.in]: productIds } } }
                    );
                }
            } else if (statusToUse === 'aceptado') {
                // Si lo acepta el usuario receptor, pasa a en_trueque mientras espera aprobación del admin
                if (productIds.length > 0) {
                    await Product.update(
                        { 
                            status: 'en_trueque',
                            has_pending_barters: true 
                        },
                        { where: { id_product: { [Op.in]: productIds } } }
                    );
                }
            } else if (statusToUse === 'aprobado_admin') {
                // Si el admin lo aprueba, mantener en en_trueque pero actualizar otro campo
                if (productIds.length > 0) {
                    await Product.update(
                        { 
                            status: 'en_trueque',
                            admin_approved: true,
                            has_pending_barters: true
                        },
                        { where: { id_product: { [Op.in]: productIds } } }
                    );
                }
            } else if (statusToUse === 'completado') {
                // Si se completa el trueque, los productos pasan a estado "vendido"
                if (productIds.length > 0) {
                    await Product.update(
                        { 
                            status: 'vendido', 
                            admin_approved: false,
                            has_pending_barters: false 
                        },
                        { where: { id_product: { [Op.in]: productIds } } }
                    );
                }
            }
        } else {
            // Si vuelve a pendiente, solo actualizar el estado del trueque
            await barter.update({ status: statusToUse });
        }

        // Crear notificación para el cambio de estado
        await createNotificationForBarterStatus(barter, statusToUse);
    
        // Después de actualizar el barter, busca y devuelve el barter actualizado
        const updatedBarter = await Barter.findByPk(id, {
            include: [
                // incluir relaciones...
            ]
        });

        res.json({
            msg: `Estado del trueque actualizado a ${statusToUse}`,
            barter: updatedBarter
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

        // MODIFICAR ESTA PARTE - Usar Op.in correctamente
        // Filtrar IDs nulos o indefinidos antes de la consulta
        const productIds = [id_prod_offer, id_prod_request].filter(id => id !== null && id !== undefined);
        
        if (productIds.length > 0) {
            await Product.update(
                { status: 'disponible' },
                { where: { id_product: { [Op.in]: productIds } } }
            );
        }

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

// Añade esta función al final del archivo
async function createNotificationForBarter(barter: any, action: string): Promise<void> {
  try {
    // Obtener detalles adicionales para la notificación
    const offeredProduct = await Product.findByPk(barter.id_prod_offer);
    let receivingUser, offeringUser;
    
    // Buscar usuarios solo si tenemos sus IDs
    if (barter.id_user_offer) {
      offeringUser = await User.findByPk(barter.id_user_offer);
    }
    
    if (barter.id_user_receiving) {
      receivingUser = await User.findByPk(barter.id_user_receiving);
    }
    
    // Inicializar con valores predeterminados para evitar undefined
    let title: string = "Notificación de trueque";
    let message: string = "Hay una actualización en tu trueque.";
    let recipientId: number | undefined;
    
    // Obtener nombres de forma segura (para evitar errores de TypeScript)
    const offeringUserName = offeringUser?.get('name') || 'Un usuario';
    const receivingUserName = receivingUser?.get('name') || 'El usuario';
    const productName = offeredProduct?.get('name') || 'producto';
    
    switch (action) {
      case 'new_barter': // Nuevo trueque propuesto
        if (!barter.id_user_receiving) return; // No hay receptor específico
        
        title = `Nuevo trueque propuesto`;
        message = `${offeringUserName} quiere realizar un trueque contigo por tu producto.`;
        recipientId = barter.id_user_receiving;
        break;
      
      case 'status_updated': // Actualización de estado
        if (barter.status === 'aceptado') {
          title = `¡Trueque aceptado!`;
          message = `${receivingUserName} ha aceptado tu propuesta de trueque.`;
          recipientId = barter.id_user_offer;
        } else if (barter.status === 'rechazado') {
          title = `Trueque rechazado`;
          message = `${receivingUserName} ha rechazado tu propuesta de trueque.`;
          recipientId = barter.id_user_offer;
        } else if (barter.status === 'completado') {
          title = `Trueque completado`;
          
          // Notificar a ambos usuarios
          if (barter.id_user_offer) {
            await Notification.create({
              id_user: barter.id_user_offer,
              type: 'barter_status',
              title: "Trueque completado",
              message: `Tu trueque con ${receivingUserName} ha sido completado.`,
              entity_type: 'barter',
              entity_id: barter.id_barter || barter.id,
              action_url: `/barters/${barter.id_barter || barter.id}`,
              is_read: false
            });
          }
          
          recipientId = barter.id_user_receiving;
          message = `Tu trueque con ${offeringUserName} ha sido completado.`;
          title = "Trueque completado";
        }
        break;
      
      case 'barter_response': // Respuesta a una publicación de trueque
        title = `Respuesta a tu publicación de trueque`;
        message = `Un usuario quiere hacer un trueque con tu producto ${productName}.`;
        recipientId = barter.id_user_offer;
        break;
    }
    
    // Solo crear notificación si tenemos un destinatario
    if (recipientId) {
      await Notification.create({
        id_user: recipientId,
        type: action,
        title,
        message,
        entity_type: 'barter',
        entity_id: barter.id_barter || barter.id,
        action_url: `/barters/${barter.id_barter || barter.id}`,
        is_read: false
      });
    }
  } catch (error) {
    console.error('Error al crear notificación para trueque:', error);
    // No lanzar error para no interrumpir el flujo principal
  }
}
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

// Añade este controlador al final del archivo
export const checkExistingProposal = async (req: Request, res: Response) => {
  try {
    const { userId, productId } = req.query;
    
    // Validar parámetros
    if (!userId || !productId) {
      return res.status(400).json({
        msg: 'Se requieren userId y productId',
        exists: false
      });
    }
    
    // Buscar si existe una propuesta pendiente para este usuario y producto
    const existingProposal = await Barter.findOne({
      where: {
        id_user_offer: parseInt(userId as string),
        id_prod_request: parseInt(productId as string),
        status: 'pendiente'
      }
    });
    
    // Responder si existe o no
    return res.status(200).json({
      exists: !!existingProposal,
      proposal: existingProposal ? {
        id: existingProposal.id_barter,
        status: existingProposal.status,
        date: existingProposal.request_date
      } : null
    });
  } catch (error: any) {
    console.error('Error al verificar propuesta existente:', error);
    return res.status(500).json({
      msg: 'Error al verificar propuesta existente',
      exists: false
    });
  }
};

// Función especializada para crear notificaciones de estado
async function createNotificationForBarterStatus(barter: any, newStatus: string): Promise<void> {
  try {
    // Obtener detalles adicionales
    const offeredProduct = await Product.findByPk(barter.id_prod_offer);
    const requestedProduct = barter.id_prod_request ? await Product.findByPk(barter.id_prod_request) : null;
    
    let receivingUser, offeringUser;
    
    if (barter.id_user_offer) {
      offeringUser = await User.findByPk(barter.id_user_offer);
    }
    
    if (barter.id_user_receiving) {
      receivingUser = await User.findByPk(barter.id_user_receiving);
    }
    
    const offeringUserName = offeringUser?.get('name') || 'Un usuario';
    const receivingUserName = receivingUser?.get('name') || 'El usuario';
    
    const offeredProductName = offeredProduct?.get('name') || 'producto ofrecido';
    const requestedProductName = requestedProduct?.get('name') || 'producto solicitado';
    
    let title = "";
    let message = "";
    let recipientId: number | null = null;
    
    // Obtener servidor Socket.IO
    const io = getSocketServer();
    
    // Emitir actualización del trueque a través de WebSocket
    if (io && barter.id_user_offer) {
      emitBarterUpdate(
        io, 
        barter.id_barter, 
        newStatus,
        barter.id_user_offer,
        barter.id_user_receiving
      );
    }
    
    switch (newStatus) {
      case 'aceptado':
        // Notificar al oferente que su propuesta fue aceptada
        title = "Propuesta de trueque aceptada";
        message = `${receivingUserName} ha aceptado tu propuesta de trueque para intercambiar "${offeredProductName}" por "${requestedProductName}". Ahora está pendiente de aprobación administrativa.`;
        recipientId = barter.id_user_offer;
        break;
        
      case 'rechazado':
        // Notificar al oferente que su propuesta fue rechazada
        title = "Propuesta de trueque rechazada";
        message = `${receivingUserName} ha rechazado tu propuesta de trueque para "${requestedProductName}".`;
        recipientId = barter.id_user_offer;
        break;
        
      case 'aprobado_admin':
        // Notificar a ambos usuarios
        if (barter.id_user_offer) {
          await Notification.create({
            id_user: barter.id_user_offer,
            type: 'barter_approved_admin',
            title: "Trueque aprobado por administración",
            message: `Tu trueque de "${offeredProductName}" por "${requestedProductName}" ha sido aprobado por la administración. Puedes proceder con el intercambio.`,
            entity_type: 'barter',
            entity_id: barter.id_barter,
            action_url: `/barters/${barter.id_barter}`,
            is_read: false
          });
        }
        
        // Notificar al receptor
        title = "Trueque aprobado por administración";
        message = `El trueque de "${requestedProductName}" por "${offeredProductName}" ha sido aprobado por la administración. Puedes proceder con el intercambio.`;
        recipientId = barter.id_user_receiving;
        break;
        
      case 'completado':
        // Notificar a ambos usuarios
        if (barter.id_user_offer) {
          await Notification.create({
            id_user: barter.id_user_offer,
            type: 'barter_completed',
            title: "Trueque completado",
            message: `Tu trueque de "${offeredProductName}" por "${requestedProductName}" ha sido marcado como completado.`,
            entity_type: 'barter',
            entity_id: barter.id_barter,
            action_url: `/barters/${barter.id_barter}`,
            is_read: false
          });
        }
        
        // Notificar al receptor
        title = "Trueque completado";
        message = `El trueque de "${requestedProductName}" por "${offeredProductName}" ha sido marcado como completado.`;
        recipientId = barter.id_user_receiving;
        break;
    }
    
    // Crear notificación si tenemos un destinatario y mensaje
    if (recipientId && title && message) {
      try {
        const notification = await Notification.create({
          id_user: recipientId,
          type: `barter_${newStatus}`,
          title,
          message,
          entity_type: 'barter',
          entity_id: barter.id_barter || barter.getDataValue('id_barter'),
          action_url: `/barters/${barter.id_barter || barter.getDataValue('id_barter')}`,
          is_read: false
        });
        
        console.log(`✅ Notificación de trueque creada con ID: ${notification.getDataValue('id_notification')}`);
        
        // Enviar notificación en tiempo real
        if (io) {
          try {
            sendNotificationToUser(io, recipientId, notification);
            console.log(`✅ Notificación enviada por socket a usuario ${recipientId}`);
          } catch (socketError) {
            console.error('❌ Error enviando notificación por socket:', socketError);
          }
        }
      } catch (notifError) {
        console.error('❌ Error creando notificación en la base de datos:', notifError);
      }
    }
  } catch (error) {
    console.error(`❌ Error al crear notificación para estado ${newStatus}:`, error);
  }
}

// Obtener trueques pendientes de aprobación por un admin
export const getBartersPendingAdminApproval = async (req: Request, res: Response) => {
  try {
    const barters = await Barter.findAll({
      where: { status: 'aceptado' }, // Trueques aceptados esperando aprobación de admin
      include: [
        {
          model: Product,
          as: 'offered_product',
          attributes: ['id_product', 'name', 'price', 'description', 'status'],
          include: [
            {
              model: Image,
              as: 'images',
              attributes: ['id', 'url', 'is_main'],
              required: false,
              where: { entity_type: 'product' }, // Filtro para imágenes de productos
              limit: 1 // Solo necesitamos una imagen por producto
            }
          ]
        },
        {
          model: Product,
          as: 'requested_product',
          attributes: ['id_product', 'name', 'price', 'description', 'status'],
          include: [
            {
              model: Image,
              as: 'images',
              attributes: ['id', 'url', 'is_main'],
              required: false,
              where: { entity_type: 'product' },
              limit: 1
            }
          ]
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
    console.error('Error al obtener trueques pendientes de aprobación:', error);
    res.status(500).json({
      msg: 'Error al obtener los trueques pendientes de aprobación'
    });
  }
};

// Obtener trueques filtrados por estado
export const getBartersByStatus = async (req: Request, res: Response) => {
  const { status } = req.params;
  
  try {
    // Validar que el estado sea válido
    const validStatus = ['pendiente', 'aceptado', 'rechazado', 'completado', 'aprobado_admin', 'disponible'];
    if (!validStatus.includes(status)) {
      return res.status(400).json({
        msg: `El estado ${status} no es válido. Valores permitidos: ${validStatus.join(', ')}`
      });
    }
    
    // Filtrar por estado (sin incluir imágenes)
    const barters = await Barter.findAll({
      where: { status },
      include: [
        {
          model: Product,
          as: 'offered_product',
          attributes: ['id_product', 'name', 'price', 'description', 'status']
        },
        {
          model: Product,
          as: 'requested_product',
          attributes: ['id_product', 'name', 'price', 'description', 'status']
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
    console.error(`Error al obtener trueques con estado ${status}:`, error);
    res.status(500).json({
      msg: `Error al obtener los trueques con estado ${status}`
    });
  }
};
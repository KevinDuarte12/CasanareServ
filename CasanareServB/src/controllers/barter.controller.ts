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
    status,
    // Añadir estos dos campos
    exchange_type, 
    value
  } = req.body;

  try {
    console.log('🔍 Entrando a createBarter con datos:', { 
      useExistingProduct, 
      id_prod_offer, 
      id_prod_request,
      id_user_offer,
      id_user_receiving,
      // Añadir estos campos al log
      exchange_type,
      value
    });
    
    // Verificar que los usuarios sean diferentes
    if (id_user_offer === id_user_receiving) {
      return res.status(400).json({
        msg: 'No puedes hacer un trueque contigo mismo'
      });
    }

    // Verificar si el producto solicitado existe y está disponible (cuando hay uno)
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
    } 
    // Si no, crear un nuevo producto para el trueque (solo si productOffer existe)
    else if (productOffer && productOffer.name) {
      // PUNTO CLAVE 1: Verificar si ya existe un producto similar para evitar duplicados
      if (id_user_offer) {
        const similarProduct = await Product.findOne({
          where: {
            name: productOffer.name,
            id_user: id_user_offer,
            type: 'barter'
          }
        });
        
        if (similarProduct) {
          finalProdOfferId = similarProduct.getDataValue('id_product');
          console.log(`✅ Se encontró un producto similar existente ID: ${finalProdOfferId}`);
        }
      }
      
      // Si no se encontró un producto similar, crear uno nuevo
      if (!finalProdOfferId) {
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

        finalProdOfferId = createdProduct.getDataValue('id_product');
        if (!finalProdOfferId) {
          return res.status(500).json({
            msg: 'Error al crear el producto para el trueque'
          });
        }
        
        console.log(`✅ Nuevo producto creado con ID: ${finalProdOfferId}`);
      }
    } else if (id_prod_offer) {
      // Si no hay productOffer pero hay id_prod_offer, usarlo directamente
      finalProdOfferId = id_prod_offer;
    } else {
      return res.status(400).json({
        msg: 'Debe proporcionar un producto para el trueque'
      });
    }

    // PUNTO CLAVE 2: Verificar si ya existe un barter para este producto
    const existingBarter = await Barter.findOne({
      where: {
        id_prod_offer: finalProdOfferId
      }
    });

    // Determinar el tipo de intercambio si no se proporciona
    let finalExchangeType = exchange_type || 'product_for_product';
    
    // Si hay un valor monetario significativo sin tipo explícito, asumimos que es product_with_money
    if (!exchange_type && value && value > 0) {
      finalExchangeType = id_prod_offer === -1 ? 'money_only' : 'product_with_money';
    }
    
    // Si el id_prod_offer es -1 (caso especial), es una oferta de solo dinero
    if (id_prod_offer === -1) {
      finalExchangeType = 'money_only';
    }

    let barter;

    // Si existe un barter, actualizarlo en lugar de crear uno nuevo
    if (existingBarter) {
      console.log(`⚠️ SE ENCONTRÓ UN BARTER EXISTENTE ID ${existingBarter.getDataValue('id_barter')} - ACTUALIZANDO`);
      
      // PUNTO CLAVE 3: Actualizar en lugar de crear
      barter = await existingBarter.update({
        id_prod_request: id_prod_request || existingBarter.getDataValue('id_prod_request'),
        id_user_receiving: id_user_receiving || existingBarter.getDataValue('id_user_receiving'),
        value: value || productOffer?.value || existingBarter.getDataValue('value') || 0,
        status: status || 'pendiente',
        request_date: new Date(),
        notes: notes || existingBarter.getDataValue('notes') || '',
        exchange_type: finalExchangeType
      });
      
      console.log(`✅ Barter actualizado con éxito, ID: ${barter.getDataValue('id_barter')}`);
    } else {
      // Crear un nuevo barter solo si no existe
      console.log(`🆕 Creando nuevo barter para producto ${finalProdOfferId}, tipo: ${finalExchangeType}`);
      
      try {
        barter = await Barter.create({
          id_prod_offer: finalProdOfferId,
          id_prod_request: id_prod_request || null,
          id_user_offer: id_user_offer,
          id_user_receiving: id_user_receiving || null,
          value: value || productOffer?.value || 0,
          status: status || 'pendiente',
          request_date: new Date(),
          notes: notes || '',
          exchange_type: finalExchangeType // Añadir el tipo de intercambio
        });
        
        console.log(`✅ Nuevo barter creado con ID: ${barter.getDataValue('id_barter')}`);
      } catch (createError: any) {
        // En caso de error de duplicidad, hacer una última verificación
        if (createError.name === 'SequelizeUniqueConstraintError') {
          console.log(`⚠️ Detectada condición de carrera. Buscando barter existente...`);
          
          // Última verificación para condición de carrera
          const lastChanceBarter = await Barter.findOne({
            where: { id_prod_offer: finalProdOfferId }
          });
          
          if (lastChanceBarter) {
            // Actualizar el barter encontrado
            barter = await lastChanceBarter.update({
              id_prod_request: id_prod_request || lastChanceBarter.getDataValue('id_prod_request'),
              id_user_receiving: id_user_receiving || lastChanceBarter.getDataValue('id_user_receiving'),
              value: value || productOffer?.value || lastChanceBarter.getDataValue('value') || 0,
              status: status || 'pendiente',
              request_date: new Date(),
              notes: notes || lastChanceBarter.getDataValue('notes') || '',
              exchange_type: finalExchangeType
            });
            
            console.log(`✅ Barter recuperado y actualizado, ID: ${barter.getDataValue('id_barter')}`);
          } else {
            throw new Error('No se pudo crear ni actualizar el barter');
          }
        } else {
          // Otro tipo de error, relanzarlo
          throw createError;
        }
      }
    }

    // Cambiar el producto solicitado a pendiente
    if (id_prod_request) {
      await Product.update(
        { 
          status: 'pendiente',
          has_pending_barters: true 
        },
        { where: { id_product: id_prod_request } }
      );
      
      console.log(`✅ Producto solicitado ${id_prod_request} marcado como pendiente`);
    }

    // Crear notificación para el receptor
    if (id_user_receiving) {
      await createNotificationForBarter(barter, 'new_barter');
      console.log(`✅ Notificación creada para usuario ${id_user_receiving}`);
    }
    
    // Incluir información completa en la respuesta
    const completeBarterData = await Barter.findByPk(barter.getDataValue('id_barter'), {
      include: [
        { model: Product, as: 'offered_product' },
        { model: Product, as: 'requested_product' },
        { model: User, as: 'offering_user' },
        { model: User, as: 'receiving_user' }
      ]
    });
    
    res.status(201).json({
      msg: existingBarter ? 'Solicitud de trueque actualizada correctamente' : 'Solicitud de trueque creada correctamente',
      barter: completeBarterData
    });
    
  } catch (error) {
    // Agregar mejor manejo de errores con tipado
    const typedError = error as Error & { name?: string };
    
    console.error('❌ Error en createBarter:', typedError);
    console.error(typedError.stack || 'No stack trace disponible');
    
    res.status(500).json({
      msg: 'Error al procesar la solicitud de trueque',
      error: typedError.message || 'Error desconocido'
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
        notes,
        exchange_type // Añadir este campo
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
            exchange_type, // Añadir este campo
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
    
    // Extraer el status con verificación más detallada
    console.log("⚠️ Depuración: Body completo:", req.body);
    console.log("⚠️ Depuración: Tipo de req.body:", typeof req.body);
    
    // Si req.body es un string, tratar de parsearlo
    let bodyData = req.body;
    if (typeof req.body === 'string') {
        try {
            bodyData = JSON.parse(req.body);
            console.log("⚠️ Body parseado:", bodyData);
        } catch (e) {
            console.error("⚠️ Error parseando body:", e);
        }
    }
    
    // Extraer status con mejor manejo de casos
    let statusToUse;
    
    if (bodyData && bodyData.status !== undefined) {
        statusToUse = bodyData.status;
        console.log("✅ Usando status del body:", statusToUse);
    } else if (bodyData && bodyData.estado !== undefined) {
        statusToUse = bodyData.estado;
        console.log("✅ Usando estado del body:", statusToUse);
    } else {
        // Si es el caso específico de aprobado_admin, forzarlo
        if (req.originalUrl.includes('/status') && req.method === 'PATCH') {
            const adminApprovalAttempt = req.body.toString().includes('aprobado_admin');
            if (adminApprovalAttempt) {
                statusToUse = 'aprobado_admin';
                console.log("✅ Detectado intento de aprobación admin, forzando estado:", statusToUse);
            } else {
                statusToUse = 'pendiente';
                console.log("⚠️ No se encontró status ni estado, usando valor por defecto:", statusToUse);
            }
        } else {
            statusToUse = 'pendiente';
            console.log("⚠️ No se encontró status ni estado, usando valor por defecto:", statusToUse);
        }
    }

    // Añadir disponible a la lista de estados válidos
    const validStatus = ['pendiente', 'aceptado', 'rechazado', 'completado', 'aprobado_admin', 'disponible'];
    if (!validStatus.includes(statusToUse)) {
        console.error(`❌ Estado inválido: ${statusToUse}`);
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
// Añadir este endpoint en barter.controller.ts
export const proposeForExistingBarter = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { id_prod_request, id_user_receiving, notes, exchange_type, value } = req.body;

  console.log(`🔍 proposeForExistingBarter: Recibida propuesta para trueque ID: ${id}`, {
    id_prod_request,
    id_user_receiving,
    exchange_type,
    value,
    params: req.params,
    url: req.originalUrl
  });

  try {
    // Buscar el trueque existente
    const barter = await Barter.findByPk(id);

    if (!barter) {
      console.log(`❌ No existe trueque con ID: ${id}`);
      return res.status(404).json({
        msg: `No existe un trueque con el ID ${id}`
      });
    }

    console.log(`✅ Barter encontrado: ID ${barter.id_barter}, estado: ${barter.status}`);

    // Verificar que el trueque esté disponible
    if (barter.status !== 'disponible') {
      console.log(`❌ Trueque no disponible, estado actual: ${barter.status}`);
      return res.status(400).json({
        msg: 'Este trueque ya no está disponible para propuestas'
      });
    }

    // IMPORTANTE: Actualizar el trueque existente
    console.log(`🔄 Actualizando barter ${id} con:`, {
      id_prod_request,
      id_user_receiving,
      status: 'pendiente',
      exchange_type,
      value
    });
    
    await barter.update({
      id_prod_request,
      id_user_receiving,
      status: 'pendiente',
      notes: notes || barter.notes,
      request_date: new Date(),
      exchange_type: exchange_type || barter.exchange_type || 'product_for_product',
      value: value !== undefined ? value : barter.value
    });

    console.log(`✅ Trueque actualizado correctamente`);

    // Crear notificación para el usuario oferente
    await createNotificationForBarter(barter, 'barter_response');

    // Marcar productos como pendientes
    await Product.update(
      { status: 'pendiente', has_pending_barters: true },
      { where: { id_product: barter.id_prod_offer } }
    );

    if (id_prod_request) {
      await Product.update(
        { status: 'pendiente', has_pending_barters: true },
        { where: { id_product: id_prod_request } }
      );
    }

    // Responder con el trueque actualizado
    const updatedBarter = await Barter.findByPk(id, {
      include: [
        { model: Product, as: 'offered_product' },
        { model: Product, as: 'requested_product' },
        { model: User, as: 'offering_user' },
        { model: User, as: 'receiving_user' }
      ]
    });

    res.json({
      msg: 'Propuesta de trueque enviada correctamente',
      barter: updatedBarter
    });
  } catch (error) {
    console.error('❌ Error en proposeForExistingBarter:', error);
    res.status(500).json({
      msg: 'Error al enviar la propuesta de trueque',
      error: error instanceof Error ? error.message : 'Error desconocido'
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
  const { id_prod_offer, id_user_offer, notes, exchange_type, value } = req.body;
  
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
       (id_prod_offer, id_user_offer, status, request_date, notes, exchange_type, value, createdAt, updatedAt) 
       VALUES (?, ?, 'disponible', NOW(), ?, ?, ?, NOW(), NOW())`,
      {
        replacements: [
          id_prod_offer, 
          id_user_offer, 
          notes || 'Producto disponible para trueque',
          exchange_type || 'product_for_product',
          value || 0
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
    
    // Añadir información sobre tipo de intercambio y valor monetario al mensaje
    let extraInfo = '';
    
    if (barter.exchange_type === 'product_with_money' && barter.value > 0) {
      extraInfo = ` con un adicional de ${barter.value} pesos`;
    } else if (barter.exchange_type === 'money_only' && barter.value > 0) {
      extraInfo = ` por un valor de ${barter.value} pesos`;
    }
    
    // Modificar mensajes según el estado
    switch (newStatus) {
      case 'aceptado':
        // Modificar el mensaje para incluir tipo de intercambio
        if (barter.exchange_type === 'money_only') {
          message = `${receivingUserName} ha aceptado tu oferta monetaria de ${barter.value} pesos por "${requestedProductName}". Ahora está pendiente de aprobación administrativa.`;
        } else if (barter.exchange_type === 'product_with_money') {
          message = `${receivingUserName} ha aceptado tu propuesta de trueque para intercambiar "${offeredProductName}" por "${requestedProductName}"${extraInfo}. Ahora está pendiente de aprobación administrativa.`;
        } else {
          // Mantener mensaje original
          message = `${receivingUserName} ha aceptado tu propuesta de trueque para intercambiar "${offeredProductName}" por "${requestedProductName}". Ahora está pendiente de aprobación administrativa.`;
        }
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
// Añadir al final del archivo
export const getBartersByProductOffered = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    
    console.log(`🔍 Buscando barters donde el producto ofrecido es: ${productId}`);
    
    if (!productId || isNaN(Number(productId))) {
      return res.status(400).json({
        msg: 'ID de producto inválido'
      });
    }
    
    // Buscar barters donde este producto es el producto ofrecido
    const barters = await Barter.findAll({
      where: {
        id_prod_offer: productId,
        // Filtrar solo los que están disponibles o pendientes
        status: {
          [Op.in]: ['disponible', 'pendiente']
        }
      },
      include: [
        { model: Product, as: 'offered_product' },
        { model: Product, as: 'requested_product' },
        { model: User, as: 'offering_user' },
        { model: User, as: 'receiving_user' }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    console.log(`✅ Se encontraron ${barters.length} barters para el producto ${productId}`);
    
    res.json(barters);
  } catch (error) {
    console.error(`❌ Error buscando barters para producto:`, error);
    res.status(500).json({
      msg: 'Error al buscar trueques por producto ofrecido',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};
// Importaciones para manejar solicitudes y respuestas HTTP en Express
import { Request, Response } from 'express';
// Operadores de Sequelize para consultas (como búsquedas con condiciones)
import { Op } from 'sequelize';
// Modelos de base de datos:
import Barter from '../db/models/barter'; // Modelo de trueques/intercambios
import Product from '../db/models/product'; // Modelo de productos
import User from '../db/models/user'; // Modelo de usuarios
import Notification from '../db/models/notifications'; // Modelo de notificaciones
import Image from '../db/models/image';  // Modelo de imágenes
import DeliveryAddress from '../db/models/deliveryAddress'; // Modelo de direcciones de envío
// Utilidades para Socket.IO:
import { getSocketServer, emitBarterUpdate } from '../sockets/socket';  // Funciones para emitir actualizaciones en tiempo real
/**
 * Obtiene todos los trueques registrados en el sistema con información completa
 * de productos y usuarios involucrados para uso administrativo
 */
export const getBarters = async (req: Request, res: Response) => {
  try {
    // Consultar todos los trueques con relaciones completas
    const barters = await Barter.findAll({
      include: [
        {
          // Producto ofrecido con sus imágenes
          model: Product,
          as: 'offered_product',
          attributes: ['id_product', 'name', 'price', 'description'],
          include: [
            {
              model: Image,
              as: 'productImages',
              attributes: ['id', 'url', 'is_main'],
              required: false // LEFT JOIN para incluir productos sin imágenes
            }
          ]
        },
        {
          // Producto solicitado con sus imágenes
          model: Product,
          as: 'requested_product',
          attributes: ['id_product', 'name', 'price', 'description'],
          include: [
            {
              model: Image,
              as: 'productImages',
              attributes: ['id', 'url', 'is_main'],
              required: false
            }
          ]
        },
        {
          // Usuario que ofrece el trueque
          model: User,
          as: 'offering_user',
          attributes: ['id', 'name', 'email']
        },
        {
          // Usuario que recibe/solicita el trueque
          model: User,
          as: 'receiving_user',
          attributes: ['id', 'name', 'email']
        }
      ],
      // Ordenar por fecha de solicitud más reciente primero
      order: [['request_date', 'DESC']]
    });

    // Devolver array de trueques con todas las relaciones
    res.json(barters);
  } catch (error) {
    console.error('Error al obtener trueques:', error);
    res.status(500).json({
      msg: 'Error al obtener los trueques'
    });
  }
};
/**
 * Obtiene un trueque específico por su ID con información completa
 * de productos y usuarios involucrados
 */
export const getBarterById = async (req: Request, res: Response) => {
  const { id } = req.params; // Extraer ID del trueque desde parámetros de URL

  try {
    // Buscar trueque por clave primaria con relaciones completas
    const barter = await Barter.findByPk(id, {
      include: [
        {
          // Producto ofrecido en el trueque
          model: Product,
          as: 'offered_product',
          attributes: ['id_product', 'name', 'price', 'description']
        },
        {
          // Producto solicitado en el trueque
          model: Product,
          as: 'requested_product',
          attributes: ['id_product', 'name', 'price', 'description']
        },
        {
          // Usuario que ofrece el producto
          model: User,
          as: 'offering_user',
          attributes: ['id', 'name', 'email']
        },
        {
          // Usuario que recibe/solicita el trueque
          model: User,
          as: 'receiving_user',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    // Verificar si el trueque existe
    if (!barter) {
      return res.status(404).json({
        msg: `No existe un trueque con el ID ${id}`
      });
    }

    // Devolver trueque con todas sus relaciones
    res.json(barter);
  } catch (error) {
    console.error('Error al obtener trueque:', error);
    res.status(500).json({
      msg: 'Error al obtener el trueque'
    });
  }
};

/**
 * Crea un nuevo trueque o actualiza uno existente si ya hay una publicación para el producto
 * Maneja diferentes tipos de intercambio: producto por producto, solo dinero, o producto + dinero
 */
export const createBarter = async (req: Request, res: Response) => {
  // Extraer datos del cuerpo de la petición
  const {
    productOffer,           // Datos del producto a ofrecer (cuando se crea nuevo)
    id_prod_request,        // ID del producto solicitado
    id_user_offer,          // ID del usuario que ofrece
    id_user_receiving,      // ID del usuario que recibe la propuesta
    notes,                  // Notas adicionales del trueque
    useExistingProduct,     // Flag para usar producto existente
    id_prod_offer,          // ID del producto ofrecido (si ya existe)
    status,                 // Estado del trueque
    exchange_type,          // Tipo de intercambio
    value                   // Valor monetario (si aplica)
  } = req.body;

  try {
    console.log('🔍 Entrando a createBarter con datos:', {
      useExistingProduct,
      id_prod_offer,
      id_prod_request,
      id_user_offer,
      id_user_receiving,
      exchange_type,
      value
    });

    // Validar que no sea un auto-trueque
    if (id_user_offer === id_user_receiving) {
      return res.status(400).json({
        msg: 'No puedes hacer un trueque contigo mismo'
      });
    }

    // Verificar disponibilidad del producto solicitado
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

    // Manejar ofertas de solo dinero
    if (exchange_type === 'money_only') {
      console.log('💵 Detectada oferta de solo dinero');

      // Validar que existe un producto solicitado
      if (!id_prod_request) {
        return res.status(400).json({
          msg: 'Oferta monetaria requiere un producto solicitado'
        });
      }

      // Verificar que el producto solicitado existe
      const productOwner = await Product.findByPk(id_prod_request);
      if (productOwner) {
        finalProdOfferId = id_prod_request;
      } else {
        return res.status(404).json({
          msg: 'Producto solicitado no encontrado'
        });
      }
    }
    // Usar producto existente del usuario
    else if (useExistingProduct && id_prod_offer) {
      const existingProduct = await Product.findByPk(id_prod_offer);
      if (!existingProduct) {
        return res.status(400).json({
          msg: 'El producto ofrecido no existe'
        });
      }

      finalProdOfferId = id_prod_offer;
    }
    // Crear nuevo producto para el trueque
    else if (productOffer && productOffer.name) {
      // Verificar si ya existe un producto similar para evitar duplicados
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

      // Crear producto nuevo si no se encontró uno similar
      if (!finalProdOfferId) {
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
    } else if (id_prod_offer === -1 || id_prod_offer === null) {
      // Caso especial: trueque solo dinero
      finalProdOfferId = null;
    } else if (id_prod_offer) {
      // Usar ID de producto proporcionado directamente
      finalProdOfferId = id_prod_offer;
    } else {
      return res.status(400).json({
        msg: 'Debe proporcionar un producto para el trueque, o -1/null si es solo dinero'
      });
    }

    // Verificar si ya existe un barter para este producto
    const existingBarter = await Barter.findOne({
      where: {
        id_prod_offer: finalProdOfferId
      }
    });

    // Determinar el tipo de intercambio final
    let finalExchangeType = exchange_type || 'product_for_product';

    // Inferir tipo basado en valor monetario
    if (!exchange_type && value && value > 0) {
      finalExchangeType = id_prod_offer === -1 ? 'money_only' : 'product_with_money';
    }

    // Forzar tipo para ofertas solo dinero
    if (id_prod_offer === -1) {
      finalExchangeType = 'money_only';
    }

    let barter;

    // Actualizar barter existente o crear nuevo
    if (existingBarter) {
      console.log(`⚠️ SE ENCONTRÓ UN BARTER EXISTENTE ID ${existingBarter.getDataValue('id_barter')} - ACTUALIZANDO`);

      // Actualizar barter existente con nuevos datos
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
      // Crear nuevo barter
      console.log(`🆕 Creando nuevo barter para producto ${finalProdOfferId}, tipo: ${finalExchangeType}`);

      try {
        barter = await Barter.create({
          id_prod_offer: finalProdOfferId,
          id_prod_request: exchange_type === 'money_only' ? null : (id_prod_request || null),
          id_user_offer: id_user_offer,
          id_user_receiving: id_user_receiving || null,
          value: value || productOffer?.value || 0,
          status: status || 'pendiente',
          request_date: new Date(),
          notes: notes || '',
          exchange_type: finalExchangeType
        });

        console.log(`✅ Nuevo barter creado con ID: ${barter.getDataValue('id_barter')}, tipo: ${finalExchangeType}`);
      } catch (createError: any) {
        // Manejar error de duplicidad (condición de carrera)
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
          // Re-lanzar otros tipos de error
          throw createError;
        }
      }
    }

    // Actualizar estado del producto solicitado
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

    // Crear notificación para el usuario receptor
    if (id_user_receiving) {
      await createNotificationForBarter(barter, 'new_barter');
      console.log(`✅ Notificación creada para usuario ${id_user_receiving}`);
    }

    // Cargar datos completos del trueque para la respuesta
    const completeBarterData = await Barter.findByPk(barter.getDataValue('id_barter'), {
      include: [
        { model: Product, as: 'offered_product' },
        { model: Product, as: 'requested_product' },
        { model: User, as: 'offering_user' },
        { model: User, as: 'receiving_user' }
      ]
    });

    // Responder con el trueque creado/actualizado
    res.status(201).json({
      msg: existingBarter ? 'Solicitud de trueque actualizada correctamente' : 'Solicitud de trueque creada correctamente',
      barter: completeBarterData
    });

  } catch (error) {
    // Manejo de errores con tipado
    const typedError = error as Error & { name?: string };

    console.error('❌ Error en createBarter:', typedError);
    console.error(typedError.stack || 'No stack trace disponible');

    res.status(500).json({
      msg: 'Error al procesar la solicitud de trueque',
      error: typedError.message || 'Error desconocido'
    });
  }
};
/**
 * Actualiza un trueque existente con nueva información de productos, usuarios y estado
 * Maneja los cambios de estado de productos asociados al actualizar el trueque
 */
export const updateBarter = async (req: Request, res: Response) => {
  const { id } = req.params; // ID del trueque a actualizar
  const {
    id_prod_offer,      // ID del producto ofrecido
    id_prod_request,    // ID del producto solicitado
    id_user_offer,      // ID del usuario que ofrece
    id_user_receiving,  // ID del usuario que recibe
    status,             // Nuevo estado del trueque
    value,              // Valor monetario del intercambio
    notes,              // Notas adicionales
    exchange_type       // Tipo de intercambio
  } = req.body;

  try {
    // Verificar si existe el trueque
    const barter = await Barter.findByPk(id);
    if (!barter) {
      return res.status(404).json({
        msg: `No existe un trueque con el ID ${id}`
      });
    }

    // Validar que no sea un auto-trueque
    if (id_user_offer === id_user_receiving) {
      return res.status(400).json({
        msg: 'No puedes hacer un trueque contigo mismo'
      });
    }

    // Obtener los productos actuales del trueque antes de la actualización
    const currentProdOffer = barter.getDataValue('id_prod_offer');
    const currentProdRequest = barter.getDataValue('id_prod_request');

    // Actualizar estado de productos si cambian en la oferta
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

    // Actualizar estado de productos si cambian en la solicitud
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

    // Actualizar el trueque con los nuevos datos
    await barter.update({
      id_prod_offer,
      id_prod_request,
      id_user_offer,
      id_user_receiving,
      status,
      value,
      notes,
      exchange_type,
      // Actualizar fecha de resolución si el estado cambió a algo definitivo
      ...(status !== 'pendiente' && { resolution_date: new Date() })
    });

    // Responder con el trueque actualizado
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
/**
 * Actualiza el estado de un trueque específico y maneja los cambios en productos asociados
 * Gestiona transiciones de estado como pendiente, aceptado, rechazado, aprobado_admin y completado
 */
export const updateBarterStatus = async (req: Request, res: Response) => {
  const { id } = req.params; // ID del trueque a actualizar

  // Extraer y validar el status del body con manejo robusto de diferentes formatos
  console.log("⚠️ Depuración: Body completo:", req.body);
  console.log("⚠️ Depuración: Tipo de req.body:", typeof req.body);

  // Normalizar body data si viene como string
  let bodyData = req.body;
  if (typeof req.body === 'string') {
    try {
      bodyData = JSON.parse(req.body);
      console.log("⚠️ Body parseado:", bodyData);
    } catch (e) {
      console.error("⚠️ Error parseando body:", e);
    }
  }

  // Determinar el status a usar con múltiples estrategias de extracción
  let statusToUse;

  if (bodyData && bodyData.status !== undefined) {
    statusToUse = bodyData.status;
    console.log("✅ Usando status del body:", statusToUse);
  } else if (bodyData && bodyData.estado !== undefined) {
    statusToUse = bodyData.estado;
    console.log("✅ Usando estado del body:", statusToUse);
  } else {
    // Detección especial para casos de aprobación administrativa
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

  // Validar que el estado sea uno de los permitidos
  const validStatus = ['pendiente', 'aceptado', 'rechazado', 'completado', 'aprobado_admin', 'disponible'];
  if (!validStatus.includes(statusToUse)) {
    console.error(`❌ Estado inválido: ${statusToUse}`);
    return res.status(400).json({
      msg: `El estado ${statusToUse} no es válido. Valores permitidos: ${validStatus.join(', ')}`
    });
  }

  try {
    // Verificar existencia del trueque
    const barter = await Barter.findByPk(id);
    if (!barter) {
      return res.status(404).json({
        msg: `No existe un trueque con el ID ${id}`
      });
    }

    // Recopilar IDs de productos involucrados en el trueque
    const productIds: number[] = [];

    if (barter.id_prod_offer !== null && barter.id_prod_offer !== undefined) {
      productIds.push(barter.id_prod_offer);
    }

    if (barter.id_prod_request !== null && barter.id_prod_request !== undefined) {
      productIds.push(barter.id_prod_request);
    }

    console.log(`🔍 Productos involucrados en el trueque ID ${id}:`, productIds);

    // Manejar transiciones de estado según el nuevo status
    if (statusToUse !== 'pendiente') {
      if (statusToUse === 'rechazado') {
        // Crear notificación ANTES de limpiar datos de la propuesta
        console.log('📤 Creando notificación antes de limpiar datos de propuesta...');
        await createNotificationForBarterStatus(barter, 'rechazado');

        // Limpiar campos de la propuesta rechazada y volver a disponible
        await barter.update({
          status: 'disponible',
          resolution_date: new Date(),
          id_prod_request: null,
          id_user_receiving: null,
          value: 0,
          exchange_type: 'product_for_product'
        });

        // Actualizar producto ofrecido para que vuelva a aparecer en tienda
        if (barter.id_prod_offer) {
          console.log(`🔄 Actualizando producto ofrecido ID ${barter.id_prod_offer} para que aparezca en la tienda`);
          await Product.update(
            {
              has_pending_barters: false,
              status: 'disponible'
            },
            { where: { id_product: barter.id_prod_offer } }
          );
        }

        // Actualizar producto solicitado si existía
        if (barter.id_prod_request) {
          console.log(`🔄 Actualizando producto solicitado ID ${barter.id_prod_request} a disponible`);
          await Product.update(
            {
              status: 'disponible',
              has_pending_barters: false
            },
            { where: { id_product: barter.id_prod_request } }
          );
        }

        console.log(`🔄 Propuesta rechazada: Trueque ID ${id} vuelve a estado disponible y se limpiaron los campos.`);
      } else if (statusToUse === 'aceptado') {
        // Actualizar trueque a estado aceptado
        await barter.update({
          status: statusToUse,
          resolution_date: new Date()
        });
        console.log(`✅ Trueque ID ${id} actualizado correctamente a estado: ${statusToUse}`);

        // Productos pasan a "en_trueque" esperando aprobación administrativa
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
        // Aprobación administrativa del trueque
        await barter.update({
          status: statusToUse,
          resolution_date: new Date()
        });
        console.log(`✅ Trueque ID ${id} actualizado correctamente a estado: ${statusToUse}`);

        // Mantener productos en "en_trueque" pero marcar como aprobados
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
        // Marcar productos como vendidos al completar el trueque
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
      // Volver a estado pendiente sin cambios adicionales
      await barter.update({ status: statusToUse });
    }

    // Crear notificaciones para los usuarios involucrados
    await createNotificationForBarterStatus(barter, statusToUse);

    // Obtener trueque actualizado con relaciones para la respuesta
    const updatedBarter = await Barter.findByPk(id, {
      include: [
        { model: Product, as: 'offered_product' },
        { model: Product, as: 'requested_product' },
        { model: User, as: 'offering_user' },
        { model: User, as: 'receiving_user' }
      ]
    });

    // Responder con el trueque actualizado
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
/**
 * Elimina un trueque específico y limpia todos los datos asociados
 * Solo permite eliminar trueques en estado disponible (sin propuestas pendientes)
 * Elimina imágenes y productos tipo 'barter', restaura productos normales
 */
export const deleteBarter = async (req: Request, res: Response) => {
  const { id } = req.params; // Extraer ID del trueque desde parámetros de URL

  try {
    // Buscar el trueque con sus relaciones de productos e imágenes
    const barter = await Barter.findByPk(id, {
      include: [
        {
          // Producto ofrecido con sus imágenes asociadas
          model: Product,
          as: 'offered_product',
          include: [
            {
              model: Image,
              as: 'productImages',
              attributes: ['id', 'url', 'entity_type'],
              required: false // LEFT JOIN para incluir productos sin imágenes
            }
          ]
        },
        {
          // Producto solicitado con sus imágenes asociadas
          model: Product,
          as: 'requested_product',
          include: [
            {
              model: Image,
              as: 'productImages',
              attributes: ['id', 'url', 'entity_type'],
              required: false
            }
          ]
        }
      ]
    });

    // Verificar que el trueque existe
    if (!barter) {
      return res.status(404).json({
        msg: `No existe un trueque con el ID ${id}`
      });
    }

    // Solo permitir eliminar trueques disponibles (sin propuestas)
    if (barter.getDataValue('status') !== 'disponible') {
      return res.status(400).json({
        msg: 'Solo se pueden eliminar trueques en estado disponible (sin propuestas pendientes)'
      });
    }

    // Extraer IDs de productos involucrados
    const id_prod_offer = barter.getDataValue('id_prod_offer');
    const id_prod_request = barter.getDataValue('id_prod_request');

    // Identificar productos de tipo 'barter' para limpiar sus imágenes
    const productsToCleanImages = [];

    if (id_prod_offer) {
      const offeredProduct = await Product.findByPk(id_prod_offer);
      if (offeredProduct && offeredProduct.getDataValue('type') === 'barter') {
        productsToCleanImages.push(id_prod_offer);
      }
    }

    if (id_prod_request) {
      const requestedProduct = await Product.findByPk(id_prod_request);
      if (requestedProduct && requestedProduct.getDataValue('type') === 'barter') {
        productsToCleanImages.push(id_prod_request);
      }
    }

    // Eliminar imágenes de productos tipo 'barter'
    if (productsToCleanImages.length > 0) {
      console.log(`🗑️ Eliminando imágenes de productos barter: ${productsToCleanImages.join(', ')}`);

      // Obtener las imágenes antes de eliminarlas (para borrar archivos del servidor)
      const imagesToDelete = await Image.findAll({
        where: {
          entity_type: 'product',
          entity_id: { [Op.in]: productsToCleanImages }
        }
      });

      // Eliminar archivos físicos del servidor
      const fs = require('fs').promises;
      const path = require('path');

      for (const image of imagesToDelete) {
        try {
          const imageUrl = image.getDataValue('url');
          // Extraer el nombre del archivo de la URL
          const fileName = imageUrl.split('/').pop();
          if (fileName) {
            const filePath = path.join(__dirname, '../../uploads', fileName);

            // Verificar si el archivo existe antes de eliminarlo
            try {
              await fs.access(filePath);
              await fs.unlink(filePath);
              console.log(`✅ Archivo eliminado: ${fileName}`);
            } catch (fileError) {
              console.log(`⚠️ Archivo no encontrado o ya eliminado: ${fileName}`);
            }
          }
        } catch (fileDeleteError) {
          console.error(`❌ Error eliminando archivo de imagen:`, fileDeleteError);
          // Continuar con el proceso aunque falle la eliminación del archivo
        }
      }

      // Eliminar registros de imágenes de la base de datos
      await Image.destroy({
        where: {
          entity_type: 'product',
          entity_id: { [Op.in]: productsToCleanImages }
        }
      });

      console.log(`✅ ${imagesToDelete.length} imágenes eliminadas de la base de datos`);
    }

    // Identificar productos de tipo 'barter' para eliminar completamente
    const productsToDelete: number[] = [];

    if (id_prod_offer) {
      const offeredProduct = await Product.findByPk(id_prod_offer);
      if (offeredProduct && offeredProduct.getDataValue('type') === 'barter') {
        productsToDelete.push(id_prod_offer);
      }
    }

    if (id_prod_request) {
      const requestedProduct = await Product.findByPk(id_prod_request);
      if (requestedProduct && requestedProduct.getDataValue('type') === 'barter') {
        productsToDelete.push(id_prod_request);
      }
    }

    // Eliminar productos tipo 'barter' (creados específicamente para trueques)
    if (productsToDelete.length > 0) {
      await Product.destroy({
        where: {
          id_product: { [Op.in]: productsToDelete },
          type: 'barter'
        }
      });
      console.log(`✅ ${productsToDelete.length} productos de tipo 'barter' eliminados`);
    }

    // Restaurar productos normales (no de tipo 'barter') a disponible
    const productIds: number[] = [id_prod_offer, id_prod_request]
      .filter((id): id is number => id !== null && id !== undefined) // Type guard para números válidos
      .filter(id => !productsToDelete.includes(id)); // Excluir los que ya se eliminaron

    if (productIds.length > 0) {
      await Product.update(
        {
          status: 'disponible',
          has_pending_barters: false
        },
        { where: { id_product: { [Op.in]: productIds } } }
      );
      console.log(`✅ ${productIds.length} productos restaurados a disponible`);
    }

    // Eliminar el trueque de la base de datos
    await barter.destroy();

    // Responder con confirmación de eliminación exitosa
    res.json({
      msg: 'Trueque eliminado correctamente junto con sus imágenes asociadas'
    });
  } catch (error) {
    console.error('Error al eliminar trueque:', error);
    res.status(500).json({
      msg: 'Error al eliminar el trueque'
    });
  }
};
/**
 * Obtiene todos los trueques relacionados con un usuario específico
 * Incluye trueques donde el usuario es oferente o receptor, con productos e imágenes
 */
export const getUserBarters = async (req: Request, res: Response) => {
  const { userId } = req.params; // Extraer ID del usuario desde parámetros de URL

  try {
    // Buscar todos los trueques donde el usuario participa como oferente o receptor
    const barters = await Barter.findAll({
      where: {
        [Op.or]: [
          { id_user_offer: userId },      // Usuario como oferente
          { id_user_receiving: userId }   // Usuario como receptor
        ]
      },
      include: [
        {
          // Producto ofrecido en el trueque con sus imágenes
          model: Product,
          as: 'offered_product',
          attributes: ['id_product', 'name', 'price', 'description', 'id_category'],
          include: [
            {
              model: Image,
              as: 'productImages',
              attributes: ['id', 'url', 'is_main'],
              required: false // LEFT JOIN para incluir productos sin imágenes
            }
          ]
        },
        {
          // Producto solicitado en el trueque con sus imágenes
          model: Product,
          as: 'requested_product',
          attributes: ['id_product', 'name', 'price', 'description', 'id_category'],
          include: [
            {
              model: Image,
              as: 'productImages',
              attributes: ['id', 'url', 'is_main'],
              required: false
            }
          ]
        },
        {
          // Información del usuario que ofrece
          model: User,
          as: 'offering_user',
          attributes: ['id', 'name', 'email']
        },
        {
          // Información del usuario que recibe
          model: User,
          as: 'receiving_user',
          attributes: ['id', 'name', 'email']
        }
      ],
      // Ordenar por fecha de solicitud más reciente primero
      order: [['request_date', 'DESC']]
    });

    // Devolver array de trueques del usuario
    res.json(barters);
  } catch (error) {
    console.error(`Error al obtener trueques del usuario ${userId}:`, error);
    res.status(500).json({
      msg: 'Error al obtener los trueques del usuario'
    });
  }
};
/**
 * Envía una propuesta de trueque para un producto que ya tiene una publicación de trueque existente
 * Actualiza el estado de ambos productos y envía notificaciones a ambos usuarios
 */
export const proposeForExistingBarter = async (req: Request, res: Response) => {
  const { id } = req.params; // ID del trueque existente
  const { id_prod_request, id_user_receiving, notes, exchange_type, value } = req.body;

  console.log(`🔍 DEPURACIÓN proposeForExistingBarter: Propuesta para trueque ID: ${id}`, {
    id_prod_request,
    id_user_receiving,
    exchange_type,
    value,
    notes
  });

  try {
    // Buscar el trueque existente usando el ID específico
    const barter = await Barter.findByPk(id);

    if (!barter) {
      console.log(`❌ No existe trueque con ID: ${id}`);
      return res.status(404).json({
        msg: `No existe un trueque con el ID ${id}`
      });
    }

    console.log(`✅ ENCONTRADO barter ID: ${barter.id_barter}, estado actual: ${barter.status}`);

    // Cambiar el status del producto del usuario A a 'en_trueque'
    if (barter.id_prod_offer) {
      console.log(`🔄 Cambiando status del producto ofrecido (ID: ${barter.id_prod_offer}) a 'en_trueque'`);
      await Product.update(
        { status: 'en_trueque', has_pending_barters: true },
        { where: { id_product: barter.id_prod_offer } }
      );
    }

    // Si no es oferta solo dinero, actualizar también el producto solicitado
    if (exchange_type !== 'money_only' && id_prod_request) {
      console.log(`🔄 Actualizando producto solicitado (ID: ${id_prod_request}) - status=en_trueque`);
      await Product.update(
        {
          status: 'en_trueque',
          has_pending_barters: true
        },
        { where: { id_product: id_prod_request } }
      );
    } else {
      console.log(`💰 Propuesta de tipo solo dinero - No se modifican estados del producto solicitado`);
    }

    // Actualizar has_pending_barters del producto ofrecido (usuario A) a true
    if (barter.id_prod_offer) {
      console.log(`🔄 Actualizando has_pending_barters del producto ${barter.id_prod_offer} a true`);
      await Product.update(
        { has_pending_barters: true },
        { where: { id_product: barter.id_prod_offer } }
      );
    }

    // Definir tipo para status
    type BarterStatus = 'pendiente' | 'aceptado' | 'rechazado' | 'completado' | 'disponible' | 'aprobado_admin';

    // Actualizar el trueque existente (solo los campos necesarios)
    const updateData = {
      id_prod_request: exchange_type === 'money_only' ? null : (id_prod_request || barter.id_prod_request),
      id_user_receiving: id_user_receiving || barter.id_user_receiving,
      status: 'pendiente' as BarterStatus, // Usar el tipo definido
      request_date: new Date(),
      notes: notes || barter.notes,
      exchange_type: exchange_type || barter.exchange_type,
      value: value !== undefined ? value : barter.value
    };

    console.log(`🔄 Actualizando barter con datos:`, updateData);

    const updatedBarter = await barter.update(updateData);

    console.log(`✅ Barter actualizado exitosamente:`, {
      id: updatedBarter.id_barter,
      status: updatedBarter.status,
      id_user_offer: updatedBarter.id_user_offer, // Para debugging
      id_user_receiving: updatedBarter.id_user_receiving,
      exchange_type: updatedBarter.exchange_type,
      value: updatedBarter.value
    });

    // Obtener información de los usuarios para las notificaciones y correos
    const userA = await User.findByPk(updatedBarter.id_user_offer);
    const userB = await User.findByPk(id_user_receiving);

    // Crear notificación para Usuario A (propietario del producto)
    if (updatedBarter.id_user_offer) {
      console.log(`✉️ Enviando notificación al USUARIO A (ID: ${updatedBarter.id_user_offer})`);
      console.log(`Información importante: Usuario A=${updatedBarter.id_user_offer}, Usuario B=${id_user_receiving}`);

      await createNotificationForBarter(updatedBarter, 'barter_response');
    }

    // Crear notificación para Usuario B (confirmación de propuesta enviada)
    if (updatedBarter.id_user_receiving) {
      await Notification.create({
        id_user: updatedBarter.id_user_receiving,
        type: 'proposal_sent',
        title: 'Propuesta enviada exitosamente',
        message: `Tu propuesta de trueque ha sido enviada a ${userA?.get('name') || 'el propietario'} y está pendiente de revisión.`,
        entity_type: 'barter',
        entity_id: updatedBarter.id_barter,
        action_url: `/barters/${updatedBarter.id_barter}`,
        is_read: false
      });
      console.log(`✅ Notificación de confirmación creada para Usuario B: ${updatedBarter.id_user_receiving}`);
    }

    // Enviar correos electrónicos
    try {
      // Obtener datos del producto para los correos
      const product = await Product.findByPk(updatedBarter.id_prod_offer);

      if (userA && userB && product) {
        console.log('📧 Enviando correos de trueque...');

        // Enviar correo al usuario A (propietario) sobre la nueva propuesta
        await sendNewProposalEmail(
          userA.toJSON(),
          userB.toJSON(),
          product.toJSON(),
          exchange_type,
          value
        );

        // Enviar correo de confirmación al usuario B (quien hizo la propuesta)
        await sendProposalConfirmationEmail(
          userB.toJSON(),
          userA.toJSON(),
          product.toJSON(),
          exchange_type,
          value
        );

        console.log('✅ Correos de propuesta enviados exitosamente');
      }
    } catch (emailError) {
      console.error('❌ Error enviando correos de propuesta:', emailError);
      // No interrumpir el proceso principal por errores de email
    }

    // Cargar datos completos para la respuesta
    const completeBarterData = await Barter.findByPk(updatedBarter.id_barter, {
      include: [
        { model: Product, as: 'offered_product' },
        { model: Product, as: 'requested_product' },
        { model: User, as: 'offering_user' },
        { model: User, as: 'receiving_user' }
      ]
    });

    return res.json({
      msg: 'Propuesta enviada correctamente',
      barter: completeBarterData
    });

  } catch (error) {
    console.error(`❌ Error al procesar propuesta para trueque ${id}:`, error);
    return res.status(500).json({
      msg: 'Error al procesar la propuesta de trueque',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};
/**
 * Crea notificaciones para usuarios involucrados en operaciones de trueque
 * Maneja diferentes tipos de acciones: nuevo trueque, actualizaciones de estado y respuestas
 */
export const createNotificationForBarter = async (barter: any, action: string): Promise<void> => {
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
        // Aclarar que el usuario B (receivingUser) está proponiendo al usuario A
        title = `Nueva propuesta para tu trueque`;
        if (barter.exchange_type === 'money_only') {
          // En solo dinero, el usuario A es el dueño del producto (id_user_offer)
          message = `${receivingUserName || 'Un usuario'} te ha enviado una oferta monetaria de ${barter.value} pesos por tu producto "${productName}".`;
          recipientId = barter.id_user_offer;
        } else {
          // Producto por producto o producto + dinero
          message = `${receivingUserName || 'Un usuario'} te ha enviado una propuesta para tu publicación de trueque "${productName}".`;
          recipientId = barter.id_user_offer;
        }
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
      console.log(`✅ Notificación creada para usuario ${recipientId} (${title})`);
    } else {
      console.warn('⚠️ No se creó notificación porque recipientId es undefined');
    }
  } catch (error) {
    console.error('Error al crear notificación para trueque:', error);
  }
}
/**
 * Crea una nueva publicación de trueque para un producto específico
 * Establece el producto como disponible para intercambio y crea el registro de trueque
 */
export const createBarterPublication = async (req: Request, res: Response) => {
  const { id_prod_offer, id_user_offer, notes, exchange_type, value } = req.body;

  try {
    console.log('🔍 Creando publicación de trueque con datos:', {
      id_prod_offer, id_user_offer, exchange_type, value
    });

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

    // Asegurar que el producto sea de tipo 'barter' para identificarlo como producto de intercambio
    await productExists.update({ type: 'barter' });

    console.log('✅ Validaciones pasadas, creando barter con status: disponible');

    // Crear la publicación de trueque con status explícitamente establecido
    const createdBarter = await Barter.create({
      id_prod_offer,
      id_user_offer,
      status: 'disponible', // Explícitamente establecer 'disponible'
      request_date: new Date(),
      notes: notes || 'Producto disponible para trueque',
      exchange_type: exchange_type || 'product_for_product',
      value: value || 0
    });

    // Verificar que se guardó correctamente
    console.log(`✅ Publicación creada con status: ${createdBarter.status}`);

    // Recargar el objeto desde la base de datos para verificar
    await createdBarter.reload();
    console.log(`⚠️ Después de recargar: status = ${createdBarter.status}`);

    // Verificación extra mediante consulta directa
    const verifyBarter = await Barter.findByPk(createdBarter.id_barter);
    console.log(`🔍 Verificación directa: status = ${verifyBarter?.status || 'no encontrado'}`);

    // Si el status no fue guardado correctamente, intentar actualizarlo explícitamente
    if (createdBarter.status !== 'disponible') {
      console.log('⚠️ Status incorrecto, actualizando explícitamente...');
      await createdBarter.update({ status: 'disponible' });
      console.log(`🔄 Status actualizado: ${createdBarter.status}`);
    }

    // Cargar con relaciones para la respuesta
    const barterWithRelations = await Barter.findByPk(createdBarter.id_barter, {
      include: [
        { model: Product, as: 'offered_product' },
        { model: User, as: 'offering_user' }
      ]
    });

    // Responder con la publicación creada exitosamente
    res.status(201).json({
      msg: 'Publicación de trueque creada correctamente',
      barter: barterWithRelations
    });
  } catch (error) {
    console.error('❌ Error al crear publicación de trueque:', error);
    res.status(500).json({
      msg: 'Error al crear la publicación de trueque',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};
/**
 * Verifica si existe una propuesta de trueque pendiente para un usuario y producto específicos
 * Utilizado para evitar propuestas duplicadas en el frontend
 */
export const checkExistingProposal = async (req: Request, res: Response) => {
  try {
    const { userId, productId } = req.query;

    // Validar parámetros requeridos
    if (!userId || !productId) {
      return res.status(400).json({
        msg: 'Se requieren userId y productId',
        exists: false
      });
    }

    // Buscar si existe una propuesta pendiente para este usuario y producto
    const existingProposal = await Barter.findOne({
      where: {
        id_user_offer: parseInt(userId as string),      // Usuario que ofrece el trueque
        id_prod_request: parseInt(productId as string), // Producto que solicita
        status: 'pendiente'                             // Solo propuestas pendientes
      }
    });

    // Responder con información sobre la existencia de la propuesta
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

    // Modificar mensajes según el estado
    switch (newStatus) {
      case 'aceptado':
        title = "¡Propuesta de trueque aceptada!";
        if (barter.exchange_type === 'money_only') {
          recipientId = barter.id_user_receiving;
          message = `${offeringUserName} ha aceptado tu oferta monetaria de ${barter.value} pesos por "${offeredProductName}". Ahora está pendiente de aprobación administrativa.`;
        } else {
          recipientId = barter.id_user_receiving;
          message = `${offeringUserName} ha aceptado tu propuesta de trueque para intercambiar "${requestedProductName}" por "${offeredProductName}". Ahora está pendiente de aprobación administrativa.`;
        }
        break;

      case 'rechazado':
        title = "Propuesta de trueque rechazada";
        message = `${offeringUserName} ha rechazado tu propuesta de trueque para "${offeredProductName}". El trueque ha vuelto a estar disponible para nuevas ofertas.`;
        recipientId = barter.id_user_receiving;
        console.log(`📢 Notificación de rechazo para usuario que propuso (B): ${recipientId}`);
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
        title = "Trueque completado";
        message = `El trueque de "${requestedProductName}" por "${offeredProductName}" ha sido marcado como completado.`;
        recipientId = barter.id_user_receiving;
        break;
    }

    // ✅ ESTA ES LA PARTE QUE FALTABA - CREAR NOTIFICACIÓN PARA TODOS LOS CASOS
    if (recipientId) {
      await Notification.create({
        id_user: recipientId,
        type: newStatus === 'aceptado' ? 'barter_accepted' : (newStatus === 'rechazado' ? 'barter_rejected' : `barter_${newStatus}`),
        title,
        message,
        entity_type: 'barter',
        entity_id: barter.id_barter || barter.id,
        action_url: `/barters/${barter.id_barter || barter.id}`,
        is_read: false
      });
      console.log(`✅ Notificación creada para usuario ${recipientId} (${title})`);
    } else {
      console.warn('⚠️ No se creó notificación porque recipientId es undefined');
    }

    // Enviar correos según el estado
    try {
      if (newStatus === 'aceptado' || newStatus === 'rechazado') {
        const userA = offeringUser;
        const userB = receivingUser;
        const product = offeredProduct;

        if (userA && userB && product) {
          console.log(`📧 Enviando correos de respuesta de propuesta (${newStatus})...`);

          if (newStatus === 'aceptado') {
            await sendProposalAcceptedEmail(
              userB.toJSON(),
              userA.toJSON(),
              product.toJSON(),
              barter.exchange_type,
              barter.value
            );
          } else if (newStatus === 'rechazado') {
            await sendProposalRejectedEmail(
              userB.toJSON(),
              userA.toJSON(),
              product.toJSON(),
              barter.exchange_type,
              barter.value
            );
          }

          console.log(`✅ Correo de ${newStatus} enviado a Usuario B`);
        }
      }
      else if (newStatus === 'aprobado_admin') {
        const userA = offeringUser;
        const userB = receivingUser;
        const productOffered = offeredProduct;
        const productRequested = requestedProduct;

        if (userA && userB && productOffered) {
          console.log('📧 Enviando correos de aprobación administrativa a ambos usuarios...');

          await sendAdminApprovedEmail(
            userA.toJSON(),
            userB.toJSON(),
            productOffered.toJSON(),
            productRequested?.toJSON(),
            barter.exchange_type,
            barter.value
          );

          await sendAdminApprovedEmail(
            userB.toJSON(),
            userA.toJSON(),
            productRequested?.toJSON(),
            productOffered.toJSON(),
            barter.exchange_type,
            barter.value
          );

          console.log('✅ Correos de aprobación administrativa enviados a ambos usuarios');
        }
      }
    } catch (emailError) {
      console.error(`❌ Error enviando correo de estado ${newStatus}:`, emailError);
    }
  } catch (error) {
    console.error(`❌ Error al crear notificación para estado ${newStatus}:`, error);
  }
}
/**
 * Obtiene todos los trueques que están pendientes de aprobación administrativa
 * Filtra trueques con estado 'aceptado' que requieren revisión del administrador
 */
export const getBartersPendingAdminApproval = async (req: Request, res: Response) => {
  try {
    // Buscar trueques aceptados esperando aprobación administrativa
    const barters = await Barter.findAll({
      where: { status: 'aceptado' }, // Trueques aceptados esperando aprobación de admin
      include: [
        {
          // Producto ofrecido con imagen principal
          model: Product,
          as: 'offered_product',
          attributes: ['id_product', 'name', 'price', 'description', 'status'],
          include: [
            {
              model: Image,
              as: 'productImages',  // Alias correcto para imágenes de productos
              attributes: ['id', 'url', 'is_main'],
              required: false,
              where: { entity_type: 'product' }, // Filtro para imágenes de productos
              limit: 1 // Solo necesitamos una imagen por producto
            }
          ]
        },
        {
          // Producto solicitado con imagen principal
          model: Product,
          as: 'requested_product',
          attributes: ['id_product', 'name', 'price', 'description', 'status'],
          include: [
            {
              model: Image,
              as: 'productImages',  // Alias correcto para imágenes de productos
              attributes: ['id', 'url', 'is_main'],
              required: false,
              where: { entity_type: 'product' },
              limit: 1
            }
          ]
        },
        {
          // Usuario que ofrece el trueque
          model: User,
          as: 'offering_user',
          attributes: ['id', 'name', 'email']
        },
        {
          // Usuario que recibe/acepta el trueque
          model: User,
          as: 'receiving_user',
          attributes: ['id', 'name', 'email']
        }
      ],
      // Ordenar por fecha de solicitud más reciente primero
      order: [['request_date', 'DESC']]
    });

    // Devolver array de trueques pendientes de aprobación
    res.json(barters);
  } catch (error) {
    console.error('Error al obtener trueques pendientes de aprobación:', error);
    res.status(500).json({
      msg: 'Error al obtener los trueques pendientes de aprobación'
    });
  }
};
/**
 * Obtiene todos los trueques filtrados por un estado específico
 * Incluye información de productos y usuarios sin imágenes para optimizar rendimiento
 */
export const getBartersByStatus = async (req: Request, res: Response) => {
  const { status } = req.params; // Extraer estado desde parámetros de URL

  try {
    // Validar que el estado sea válido
    const validStatus = ['pendiente', 'aceptado', 'rechazado', 'completado', 'aprobado_admin', 'disponible'];
    if (!validStatus.includes(status)) {
      return res.status(400).json({
        msg: `El estado ${status} no es válido. Valores permitidos: ${validStatus.join(', ')}`
      });
    }

    // Filtrar por estado (sin incluir imágenes para optimizar rendimiento)
    const barters = await Barter.findAll({
      where: { status },
      include: [
        {
          // Producto ofrecido con información básica
          model: Product,
          as: 'offered_product',
          attributes: ['id_product', 'name', 'price', 'description', 'status']
        },
        {
          // Producto solicitado con información básica
          model: Product,
          as: 'requested_product',
          attributes: ['id_product', 'name', 'price', 'description', 'status']
        },
        {
          // Usuario que ofrece el trueque
          model: User,
          as: 'offering_user',
          attributes: ['id', 'name', 'email']
        },
        {
          // Usuario que recibe el trueque
          model: User,
          as: 'receiving_user',
          attributes: ['id', 'name', 'email']
        }
      ],
      // Ordenar por fecha de solicitud más reciente primero
      order: [['request_date', 'DESC']]
    });

    // Devolver array de trueques filtrados por estado
    res.json(barters);
  } catch (error) {
    console.error(`Error al obtener trueques con estado ${status}:`, error);
    res.status(500).json({
      msg: `Error al obtener los trueques con estado ${status}`
    });
  }
};
/**
 * Obtiene todos los trueques donde un producto específico es solicitado
 * Filtra por trueques en estado disponible o pendiente para mostrar oportunidades activas
 */
export const getBartersByProductOffered = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;

    console.log(`🔍 Buscando barters donde el producto solicitado es: ${productId}`);

    // Validar que el ID del producto sea válido
    if (!productId || isNaN(Number(productId))) {
      return res.status(400).json({
        msg: 'ID de producto inválido'
      });
    }

    // Buscar trueques donde este producto sea el solicitado
    const barters = await Barter.findAll({
      where: {
        id_prod_request: parseInt(productId, 10), // Busca trueques donde este producto sea el solicitado
        status: {
          [Op.in]: ['disponible', 'pendiente'] // Solo trueques activos
        }
      },
      include: [
        { model: Product, as: 'offered_product' },   // Producto ofrecido en el trueque
        { model: Product, as: 'requested_product' }, // Producto solicitado en el trueque
        { model: User, as: 'offering_user' },        // Usuario que ofrece
        { model: User, as: 'receiving_user' }        // Usuario que recibe
      ],
      // Ordenar por fecha de creación más reciente primero
      order: [['createdAt', 'DESC']]
    });

    console.log(`✅ Se encontraron ${barters.length} barters para el producto ${productId}`);

    // Devolver array de trueques encontrados
    res.json(barters);
  } catch (error) {
    console.error(`❌ Error buscando barters para producto:`, error);
    res.status(500).json({
      msg: 'Error al buscar trueques por producto solicitado',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};
/**
 * Obtiene todos los trueques relacionados con un producto específico
 * Busca trueques donde el producto aparece como ofrecido o solicitado
 * Filtra por estados activos (disponible y pendiente)
 */
export const getBartersByProductRelated = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;

    console.log(`🔍 Buscando barters relacionados con el producto: ${productId}`);

    // Validar que el ID del producto sea válido
    if (!productId || isNaN(Number(productId))) {
      return res.status(400).json({
        msg: 'ID de producto inválido'
      });
    }

    // Buscar cualquier barter donde este producto esté involucrado
    const barters = await Barter.findAll({
      where: {
        [Op.or]: [
          { id_prod_offer: parseInt(productId, 10) },   // Producto como oferta
          { id_prod_request: parseInt(productId, 10) }  // Producto como solicitud
        ],
        status: {
          [Op.in]: ['disponible', 'pendiente'] // Solo trueques activos
        }
      },
      include: [
        { model: Product, as: 'offered_product' },   // Producto ofrecido en el trueque
        { model: Product, as: 'requested_product' }, // Producto solicitado en el trueque
        { model: User, as: 'offering_user' },        // Usuario que ofrece
        { model: User, as: 'receiving_user' }        // Usuario que recibe
      ],
      // Ordenar por fecha de creación más reciente primero
      order: [['createdAt', 'DESC']]
    });

    console.log(`✅ Se encontraron ${barters.length} barters relacionados con producto ${productId}`);

    // Devolver array de trueques relacionados
    res.json(barters);
  } catch (error) {
    console.error(`❌ Error buscando barters relacionados con producto:`, error);
    res.status(500).json({
      msg: 'Error al buscar trueques relacionados con el producto',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};
/**
 * Completa el proceso de checkout de un trueque guardando las direcciones de entrega
 * Actualiza el estado del trueque cuando ambos usuarios han completado su checkout
 */
export const completeBarterCheckout = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // ID del barter

    // Obtener ID de usuario del token o del body
    const userId = req.user?.id || parseInt(req.body.user_id);
    if (!userId) {
      return res.status(400).json({
        msg: 'ID de usuario no proporcionado'
      });
    }

    // Extraer IDs de las direcciones seleccionadas
    const {
      pickup_address_id,
      delivery_address_id
    } = req.body;

    console.log(`🛒 CHECKOUT: Usuario ${userId} con direcciones:`, {
      recogida: pickup_address_id,
      entrega: delivery_address_id
    });

    // Buscar el barter
    const barter = await Barter.findByPk(id);
    if (!barter) {
      return res.status(404).json({ msg: 'Trueque no encontrado' });
    }

    // Verificar que el usuario es parte del trueque
    if (barter.id_user_offer !== userId && barter.id_user_receiving !== userId) {
      return res.status(403).json({
        msg: 'No tienes permiso para actualizar este trueque'
      });
    }

    // Verificar que las direcciones existen y pertenecen al usuario
    if (pickup_address_id) {
      const pickupAddress = await DeliveryAddress.findOne({
        where: { id: pickup_address_id, user_id: userId }
      });

      if (!pickupAddress) {
        return res.status(400).json({
          msg: 'La dirección de recogida no es válida o no te pertenece'
        });
      }
    }

    if (delivery_address_id) {
      const deliveryAddress = await DeliveryAddress.findOne({
        where: { id: delivery_address_id, user_id: userId }
      });

      if (!deliveryAddress) {
        return res.status(400).json({
          msg: 'La dirección de entrega no es válida o no te pertenece'
        });
      }
    }

    // Determinar si es Usuario A o Usuario B
    const isUserA = barter.id_user_offer === userId;

    // Actualizar las direcciones según el rol del usuario
    let updateData = {};
    if (isUserA) {
      // Usuario A (oferente del producto original)
      updateData = {
        offer_pickup_address_id: pickup_address_id || null,
        offer_delivery_address_id: delivery_address_id || null,
        offer_checkout_completed: true
      };

      console.log('✅ Usuario A completando checkout con:', updateData);
    } else {
      // Usuario B (receptor/solicitante)
      updateData = {
        request_pickup_address_id: pickup_address_id || null,
        request_delivery_address_id: delivery_address_id || null,
        request_checkout_completed: true
      };

      console.log('✅ Usuario B completando checkout con:', updateData);
    }

    await barter.update(updateData);

    // Verificar si ambos usuarios han completado su checkout
    const updatedBarter = await Barter.findByPk(id);

    if (updatedBarter &&
      updatedBarter.offer_checkout_completed &&
      updatedBarter.request_checkout_completed) {
      // Si ambos han completado checkout, marcar el barter como en proceso
      await updatedBarter.update({
        status: 'en_proceso', // Estado indicando que el proceso de entrega puede comenzar
        checkout_date: new Date()
      });

      console.log('✅ Ambos usuarios completaron checkout - Trueque en proceso');
    }

    // Obtener el barter con todas sus relaciones para devolver
    const barterWithRelations = await Barter.findByPk(id, {
      include: [
        { model: Product, as: 'offered_product' },
        { model: Product, as: 'requested_product' },
        { model: User, as: 'offering_user' },
        { model: User, as: 'receiving_user' },
        { model: DeliveryAddress, as: 'offer_pickup_address' },
        { model: DeliveryAddress, as: 'offer_delivery_address' },
        { model: DeliveryAddress, as: 'request_pickup_address' },
        { model: DeliveryAddress, as: 'request_delivery_address' }
      ]
    });

    // Enviar notificaciones a los usuarios
    if (isUserA && barter.id_user_receiving) {
      // Notificar al usuario B que el usuario A completó su checkout
      await Notification.create({
        id_user: barter.id_user_receiving,
        type: 'checkout_completed',
        title: 'Checkout de trueque completado',
        message: `El otro usuario ha completado su parte del checkout para el trueque. Por favor completa tu parte.`,
        entity_type: 'barter',
        entity_id: parseInt(id),
        is_read: false,
        action_url: `/barter-checkout/${id}`
      });
    } else if (!isUserA && barter.id_user_offer) {
      // Notificar al usuario A que el usuario B completó su checkout
      await Notification.create({
        id_user: barter.id_user_offer,
        type: 'checkout_completed',
        title: 'Checkout de trueque completado',
        message: `El otro usuario ha completado su parte del checkout para el trueque. Por favor completa tu parte.`,
        entity_type: 'barter',
        entity_id: parseInt(id),
        is_read: false,
        action_url: `/barter-checkout/${id}`
      });
    }

    res.json({
      msg: 'Direcciones guardadas correctamente',
      barter: barterWithRelations
    });

  } catch (error) {
    console.error('Error al guardar direcciones:', error);
    res.status(500).json({
      msg: 'Error al guardar direcciones',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};
// Configurar SendGrid para trueques
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');
async function sendAdminApprovedEmail(user: any, otherUser: any, offeredProduct: any, requestedProduct: any, exchangeType: string, value?: number): Promise<boolean> {
  try {
    console.log('📧 Enviando correo de aprobación administrativa a:', user.email);

    let exchangeDetails = '';
    if (exchangeType === 'money_only') {
      exchangeDetails = `una oferta monetaria de $${value?.toLocaleString()} pesos`;
    } else if (exchangeType === 'product_with_money') {
      exchangeDetails = `un intercambio de productos con $${value?.toLocaleString()} pesos adicionales`;
    } else {
      exchangeDetails = `un intercambio de productos`;
    }

    const msg = {
      to: user.email,
      from: {
        email: 'noreply@casanareserv.me',
        name: 'CasanareServ - Equipo de Trueques'
      },
      subject: '✅ Trueque aprobado - Listo para intercambio',
      text: `Hola ${user.name},\n\nExcelentes noticias: tu trueque ha sido aprobado por nuestro equipo de administración.\n\nDetalles del trueque:\n- Con: ${otherUser.name}\n- Tipo: ${exchangeDetails}\n${offeredProduct ? `- Tu producto: "${offeredProduct.name}"\n` : ''}${requestedProduct ? `- Producto solicitado: "${requestedProduct.name}"\n` : ''}\n\nPróximos pasos:\n1. Coordina la entrega con el otro usuario\n2. Realiza el intercambio en un lugar público y seguro\n3. Verifica que el producto esté en las condiciones acordadas\n4. Marca el trueque como completado en la plataforma\n\nPuedes ver todos los detalles en: ${process.env.FRONTEND_URL}/mis-trueques\n\nSaludos cordiales,\nEquipo de CasanareServ\nCasanare, Colombia`,
      html: `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Trueque aprobado - CasanareServ</title>
          <style>
            @media only screen and (max-width: 600px) {
              .container { width: 100% !important; padding: 10px !important; }
              .button { padding: 12px 20px !important; font-size: 14px !important; }
              .content { padding: 30px 20px !important; }
            }
          </style>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f8f9fa;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8f9fa;">
            <tr>
              <td align="center" style="padding: 40px 20px;">
                <div class="container" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
                  
                  <!-- Header -->
                  <div style="background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%); padding: 30px 40px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 300;">🎉 CasanareServ</h1>
                    <p style="margin: 8px 0 0 0; color: #ecf0f1; font-size: 14px; opacity: 0.9;">¡Trueque Aprobado!</p>
                  </div>
                  
                  <!-- Content -->
                  <div class="content" style="padding: 40px;">
                    <h2 style="margin: 0 0 20px 0; color: #2c3e50; font-size: 24px; font-weight: 600;">¡Felicitaciones!</h2>
                    
                    <p style="margin: 0 0 16px 0; color: #555; font-size: 16px;">Hola ${user.name},</p>
                    
                    <p style="margin: 0 0 24px 0; color: #555; font-size: 16px;">
                      Excelentes noticias: tu trueque ha sido <strong>aprobado por nuestro equipo de administración</strong> 
                      y está listo para proceder con el intercambio.
                    </p>
                    
                    <div style="background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 8px; padding: 20px; margin: 25px 0;">
                      <h3 style="margin: 0 0 15px 0; color: #155724; font-size: 18px;">✅ Detalles del trueque aprobado:</h3>
                      <p style="margin: 5px 0; color: #155724;"><strong>Con:</strong> ${otherUser.name}</p>
                      <p style="margin: 5px 0; color: #155724;"><strong>Tipo:</strong> ${exchangeDetails}</p>
                      ${offeredProduct ? `<p style="margin: 5px 0; color: #155724;"><strong>Tu producto:</strong> "${offeredProduct.name}"</p>` : ''}
                      ${requestedProduct ? `<p style="margin: 5px 0; color: #155724;"><strong>Producto solicitado:</strong> "${requestedProduct.name}"</p>` : ''}
                    </div>
                    
                    <div style="background-color: #e2f3ff; border: 1px solid #b3d7ff; border-radius: 8px; padding: 20px; margin: 25px 0;">
                      <h3 style="margin: 0 0 15px 0; color: #004085; font-size: 18px;">📋 Próximos pasos:</h3>
                      <ol style="color: #004085; margin: 10px 0; padding-left: 20px; line-height: 1.8;">
                        <li><strong>Coordina la entrega:</strong> Contacta al otro usuario para acordar lugar y fecha de encuentro</li>
                        <li><strong>Lugar seguro:</strong> Realiza el intercambio en un lugar público y seguro</li>
                        <li><strong>Verifica el producto:</strong> Revisa que esté en las condiciones acordadas</li>
                        <li><strong>Confirma el trueque:</strong> Marca como completado en la plataforma</li>
                      </ol>
                    </div>
                    
                    <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin: 25px 0;">
                      <p style="margin: 0; color: #856404; font-size: 14px;">
                        <strong>⚠️ Recomendaciones de seguridad:</strong><br>
                        • Encuentra un lugar público para el intercambio<br>
                        • Lleva acompañante si es posible<br>
                        • Verifica la identidad del otro usuario<br>
                        • Si algo no se siente bien, cancela el encuentro
                      </p>
                    </div>
                    
                    <div style="text-align: center; margin: 35px 0;">
                      <a href="${process.env.FRONTEND_URL}/mis-trueques" 
                         class="button"
                         style="display: inline-block; background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%); 
                                color: #ffffff; text-decoration: none; padding: 16px 32px; 
                                border-radius: 8px; font-weight: 600; font-size: 16px; 
                                box-shadow: 0 3px 6px rgba(39, 174, 96, 0.3);
                                transition: all 0.3s ease; margin-right: 10px;">
                        Ver detalles del trueque
                      </a>
                      <a href="mailto:soporte@casanareserv.me" 
                         style="display: inline-block; background: linear-gradient(135deg, #3498db 0%, #2980b9 100%); 
                                color: #ffffff; text-decoration: none; padding: 16px 32px; 
                                border-radius: 8px; font-weight: 600; font-size: 16px; 
                                box-shadow: 0 3px 6px rgba(52, 152, 219, 0.3);">
                        Contactar soporte
                      </a>
                    </div>
                    
                    <div style="background-color: #f8f9fa; border-left: 4px solid #28a745; padding: 16px; margin: 30px 0; border-radius: 4px;">
                      <p style="margin: 0; color: #2c3e50; font-size: 14px;">
                        <strong>💡 Recordatorio importante:</strong><br>
                        Una vez completado el intercambio físico, no olvides marcar el trueque como completado 
                        en tu panel de usuario para finalizar el proceso.
                      </p>
                    </div>
                    
                    <hr style="border: none; border-top: 1px solid #e1e8ed; margin: 30px 0;">
                    
                    <p style="margin: 0 0 8px 0; color: #777; font-size: 14px;">
                      ¿Necesitas ayuda con tu trueque?
                    </p>
                    <p style="margin: 0; color: #777; font-size: 14px;">
                      Escríbenos a: <a href="mailto:soporte@casanareserv.me" style="color: #3498db; text-decoration: none;">soporte@casanareserv.me</a>
                    </p>
                  </div>
                  
                  <!-- Footer -->
                  <div style="background-color: #2c3e50; padding: 25px 40px; text-align: center;">
                    <p style="margin: 0 0 8px 0; color: #bdc3c7; font-size: 13px;">
                      <strong>CasanareServ</strong> - Conectando intercambios exitosos
                    </p>
                    <p style="margin: 0 0 12px 0; color: #95a5a6; font-size: 12px;">
                      Casanare, Colombia • ${new Date().getFullYear()}
                    </p>
                    <p style="margin: 0; color: #7f8c8d; font-size: 11px;">
                      Este correo fue enviado a ${user.email}.
                      <a href="#" style="color: #3498db; text-decoration: none;">Política de Privacidad</a>
                    </p>
                  </div>
                </div>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `
    };

    await sgMail.send(msg);
    console.log('✅ Correo de aprobación administrativa enviado exitosamente');
    return true;
  } catch (error) {
    console.error('❌ Error enviando correo de aprobación administrativa:', error);
    return false;
  }
}
// Función para enviar correo de nueva propuesta al usuario A
async function sendNewProposalEmail(userA: any, userB: any, product: any, exchangeType: string, value?: number): Promise<boolean> {
  try {
    console.log('🔧 Verificando configuración de SendGrid...');
    console.log('API Key configurada:', !!process.env.SENDGRID_API_KEY);
    console.log('Email FROM configurado:', process.env.EMAIL_FROM || 'noreply@casanareserv.me');
    console.log('Frontend URL:', process.env.FRONTEND_URL || 'http://localhost:4200');

    console.log('📧 Enviando correo de nueva propuesta a:', userA.email);
    console.log('📧 Datos del remitente:', userB.name);
    console.log('📧 Producto:', product.name);

    let proposalDetails = '';
    if (exchangeType === 'money_only') {
      proposalDetails = `una oferta monetaria de $${value?.toLocaleString()} pesos`;
    } else if (exchangeType === 'product_with_money') {
      proposalDetails = `un producto más $${value?.toLocaleString()} pesos adicionales`;
    } else {
      proposalDetails = `un intercambio de productos`;
    }

    const msg = {
      to: userA.email,
      from: {
        email: 'noreply@casanareserv.me',
        name: 'CasanareServ - Trueques'
      },
      subject: '🔄 Nueva propuesta de trueque recibida',
      text: `Hola ${userA.name},\n\nTienes una nueva propuesta de trueque de ${userB.name} para tu producto "${product.name}".\n\nPropuesta: ${proposalDetails}\n\nPuedes revisar los detalles completos en: ${process.env.FRONTEND_URL}/mis-trueques\n\nSaludos,\nEquipo de CasanareServ`,
      html: `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Nueva propuesta de trueque - CasanareServ</title>
          <style>
            @media only screen and (max-width: 600px) {
              .container { width: 100% !important; padding: 10px !important; }
              .button { padding: 12px 20px !important; font-size: 14px !important; }
            }
          </style>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f8f9fa;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8f9fa;">
            <tr>
              <td align="center" style="padding: 40px 20px;">
                <div class="container" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
                  
                  <!-- Header -->
                  <div style="background: linear-gradient(135deg, #3498db 0%, #2980b9 100%); padding: 30px 40px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 300;">🔄 CasanareServ</h1>
                    <p style="margin: 8px 0 0 0; color: #ecf0f1; font-size: 14px; opacity: 0.9;">Nueva propuesta de trueque</p>
                  </div>
                  
                  <!-- Content -->
                  <div style="padding: 40px;">
                    <h2 style="margin: 0 0 20px 0; color: #2c3e50; font-size: 24px; font-weight: 600;">¡Tienes una nueva propuesta!</h2>
                    
                    <p style="margin: 0 0 16px 0; color: #555; font-size: 16px;">Hola ${userA.name},</p>
                    
                    <p style="margin: 0 0 24px 0; color: #555; font-size: 16px;">
                      <strong>${userB.name}</strong> está interesado en tu producto y te ha enviado una propuesta de trueque.
                    </p>
                    
                    <div style="background-color: #e8f4f8; border: 1px solid #bee5eb; border-radius: 8px; padding: 20px; margin: 25px 0;">
                      <h3 style="margin: 0 0 15px 0; color: #0c5460; font-size: 18px;">📋 Detalles de la propuesta:</h3>
                      <p style="margin: 5px 0; color: #0c5460;"><strong>De:</strong> ${userB.name}</p>
                      <p style="margin: 5px 0; color: #0c5460;"><strong>Para tu producto:</strong> "${product.name}"</p>
                      <p style="margin: 5px 0; color: #0c5460;"><strong>Propuesta:</strong> ${proposalDetails}</p>
                    </div>
                    
                    <div style="background-color: #d1ecf1; border: 1px solid #b8daff; border-radius: 8px; padding: 20px; margin: 25px 0;">
                      <p style="margin: 0; color: #004085; font-size: 14px;">
                        <strong>💡 ¿Qué puedes hacer?</strong><br>
                        • Revisa los detalles completos de la propuesta<br>
                        • Acepta si te parece interesante<br>
                        • Rechaza si no te convence<br>
                        • Consulta el perfil del usuario interesado
                      </p>
                    </div>
                    
                    <div style="text-align: center; margin: 35px 0;">
                      <a href="${process.env.FRONTEND_URL}/mis-trueques" 
                         class="button"
                         style="display: inline-block; background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%); 
                                color: #ffffff; text-decoration: none; padding: 16px 32px; 
                                border-radius: 8px; font-weight: 600; font-size: 16px; 
                                box-shadow: 0 3px 6px rgba(39, 174, 96, 0.3);
                                transition: all 0.3s ease;">
                        Ver propuesta completa
                      </a>
                    </div>
                    
                    <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin: 25px 0;">
                      <p style="margin: 0; color: #856404; font-size: 14px;">
                        <strong>⏰ Tiempo de respuesta:</strong><br>
                        Te recomendamos responder pronto para mantener activa la comunicación con ${userB.name}. 
                        Las propuestas activas generan más confianza en nuestra plataforma.
                      </p>
                    </div>
                    
                    <hr style="border: none; border-top: 1px solid #e1e8ed; margin: 30px 0;">
                    
                    <p style="margin: 0 0 8px 0; color: #777; font-size: 14px;">
                      ¿Tienes preguntas sobre trueques?
                    </p>
                    <p style="margin: 0; color: #777; font-size: 14px;">
                      Escríbenos a: <a href="mailto:trueques@casanareserv.me" style="color: #3498db; text-decoration: none;">trueques@casanareserv.me</a>
                    </p>
                  </div>
                  
                  <!-- Footer -->
                  <div style="background-color: #2c3e50; padding: 25px 40px; text-align: center;">
                    <p style="margin: 0 0 8px 0; color: #bdc3c7; font-size: 13px;">
                      <strong>CasanareServ</strong> - Facilitando intercambios exitosos
                    </p>
                    <p style="margin: 0 0 12px 0; color: #95a5a6; font-size: 12px;">
                      Casanare, Colombia • ${new Date().getFullYear()}
                    </p>
                    <p style="margin: 0; color: #7f8c8d; font-size: 11px;">
                      Este correo fue enviado a ${userA.email}.
                      <a href="#" style="color: #3498db; text-decoration: none;">Política de Privacidad</a>
                    </p>
                  </div>
                </div>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `
    };

    console.log('📤 Enviando mensaje con configuración:', {
      to: msg.to,
      from: msg.from.email,
      subject: msg.subject
    });

    await sgMail.send(msg);
    console.log('✅ Correo de nueva propuesta enviado exitosamente');
    return true;
  } catch (error: any) {
    console.error('❌ Error enviando correo de nueva propuesta:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      response: error.response?.body
    });
    return false;
  }
}
// Función para enviar correo de confirmación al usuario B
async function sendProposalConfirmationEmail(userB: any, userA: any, product: any, exchangeType: string, value?: number): Promise<boolean> {
  try {
    // ✅ AGREGAR LOGS DE DEPURACIÓN
    console.log('📧 CONFIRMACIÓN: Enviando correo de confirmación a:', userB.email);
    console.log('📧 CONFIRMACIÓN: De parte de:', userA.name);
    console.log('📧 CONFIRMACIÓN: Para producto:', product.name);

    let proposalDetails = '';
    if (exchangeType === 'money_only') {
      proposalDetails = `oferta monetaria de $${value?.toLocaleString()} pesos`;
    } else if (exchangeType === 'product_with_money') {
      proposalDetails = `producto más $${value?.toLocaleString()} pesos adicionales`;
    } else {
      proposalDetails = `intercambio de productos`;
    }

    const msg = {
      to: userB.email,
      from: {
        email: 'noreply@casanareserv.me',
        name: 'CasanareServ - Seguridad'
      },
      subject: '✅ Propuesta de trueque enviada exitosamente',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Propuesta enviada</title>
        </head>
        <body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2c3e50; margin-bottom: 10px;">¡Propuesta enviada!</h1>
              <p style="color: #7f8c8d; font-size: 16px;">Tu propuesta de trueque ha sido enviada exitosamente</p>
            </div>
            
            <div style="background-color: #e8f5e8; padding: 20px; border-radius: 6px; margin-bottom: 20px; border-left: 4px solid #27ae60;">
              <h3 style="color: #27ae60; margin-top: 0;">Resumen de tu propuesta:</h3>
              <p><strong>Para:</strong> ${userA.name}</p>
              <p><strong>Producto solicitado:</strong> "${product.name}"</p>
              <p><strong>Tu propuesta:</strong> ${proposalDetails}</p>
            </div>
            
            <div style="background-color: #d1ecf1; padding: 15px; border-radius: 6px; margin-bottom: 20px; border-left: 4px solid #17a2b8;">
              <p style="margin: 0; color: #0c5460;">
                <strong>💡 ¿Qué puedes hacer?</strong><br>
                • El producto vuelve a estar disponible para nuevas propuestas<br>
                • Puedes enviar una propuesta diferente<br>
                • Explora otros productos disponibles en la plataforma
              </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/productos" 
                 style="background-color: #17a2b8; color: white; padding: 15px 30px; 
                        text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; margin-right: 10px;">
                Explorar productos
              </a>
              <a href="${process.env.FRONTEND_URL}/mis-trueques" 
                 style="background-color: #6c757d; color: white; padding: 15px 30px; 
                        text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Mis trueques
              </a>
            </div>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            <p style="color: #7f8c8d; font-size: 14px; text-align: center;">
              No te desanimes, hay muchas otras oportunidades de intercambio esperándote.
            </p>
            <p style="color: #95a5a6; font-size: 12px; text-align: center;">
              © ${new Date().getFullYear()} CasanareServ - Sistema de intercambios
            </p>
          </div>
        </body>
        </html>
      `
    };

    // ✅ AGREGAR LOG DEL MENSAJE ANTES DE ENVIAR
    console.log('📤 CONFIRMACIÓN: Enviando mensaje con configuración:', {
      to: msg.to,
      from: msg.from.email,
      subject: msg.subject
    });

    await sgMail.send(msg);
    console.log('✅ CONFIRMACIÓN: Correo enviado exitosamente');
    return true;
  } catch (error: any) {
    // ✅ MEJORAR LOGS DE ERROR
    console.error('❌ CONFIRMACIÓN: Error enviando correo:', error);
    console.error('CONFIRMACIÓN Error details:', {
      message: error.message,
      code: error.code,
      response: error.response?.body
    });
    return false;
  }
}
// Función para enviar correo cuando se acepta una propuesta
async function sendProposalAcceptedEmail(userB: any, userA: any, product: any, exchangeType: string, value?: number): Promise<boolean> {
  try {
    console.log('📧 Enviando correo de propuesta aceptada a:', userB.email);

    let proposalDetails = '';
    if (exchangeType === 'money_only') {
      proposalDetails = `tu oferta monetaria de $${value?.toLocaleString()} pesos`;
    } else if (exchangeType === 'product_with_money') {
      proposalDetails = `tu propuesta de producto más $${value?.toLocaleString()} pesos`;
    } else {
      proposalDetails = `tu propuesta de intercambio`;
    }

    const msg = {
      to: userB.email,
      from: {
        email: 'noreply@casanareserv.me',
        name: 'CasanareServ - Buenas Noticias'
      },
      subject: '🎉 ¡Tu propuesta de trueque fue aceptada!',
      text: `¡Felicitaciones ${userB.name}!\n\n${userA.name} ha aceptado ${proposalDetails} por su producto "${product.name}".\n\nTu trueque ahora está pendiente de aprobación administrativa.\n\nPuedes ver los detalles en: ${process.env.FRONTEND_URL}/mis-trueques\n\nSaludos,\nEquipo de CasanareServ`,
      html: `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>¡Propuesta aceptada! - CasanareServ</title>
          <style>
            @media only screen and (max-width: 600px) {
              .container { width: 100% !important; padding: 10px !important; }
              .button { padding: 12px 20px !important; font-size: 14px !important; }
            }
          </style>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f8f9fa;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8f9fa;">
            <tr>
              <td align="center" style="padding: 40px 20px;">
                <div class="container" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
                  
                  <!-- Header -->
                  <div style="background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%); padding: 30px 40px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 300;">🎉 CasanareServ</h1>
                    <p style="margin: 8px 0 0 0; color: #ecf0f1; font-size: 14px; opacity: 0.9;">¡Propuesta Aceptada!</p>
                  </div>
                  
                  <!-- Content -->
                  <div style="padding: 40px;">
                    <h2 style="margin: 0 0 20px 0; color: #2c3e50; font-size: 24px; font-weight: 600;">¡Felicitaciones!</h2>
                    
                    <p style="margin: 0 0 16px 0; color: #555; font-size: 16px;">Hola ${userB.name},</p>
                    
                    <p style="margin: 0 0 24px 0; color: #555; font-size: 16px;">
                      ¡Tenemos <strong>excelentes noticias</strong>! <strong>${userA.name}</strong> ha aceptado tu propuesta de trueque.
                    </p>
                    
                    <div style="background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 8px; padding: 20px; margin: 25px 0;">
                      <h3 style="margin: 0 0 15px 0; color: #155724; font-size: 18px;">✅ Detalles del trueque aceptado:</h3>
                      <p style="margin: 5px 0; color: #155724;"><strong>Aceptado por:</strong> ${userA.name}</p>
                      <p style="margin: 5px 0; color: #155724;"><strong>Producto:</strong> "${product.name}"</p>
                      <p style="margin: 5px 0; color: #155724;"><strong>Tu propuesta:</strong> ${proposalDetails}</p>
                    </div>
                    
                    <div style="background-color: #cce5ff; border: 1px solid #b3d7ff; border-radius: 8px; padding: 20px; margin: 25px 0;">
                      <p style="margin: 0; color: #004085; font-size: 14px;">
                        <strong>📋 Próximos pasos:</strong><br>
                        • Tu trueque está pendiente de <strong>aprobación administrativa</strong><br>
                        • Te notificaremos cuando sea aprobado<br>
                        • Luego podrás coordinar la entrega con ${userA.name}<br>
                        • El proceso suele tomar 1-2 días hábiles
                      </p>
                    </div>
                    
                    <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin: 25px 0;">
                      <p style="margin: 0; color: #856404; font-size: 14px;">
                        <strong>💡 Mientras esperas:</strong><br>
                        • Prepara tu producto para el intercambio<br>
                        • Revisa el perfil de ${userA.name}<br>
                        • Piensa en lugar seguro para el encuentro<br>
                        • Mantente atento a nuestras notificaciones
                      </p>
                    </div>
                    
                    <div style="text-align: center; margin: 35px 0;">
                      <a href="${process.env.FRONTEND_URL}/mis-trueques" 
                         class="button"
                         style="display: inline-block; background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%); 
                                color: #ffffff; text-decoration: none; padding: 16px 32px; 
                                border-radius: 8px; font-weight: 600; font-size: 16px; 
                                box-shadow: 0 3px 6px rgba(39, 174, 96, 0.3);
                                transition: all 0.3s ease;">
                        Ver detalles del trueque
                      </a>
                    </div>
                    
                    <hr style="border: none; border-top: 1px solid #e1e8ed; margin: 30px 0;">
                    
                    <p style="margin: 0 0 8px 0; color: #777; font-size: 14px;">
                      ¿Tienes preguntas sobre el proceso?
                    </p>
                    <p style="margin: 0; color: #777; font-size: 14px;">
                      Escríbenos a: <a href="mailto:trueques@casanareserv.me" style="color: #3498db; text-decoration: none;">trueques@casanareserv.me</a>
                    </p>
                  </div>
                  
                  <!-- Footer -->
                  <div style="background-color: #2c3e50; padding: 25px 40px; text-align: center;">
                    <p style="margin: 0 0 8px 0; color: #bdc3c7; font-size: 13px;">
                      <strong>CasanareServ</strong> - Facilitando intercambios exitosos
                    </p>
                    <p style="margin: 0 0 12px 0; color: #95a5a6; font-size: 12px;">
                      Casanare, Colombia • ${new Date().getFullYear()}
                    </p>
                    <p style="margin: 0; color: #7f8c8d; font-size: 11px;">
                      Este correo fue enviado a ${userB.email}.
                      <a href="#" style="color: #3498db; text-decoration: none;">Política de Privacidad</a>
                    </p>
                  </div>
                </div>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `
    };

    await sgMail.send(msg);
    console.log('✅ Correo de propuesta aceptada enviado exitosamente');
    return true;
  } catch (error) {
    console.error('❌ Error enviando correo de propuesta aceptada:', error);
    return false;
  }
}
// Función para enviar correo cuando se rechaza una propuesta
async function sendProposalRejectedEmail(userB: any, userA: any, product: any, exchangeType: string, value?: number): Promise<boolean> {
  try {
    console.log('📧 Enviando correo de propuesta rechazada a:', userB.email);

    let proposalDetails = '';
    if (exchangeType === 'money_only') {
      proposalDetails = `tu oferta monetaria de $${value?.toLocaleString()} pesos`;
    } else if (exchangeType === 'product_with_money') {
      proposalDetails = `tu propuesta de producto más $${value?.toLocaleString()} pesos`;
    } else {
      proposalDetails = `tu propuesta de intercambio`;
    }

    const msg = {
      to: userB.email,
      from: {
        email: 'noreply@casanareserv.me',
        name: 'CasanareServ - Notificaciones'
      },
      subject: 'Actualización de tu propuesta de trueque',
      text: `Hola ${userB.name},\n\nTe escribimos para informarte que ${userA.name} ha decidido no proceder con ${proposalDetails} por su producto "${product.name}".\n\nEl producto vuelve a estar disponible para nuevas propuestas. Te animamos a explorar otros productos disponibles en nuestra plataforma.\n\nPuedes ver más productos en: ${process.env.FRONTEND_URL}/productos\n\nSaludos,\nEquipo de CasanareServ`,
      html: `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Actualización de propuesta - CasanareServ</title>
          <style>
            @media only screen and (max-width: 600px) {
              .container { width: 100% !important; padding: 10px !important; }
              .button { padding: 12px 20px !important; font-size: 14px !important; }
            }
          </style>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f8f9fa;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8f9fa;">
            <tr>
              <td align="center" style="padding: 40px 20px;">
                <div class="container" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
                  
                  <!-- Header -->
                  <div style="background: linear-gradient(135deg, #95a5a6 0%, #7f8c8d 100%); padding: 30px 40px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 300;">📋 CasanareServ</h1>
                    <p style="margin: 8px 0 0 0; color: #ecf0f1; font-size: 14px; opacity: 0.9;">Actualización de propuesta</p>
                  </div>
                  
                  <!-- Content -->
                  <div style="padding: 40px;">
                    <h2 style="margin: 0 0 20px 0; color: #2c3e50; font-size: 24px; font-weight: 600;">Hola ${userB.name}</h2>
                    
                    <p style="margin: 0 0 24px 0; color: #555; font-size: 16px;">
                      Te escribimos para informarte sobre el estado de tu propuesta de trueque.
                    </p>
                    
                    <div style="background-color: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px; margin: 25px 0;">
                      <h3 style="margin: 0 0 15px 0; color: #495057; font-size: 18px;">📝 Detalles de la propuesta:</h3>
                      <p style="margin: 5px 0; color: #495057;"><strong>Para:</strong> ${userA.name}</p>
                      <p style="margin: 5px 0; color: #495057;"><strong>Producto:</strong> "${product.name}"</p>
                      <p style="margin: 5px 0; color: #495057;"><strong>Tu propuesta:</strong> ${proposalDetails}</p>
                      <p style="margin: 15px 0 5px 0; color: #6c757d; font-size: 14px;">
                        <strong>Estado:</strong> El propietario ha decidido no proceder con esta propuesta en este momento.
                      </p>
                    </div>
                    
                    <div style="background-color: #e2f3ff; border: 1px solid #b3d7ff; border-radius: 8px; padding: 20px; margin: 25px 0;">
                      <p style="margin: 0; color: #004085; font-size: 14px;">
                        <strong>💡 ¿Qué puedes hacer ahora?</strong><br>
                        • El producto vuelve a estar disponible para nuevas propuestas<br>
                        • Puedes enviar una propuesta diferente más adelante<br>
                        • Explora otros productos similares en la plataforma<br>
                        • Continúa navegando para encontrar tu intercambio ideal
                      </p>
                    </div>
                    
                    <div style="background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 8px; padding: 20px; margin: 25px 0;">
                      <p style="margin: 0; color: #155724; font-size: 14px;">
                        <strong>🌟 Te animamos a seguir intentando:</strong><br>
                        Sabemos que puede ser decepcionante, pero en CasanareServ hay cientos de productos 
                        disponibles para intercambio. ¡Tu trueque perfecto te está esperando!
                      </p>
                    </div>
                    
                    <div style="text-align: center; margin: 35px 0;">
                      <a href="${process.env.FRONTEND_URL}/productos" 
                         class="button"
                         style="display: inline-block; background: linear-gradient(135deg, #3498db 0%, #2980b9 100%); 
                                color: #ffffff; text-decoration: none; padding: 16px 32px; 
                                border-radius: 8px; font-weight: 600; font-size: 16px; 
                                box-shadow: 0 3px 6px rgba(52, 152, 219, 0.3);
                                transition: all 0.3s ease; margin-right: 10px;">
                        Explorar productos
                      </a>
                      <a href="${process.env.FRONTEND_URL}/mis-trueques" 
                         style="display: inline-block; background: linear-gradient(135deg, #95a5a6 0%, #7f8c8d 100%); 
                                color: #ffffff; text-decoration: none; padding: 16px 32px; 
                                border-radius: 8px; font-weight: 600; font-size: 16px; 
                                box-shadow: 0 3px 6px rgba(149, 165, 166, 0.3);">
                        Ver mis trueques
                      </a>
                    </div>
                    
                    <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin: 25px 0;">
                      <p style="margin: 0; color: #856404; font-size: 14px;">
                        <strong>💬 Consejo útil:</strong><br>
                        A veces las propuestas no se aceptan por timing o preferencias personales. 
                        No te desanimes y sigue explorando. ¡Cada "no" te acerca más a tu "sí" perfecto!
                      </p>
                    </div>
                    
                    <hr style="border: none; border-top: 1px solid #e1e8ed; margin: 30px 0;">
                    
                    <p style="margin: 0 0 8px 0; color: #777; font-size: 14px;">
                      ¿Necesitas ayuda para encontrar productos similares?
                    </p>
                    <p style="margin: 0; color: #777; font-size: 14px;">
                      Escríbenos a: <a href="mailto:trueques@casanareserv.me" style="color: #3498db; text-decoration: none;">trueques@casanareserv.me</a>
                    </p>
                  </div>
                  
                  <!-- Footer -->
                  <div style="background-color: #2c3e50; padding: 25px 40px; text-align: center;">
                    <p style="margin: 0 0 8px 0; color: #bdc3c7; font-size: 13px;">
                      <strong>CasanareServ</strong> - Cada intercambio cuenta una historia
                    </p>
                    <p style="margin: 0 0 12px 0; color: #95a5a6; font-size: 12px;">
                      Casanare, Colombia • ${new Date().getFullYear()}
                    </p>
                    <p style="margin: 0; color: #7f8c8d; font-size: 11px;">
                      Este correo fue enviado a ${userB.email}.
                      <a href="#" style="color: #3498db; text-decoration: none;">Política de Privacidad</a>
                    </p>
                  </div>
                </div>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `
    };

    await sgMail.send(msg);
    console.log('✅ Correo de propuesta rechazada enviado exitosamente');
    return true;
  } catch (error) {
    console.error('❌ Error enviando correo de propuesta rechazada:', error);
    return false;
  }
}
// ✅ FUNCIÓN PARA VERIFICAR Y COMPLETAR BARTER
async function checkAndUpdateBarterCompletion(barterId: number): Promise<void> {
  try {
    console.log(`🔧 [CHECK-COMPLETION] Verificando estado del barter ${barterId}`);

    const barter = await Barter.findByPk(barterId);
    if (!barter) {
      console.error(`❌ [CHECK-COMPLETION] Barter ${barterId} no encontrado`);
      return;
    }

    // Verificar si ambos usuarios han completado el pago
    const offerCompleted = barter.offer_payment_completed;
    const requestCompleted = barter.request_payment_completed;
    const currentStatus = barter.get('status');

    console.log(`🔍 [CHECK-COMPLETION] Estado actual del barter ${barterId}:`, {
      offer_payment_completed: offerCompleted,
      request_payment_completed: requestCompleted,
      current_status: currentStatus,
      offer_payment_date: barter.get('offer_payment_date'),
      request_payment_date: barter.get('request_payment_date')
    });

    // ✅ ESTE ES EL ÚNICO CAMBIO - usar currentStatus en lugar de barter.status
    if (offerCompleted && requestCompleted && currentStatus !== 'completado') {
      console.log(`🎉 [CHECK-COMPLETION] ¡AMBOS USUARIOS PAGARON! Actualizando status a "completado"`);

      await barter.update({
        status: 'completado', // ← AQUÍ ESTÁ EL CAMBIO CLAVE
        resolution_date: new Date()
      });

      console.log(`✅ [CHECK-COMPLETION] Barter ${barterId} actualizado a status "completado"`);

      // ✅ MANTENER TODA TU LÓGICA EXISTENTE:
      // Crear notificaciones para ambos usuarios
      await createNotificationForBarterStatus(barter, 'completado');
      console.log(`✅ [CHECK-COMPLETION] Notificaciones creadas`);
    } else {
      console.log(`⏳ [CHECK-COMPLETION] Aún faltan pagos o ya está completado:`, {
        'Falta pago oferente': !offerCompleted,
        'Falta pago receptor': !requestCompleted,
        'Ya completado': currentStatus === 'completado'
      });
    }

    console.log(`✅ [CHECK-COMPLETION] Verificación completada para barter ${barterId}`);
  } catch (error) {
    console.error(`❌ [CHECK-COMPLETION] Error en checkAndUpdateBarterCompletion:`, error);
  }
}

export { checkAndUpdateBarterCompletion };
/**
 * Obtiene el estado de los pagos de un trueque específico
 * Incluye información de completitud de pagos y referencias de transacciones
 */
export const getBarterPaymentStatus = async (req: Request, res: Response) => {
  try {
    const { barterId } = req.params;

    console.log(`🔍 Consultando estado de pagos para barter ${barterId}`);

    if (!barterId) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere el ID del barter'
      });
    }

    const barter = await Barter.findByPk(barterId, {
      attributes: [
        'id_barter',
        'status',
        'offer_payment_completed',
        'request_payment_completed',
        'offer_payment_date',
        'request_payment_date',
        'offer_checkout_completed',
        'request_checkout_completed',
        'id_user_offer',
        'id_user_receiving',
        'value',
        'exchange_type',
        'request_date' // Usar 'request_date' en lugar de 'createdAt'
      ]
    });

    if (!barter) {
      return res.status(404).json({
        success: false,
        message: 'Barter no encontrado'
      });
    }

    // Buscar referencias de pagos en la tabla de transacciones
    let paymentReferences: any = {
      offering_user: null,
      receiving_user: null
    };

    try {
      // Importar el modelo Transaction dinámicamente para evitar problemas de importación circular
      const { Transaction } = require('../db/associations');

      const transactions = await Transaction.findAll({
        where: {
          id_barter: barterId,
          status: 'completada'
        },
        attributes: ['id_user', 'reference_payu', 'total_amount', 'transaction_date'],
        order: [['transaction_date', 'DESC']]
      });

      console.log(`🔍 Se encontraron ${transactions.length} transacciones para barter ${barterId}`);

      // Organizar referencias por usuario
      transactions.forEach((transaction: any) => {
        const userId = transaction.get('id_user');
        const reference = transaction.get('reference_payu');

        console.log(`📝 Procesando transacción: Usuario ${userId}, Referencia ${reference}`);

        if (userId === barter.id_user_offer) {
          paymentReferences.offering_user = reference;
          console.log(`✅ Referencia asignada para usuario oferente: ${reference}`);
        } else if (userId === barter.id_user_receiving) {
          paymentReferences.receiving_user = reference;
          console.log(`✅ Referencia asignada para usuario receptor: ${reference}`);
        }
      });
    } catch (transactionError) {
      console.warn('⚠️ Error obteniendo referencias de transacciones:', transactionError);
      // No fallar si hay error con las transacciones, solo continuar sin referencias
    }

    console.log(`✅ Estado de pagos encontrado para barter ${barterId}:`, {
      offer_payment_completed: barter.offer_payment_completed,
      request_payment_completed: barter.request_payment_completed,
      payment_references: paymentReferences
    });

    res.json({
      success: true,
      data: {
        barterId: barter.id_barter,
        status: barter.status,
        value: barter.value,
        exchange_type: barter.exchange_type,
        created_at: barter.request_date,
        users: {
          offering: {
            id: barter.id_user_offer,
            payment_completed: barter.offer_payment_completed,
            payment_date: barter.offer_payment_date,
            checkout_completed: barter.offer_checkout_completed
          },
          receiving: {
            id: barter.id_user_receiving,
            payment_completed: barter.request_payment_completed,
            payment_date: barter.request_payment_date,
            checkout_completed: barter.request_checkout_completed
          }
        },
        completion: {
          both_payments_completed: barter.offer_payment_completed && barter.request_payment_completed,
          both_checkouts_completed: barter.offer_checkout_completed && barter.request_checkout_completed,
          ready_for_exchange: barter.offer_payment_completed && barter.request_payment_completed && barter.status === 'completado'
        },
        // Incluir referencias de pago de transacciones
        payment_references: paymentReferences
      }
    });
  } catch (error: any) {
    console.error('❌ Error obteniendo estado de pagos del barter:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo estado de pagos del barter',
      error: error.message
    });
  }
};
/**
 * 🔄 OBTENER TRUEQUES RECIENTES
 * Devuelve los trueques más recientes disponibles para intercambio
 * Optimizado para mostrar en cards del frontend (8 por defecto)
 */
export const getRecentBarters = async (req: Request, res: Response) => {
  try {
    const { limit = 8 } = req.query; // Límite por defecto de 8 para las cards

    console.log(`🔍 Obteniendo ${limit} trueques recientes disponibles`);

    const recentBarters = await Barter.findAll({
      where: {
        status: 'disponible', // Solo trueques disponibles para nuevas propuestas
        id_user_receiving: null // Sin propuestas pendientes
      },
      include: [
        {
          // Producto ofrecido con imagen principal
          model: Product,
          as: 'offered_product',
          attributes: ['id_product', 'name', 'price', 'description', 'status'],
          include: [
            {
              model: Image,
              as: 'productImages',
              attributes: ['id', 'url', 'is_main'],
              required: false,
              where: { entity_type: 'product' },
              limit: 1 // Solo imagen principal
            }
          ]
        },
        {
          // Usuario que ofrece el trueque
          model: User,
          as: 'offering_user',
          attributes: ['id', 'name'], // Solo datos necesarios para las cards
          include: [
            {
              model: Image,
              as: 'userImages',
              attributes: ['url'],
              required: false,
              limit: 1 // Solo foto de perfil
            }
          ]
        }
      ],
      order: [['request_date', 'DESC']], // Más recientes primero
      limit: parseInt(limit as string) // Convertir a número
    });

    console.log(`✅ Se encontraron ${recentBarters.length} trueques recientes`);

    // Formatear respuesta para optimizar frontend
    // ✅ VERSIÓN MÁS SEGURA con verificaciones
    const formattedBarters = recentBarters.map(barter => {
      const barterData = barter.get({ plain: true }) as any;

      // Verificar existencia de relaciones
      const offeredProduct = barterData.offered_product || {};
      const offeringUser = barterData.offering_user || {};
      const productImages = offeredProduct.productImages || [];
      const userImages = offeringUser.userImages || [];

      return {
        id: barterData.id_barter,
        status: barterData.status,
        exchange_type: barterData.exchange_type,
        value: barterData.value,
        notes: barterData.notes,
        request_date: barterData.request_date,

        // Información del producto ofrecido
        product: {
          id: offeredProduct.id_product || null,
          name: offeredProduct.name || 'Producto sin nombre',
          price: offeredProduct.price || 0,
          description: offeredProduct.description || '',
          image: productImages.length > 0 ? productImages[0].url : null
        },

        // Información del usuario oferente
        user: {
          id: offeringUser.id || null,
          name: offeringUser.name || 'Usuario anónimo',
          avatar: userImages.length > 0 ? userImages[0].url : null
        }
      };
    });

    res.json({
      success: true,
      data: formattedBarters,
      count: formattedBarters.length,
      message: `${formattedBarters.length} trueques recientes encontrados`
    });

  } catch (error) {
    console.error('❌ Error obteniendo trueques recientes:', error);
    res.status(500).json({
      success: false,
      msg: 'Error al obtener trueques recientes',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};
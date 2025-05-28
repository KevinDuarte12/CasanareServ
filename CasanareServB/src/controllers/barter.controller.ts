import { Request, Response } from 'express';
import { Op, QueryTypes } from 'sequelize'; // Añadir QueryTypes aquí
import Barter from '../db/models/barter';
import Product from '../db/models/product';
import User from '../db/models/user';
import Notification from '../db/models/notifications'; // Añadir esta importación al principio del archivo
import Image from '../db/models/image'; // Añadir esta línea
import sequelize from '../db/conection';
import DeliveryAddress from '../db/models/deliveryAddress'; // Añadir esta importación
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

// Actualiza la función createBarter para manejar correctamente el caso money_only
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

    // MODIFICACIÓN CLAVE: Para ofertas de solo dinero, el id_prod_offer debe ser válido
    // Verificar si es una oferta de solo dinero
    if (exchange_type === 'money_only') {
      console.log('💵 Detectada oferta de solo dinero');

      // Siempre debe existir un producto ofrecido (que pertenece al usuario A)
      if (!id_prod_request) {
        return res.status(400).json({
          msg: 'Oferta monetaria requiere un producto solicitado'
        });
      }

      // Para el usuario B que hace la oferta monetaria, buscar un producto existente
      const productOwner = await Product.findByPk(id_prod_request);
      if (productOwner) {
        finalProdOfferId = id_prod_request;
      } else {
        return res.status(404).json({
          msg: 'Producto solicitado no encontrado'
        });
      }
    }
    // El resto del código sigue igual para otras opciones
    else if (useExistingProduct && id_prod_offer) {
      // Verificar que el producto ofrecido exista
      const existingProduct = await Product.findByPk(id_prod_offer);
      if (!existingProduct) {
        return res.status(400).json({
          msg: 'El producto ofrecido no existe'
        });
      }

      finalProdOfferId = id_prod_offer;
    }
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
    } else if (id_prod_offer === -1 || id_prod_offer === null) {
      // Caso especial: trueque solo dinero
      finalProdOfferId = null;
    } else if (id_prod_offer) {
      // Si no hay productOffer pero hay id_prod_offer, usarlo directamente
      finalProdOfferId = id_prod_offer;
    } else {
      return res.status(400).json({
        msg: 'Debe proporcionar un producto para el trueque, o -1/null si es solo dinero'
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

    // Aquí definimos la variable productIds antes de usarla
    const productIds: number[] = [];

    // Recopilar IDs de productos involucrados
    if (barter.id_prod_offer !== null && barter.id_prod_offer !== undefined) {
      productIds.push(barter.id_prod_offer);
    }

    if (barter.id_prod_request !== null && barter.id_prod_request !== undefined) {
      productIds.push(barter.id_prod_request);
    }

    console.log(`🔍 Productos involucrados en el trueque ID ${id}:`, productIds);

    // Actualizar el estado y fecha de resolución según corresponda
    if (statusToUse !== 'pendiente') {
      if (statusToUse === 'rechazado') {
        // IMPORTANTE: Crear notificación ANTES de actualizar el barter
        console.log('📤 Creando notificación antes de limpiar datos de propuesta...');
        await createNotificationForBarterStatus(barter, 'rechazado');

        // Actualizar a 'disponible' en la base de datos Y LIMPIAR CAMPOS DE LA PROPUESTA RECHAZADA
        await barter.update({
          status: 'disponible',
          resolution_date: new Date(),
          id_prod_request: null,
          id_user_receiving: null,
          value: 0,
          exchange_type: 'product_for_product'
        });

        // CLAVE: Actualizar el producto del usuario A para que ya no tenga pending_barters
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

        // También actualizar el producto del usuario B si existía
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
        // CORRECCIÓN: Actualizar explícitamente el estado del trueque a 'aceptado'
        await barter.update({
          status: statusToUse,
          resolution_date: new Date()
        });
        console.log(`✅ Trueque ID ${id} actualizado correctamente a estado: ${statusToUse}`);

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
        // CORRECCIÓN: Actualizar explícitamente el estado del trueque a 'aprobado_admin'
        await barter.update({
          status: statusToUse,
          resolution_date: new Date()
        });
        console.log(`✅ Trueque ID ${id} actualizado correctamente a estado: ${statusToUse}`);

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

    // CORRECCIÓN: Eliminar notificación duplicada
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
    const barter = await Barter.findByPk(id, {
      include: [
        {
          model: Product,
          as: 'offered_product',
          include: [
            {
              model: Image,
              as: 'productImages',
              attributes: ['id', 'url', 'entity_type'],
              required: false
            }
          ]
        },
        {
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

    if (!barter) {
      return res.status(404).json({
        msg: `No existe un trueque con el ID ${id}`
      });
    }

    // ✅ CAMBIO IMPORTANTE: Solo permitir eliminar trueques disponibles (sin propuestas)
    if (barter.getDataValue('status') !== 'disponible') {
      return res.status(400).json({
        msg: 'Solo se pueden eliminar trueques en estado disponible (sin propuestas pendientes)'
      });
    }

    const id_prod_offer = barter.getDataValue('id_prod_offer');
    const id_prod_request = barter.getDataValue('id_prod_request');

    // ✅ NUEVO: Eliminar imágenes asociadas a productos de tipo 'barter'
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

    // ✅ Eliminar imágenes de productos tipo 'barter'
    if (productsToCleanImages.length > 0) {
      console.log(`🗑️ Eliminando imágenes de productos barter: ${productsToCleanImages.join(', ')}`);

      // Obtener las imágenes antes de eliminarlas (para borrar archivos del servidor)
      const imagesToDelete = await Image.findAll({
        where: {
          entity_type: 'product',
          entity_id: { [Op.in]: productsToCleanImages }
        }
      });

      // ✅ Eliminar archivos físicos del servidor (si es necesario)
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

      // ✅ Eliminar registros de imágenes de la base de datos
      await Image.destroy({
        where: {
          entity_type: 'product',
          entity_id: { [Op.in]: productsToCleanImages }
        }
      });

      console.log(`✅ ${imagesToDelete.length} imágenes eliminadas de la base de datos`);
    }

    // ✅ Eliminar productos de tipo 'barter' (creados específicamente para trueques)
    const productsToDelete: number[] = []; // ✅ Tipo explícito: array de números

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

    // Eliminar productos tipo 'barter'
    if (productsToDelete.length > 0) {
      await Product.destroy({
        where: {
          id_product: { [Op.in]: productsToDelete },
          type: 'barter'
        }
      });
      console.log(`✅ ${productsToDelete.length} productos de tipo 'barter' eliminados`);
    }

    // ✅ Restaurar productos normales (no de tipo 'barter') a disponible
    const productIds: number[] = [id_prod_offer, id_prod_request] // ✅ Tipo explícito también aquí
      .filter((id): id is number => id !== null && id !== undefined) // ✅ Type guard más específico
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

    // ✅ Eliminar el trueque
    await barter.destroy();

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

    // ACTUALIZACIÓN CLAVE: Cambiar el status del producto del usuario A a 'en_trueque'
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

    // CORRECCIÓN: Actualizar has_pending_barters del producto ofrecido (usuario A) a true
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
      id_user_offer: updatedBarter.id_user_offer, // ← Añadido para debugging
      id_user_receiving: updatedBarter.id_user_receiving,
      exchange_type: updatedBarter.exchange_type,
      value: updatedBarter.value
    });

    // ✅ AGREGAR ESTA SECCIÓN (OBTENER USUARIOS PARA NOTIFICACIONES):
    // Obtener información de los usuarios para las notificaciones y correos
    const userA = await User.findByPk(updatedBarter.id_user_offer);
    const userB = await User.findByPk(id_user_receiving);

    // CORRECCIÓN: Crear notificación para Usuario A (propietario del producto)
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
      // Ahora userA y userB están definidos correctamente
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
// Añadir este controlador al final del archivo
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
        // CORREGIR EL MENSAJE: Aclarar que el usuario B (receivingUser) está proponiendo al usuario A
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

    // Asegurar que el producto sea de tipo 'barter'
    await productExists.update({ type: 'barter' });

    console.log('✅ Validaciones pasadas, creando barter con status: disponible');

    // CAMBIO IMPORTANTE: Usar Sequelize.create con status explícito
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

// Añadir este controlador al final del archivo
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
              as: 'productImages',  // CAMBIADO DE 'images' A 'productImages'
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
              as: 'productImages',  // CAMBIADO DE 'images' A 'productImages'
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

    console.log(`🔍 Buscando barters donde el producto solicitado es: ${productId}`);

    if (!productId || isNaN(Number(productId))) {
      return res.status(400).json({
        msg: 'ID de producto inválido'
      });
    }

    // Solo cambiar aquí - asegurándonos de que usamos el campo correcto
    const barters = await Barter.findAll({
      where: {
        id_prod_request: parseInt(productId, 10), // Esto está bien, busca trueques donde este producto sea el solicitado
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
      msg: 'Error al buscar trueques por producto solicitado',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

// Añadir este método nuevo (no modificar el existente)
export const getBartersByProductRelated = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;

    console.log(`🔍 Buscando barters relacionados con el producto: ${productId}`);

    if (!productId || isNaN(Number(productId))) {
      return res.status(400).json({
        msg: 'ID de producto inválido'
      });
    }

    // Buscar cualquier barter donde este producto esté involucrado
    const barters = await Barter.findAll({
      where: {
        [Op.or]: [
          { id_prod_offer: parseInt(productId, 10) },
          { id_prod_request: parseInt(productId, 10) }
        ],
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

    console.log(`✅ Se encontraron ${barters.length} barters relacionados con producto ${productId}`);

    res.json(barters);
  } catch (error) {
    console.error(`❌ Error buscando barters relacionados con producto:`, error);
    res.status(500).json({
      msg: 'Error al buscar trueques relacionados con el producto',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

// En barter.controller.ts

// Método para completar el checkout con direcciones
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
      // Si ambos han pagado, marcar el barter como completado
      await updatedBarter.update({
        status: 'en_proceso', // O el estado que corresponda en tu flujo
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

// ✅ AGREGAR ESTAS FUNCIONES AL FINAL DEL ARCHIVO, ANTES DE LA ÚLTIMA LLAVE

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
        email: process.env.EMAIL_FROM || 'no-reply@casanareserv.me',
        name: 'CasanareServ'
      },
      subject: '✅ ¡Trueque aprobado por administración!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Trueque aprobado</title>
        </head>
        <body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #27ae60; margin-bottom: 10px;">🎉 ¡Trueque Aprobado!</h1>
              <p style="color: #7f8c8d; font-size: 16px;">Tu trueque ha sido aprobado por la administración</p>
            </div>
            
            <div style="background-color: #d4edda; padding: 20px; border-radius: 6px; margin-bottom: 20px; border-left: 4px solid #27ae60;">
              <h3 style="color: #155724; margin-top: 0;">✅ Aprobación Confirmada</h3>
              <p><strong>Con:</strong> ${otherUser.name}</p>
              <p><strong>Tipo de intercambio:</strong> ${exchangeDetails}</p>
              ${offeredProduct ? `<p><strong>Tu producto:</strong> "${offeredProduct.name}"</p>` : ''}
              ${requestedProduct ? `<p><strong>Producto del otro usuario:</strong> "${requestedProduct.name}"</p>` : ''}
            </div>
            
            <div style="background-color: #e2f3ff; padding: 20px; border-radius: 6px; margin-bottom: 20px; border-left: 4px solid #007bff;">
              <h3 style="color: #004085; margin-top: 0;">📋 Próximos pasos:</h3>
              <ol style="color: #004085; margin: 10px 0; padding-left: 20px;">
                <li><strong>Coordina la entrega:</strong> Contacta al otro usuario para acordar lugar y fecha</li>
                <li><strong>Verifica el producto:</strong> Asegúrate de que el producto esté en las condiciones acordadas</li>
                <li><strong>Completa el intercambio:</strong> Realiza el intercambio físico de manera segura</li>
                <li><strong>Confirma en la plataforma:</strong> Marca el trueque como completado</li>
              </ol>
            </div>
            
            <div style="background-color: #fff3cd; padding: 15px; border-radius: 6px; margin-bottom: 20px; border-left: 4px solid #ffc107;">
              <p style="margin: 0; color: #856404;">
                <strong>⚠️ Importante:</strong><br>
                • Realiza el intercambio en un lugar público y seguro<br>
                • Verifica la identidad del otro usuario<br>
                • Si tienes algún problema, contacta con soporte
              </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/mis-trueques" 
                 style="background-color: #27ae60; color: white; padding: 15px 30px; 
                        text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; margin-right: 10px;">
                Ver detalles del trueque
              </a>
              <a href="${process.env.FRONTEND_URL}/contacto" 
                 style="background-color: #17a2b8; color: white; padding: 15px 30px; 
                        text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Contactar soporte
              </a>
            </div>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            <p style="color: #7f8c8d; font-size: 14px; text-align: center;">
              ¡Felicitaciones! Tu trueque está listo para realizarse.
            </p>
            <p style="color: #95a5a6; font-size: 12px; text-align: center;">
              © ${new Date().getFullYear()} CasanareServ - Sistema de intercambios
            </p>
          </div>
        </body>
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
    // ✅ VERIFICAR CONFIGURACIÓN DE SENDGRID    console.log('🔧 Verificando configuración de SendGrid...');
    console.log('API Key configurada:', !!process.env.SENDGRID_API_KEY);
    console.log('Email FROM configurado:', process.env.EMAIL_FROM || 'no-reply@casanareserv.me');
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
        email: process.env.EMAIL_FROM || 'no-reply@casanareserv.me',
        name: 'CasanareServ'
      },
      subject: '🔄 Nueva propuesta de trueque recibida',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Nueva propuesta de trueque</title>
        </head>
        <body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2c3e50; margin-bottom: 10px;">¡Nueva propuesta de trueque!</h1>
              <p style="color: #7f8c8d; font-size: 16px;">Tienes una nueva propuesta para tu producto</p>
            </div>
            
            <div style="background-color: #ecf0f1; padding: 20px; border-radius: 6px; margin-bottom: 20px;">
              <h3 style="color: #34495e; margin-top: 0;">Detalles de la propuesta:</h3>
              <p><strong>De:</strong> ${userB.name}</p>
              <p><strong>Para tu producto:</strong> "${product.name}"</p>
              <p><strong>Propuesta:</strong> ${proposalDetails}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/mis-trueques" 
                 style="background-color: #27ae60; color: white; padding: 15px 30px; 
                        text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Ver propuesta completa
              </a>
            </div>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            <p style="color: #7f8c8d; font-size: 14px; text-align: center;">
              Puedes revisar los detalles completos y responder en tu panel de trueques.
            </p>
            <p style="color: #95a5a6; font-size: 12px; text-align: center;">
              © ${new Date().getFullYear()} CasanareServ - Sistema de intercambios
            </p>
          </div>
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
        email: process.env.EMAIL_FROM || 'no-reply@casanareserv.me',
        name: 'CasanareServ'
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
        email: process.env.EMAIL_FROM || 'no-reply@casanareserv.me',
        name: 'CasanareServ'
      },
      subject: '🎉 ¡Tu propuesta de trueque fue aceptada!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Propuesta aceptada</title>
        </head>
        <body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #27ae60; margin-bottom: 10px;">🎉 ¡Felicitaciones!</h1>
              <p style="color: #7f8c8d; font-size: 16px;">Tu propuesta de trueque ha sido aceptada</p>
            </div>
            
            <div style="background-color: #d4edda; padding: 20px; border-radius: 6px; margin-bottom: 20px; border-left: 4px solid #27ae60;">
              <h3 style="color: #155724; margin-top: 0;">¡Excelentes noticias!</h3>
              <p><strong>${userA.name}</strong> ha aceptado ${proposalDetails} por su producto <strong>"${product.name}"</strong>.</p>
            </div>
            
            <div style="background-color: #cce5ff; padding: 15px; border-radius: 6px; margin-bottom: 20px; border-left: 4px solid #007bff;">
              <p style="margin: 0; color: #004085;">
                <strong>📋 Próximos pasos:</strong><br>
                Tu trueque ahora está pendiente de aprobación administrativa. Una vez aprobado, podrás proceder con el intercambio.
              </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/mis-trueques" 
                 style="background-color: #27ae60; color: white; padding: 15px 30px; 
                        text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Ver detalles del trueque
              </a>
            </div>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            <p style="color: #7f8c8d; font-size: 14px; text-align: center;">
              Te notificaremos cuando el administrador apruebe el trueque.
            </p>
            <p style="color: #95a5a6; font-size: 12px; text-align: center;">
              © ${new Date().getFullYear()} CasanareServ - Sistema de intercambios
            </p>
          </div>
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
        email: process.env.EMAIL_FROM || 'no-reply@casanareserv.me',
        name: 'CasanareServ'
      },
      subject: '❌ Propuesta de trueque no aceptada',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Propuesta no aceptada</title>
        </head>
        <body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #e74c3c; margin-bottom: 10px;">Propuesta no aceptada</h1>
              <p style="color: #7f8c8d; font-size: 16px;">Información sobre tu propuesta de trueque</p>
            </div>
            
            <div style="background-color: #f8d7da; padding: 20px; border-radius: 6px; margin-bottom: 20px; border-left: 4px solid #e74c3c;">
              <h3 style="color: #721c24; margin-top: 0;">Propuesta no aceptada</h3>
              <p><strong>${userA.name}</strong> ha decidido no aceptar ${proposalDetails} por su producto <strong>"${product.name}"</strong>.</p>
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

    await sgMail.send(msg);
    console.log('✅ Correo de propuesta rechazada enviado exitosamente');
    return true;
  } catch (error) {
    console.error('❌ Error enviando correo de propuesta rechazada:', error);
    return false;
  }
}
// Buscar donde dice "// ✅ AGREGAR ESTAS FUNCIONES AL FINAL DEL ARCHIVO" y AGREGAR:

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
        'request_date' // ✅ CORREGIR: usar 'request_date' en lugar de 'createdAt'
      ]
    });

    if (!barter) {
      return res.status(404).json({
        success: false,
        message: 'Barter no encontrado'
      });
    }

    // ✅ NUEVO: BUSCAR REFERENCIAS DE PAGOS EN LA TABLA DE TRANSACCIONES
    let paymentReferences: any = {
      offering_user: null,
      receiving_user: null
    };

    try {
      // Importar el modelo Transaction dinámicamente para evitar problemas de importación circular
      const { Transaction } = require('../db/associationsImage');
      
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
        // ✅ NUEVO: AGREGAR REFERENCIAS DE PAGO
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

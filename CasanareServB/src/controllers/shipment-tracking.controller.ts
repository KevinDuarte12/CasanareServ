import { Request, Response } from 'express';
import Shipment from '../db/models/shipment-tracking';
import Transaction from '../db/models/transaction';
import Barter from '../db/models/barter';
import Cart from '../db/models/cart';
import ItemCart from '../db/models/itemcart';
import Product from '../db/models/product';
import Image from '../db/models/image';
import User from '../db/models/user';
import DeliveryAddress from '../db/models/deliveryAddress';

/**
 * Obtiene información de rastreo por ID de transacción
 * GET /api/shipment/transaction/:transactionId
 */
export const getShipmentByTransaction = async (req: Request, res: Response) => {
  try {
    const { transactionId } = req.params;

    if (!transactionId) {
      return res.status(400).json({
        success: false,
        message: 'ID de transacción requerido'
      });
    }

    console.log(`🔍 Buscando información de envío para transacción: ${transactionId}`);

    // Buscar la transacción con toda la información necesaria
    const transaction = await Transaction.findByPk(transactionId, {
      include: [
        {
          model: Shipment,
          as: 'shipment',
          required: false
        },
        {
          model: Cart,
          as: 'cartInfo',
          include: [
            {
              model: ItemCart,
              as: 'items',
              include: [
                {
                  model: Product,
                  as: 'product',
                  include: [
                    {
                      model: Image,
                      as: 'productImages',
                      required: false,
                      limit: 1
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          model: User,
          as: 'transactionUser',
          attributes: ['id', 'name', 'email']
        },
        {
          model: DeliveryAddress,
          as: 'deliveryAddress',
          required: false
        }
      ]
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transacción no encontrada'
      });
    }

    // Procesar información de productos comprados
    const cart = transaction.get('cartInfo') as any;
    const shipment = transaction.get('shipment') as any;
    const buyer = transaction.get('transactionUser') as any;
    const deliveryAddress = transaction.get('deliveryAddress') as any;

    const products = cart?.items?.map((item: any) => {
      const product = item.product;
      return {
        id: product.id_product,
        name: product.name,
        description: product.description,
        price: product.price,
        quantity: item.quantity,
        total: item.quantity * item.price,
        image: product.productImages?.[0]?.url || '/img/product-1.jpg'
      };
    }) || [];

    // Crear o obtener información de envío
    let shipmentData = {
      tracking_number: shipment?.tracking_number || null,
      status: shipment?.status || 'pendiente',
      carrier: 'Servientrega',
      estimated_delivery: shipment?.estimated_delivery || null,
      tracking_events: shipment?.tracking_events ? JSON.parse(shipment.tracking_events) : [
        {
          date: transaction.get('transaction_date'),
          status: 'Pago confirmado',
          description: 'Tu pago ha sido procesado exitosamente',
          location: 'CasanareServ'
        }
      ]
    };

    // Si no hay número de guía, agregar evento pendiente
    if (!shipmentData.tracking_number) {
      shipmentData.tracking_events.push({
        date: new Date(),
        status: 'Esperando número de guía',
        description: 'Estamos esperando el número de guía por parte de Servientrega. Te notificaremos por correo cuando esté disponible.',
        location: 'Centro de procesamiento'
      });
    }

    const response = {
      type: 'purchase',
      reference: transaction.get('reference_payu'),
      transaction_id: transaction.get('id_transaction'),
      order_date: transaction.get('transaction_date'),
      total_amount: transaction.get('total_amount'),
      status: transaction.get('status'),
      buyer: {
        name: buyer?.name || 'Usuario',
        email: buyer?.email || ''
      },
      delivery_address: deliveryAddress ? {
        street: deliveryAddress.street,
        city: deliveryAddress.city,
        department: deliveryAddress.department,
        postal_code: deliveryAddress.postal_code
      } : null,
      products,
      shipment: shipmentData,
      message: shipmentData.tracking_number 
        ? 'Tu pedido está siendo procesado por Servientrega'
        : 'Estamos preparando tu pedido y coordinando con Servientrega para el envío'
    };

    res.json(response);
  } catch (error) {
    console.error('❌ Error al obtener información de envío:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener información de envío',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

/**
 * Obtiene información de rastreo por ID de trueque
 * GET /api/shipment/barter/:barterId/:userId
 */
export const getShipmentByBarter = async (req: Request, res: Response) => {
  try {
    const { barterId, userId } = req.params;

    if (!barterId || !userId) {
      return res.status(400).json({
        success: false,
        message: 'ID de trueque y usuario requeridos'
      });
    }

    console.log(`🔍 Buscando información de envío para trueque: ${barterId}, usuario: ${userId}`);

    // Buscar el trueque con toda la información necesaria
    const barter = await Barter.findByPk(barterId, {
      include: [
        {
          model: Shipment,
          as: 'shipments',
          required: false
        },
        {
          model: Product,
          as: 'offered_product',
          include: [
            {
              model: Image,
              as: 'productImages',
              required: false,
              limit: 1
            },
            {
              model: User,
              as: 'user',
              attributes: ['id', 'name', 'email']
            }
          ]
        },
        {
          model: Product,
          as: 'requested_product',
          required: false,
          include: [
            {
              model: Image,
              as: 'productImages',
              required: false,
              limit: 1
            },
            {
              model: User,
              as: 'user',
              attributes: ['id', 'name', 'email']
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
      ]
    });

    if (!barter) {
      return res.status(404).json({
        success: false,
        message: 'Trueque no encontrado'
      });
    }

    const currentUserId = parseInt(userId);
    const offeringUserId = barter.get('id_user_offer') as number;
    const receivingUserId = barter.get('id_user_receiving') as number;
    const exchangeType = barter.get('exchange_type') as string;

    // Determinar qué productos mostrar según el usuario y tipo de intercambio
    let productsToShow = [];
    let userRole = '';

    if (currentUserId === offeringUserId) {
      // Usuario A (quien ofreció el producto)
      userRole = 'sender';
      
      if (exchangeType === 'money_only') {
        // Solo dinero: Usuario A no ve productos adicionales (solo recibe dinero)
        productsToShow = [{
          id: 'money',
          name: 'Pago por trueque',
          description: `Recibirás $${barter.get('value')?.toLocaleString('es-CO')} por tu producto`,
          price: barter.get('value') || 0,
          quantity: 1,
          total: barter.get('value') || 0,
          image: '/img/money-icon.png',
          type: 'payment'
        }];
      } else {
        // Intercambio de productos: Usuario A ve el producto que recibirá (requested_product)
        const requestedProduct = barter.get('requested_product') as any;
        if (requestedProduct) {
          productsToShow.push({
            id: requestedProduct.id_product,
            name: requestedProduct.name,
            description: requestedProduct.description,
            price: requestedProduct.price,
            quantity: 1,
            total: requestedProduct.price,
            image: requestedProduct.productImages?.[0]?.url || '/img/product-1.jpg',
            type: 'product_exchange'
          });
        }
      }
    } else if (currentUserId === receivingUserId) {
      // Usuario B (quien recibe el producto ofrecido)
      userRole = 'receiver';
      
      // Usuario B siempre ve el producto que recibirá (offered_product)
      const offeredProduct = barter.get('offered_product') as any;
      if (offeredProduct) {
        productsToShow.push({
          id: offeredProduct.id_product,
          name: offeredProduct.name,
          description: offeredProduct.description,
          price: offeredProduct.price,
          quantity: 1,
          total: offeredProduct.price,
          image: offeredProduct.productImages?.[0]?.url || '/img/product-1.jpg',
          type: 'product_exchange'
        });
      }
    }

    // Obtener información de envío
    const shipments = barter.get('shipments') as any[] || [];
    let userShipment = shipments.find(s => 
      (userRole === 'sender' && s.sender_user_id === currentUserId) ||
      (userRole === 'receiver' && s.receiver_user_id === currentUserId)
    );

    let shipmentData = {
      tracking_number: userShipment?.tracking_number || null,
      status: userShipment?.status || 'pendiente',
      carrier: 'Servientrega',
      estimated_delivery: userShipment?.estimated_delivery || null,
      tracking_events: userShipment?.tracking_events ? JSON.parse(userShipment.tracking_events) : [
        {
          date: barter.get('request_date'),
          status: 'Trueque aprobado',
          description: 'El trueque ha sido aprobado y está siendo procesado',
          location: 'CasanareServ'
        }
      ]
    };

    // Si no hay número de guía, agregar evento pendiente
    if (!shipmentData.tracking_number) {
      shipmentData.tracking_events.push({
        date: new Date(),
        status: 'Esperando número de guía',
        description: 'Estamos esperando el número de guía por parte de Servientrega. Te notificaremos por correo cuando esté disponible.',
        location: 'Centro de procesamiento'
      });
    }

    const response = {
      type: 'barter',
      barter_id: barter.get('id_barter'),
      reference: `BARTER-${barter.get('id_barter')}`,
      order_date: barter.get('request_date'),
      exchange_type: exchangeType,
      status: barter.get('status'),
      user_role: userRole,
      products: productsToShow,
      shipment: shipmentData,
      message: shipmentData.tracking_number 
        ? `Tu ${exchangeType === 'money_only' ? 'producto' : 'intercambio'} está siendo procesado por Servientrega`
        : `Estamos preparando tu ${exchangeType === 'money_only' ? 'envío' : 'intercambio'} y coordinando con Servientrega`
    };

    res.json(response);
  } catch (error) {
    console.error('❌ Error al obtener información de envío de trueque:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener información de envío',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

/**
 * Actualiza el número de guía de Servientrega
 * PUT /api/shipment/update-tracking
 */
export const updateTrackingNumber = async (req: Request, res: Response) => {
  try {
    const { id_transaction, id_barter, tracking_number, estimated_delivery } = req.body;

    if (!tracking_number) {
      return res.status(400).json({
        success: false,
        message: 'Número de guía requerido'
      });
    }

    let shipment;

    if (id_transaction) {
      // Buscar o crear shipment para transacción
      shipment = await Shipment.findOne({
        where: { id_transaction }
      });

      if (!shipment) {
        shipment = await Shipment.create({
          id_transaction,
          tracking_number,
          status: 'en_transito',
          estimated_delivery: estimated_delivery ? new Date(estimated_delivery) : null,
          tracking_events: JSON.stringify([
            {
              date: new Date(),
              status: 'En tránsito',
              description: 'Tu paquete ha sido enviado por Servientrega',
              location: 'Centro de distribución'
            }
          ])
        });
      } else {
        await shipment.update({
          tracking_number,
          status: 'en_transito',
          estimated_delivery: estimated_delivery ? new Date(estimated_delivery) : null
        });
      }
    } else if (id_barter) {
      // Buscar o crear shipment para trueque
      shipment = await Shipment.findOne({
        where: { id_barter }
      });

      if (!shipment) {
        shipment = await Shipment.create({
          id_barter,
          tracking_number,
          status: 'en_transito',
          estimated_delivery: estimated_delivery ? new Date(estimated_delivery) : null,
          tracking_events: JSON.stringify([
            {
              date: new Date(),
              status: 'En tránsito',
              description: 'Tu intercambio ha sido enviado por Servientrega',
              location: 'Centro de distribución'
            }
          ])
        });
      } else {
        await shipment.update({
          tracking_number,
          status: 'en_transito',
          estimated_delivery: estimated_delivery ? new Date(estimated_delivery) : null
        });
      }
    }

    // Aquí podrías enviar un email de notificación al usuario
    // await sendTrackingNumberEmail(user, tracking_number);

    res.json({
      success: true,
      message: 'Número de guía actualizado correctamente',
      shipment
    });
  } catch (error) {
    console.error('❌ Error al actualizar número de guía:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar número de guía',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};
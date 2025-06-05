"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateTrackingNumber = exports.getShipmentByBarter = exports.getShipmentByTransaction = void 0;
const shipment_tracking_1 = __importDefault(require("../db/models/shipment-tracking"));
const transaction_1 = __importDefault(require("../db/models/transaction"));
const barter_1 = __importDefault(require("../db/models/barter"));
const cart_1 = __importDefault(require("../db/models/cart"));
const itemcart_1 = __importDefault(require("../db/models/itemcart"));
const product_1 = __importDefault(require("../db/models/product"));
const image_1 = __importDefault(require("../db/models/image"));
const user_1 = __importDefault(require("../db/models/user"));
const deliveryAddress_1 = __importDefault(require("../db/models/deliveryAddress"));
/**
 * Obtiene información de rastreo por ID de transacción
 * GET /api/shipment/transaction/:transactionId
 */
const getShipmentByTransaction = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
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
        const transaction = yield transaction_1.default.findByPk(transactionId, {
            include: [
                {
                    model: shipment_tracking_1.default,
                    as: 'shipment',
                    required: false
                },
                {
                    model: cart_1.default,
                    as: 'cartInfo',
                    include: [
                        {
                            model: itemcart_1.default,
                            as: 'items',
                            include: [
                                {
                                    model: product_1.default,
                                    as: 'product',
                                    include: [
                                        {
                                            model: image_1.default,
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
                    model: user_1.default,
                    as: 'transactionUser',
                    attributes: ['id', 'name', 'email']
                },
                {
                    model: deliveryAddress_1.default,
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
        const cart = transaction.get('cartInfo');
        const shipment = transaction.get('shipment');
        const buyer = transaction.get('transactionUser');
        const deliveryAddress = transaction.get('deliveryAddress');
        const products = ((_a = cart === null || cart === void 0 ? void 0 : cart.items) === null || _a === void 0 ? void 0 : _a.map((item) => {
            var _a, _b;
            const product = item.product;
            return {
                id: product.id_product,
                name: product.name,
                description: product.description,
                price: product.price,
                quantity: item.quantity,
                total: item.quantity * item.price,
                image: ((_b = (_a = product.productImages) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.url) || '/img/product-1.jpg'
            };
        })) || [];
        // Crear o obtener información de envío
        let shipmentData = {
            tracking_number: (shipment === null || shipment === void 0 ? void 0 : shipment.tracking_number) || null,
            status: (shipment === null || shipment === void 0 ? void 0 : shipment.status) || 'pendiente',
            carrier: 'Servientrega',
            estimated_delivery: (shipment === null || shipment === void 0 ? void 0 : shipment.estimated_delivery) || null,
            tracking_events: (shipment === null || shipment === void 0 ? void 0 : shipment.tracking_events) ? JSON.parse(shipment.tracking_events) : [
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
                name: (buyer === null || buyer === void 0 ? void 0 : buyer.name) || 'Usuario',
                email: (buyer === null || buyer === void 0 ? void 0 : buyer.email) || ''
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
    }
    catch (error) {
        console.error('❌ Error al obtener información de envío:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener información de envío',
            error: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
});
exports.getShipmentByTransaction = getShipmentByTransaction;
/**
 * Obtiene información de rastreo por ID de trueque
 * GET /api/shipment/barter/:barterId/:userId
 */
const getShipmentByBarter = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e;
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
        const barter = yield barter_1.default.findByPk(barterId, {
            include: [
                {
                    model: shipment_tracking_1.default,
                    as: 'shipments',
                    required: false
                },
                {
                    model: product_1.default,
                    as: 'offered_product',
                    include: [
                        {
                            model: image_1.default,
                            as: 'productImages',
                            required: false,
                            limit: 1
                        },
                        {
                            model: user_1.default,
                            as: 'user',
                            attributes: ['id', 'name', 'email']
                        }
                    ]
                },
                {
                    model: product_1.default,
                    as: 'requested_product',
                    required: false,
                    include: [
                        {
                            model: image_1.default,
                            as: 'productImages',
                            required: false,
                            limit: 1
                        },
                        {
                            model: user_1.default,
                            as: 'user',
                            attributes: ['id', 'name', 'email']
                        }
                    ]
                },
                {
                    model: user_1.default,
                    as: 'offering_user',
                    attributes: ['id', 'name', 'email']
                },
                {
                    model: user_1.default,
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
        const offeringUserId = barter.get('id_user_offer');
        const receivingUserId = barter.get('id_user_receiving');
        const exchangeType = barter.get('exchange_type');
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
                        description: `Recibirás $${(_a = barter.get('value')) === null || _a === void 0 ? void 0 : _a.toLocaleString('es-CO')} por tu producto`,
                        price: barter.get('value') || 0,
                        quantity: 1,
                        total: barter.get('value') || 0,
                        image: '/img/money-icon.png',
                        type: 'payment'
                    }];
            }
            else {
                // Intercambio de productos: Usuario A ve el producto que recibirá (requested_product)
                const requestedProduct = barter.get('requested_product');
                if (requestedProduct) {
                    productsToShow.push({
                        id: requestedProduct.id_product,
                        name: requestedProduct.name,
                        description: requestedProduct.description,
                        price: requestedProduct.price,
                        quantity: 1,
                        total: requestedProduct.price,
                        image: ((_c = (_b = requestedProduct.productImages) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.url) || '/img/product-1.jpg',
                        type: 'product_exchange'
                    });
                }
            }
        }
        else if (currentUserId === receivingUserId) {
            // Usuario B (quien recibe el producto ofrecido)
            userRole = 'receiver';
            // Usuario B siempre ve el producto que recibirá (offered_product)
            const offeredProduct = barter.get('offered_product');
            if (offeredProduct) {
                productsToShow.push({
                    id: offeredProduct.id_product,
                    name: offeredProduct.name,
                    description: offeredProduct.description,
                    price: offeredProduct.price,
                    quantity: 1,
                    total: offeredProduct.price,
                    image: ((_e = (_d = offeredProduct.productImages) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.url) || '/img/product-1.jpg',
                    type: 'product_exchange'
                });
            }
        }
        // Obtener información de envío
        const shipments = barter.get('shipments') || [];
        let userShipment = shipments.find(s => (userRole === 'sender' && s.sender_user_id === currentUserId) ||
            (userRole === 'receiver' && s.receiver_user_id === currentUserId));
        let shipmentData = {
            tracking_number: (userShipment === null || userShipment === void 0 ? void 0 : userShipment.tracking_number) || null,
            status: (userShipment === null || userShipment === void 0 ? void 0 : userShipment.status) || 'pendiente',
            carrier: 'Servientrega',
            estimated_delivery: (userShipment === null || userShipment === void 0 ? void 0 : userShipment.estimated_delivery) || null,
            tracking_events: (userShipment === null || userShipment === void 0 ? void 0 : userShipment.tracking_events) ? JSON.parse(userShipment.tracking_events) : [
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
    }
    catch (error) {
        console.error('❌ Error al obtener información de envío de trueque:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener información de envío',
            error: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
});
exports.getShipmentByBarter = getShipmentByBarter;
/**
 * Actualiza el número de guía de Servientrega
 * PUT /api/shipment/update-tracking
 */
const updateTrackingNumber = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
            shipment = yield shipment_tracking_1.default.findOne({
                where: { id_transaction }
            });
            if (!shipment) {
                shipment = yield shipment_tracking_1.default.create({
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
            }
            else {
                yield shipment.update({
                    tracking_number,
                    status: 'en_transito',
                    estimated_delivery: estimated_delivery ? new Date(estimated_delivery) : null
                });
            }
        }
        else if (id_barter) {
            // Buscar o crear shipment para trueque
            shipment = yield shipment_tracking_1.default.findOne({
                where: { id_barter }
            });
            if (!shipment) {
                shipment = yield shipment_tracking_1.default.create({
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
            }
            else {
                yield shipment.update({
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
    }
    catch (error) {
        console.error('❌ Error al actualizar número de guía:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar número de guía',
            error: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
});
exports.updateTrackingNumber = updateTrackingNumber;

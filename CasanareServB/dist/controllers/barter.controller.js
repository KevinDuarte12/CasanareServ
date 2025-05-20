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
exports.getBartersByProductRelated = exports.getBartersByProductOffered = exports.getBartersByStatus = exports.getBartersPendingAdminApproval = exports.checkExistingProposal = exports.createBarterPublication = exports.createNotificationForBarter = exports.proposeForExistingBarter = exports.getUserBarters = exports.deleteBarter = exports.updateBarterStatus = exports.updateBarter = exports.createBarter = exports.getBarterById = exports.getBarters = void 0;
const sequelize_1 = require("sequelize"); // Añadir QueryTypes aquí
const barter_1 = __importDefault(require("../db/models/barter"));
const product_1 = __importDefault(require("../db/models/product"));
const user_1 = __importDefault(require("../db/models/user"));
const notifications_1 = __importDefault(require("../db/models/notifications")); // Añadir esta importación al principio del archivo
const image_1 = __importDefault(require("../db/models/image")); // Añadir esta línea
// Importar funciones de Socket.IO
const socket_1 = require("../sockets/socket");
// Obtener todos los trueques
const getBarters = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const barters = yield barter_1.default.findAll({
            include: [
                {
                    model: product_1.default,
                    as: 'offered_product',
                    attributes: ['id_product', 'name', 'price', 'description'],
                    include: [
                        {
                            model: image_1.default,
                            as: 'productImages',
                            attributes: ['id', 'url', 'is_main'],
                            required: false
                        }
                    ]
                },
                {
                    model: product_1.default,
                    as: 'requested_product',
                    attributes: ['id_product', 'name', 'price', 'description'],
                    include: [
                        {
                            model: image_1.default,
                            as: 'productImages',
                            attributes: ['id', 'url', 'is_main'],
                            required: false
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
            ],
            order: [['request_date', 'DESC']]
        });
        res.json(barters);
    }
    catch (error) {
        console.error('Error al obtener trueques:', error);
        res.status(500).json({
            msg: 'Error al obtener los trueques'
        });
    }
});
exports.getBarters = getBarters;
// Obtener un trueque por ID
const getBarterById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        const barter = yield barter_1.default.findByPk(id, {
            include: [
                {
                    model: product_1.default,
                    as: 'offered_product',
                    attributes: ['id_product', 'name', 'price', 'description']
                },
                {
                    model: product_1.default,
                    as: 'requested_product',
                    attributes: ['id_product', 'name', 'price', 'description']
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
                msg: `No existe un trueque con el ID ${id}`
            });
        }
        res.json(barter);
    }
    catch (error) {
        console.error('Error al obtener trueque:', error);
        res.status(500).json({
            msg: 'Error al obtener el trueque'
        });
    }
});
exports.getBarterById = getBarterById;
// Actualiza la función createBarter para manejar correctamente el caso money_only
const createBarter = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { productOffer, id_prod_request, id_user_offer, id_user_receiving, notes, useExistingProduct, id_prod_offer, status, exchange_type, value } = req.body;
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
            const prodRequest = yield product_1.default.findOne({
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
            const productOwner = yield product_1.default.findByPk(id_prod_request);
            if (productOwner) {
                finalProdOfferId = id_prod_request;
            }
            else {
                return res.status(404).json({
                    msg: 'Producto solicitado no encontrado'
                });
            }
        }
        // El resto del código sigue igual para otras opciones
        else if (useExistingProduct && id_prod_offer) {
            // Verificar que el producto ofrecido exista
            const existingProduct = yield product_1.default.findByPk(id_prod_offer);
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
                const similarProduct = yield product_1.default.findOne({
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
                const createdProduct = yield product_1.default.create({
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
        }
        else if (id_prod_offer === -1 || id_prod_offer === null) {
            // Caso especial: trueque solo dinero
            finalProdOfferId = null;
        }
        else if (id_prod_offer) {
            // Si no hay productOffer pero hay id_prod_offer, usarlo directamente
            finalProdOfferId = id_prod_offer;
        }
        else {
            return res.status(400).json({
                msg: 'Debe proporcionar un producto para el trueque, o -1/null si es solo dinero'
            });
        }
        // PUNTO CLAVE 2: Verificar si ya existe un barter para este producto
        const existingBarter = yield barter_1.default.findOne({
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
            barter = yield existingBarter.update({
                id_prod_request: id_prod_request || existingBarter.getDataValue('id_prod_request'),
                id_user_receiving: id_user_receiving || existingBarter.getDataValue('id_user_receiving'),
                value: value || (productOffer === null || productOffer === void 0 ? void 0 : productOffer.value) || existingBarter.getDataValue('value') || 0,
                status: status || 'pendiente',
                request_date: new Date(),
                notes: notes || existingBarter.getDataValue('notes') || '',
                exchange_type: finalExchangeType
            });
            console.log(`✅ Barter actualizado con éxito, ID: ${barter.getDataValue('id_barter')}`);
        }
        else {
            // Crear un nuevo barter solo si no existe
            console.log(`🆕 Creando nuevo barter para producto ${finalProdOfferId}, tipo: ${finalExchangeType}`);
            try {
                barter = yield barter_1.default.create({
                    id_prod_offer: finalProdOfferId,
                    id_prod_request: exchange_type === 'money_only' ? null : (id_prod_request || null),
                    id_user_offer: id_user_offer,
                    id_user_receiving: id_user_receiving || null,
                    value: value || (productOffer === null || productOffer === void 0 ? void 0 : productOffer.value) || 0,
                    status: status || 'pendiente',
                    request_date: new Date(),
                    notes: notes || '',
                    exchange_type: finalExchangeType
                });
                console.log(`✅ Nuevo barter creado con ID: ${barter.getDataValue('id_barter')}, tipo: ${finalExchangeType}`);
            }
            catch (createError) {
                // En caso de error de duplicidad, hacer una última verificación
                if (createError.name === 'SequelizeUniqueConstraintError') {
                    console.log(`⚠️ Detectada condición de carrera. Buscando barter existente...`);
                    // Última verificación para condición de carrera
                    const lastChanceBarter = yield barter_1.default.findOne({
                        where: { id_prod_offer: finalProdOfferId }
                    });
                    if (lastChanceBarter) {
                        // Actualizar el barter encontrado
                        barter = yield lastChanceBarter.update({
                            id_prod_request: id_prod_request || lastChanceBarter.getDataValue('id_prod_request'),
                            id_user_receiving: id_user_receiving || lastChanceBarter.getDataValue('id_user_receiving'),
                            value: value || (productOffer === null || productOffer === void 0 ? void 0 : productOffer.value) || lastChanceBarter.getDataValue('value') || 0,
                            status: status || 'pendiente',
                            request_date: new Date(),
                            notes: notes || lastChanceBarter.getDataValue('notes') || '',
                            exchange_type: finalExchangeType
                        });
                        console.log(`✅ Barter recuperado y actualizado, ID: ${barter.getDataValue('id_barter')}`);
                    }
                    else {
                        throw new Error('No se pudo crear ni actualizar el barter');
                    }
                }
                else {
                    // Otro tipo de error, relanzarlo
                    throw createError;
                }
            }
        }
        // Cambiar el producto solicitado a pendiente
        if (id_prod_request) {
            yield product_1.default.update({
                status: 'pendiente',
                has_pending_barters: true
            }, { where: { id_product: id_prod_request } });
            console.log(`✅ Producto solicitado ${id_prod_request} marcado como pendiente`);
        }
        // Crear notificación para el receptor
        if (id_user_receiving) {
            yield (0, exports.createNotificationForBarter)(barter, 'new_barter');
            console.log(`✅ Notificación creada para usuario ${id_user_receiving}`);
        }
        // Incluir información completa en la respuesta
        const completeBarterData = yield barter_1.default.findByPk(barter.getDataValue('id_barter'), {
            include: [
                { model: product_1.default, as: 'offered_product' },
                { model: product_1.default, as: 'requested_product' },
                { model: user_1.default, as: 'offering_user' },
                { model: user_1.default, as: 'receiving_user' }
            ]
        });
        res.status(201).json({
            msg: existingBarter ? 'Solicitud de trueque actualizada correctamente' : 'Solicitud de trueque creada correctamente',
            barter: completeBarterData
        });
    }
    catch (error) {
        // Agregar mejor manejo de errores con tipado
        const typedError = error;
        console.error('❌ Error en createBarter:', typedError);
        console.error(typedError.stack || 'No stack trace disponible');
        res.status(500).json({
            msg: 'Error al procesar la solicitud de trueque',
            error: typedError.message || 'Error desconocido'
        });
    }
});
exports.createBarter = createBarter;
// Función para actualizar un trueque completo (no solo su estado)
const updateBarter = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { id_prod_offer, id_prod_request, id_user_offer, id_user_receiving, status, value, notes, exchange_type // Añadir este campo
     } = req.body;
    try {
        // Verificar si existe el trueque
        const barter = yield barter_1.default.findByPk(id);
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
            yield product_1.default.update({ status: 'disponible' }, { where: { id_product: currentProdOffer } });
            // El nuevo producto pasa a en_trueque
            if (id_prod_offer) {
                yield product_1.default.update({ status: 'en_trueque' }, { where: { id_product: id_prod_offer } });
            }
        }
        if (currentProdRequest && currentProdRequest !== id_prod_request) {
            // El producto anterior vuelve a disponible
            yield product_1.default.update({ status: 'disponible' }, { where: { id_product: currentProdRequest } });
            // El nuevo producto pasa a en_trueque
            if (id_prod_request) {
                yield product_1.default.update({ status: 'en_trueque' }, { where: { id_product: id_prod_request } });
            }
        }
        // Actualizar el trueque
        yield barter.update(Object.assign({ id_prod_offer,
            id_prod_request,
            id_user_offer,
            id_user_receiving,
            status,
            value,
            notes,
            exchange_type }, (status !== 'pendiente' && { resolution_date: new Date() })));
        res.json({
            msg: 'Trueque actualizado correctamente',
            barter
        });
    }
    catch (error) {
        console.error('Error al actualizar trueque:', error);
        res.status(500).json({
            msg: 'Error al actualizar el trueque'
        });
    }
});
exports.updateBarter = updateBarter;
// Modificación de la función updateBarterStatus
const updateBarterStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        }
        catch (e) {
            console.error("⚠️ Error parseando body:", e);
        }
    }
    // Extraer status con mejor manejo de casos
    let statusToUse;
    if (bodyData && bodyData.status !== undefined) {
        statusToUse = bodyData.status;
        console.log("✅ Usando status del body:", statusToUse);
    }
    else if (bodyData && bodyData.estado !== undefined) {
        statusToUse = bodyData.estado;
        console.log("✅ Usando estado del body:", statusToUse);
    }
    else {
        // Si es el caso específico de aprobado_admin, forzarlo
        if (req.originalUrl.includes('/status') && req.method === 'PATCH') {
            const adminApprovalAttempt = req.body.toString().includes('aprobado_admin');
            if (adminApprovalAttempt) {
                statusToUse = 'aprobado_admin';
                console.log("✅ Detectado intento de aprobación admin, forzando estado:", statusToUse);
            }
            else {
                statusToUse = 'pendiente';
                console.log("⚠️ No se encontró status ni estado, usando valor por defecto:", statusToUse);
            }
        }
        else {
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
        const barter = yield barter_1.default.findByPk(id);
        if (!barter) {
            return res.status(404).json({
                msg: `No existe un trueque con el ID ${id}`
            });
        }
        // Aquí definimos la variable productIds antes de usarla
        const productIds = [];
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
                // Guardar el ID del usuario que hizo la propuesta antes de limpiar
                const receivingUserId = barter.id_user_receiving;
                // IMPORTANTE: Crear notificación ANTES de actualizar el barter
                console.log('📤 Creando notificación antes de limpiar datos de propuesta...');
                yield createNotificationForBarterStatus(barter, 'rechazado');
                // Actualizar a 'disponible' en la base de datos Y LIMPIAR CAMPOS DE LA PROPUESTA RECHAZADA
                yield barter.update({
                    status: 'disponible',
                    resolution_date: new Date(),
                    id_prod_request: null,
                    id_user_receiving: null,
                    value: 0, // <-- LIMPIAR MONTO
                    exchange_type: 'product_for_product' // <-- RESETEAR TIPO DE INTERCAMBIO
                });
                // CLAVE: Actualizar el producto del usuario A para que ya no tenga pending_barters
                if (barter.id_prod_offer) {
                    console.log(`🔄 Actualizando producto ofrecido ID ${barter.id_prod_offer} para que aparezca en la tienda`);
                    yield product_1.default.update({
                        has_pending_barters: false,
                        status: 'disponible'
                    }, { where: { id_product: barter.id_prod_offer } });
                }
                // También actualizar el producto del usuario B si existía
                if (barter.id_prod_request) {
                    console.log(`🔄 Actualizando producto solicitado ID ${barter.id_prod_request} a disponible`);
                    yield product_1.default.update({
                        status: 'disponible',
                        has_pending_barters: false
                    }, { where: { id_product: barter.id_prod_request } });
                }
                console.log(`🔄 Propuesta rechazada: Trueque ID ${id} vuelve a estado disponible y se limpiaron los campos.`);
            }
            else if (statusToUse === 'aceptado') {
                // CORRECCIÓN: Actualizar explícitamente el estado del trueque a 'aceptado'
                yield barter.update({
                    status: statusToUse,
                    resolution_date: new Date()
                });
                console.log(`✅ Trueque ID ${id} actualizado correctamente a estado: ${statusToUse}`);
                // Si lo acepta el usuario receptor, pasa a en_trueque mientras espera aprobación del admin
                if (productIds.length > 0) {
                    yield product_1.default.update({
                        status: 'en_trueque',
                        has_pending_barters: true
                    }, { where: { id_product: { [sequelize_1.Op.in]: productIds } } });
                }
            }
            else if (statusToUse === 'aprobado_admin') {
                // CORRECCIÓN: Actualizar explícitamente el estado del trueque a 'aprobado_admin'
                yield barter.update({
                    status: statusToUse,
                    resolution_date: new Date()
                });
                console.log(`✅ Trueque ID ${id} actualizado correctamente a estado: ${statusToUse}`);
                // Si el admin lo aprueba, mantener en en_trueque pero actualizar otro campo
                if (productIds.length > 0) {
                    yield product_1.default.update({
                        status: 'en_trueque',
                        admin_approved: true,
                        has_pending_barters: true
                    }, { where: { id_product: { [sequelize_1.Op.in]: productIds } } });
                }
            }
            else if (statusToUse === 'completado') {
                // Si se completa el trueque, los productos pasan a estado "vendido"
                if (productIds.length > 0) {
                    yield product_1.default.update({
                        status: 'vendido',
                        admin_approved: false,
                        has_pending_barters: false
                    }, { where: { id_product: { [sequelize_1.Op.in]: productIds } } });
                }
            }
        }
        else {
            // Si vuelve a pendiente, solo actualizar el estado del trueque
            yield barter.update({ status: statusToUse });
        }
        // CORRECCIÓN: Eliminar notificación duplicada
        if (statusToUse !== 'rechazado') {
            yield createNotificationForBarterStatus(barter, statusToUse);
        }
        // Después de actualizar el barter, busca y devuelve el barter actualizado
        const updatedBarter = yield barter_1.default.findByPk(id, {
            include: [
            // incluir relaciones...
            ]
        });
        res.json({
            msg: `Estado del trueque actualizado a ${statusToUse}`,
            barter: updatedBarter
        });
    }
    catch (error) {
        console.error('Error al actualizar estado del trueque:', error);
        res.status(500).json({
            msg: 'Error al actualizar el estado del trueque'
        });
    }
});
exports.updateBarterStatus = updateBarterStatus;
// Eliminar un trueque (cancelar)
const deleteBarter = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        // Verificar si existe el trueque
        const barter = yield barter_1.default.findByPk(id);
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
            yield product_1.default.update({ status: 'disponible' }, { where: { id_product: { [sequelize_1.Op.in]: productIds } } });
        }
        // Eliminar el trueque
        yield barter.destroy();
        res.json({
            msg: 'Trueque eliminado correctamente'
        });
    }
    catch (error) {
        console.error('Error al eliminar trueque:', error);
        res.status(500).json({
            msg: 'Error al eliminar el trueque'
        });
    }
});
exports.deleteBarter = deleteBarter;
// Obtener trueques de un usuario específico
const getUserBarters = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.params;
    try {
        const barters = yield barter_1.default.findAll({
            where: {
                [sequelize_1.Op.or]: [
                    { id_user_offer: userId },
                    { id_user_receiving: userId }
                ]
            },
            include: [
                {
                    model: product_1.default,
                    as: 'offered_product',
                    attributes: ['id_product', 'name', 'price', 'description', 'id_category'],
                    include: [
                        {
                            model: image_1.default,
                            as: 'productImages',
                            attributes: ['id', 'url', 'is_main'],
                            required: false
                        }
                    ]
                },
                {
                    model: product_1.default,
                    as: 'requested_product',
                    attributes: ['id_product', 'name', 'price', 'description', 'id_category'],
                    include: [
                        {
                            model: image_1.default,
                            as: 'productImages',
                            attributes: ['id', 'url', 'is_main'],
                            required: false
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
            ],
            order: [['request_date', 'DESC']]
        });
        res.json(barters);
    }
    catch (error) {
        console.error(`Error al obtener trueques del usuario ${userId}:`, error);
        res.status(500).json({
            msg: 'Error al obtener los trueques del usuario'
        });
    }
});
exports.getUserBarters = getUserBarters;
// Añadir este endpoint en barter.controller.ts
const proposeForExistingBarter = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const barter = yield barter_1.default.findByPk(id);
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
            yield product_1.default.update({ status: 'en_trueque', has_pending_barters: true }, { where: { id_product: barter.id_prod_offer } });
        }
        // Si no es oferta solo dinero, actualizar también el producto solicitado
        if (exchange_type !== 'money_only' && id_prod_request) {
            console.log(`🔄 Actualizando producto solicitado (ID: ${id_prod_request}) - status=en_trueque`);
            yield product_1.default.update({
                status: 'en_trueque',
                has_pending_barters: true
            }, { where: { id_product: id_prod_request } });
        }
        else {
            console.log(`💰 Propuesta de tipo solo dinero - No se modifican estados del producto solicitado`);
        }
        // CORRECCIÓN: Actualizar has_pending_barters del producto ofrecido (usuario A) a true
        if (barter.id_prod_offer) {
            console.log(`🔄 Actualizando has_pending_barters del producto ${barter.id_prod_offer} a true`);
            yield product_1.default.update({ has_pending_barters: true }, { where: { id_product: barter.id_prod_offer } });
        }
        // Actualizar el trueque existente (solo los campos necesarios)
        const updateData = {
            id_prod_request: exchange_type === 'money_only' ? null : (id_prod_request || barter.id_prod_request),
            id_user_receiving: id_user_receiving || barter.id_user_receiving,
            status: 'pendiente', // Usar el tipo definido
            request_date: new Date(),
            notes: notes || barter.notes,
            exchange_type: exchange_type || barter.exchange_type,
            value: value !== undefined ? value : barter.value
        };
        console.log(`🔄 Actualizando barter con datos:`, updateData);
        const updatedBarter = yield barter.update(updateData);
        console.log(`✅ Barter actualizado exitosamente:`, {
            id: updatedBarter.id_barter,
            status: updatedBarter.status,
            id_user_offer: updatedBarter.id_user_offer, // ← Añadido para debugging
            id_user_receiving: updatedBarter.id_user_receiving,
            exchange_type: updatedBarter.exchange_type,
            value: updatedBarter.value
        });
        // CORRECCIÓN: Asegurar que la notificación va al usuario A (id_user_offer)
        if (updatedBarter.id_user_offer) {
            // DEBUG: Mostrar claramente a quién va la notificación
            console.log(`✉️ Enviando notificación al USUARIO A (ID: ${updatedBarter.id_user_offer})`);
            console.log(`Información importante: Usuario A=${updatedBarter.id_user_offer}, Usuario B=${id_user_receiving}`);
            yield (0, exports.createNotificationForBarter)(updatedBarter, 'barter_response');
        }
        // Cargar datos completos para la respuesta
        const completeBarterData = yield barter_1.default.findByPk(updatedBarter.id_barter, {
            include: [
                { model: product_1.default, as: 'offered_product' },
                { model: product_1.default, as: 'requested_product' },
                { model: user_1.default, as: 'offering_user' },
                { model: user_1.default, as: 'receiving_user' }
            ]
        });
        return res.json({
            msg: 'Propuesta enviada correctamente',
            barter: completeBarterData
        });
    }
    catch (error) {
        console.error(`❌ Error al procesar propuesta para trueque ${id}:`, error);
        return res.status(500).json({
            msg: 'Error al procesar la propuesta de trueque',
            error: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
});
exports.proposeForExistingBarter = proposeForExistingBarter;
// Añadir este controlador al final del archivo
const createNotificationForBarter = (barter, action) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Obtener detalles adicionales para la notificación
        const offeredProduct = yield product_1.default.findByPk(barter.id_prod_offer);
        let receivingUser, offeringUser;
        // Buscar usuarios solo si tenemos sus IDs
        if (barter.id_user_offer) {
            offeringUser = yield user_1.default.findByPk(barter.id_user_offer);
        }
        if (barter.id_user_receiving) {
            receivingUser = yield user_1.default.findByPk(barter.id_user_receiving);
        }
        // Inicializar con valores predeterminados para evitar undefined
        let title = "Notificación de trueque";
        let message = "Hay una actualización en tu trueque.";
        let recipientId;
        // Obtener nombres de forma segura (para evitar errores de TypeScript)
        const offeringUserName = (offeringUser === null || offeringUser === void 0 ? void 0 : offeringUser.get('name')) || 'Un usuario';
        const receivingUserName = (receivingUser === null || receivingUser === void 0 ? void 0 : receivingUser.get('name')) || 'El usuario';
        const productName = (offeredProduct === null || offeredProduct === void 0 ? void 0 : offeredProduct.get('name')) || 'producto';
        switch (action) {
            case 'new_barter': // Nuevo trueque propuesto
                if (!barter.id_user_receiving)
                    return; // No hay receptor específico
                title = `Nuevo trueque propuesto`;
                message = `${offeringUserName} quiere realizar un trueque contigo por tu producto.`;
                recipientId = barter.id_user_receiving;
                break;
            case 'status_updated': // Actualización de estado
                if (barter.status === 'aceptado') {
                    title = `¡Trueque aceptado!`;
                    message = `${receivingUserName} ha aceptado tu propuesta de trueque.`;
                    recipientId = barter.id_user_offer;
                }
                else if (barter.status === 'rechazado') {
                    title = `Trueque rechazado`;
                    message = `${receivingUserName} ha rechazado tu propuesta de trueque.`;
                    recipientId = barter.id_user_offer;
                }
                else if (barter.status === 'completado') {
                    title = `Trueque completado`;
                    // Notificar a ambos usuarios
                    if (barter.id_user_offer) {
                        yield notifications_1.default.create({
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
                }
                else {
                    // Producto por producto o producto + dinero
                    message = `${receivingUserName || 'Un usuario'} te ha enviado una propuesta para tu publicación de trueque "${productName}".`;
                    recipientId = barter.id_user_offer;
                }
                break;
        }
        // Solo crear notificación si tenemos un destinatario
        if (recipientId) {
            yield notifications_1.default.create({
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
        }
        else {
            console.warn('⚠️ No se creó notificación porque recipientId es undefined');
        }
    }
    catch (error) {
        console.error('Error al crear notificación para trueque:', error);
    }
});
exports.createNotificationForBarter = createNotificationForBarter;
const createBarterPublication = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id_prod_offer, id_user_offer, notes, exchange_type, value } = req.body;
    try {
        console.log('🔍 Creando publicación de trueque con datos:', {
            id_prod_offer, id_user_offer, exchange_type, value
        });
        // Verificar que el producto existe
        const productExists = yield product_1.default.findByPk(id_prod_offer);
        if (!productExists) {
            return res.status(404).json({
                msg: `No existe un producto con el ID ${id_prod_offer}`
            });
        }
        // Verificar que el usuario existe
        const userExists = yield user_1.default.findByPk(id_user_offer);
        if (!userExists) {
            return res.status(404).json({
                msg: `No existe un usuario con el ID ${id_user_offer}`
            });
        }
        // Asegurar que el producto sea de tipo 'barter'
        yield productExists.update({ type: 'barter' });
        console.log('✅ Validaciones pasadas, creando barter con status: disponible');
        // CAMBIO IMPORTANTE: Usar Sequelize.create con status explícito
        const createdBarter = yield barter_1.default.create({
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
        yield createdBarter.reload();
        console.log(`⚠️ Después de recargar: status = ${createdBarter.status}`);
        // Verificación extra mediante consulta directa
        const verifyBarter = yield barter_1.default.findByPk(createdBarter.id_barter);
        console.log(`🔍 Verificación directa: status = ${(verifyBarter === null || verifyBarter === void 0 ? void 0 : verifyBarter.status) || 'no encontrado'}`);
        // Si el status no fue guardado correctamente, intentar actualizarlo explícitamente
        if (createdBarter.status !== 'disponible') {
            console.log('⚠️ Status incorrecto, actualizando explícitamente...');
            yield createdBarter.update({ status: 'disponible' });
            console.log(`🔄 Status actualizado: ${createdBarter.status}`);
        }
        // Cargar con relaciones para la respuesta
        const barterWithRelations = yield barter_1.default.findByPk(createdBarter.id_barter, {
            include: [
                { model: product_1.default, as: 'offered_product' },
                { model: user_1.default, as: 'offering_user' }
            ]
        });
        res.status(201).json({
            msg: 'Publicación de trueque creada correctamente',
            barter: barterWithRelations
        });
    }
    catch (error) {
        console.error('❌ Error al crear publicación de trueque:', error);
        res.status(500).json({
            msg: 'Error al crear la publicación de trueque',
            error: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
});
exports.createBarterPublication = createBarterPublication;
// Añadir este controlador al final del archivo
const checkExistingProposal = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const existingProposal = yield barter_1.default.findOne({
            where: {
                id_user_offer: parseInt(userId),
                id_prod_request: parseInt(productId),
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
    }
    catch (error) {
        console.error('Error al verificar propuesta existente:', error);
        return res.status(500).json({
            msg: 'Error al verificar propuesta existente',
            exists: false
        });
    }
});
exports.checkExistingProposal = checkExistingProposal;
// Función especializada para crear notificaciones de estado
function createNotificationForBarterStatus(barter, newStatus) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Obtener detalles adicionales
            const offeredProduct = yield product_1.default.findByPk(barter.id_prod_offer);
            const requestedProduct = barter.id_prod_request ? yield product_1.default.findByPk(barter.id_prod_request) : null;
            let receivingUser, offeringUser;
            if (barter.id_user_offer) {
                offeringUser = yield user_1.default.findByPk(barter.id_user_offer);
            }
            if (barter.id_user_receiving) {
                receivingUser = yield user_1.default.findByPk(barter.id_user_receiving);
            }
            const offeringUserName = (offeringUser === null || offeringUser === void 0 ? void 0 : offeringUser.get('name')) || 'Un usuario';
            const receivingUserName = (receivingUser === null || receivingUser === void 0 ? void 0 : receivingUser.get('name')) || 'El usuario';
            const offeredProductName = (offeredProduct === null || offeredProduct === void 0 ? void 0 : offeredProduct.get('name')) || 'producto ofrecido';
            const requestedProductName = (requestedProduct === null || requestedProduct === void 0 ? void 0 : requestedProduct.get('name')) || 'producto solicitado';
            let title = "";
            let message = "";
            let recipientId = null;
            // Obtener servidor Socket.IO
            const io = (0, socket_1.getSocketServer)();
            // Emitir actualización del trueque a través de WebSocket
            if (io && barter.id_user_offer) {
                (0, socket_1.emitBarterUpdate)(io, barter.id_barter, newStatus, barter.id_user_offer, barter.id_user_receiving);
            }
            // Añadir información sobre tipo de intercambio y valor monetario al mensaje
            let extraInfo = '';
            if (barter.exchange_type === 'product_with_money' && barter.value > 0) {
                extraInfo = ` con un adicional de ${barter.value} pesos`;
            }
            else if (barter.exchange_type === 'money_only' && barter.value > 0) {
                extraInfo = ` por un valor de ${barter.value} pesos`;
            }
            // Modificar mensajes según el estado
            switch (newStatus) {
                case 'aceptado':
                    // Notificar al usuario que hizo la propuesta (usuario B)
                    title = "¡Propuesta de trueque aceptada!";
                    if (barter.exchange_type === 'money_only') {
                        // En solo dinero, notificar a usuario B (quien hizo la oferta monetaria)
                        recipientId = barter.id_user_receiving;
                        message = `${receivingUserName} ha aceptado tu oferta monetaria de ${barter.value} pesos por "${requestedProductName}". Ahora está pendiente de aprobación administrativa.`;
                    }
                    else {
                        // Producto por producto o producto + dinero
                        recipientId = barter.id_user_receiving;
                        message = `${receivingUserName} ha aceptado tu propuesta de trueque para intercambiar "${offeredProductName}" por "${requestedProductName}". Ahora está pendiente de aprobación administrativa.`;
                    }
                    break;
                case 'rechazado':
                    // Notificar al oferente que su propuesta fue rechazada y que el trueque volvió a estar disponible para nuevas propuestas
                    title = "Propuesta de trueque rechazada";
                    message = `${offeringUserName} ha rechazado tu propuesta de trueque para "${requestedProductName}". El trueque ha vuelto a estar disponible para nuevas ofertas.`;
                    // CORRECCIÓN: Enviar notificación al usuario que hizo la propuesta (B) que fue rechazada
                    recipientId = barter.id_user_receiving;
                    console.log(`📢 Notificación de rechazo para usuario que propuso (B): ${recipientId}`);
                    break;
                case 'aprobado_admin':
                    // Notificar a ambos usuarios
                    if (barter.id_user_offer) {
                        yield notifications_1.default.create({
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
                        yield notifications_1.default.create({
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
                    const notification = yield notifications_1.default.create({
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
                            (0, socket_1.sendNotificationToUser)(io, recipientId, notification);
                            console.log(`✅ Notificación enviada por socket a usuario ${recipientId}`);
                        }
                        catch (socketError) {
                            console.error('❌ Error enviando notificación por socket:', socketError);
                        }
                    }
                }
                catch (notifError) {
                    console.error('❌ Error creando notificación en la base de datos:', notifError);
                }
            }
        }
        catch (error) {
            console.error(`❌ Error al crear notificación para estado ${newStatus}:`, error);
        }
    });
}
// Obtener trueques pendientes de aprobación por un admin
const getBartersPendingAdminApproval = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const barters = yield barter_1.default.findAll({
            where: { status: 'aceptado' }, // Trueques aceptados esperando aprobación de admin
            include: [
                {
                    model: product_1.default,
                    as: 'offered_product',
                    attributes: ['id_product', 'name', 'price', 'description', 'status'],
                    include: [
                        {
                            model: image_1.default,
                            as: 'images',
                            attributes: ['id', 'url', 'is_main'],
                            required: false,
                            where: { entity_type: 'product' }, // Filtro para imágenes de productos
                            limit: 1 // Solo necesitamos una imagen por producto
                        }
                    ]
                },
                {
                    model: product_1.default,
                    as: 'requested_product',
                    attributes: ['id_product', 'name', 'price', 'description', 'status'],
                    include: [
                        {
                            model: image_1.default,
                            as: 'images',
                            attributes: ['id', 'url', 'is_main'],
                            required: false,
                            where: { entity_type: 'product' },
                            limit: 1
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
            ],
            order: [['request_date', 'DESC']]
        });
        res.json(barters);
    }
    catch (error) {
        console.error('Error al obtener trueques pendientes de aprobación:', error);
        res.status(500).json({
            msg: 'Error al obtener los trueques pendientes de aprobación'
        });
    }
});
exports.getBartersPendingAdminApproval = getBartersPendingAdminApproval;
// Obtener trueques filtrados por estado
const getBartersByStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const barters = yield barter_1.default.findAll({
            where: { status },
            include: [
                {
                    model: product_1.default,
                    as: 'offered_product',
                    attributes: ['id_product', 'name', 'price', 'description', 'status']
                },
                {
                    model: product_1.default,
                    as: 'requested_product',
                    attributes: ['id_product', 'name', 'price', 'description', 'status']
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
            ],
            order: [['request_date', 'DESC']]
        });
        res.json(barters);
    }
    catch (error) {
        console.error(`Error al obtener trueques con estado ${status}:`, error);
        res.status(500).json({
            msg: `Error al obtener los trueques con estado ${status}`
        });
    }
});
exports.getBartersByStatus = getBartersByStatus;
// Añadir al final del archivo
const getBartersByProductOffered = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { productId } = req.params;
        console.log(`🔍 Buscando barters donde el producto solicitado es: ${productId}`);
        if (!productId || isNaN(Number(productId))) {
            return res.status(400).json({
                msg: 'ID de producto inválido'
            });
        }
        // Solo cambiar aquí - asegurándonos de que usamos el campo correcto
        const barters = yield barter_1.default.findAll({
            where: {
                id_prod_request: parseInt(productId, 10), // Esto está bien, busca trueques donde este producto sea el solicitado
                status: {
                    [sequelize_1.Op.in]: ['disponible', 'pendiente']
                }
            },
            include: [
                { model: product_1.default, as: 'offered_product' },
                { model: product_1.default, as: 'requested_product' },
                { model: user_1.default, as: 'offering_user' },
                { model: user_1.default, as: 'receiving_user' }
            ],
            order: [['createdAt', 'DESC']]
        });
        console.log(`✅ Se encontraron ${barters.length} barters para el producto ${productId}`);
        res.json(barters);
    }
    catch (error) {
        console.error(`❌ Error buscando barters para producto:`, error);
        res.status(500).json({
            msg: 'Error al buscar trueques por producto solicitado',
            error: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
});
exports.getBartersByProductOffered = getBartersByProductOffered;
// Añadir este método nuevo (no modificar el existente)
const getBartersByProductRelated = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { productId } = req.params;
        console.log(`🔍 Buscando barters relacionados con el producto: ${productId}`);
        if (!productId || isNaN(Number(productId))) {
            return res.status(400).json({
                msg: 'ID de producto inválido'
            });
        }
        // Buscar cualquier barter donde este producto esté involucrado
        const barters = yield barter_1.default.findAll({
            where: {
                [sequelize_1.Op.or]: [
                    { id_prod_offer: parseInt(productId, 10) },
                    { id_prod_request: parseInt(productId, 10) }
                ],
                status: {
                    [sequelize_1.Op.in]: ['disponible', 'pendiente']
                }
            },
            include: [
                { model: product_1.default, as: 'offered_product' },
                { model: product_1.default, as: 'requested_product' },
                { model: user_1.default, as: 'offering_user' },
                { model: user_1.default, as: 'receiving_user' }
            ],
            order: [['createdAt', 'DESC']]
        });
        console.log(`✅ Se encontraron ${barters.length} barters relacionados con producto ${productId}`);
        res.json(barters);
    }
    catch (error) {
        console.error(`❌ Error buscando barters relacionados con producto:`, error);
        res.status(500).json({
            msg: 'Error al buscar trueques relacionados con el producto',
            error: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
});
exports.getBartersByProductRelated = getBartersByProductRelated;

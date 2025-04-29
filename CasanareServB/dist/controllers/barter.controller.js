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
exports.createBarterPublication = exports.getUserBarters = exports.deleteBarter = exports.updateBarterStatus = exports.updateBarter = exports.createBarter = exports.getBarterById = exports.getBarters = void 0;
const sequelize_1 = require("sequelize"); // Añadir QueryTypes aquí
const barter_1 = __importDefault(require("../db/models/barter"));
const product_1 = __importDefault(require("../db/models/product"));
const user_1 = __importDefault(require("../db/models/user"));
const conection_1 = __importDefault(require("../db/conection"));
// Obtener todos los trueques
const getBarters = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const barters = yield barter_1.default.findAll({
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
// Modificar el controlador createBarter para manejar correctamente los casos donde productOffer no existe
const createBarter = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { productOffer, id_prod_request, id_user_offer, id_user_receiving, notes, useExistingProduct, id_prod_offer, status // Asegúrate de recibir el status también
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
        // Si useExistingProduct es true, usar el id_prod_offer existente
        if (useExistingProduct && id_prod_offer) {
            // Verificar que el producto ofrecido exista
            const existingProduct = yield product_1.default.findByPk(id_prod_offer);
            if (!existingProduct) {
                return res.status(400).json({
                    msg: 'El producto ofrecido no existe'
                });
            }
            finalProdOfferId = id_prod_offer;
            // Actualizar estado del producto existente
            yield product_1.default.update({ status: 'en_trueque' }, { where: { id_product: id_prod_offer } });
        }
        // Si no, crear un nuevo producto para el trueque (solo si productOffer existe)
        else if (productOffer && productOffer.name) {
            // Crear el producto ofrecido para el trueque
            const createdProduct = yield product_1.default.create({
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
        else if (id_prod_offer) {
            // Si no hay productOffer pero hay id_prod_offer, usarlo directamente
            finalProdOfferId = id_prod_offer;
        }
        else {
            return res.status(400).json({
                msg: 'Debe proporcionar un producto para el trueque'
            });
        }
        // Ahora estamos seguros que finalProdOfferId es un número
        const barter = yield barter_1.default.create({
            id_prod_offer: finalProdOfferId,
            id_prod_request: id_prod_request || null,
            id_user_offer: id_user_offer,
            id_user_receiving: id_user_receiving || null,
            value: (productOffer === null || productOffer === void 0 ? void 0 : productOffer.value) || 0,
            status: status || 'pendiente',
            request_date: new Date(),
            notes: notes || ''
        });
        // Marcar producto solicitado como en_trueque solo si existe
        if (id_prod_request) {
            yield product_1.default.update({ status: 'en_trueque' }, { where: { id_product: id_prod_request } });
        }
        res.status(201).json({
            msg: 'Solicitud de trueque creada correctamente',
            barter
        });
    }
    catch (error) {
        console.error('Error al crear trueque:', error);
        res.status(500).json({
            msg: 'Error al crear el trueque'
        });
    }
});
exports.createBarter = createBarter;
// Función para actualizar un trueque completo (no solo su estado)
const updateBarter = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { id_prod_offer, id_prod_request, id_user_offer, id_user_receiving, status, value, notes } = req.body;
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
            notes }, (status !== 'pendiente' && { resolution_date: new Date() })));
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
// Actualizar el estado de un trueque
const updateBarterStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const barter = yield barter_1.default.findByPk(id);
        if (!barter) {
            return res.status(404).json({
                msg: `No existe un trueque con el ID ${id}`
            });
        }
        // Actualizar el estado y fecha de resolución si es aceptado, rechazado o completado
        if (statusToUse !== 'pendiente') {
            yield barter.update({
                status: statusToUse,
                resolution_date: new Date()
            });
            // Actualizar el estado de los productos según el nuevo estado del trueque
            const id_prod_offer = barter.getDataValue('id_prod_offer');
            const id_prod_request = barter.getDataValue('id_prod_request');
            if (statusToUse === 'completado') {
                // Si se completa el trueque, los productos pasan a estado "vendido"
                yield product_1.default.update({ status: 'vendido' }, { where: { id_product: [id_prod_offer, id_prod_request] } });
            }
            else if (statusToUse === 'rechazado') {
                // Si se rechaza, los productos vuelven a estar disponibles
                yield product_1.default.update({ status: 'disponible' }, { where: { id_product: [id_prod_offer, id_prod_request] } });
            }
        }
        else {
            // Si vuelve a pendiente, actualizar solo el estado
            yield barter.update({ status: statusToUse });
        }
        res.json({
            msg: `Estado del trueque actualizado a ${statusToUse}`,
            barter
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
        yield product_1.default.update({ status: 'disponible' }, { where: { id_product: [id_prod_offer, id_prod_request] } });
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
                    attributes: ['id_product', 'name', 'price', 'description', 'id_category']
                },
                {
                    model: product_1.default,
                    as: 'requested_product',
                    attributes: ['id_product', 'name', 'price', 'description', 'id_category']
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
// Agregar esta función al final del archivo barter.controller.ts
const createBarterPublication = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id_prod_offer, id_user_offer, notes } = req.body;
    try {
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
        // Usar una consulta SQL directa para evitar problemas con valores nulos
        const [barterResult, metadata] = yield conection_1.default.query(`INSERT INTO barters 
       (id_prod_offer, id_user_offer, status, request_date, notes, createdAt, updatedAt) 
       VALUES (?, ?, 'disponible', NOW(), ?, NOW(), NOW())`, {
            replacements: [
                id_prod_offer,
                id_user_offer,
                notes || 'Producto disponible para trueque'
            ],
            type: sequelize_1.QueryTypes.INSERT // Usar QueryTypes directamente
        });
        // Obtener el ID del barter recién creado
        const barterId = barterResult;
        // Opcional: Cargar el objeto Barter completo para devolverlo en la respuesta
        const createdBarter = yield barter_1.default.findByPk(barterId);
        res.status(201).json({
            msg: 'Publicación de trueque creada correctamente',
            barter: createdBarter
        });
    }
    catch (error) {
        console.error('Error al crear publicación de trueque:', error);
        res.status(500).json({
            msg: 'Error al crear la publicación de trueque',
            error: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
});
exports.createBarterPublication = createBarterPublication;

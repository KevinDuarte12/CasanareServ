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
exports.deleteBarter = exports.updateBarterStatus = exports.createBarter = exports.getBarterById = exports.getBarters = void 0;
const barter_1 = __importDefault(require("../db/models/barter"));
const product_1 = __importDefault(require("../db/models/product"));
const user_1 = __importDefault(require("../db/models/user"));
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
// Crear un nuevo trueque
const createBarter = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id_prod_offer, id_prod_request, id_user_offer, id_user_receiving, value } = req.body;
    try {
        // Verificar si los productos existen
        const prodOfferExists = yield product_1.default.findByPk(id_prod_offer);
        if (!prodOfferExists) {
            return res.status(400).json({
                msg: `No existe un producto ofrecido con el ID ${id_prod_offer}`
            });
        }
        const prodRequestExists = yield product_1.default.findByPk(id_prod_request);
        if (!prodRequestExists) {
            return res.status(400).json({
                msg: `No existe un producto solicitado con el ID ${id_prod_request}`
            });
        }
        // Verificar si los usuarios existen
        const userOfferExists = yield user_1.default.findByPk(id_user_offer);
        if (!userOfferExists) {
            return res.status(400).json({
                msg: `No existe un usuario oferente con el ID ${id_user_offer}`
            });
        }
        const userReceivingExists = yield user_1.default.findByPk(id_user_receiving);
        if (!userReceivingExists) {
            return res.status(400).json({
                msg: `No existe un usuario receptor con el ID ${id_user_receiving}`
            });
        }
        // Crear el trueque
        const barter = yield barter_1.default.create({
            id_prod_offer,
            id_prod_request,
            id_user_offer,
            id_user_receiving,
            value,
            status: 'pendiente',
            request_date: new Date()
        });
        // Cambiar estado de los productos a "en_trueque"
        yield product_1.default.update({ status: 'en_trueque' }, { where: { id_product: id_prod_offer } });
        yield product_1.default.update({ status: 'en_trueque' }, { where: { id_product: id_prod_request } });
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

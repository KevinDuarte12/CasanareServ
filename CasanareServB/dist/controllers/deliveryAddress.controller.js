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
exports.setDefaultAddress = exports.deleteAddress = exports.updateAddress = exports.createAddress = exports.getAddressById = exports.getUserAddresses = void 0;
const deliveryAddress_1 = __importDefault(require("../db/models/deliveryAddress"));
// Obtener todas las direcciones de un usuario
const getUserAddresses = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.params.userId;
        const addresses = yield deliveryAddress_1.default.findAll({
            where: { user_id: userId },
            order: [
                ['is_default', 'DESC'], // Primero las direcciones predeterminadas
                ['createdAt', 'DESC'] // Luego ordenadas por fecha de creación
            ]
        });
        res.json(addresses);
    }
    catch (error) {
        console.error('Error al obtener direcciones:', error);
        res.status(500).json({
            msg: 'Error al obtener direcciones',
            error: error.message
        });
    }
});
exports.getUserAddresses = getUserAddresses;
// Obtener una dirección específica
const getAddressById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const userId = req.params.userId;
        const address = yield deliveryAddress_1.default.findOne({
            where: {
                id,
                user_id: userId
            }
        });
        if (!address) {
            return res.status(404).json({
                msg: 'Dirección no encontrada'
            });
        }
        res.json(address);
    }
    catch (error) {
        console.error('Error al obtener dirección:', error);
        res.status(500).json({
            msg: 'Error al obtener dirección',
            error: error.message
        });
    }
});
exports.getAddressById = getAddressById;
// Crear una nueva dirección
const createAddress = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.params.userId;
        const addressData = req.body;
        // Asignar el user_id desde la ruta
        addressData.user_id = userId;
        const newAddress = yield deliveryAddress_1.default.create(addressData);
        res.status(201).json({
            msg: 'Dirección creada correctamente',
            address: newAddress
        });
    }
    catch (error) {
        console.error('Error al crear dirección:', error);
        res.status(500).json({
            msg: 'Error al crear dirección',
            error: error.message
        });
    }
});
exports.createAddress = createAddress;
// Actualizar una dirección existente
const updateAddress = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const userId = req.params.userId;
        const addressData = req.body;
        // Verificar que la dirección exista y pertenezca al usuario
        const address = yield deliveryAddress_1.default.findOne({
            where: {
                id,
                user_id: userId
            }
        });
        if (!address) {
            return res.status(404).json({
                msg: 'Dirección no encontrada'
            });
        }
        // Actualizar dirección
        yield address.update(addressData);
        res.json({
            msg: 'Dirección actualizada correctamente',
            address
        });
    }
    catch (error) {
        console.error('Error al actualizar dirección:', error);
        res.status(500).json({
            msg: 'Error al actualizar dirección',
            error: error.message
        });
    }
});
exports.updateAddress = updateAddress;
// Eliminar una dirección
const deleteAddress = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const userId = req.params.userId;
        // Verificar que la dirección exista y pertenezca al usuario
        const address = yield deliveryAddress_1.default.findOne({
            where: {
                id,
                user_id: userId
            }
        });
        if (!address) {
            return res.status(404).json({
                msg: 'Dirección no encontrada'
            });
        }
        // Eliminar dirección
        yield address.destroy();
        res.json({
            msg: 'Dirección eliminada correctamente'
        });
    }
    catch (error) {
        console.error('Error al eliminar dirección:', error);
        res.status(500).json({
            msg: 'Error al eliminar dirección',
            error: error.message
        });
    }
});
exports.deleteAddress = deleteAddress;
// Establecer una dirección como predeterminada
const setDefaultAddress = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const userId = req.params.userId;
        // Verificar que la dirección exista y pertenezca al usuario
        const address = yield deliveryAddress_1.default.findOne({
            where: {
                id,
                user_id: userId
            }
        });
        if (!address) {
            return res.status(404).json({
                msg: 'Dirección no encontrada'
            });
        }
        // Establecer como predeterminada
        yield address.update({ is_default: true });
        res.json({
            msg: 'Dirección establecida como predeterminada',
            address
        });
    }
    catch (error) {
        console.error('Error al establecer dirección predeterminada:', error);
        res.status(500).json({
            msg: 'Error al establecer dirección predeterminada',
            error: error.message
        });
    }
});
exports.setDefaultAddress = setDefaultAddress;

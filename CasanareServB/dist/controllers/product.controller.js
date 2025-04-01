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
exports.deleteProduct = exports.updateProduct = exports.createProduct = exports.getProductById = exports.getProduct = void 0;
const product_1 = __importDefault(require("../db/models/product"));
const user_1 = __importDefault(require("../db/models/user"));
const category_1 = __importDefault(require("../db/models/category"));
// GET - Obtener todos los productos
const getProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const productos = yield product_1.default.findAll({
            include: [
                { model: user_1.default, as: 'user', attributes: ['id', 'name', 'email'] },
                { model: category_1.default, as: 'category', attributes: ['id_category', 'name'] }
            ]
        });
        res.json(productos);
    }
    catch (error) {
        console.error('Error al obtener productos:', error);
        res.status(500).json({ msg: 'Error al obtener productos', error });
    }
});
exports.getProduct = getProduct;
// GET - Obtener un producto por ID
const getProductById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        const producto = yield product_1.default.findOne({
            where: { id_product: id },
            include: [
                { model: user_1.default, as: 'user', attributes: ['id', 'name', 'email'] },
                { model: category_1.default, as: 'category', attributes: ['id_category', 'name'] }
            ]
        });
        if (!producto) {
            res.status(404).json({ msg: `No existe producto con id ${id}` });
            return;
        }
        res.json(producto);
    }
    catch (error) {
        console.error('Error al obtener el producto:', error);
        res.status(500).json({ msg: 'Error al obtener el producto', error });
    }
});
exports.getProductById = getProductById;
// POST - Crear nuevo producto
const createProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const body = req.body;
    try {
        const producto = yield product_1.default.create(Object.assign(Object.assign({}, body), { status: 'disponible', permite_trueque: body.permite_trueque || false }));
        const productoCreado = yield product_1.default.findOne({
            where: { id_product: producto.getDataValue('id_product') },
            include: [
                { model: user_1.default, as: 'user', attributes: ['id', 'name', 'email'] },
                { model: category_1.default, as: 'category', attributes: ['id_category', 'name'] }
            ]
        });
        res.status(201).json({
            msg: 'Producto creado exitosamente',
            producto: productoCreado
        });
    }
    catch (error) {
        console.error('Error al crear producto:', error);
        res.status(500).json({ msg: 'Error al crear producto', error });
    }
});
exports.createProduct = createProduct;
// PUT - Actualizar producto
const updateProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const updates = req.body;
    try {
        const producto = yield product_1.default.findByPk(id);
        if (!producto) {
            res.status(404).json({ msg: `No existe producto con id ${id}` });
            return;
        }
        yield producto.update(updates);
        const productoActualizado = yield product_1.default.findOne({
            where: { id_product: id },
            include: [
                { model: user_1.default, as: 'user', attributes: ['id', 'name', 'email'] },
                { model: category_1.default, as: 'category', attributes: ['id_category', 'name'] }
            ]
        });
        res.json({
            msg: 'Producto actualizado exitosamente',
            producto: productoActualizado
        });
    }
    catch (error) {
        console.error('Error al actualizar producto:', error);
        res.status(500).json({ msg: 'Error al actualizar producto', error });
    }
});
exports.updateProduct = updateProduct;
// DELETE - Eliminar producto
const deleteProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        const producto = yield product_1.default.findByPk(id);
        if (!producto) {
            res.status(404).json({ msg: `No existe producto con id ${id}` });
            return;
        }
        yield producto.destroy();
        res.json({
            msg: 'Producto eliminado exitosamente',
            id: id
        });
    }
    catch (error) {
        console.error('Error al eliminar producto:', error);
        res.status(500).json({ msg: 'Error al eliminar producto', error });
    }
});
exports.deleteProduct = deleteProduct;

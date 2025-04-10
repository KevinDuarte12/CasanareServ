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
exports.toggleProductStatus = exports.deleteProduct = exports.updateProduct = exports.createProduct = exports.getProductById = exports.getProducts = void 0;
const product_1 = __importDefault(require("../db/models/product"));
const category_1 = __importDefault(require("../db/models/category"));
const user_1 = __importDefault(require("../db/models/user"));
// Obtener todos los productos
const getProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const products = yield product_1.default.findAll({
            include: [
                { model: category_1.default, as: 'category', attributes: ['id_category', 'name'] },
                { model: user_1.default, as: 'user', attributes: ['id', 'name', 'email'] }
            ]
        });
        res.json(products);
    }
    catch (error) {
        console.error('Error al obtener productos:', error);
        res.status(500).json({
            msg: 'Error al obtener los productos'
        });
    }
});
exports.getProducts = getProducts;
// Obtener un producto por ID
const getProductById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        const product = yield product_1.default.findByPk(id, {
            include: [
                { model: category_1.default, as: 'category', attributes: ['id_category', 'name'] },
                { model: user_1.default, as: 'user', attributes: ['id', 'name', 'email'] }
            ]
        });
        if (!product) {
            return res.status(404).json({
                msg: `No existe un producto con el ID ${id}`
            });
        }
        res.json(product);
    }
    catch (error) {
        console.error('Error al obtener producto por ID:', error);
        res.status(500).json({
            msg: 'Error al obtener el producto'
        });
    }
});
exports.getProductById = getProductById;
// Crear un nuevo producto
const createProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id_user, id_category, name, description, price, stock, permite_trueque } = req.body;
    try {
        // Verificar si existe la categoría
        const categoryExists = yield category_1.default.findByPk(id_category);
        if (!categoryExists) {
            return res.status(400).json({
                msg: `No existe una categoría con el ID ${id_category}`
            });
        }
        // Verificar si existe el usuario
        const userExists = yield user_1.default.findByPk(id_user);
        if (!userExists) {
            return res.status(400).json({
                msg: `No existe un usuario con el ID ${id_user}`
            });
        }
        // Crear el producto
        const product = yield product_1.default.create({
            id_user,
            id_category,
            name,
            description,
            price,
            stock,
            permite_trueque
        });
        res.status(201).json({
            msg: 'Producto creado correctamente',
            product
        });
    }
    catch (error) {
        console.error('Error al crear producto:', error);
        res.status(500).json({
            msg: 'Error al crear el producto'
        });
    }
});
exports.createProduct = createProduct;
// Actualizar un producto
const updateProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { id_user, id_category, name, description, price, stock, status, permite_trueque } = req.body;
    try {
        // Verificar si existe el producto
        const product = yield product_1.default.findByPk(id);
        if (!product) {
            return res.status(404).json({
                msg: `No existe un producto con el ID ${id}`
            });
        }
        // Si se proporciona una categoría, verificar si existe
        if (id_category) {
            const categoryExists = yield category_1.default.findByPk(id_category);
            if (!categoryExists) {
                return res.status(400).json({
                    msg: `No existe una categoría con el ID ${id_category}`
                });
            }
        }
        // Actualizar el producto
        yield product.update({
            id_category: id_category || product.getDataValue('id_category'),
            name: name || product.getDataValue('name'),
            description: description !== undefined ? description : product.getDataValue('description'),
            price: price || product.getDataValue('price'),
            stock: stock !== undefined ? stock : product.getDataValue('stock'),
            status: status || product.getDataValue('status'),
            permite_trueque: permite_trueque !== undefined ? permite_trueque : product.getDataValue('permite_trueque')
        });
        res.json({
            msg: 'Producto actualizado correctamente',
            product
        });
    }
    catch (error) {
        console.error('Error al actualizar producto:', error);
        res.status(500).json({
            msg: 'Error al actualizar el producto'
        });
    }
});
exports.updateProduct = updateProduct;
// Eliminar un producto
const deleteProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        // Verificar si existe el producto
        const product = yield product_1.default.findByPk(id);
        if (!product) {
            return res.status(404).json({
                msg: `No existe un producto con el ID ${id}`
            });
        }
        // Eliminar el producto (eliminación lógica cambiando el status)
        yield product.update({ status: 'vendido' });
        // Si prefieres eliminación física:
        // await product.destroy();
        res.json({
            msg: 'Producto eliminado correctamente'
        });
    }
    catch (error) {
        console.error('Error al eliminar producto:', error);
        res.status(500).json({
            msg: 'Error al eliminar el producto'
        });
    }
});
exports.deleteProduct = deleteProduct;
// Cambiar el status de un producto
const toggleProductStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { newStatus } = req.body;
    // Validar que el nuevo status sea válido
    const validStatus = ['disponible', 'vendido', 'en_trueque'];
    if (!validStatus.includes(newStatus)) {
        return res.status(400).json({
            msg: `El status ${newStatus} no es válido. Valores permitidos: ${validStatus.join(', ')}`
        });
    }
    try {
        // Verificar si existe el producto
        const product = yield product_1.default.findByPk(id);
        if (!product) {
            return res.status(404).json({
                msg: `No existe un producto con el ID ${id}`
            });
        }
        // Cambiar el status
        yield product.update({ status: newStatus });
        res.json({
            msg: `Status del producto cambiado a ${newStatus}`
        });
    }
    catch (error) {
        console.error('Error al cambiar status del producto:', error);
        res.status(500).json({
            msg: 'Error al cambiar el status del producto'
        });
    }
});
exports.toggleProductStatus = toggleProductStatus;

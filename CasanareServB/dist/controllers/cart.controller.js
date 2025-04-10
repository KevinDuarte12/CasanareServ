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
exports.clearCart = exports.removeFromCart = exports.updateCartItem = exports.addToCart = exports.getActiveCart = void 0;
const cart_1 = __importDefault(require("../db/models/cart"));
const itemcart_1 = __importDefault(require("../db/models/itemcart"));
const product_1 = __importDefault(require("../db/models/product"));
// Obtener o crear carrito activo del usuario
const getActiveCart = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // Usar userId desde el middleware validateToken o del objeto user
        const userId = req.userId || ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id);
        if (!userId) {
            return res.status(401).json({
                msg: 'Usuario no autenticado'
            });
        }
        // Buscar carrito activo - CAMBIO DE ALIAS: 'id_product' → 'product'
        let cart = yield cart_1.default.findOne({
            where: {
                id_user: userId,
                status: 'activo'
            },
            include: [
                {
                    model: itemcart_1.default,
                    as: 'items',
                    include: [
                        {
                            model: product_1.default,
                            as: 'product', // CORREGIDO: Usar el alias definido en las asociaciones
                            attributes: ['id_product', 'name', 'price', 'stock']
                        }
                    ]
                }
            ]
        });
        // Si no existe, crear uno nuevo
        if (!cart) {
            const newCart = yield cart_1.default.create({
                id_user: userId,
                status: 'activo'
            });
            const cartId = newCart.getDataValue('id_cart');
            // Cargar el carrito recién creado con sus relaciones - CAMBIO DE ALIAS: 'id_product' → 'product'
            cart = yield cart_1.default.findByPk(cartId, {
                include: [
                    {
                        model: itemcart_1.default,
                        as: 'items',
                        include: [
                            {
                                model: product_1.default,
                                as: 'product', // CORREGIDO
                                attributes: ['id_product', 'name', 'price', 'stock']
                            }
                        ]
                    }
                ]
            });
        }
        res.json(cart);
    }
    catch (error) {
        console.error('Error al obtener carrito activo:', error);
        res.status(500).json({
            msg: 'Error al obtener carrito activo'
        });
    }
});
exports.getActiveCart = getActiveCart;
// Añadir producto al carrito
const addToCart = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = req.userId || ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id);
        const { id_product, quantity = 1 } = req.body;
        console.log(`🛒 Intentando agregar producto ${id_product} (cantidad: ${quantity}) al carrito de usuario ${userId}`);
        // Validaciones básicas
        if (!userId) {
            return res.status(401).json({
                msg: 'Usuario no autenticado',
                code: 'UNAUTHORIZED'
            });
        }
        if (!id_product) {
            return res.status(400).json({
                msg: 'ID de producto requerido',
                code: 'MISSING_PRODUCT_ID'
            });
        }
        // Verificar si el producto existe y está disponible
        const product = yield product_1.default.findOne({
            where: {
                id_product,
                status: 'disponible'
            }
        });
        if (!product) {
            return res.status(404).json({
                msg: 'Producto no encontrado o no disponible',
                code: 'PRODUCT_NOT_FOUND'
            });
        }
        // Verificar si hay suficiente stock - CORRECCIÓN 1: Usar as number para type casting
        const stock = product.get('stock');
        if (stock < quantity) {
            return res.status(400).json({
                msg: 'No hay suficiente stock disponible',
                code: 'INSUFFICIENT_STOCK'
            });
        }
        // Buscar o crear un carrito activo para el usuario
        let [cart, created] = yield cart_1.default.findOrCreate({
            where: {
                id_user: userId,
                status: 'activo'
            },
            defaults: {
                id_user: userId,
                status: 'activo'
            }
        });
        // CORRECCIÓN 2: Usar as number para el id_cart
        const cartId = cart.get('id_cart');
        // Verificar si el producto ya está en el carrito
        let cartItem = yield itemcart_1.default.findOne({
            where: {
                id_cart: cartId, // CORRECCIÓN
                id_product
            }
        });
        if (cartItem) {
            // Si ya existe, actualizar la cantidad
            const newQuantity = cartItem.get('quantity') + quantity;
            yield cartItem.update({ quantity: newQuantity });
            console.log(`✅ Actualizada cantidad de producto en carrito: ${newQuantity}`);
        }
        else {
            // Si no existe, crear nuevo item en el carrito - CORRECCIÓN 3: Type casting
            cartItem = yield itemcart_1.default.create({
                id_cart: cartId, // CORRECCIÓN
                id_product,
                quantity,
                price: product.get('price') // CORRECCIÓN
            });
            console.log('✅ Producto agregado al carrito correctamente');
        }
        // Obtener el carrito actualizado con todos sus items - CAMBIO DE ALIAS: 'id_product' → 'product'
        const updatedCart = yield cart_1.default.findByPk(cartId, {
            include: [{
                    model: itemcart_1.default,
                    as: 'items',
                    include: [{
                            model: product_1.default,
                            as: 'product' // CORREGIDO: Usar el alias definido en las asociaciones
                        }]
                }]
        });
        return res.status(201).json(updatedCart);
    }
    catch (error) {
        console.error('❌ Error al agregar producto al carrito:', error);
        return res.status(500).json({
            msg: 'Error al agregar producto al carrito',
            error: error.message
        });
    }
});
exports.addToCart = addToCart;
// Actualizar cantidad de un producto en el carrito
const updateCartItem = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = req.userId || ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id);
        const { itemId } = req.params;
        const { quantity } = req.body;
        if (!userId) {
            return res.status(401).json({
                msg: 'Usuario no autenticado'
            });
        }
        if (!quantity || quantity < 0) {
            return res.status(400).json({
                msg: 'Se requiere cantidad válida'
            });
        }
        // Obtener item del carrito - CAMBIO DE ALIAS en Cart y Product
        const item = yield itemcart_1.default.findByPk(itemId, {
            include: [
                {
                    model: cart_1.default,
                    as: 'cart', // CORREGIDO: Usar el alias definido en las asociaciones
                    where: { id_user: userId, status: 'activo' },
                    required: true
                },
                {
                    model: product_1.default,
                    as: 'product' // CORREGIDO: Usar el alias definido en las asociaciones
                }
            ]
        });
        if (!item) {
            return res.status(404).json({
                msg: 'Item no encontrado o no pertenece a su carrito activo'
            });
        }
        // Si quantity es 0, eliminar el item
        if (quantity === 0) {
            yield item.destroy();
            return res.json({
                msg: 'Item eliminado del carrito'
            });
        }
        // Verificar stock - CORRECCIÓN: Usar 'product' en lugar de 'id_product'
        const product = item.get('product');
        const productStock = product.get('stock');
        if (quantity > productStock) {
            return res.status(400).json({
                msg: `Stock insuficiente. Stock disponible: ${productStock}`
            });
        }
        // Actualizar cantidad
        yield item.update({ quantity });
        // CAMBIO DE ALIAS en la respuesta
        res.json({
            msg: 'Cantidad actualizada',
            item: yield itemcart_1.default.findByPk(itemId, {
                include: [
                    {
                        model: product_1.default,
                        as: 'product', // CORREGIDO
                        attributes: ['id_product', 'name', 'price', 'stock']
                    }
                ]
            })
        });
    }
    catch (error) {
        console.error('Error al actualizar item del carrito:', error);
        res.status(500).json({
            msg: 'Error al actualizar item del carrito'
        });
    }
});
exports.updateCartItem = updateCartItem;
// Eliminar un producto del carrito
const removeFromCart = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = req.userId || ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id);
        const { itemId } = req.params;
        if (!userId) {
            return res.status(401).json({
                msg: 'Usuario no autenticado'
            });
        }
        // Obtener item del carrito - CAMBIO DE ALIAS: 'id_cart' → 'cart'
        const item = yield itemcart_1.default.findByPk(itemId, {
            include: [
                {
                    model: cart_1.default,
                    as: 'cart', // CORREGIDO: Usar el alias definido en las asociaciones
                    where: { id_user: userId, status: 'activo' },
                    required: true
                }
            ]
        });
        if (!item) {
            return res.status(404).json({
                msg: 'Item no encontrado o no pertenece a su carrito activo'
            });
        }
        // Eliminar item
        yield item.destroy();
        res.json({
            msg: 'Producto eliminado del carrito'
        });
    }
    catch (error) {
        console.error('Error al eliminar producto del carrito:', error);
        res.status(500).json({
            msg: 'Error al eliminar producto del carrito'
        });
    }
});
exports.removeFromCart = removeFromCart;
// Vaciar carrito
const clearCart = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = req.userId || ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id);
        if (!userId) {
            return res.status(401).json({
                msg: 'Usuario no autenticado'
            });
        }
        // Obtener carrito activo
        const cart = yield cart_1.default.findOne({
            where: {
                id_user: userId,
                status: 'activo'
            }
        });
        if (!cart) {
            return res.status(404).json({
                msg: 'No tiene un carrito activo'
            });
        }
        // Eliminar todos los items del carrito - CORRECCIÓN 6: Type casting
        yield itemcart_1.default.destroy({
            where: {
                id_cart: cart.getDataValue('id_cart')
            }
        });
        res.json({
            msg: 'Carrito vaciado correctamente'
        });
    }
    catch (error) {
        console.error('Error al vaciar carrito:', error);
        res.status(500).json({
            msg: 'Error al vaciar carrito'
        });
    }
});
exports.clearCart = clearCart;

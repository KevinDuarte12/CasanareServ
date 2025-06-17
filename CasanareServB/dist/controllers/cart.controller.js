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
exports.getCartId = exports.clearCart = exports.removeFromCart = exports.updateCartItem = exports.addToCart = exports.getActiveCart = exports.processLoginCart = void 0;
const cart_1 = __importDefault(require("../db/models/cart"));
const itemcart_1 = __importDefault(require("../db/models/itemcart"));
const product_1 = __importDefault(require("../db/models/product"));
/**
 * Procesa los items pendientes del carrito cuando un usuario se autentica
 * Agrega productos guardados en localStorage al carrito del usuario autenticado
 */
function processPendingItems(userId, pendingItems) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (!pendingItems || pendingItems.length === 0) {
                return true;
            }
            console.log(`🔄 Procesando ${pendingItems.length} items pendientes para usuario ${userId}`);
            // Buscar o crear un carrito activo para el usuario
            let [cart] = yield cart_1.default.findOrCreate({
                where: {
                    id_user: userId,
                    status: 'activo'
                },
                defaults: {
                    id_user: userId,
                    status: 'activo'
                }
            });
            const cartId = cart.get('id_cart');
            // Procesar cada item pendiente
            for (const item of pendingItems) {
                // Verificar si el producto existe y está disponible
                const product = yield product_1.default.findOne({
                    where: {
                        id_product: item.id_product,
                        status: 'disponible'
                    }
                });
                if (!product) {
                    console.warn(`⚠️ Producto ${item.id_product} no encontrado o no disponible`);
                    continue; // Continuar con el siguiente item
                }
                // Verificar stock
                const stock = product.get('stock');
                const quantity = Math.min(item.quantity, stock); // No exceder el stock disponible
                if (quantity <= 0) {
                    console.warn(`⚠️ Producto ${item.id_product} sin stock disponible`);
                    continue;
                }
                // Verificar si el producto ya está en el carrito
                let cartItem = yield itemcart_1.default.findOne({
                    where: {
                        id_cart: cartId,
                        id_product: item.id_product
                    }
                });
                if (cartItem) {
                    // Si ya existe, actualizar la cantidad
                    const currentQuantity = cartItem.get('quantity');
                    const newQuantity = Math.min(currentQuantity + quantity, stock); // No exceder el stock
                    yield cartItem.update({ quantity: newQuantity });
                    console.log(`✅ Actualizada cantidad de producto ${item.id_product} en carrito: ${newQuantity}`);
                }
                else {
                    // Si no existe, crear nuevo item en el carrito
                    yield itemcart_1.default.create({
                        id_cart: cartId,
                        id_product: item.id_product,
                        quantity,
                        price: product.get('price')
                    });
                    console.log(`✅ Producto ${item.id_product} agregado al carrito correctamente`);
                }
            }
            return true;
        }
        catch (error) {
            console.error('❌ Error al procesar items pendientes:', error);
            return false;
        }
    });
}
/**
 * Procesa el carrito pendiente cuando un usuario se autentica
 * Transfiere items guardados en localStorage al carrito del usuario autenticado
 */
const processLoginCart = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = req.userId || ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id);
        const pendingItems = req.body.pendingItems || [];
        if (!userId) {
            res.status(401).json({
                success: false,
                msg: 'Usuario no autenticado'
            });
            return;
        }
        const success = yield processPendingItems(userId, pendingItems);
        res.json({
            success,
            msg: success ? 'Items pendientes agregados al carrito' : 'Error al procesar items pendientes'
        });
    }
    catch (error) {
        console.error('Error al procesar carrito pendiente:', error);
        res.status(500).json({
            success: false,
            msg: 'Error al procesar carrito pendiente'
        });
    }
});
exports.processLoginCart = processLoginCart;
/**
 * Obtiene el carrito activo del usuario autenticado
 * Si no existe un carrito activo, crea uno nuevo automáticamente
 */
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
        // Buscar carrito activo con items y productos
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
                            as: 'product', // Usar el alias definido en las asociaciones
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
            // Cargar el carrito recién creado con sus relaciones
            cart = yield cart_1.default.findByPk(cartId, {
                include: [
                    {
                        model: itemcart_1.default,
                        as: 'items',
                        include: [
                            {
                                model: product_1.default,
                                as: 'product',
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
/**
 * Agrega un producto al carrito del usuario autenticado
 * Verifica stock, propietario y crea o actualiza items según corresponda
 */
const addToCart = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = req.userId || ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id);
        const { id_product, quantity = 1 } = req.body;
        console.log(`🛒 Intentando agregar producto ${id_product} (cantidad: ${quantity}) al carrito de usuario ${userId || 'no autenticado'}`);
        // Si no hay usuario autenticado, devolver indicación para guardar en localStorage
        if (!userId) {
            return res.status(401).json({
                msg: 'Usuario no autenticado',
                code: 'UNAUTHORIZED',
                action: 'SAVE_FOR_LATER',
                productInfo: {
                    id_product,
                    quantity
                }
            });
        }
        // Validaciones básicas
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
        // Verificar que el usuario no sea el propietario del producto
        const productOwnerId = product.get('id_user');
        if (productOwnerId === userId) {
            return res.status(403).json({
                msg: 'No puedes agregar tu propio producto al carrito',
                code: 'CANNOT_BUY_OWN_PRODUCT'
            });
        }
        // Verificar si hay suficiente stock
        const stock = product.get('stock');
        if (stock < quantity) {
            return res.status(400).json({
                msg: 'No hay suficiente stock disponible',
                code: 'INSUFFICIENT_STOCK'
            });
        }
        // Buscar o crear un carrito activo para el usuario
        let [cart] = yield cart_1.default.findOrCreate({
            where: {
                id_user: userId,
                status: 'activo'
            },
            defaults: {
                id_user: userId,
                status: 'activo'
            }
        });
        const cartId = cart.get('id_cart');
        // Verificar si el producto ya está en el carrito
        let cartItem = yield itemcart_1.default.findOne({
            where: {
                id_cart: cartId,
                id_product
            },
            include: [{
                    model: product_1.default,
                    as: 'product'
                }]
        });
        if (cartItem) {
            // Verificar stock antes de actualizar
            const currentQuantity = cartItem.get('quantity');
            const newQuantity = currentQuantity + quantity;
            if (newQuantity > stock) {
                return res.status(400).json({
                    msg: `No hay suficiente stock. Stock disponible: ${stock}`,
                    code: 'INSUFFICIENT_STOCK'
                });
            }
            // Actualizar con la nueva cantidad
            yield cartItem.update({
                quantity: newQuantity,
                price: product.get('price')
            });
            console.log(`✅ Cantidad actualizada en carrito: ${newQuantity}`);
        }
        else {
            // Crear nuevo item
            cartItem = yield itemcart_1.default.create({
                id_cart: cartId,
                id_product,
                quantity,
                price: product.get('price')
            });
            console.log('✅ Nuevo producto agregado al carrito');
        }
        // Obtener el carrito actualizado con todos sus items
        const updatedCart = yield cart_1.default.findByPk(cartId, {
            include: [{
                    model: itemcart_1.default,
                    as: 'items',
                    include: [{
                            model: product_1.default,
                            as: 'product',
                            attributes: ['id_product', 'name', 'price', 'stock']
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
/**
 * Actualiza la cantidad de un item específico en el carrito del usuario
 * Permite eliminar el item si la cantidad es 0 y verifica stock disponible
 */
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
        // Obtener item del carrito con sus relaciones
        const item = yield itemcart_1.default.findByPk(itemId, {
            include: [
                {
                    model: cart_1.default,
                    as: 'cart', // Usar el alias definido en las asociaciones
                    where: { id_user: userId, status: 'activo' },
                    required: true
                },
                {
                    model: product_1.default,
                    as: 'product' // Usar el alias definido en las asociaciones
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
        // Verificar stock disponible
        const product = item.get('product');
        const productStock = product.get('stock');
        if (quantity > productStock) {
            return res.status(400).json({
                msg: `Stock insuficiente. Stock disponible: ${productStock}`
            });
        }
        // Actualizar cantidad
        yield item.update({ quantity });
        // Devolver item actualizado con información del producto
        res.json({
            msg: 'Cantidad actualizada',
            item: yield itemcart_1.default.findByPk(itemId, {
                include: [
                    {
                        model: product_1.default,
                        as: 'product',
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
/**
 * Elimina un item específico del carrito del usuario autenticado
 * Verifica que el item pertenezca al carrito activo del usuario antes de eliminarlo
 */
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
        // Obtener item del carrito con verificación de pertenencia al usuario
        const item = yield itemcart_1.default.findByPk(itemId, {
            include: [
                {
                    model: cart_1.default,
                    as: 'cart', // Usar el alias definido en las asociaciones
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
/**
 * Vacía completamente el carrito activo del usuario autenticado
 * Elimina todos los items del carrito pero mantiene el carrito activo
 */
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
        // Eliminar todos los items del carrito
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
/**
 * Obtiene el ID del carrito activo del usuario autenticado
 * Busca o crea un carrito activo y devuelve únicamente su ID
 */
const getCartId = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = req.userId || ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id);
        if (!userId) {
            res.status(401).json({
                success: false,
                msg: 'Usuario no autenticado'
            });
            return;
        }
        // Buscar o crear un carrito activo
        let [cart] = yield cart_1.default.findOrCreate({
            where: {
                id_user: userId,
                status: 'activo'
            },
            defaults: {
                id_user: userId,
                status: 'activo'
            }
        });
        const cartId = cart.get('id_cart');
        res.json({
            success: true,
            cartId
        });
    }
    catch (error) {
        console.error('Error al obtener ID del carrito:', error);
        res.status(500).json({
            success: false,
            msg: 'Error al obtener ID del carrito'
        });
    }
});
exports.getCartId = getCartId;

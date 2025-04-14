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
exports.getPaginatedProducts = exports.getProductsByCategory = exports.getRecentProducts = exports.toggleProductStatus = exports.deleteProduct = exports.updateProduct = exports.createProduct = exports.getProductById = exports.getProducts = void 0;
const sequelize_1 = require("sequelize"); // Importar Op directamente
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
// Obtener productos recientes
const getRecentProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // CORRIGE ESTO: Extraer el límite de la consulta
        const limit = parseInt(req.query.limit) || 8;
        console.log('Obteniendo productos recientes. Límite:', limit);
        const recentProducts = yield product_1.default.findAll({
            limit,
            order: [['createdAt', 'DESC']],
            where: {
                // VERIFICA ESTO: Asegúrate de que el campo 'status' exista en tu modelo
                // Si tu modelo usa otro campo, ajústalo aquí
                status: 'disponible' // Cambia esto según tu modelo
                // O si realmente tienes un campo 'status':
                // status: 'disponible'
            },
            attributes: [
                'id_product',
                'name',
                'description',
                'price',
                'stock',
                'createdAt'
            ]
        });
        console.log('Productos encontrados:', recentProducts.length);
        res.json(recentProducts);
    }
    catch (error) {
        console.error('Error al obtener productos recientes:', error);
        // Devuelve más información sobre el error para depuración
        res.status(500).json({
            msg: 'Error al obtener productos recientes',
            error: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
});
exports.getRecentProducts = getRecentProducts;
// Obtener productos por categoría
const getProductsByCategory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { categoryId } = req.params;
    try {
        console.log(`Buscando productos para categoría ID: ${categoryId}`);
        // Validar que categoryId sea un número
        if (!categoryId || isNaN(parseInt(categoryId))) {
            return res.status(400).json({
                msg: 'ID de categoría inválido'
            });
        }
        // Verificar si la categoría existe
        const category = yield category_1.default.findByPk(categoryId);
        if (!category) {
            return res.status(404).json({
                msg: `No existe una categoría con el ID ${categoryId}`
            });
        }
        // Obtener productos de la categoría
        const products = yield product_1.default.findAll({
            where: {
                id_category: categoryId,
                status: 'disponible' // Solo productos disponibles
            },
            attributes: [
                'id_product',
                'name',
                'description',
                'price',
                'stock',
                'createdAt'
            ]
        });
        console.log(`Se encontraron ${products.length} productos para la categoría ${categoryId}`);
        res.json(products);
    }
    catch (error) {
        console.error(`Error al obtener productos para categoría ${categoryId}:`, error);
        res.status(500).json({
            msg: 'Error al obtener productos por categoría',
            error: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
});
exports.getProductsByCategory = getProductsByCategory;
// Búsqueda paginada de productos con múltiples filtros
const getPaginatedProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Parámetros de paginación
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;
        const offset = (page - 1) * limit;
        // Parámetros de filtrado
        const categoryId = req.query.category ? parseInt(req.query.category) : null;
        const search = req.query.search || '';
        const minPrice = req.query.minPrice ? parseFloat(req.query.minPrice) : null;
        const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice) : null;
        // Parámetros de ordenamiento
        const sort = req.query.sort || 'createdAt';
        const order = req.query.order || 'desc';
        // Construir los filtros WHERE
        const whereConditions = {
            status: 'disponible', // Solo productos disponibles
        };
        // Filtrar por categoría si se especifica
        if (categoryId) {
            whereConditions.id_category = categoryId;
        }
        // Filtrar por precio mínimo si se especifica
        if (minPrice !== null) {
            whereConditions.price = Object.assign(Object.assign({}, (whereConditions.price || {})), { [sequelize_1.Op.gte]: minPrice // Usa Op en lugar de sequelize.Op
             });
        }
        // Filtrar por precio máximo si se especifica
        if (maxPrice !== null) {
            whereConditions.price = Object.assign(Object.assign({}, (whereConditions.price || {})), { [sequelize_1.Op.lte]: maxPrice // Usa Op en lugar de sequelize.Op
             });
        }
        // Filtrar por término de búsqueda si se especifica
        if (search) {
            whereConditions[sequelize_1.Op.or] = [
                {
                    name: {
                        [sequelize_1.Op.like]: `%${search}%` // Usa Op en lugar de sequelize.Op
                    }
                },
                {
                    description: {
                        [sequelize_1.Op.like]: `%${search}%` // Usa Op en lugar de sequelize.Op
                    }
                }
            ];
        }
        // Configurar opciones de ordenamiento
        const orderOptions = [];
        // Verificar que el campo de ordenamiento existe en el modelo
        const validSortFields = ['createdAt', 'price', 'name', 'stock'];
        const validSortField = validSortFields.includes(sort) ? sort : 'createdAt';
        // Verificar que la dirección de ordenamiento es válida
        const validOrderDirections = ['asc', 'desc'];
        const validOrderDirection = validOrderDirections.includes(order.toLowerCase()) ? order : 'desc';
        orderOptions.push([validSortField, validOrderDirection.toUpperCase()]);
        console.log(`Buscando productos paginados: página ${page}, límite ${limit}`);
        console.log('Filtros:', whereConditions);
        console.log('Ordenamiento:', orderOptions);
        // Realizar la consulta
        const { count, rows: products } = yield product_1.default.findAndCountAll({
            where: whereConditions,
            limit,
            offset,
            order: orderOptions,
            include: [
                { model: category_1.default, as: 'category', attributes: ['id_category', 'name'] }
            ],
            attributes: [
                'id_product',
                'name',
                'description',
                'price',
                'stock',
                'status',
                'permite_trueque',
                'createdAt'
            ]
        });
        // Calcular metadatos de paginación
        const totalPages = Math.ceil(count / limit);
        const hasNext = page < totalPages;
        const hasPrev = page > 1;
        // Devolver respuesta formateada
        res.json({
            data: products,
            meta: {
                total: count,
                totalPages,
                currentPage: page,
                pageSize: limit,
                hasNext,
                hasPrev
            }
        });
    }
    catch (error) {
        console.error('Error al obtener productos paginados:', error);
        res.status(500).json({
            msg: 'Error al obtener productos paginados',
            error: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
});
exports.getPaginatedProducts = getPaginatedProducts;

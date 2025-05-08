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
exports.deleteRating = exports.getUserRatings = exports.getProductRatings = exports.createRating = void 0;
const raiting_1 = __importDefault(require("../db/models/raiting"));
const product_1 = __importDefault(require("../db/models/product"));
const user_1 = __importDefault(require("../db/models/user"));
const image_1 = __importDefault(require("../db/models/image")); // Importar el modelo completo (no solo los atributos)
const createRating = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id_product, score, comment, id_user_qualifying } = req.body;
        // Validar que el producto existe
        const product = yield product_1.default.findByPk(id_product);
        if (!product) {
            return res.status(404).json({
                msg: `No existe un producto con el ID ${id_product}`
            });
        }
        // Obtener el ID del vendedor (usuario calificado)
        const id_user_rated = product.getDataValue('id_user');
        // Validar que el usuario no se califique a sí mismo
        if (id_user_qualifying === id_user_rated) {
            return res.status(400).json({
                msg: 'No puedes calificar tu propio producto'
            });
        }
        // Verificar si el usuario ya calificó este producto
        const existingRating = yield raiting_1.default.findOne({
            where: {
                id_product,
                id_user_qualifying
            }
        });
        if (existingRating) {
            return res.status(400).json({
                msg: 'Ya has calificado este producto anteriormente'
            });
        }
        // Crear la calificación
        const rating = yield raiting_1.default.create({
            id_product,
            id_user_rated,
            id_user_qualifying,
            score,
            comment
        });
        res.status(201).json({
            msg: 'Calificación creada correctamente',
            rating
        });
    }
    catch (error) {
        console.error('Error al crear calificación:', error);
        res.status(500).json({
            msg: 'Error al crear la calificación',
            error: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
});
exports.createRating = createRating;
const getProductRatings = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { productId } = req.params;
        const ratings = yield raiting_1.default.findAll({
            where: { id_product: productId },
            include: [
                {
                    model: user_1.default,
                    as: 'user_qualifying',
                    attributes: ['id', 'name', 'email'],
                    include: [
                        {
                            model: image_1.default,
                            as: 'userImages',
                            where: { is_main: true },
                            required: false,
                            limit: 1,
                            attributes: ['url']
                        }
                    ]
                }
            ],
            order: [['createdAt', 'DESC']]
        });
        // Calcular promedio de calificaciones
        let average = 0;
        if (ratings.length > 0) {
            const sum = ratings.reduce((acc, rating) => acc + rating.getDataValue('score'), 0);
            average = sum / ratings.length;
        }
        // Agrupar calificaciones por estrellas
        const stats = {
            5: 0, 4: 0, 3: 0, 2: 0, 1: 0
        };
        ratings.forEach(rating => {
            const score = rating.getDataValue('score');
            if (score >= 1 && score <= 5) {
                stats[score]++;
            }
        });
        res.json({
            ratings,
            summary: {
                average,
                total: ratings.length,
                stats
            }
        });
    }
    catch (error) {
        console.error('Error al obtener calificaciones del producto:', error);
        res.status(500).json({
            msg: 'Error al obtener calificaciones',
            error: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
});
exports.getProductRatings = getProductRatings;
const getUserRatings = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.params;
        const ratings = yield raiting_1.default.findAll({
            where: { id_user_rated: userId },
            include: [
                {
                    model: user_1.default,
                    as: 'user_qualifying',
                    attributes: ['id', 'name']
                },
                {
                    model: product_1.default,
                    as: 'product',
                    attributes: ['id_product', 'name', 'price']
                }
            ],
            order: [['createdAt', 'DESC']]
        });
        // Calcular promedio de calificaciones
        let average = 0;
        if (ratings.length > 0) {
            const sum = ratings.reduce((acc, rating) => acc + rating.getDataValue('score'), 0);
            average = sum / ratings.length;
        }
        res.json({
            ratings,
            average,
            total: ratings.length
        });
    }
    catch (error) {
        console.error('Error al obtener calificaciones del usuario:', error);
        res.status(500).json({
            msg: 'Error al obtener calificaciones',
            error: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
});
exports.getUserRatings = getUserRatings;
const deleteRating = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const userId = req.body.userId; // Asumiendo que tienes middleware de autenticación
        const rating = yield raiting_1.default.findByPk(id);
        if (!rating) {
            return res.status(404).json({
                msg: `No existe una calificación con el ID ${id}`
            });
        }
        // Verificar que el usuario que quiere eliminar sea quien calificó
        if (rating.getDataValue('id_user_qualifying') !== userId) {
            return res.status(403).json({
                msg: 'No tienes permiso para eliminar esta calificación'
            });
        }
        yield rating.destroy();
        res.json({
            msg: 'Calificación eliminada correctamente'
        });
    }
    catch (error) {
        console.error('Error al eliminar calificación:', error);
        res.status(500).json({
            msg: 'Error al eliminar la calificación',
            error: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
});
exports.deleteRating = deleteRating;

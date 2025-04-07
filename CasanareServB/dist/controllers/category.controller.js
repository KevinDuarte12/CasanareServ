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
exports.toggleCategoryStatus = exports.deleteCategory = exports.updateCategory = exports.createCategory = exports.getCategoryById = exports.getCategories = void 0;
const category_1 = __importDefault(require("../db/models/category"));
/**
 * Obtiene todas las categorías
 */
const getCategories = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Obtener todas las categorías
        const categories = yield category_1.default.findAll();
        // Responder con las categorías encontradas
        res.json(categories);
    }
    catch (error) {
        console.error('Error al obtener categorías:', error);
        res.status(500).json({
            msg: 'Error al obtener las categorías',
            error: error.message
        });
    }
});
exports.getCategories = getCategories;
/**
 * Obtiene una categoría por su ID
 */
const getCategoryById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        // Buscar la categoría por ID
        const category = yield category_1.default.findByPk(id);
        // Verificar si existe
        if (!category) {
            return res.status(404).json({
                msg: `No existe una categoría con el ID ${id}`
            });
        }
        // Responder con la categoría encontrada
        res.json(category);
    }
    catch (error) {
        console.error(`Error al obtener la categoría con ID ${id}:`, error);
        res.status(500).json({
            msg: 'Error al obtener la categoría',
            error: error.message
        });
    }
});
exports.getCategoryById = getCategoryById;
/**
 * Crea una nueva categoría
 */
const createCategory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, description, image } = req.body;
    try {
        // Verificar si la categoría ya existe por su nombre
        const existingCategory = yield category_1.default.findOne({ where: { name } });
        if (existingCategory) {
            return res.status(400).json({
                msg: `Ya existe una categoría con el nombre ${name}`
            });
        }
        // Crear la nueva categoría
        const newCategory = yield category_1.default.create({
            name,
            description,
            image,
            status: true
        });
        // Responder con la categoría creada
        res.status(201).json({
            msg: 'Categoría creada correctamente',
            category: newCategory
        });
    }
    catch (error) {
        console.error('Error al crear categoría:', error);
        res.status(500).json({
            msg: 'Error al crear la categoría',
            error: error.message
        });
    }
});
exports.createCategory = createCategory;
/**
 * Actualiza una categoría existente
 */
const updateCategory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { name, description, image, status } = req.body;
    try {
        // Buscar la categoría por ID
        const category = yield category_1.default.findByPk(id);
        // Verificar si existe
        if (!category) {
            return res.status(404).json({
                msg: `No existe una categoría con el ID ${id}`
            });
        }
        // Si se va a cambiar el nombre, verificar que no exista otra categoría con ese nombre
        if (name && name !== category.get('name')) {
            const existingCategory = yield category_1.default.findOne({ where: { name } });
            if (existingCategory) {
                return res.status(400).json({
                    msg: `Ya existe otra categoría con el nombre ${name}`
                });
            }
        }
        // Actualizar la categoría
        yield category.update({
            name,
            description,
            image,
            status
        });
        // Responder con la categoría actualizada
        res.json({
            msg: 'Categoría actualizada correctamente',
            category
        });
    }
    catch (error) {
        console.error(`Error al actualizar la categoría con ID ${id}:`, error);
        res.status(500).json({
            msg: 'Error al actualizar la categoría',
            error: error.message
        });
    }
});
exports.updateCategory = updateCategory;
/**
 * Elimina una categoría
 */
const deleteCategory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        // Buscar la categoría por ID
        const category = yield category_1.default.findByPk(id);
        // Verificar si existe
        if (!category) {
            return res.status(404).json({
                msg: `No existe una categoría con el ID ${id}`
            });
        }
        // Eliminar la categoría (recomendable usar soft delete en producción)
        yield category.update({ status: false });
        // Para eliminar físicamente: await category.destroy();
        // Responder con éxito
        res.json({
            msg: 'Categoría eliminada correctamente'
        });
    }
    catch (error) {
        console.error(`Error al eliminar la categoría con ID ${id}:`, error);
        res.status(500).json({
            msg: 'Error al eliminar la categoría',
            error: error.message
        });
    }
});
exports.deleteCategory = deleteCategory;
/**
 * Cambiar el estado de una categoría (activar/desactivar)
 */
const toggleCategoryStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        // Buscar la categoría por ID
        const category = yield category_1.default.findByPk(id);
        // Verificar si existe
        if (!category) {
            return res.status(404).json({
                msg: `No existe una categoría con el ID ${id}`
            });
        }
        // Obtener el estado actual y cambiarlo
        const currentStatus = category.get('status');
        // Actualizar el estado
        yield category.update({
            status: !currentStatus
        });
        // Responder con el nuevo estado
        res.json({
            msg: `Categoría ${!currentStatus ? 'activada' : 'desactivada'} correctamente`,
            category
        });
    }
    catch (error) {
        console.error(`Error al cambiar estado de la categoría con ID ${id}:`, error);
        res.status(500).json({
            msg: 'Error al cambiar el estado de la categoría',
            error: error.message
        });
    }
});
exports.toggleCategoryStatus = toggleCategoryStatus;

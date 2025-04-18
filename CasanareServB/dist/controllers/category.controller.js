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
const image_1 = __importDefault(require("../db/models/image"));
const sequelize_1 = require("sequelize");
/**
 * Obtiene todas las categorías
 */
const getCategories = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const categories = yield category_1.default.findAll({
            include: [
                {
                    model: image_1.default,
                    as: 'categoryImages', // ← Cambiado de 'images' a 'categoryImages'
                    required: false
                }
            ]
        });
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
        const category = yield category_1.default.findByPk(id, {
            include: [
                {
                    model: image_1.default,
                    as: 'categoryImages', // ← CORRECTO (usar el nuevo nombre de asociación)
                    required: false
                }
            ]
        });
        if (!category) {
            return res.status(404).json({
                msg: `No existe una categoría con el ID ${id}`
            });
        }
        // Antes de enviar la respuesta
        const adaptedCategory = adaptCategoryForFrontend(category);
        res.json(adaptedCategory);
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
        // Si se proporcionó una imagen URL inicial, guardarla también en la tabla de imágenes
        if (image) {
            yield image_1.default.create({
                url: image,
                entity_type: 'category',
                entity_id: newCategory.get('id_category'),
                is_main: true
            });
        }
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
            const existingCategory = yield category_1.default.findOne({
                where: {
                    name,
                    id_category: { [sequelize_1.Op.ne]: parseInt(id) }
                }
            });
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
        // Si se actualizó la URL de imagen y no está vacía, sincronizar con la tabla de imágenes
        if (image && image !== category.get('image')) {
            // Buscar si ya existe una imagen principal
            const mainImage = yield image_1.default.findOne({
                where: {
                    entity_type: 'category',
                    entity_id: parseInt(id),
                    is_main: true
                }
            });
            if (mainImage) {
                // Si ya existe una imagen principal, actualizarla
                yield mainImage.update({
                    url: image,
                    // No actualizamos public_id, ya que esta imagen no fue subida a través de Cloudinary
                    // directamente, sino que es una URL externa
                });
            }
            else {
                // Si no existe, crear una nueva imagen principal
                yield image_1.default.create({
                    url: image,
                    entity_type: 'category',
                    entity_id: parseInt(id),
                    is_main: true
                });
            }
        }
        // Obtener categoría actualizada con sus imágenes
        const updatedCategory = yield category_1.default.findByPk(id);
        const images = yield image_1.default.findAll({
            where: {
                entity_type: 'category',
                entity_id: parseInt(id)
            },
            order: [
                ['is_main', 'DESC'],
                ['createdAt', 'DESC']
            ]
        });
        // Preparar respuesta
        const categoryData = updatedCategory.toJSON();
        Object.assign(categoryData, { images });
        // Responder con la categoría actualizada
        res.json({
            msg: 'Categoría actualizada correctamente',
            category: categoryData
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
 * Elimina una categoría y sus imágenes asociadas físicamente de la base de datos
 */
const deleteCategory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        // Buscar la categoría por ID para verificar que existe
        const category = yield category_1.default.findByPk(id);
        // Verificar si existe
        if (!category) {
            return res.status(404).json({
                msg: `No existe una categoría con el ID ${id}`
            });
        }
        // Buscar todas las imágenes asociadas a esta categoría
        const images = yield image_1.default.findAll({
            where: {
                entity_type: 'category',
                entity_id: parseInt(id)
            }
        });
        // Si hay imágenes asociadas, eliminarlas
        if (images.length > 0) {
            console.log(`Eliminando ${images.length} imágenes asociadas a la categoría ${id}`);
            // Para cada imagen, intentar eliminarla de Cloudinary si tiene public_id
            for (const image of images) {
                try {
                    const publicId = image.get('public_id');
                    // Si la imagen tiene un public_id (está en Cloudinary), eliminarla
                    if (publicId) {
                        // Importar Cloudinary solo si es necesario
                        const cloudinary = require('cloudinary').v2;
                        // Asegurarse que Cloudinary esté configurado (esto debería estar en otro lugar del código)
                        if (!cloudinary.config().cloud_name) {
                            cloudinary.config({
                                cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
                                api_key: process.env.CLOUDINARY_API_KEY,
                                api_secret: process.env.CLOUDINARY_API_SECRET
                            });
                        }
                        // Eliminar la imagen de Cloudinary
                        yield cloudinary.uploader.destroy(publicId);
                        console.log(`Imagen eliminada de Cloudinary: ${publicId}`);
                    }
                }
                catch (cloudinaryError) {
                    // Loguear el error pero continuar con el proceso
                    console.error('Error al eliminar imagen de Cloudinary:', cloudinaryError);
                }
            }
            // Eliminar todas las imágenes de la base de datos
            yield image_1.default.destroy({
                where: {
                    entity_type: 'category',
                    entity_id: parseInt(id)
                }
            });
            console.log(`Imágenes eliminadas de la base de datos para la categoría ${id}`);
        }
        // Eliminar físicamente la categoría
        yield category.destroy();
        console.log(`Categoría ${id} eliminada físicamente`);
        // Responder con éxito
        res.json({
            msg: 'Categoría y sus imágenes eliminadas correctamente'
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
// Función para adaptar categorías al formato que espera el frontend
const adaptCategoryForFrontend = (category) => {
    // Si es un solo objeto
    if (!Array.isArray(category)) {
        const categoryJson = category.toJSON ? category.toJSON() : category;
        // Mantener categoryImages pero también agregar images para compatibilidad
        if (categoryJson.categoryImages) {
            categoryJson.images = categoryJson.categoryImages;
        }
        return categoryJson;
    }
    // Si es un array
    return category.map(cat => {
        const categoryJson = cat.toJSON ? cat.toJSON() : cat;
        // Mantener categoryImages pero también agregar images para compatibilidad
        if (categoryJson.categoryImages) {
            categoryJson.images = categoryJson.categoryImages;
        }
        return categoryJson;
    });
};

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
exports.setMainImage = exports.deleteImage = exports.getImagesByEntity = exports.uploadImage = exports.upload = void 0;
const cloudinary_1 = require("cloudinary");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const image_1 = __importDefault(require("../db/models/image"));
// Asegurar que el directorio de uploads exista
const uploadsDir = path_1.default.join(__dirname, '../../uploads');
if (!fs_1.default.existsSync(uploadsDir)) {
    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
}
// Configurar Cloudinary
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
    api_key: process.env.CLOUDINARY_API_KEY || '',
    api_secret: process.env.CLOUDINARY_API_SECRET || ''
});
// Configurar almacenamiento para multer
const storage = multer_1.default.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path_1.default.extname(file.originalname));
    }
});
// Filtrar tipos de archivo
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    }
    else {
        cb(new Error('El archivo debe ser una imagen'), false);
    }
};
// Configurar multer
exports.upload = (0, multer_1.default)({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
    },
    fileFilter: fileFilter
});
// Subir una imagen
const uploadImage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const file = req.file;
        if (!file) {
            return res.status(400).json({
                message: 'No se ha subido ninguna imagen'
            });
        }
        const { entity_type, entity_id, is_main } = req.body;
        // Validar campos obligatorios
        if (!entity_type || !entity_id) {
            // Eliminar el archivo temporal
            fs_1.default.unlinkSync(file.path);
            return res.status(400).json({
                message: 'Los campos entity_type y entity_id son obligatorios'
            });
        }
        // Validar entity_type
        const validEntityTypes = ['user', 'product', 'category', 'barter'];
        if (!validEntityTypes.includes(entity_type)) {
            // Eliminar el archivo temporal
            fs_1.default.unlinkSync(file.path);
            return res.status(400).json({
                message: 'El tipo de entidad no es válido'
            });
        }
        // Subir imagen a Cloudinary
        const result = yield cloudinary_1.v2.uploader.upload(file.path, {
            folder: `casanare/${entity_type}s`
        });
        // Eliminar el archivo temporal después de subirlo
        fs_1.default.unlinkSync(file.path);
        // Si se marca como principal, actualizar otras imágenes
        if (is_main === 'true') {
            yield image_1.default.update({ is_main: false }, {
                where: {
                    entity_type,
                    entity_id: parseInt(entity_id),
                    is_main: true
                }
            });
        }
        // Crear registro en la base de datos
        const image = yield image_1.default.create({
            url: result.secure_url,
            public_id: result.public_id,
            entity_type: entity_type,
            entity_id: parseInt(entity_id),
            is_main: is_main === 'true'
        });
        return res.status(201).json({
            message: 'Imagen subida con éxito',
            image
        });
    }
    catch (error) {
        console.error('Error al subir imagen:', error);
        return res.status(500).json({
            message: 'Error al subir la imagen',
            error: error.message
        });
    }
});
exports.uploadImage = uploadImage;
// Obtener imágenes por entidad
const getImagesByEntity = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { entity_type, entity_id } = req.params;
        // Validar entity_type
        const validEntityTypes = ['user', 'product', 'category', 'barter'];
        if (!validEntityTypes.includes(entity_type)) {
            return res.status(400).json({
                message: 'El tipo de entidad no es válido'
            });
        }
        const images = yield image_1.default.findAll({
            where: {
                entity_type: entity_type,
                entity_id: parseInt(entity_id)
            },
            order: [
                ['is_main', 'DESC'],
                ['createdAt', 'DESC']
            ]
        });
        return res.status(200).json(images);
    }
    catch (error) {
        console.error('Error al obtener imágenes:', error);
        return res.status(500).json({
            message: 'Error al obtener imágenes',
            error: error.message
        });
    }
});
exports.getImagesByEntity = getImagesByEntity;
// Eliminar una imagen
const deleteImage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const image = yield image_1.default.findByPk(parseInt(id));
        if (!image) {
            return res.status(404).json({
                message: 'Imagen no encontrada'
            });
        }
        // Eliminar de Cloudinary si tiene public_id
        const publicId = image.get('public_id');
        if (publicId) {
            yield cloudinary_1.v2.uploader.destroy(publicId);
        }
        // Eliminar de la base de datos
        yield image.destroy();
        return res.status(200).json({
            message: 'Imagen eliminada con éxito'
        });
    }
    catch (error) {
        console.error('Error al eliminar imagen:', error);
        return res.status(500).json({
            message: 'Error al eliminar la imagen',
            error: error.message
        });
    }
});
exports.deleteImage = deleteImage;
// Establecer imagen principal
const setMainImage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const image = yield image_1.default.findByPk(parseInt(id));
        if (!image) {
            return res.status(404).json({
                message: 'Imagen no encontrada'
            });
        }
        const entityType = image.get('entity_type');
        const entityId = image.get('entity_id');
        // Quitar imagen principal de otras imágenes de la misma entidad
        yield image_1.default.update({ is_main: false }, {
            where: {
                entity_type: entityType,
                entity_id: entityId,
                is_main: true
            }
        });
        // Establecer esta imagen como principal
        yield image.update({ is_main: true });
        return res.status(200).json({
            message: 'Imagen establecida como principal',
            image
        });
    }
    catch (error) {
        console.error('Error al establecer imagen principal:', error);
        return res.status(500).json({
            message: 'Error al establecer imagen principal',
            error: error.message
        });
    }
});
exports.setMainImage = setMainImage;

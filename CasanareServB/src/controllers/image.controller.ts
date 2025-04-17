import { Request, Response, NextFunction } from 'express';
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import Image from '../db/models/image';

// Asegurar que el directorio de uploads exista
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
  api_key: process.env.CLOUDINARY_API_KEY || '',
  api_secret: process.env.CLOUDINARY_API_SECRET || ''
});

// Configurar almacenamiento para multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

// Filtrar tipos de archivo
const fileFilter = (req: Request, file: any, cb: any) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('El archivo debe ser una imagen'), false);
  }
};

// Configurar multer
export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: fileFilter
});


// Subir una imagen
export const uploadImage = async (req: Request, res: Response) => {
  try {
    const file = req.file as any;
    
    if (!file) {
      return res.status(400).json({
        message: 'No se ha subido ninguna imagen'
      });
    }

    const { entity_type, entity_id, is_main } = req.body;
    
    // Validar campos obligatorios
    if (!entity_type || !entity_id) {
      // Eliminar el archivo temporal
      fs.unlinkSync(file.path);
      
      return res.status(400).json({
        message: 'Los campos entity_type y entity_id son obligatorios'
      });
    }

    // Validar entity_type
    const validEntityTypes = ['user', 'product', 'category', 'barter'];
    if (!validEntityTypes.includes(entity_type)) {
      // Eliminar el archivo temporal
      fs.unlinkSync(file.path);
      
      return res.status(400).json({
        message: 'El tipo de entidad no es válido'
      });
    }

    // Subir imagen a Cloudinary
    const result = await cloudinary.uploader.upload(file.path, {
      folder: `casanare/${entity_type}s`
    });
    
    // Eliminar el archivo temporal después de subirlo
    fs.unlinkSync(file.path);

    // Si se marca como principal, actualizar otras imágenes
    if (is_main === 'true') {
      await Image.update(
        { is_main: false },
        { 
          where: { 
            entity_type, 
            entity_id: parseInt(entity_id),
            is_main: true
          } 
        }
      );
    }

    // Crear registro en la base de datos
    const image = await Image.create({
      url: result.secure_url,
      public_id: result.public_id,
      entity_type: entity_type as 'user' | 'product' | 'category' | 'barter',
      entity_id: parseInt(entity_id),
      is_main: is_main === 'true'
    });

    return res.status(201).json({
      message: 'Imagen subida con éxito',
      image
    });
  } catch (error: any) {
    console.error('Error al subir imagen:', error);
    return res.status(500).json({
      message: 'Error al subir la imagen',
      error: error.message
    });
  }
};

// Obtener imágenes por entidad
export const getImagesByEntity = async (req: Request, res: Response) => {
  try {
    const { entity_type, entity_id } = req.params;
    
    // Validar entity_type
    const validEntityTypes = ['user', 'product', 'category', 'barter'];
    if (!validEntityTypes.includes(entity_type)) {
      return res.status(400).json({
        message: 'El tipo de entidad no es válido'
      });
    }
    
    const images = await Image.findAll({
      where: {
        entity_type: entity_type as 'user' | 'product' | 'category' | 'barter',
        entity_id: parseInt(entity_id)
      },
      order: [
        ['is_main', 'DESC'],
        ['createdAt', 'DESC']
      ]
    });
    
    return res.status(200).json(images);
  } catch (error: any) {
    console.error('Error al obtener imágenes:', error);
    return res.status(500).json({
      message: 'Error al obtener imágenes',
      error: error.message
    });
  }
};

// Eliminar una imagen
export const deleteImage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const image = await Image.findByPk(parseInt(id));
    
    if (!image) {
      return res.status(404).json({
        message: 'Imagen no encontrada'
      });
    }
    
    // Eliminar de Cloudinary si tiene public_id
    const publicId = image.get('public_id');
    if (publicId) {
      await cloudinary.uploader.destroy(publicId as string);
    }
    
    // Eliminar de la base de datos
    await image.destroy();
    
    return res.status(200).json({
      message: 'Imagen eliminada con éxito'
    });
  } catch (error: any) {
    console.error('Error al eliminar imagen:', error);
    return res.status(500).json({
      message: 'Error al eliminar la imagen',
      error: error.message
    });
  }
};

// Establecer imagen principal
export const setMainImage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const image = await Image.findByPk(parseInt(id));
    
    if (!image) {
      return res.status(404).json({
        message: 'Imagen no encontrada'
      });
    }
    
    const entityType = image.get('entity_type');
    const entityId = image.get('entity_id');
    
    // Quitar imagen principal de otras imágenes de la misma entidad
    await Image.update(
      { is_main: false },
      { 
        where: { 
          entity_type: entityType,
          entity_id: entityId,
          is_main: true
        } 
      }
    );
    
    // Establecer esta imagen como principal
    await image.update({ is_main: true });
    
    return res.status(200).json({
      message: 'Imagen establecida como principal',
      image
    });
  } catch (error: any) {
    console.error('Error al establecer imagen principal:', error);
    return res.status(500).json({
      message: 'Error al establecer imagen principal',
      error: error.message
    });
  }
};
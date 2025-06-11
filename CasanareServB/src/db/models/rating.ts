import { Model, DataTypes } from 'sequelize';
import sequelize from '../conection';
import products from './product';
import barters from './barter';
import users from './user';

/**
 * Estructura de datos para calificaciones y reseñas
 * Define los campos necesarios para gestionar ratings de productos y trueques
 */
interface RaitingAttributes {
    id_raiting?: number; // ID único de la calificación
    id_product?: number; // Producto calificado (opcional)
    id_barter?: number; // Trueque calificado (opcional)
    id_user_rated: number; // Usuario que recibe la calificación
    id_user_qualifying: number; // Usuario que otorga la calificación
    score: number; // Puntuación del 1 al 5
    comment?: string; // Comentario opcional de la reseña
    has_images?: boolean; // Si la reseña incluye imágenes
    createdAt?: Date; // Fecha de creación automática
}

/**
 * Modelo de Calificaciones y Reseñas
 * Sistema de rating para productos y trueques con validaciones
 */
const Raiting = sequelize.define<Model<RaitingAttributes>>('raitings', {
    // Clave primaria
    id_raiting: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true // Se incrementa automáticamente
    },
    
    // Producto calificado (opcional - sistema polimórfico)
    id_product: {
        type: DataTypes.INTEGER,
        references: {
            model: products, // Relaciona con modelo products
            key: 'id_product'
        }
    },
    
    // Trueque calificado (opcional - sistema polimórfico)
    id_barter: {
        type: DataTypes.INTEGER,
        references: {
            model: barters, // Relaciona con modelo barters
            key: 'id_barter'
        }
    },
    
    // Usuario que recibe la calificación
    id_user_rated: {
        type: DataTypes.INTEGER,
        allowNull: false, // Campo obligatorio
        references: {
            model: users, // Relaciona con modelo users
            key: 'id'
        }
    },
    
    // Usuario que otorga la calificación
    id_user_qualifying: {
        type: DataTypes.INTEGER,
        allowNull: false, // Campo obligatorio
        references: {
            model: users, // Relaciona con modelo users
            key: 'id'
        }
    },
    
    // Puntuación con validación de rango
    score: {
        type: DataTypes.INTEGER,
        allowNull: false, // Campo obligatorio
        validate: {
            min: 1, // Mínimo 1 estrella
            max: 5  // Máximo 5 estrellas
        }
    },
    
    // Comentario de la reseña
    comment: {
        type: DataTypes.TEXT, // Texto largo para comentarios extensos
        allowNull: true // Campo opcional
    },
    
    // Indicador de imágenes adjuntas
    has_images: {
        type: DataTypes.BOOLEAN,
        allowNull: true, // Campo opcional
        defaultValue: false // Por defecto sin imágenes
    }
}, {
    tableName: 'raitings', // Nombre explícito de la tabla
    timestamps: true, // Habilita timestamps automáticos
    updatedAt: false // Solo queremos createdAt, no updatedAt
});

// Asociaciones con otros modelos

// Relación con productos
Raiting.belongsTo(products, {
    foreignKey: 'id_product', // Clave foránea
    as: 'product' // Alias para la relación
});

// Relación con trueques
Raiting.belongsTo(barters, {
    foreignKey: 'id_barter', // Clave foránea
    as: 'barter' // Alias para la relación
});

// Relación con usuario calificado
Raiting.belongsTo(users, {
    foreignKey: 'id_user_rated', // Clave foránea
    as: 'user_rated' // Alias para el usuario que recibe rating
});

// Relación con usuario calificador
Raiting.belongsTo(users, {
    foreignKey: 'id_user_qualifying', // Clave foránea
    as: 'user_qualifying' // Alias para el usuario que otorga rating
});

// Hook de validación: al menos un contexto debe estar presente
Raiting.addHook('beforeValidate', (instance: any) => {
    // Valida que se califique un producto O un trueque (no ambos vacíos)
    if (!instance.id_product && !instance.id_barter) {
        throw new Error('At least one of id_product or id_barter must be provided');
    }
});

export default Raiting;
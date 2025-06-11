"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const conection_1 = __importDefault(require("../conection"));
const product_1 = __importDefault(require("./product"));
const barter_1 = __importDefault(require("./barter"));
const user_1 = __importDefault(require("./user"));
/**
 * Modelo de Calificaciones y Reseñas
 * Sistema de rating para productos y trueques con validaciones
 */
const Raiting = conection_1.default.define('raitings', {
    // Clave primaria
    id_raiting: {
        type: sequelize_1.DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true // Se incrementa automáticamente
    },
    // Producto calificado (opcional - sistema polimórfico)
    id_product: {
        type: sequelize_1.DataTypes.INTEGER,
        references: {
            model: product_1.default, // Relaciona con modelo products
            key: 'id_product'
        }
    },
    // Trueque calificado (opcional - sistema polimórfico)
    id_barter: {
        type: sequelize_1.DataTypes.INTEGER,
        references: {
            model: barter_1.default, // Relaciona con modelo barters
            key: 'id_barter'
        }
    },
    // Usuario que recibe la calificación
    id_user_rated: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false, // Campo obligatorio
        references: {
            model: user_1.default, // Relaciona con modelo users
            key: 'id'
        }
    },
    // Usuario que otorga la calificación
    id_user_qualifying: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false, // Campo obligatorio
        references: {
            model: user_1.default, // Relaciona con modelo users
            key: 'id'
        }
    },
    // Puntuación con validación de rango
    score: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false, // Campo obligatorio
        validate: {
            min: 1, // Mínimo 1 estrella
            max: 5 // Máximo 5 estrellas
        }
    },
    // Comentario de la reseña
    comment: {
        type: sequelize_1.DataTypes.TEXT, // Texto largo para comentarios extensos
        allowNull: true // Campo opcional
    },
    // Indicador de imágenes adjuntas
    has_images: {
        type: sequelize_1.DataTypes.BOOLEAN,
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
Raiting.belongsTo(product_1.default, {
    foreignKey: 'id_product', // Clave foránea
    as: 'product' // Alias para la relación
});
// Relación con trueques
Raiting.belongsTo(barter_1.default, {
    foreignKey: 'id_barter', // Clave foránea
    as: 'barter' // Alias para la relación
});
// Relación con usuario calificado
Raiting.belongsTo(user_1.default, {
    foreignKey: 'id_user_rated', // Clave foránea
    as: 'user_rated' // Alias para el usuario que recibe rating
});
// Relación con usuario calificador
Raiting.belongsTo(user_1.default, {
    foreignKey: 'id_user_qualifying', // Clave foránea
    as: 'user_qualifying' // Alias para el usuario que otorga rating
});
// Hook de validación: al menos un contexto debe estar presente
Raiting.addHook('beforeValidate', (instance) => {
    // Valida que se califique un producto O un trueque (no ambos vacíos)
    if (!instance.id_product && !instance.id_barter) {
        throw new Error('At least one of id_product or id_barter must be provided');
    }
});
exports.default = Raiting;

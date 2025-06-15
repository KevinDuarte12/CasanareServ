"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const conection_1 = __importDefault(require("../conection"));
const user_1 = __importDefault(require("./user"));
const category_1 = __importDefault(require("./category"));
/**
 * Modelo de Productos
 * Gestiona todos los productos disponibles en la plataforma para venta y trueques
 */
class Product extends sequelize_1.Model {
}
// Configuración del modelo en la base de datos
Product.init({
    // Clave primaria
    id_product: {
        type: sequelize_1.DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true // Se incrementa automáticamente
    },
    // Usuario propietario del producto
    id_user: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false, // Siempre debe tener un propietario
        references: {
            model: user_1.default, // Relaciona con modelo User
            key: 'id'
        }
    },
    // Categoría del producto
    id_category: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false, // Siempre debe tener una categoría
        references: {
            model: category_1.default, // Relaciona con modelo Category
            key: 'id_category'
        }
    },
    // Nombre del producto
    name: {
        type: sequelize_1.DataTypes.STRING(100), // Máximo 100 caracteres
        allowNull: false // Campo obligatorio
    },
    // Control de inventario
    stock: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false, // Campo obligatorio
        defaultValue: 0, // Por defecto sin stock
        validate: {
            min: 0 // No puede ser negativo
        }
    },
    // Descripción detallada
    description: {
        type: sequelize_1.DataTypes.TEXT // Texto largo para descripciones extensas
    },
    // Precio del producto
    price: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2), // Hasta 99,999,999.99
        allowNull: false // Campo obligatorio
    },
    // Estado del producto con valores predefinidos
    status: {
        type: sequelize_1.DataTypes.ENUM('disponible', 'vendido', 'en_trueque', 'inactivo', 'pendiente'),
        defaultValue: 'disponible' // Por defecto disponible
    },
    // Tipo de producto
    type: {
        type: sequelize_1.DataTypes.ENUM('regular', 'barter'),
        defaultValue: 'regular' // Por defecto producto regular (venta)
    },
    // Control de aprobación administrativa
    admin_approved: {
        type: sequelize_1.DataTypes.BOOLEAN,
        defaultValue: false, // Por defecto no aprobado
        allowNull: false // Campo obligatorio
    },
    // Control de trueques pendientes
    has_pending_barters: {
        type: sequelize_1.DataTypes.BOOLEAN,
        defaultValue: false, // Por defecto sin trueques pendientes
        allowNull: false // Campo obligatorio
    }
}, {
    sequelize: conection_1.default,
    tableName: 'products', // Nombre explícito de la tabla
    modelName: 'product', // Nombre del modelo en Sequelize
    timestamps: true, // Habilita createdAt y updatedAt automáticos
    // Índices para optimización
    indexes: [
        {
            name: 'idx_products_user', // Búsquedas por usuario
            fields: ['id_user']
        },
        {
            name: 'idx_products_category', // Búsquedas por categoría
            fields: ['id_category']
        },
        {
            name: 'idx_products_status', // Filtros por estado
            fields: ['status']
        },
        {
            name: 'idx_products_type', // Filtros por tipo
            fields: ['type']
        },
        {
            name: 'idx_products_approved', // Productos aprobados
            fields: ['admin_approved', 'status']
        }
    ]
});
exports.default = Product;

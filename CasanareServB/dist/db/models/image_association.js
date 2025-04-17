"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const category_1 = __importDefault(require("./category"));
const image_1 = __importDefault(require("./image"));
const product_1 = __importDefault(require("./product"));
// Importa otros modelos según sea necesario
const image_associations = () => {
    // Asociación de imágenes con categorías
    category_1.default.hasMany(image_1.default, {
        foreignKey: 'entity_id',
        constraints: false,
        scope: {
            entity_type: 'category'
        },
        as: 'images'
    });
    image_1.default.belongsTo(category_1.default, {
        foreignKey: 'entity_id',
        constraints: false,
        as: 'category'
    });
    // Asociación de imágenes con productos
    product_1.default.hasMany(image_1.default, {
        foreignKey: 'entity_id',
        constraints: false,
        scope: {
            entity_type: 'product'
        },
        as: 'images'
    });
    image_1.default.belongsTo(product_1.default, {
        foreignKey: 'entity_id',
        constraints: false,
        as: 'product'
    });
    console.log('Image associations loaded successfully');
};
exports.default = image_associations;

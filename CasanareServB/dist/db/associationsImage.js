"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Image = exports.Category = exports.Product = exports.User = void 0;
const user_1 = __importDefault(require("./models/user"));
exports.User = user_1.default;
const product_1 = __importDefault(require("./models/product"));
exports.Product = product_1.default;
const category_1 = __importDefault(require("./models/category"));
exports.Category = category_1.default;
const image_1 = __importDefault(require("./models/image"));
exports.Image = image_1.default;
// import Barter from './models/barter'; // Si existe
// Definir asociaciones para User
user_1.default.hasMany(image_1.default, {
    foreignKey: 'entity_id',
    constraints: false,
    scope: {
        entity_type: 'user'
    },
    as: 'userImages' // ¡Cambiado de 'images' a 'userImages'!
});
// Definir asociaciones para Product
product_1.default.hasMany(image_1.default, {
    foreignKey: 'entity_id',
    constraints: false,
    scope: {
        entity_type: 'product'
    },
    as: 'productImages' // ¡Cambiado de 'images' a 'productImages'!
});
// Definir asociaciones para Category
category_1.default.hasMany(image_1.default, {
    foreignKey: 'entity_id',
    constraints: false,
    scope: {
        entity_type: 'category'
    },
    as: 'categoryImages' // ¡Cambiado de 'images' a 'categoryImages'!
});
// Barter.hasMany(Image, {
//   foreignKey: 'entity_id',
//   constraints: false,
//   scope: {
//     entity_type: 'barter'
//   },
//   as: 'barterImages' // ¡Alias único!
// });
// Definir asociaciones inversas para Image
image_1.default.belongsTo(user_1.default, {
    foreignKey: 'entity_id',
    constraints: false,
    as: 'user',
    scope: {
        entity_type: 'user'
    }
});
image_1.default.belongsTo(product_1.default, {
    foreignKey: 'entity_id',
    constraints: false,
    as: 'product',
    scope: {
        entity_type: 'product'
    }
});
image_1.default.belongsTo(category_1.default, {
    foreignKey: 'entity_id',
    constraints: false,
    as: 'category',
    scope: {
        entity_type: 'category'
    }
});
// Image.belongsTo(Barter, {
//   foreignKey: 'entity_id',
//   constraints: false,
//   as: 'barter',
//   scope: {
//     entity_type: 'barter'
//   }
// });
console.log('✅ Asociaciones de imágenes inicializadas correctamente');

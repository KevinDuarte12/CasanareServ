"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Barter = exports.Image = exports.Category = exports.Product = exports.User = void 0;
const user_1 = __importDefault(require("./models/user"));
exports.User = user_1.default;
const product_1 = __importDefault(require("./models/product"));
exports.Product = product_1.default;
const category_1 = __importDefault(require("./models/category"));
exports.Category = category_1.default;
const image_1 = __importDefault(require("./models/image"));
exports.Image = image_1.default;
const barter_1 = __importDefault(require("./models/barter"));
exports.Barter = barter_1.default;
const notifications_1 = __importDefault(require("./models/notifications"));
// Definir asociaciones para User
user_1.default.hasMany(image_1.default, {
    foreignKey: 'entity_id',
    constraints: false,
    scope: {
        entity_type: 'user'
    },
    as: 'userImages'
});
user_1.default.hasMany(notifications_1.default, {
    foreignKey: 'id_user',
    as: 'notifications'
});
// Definir asociaciones para Product
product_1.default.hasMany(image_1.default, {
    foreignKey: 'entity_id',
    constraints: false,
    scope: {
        entity_type: 'product'
    },
    as: 'productImages'
});
// Definir asociaciones para Category
category_1.default.hasMany(image_1.default, {
    foreignKey: 'entity_id',
    constraints: false,
    scope: {
        entity_type: 'category'
    },
    as: 'categoryImages'
});
// Asociaciones para imágenes de Barter (mantener solo esta)
barter_1.default.hasMany(image_1.default, {
    foreignKey: 'entity_id',
    constraints: false,
    scope: {
        entity_type: 'barter'
    },
    as: 'barterImages'
});
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
// Add inverse relationship
image_1.default.belongsTo(barter_1.default, {
    foreignKey: 'entity_id',
    constraints: false,
    as: 'barter',
    scope: {
        entity_type: 'barter'
    }
});
notifications_1.default.belongsTo(user_1.default, {
    foreignKey: 'id_user',
    as: 'user'
});
console.log('✅ Asociaciones de imágenes inicializadas correctamente');

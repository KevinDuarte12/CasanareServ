"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Barter = void 0;
const product_1 = __importDefault(require("./models/product"));
const user_1 = __importDefault(require("./models/user"));
const barter_1 = __importDefault(require("./models/barter"));
exports.Barter = barter_1.default;
// Asociaciones de Barter con otros modelos
barter_1.default.belongsTo(product_1.default, {
    foreignKey: 'id_prod_offer',
    as: 'offered_product'
});
barter_1.default.belongsTo(product_1.default, {
    foreignKey: 'id_prod_request',
    as: 'requested_product'
});
barter_1.default.belongsTo(user_1.default, {
    foreignKey: 'id_user_offer',
    as: 'offering_user'
});
barter_1.default.belongsTo(user_1.default, {
    foreignKey: 'id_user_receiving',
    as: 'receiving_user'
});
console.log('✅ Asociaciones de trueques inicializadas correctamente');

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const conection_1 = __importDefault(require("../conection"));
/**
 * Modelo principal de ChatMessage
 * Gestiona la comunicación en tiempo real entre usuarios
 */
class ChatMessage extends sequelize_1.Model {
}
// Configuración del modelo en la base de datos
ChatMessage.init({
    // Clave primaria
    id_message: {
        type: sequelize_1.DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true // Se incrementa automáticamente
    },
    // Contexto del mensaje (opcional)
    id_product: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true // Puede no estar relacionado con un producto
    },
    id_barter: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true // Puede no estar relacionado con un trueque
    },
    // Remitente del mensaje
    id_user: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false // Siempre debe haber un usuario que envía
    },
    // Contenido del mensaje
    message: {
        type: sequelize_1.DataTypes.TEXT, // Texto largo para mensajes extensos
        allowNull: true // Puede ser solo imagen sin texto
    },
    image_url: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true // Imagen es opcional
    },
    // Tiempo de envío
    sent_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize_1.DataTypes.NOW // Se asigna automáticamente al crear
    },
    // Control de lectura
    is_read: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false // Por defecto no leído
    },
    // Control de finalización de conversación
    is_finalized: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false // Por defecto conversación activa
    },
    // Eliminación selectiva por usuario
    deleted_for_user: {
        type: sequelize_1.DataTypes.TEXT, // Almacena JSON como texto en MySQL
        allowNull: true,
        defaultValue: '[]', // Array vacío por defecto
        // Getter: convierte JSON string a array
        get() {
            const value = this.getDataValue('deleted_for_user');
            if (!value)
                return [];
            try {
                return JSON.parse(value); // Parsea el JSON
            }
            catch (e) {
                return []; // Si falla, retorna array vacío
            }
        },
        // Setter: convierte array a JSON string
        set(value) {
            if (value === null || value === undefined) {
                this.setDataValue('deleted_for_user', '[]');
            }
            else if (Array.isArray(value)) {
                this.setDataValue('deleted_for_user', JSON.stringify(value)); // Convierte array a JSON
            }
            else if (typeof value === 'string') {
                // Verificar si es JSON válido
                try {
                    JSON.parse(value);
                    this.setDataValue('deleted_for_user', value);
                }
                catch (e) {
                    this.setDataValue('deleted_for_user', '[]'); // Si no es JSON válido, usar array vacío
                }
            }
            else {
                this.setDataValue('deleted_for_user', '[]'); // Valor por defecto
            }
        }
    }
}, {
    sequelize: conection_1.default,
    modelName: 'ChatMessage',
    tableName: 'chat_messages', // Nombre explícito de la tabla
    timestamps: false // Usa sent_at personalizado en lugar de timestamps automáticos
});
exports.default = ChatMessage;

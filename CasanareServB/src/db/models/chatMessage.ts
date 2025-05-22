import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../conection';
import User from './user';
import Product from './product';
import Barter from './barter';

// Define la interfaz para los atributos de ChatMessage
export interface ChatMessageAttributes {
  id_message?: number; // <-- Cambiado aquí
  id_product?: number | null;
  id_barter?: number | null;
  id_user: number;
  message?: string | null;
  image_url?: string | null;
  sent_at: Date;
  is_read?: boolean;
  is_finalized?: boolean; // Nuevo campo
  deleted_for_user?: any; // Nuevo campo
}

// Define interfaz para la creación (algunos campos opcionales al crear)
interface ChatMessageCreationAttributes extends Optional<ChatMessageAttributes, 'id_message'> {} // <-- Cambiado aquí

// Definir interfaces para las asociaciones
interface ChatMessageInstance extends Model<ChatMessageAttributes, ChatMessageCreationAttributes>, ChatMessageAttributes {
  // Métodos de asociación
  getUser: () => Promise<typeof User>;
  getProduct: () => Promise<typeof Product>;
  getBarter: () => Promise<typeof Barter>;
  
  // Propiedades de asociación
  user?: typeof User;
  product?: typeof Product;
  barter?: typeof Barter;
  
  // Timestamps
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

// Define la clase del modelo con los tipos correctos
class ChatMessage extends Model<ChatMessageAttributes, ChatMessageCreationAttributes> implements ChatMessageAttributes {
  public id_message!: number; // <-- Cambiado aquí
  public id_product?: number | null;
  public id_barter?: number | null;
  public id_user!: number;
  public message?: string | null;
  public image_url?: string | null;
  public sent_at!: Date;
  public is_read?: boolean;
  public is_finalized?: boolean; // Nuevo campo
  public deleted_for_user?: any; // Nuevo campo
  
  // Timestamps
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  
  // Asociaciones estáticas
  public static associations: {
    user: any;
    product: any;
    barter: any;
  };
}

ChatMessage.init({
  id_message: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  id_product: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  id_barter: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  id_user: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  image_url: {
    type: DataTypes.STRING,
    allowNull: true
  },
  sent_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  is_read: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  is_finalized: { // Nuevo campo
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  deleted_for_user: { // Nuevo campo
    type: DataTypes.TEXT, // Usar TEXT para MySQL
    allowNull: true,
    defaultValue: '[]',
    get() {
      const value = this.getDataValue('deleted_for_user');
      if (!value) return [];
      try {
        return JSON.parse(value);
      } catch (e) {
        return [];
      }
    },
    set(value: any) {
      if (value === null || value === undefined) {
        this.setDataValue('deleted_for_user', '[]');
      } else if (Array.isArray(value)) {
        this.setDataValue('deleted_for_user', JSON.stringify(value));
      } else if (typeof value === 'string') {
        // Verificar si es JSON válido
        try {
          JSON.parse(value);
          this.setDataValue('deleted_for_user', value);
        } catch (e) {
          this.setDataValue('deleted_for_user', '[]');
        }
      } else {
        this.setDataValue('deleted_for_user', '[]');
      }
    }
  }
}, {
  sequelize,
  modelName: 'ChatMessage',
  tableName: 'chat_messages',
  timestamps: false
});

export default ChatMessage;
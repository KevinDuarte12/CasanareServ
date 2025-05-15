import { DataTypes, Model } from 'sequelize';
import sequelize from '../conection';

export interface ChatMessageAttributes {
  id_message?: number;
  id_barter?: number | null;
  id_product?: number | null;
  id_user: number;
  message?: string | null;
  image_url?: string | null;
  sent_at?: Date;
}

const ChatMessage = sequelize.define<Model<ChatMessageAttributes>>('chat_message', {
  id_message: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  id_barter: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'barters', key: 'id_barter' }
  },
  id_product: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'products', key: 'id_product' }
  },
  id_user: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'users', key: 'id' }
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  image_url: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  sent_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  }
}, {
  tableName: 'chat_messages',
  timestamps: false,
});

export default ChatMessage;
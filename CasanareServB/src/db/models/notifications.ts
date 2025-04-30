import { DataTypes, Model } from 'sequelize';
import sequelize from '../conection';

// Modificar la interfaz para indicar que is_read es opcional para la creación
interface NotificationAttributes {
  id_notification?: number;
  id_user: number;
  type: string;
  title: string;
  message: string;
  entity_type: string;
  entity_id: number;
  is_read?: boolean; // Cambiar a opcional
  action_url?: string;
  created_at?: Date;
  updated_at?: Date;
}

class Notification extends Model<NotificationAttributes> implements NotificationAttributes {
  public id_notification!: number;
  public id_user!: number;
  public type!: string;
  public title!: string;
  public message!: string;
  public entity_type!: string;
  public entity_id!: number;
  public is_read!: boolean;
  public action_url?: string;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Notification.init({
  id_notification: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  id_user: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id' // Asegúrate de que esto coincide con la columna PK en tu tabla users
    }
  },
  type: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  title: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  entity_type: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  entity_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  is_read: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  action_url: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  sequelize,
  modelName: 'Notification',
  tableName: 'notifications',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

export default Notification;
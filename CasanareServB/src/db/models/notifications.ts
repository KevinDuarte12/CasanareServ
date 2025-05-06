import { DataTypes, Model } from 'sequelize';
import sequelize from '../conection';
import User from './user';

class Notification extends Model {
  // Definiendo atributos que coincidan con la migración
  public id_notification!: number;
  public id_user!: number;
  public type!: string;
  public title!: string;
  public message!: string;
  public entity_type!: string;
  public entity_id!: number;
  public is_read!: boolean;
  public action_url!: string | null;
  public created_at!: Date;
  public updated_at!: Date;
}

Notification.init(
  {
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
        key: 'id'
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
  },
  {
    sequelize,
    tableName: 'notifications',
    modelName: 'Notification',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
);

// Definir asociación con User
Notification.belongsTo(User, {
  foreignKey: 'id_user',
  as: 'notification_user' // Cambiamos el alias para que sea único
});

export default Notification;
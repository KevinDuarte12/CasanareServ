import { DataTypes, Model } from 'sequelize';
import sequelize from '../conection';
import User from './user';
/**
 * Modelo de Notificaciones del Sistema
 * Gestiona todas las notificaciones enviadas a usuarios
 */
class Notification extends Model {
  // Identificadores principales
  public id_notification!: number; // ID único de la notificación
  public id_user!: number; // Usuario destinatario

  // Contenido de la notificación
  public type!: string; // Tipo de notificación (message, barter, order, etc.)
  public title!: string; // Título descriptivo
  public message!: string; // Contenido completo del mensaje

  // Relación polimórfica con entidades
  public entity_type!: string; // Tipo de entidad relacionada (product, barter, user)
  public entity_id!: number; // ID de la entidad específica

  // Control de estado y acciones
  public is_read!: boolean; // Si la notificación fue leída
  public action_url!: string | null; // URL para redirección al hacer clic

  // Timestamps personalizados
  public created_at!: Date; // Fecha de creación
  public updated_at!: Date; // Fecha de última actualización
}
Notification.init(
  {
    // Clave primaria
    id_notification: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true // Se incrementa automáticamente
    },
    // Usuario destinatario
    id_user: {
      type: DataTypes.INTEGER,
      allowNull: false, // Siempre debe tener un destinatario
      references: {
        model: 'users', // Relaciona con tabla users
        key: 'id'
      }
    },
    // Tipo de notificación para categorización
    type: {
      type: DataTypes.STRING(50), // Máximo 50 caracteres
      allowNull: false // Campo obligatorio
    },
    // Título breve de la notificación
    title: {
      type: DataTypes.STRING(100), // Máximo 100 caracteres
      allowNull: false // Campo obligatorio
    },
    // Mensaje detallado
    message: {
      type: DataTypes.TEXT, // Texto largo para contenido extenso
      allowNull: false // Campo obligatorio
    },
    // Tipo de entidad relacionada (sistema polimórfico)
    entity_type: {
      type: DataTypes.STRING(50), // Máximo 50 caracteres
      allowNull: false // Campo obligatorio
    },
    // ID de la entidad relacionada (sistema polimórfico)
    entity_id: {
      type: DataTypes.INTEGER,
      allowNull: false // Campo obligatorio
    },
    // Estado de lectura
    is_read: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false // Por defecto no leída
    },
    // URL opcional para acciones
    action_url: {
      type: DataTypes.STRING(255), // Máximo 255 caracteres para URL
      allowNull: true // Campo opcional
    },
    // Timestamp de creación personalizado
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW // Se asigna automáticamente
    },
    // Timestamp de actualización personalizado
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW // Se actualiza automáticamente
    }
  },
  {
    sequelize,
    tableName: 'notifications', // Nombre explícito de la tabla
    modelName: 'Notification', // Nombre del modelo
    timestamps: true, // Habilita manejo automático de timestamps
    underscored: true, // Usa snake_case para nombres de campos
    createdAt: 'created_at', // Campo personalizado para fecha de creación
    updatedAt: 'updated_at' // Campo personalizado para fecha de actualización
  }
);
// Relación con el modelo User
Notification.belongsTo(User, {
  foreignKey: 'id_user', // Clave foránea que conecta con users
  as: 'notification_user' // Alias único para evitar conflictos de nombres
});
export default Notification;
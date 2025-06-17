import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../conection';
import User from './user';
import Product from './product';
import Barter from './barter';
/**
 * Estructura de datos para mensajes de chat
 * Define los campos necesarios para la comunicación entre usuarios
 */
export interface ChatMessageAttributes {
  id_message?: number; // ID único del mensaje
  id_product?: number | null; // Producto sobre el que se conversa (opcional)
  id_barter?: number | null; // Trueque relacionado con el mensaje (opcional)
  id_user: number; // Usuario que envía el mensaje
  message?: string | null; // Contenido del mensaje de texto
  image_url?: string | null; // URL de imagen adjunta
  sent_at: Date; // Cuándo se envió el mensaje
  is_read?: boolean; // Si el mensaje fue leído
  is_finalized?: boolean; // Si la conversación está finalizada
  deleted_for_user?: any; // Lista de usuarios que eliminaron el mensaje
}
// Campos opcionales durante la creación
interface ChatMessageCreationAttributes extends Optional<ChatMessageAttributes, 'id_message'> {}
/**
 * Interfaz extendida con relaciones y métodos de asociación
 * Permite acceso a usuarios, productos y trueques relacionados
 */
interface ChatMessageInstance extends Model<ChatMessageAttributes, ChatMessageCreationAttributes>, ChatMessageAttributes {
  // Métodos para obtener relaciones
  getUser: () => Promise<typeof User>;
  getProduct: () => Promise<typeof Product>;
  getBarter: () => Promise<typeof Barter>;
  // Propiedades de asociación
  user?: typeof User;
  product?: typeof Product;
  barter?: typeof Barter;
  // Timestamps automáticos
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
/**
 * Modelo principal de ChatMessage
 * Gestiona la comunicación en tiempo real entre usuarios
 */
class ChatMessage extends Model<ChatMessageAttributes, ChatMessageCreationAttributes> implements ChatMessageAttributes {
  // Identificadores principales
  public id_message!: number;
  public id_product?: number | null;
  public id_barter?: number | null;
  public id_user!: number;
  // Contenido del mensaje
  public message?: string | null;
  public image_url?: string | null;  
  // Control de estado y tiempo
  public sent_at!: Date;
  public is_read?: boolean;
  public is_finalized?: boolean;
  public deleted_for_user?: any; // Array JSON de IDs de usuarios
  // Timestamps automáticos de Sequelize
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  // Definición de asociaciones estáticas
  public static associations: {
    user: any;
    product: any;
    barter: any;
  };
}
// Configuración del modelo en la base de datos
ChatMessage.init({
  // Clave primaria
  id_message: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true // Se incrementa automáticamente
  },
  // Contexto del mensaje (opcional)
  id_product: {
    type: DataTypes.INTEGER,
    allowNull: true // Puede no estar relacionado con un producto
  },
  id_barter: {
    type: DataTypes.INTEGER,
    allowNull: true // Puede no estar relacionado con un trueque
  },
  // Remitente del mensaje
  id_user: {
    type: DataTypes.INTEGER,
    allowNull: false // Siempre debe haber un usuario que envía
  },
  // Contenido del mensaje
  message: {
    type: DataTypes.TEXT, // Texto largo para mensajes extensos
    allowNull: true // Puede ser solo imagen sin texto
  },
  image_url: {
    type: DataTypes.STRING,
    allowNull: true // Imagen es opcional
  },
  // Tiempo de envío
  sent_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW // Se asigna automáticamente al crear
  },
  // Control de lectura
  is_read: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false // Por defecto no leído
  },
  // Control de finalización de conversación
  is_finalized: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false // Por defecto conversación activa
  },
  // Eliminación selectiva por usuario
  deleted_for_user: {
    type: DataTypes.TEXT, // Almacena JSON como texto en MySQL
    allowNull: true,
    defaultValue: '[]', // Array vacío por defecto
    // Getter: convierte JSON string a array
    get() {
      const value = this.getDataValue('deleted_for_user');
      if (!value) return [];
      try {
        return JSON.parse(value); // Parsea el JSON
      } catch (e) {
        return []; // Si falla, retorna array vacío
      }
    },
    // Setter: convierte array a JSON string
    set(value: any) {
      if (value === null || value === undefined) {
        this.setDataValue('deleted_for_user', '[]');
      } else if (Array.isArray(value)) {
        this.setDataValue('deleted_for_user', JSON.stringify(value)); // Convierte array a JSON
      } else if (typeof value === 'string') {
        // Verificar si es JSON válido
        try {
          JSON.parse(value);
          this.setDataValue('deleted_for_user', value);
        } catch (e) {
          this.setDataValue('deleted_for_user', '[]'); // Si no es JSON válido, usar array vacío
        }
      } else {
        this.setDataValue('deleted_for_user', '[]'); // Valor por defecto
      }
    }
  }
}, {
  sequelize,
  modelName: 'ChatMessage',
  tableName: 'chat_messages', // Nombre explícito de la tabla
  timestamps: false // Usa sent_at personalizado en lugar de timestamps automáticos
});
export default ChatMessage;
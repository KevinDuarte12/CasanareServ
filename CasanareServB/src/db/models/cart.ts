import { Model, DataTypes } from 'sequelize';
import sequelize from '../conection';
import users from './user';
/**
 * Estructura de datos para el carrito de compras
 * Define los campos necesarios para gestionar carritos de usuarios
 */
interface CartAttributes {
    id_cart?: number; // ID único del carrito
    id_user: number; // Usuario propietario del carrito
    status?: 'activo' | 'comprado' | 'abandonado'; // Estado del carrito
    createdAt?: Date; // Fecha de creación automática
}
/**
 * Modelo de Carrito de Compras
 * Gestiona los carritos de cada usuario en la plataforma
 */
const Cart = sequelize.define<Model<CartAttributes>>('carts', {
    // Clave primaria
    id_cart: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true // Se incrementa automáticamente
    },
    // Referencia al usuario propietario
    id_user: {
        type: DataTypes.INTEGER,
        allowNull: false, // Siempre debe tener un usuario
        references: {
            model: users, // Relaciona con la tabla users
            key: 'id'
        }
    },
    // Estado del carrito con valores predefinidos
    status: {
        type: DataTypes.ENUM('activo', 'comprado', 'abandonado'),
        defaultValue: 'activo' // Nuevo carrito inicia como activo
    }
}, {
    tableName: 'carts', // Nombre explícito de la tabla
    timestamps: true, // Habilita timestamps automáticos
    updatedAt: false // Solo queremos createdAt, no updatedAt
});
export default Cart;
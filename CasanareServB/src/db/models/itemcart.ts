import { Model, DataTypes } from 'sequelize';
import sequelize from '../conection';
import Product from './product'; // Importa el modelo Product
/**
 * Estructura de datos para items del carrito de compras
 * Define los campos necesarios para gestionar productos dentro de carritos
 */
interface ItemCartAttributes {
    id_item?: number; // ID único del item en el carrito
    id_cart: number; // Carrito al que pertenece el item
    id_product: number; // Producto agregado al carrito
    quantity: number; // Cantidad del producto
    price: number; // Precio al momento de agregar al carrito
}
/**
 * Modelo de Items del Carrito
 * Gestiona los productos individuales dentro de cada carrito de usuario
 */
const ItemCart = sequelize.define<Model<ItemCartAttributes>>('itemcart', {
    // Clave primaria
    id_item: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true // Se incrementa automáticamente
    },
    // Referencia al carrito contenedor
    id_cart: {
        type: DataTypes.INTEGER,
        allowNull: false, // Siempre debe pertenecer a un carrito
        references: {
            model: 'carts', // Relaciona con tabla carts
            key: 'id_cart'
        }
    },
    // Referencia al producto
    id_product: {
        type: DataTypes.INTEGER,
        allowNull: false, // Siempre debe tener un producto
        references: {
            model: 'products', // Relaciona con tabla products
            key: 'id_product'
        }
    },
    // Cantidad del producto en el carrito
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false, // Campo obligatorio
        defaultValue: 1 // Por defecto 1 unidad
    },
    // Precio del producto al agregarlo
    price: {
        type: DataTypes.DECIMAL(10, 2), // Hasta 99,999,999.99
        allowNull: false // Campo obligatorio para cálculos
    }
}, {
    tableName: 'itemcart', // Nombre explícito de la tabla
    timestamps: true, // Habilita createdAt y updatedAt automáticos
    // Índices para optimización
    indexes: [
        {
            name: 'idx_itemcart_cart', // Búsquedas por carrito
            fields: ['id_cart']
        },
        {
            name: 'idx_itemcart_product', // Búsquedas por producto
            fields: ['id_product']
        },
        {
            name: 'idx_itemcart_cart_product', // Evitar duplicados carrito-producto
            fields: ['id_cart', 'id_product'],
            unique: true // Un producto solo puede estar una vez por carrito
        }
    ]
});
export default ItemCart;
import { Model, DataTypes } from 'sequelize';
import sequelize from '../conection';
import cart from './cart';
import users from './user';
import DeliveryAddress from './deliveryAddress';
/**
 * Estructura de datos para transacciones
 * Define los campos necesarios para gestionar pagos y transacciones del sistema
 */
export interface TransactionAttributes {
    id_transaction?: number; // ID único de la transacción
    id_cart?: number | null; // Carrito asociado (null si es trueque)
    id_barter?: number | null; // Trueque asociado (null si es venta)
    id_user: number; // Usuario que realiza la transacción
    total_amount: number; // Monto total de la transacción
    status?: 'pendiente' | 'completada' | 'fallida' | 'reembolsada'; // Estado de la transacción
    reference_payu?: string; // Referencia de PayU
    payment_method?: string; // Método de pago utilizado
    transaction_date?: Date; // Fecha de la transacción
    currency?: string; // Moneda de la transacción
    payu_transaction_id?: string; // ID de transacción en PayU
    payu_order_id?: string; // ID de orden en PayU
    payu_state?: string; // Estado en PayU
    payu_response_code?: string; // Código de respuesta de PayU
    payu_response_message?: string; // Mensaje de respuesta de PayU
    delivery_address_id?: number | null; // Dirección de entrega
    buyer_email?: string; // Email del comprador
    buyer_name?: string; // Nombre del comprador
    buyer_phone?: string; // Teléfono del comprador
    confirmation_received?: boolean; // Si se recibió confirmación
    response_url?: string; // URL de respuesta
    signature?: string; // Firma de seguridad
}
/**
 * Modelo de Transacciones
 * Gestiona pagos, ventas y transacciones monetarias del sistema
 */
const Transaction = sequelize.define<Model<TransactionAttributes>>('transaction', {
    // Clave primaria
    id_transaction: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true // Se incrementa automáticamente
    },
    // Carrito asociado (opcional para trueques)
    id_cart: {
        type: DataTypes.INTEGER,
        allowNull: true, // Null cuando es transacción de trueque
        references: {
            model: cart, // Relaciona con modelo cart
            key: 'id_cart'
        }
    },
    // Trueque asociado (opcional para ventas)
    id_barter: {
        type: DataTypes.INTEGER,
        allowNull: true, // Null cuando es transacción de venta
        references: {
            model: 'barters', // Relaciona con tabla barters
            key: 'id_barter'
        },
        onUpdate: 'CASCADE', // Actualiza en cascada
        onDelete: 'SET NULL' // Establece null al eliminar
    },
    // Usuario que realiza la transacción
    id_user: {
        type: DataTypes.INTEGER,
        allowNull: false, // Campo obligatorio
        references: {
            model: users, // Relaciona con modelo users
            key: 'id'
        }
    },
    // Monto total con precisión decimal
    total_amount: {
        type: DataTypes.DECIMAL(10, 2), // Hasta 99,999,999.99
        allowNull: false // Campo obligatorio
    },
    // Estado de la transacción con valores predefinidos
    status: {
        type: DataTypes.ENUM('pendiente', 'completada', 'fallida', 'reembolsada'),
        defaultValue: 'pendiente' // Inicia como pendiente
    },
    // Referencia única de PayU
    reference_payu: {
        type: DataTypes.STRING(255), // Máximo 255 caracteres
        allowNull: true // Campo opcional
    },
    // Método de pago utilizado
    payment_method: {
        type: DataTypes.STRING(50), // Máximo 50 caracteres
        allowNull: true // Campo opcional
    },
    // Fecha de la transacción
    transaction_date: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW // Se asigna automáticamente
    },
    // Moneda de la transacción (Colombia por defecto)
    currency: {
        type: DataTypes.STRING(3), // Código ISO de 3 caracteres
        allowNull: true,
        defaultValue: 'COP' // Peso colombiano por defecto
    },
    // ID de transacción en PayU
    payu_transaction_id: {
        type: DataTypes.STRING(255), // Máximo 255 caracteres
        allowNull: true // Se llena con respuesta de PayU
    },
    // ID de orden en PayU
    payu_order_id: {
        type: DataTypes.STRING(255), // Máximo 255 caracteres
        allowNull: true // Se llena con respuesta de PayU
    },
    // Estado de la transacción en PayU
    payu_state: {
        type: DataTypes.STRING(50), // Máximo 50 caracteres
        allowNull: true // Estado devuelto por PayU
    }, 
    // Código de respuesta de PayU
    payu_response_code: {
        type: DataTypes.STRING(50), // Máximo 50 caracteres
        allowNull: true // Código de resultado
    },    
    // Mensaje de respuesta de PayU
    payu_response_message: {
        type: DataTypes.TEXT, // Texto largo para mensajes detallados
        allowNull: true // Mensaje explicativo de PayU
    },    
    // Dirección de entrega seleccionada
    delivery_address_id: {
        type: DataTypes.INTEGER,
        allowNull: true, // Opcional para algunos tipos de transacción
        references: {
            model: 'delivery_addresses', // Relaciona con tabla delivery_addresses
            key: 'id'
        }
    },  
    // Email del comprador
    buyer_email: {
        type: DataTypes.STRING(255), // Máximo 255 caracteres
        allowNull: true // Puede diferir del usuario registrado
    },
    // Nombre del comprador
    buyer_name: {
        type: DataTypes.STRING(255), // Máximo 255 caracteres
        allowNull: true // Puede diferir del usuario registrado
    },
    // Teléfono del comprador
    buyer_phone: {
        type: DataTypes.STRING(50), // Máximo 50 caracteres
        allowNull: true // Información de contacto adicional
    },
    // Control de confirmación recibida
    confirmation_received: {
        type: DataTypes.BOOLEAN,
        defaultValue: false // Por defecto no confirmada
    },
    // URL de respuesta personalizada
    response_url: {
        type: DataTypes.TEXT, // URL puede ser larga
        allowNull: true // Opcional para redirección
    },
    // Firma de seguridad para validación
    signature: {
        type: DataTypes.STRING(255), // Máximo 255 caracteres
        allowNull: true // Hash de validación
    }
}, {
    tableName: 'transactions', // Nombre explícito de la tabla
    timestamps: false, // No usar timestamps automáticos
    
    // Índices para optimización
    indexes: [
        {
            name: 'idx_transactions_user', // Búsquedas por usuario
            fields: ['id_user']
        },
        {
            name: 'idx_transactions_cart', // Búsquedas por carrito
            fields: ['id_cart']
        },
        {
            name: 'idx_transactions_barter', // Búsquedas por trueque
            fields: ['id_barter']
        },
        {
            name: 'idx_transactions_status', // Filtros por estado
            fields: ['status']
        },
        {
            name: 'idx_transactions_payu_ref', // Búsquedas por referencia PayU
            fields: ['reference_payu']
        },
        {
            name: 'idx_transactions_date', // Ordenamiento por fecha
            fields: ['transaction_date']
        }
    ]
});
// Asociación con dirección de entrega
Transaction.belongsTo(DeliveryAddress, {
    foreignKey: 'delivery_address_id', // Clave foránea
    as: 'deliveryAddress' // Alias para la relación
});

export default Transaction;
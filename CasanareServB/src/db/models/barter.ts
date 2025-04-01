    import { Model, DataTypes } from 'sequelize';
    import sequelize from '../conection';
    import products from './product';
    import users from './user';

    interface BarterAttributes {
        id_barter?: number;
        id_prod_offer: number;
        id_prod_request: number;
        id_user_offer: number;
        id_user_receiving: number;
        estado?: 'pendiente' | 'aceptado' | 'rechazado' | 'completado';
        valor?: number;
        fecha_solicitud?: Date;
        fecha_resolucion?: Date;
    }

    const barter = sequelize.define<Model<BarterAttributes>>('barters', {
        id_barter: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        id_prod_offer: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'products',
                key: 'id_product'  // Changed to match products table
            }
        },
        id_prod_request: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'products',
                key: 'id_product'  // Changed to match products table
            }
        },
        id_user_offer: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id'
            }
        },
        id_user_receiving: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id'
            }
        },
        estado: {
            type: DataTypes.ENUM('pendiente', 'aceptado', 'rechazado', 'completado'),
            defaultValue: 'pendiente'
        },
        valor: {
            type: DataTypes.DECIMAL(10,2),
            allowNull: true
        },
        fecha_solicitud: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        },
        fecha_resolucion: {
            type: DataTypes.DATE,
            allowNull: true
        }
    }, {
        tableName: 'barters',  // Changed to plural to match migration
        timestamps: true
    });

    // Associations
    barter.belongsTo(products, {
        foreignKey: 'id_prod_offer',
        as: 'id_prod_offer'
    });

    barter.belongsTo(products, {
        foreignKey: 'id_prod_request',
        as: 'pid_prod_request'
    });

    barter.belongsTo(users, {
        foreignKey: 'id_user_offer',
        as: 'id_user_offer'
    });

    barter.belongsTo(users, {
        foreignKey: 'id_user_receiving',
        as: 'id_user_receiving'
    });

    export default barter;
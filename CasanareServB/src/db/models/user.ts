// archivo: models/User.ts
import sequelize from "../conection";
import { DataTypes, Model } from "sequelize";

interface UserAttributes {
    id?: number;
    name: string;
    email: string;
    password: string;
    rol?: string;  // Opcional si tiene defaultValue
    estado?: boolean;  // Opcional si tiene defaultValue
}

const User = sequelize.define<Model<UserAttributes>>('users', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    rol: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'usuario'
    },
    estado: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    }
});

export default User;
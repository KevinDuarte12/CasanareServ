// Importamos los tipos necesarios de express para el tipado TypeScript
import { Response, Request } from "express";

// Importamos bcrypt para el manejo seguro de contraseñas (hash y comparación)
import bcrypt from "bcrypt";

// Importamos nuestro modelo de Usuario para interactuar con la base de datos
import User from "../db/models/user";

// Importamos jwt para generar tokens de autenticación
import jwt from "jsonwebtoken";
import { Model } from "sequelize";
export interface UserAttributes {
    id?: number;
    name: string;  // cambiado de username a name para coincidir con el modelo
    password: string;
    email: string;
    rol?: string;
    estado?: boolean;
}
// Controlador para crear nuevos usuarios
export const newUser = async (req: Request, res: Response) => {
    try {
        const { name, password, email } = req.body;  // cambiado username por name
        
        // Hash de la contraseña
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const user = await User.create({
            name,        // agregado el campo name
            password: hashedPassword,
            email
        });

        // Convertimos el objeto Sequelize a un objeto plano
        const userJson = user.toJSON() as UserAttributes;

        res.status(201).json({
            msg: 'Usuario creado exitosamente',
            user: {
                id: userJson.id,
                name: userJson.name,
                email: userJson.email,
                password: userJson.password
            }
        });
    } catch (error) {
        console.error('Error al crear usuario:', error);
        res.status(400).json({
            msg: 'Error al crear el usuario',
            error
        });
    }
};

// Controlador para el login de usuarios
export const login = async (req: Request, res: Response) => {
    console.log('Datos recibidos:', req.body); // 👈 Verifica qué llega
    const { email, password } = req.body;  // cambiado de name a email

    try {
        const user = await User.findOne({ 
            where: { email }  // buscar por email en lugar de name
        }) as Model<UserAttributes>;

        if (!user) {
            return res.status(400).json({
                msg: `No existe un usuario con el email ${email}`
            });
        }

        const userJson = user.toJSON() as UserAttributes;
        const passwordValid = await bcrypt.compare(password, userJson.password);

        if (!passwordValid) {
            return res.status(400).json({
                msg: "Contraseña incorrecta"
            });
        }

        const token = jwt.sign({ 
            id: userJson.id,
            name: userJson.name,  // cambiado de username a name
            email: userJson.email
        }, process.env.SECRET_KEY || 'hola123', {
            expiresIn: '24h'
        });

        res.json({ 
            msg: 'Login exitoso',
            token,
            user: {
                id: userJson.id,
                name: userJson.name,  // cambiado de username a name
                email: userJson.email,
                rol: userJson.rol
            }
        });
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({
            msg: 'Error en el login',
            error
        });
    }
};
export const getUsers = async (req: Request, res: Response) => {
    try {
        const users = await User.findAll({
            attributes: ['id', 'name', 'email']  // cambiado username por name
        });
        
        console.log('Usuarios encontrados:', users);
        res.json(users);
    } catch (error) {
        console.error('Error al obtener usuarios:', error);
        res.status(500).json({
            msg: 'Error al obtener usuarios',
            error
        });
    }
};
// Controlador para actualizar un usuario existente
export const updateUser = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, email, password } = req.body;  // cambiado username por name

        const user = await User.findByPk(id) as Model<UserAttributes>;

        if (!user) {
            return res.status(404).json({
                msg: `Usuario con ID ${id} no encontrado`
            });
        }

        const updateData: Partial<UserAttributes> = {};
        if (name) updateData.name = name;  // cambiado username por name
        if (email) updateData.email = email;
        if (password) {
            updateData.password = await bcrypt.hash(password, 10);
        }

        await user.update(updateData);

        const userJson = user.toJSON() as UserAttributes;

        res.status(200).json({
            msg: 'Usuario actualizado exitosamente',
            user: {
                id: userJson.id,
                name: userJson.name,  // cambiado username por name
                email: userJson.email
            }
        });
    } catch (error) {
        console.error('Error al actualizar usuario:', error);
        res.status(500).json({
            msg: 'Error al actualizar el usuario',
            error
        });
    }
};
// Controlador para eliminar un usuario existente
export const deleteUser = async (req: Request, res: Response) => {
    try {
        const { id } = req.params; // Obtener el ID del usuario desde los parámetros de la URL

        // Buscar el usuario por ID
        const user = await User.findByPk(id);

        // Si el usuario no existe, devolver un error
        if (!user) {
            return res.status(404).json({
                msg: `Usuario con ID ${id} no encontrado`
            });
        }

        // Eliminar el usuario de la base de datos
        await user.destroy();

        // Devolver la respuesta de éxito
        res.status(200).json({
            msg: 'Usuario eliminado exitosamente'
        });
    } catch (error) {
        console.error('Error al eliminar usuario:', error);
        res.status(500).json({
            msg: 'Error al eliminar el usuario',
            error
        });
    }
};
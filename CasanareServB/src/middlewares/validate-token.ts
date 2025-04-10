import { Request, Response, NextFunction } from 'express'; // Importa los tipos de Express
import jwt from 'jsonwebtoken'; // Importa jwt para verificar tokens
import User from '../db/models/user'; // Importa el modelo de usuario

// Extender el tipo Request para incluir el usuario
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

// Middleware para validar el token JWT
const validateToken = async (req: Request, res: Response, next: NextFunction) => {
    // Obtiene el token del encabezado de la solicitud
    const headerToken = req.headers['authorization'];

    // Verifica si el token existe y comienza con 'Bearer '
    if (headerToken != undefined && headerToken.startsWith('Bearer ')) {
        try {
            // Extrae el token sin el prefijo 'Bearer '
            const bearerToken = headerToken.slice(7);

            // Verifica si el token es válido y obtiene el payload
            const decoded = jwt.verify(bearerToken, process.env.SECRET_KEY || "hola123") as any;
            
            // Extraer el ID del usuario del token
            const userId = decoded.id || decoded.uid;
            
            // Buscar el usuario en la base de datos
            const user = await User.findByPk(userId);
            
            // Verificar si el usuario existe
            if (!user) {
                return res.status(401).json({
                    msg: 'Token válido pero el usuario no existe en la base de datos'
                });
            }
            
            // Verificar si el usuario está activo
            if (user.get('status') === false) {
                return res.status(401).json({
                    msg: 'Usuario desactivado - acceso denegado'
                });
            }
            
            // Añadir el usuario al objeto req para que esté disponible en middlewares siguientes
            req.user = user.toJSON();
            
            // Si todo está bien, pasar al siguiente middleware
            next();
        } catch (error) {
            console.error('Error al validar token:', error);
            // Si el token no es válido, devuelve un error 401
            res.status(401).json({
                msg: 'Token no válido'
            });
        }
    } else {
        // Si no hay token o no tiene el formato correcto, devuelve un error 401
        res.status(401).json({
            msg: "Acceso denegado - token requerido"
        });
    }
};

// Exporta el middleware para su uso en otras partes de la aplicación
export default validateToken;
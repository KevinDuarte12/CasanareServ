import { Request, Response, NextFunction } from 'express'; // Importa los tipos de Express para manejar solicitudes, respuestas y el siguiente middleware
import jwt from 'jsonwebtoken'; // Importa jwt para verificar tokens

// Middleware para validar el token JWT
const validarToken = (req: Request, res: Response, next: NextFunction) => {
    // Obtiene el token del encabezado de la solicitud
    const headerToken = req.headers['authorization'];

    // Verifica si el token existe y comienza con 'Bearer '
    if (headerToken != undefined && headerToken.startsWith('Bearer ')) {
        try {
            // Extrae el token sin el prefijo 'Bearer '
            const bearerToken = headerToken.slice(7);

            // Verifica si el token es válido usando la clave secreta
            jwt.verify(bearerToken, process.env.SECRET_KEY || "hola123");

            // Si el token es válido, pasa al siguiente middleware o controlador
            next();
        } catch (error) {
            // Si el token no es válido, devuelve un error 401
            res.status(401).json({
                msg: 'token no valido'
            });
        }
    } else {
        // Si no hay token o no tiene el formato correcto, devuelve un error 401
        res.status(401).json({
            msg: "Acceso denegado"
        });
    }
};

// Exporta el middleware para su uso en otras partes de la aplicación
export default validarToken;
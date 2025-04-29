import { Request, Response, NextFunction } from 'express'; // Importa los tipos de Express
import jwt from 'jsonwebtoken'; // Importa jwt para verificar tokens
import User from '../db/models/user'; // Importa el modelo de usuario

// Extender el tipo Request para incluir el usuario
declare global {
  namespace Express {
    interface Request {
      user?: any;
      userId?: number;
    }
  }
}

// Middleware para validar el token JWT
const validateToken = async (req: Request, res: Response, next: NextFunction) => {
    // Lista de rutas públicas que no requieren autenticación
    const publicRoutes = [
        '/login',
        '/register',
        '/verify', // Agregar aquí la ruta de verificación
        '/forgot-password',
        '/reset-password'
    ];

    // Verificar si la URL actual es una ruta pública 
    const currentPath = req.path;
    console.log('🔍 Validando acceso a ruta:', currentPath);
    
    if (publicRoutes.some(route => currentPath.endsWith(route)) || 
        (currentPath.includes('/verify') && req.query.token)) {
        console.log('🔓 Ruta pública, acceso permitido sin token');
        return next();
    }
    
    // Obtiene el token del encabezado de la solicitud
    const headerToken = req.headers['authorization'];
    console.log('🔑 Headers recibidos:', req.headers);

    // Verifica si el token existe y comienza con 'Bearer '
    if (headerToken != undefined && headerToken.startsWith('Bearer ')) {
        try {
            // Extrae el token sin el prefijo 'Bearer '
            const bearerToken = headerToken.slice(7);
            console.log('🔑 Token a verificar:', bearerToken.substring(0, 15) + '...');

            // Verifica si el token es válido y obtiene el payload
            const decoded = jwt.verify(bearerToken, process.env.SECRET_KEY || "hola123") as any;
            
            // Extraer el ID del usuario del token
            const userId = decoded.id || decoded.uid;
            console.log('👤 ID de usuario extraído del token:', userId);
            
            // Buscar el usuario en la base de datos
            const user = await User.findByPk(userId);
            
            // Verificar si el usuario existe
            if (!user) {
                console.log('❌ Usuario no encontrado en la base de datos');
                return res.status(401).json({
                    msg: 'Token válido pero el usuario no existe en la base de datos',
                    code: 'USER_NOT_FOUND'
                });
            }
            
            // Verificar si el usuario está activo - CORRECCIÓN: usar 'estado' en vez de 'status'
            if (user.get('estado') === false) {
                console.log('❌ Usuario desactivado');
                return res.status(401).json({
                    msg: 'Usuario desactivado - acceso denegado',
                    code: 'USER_DISABLED'
                });
            }
            
            // IMPORTANTE: Guardar la información del usuario en req
            req.userId = userId;
            req.user = {
                id: userId,
                email: decoded.email || user.get('email'),
                name: decoded.name || user.get('name'),
                rol: decoded.rol || user.get('rol')
            };
            
            console.log('✅ Token verificado correctamente para usuario:', req.user.email);
            console.log('✅ Rol del usuario:', req.user.rol);
            
            // Si todo está bien, pasar al siguiente middleware
            next();
        } catch (error) {
            console.error('❌ Error al validar token:', error);
            // Si el token no es válido, devuelve un error 401
            res.status(401).json({
                msg: 'Token no válido',
                code: 'INVALID_TOKEN'
            });
        }
    } else {
        // Si no hay token o no tiene el formato correcto, devuelve un error 401
        console.log('❌ Token no proporcionado o formato incorrecto');
        res.status(401).json({
            msg: "Acceso denegado - token requerido",
            code: 'TOKEN_REQUIRED'
        });
    }
};

// Exporta el middleware para su uso en otras partes de la aplicación
export default validateToken;
/**
 * 🔐 MIDDLEWARE DE AUTORIZACIÓN Y CONTROL DE ROLES
 * Valida permisos de administrador y roles específicos para rutas protegidas
 */

// Extensión del namespace Express para tipado de usuario autenticado
declare namespace Express {
    export interface Request {
        user?: {
            id: number; // ID único del usuario
            name: string; // Nombre completo
            email: string; // Email de autenticación
            rol: string; // Rol del usuario ('admin', 'vendedor', 'usuario')
            // otros campos relevantes
        };
    }
}

import { Request, Response, NextFunction } from 'express';

/**
 * Middleware para verificar si el usuario es administrador
 * Debe usarse después del middleware de autenticación JWT
 * @param req - Request con usuario autenticado
 * @param res - Response para enviar errores
 * @param next - Función para continuar al siguiente middleware
 */
export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
    // Verificar que exista el usuario en el request (token validado previamente)
    if (!req.user) {
        return res.status(500).json({
            msg: 'Se quiere verificar el rol sin validar el token primero'
        });
    }
    
    // Extraer el rol del usuario autenticado
    const { rol } = req.user;
    
    // Si el rol no es admin, rechazar el acceso con log de seguridad
    if (rol !== 'admin') {
        console.log(`⚠️ Acceso denegado: Usuario ${req.user.id} (${req.user.email}) intentó acceder a ruta administrativa`);
        return res.status(403).json({
            msg: 'Acceso denegado - se requiere rol de administrador'
        });
    }
    
    // Log de acceso administrativo exitoso
    console.log(`✅ Acceso admin concedido: Usuario ${req.user.id} (${req.user.email})`);
    
    // Si el usuario es admin, continuar al siguiente middleware/controlador
    next();
};

/**
 * Middleware para verificar si el usuario tiene alguno de los roles especificados
 * Permite crear validaciones flexibles para múltiples roles
 * @param roles - Array de roles permitidos para la ruta
 * @returns Función middleware configurada
 * 
 * Ejemplo de uso:
 * router.get('/ruta', hasRole('admin', 'vendedor'), controlador)
 */
export const hasRole = (...roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        // Verificar que exista el usuario en el request (token validado previamente)
        if (!req.user) {
            return res.status(500).json({
                msg: 'Se quiere verificar el rol sin validar el token primero'
            });
        }
        
        // Verificar si el rol del usuario está dentro de los roles permitidos
        if (!roles.includes(req.user.rol)) {
            return res.status(403).json({
                msg: `El servicio requiere uno de estos roles: ${roles.join(', ')}`
            });
        }
        
        // Si el rol es válido, continuar al siguiente middleware/controlador
        next();
    };
};
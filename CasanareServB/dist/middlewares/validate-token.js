"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken")); // Importa jwt para verificar tokens
const user_1 = __importDefault(require("../db/models/user")); // Importa el modelo de usuario
/**
 * Middleware para validar el token JWT y autenticar usuarios
 * Permite el acceso a rutas públicas sin token y valida tokens para rutas privadas
 * @param req - Request que puede contener token de autorización
 * @param res - Response para enviar errores de autenticación
 * @param next - Función para continuar al siguiente middleware
 */
const validateToken = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    // Lista de rutas públicas que no requieren autenticación
    const publicRoutes = [
        '/login', // Inicio de sesión
        '/register', // Registro de usuarios
        '/verify', // Verificación de email
        '/forgot-password', // Solicitud de recuperación
        '/reset-password' // Restablecimiento de contraseña
    ];
    // Verificar si la URL actual es una ruta pública 
    const currentPath = req.path;
    console.log('🔍 Validando acceso a ruta:', currentPath);
    // Permitir acceso sin token a rutas públicas y verificación con query parameter
    if (publicRoutes.some(route => currentPath.endsWith(route)) ||
        (currentPath.includes('/verify') && req.query.token)) {
        console.log('🔓 Ruta pública, acceso permitido sin token');
        return next(); // Continuar sin validar token
    }
    // Obtener el token del encabezado Authorization
    const headerToken = req.headers['authorization'];
    console.log('🔑 Headers recibidos:', req.headers);
    // Verificar si el token existe y tiene el formato Bearer correcto
    if (headerToken != undefined && headerToken.startsWith('Bearer ')) {
        try {
            // Extraer el token sin el prefijo 'Bearer '
            const bearerToken = headerToken.slice(7);
            console.log('🔑 Token a verificar:', bearerToken.substring(0, 15) + '...');
            // Verificar si el token es válido y decodificar el payload
            const decoded = jsonwebtoken_1.default.verify(bearerToken, process.env.SECRET_KEY || "hola123");
            // Extraer el ID del usuario del token (compatibilidad con diferentes formatos)
            const userId = decoded.id || decoded.uid;
            console.log('👤 ID de usuario extraído del token:', userId);
            // Buscar el usuario en la base de datos para validar existencia
            const user = yield user_1.default.findByPk(userId);
            // Verificar si el usuario existe en la base de datos
            if (!user) {
                console.log('❌ Usuario no encontrado en la base de datos');
                return res.status(401).json({
                    msg: 'Token válido pero el usuario no existe en la base de datos',
                    code: 'USER_NOT_FOUND'
                });
            }
            // Verificar si el usuario está activo (campo 'estado')
            if (user.get('estado') === false) {
                console.log('❌ Usuario desactivado');
                return res.status(401).json({
                    msg: 'Usuario desactivado - acceso denegado',
                    code: 'USER_DISABLED'
                });
            }
            // Guardar la información del usuario en el request para uso posterior
            req.userId = userId; // ID numérico del usuario
            req.user = {
                id: userId,
                email: decoded.email || user.get('email'), // Email del token o base de datos
                name: decoded.name || user.get('name'), // Nombre del token o base de datos
                rol: decoded.rol || user.get('rol') // Rol del token o base de datos
            };
            console.log('✅ Token verificado correctamente para usuario:', req.user.email);
            console.log('✅ Rol del usuario:', req.user.rol);
            // Si todo está correcto, continuar al siguiente middleware/controlador
            next();
        }
        catch (error) {
            console.error('❌ Error al validar token:', error);
            // Token malformado, expirado o inválido
            res.status(401).json({
                msg: 'Token no válido',
                code: 'INVALID_TOKEN'
            });
        }
    }
    else {
        // No hay token o no tiene el formato Bearer correcto
        console.log('❌ Token no proporcionado o formato incorrecto');
        res.status(401).json({
            msg: "Acceso denegado - token requerido",
            code: 'TOKEN_REQUIRED'
        });
    }
});
// Exportar el middleware para uso en rutas protegidas
exports.default = validateToken;

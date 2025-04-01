"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken")); // Importa jwt para verificar tokens
// Middleware para validar el token JWT
const validarToken = (req, res, next) => {
    // Obtiene el token del encabezado de la solicitud
    const headerToken = req.headers['authorization'];
    // Verifica si el token existe y comienza con 'Bearer '
    if (headerToken != undefined && headerToken.startsWith('Bearer ')) {
        try {
            // Extrae el token sin el prefijo 'Bearer '
            const bearerToken = headerToken.slice(7);
            // Verifica si el token es válido usando la clave secreta
            jsonwebtoken_1.default.verify(bearerToken, process.env.SECRET_KEY || "hola123");
            // Si el token es válido, pasa al siguiente middleware o controlador
            next();
        }
        catch (error) {
            // Si el token no es válido, devuelve un error 401
            res.status(401).json({
                msg: 'token no valido'
            });
        }
    }
    else {
        // Si no hay token o no tiene el formato correcto, devuelve un error 401
        res.status(401).json({
            msg: "Acceso denegado"
        });
    }
};
// Exporta el middleware para su uso en otras partes de la aplicación
exports.default = validarToken;

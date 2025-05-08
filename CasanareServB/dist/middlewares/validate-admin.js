"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasRole = exports.isAdmin = void 0;
// Middleware para verificar si el usuario es administrador
const isAdmin = (req, res, next) => {
    // Verificar que exista el usuario en el request
    if (!req.user) {
        return res.status(500).json({
            msg: 'Se quiere verificar el rol sin validar el token primero'
        });
    }
    // Verificar el rol del usuario
    const { rol } = req.user;
    // Si el rol no es admin, rechazar el acceso
    if (rol !== 'admin') {
        console.log(`⚠️ Acceso denegado: Usuario ${req.user.id} (${req.user.email}) intentó acceder a ruta administrativa`);
        return res.status(403).json({
            msg: 'Acceso denegado - se requiere rol de administrador'
        });
    }
    console.log(`✅ Acceso admin concedido: Usuario ${req.user.id} (${req.user.email})`);
    // Si el usuario es admin, continuar
    next();
};
exports.isAdmin = isAdmin;
// Middleware para verificar si el usuario tiene alguno de los roles especificados
const hasRole = (...roles) => {
    return (req, res, next) => {
        // Verificar que exista el usuario en el request
        if (!req.user) {
            return res.status(500).json({
                msg: 'Se quiere verificar el rol sin validar el token primero'
            });
        }
        // Verificar si el rol del usuario está dentro de los permitidos
        if (!roles.includes(req.user.rol)) {
            return res.status(403).json({
                msg: `El servicio requiere uno de estos roles: ${roles.join(', ')}`
            });
        }
        // Si el rol es válido, continuar
        next();
    };
};
exports.hasRole = hasRole;

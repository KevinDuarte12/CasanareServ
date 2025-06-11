"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateFields = void 0;
const express_validator_1 = require("express-validator");
/**
 * 🔍 MIDDLEWARE DE VALIDACIÓN DE CAMPOS
 * Valida los datos de entrada usando express-validator y maneja errores
 */
/**
 * Middleware para validar los campos de la petición usando express-validator
 * Debe usarse después de los middlewares de validación específicos (check, body, param)
 * @param req - Request con datos a validar
 * @param res - Response para enviar errores de validación
 * @param next - Función para continuar al siguiente middleware
 *
 * Ejemplo de uso:
 * router.post('/users', [
 *   check('email', 'Email inválido').isEmail(),
 *   check('password', 'Password debe tener al menos 6 caracteres').isLength({ min: 6 }),
 *   validateFields // ← Este middleware valida los errores
 * ], createUser);
 */
const validateFields = (req, res, next) => {
    // Extraer errores de validación recopilados por express-validator
    const errors = (0, express_validator_1.validationResult)(req);
    // Si existen errores de validación, devolver respuesta con detalles
    if (!errors.isEmpty()) {
        return res.status(400).json({
            errors: errors.mapped() // Retorna objeto con campos y mensajes de error
        });
    }
    // Si no hay errores, continuar al siguiente middleware/controlador
    next();
};
exports.validateFields = validateFields;

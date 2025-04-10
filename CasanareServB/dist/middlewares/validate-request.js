"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateFields = void 0;
const express_validator_1 = require("express-validator");
// Middleware para validar los campos de la petición usando express-validator
const validateFields = (req, res, next) => {
    // Verificar si hay errores de validación
    const errors = (0, express_validator_1.validationResult)(req);
    // Si hay errores, devolver respuesta con los errores
    if (!errors.isEmpty()) {
        return res.status(400).json({
            errors: errors.mapped()
        });
    }
    // Si no hay errores, continuar
    next();
};
exports.validateFields = validateFields;

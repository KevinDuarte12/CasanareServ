import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';

// Middleware para validar los campos de la petición usando express-validator
export const validateFields = (req: Request, res: Response, next: NextFunction) => {
    // Verificar si hay errores de validación
    const errors = validationResult(req);
    
    // Si hay errores, devolver respuesta con los errores
    if (!errors.isEmpty()) {
        return res.status(400).json({
            errors: errors.mapped()
        });
    }
    
    // Si no hay errores, continuar
    next();
};
import { Router } from 'express';
import { check } from 'express-validator';
import { validateFields } from '../middlewares/validate-request'; 
import validateToken from '../middlewares/validate-token';
import { isAdmin } from '../middlewares/validate-admin';
import { 
  getCategories, 
  getCategoryById, 
  createCategory, 
  updateCategory, 
  deleteCategory,
  toggleCategoryStatus
} from '../controllers/category.controller';
import { RequestHandler } from 'express';
/**
 * 🏷️ RUTAS DE CATEGORÍAS
 * Gestiona todas las operaciones CRUD de categorías del sistema
 * Incluye rutas públicas para consulta y rutas administrativas para gestión
 */
const router = Router();
// 📋 RUTAS PÚBLICAS (sin autenticación)
// Obtener todas las categorías disponibles
router.get('/', getCategories as RequestHandler);
// Obtener categoría específica por ID
router.get('/:id', [
  check('id', 'El ID debe ser un número válido').isNumeric(), // Validar formato del ID
  validateFields as RequestHandler // Verificar errores de validación
], getCategoryById as RequestHandler);

// 👑 RUTAS ADMINISTRATIVAS (requieren autenticación y rol admin)
// Crear nueva categoría
router.post('/', [
  validateToken as RequestHandler,  // Usuario autenticado
  isAdmin as RequestHandler,        // Solo administradores
  check('name', 'El nombre es obligatorio').notEmpty(), // Nombre requerido
  check('name', 'El nombre debe tener entre 3 y 50 caracteres').isLength({ min: 3, max: 50 }), // Longitud válida
  validateFields as RequestHandler  // Verificar errores de validación
], createCategory as RequestHandler);
// Actualizar categoría existente
router.put('/:id', [
  validateToken as RequestHandler,  // Usuario autenticado
  isAdmin as RequestHandler,        // Solo administradores
  check('id', 'El ID debe ser un número válido').isNumeric(), // ID válido
  check('name', 'El nombre debe tener entre 3 y 50 caracteres').optional().isLength({ min: 3, max: 50 }), // Nombre opcional pero válido
  validateFields as RequestHandler  // Verificar errores de validación
], updateCategory as RequestHandler);

// Eliminar categoría (borrado lógico o físico)
router.delete('/:id', [
  validateToken as RequestHandler,  // Usuario autenticado
  isAdmin as RequestHandler,        // Solo administradores
  check('id', 'El ID debe ser un número válido').isNumeric(), // ID válido
  validateFields as RequestHandler  // Verificar errores de validación
], deleteCategory as RequestHandler);
// Alternar estado activo/inactivo de categoría
router.patch('/:id/toggle-status', [
  validateToken as RequestHandler,  // Usuario autenticado
  isAdmin as RequestHandler,        // Solo administradores
  check('id', 'El ID debe ser un número válido').isNumeric(), // ID válido
  validateFields as RequestHandler  // Verificar errores de validación
], toggleCategoryStatus as RequestHandler);
export default router;
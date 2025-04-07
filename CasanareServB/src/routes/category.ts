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
import { RequestHandler } from 'express'; // Importante añadir este import

const router = Router();

// Rutas públicas
router.get('/', getCategories as RequestHandler);
router.get('/:id', [
  check('id', 'El ID debe ser un número válido').isNumeric(),
  validateFields as RequestHandler
], getCategoryById as RequestHandler);

// Rutas protegidas
router.post('/', [
  validateToken as RequestHandler, 
  isAdmin as RequestHandler,
  check('name', 'El nombre es obligatorio').notEmpty(),
  check('name', 'El nombre debe tener entre 3 y 50 caracteres').isLength({ min: 3, max: 50 }),
  validateFields as RequestHandler
], createCategory as RequestHandler);

router.put('/:id', [
  validateToken as RequestHandler, 
  isAdmin as RequestHandler,
  check('id', 'El ID debe ser un número válido').isNumeric(),
  check('name', 'El nombre debe tener entre 3 y 50 caracteres').optional().isLength({ min: 3, max: 50 }),
  validateFields as RequestHandler
], updateCategory as RequestHandler);

router.delete('/:id', [
  validateToken as RequestHandler, 
  isAdmin as RequestHandler,
  check('id', 'El ID debe ser un número válido').isNumeric(),
  validateFields as RequestHandler
], deleteCategory as RequestHandler);

router.patch('/:id/toggle-status', [
  validateToken as RequestHandler, 
  isAdmin as RequestHandler,
  check('id', 'El ID debe ser un número válido').isNumeric(),
  validateFields as RequestHandler
], toggleCategoryStatus as RequestHandler);

export default router;
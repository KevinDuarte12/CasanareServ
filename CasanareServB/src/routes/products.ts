import { Router } from 'express';
import { check } from 'express-validator';
import { validateFields } from '../middlewares/validate-request';
import validateToken from '../middlewares/validate-token';
import { isAdmin } from '../middlewares/validate-admin';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleProductStatus
} from '../controllers/product.controller';
import { RequestHandler } from 'express';

const router = Router();

// Rutas públicas
router.get('/', getProducts as RequestHandler);
router.get('/:id', [
  check('id', 'El ID debe ser un número válido').isNumeric(),
  validateFields as RequestHandler
], getProductById as RequestHandler);

// Rutas protegidas
router.post('/', [
  validateToken as RequestHandler,
  check('id_user', 'El ID de usuario es obligatorio').notEmpty(),
  check('id_category', 'El ID de categoría es obligatorio').notEmpty(),
  check('name', 'El nombre del producto es obligatorio').notEmpty(),
  check('price', 'El precio es obligatorio').notEmpty(),
  check('price', 'El precio debe ser un número').isNumeric(),
  validateFields as RequestHandler
], createProduct as RequestHandler);

router.put('/:id', [
  validateToken as RequestHandler,
  check('id', 'El ID debe ser un número válido').isNumeric(),
  validateFields as RequestHandler
], updateProduct as RequestHandler);

router.delete('/:id', [
  validateToken as RequestHandler,
  check('id', 'El ID debe ser un número válido').isNumeric(),
  validateFields as RequestHandler
], deleteProduct as RequestHandler);

router.patch('/:id/status', [
  validateToken as RequestHandler,
  check('id', 'El ID debe ser un número válido').isNumeric(),
  check('newStatus', 'El nuevo status es obligatorio').notEmpty(),
  validateFields as RequestHandler
], toggleProductStatus as RequestHandler);

export default router;
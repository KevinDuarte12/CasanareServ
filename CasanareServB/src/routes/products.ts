import { Router } from 'express';
import { check } from 'express-validator';
import { validateFields } from '../middlewares/validate-request';
import validateToken from '../middlewares/validate-token';
import { isAdmin } from '../middlewares/validate-admin';
import * as productController from '../controllers/product.controller';

import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleProductStatus, 
  getRecentProducts,
  getPaginatedProducts,
  getProductsByUser,     
  getAvailableProducts
} from '../controllers/product.controller';
import { RequestHandler } from 'express';
/**
 * 📦 RUTAS DE PRODUCTOS
 * Sistema completo de gestión de productos del marketplace
 * Incluye consultas públicas, filtros avanzados y operaciones CRUD protegidas
 */
const router = Router();
//📋 RUTAS PÚBLICAS (sin autenticación)
// Obtener productos recientes (últimos agregados)
router.get('/recent', getRecentProducts);
// Obtener productos con paginación (para listados grandes)
router.get('/paginated', getPaginatedProducts);
// Obtener todos los productos
router.get('/', getProducts as RequestHandler);
// Obtener producto específico por ID
router.get('/:id', [
  check('id', 'El ID debe ser un número válido').isNumeric(), // Validar formato ID
  validateFields as RequestHandler // Verificar errores de validación
], getProductById as RequestHandler);

// 🏷️ RUTAS DE FILTRADO POR CATEGORÍA
// Obtener productos de una categoría específica
router.get('/category/:categoryId', productController.getProductsByCategory as RequestHandler);
// 👤 RUTAS DE CONSULTA POR USUARIO
// Obtener productos de un usuario específico
router.get('/user/:userId', [
  check('userId', 'El ID del usuario debe ser un número válido').isNumeric(), // Validar ID usuario
  validateFields as RequestHandler // Verificar errores
], productController.getProductsByUser as RequestHandler);

// 🔍 RUTAS DE FILTRADO POR DISPONIBILIDAD
// Obtener solo productos disponibles (activos y en stock)
router.get('/available', productController.getAvailableProducts as RequestHandler);

// 🔐 RUTAS PROTEGIDAS (requieren autenticación)
// Crear nuevo producto
router.post('/', [
  validateToken as RequestHandler, // Usuario autenticado
  check('id_user', 'El ID de usuario es obligatorio').notEmpty(), // Usuario propietario
  check('id_category', 'El ID de categoría es obligatorio').notEmpty(), // Categoría requerida
  check('name', 'El nombre del producto es obligatorio').notEmpty(), // Nombre obligatorio
  check('price', 'El precio es obligatorio').notEmpty(), // Precio requerido
  check('price', 'El precio debe ser un número').isNumeric(), // Formato numérico
  validateFields as RequestHandler // Validar todos los campos
], createProduct as RequestHandler);
// Actualizar producto existente
router.put('/:id', [
  validateToken as RequestHandler, // Usuario autenticado
  check('id', 'El ID debe ser un número válido').isNumeric(), // ID válido
  validateFields as RequestHandler // Verificar errores
], updateProduct as RequestHandler);
// Eliminar producto (borrado lógico o físico)
router.delete('/:id', [
  validateToken as RequestHandler, // Usuario autenticado
  check('id', 'El ID debe ser un número válido').isNumeric(), // ID válido
  validateFields as RequestHandler // Verificar errores
], deleteProduct as RequestHandler);
// Cambiar estado del producto (activo/inactivo)
router.patch('/:id/status', [
  validateToken as RequestHandler, // Usuario autenticado
  check('id', 'El ID debe ser un número válido').isNumeric(), // ID válido
  check('newStatus', 'El nuevo status es obligatorio').notEmpty(), // Estado requerido
  validateFields as RequestHandler // Validar campos
], toggleProductStatus as RequestHandler);

export default router;
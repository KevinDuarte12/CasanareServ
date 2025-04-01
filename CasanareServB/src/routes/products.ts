import { Router } from 'express';
import validarToken from './validate-token';
import { 
    getProduct, 
    getProductById,
    createProduct, 
    updateProduct, 
    deleteProduct 
} from '../controllers/product.controller';

const router = Router();

// Rutas GET
router.get('/',  getProduct);           // Obtener todos los productos validarToken,
router.get('/:id', validarToken, getProductById);    // Obtener un producto por ID

// Ruta POST
router.post('/',  createProduct);       // Crear nuevo producto validarToken,

// Ruta PUT
router.put('/:id', validarToken, updateProduct);     // Actualizar producto

// Ruta DELETE
router.delete('/:id', validarToken, deleteProduct);  // Eliminar producto

export default router;
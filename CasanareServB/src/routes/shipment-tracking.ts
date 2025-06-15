import { Router, RequestHandler, Request, Response, NextFunction } from 'express';
import {
  getShipmentByTransaction,
  getShipmentByBarter,
  updateTrackingNumber
} from '../controllers/shipment-tracking.controller';
import validateToken from '../middlewares/validate-token';

/**
 * 📦 RUTAS DE SEGUIMIENTO DE ENVÍOS
 * Sistema de tracking para transacciones y trueques
 * Permite rastrear el estado de envíos y actualizar números de guía
 */

const router = Router();
// 🔍 RUTAS DE CONSULTA DE ENVÍOS
// Obtener información de envío por transacción
router.get('/transaction/:transactionId', 
  validateToken as RequestHandler,     // Usuario autenticado requerido
  getShipmentByTransaction as RequestHandler // Datos de envío por transacción
);

// Obtener información de envío por trueque
router.get('/barter/:barterId/:userId', 
  validateToken as RequestHandler,     // Usuario autenticado requerido
  getShipmentByBarter as RequestHandler // Datos de envío por trueque específico
);

// 📝 RUTAS DE ACTUALIZACIÓN

// Actualizar número de guía (solo admin)
router.put('/update-tracking', 
  validateToken as RequestHandler,     // Autenticación requerida
  updateTrackingNumber as RequestHandler // Actualizar guía de seguimiento
);

export default router;
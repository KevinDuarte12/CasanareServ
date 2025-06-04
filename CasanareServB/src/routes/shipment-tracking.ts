import { Router, RequestHandler, Request, Response, NextFunction } from 'express';
import {
  getShipmentByTransaction,
  getShipmentByBarter,
  updateTrackingNumber
} from '../controllers/shipment-tracking.controller';
import validateToken from '../middlewares/validate-token';

const router = Router();

// Obtener información de envío por transacción
router.get('/transaction/:transactionId', validateToken as RequestHandler, getShipmentByTransaction as RequestHandler);

// Obtener información de envío por trueque
router.get('/barter/:barterId/:userId', validateToken as RequestHandler, getShipmentByBarter as RequestHandler);

// Actualizar número de guía (solo admin)
router.put('/update-tracking', validateToken as RequestHandler, updateTrackingNumber as RequestHandler);

export default router;
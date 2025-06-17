"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const shipment_tracking_controller_1 = require("../controllers/shipment-tracking.controller");
const validate_token_1 = __importDefault(require("../middlewares/validate-token"));
/**
 * 📦 RUTAS DE SEGUIMIENTO DE ENVÍOS
 * Sistema de tracking para transacciones y trueques
 * Permite rastrear el estado de envíos y actualizar números de guía
 */
const router = (0, express_1.Router)();
// 🔍 RUTAS DE CONSULTA DE ENVÍOS
// Obtener información de envío por transacción
router.get('/transaction/:transactionId', validate_token_1.default, // Usuario autenticado requerido
shipment_tracking_controller_1.getShipmentByTransaction // Datos de envío por transacción
);
// Obtener información de envío por trueque
router.get('/barter/:barterId/:userId', validate_token_1.default, // Usuario autenticado requerido
shipment_tracking_controller_1.getShipmentByBarter // Datos de envío por trueque específico
);
// 📝 RUTAS DE ACTUALIZACIÓN
// Actualizar número de guía (solo admin)
router.put('/update-tracking', validate_token_1.default, // Autenticación requerida
shipment_tracking_controller_1.updateTrackingNumber // Actualizar guía de seguimiento
);
exports.default = router;

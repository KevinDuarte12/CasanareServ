"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const shipment_tracking_controller_1 = require("../controllers/shipment-tracking.controller");
const validate_token_1 = __importDefault(require("../middlewares/validate-token"));
const router = (0, express_1.Router)();
// Obtener información de envío por transacción
router.get('/transaction/:transactionId', validate_token_1.default, shipment_tracking_controller_1.getShipmentByTransaction);
// Obtener información de envío por trueque
router.get('/barter/:barterId/:userId', validate_token_1.default, shipment_tracking_controller_1.getShipmentByBarter);
// Actualizar número de guía (solo admin)
router.put('/update-tracking', validate_token_1.default, shipment_tracking_controller_1.updateTrackingNumber);
exports.default = router;

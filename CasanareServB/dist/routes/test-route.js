"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
console.log('📌 Registrando rutas de prueba...');
// Ruta básica para verificar funcionamiento
router.get('/', (_req, res) => {
    console.log('📍 Accediendo a ruta de prueba GET');
    res.json({ message: 'Test route works!' });
});
// Ruta POST para verificar funcionamiento
router.post('/test-post', (_req, res) => {
    console.log('📍 Accediendo a ruta de prueba POST');
    res.json({ message: 'Test POST works!' });
});
console.log('✅ Rutas de prueba registradas correctamente');
exports.default = router;

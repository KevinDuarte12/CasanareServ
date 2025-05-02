import { Router, Request, Response } from 'express';

const router = Router();

console.log('📌 Registrando rutas de prueba...');

// Ruta básica para verificar funcionamiento
router.get('/', (_req: Request, res: Response) => {
    console.log('📍 Accediendo a ruta de prueba GET');
    res.json({ message: 'Test route works!' });
});

// Ruta POST para verificar funcionamiento
router.post('/test-post', (_req: Request, res: Response) => {
    console.log('📍 Accediendo a ruta de prueba POST');
    res.json({ message: 'Test POST works!' });
});

console.log('✅ Rutas de prueba registradas correctamente');

export default router;
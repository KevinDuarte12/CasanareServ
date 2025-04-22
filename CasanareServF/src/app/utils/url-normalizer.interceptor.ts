import { HttpInterceptorFn, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { environment } from '../../environment/environment';

export const urlNormalizerInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  // Verificar si ya contiene /api/api/ duplicado
  if (req.url.includes('/api/api/')) {
    const correctedUrl = req.url.replace(/\/api\/api\//, '/api/');
    console.log(`🔧 Corrigiendo URL duplicada: ${req.url} → ${correctedUrl}`);
    
    const normalizedReq = req.clone({ url: correctedUrl });
    return next(normalizedReq);
  }
  
  // Verificar si es una URL de verificación con token
  if (req.url.includes('/verify') && req.url.includes('token=')) {
    console.log(`🔑 Detectada URL de verificación: ${req.url}`);
  }
  
  return next(req);
};
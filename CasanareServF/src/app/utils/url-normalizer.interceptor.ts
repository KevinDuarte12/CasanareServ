import { HttpInterceptorFn, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { environment } from '../../environment/environment';

export const urlNormalizerInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  // Solo normalizar URLs que ya contienen la base de la API pero podrían tener prefijos duplicados
  if (req.url.includes('/api/api/')) {
    // Corregir URLs con prefijo duplicado
    const correctedUrl = req.url.replace(/\/api\/api\//, '/api/');
    console.log(`🛠️ Corrigiendo URL duplicada: ${req.url} → ${correctedUrl}`);
    
    const normalizedReq = req.clone({ url: correctedUrl });
    return next(normalizedReq);
  }
  
  // No modificar otras URLs
  return next(req);
};
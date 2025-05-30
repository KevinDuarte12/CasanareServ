import { HttpInterceptorFn, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { environment } from '../../environment/environment';

export const urlNormalizerInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  let url = req.url;
  
  // Verificar si ya contiene /api/api/ duplicado
  if (url.includes('/api/api/')) {
    url = url.replace(/\/api\/api\//, '/api/');
    console.log(`🔧 Corrigiendo URL duplicada: ${req.url} → ${url}`);
  }
  
  // Corregir dobles barras que no sean parte de http:// o https://
  if (url.includes('//') && !url.startsWith('http://') && !url.startsWith('https://')) {
    const originalUrl = url;
    // Corrige las dobles barras pero preserva http:// y https://
    url = url.replace(/([^:])\/\//g, '$1/');
    console.log(`🔧 Corrigiendo doble barra: ${originalUrl} → ${url}`);
  } else if (url.match(/https?:\/\/.*\/\//)) {
    // Para URLs que comienzan con http:// o https:// pero tienen doble barra después
    const originalUrl = url;
    url = url.replace(/(https?:\/\/[^\/]+)\/\//, '$1/');
    console.log(`🔧 Corrigiendo doble barra después de dominio: ${originalUrl} → ${url}`);
  }
  
  // Verificar si es una URL de verificación con token
  if (url.includes('/verify') && url.includes('token=')) {
    console.log(`🔑 Detectada URL de verificación: ${url}`);
  }
  
  // Solo clonar la petición si la URL cambió
  if (url !== req.url) {
    return next(req.clone({ url }));
  }
  
  return next(req);
};
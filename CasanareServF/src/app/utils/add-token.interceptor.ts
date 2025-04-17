import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { inject } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { TokenService } from '../services/token.service';

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const router = inject(Router);
  const toastr = inject(ToastrService);
  const tokenService = inject(TokenService);

  console.log('🔒 Interceptor procesando solicitud a', req.url);
  
  // Lista de rutas públicas que no necesitan token
  const publicRoutes = [
    '/api/users/login',
    '/api/users/register',
    '/api/users/verify',
    '/api/users/forgot-password',
    '/api/users/reset-password'
  ];

  // Verificar si la solicitud está marcada como acceso público
  const hasPublicAccessParam = req.params.has('publicAccess') && 
                               req.params.get('publicAccess') === 'true';
                               
  // Si la solicitud está marcada como pública, procesarla sin token
  if (hasPublicAccessParam) {
    console.log('🔓 Acceso público solicitado para:', req.url);
    // Limpiamos el parámetro publicAccess para que no interfiera con la API
    const cleanedReq = req.clone({
      params: req.params.delete('publicAccess')
    });
    return next(cleanedReq);
  }

  // Para rutas de registro específicamente
  const isRegisterRoute = req.url.includes('/api/users') && 
                          req.method === 'POST' && 
                          !req.url.includes('/login') && 
                          !req.url.includes('/profile');
  
  // Si es una ruta pública o de registro, no añadir token
  const isPublicRoute = publicRoutes.some(route => req.url.includes(route));

  if (isPublicRoute || isRegisterRoute) {
    console.log('🔓 Ruta sin autenticación:', req.url);
    return next(req);
  }
  
  // Condición especial para categorías
  if (req.url.includes('/api/categories')) {
    // Solo permitir sin token el listado completo de categorías o categoría específica en GET
    const isCategoryListingOnly = req.method === 'GET' && 
                               (req.url.endsWith('/api/categories') || 
                                req.url.match(/\/api\/categories\/\d+$/));
    
    if (isCategoryListingOnly) {
      console.log('📋 Listado público de categorías:', req.url);
      return next(req);
    }
  }

  // Para todas las demás rutas, añadir token si está disponible
  const token = tokenService.getToken();
  
  console.log(`🔑 Token disponible para ${req.url}: ${token ? 'Sí' : 'No'}`);

  if (token) {
    // Clonar la solicitud añadiendo el encabezado Authorization
    const authReq = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`)
    });

    console.log(`✅ Solicitud autenticada enviada a ${req.url}`);

    return next(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          console.log(`❌ Error 401 en ${req.url}: Acceso denegado`);
          toastr.error('Tu sesión ha expirado. Inicia sesión nuevamente.', 'Sesión expirada');
          
          // Limpiar datos de sesión
          tokenService.clearSession();
          
          // Navegar al login
          router.navigate(['/login']);
        }
        return throwError(() => error);
      })
    );
  }

  // Si no hay token y la ruta requiere autenticación, intentamos continuar
  // pero con manejo de errores apropiado
  console.log(`⚠️ Ruta que puede requerir autenticación sin token: ${req.url}`);
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Mostrar mensaje más amigable basado en la ruta
        if (req.url.includes('/profile')) {
          toastr.warning('Inicia sesión para acceder a tu perfil', 'Acceso restringido');
        } else {
          toastr.warning('Inicia sesión para acceder a esta función', 'Acceso restringido');
        }
        
        // Redirigir solo para ciertas rutas que definitivamente requieren login
        if (req.url.includes('/profile') || req.url.includes('/checkout')) {
          router.navigate(['/login']);
        }
      }
      return throwError(() => error);
    })
  );
};
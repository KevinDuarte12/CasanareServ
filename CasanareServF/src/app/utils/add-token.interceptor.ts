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

  // Verificar si la solicitud es para actualizar perfil (necesita manejo especial de errores 401)
  const isProfileUpdate = req.url.includes('/api/users/profile') && req.method === 'PUT';

  // Verificar si la ruta es pública
  const isPublicRoute = publicRoutes.some(route => req.url.includes(route));
  
  // Obtener el token y preparar la solicitud
  const token = tokenService.getToken();
  let authReq = req;
  
  if (token && !isPublicRoute) {
    console.log(`🔑 Token disponible para ${req.url}: Sí`);
    authReq = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
    console.log(`✅ Solicitud autenticada enviada a ${req.url}`);
  } else {
    console.log(`🔑 Token disponible para ${req.url}: No`);
    if (!isPublicRoute) {
      console.log(`⚠️ Ruta que puede requerir autenticación sin token: ${req.url}`);
    }
  }

  return next(authReq).pipe(
    catchError(error => {
      try {
        // Si es un error 401 
        if (error.status === 401) {
          console.log('❌ Error 401 en', req.url, ': Acceso denegado');
          
          // Verificar si es un error de actualización de perfil con contraseña
          if (isProfileUpdate) {
            // Si la respuesta incluye attemptsLeft o es un error de contraseña, 
            // no cerrar sesión automáticamente
            if (error.error?.attemptsLeft !== undefined || 
                error.error?.msg?.includes('Contraseña incorrecta')) {
              // Simplemente propagar el error para que el componente lo maneje
              console.log('🔒 Error de validación de contraseña, no cerrando sesión');
              return throwError(() => error);
            }
            
            // Solo cerrar sesión si es un error forceLogout
            if (error.error?.forceLogout) {
              console.log('🔒 Demasiados intentos fallidos, cerrando sesión');
              tokenService.clearSession();
              router.navigate(['/login']);
              toastr.error('Tu sesión ha expirado debido a múltiples intentos fallidos.');
            }
          } else {
            // Para otros errores 401 (token inválido, expirado, etc.)
            tokenService.clearSession();
            router.navigate(['/login']);
            toastr.error('Tu sesión ha expirado. Por favor, inicia sesión de nuevo.');
          }
        }
        
        // Siempre propagar el error para manejo adicional
        return throwError(() => error);
      } catch (unexpectedError) {
        console.error('Error inesperado en interceptor:', unexpectedError);
        return throwError(() => error);
      }
    })
  );
};
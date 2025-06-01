import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { inject } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { TokenService } from '../services/token.service';

// ✅ VARIABLES GLOBALES PARA CONTROLAR MENSAJES ÚNICOS
let isSessionExpiredShown = false;
let lastSessionExpiredTime = 0;
let sessionExpiredTimeout: any = null;

// ✅ FUNCIÓN PARA RESETEAR EL CONTROL DE MENSAJES
function resetSessionExpiredControl() {
  isSessionExpiredShown = false;
  lastSessionExpiredTime = 0;
  if (sessionExpiredTimeout) {
    clearTimeout(sessionExpiredTimeout);
    sessionExpiredTimeout = null;
  }
}

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
              
              // ✅ CONTROL PARA MOSTRAR MENSAJE SOLO UNA VEZ
              if (!isSessionExpiredShown) {
                isSessionExpiredShown = true;
                toastr.error('Tu sesión ha expirado debido a múltiples intentos fallidos.', 'Sesión expirada');
                
                // ✅ RESETEAR CONTROL DESPUÉS DE 5 SEGUNDOS
                sessionExpiredTimeout = setTimeout(() => {
                  resetSessionExpiredControl();
                }, 5000);
              }
              
              tokenService.clearSession();
              router.navigate(['/login']);
            }
          } else {
            // ✅ PARA OTROS ERRORES 401 - MOSTRAR MENSAJE SOLO UNA VEZ
            const now = Date.now();
            
            // Solo mostrar si no se ha mostrado en los últimos 3 segundos
            if (!isSessionExpiredShown && (now - lastSessionExpiredTime > 3000)) {
              isSessionExpiredShown = true;
              lastSessionExpiredTime = now;
              
              console.log('🔔 Mostrando mensaje de sesión expirada (ÚNICA VEZ)');
              toastr.error('Tu sesión ha expirado. Por favor, inicia sesión de nuevo.', 'Sesión expirada', {
                timeOut: 5000,
                closeButton: true,
                progressBar: true,
                positionClass: 'toast-top-right'
              });
              
              // ✅ RESETEAR CONTROL DESPUÉS DE 5 SEGUNDOS
              sessionExpiredTimeout = setTimeout(() => {
                resetSessionExpiredControl();
              }, 5000);
            } else {
              console.log('🔄 Mensaje de sesión expirada ya mostrado, omitiendo');
            }
            
            // Limpiar sesión y redirigir
            tokenService.clearSession();
            router.navigate(['/login']);
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
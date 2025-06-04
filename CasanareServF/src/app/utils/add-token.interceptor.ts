import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { inject } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { TokenService } from '../services/token.service';
import { AuthService } from '../services/auth.service';

// ✅ VARIABLES GLOBALES EXISTENTES (sin cambios)
let isSessionExpiredShown = false;
let lastSessionExpiredTime = 0;
let sessionExpiredTimeout: any = null;
let logoutInProgress = false;

// ✅ NUEVAS VARIABLES SOLO PARA CONTROL DE LOGS (no afectan funcionalidad)
let lastLogTime = 0;
let lastLogUrl = '';
let logCount = 0;

// ✅ FUNCIÓN EXISTENTE (sin cambios)
function resetSessionExpiredControl() {
  isSessionExpiredShown = false;
  lastSessionExpiredTime = 0;
  if (sessionExpiredTimeout) {
    clearTimeout(sessionExpiredTimeout);
    sessionExpiredTimeout = null;
  }
}

// ✅ FUNCIÓN EXISTENTE (sin cambios)
function initiateLogout(router: Router, tokenService: TokenService, toastr: ToastrService, showMessage: boolean = true) {
  if (logoutInProgress) {
    console.log('🔄 Logout ya en progreso, omitiendo');
    return;
  }
  
  logoutInProgress = true;
  console.log('🚪 Iniciando logout por sesión expirada');
  
  if (showMessage && !isSessionExpiredShown) {
    isSessionExpiredShown = true;
    toastr.error('Tu sesión ha expirado. Por favor, inicia sesión de nuevo.', 'Sesión expirada', {
      timeOut: 5000,
      closeButton: true,
      progressBar: true,
      positionClass: 'toast-top-right'
    });
  }
  
  tokenService.clearSession();
  router.navigate(['/login']).then(() => {
    setTimeout(() => {
      logoutInProgress = false;
      resetSessionExpiredControl();
    }, 2000);
  });
}

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const router = inject(Router);
  const toastr = inject(ToastrService);
  const tokenService = inject(TokenService);
  const authService = inject(AuthService);

  // ✅ MEJORADO: Control de logs repetitivos (SOLO AFECTA LOGS, NO FUNCIONALIDAD)
  const now = Date.now();
  const isSameUrlRecent = (lastLogUrl === req.url && now - lastLogTime < 3000);
  
  if (!isSameUrlRecent) {
    console.log('🔒 Interceptor procesando solicitud a', req.url);
    lastLogTime = now;
    lastLogUrl = req.url;
    logCount = 0;
  } else {
    logCount++;
    // Solo mostrar cada 5 logs repetitivos
    if (logCount % 5 === 0) {
      console.log(`🔒 [${logCount}x] Procesando repetido:`, req.url);
    }
  }
  
  // ✅ RUTAS EXISTENTES (sin cambios)
  const publicRoutes = [
    '/api/users/login',
    '/api/users/register',
    '/api/users/verify',
    '/api/users/forgot-password',
    '/api/users/reset-password'
  ];

  const silentRoutes = [
    '/api/notifications/',
    '/api/cart/',
    '/api/user/profile'
  ];

  const isProfileUpdate = req.url.includes('/api/users/profile') && req.method === 'PUT';
  const isSilentRoute = silentRoutes.some(route => req.url.includes(route));
  const isPublicRoute = publicRoutes.some(route => req.url.includes(route));
  
  const token = tokenService.getToken();
  let authReq = req;
  
  if (token && !isPublicRoute) {
    // ✅ MEJORADO: Solo mostrar log si no es repetitivo
    if (!isSameUrlRecent) {
      console.log(`🔑 Token disponible para ${req.url}: Sí`);
    }
    authReq = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
    if (!isSameUrlRecent) {
      console.log(`✅ Solicitud autenticada enviada a ${req.url}`);
    }
  } else {
    if (!isSameUrlRecent) {
      console.log(`🔑 Token disponible para ${req.url}: No`);
      if (!isPublicRoute) {
        console.log(`⚠️ Ruta que puede requerir autenticación sin token: ${req.url}`);
      }
    }
  }

  return next(authReq).pipe(
    catchError(error => {
      try {
        // ✅ LÓGICA EXISTENTE (sin cambios funcionales)
        if (authService.isManualLogoutInProgress && authService.isManualLogoutInProgress()) {
          console.log('🚪 Logout manual en progreso, ignorando errores 401');
          return throwError(() => error);
        }

        if (logoutInProgress) {
          console.log('🔄 Logout automático ya en progreso, ignorando error 401');
          return throwError(() => error);
        }

        if (error.status === 401) {
          // ✅ MEJORADO: Solo mostrar error 401 si no es repetitivo
          if (!isSameUrlRecent || logCount <= 1) {
            console.log('❌ Error 401 en', req.url, ': Acceso denegado');
          }
          
          if (isProfileUpdate) {
            if (error.error?.attemptsLeft !== undefined || 
                error.error?.msg?.includes('Contraseña incorrecta')) {
              console.log('🔒 Error de validación de contraseña, no cerrando sesión');
              return throwError(() => error);
            }
            
            if (error.error?.forceLogout) {
              console.log('🔒 Demasiados intentos fallidos, cerrando sesión');
              initiateLogout(router, tokenService, toastr, true);
            }
          } else {
            if (isSilentRoute) {
              // ✅ MEJORADO: Solo mostrar log si no es repetitivo
              if (!isSameUrlRecent || logCount <= 1) {
                console.log('🔇 Ruta silenciosa con error 401');
              }
              
              const now = Date.now();
              if (now - lastSessionExpiredTime > 30000) {
                if (!isSameUrlRecent || logCount <= 1) {
                  console.log('⏰ Tiempo suficiente transcurrido, logout silencioso');
                }
                lastSessionExpiredTime = now;
                
                setTimeout(() => {
                  if (!logoutInProgress && (!authService.isManualLogoutInProgress || !authService.isManualLogoutInProgress())) {
                    initiateLogout(router, tokenService, toastr, false);
                  }
                }, 2000);
              }
              
              return throwError(() => error);
            }
            
            const now = Date.now();
            
            if (now - lastSessionExpiredTime > 10000) {
              lastSessionExpiredTime = now;
              if (!isSameUrlRecent || logCount <= 1) {
                console.log('🔔 Procesando logout con mensaje');
              }
              initiateLogout(router, tokenService, toastr, true);
            } else {
              if (!isSameUrlRecent || logCount <= 1) {
                console.log('🔄 Logout reciente, omitiendo');
              }
            }
          }
        }
        
        return throwError(() => error);
      } catch (unexpectedError) {
        console.error('❌ Error inesperado en interceptor:', unexpectedError);
        return throwError(() => error);
      }
    })
  );
};
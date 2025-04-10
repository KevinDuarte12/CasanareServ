import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { inject } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const router = inject(Router);
  const toastr = inject(ToastrService);
  const authService = inject(AuthService);

  console.log('🔒 Interceptor procesando solicitud a', req.url);
  
  // Rutas públicas que no necesitan token
  const publicRoutes = [
    '/api/users/login',
    '/api/users/register',
    '/api/users',  // Añade esta línea para permitir el POST a /api/users
    '/api/users/verify',
    '/api/users/forgot-password',
    '/api/users/reset-password'
  ];

  // Verificar si la URL de la solicitud es una ruta pública
  const isPublicRoute = publicRoutes.some(route => req.url.includes(route));
  
  // Para rutas de registro específicamente
  const isRegisterRoute = req.url.endsWith('/api/users') && req.method === 'POST';
  
  if (isPublicRoute || isRegisterRoute) {
    console.log('🔓 Ruta pública detectada, no se requiere token:', req.url);
    return next(req);
  }

  // Rutas de productos que no necesitan autenticación para GET
  if (req.url.includes('/api/products') && req.method === 'GET') {
    console.log('🔓 Ruta pública de productos (GET), no se requiere token');
    return next(req);
  }

  // Rutas de categorías que no necesitan autenticación para GET
  if (req.url.includes('/api/categories') && req.method === 'GET') {
    console.log('🔓 Ruta pública de categorías (GET), no se requiere token');
    return next(req);
  }

  // Obtener el token a través del servicio
  const token = authService.getToken();
  
  console.log(`🔑 Token disponible: ${token ? 'Sí' : 'No'}`);

  if (token) {
    const authReq = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`)
    });

    console.log(`✅ Solicitud autenticada enviada a ${req.url}`);

    return next(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          console.log(`❌ Error 401 en ${req.url}: Acceso denegado`);
          toastr.error('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.', 'Sesión Expirada');
          authService.logout();
        }
        return throwError(() => error);
      })
    );
  } else {
    console.log(`⚠️ Solicitud sin autenticación a ruta protegida: ${req.url}`);
    // Si se requiere autenticación pero no hay token, redirigir a login
    if (!isPublicRoute) {
      toastr.warning('Debes iniciar sesión para acceder a este recurso', 'Acceso Restringido');
      router.navigate(['/login']);
    }
  }

  return next(req);
};
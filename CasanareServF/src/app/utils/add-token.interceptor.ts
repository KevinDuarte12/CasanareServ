import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { inject } from '@angular/core';
import { ToastrService } from 'ngx-toastr';

// Definición del interceptor de autenticación
export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>, // La solicitud HTTP que se está interceptando
  next: HttpHandlerFn // Función para pasar la solicitud al siguiente manejador
): Observable<HttpEvent<unknown>> => {
  // Inyectar el Router para manejar la navegación
  const router = inject(Router);
  // Inyectar el ToastrService para mostrar mensajes de notificación
  const toastr = inject(ToastrService);
  // Obtener el token de autenticación del localStorage
  const token = localStorage.getItem('token');

  // Verificar si la URL de la solicitud es para login, register o signin
  if (req.url.includes('login') || req.url.includes('add') || req.url.includes('signin')) {
    // Si es una de estas rutas, no añadir el header de autorización y pasar la solicitud sin modificar
    return next(req);
  }

  // Si hay un token en el localStorage
  if (token) {
    // Clonar la solicitud y añadir el header de autorización con el token
    const authReq = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`)
    });

    // Pasar la solicitud clonada al siguiente manejador y manejar errores
    return next(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        // Si el error es 401 (No autorizado)
        if (error.status === 401) {
          // Mostrar un mensaje de error usando Toastr
          toastr.error('Acceso denegado. Tu sesión ha expirado.', 'Error');
          // Redirigir al usuario a la página de login
          router.navigate(['/login']);
          // Eliminar el token inválido del localStorage
          localStorage.removeItem('token');
        }
        // Reenviar el error para que otros manejadores puedan procesarlo
        return throwError(() => error);
      })
    );
  }

  // Si no hay token, simplemente pasar la solicitud original al siguiente manejador
  return next(req);
};
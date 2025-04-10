import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { inject } from '@angular/core'; // Importa inject para inyectar dependencias en funciones
import { ToastrService } from 'ngx-toastr'; // Importa ToastrService para mostrar notificaciones

export const authGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot, 
  state: RouterStateSnapshot
) => {
  const router = inject(Router);
  const toastr = inject(ToastrService);
  
  console.log('AuthGuard - Verificando ruta:', state.url);
  console.log('AuthGuard - Datos de ruta:', route.data); // Verifica que los datos de roles se estén recibiendo

  // Obtener el token del localStorage
  const token = localStorage.getItem('token');
  console.log('AuthGuard - Token exists:', !!token);

  if (!token) {
    toastr.error('Acceso denegado. Debes iniciar sesión.', 'Error');
    router.navigate(['/login']);
    return false;
  }

  // Si hay restricciones de roles
  if (route.data && route.data['roles']) {
    const userData = localStorage.getItem('user');
    console.log('AuthGuard - User data exists:', !!userData);
    
    if (!userData) {
      toastr.error('Información de usuario no disponible', 'Error');
      router.navigate(['/login']);
      return false;
    }
    
    try {
      const user = JSON.parse(userData);
      console.log('AuthGuard - User parsed:', user);
      console.log('AuthGuard - User role:', user.rol);
      const userRole = user.rol;
      
      // Verificar si el rol del usuario está en la lista permitida
      if (!route.data['roles'].includes(userRole)) {
        console.log('AuthGuard - Access denied, required roles:', route.data['roles']);
        toastr.error('No tienes permisos para acceder a esta página', 'Acceso denegado');
        router.navigate(['/']); // Redirigir al home en vez de dashboard
        return false;
      }
    } catch (error) {
      console.error('Error al verificar roles:', error);
      toastr.error('Error al verificar permisos', 'Error');
      router.navigate(['/']);
      return false;
    }
  }

  // Si todo está bien
  console.log('AuthGuard - Access granted');
  return true;
};
// Este guardia de ruta verifica si el usuario está autenticado y tiene los permisos necesarios para acceder a la ruta.
// Si no está autenticado, redirige al usuario a la página de inicio de sesión y muestra un mensaje de error.

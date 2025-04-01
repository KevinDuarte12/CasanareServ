import { CanActivateFn, Router } from '@angular/router'; // Importa CanActivateFn y Router para manejar la navegación y la protección de rutas
import { inject } from '@angular/core'; // Importa inject para inyectar dependencias en funciones
import { ToastrService } from 'ngx-toastr'; // Importa ToastrService para mostrar notificaciones

export const authGuard: CanActivateFn = () => {
  // Inyecta el servicio Router para manejar la navegación
  const router = inject(Router);
  // Inyecta el servicio ToastrService para mostrar notificaciones
  const toastr = inject(ToastrService);

  // Obtener el token del localStorage
  const token = localStorage.getItem('token');

  if (token) {
    // Si hay un token, permitir el acceso a la ruta
    return true;
  } else {
    // Si no hay token, mostrar un mensaje de error y redirigir al login
    toastr.error('Acceso denegado. Debes iniciar sesión.', 'Error');
    router.navigate(['/login']);
    return false; // Denegar el acceso a la ruta
  }
};
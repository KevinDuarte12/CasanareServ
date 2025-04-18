import { Injectable } from '@angular/core'; // Importa el decorador Injectable para definir un servicio
import { HttpErrorResponse } from '@angular/common/http'; // Importa HttpErrorResponse para manejar errores HTTP
import { ToastrService } from 'ngx-toastr'; // Importa ToastrService para mostrar notificaciones

@Injectable({
  providedIn: 'root' // Indica que el servicio está disponible en toda la aplicación (root)
})
export class ErrorService {

  constructor(private toastr: ToastrService) { } // Inyecta el servicio ToastrService para mostrar notificaciones

  msjError(e: HttpErrorResponse) {
    // Comprobar si e y e.error existen antes de intentar acceder a e.error.msg
    if (e && e.error && e.error.msg) {
      // Si hay un mensaje específico en la respuesta
      this.toastr.error(e.error.msg, 'Error');
    } else if (e && e.status === 401) {
      // Error específico para 401 Unauthorized
      this.toastr.error('No autorizado. Inicia sesión nuevamente.', 'Error de autenticación');
    } else if (e && e.status === 403) {
      // Error específico para 403 Forbidden
      this.toastr.error('No tienes permisos para realizar esta acción.', 'Acceso denegado');
    } else if (e && e.status === 404) {
      // Error específico para 404 Not Found
      this.toastr.error('El recurso solicitado no existe.', 'No encontrado');
    } else if (e && e.status === 0) {
      // Error de conexión - generalmente cuando el servidor no responde
      this.toastr.error('No se pudo conectar con el servidor. Verifica tu conexión a internet.', 'Error de conexión');
    } else if (e && e.message) {
      // Si hay un mensaje en el objeto de error principal
      this.toastr.error(e.message, 'Error');
    } else {
      // Mensaje genérico para cualquier otro error
      this.toastr.error('Ha ocurrido un error inesperado.', 'Error');
    }
    
    // Registrar el error completo en la consola para debugging
    console.error('Detalles completos del error:', e);
  }
  
  // Método sobrecargado para manejar errores que no son HttpErrorResponse
  handleError(error: any, defaultMessage: string = 'Ha ocurrido un error inesperado') {
    if (error instanceof HttpErrorResponse) {
      this.msjError(error);
    } else if (typeof error === 'string') {
      this.toastr.error(error, 'Error');
    } else if (error && error.message) {
      this.toastr.error(error.message, 'Error');
    } else {
      this.toastr.error(defaultMessage, 'Error');
    }
    
    console.error('Error capturado:', error);
  }
}
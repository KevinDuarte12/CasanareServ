import { Injectable } from '@angular/core'; // Importa el decorador Injectable para definir un servicio
import { HttpErrorResponse } from '@angular/common/http'; // Importa HttpErrorResponse para manejar errores HTTP
import { ToastrService } from 'ngx-toastr'; // Importa ToastrService para mostrar notificaciones

@Injectable({
  providedIn: 'root' // Indica que el servicio está disponible en toda la aplicación (root)
})
export class ErrorService {

  constructor(private toastr: ToastrService) { } // Inyecta el servicio ToastrService para mostrar notificaciones

  msjError(e: HttpErrorResponse) {
    // Método para manejar y mostrar mensajes de error
    if (e.error.msg) {
      // Si el error contiene un mensaje personalizado (msg), lo muestra
      this.toastr.error(e.error.msg, 'Error'); // Muestra el mensaje de error del backend
    } else {
      // Si no hay un mensaje personalizado, muestra un mensaje genérico
      this.toastr.error('Error en el servidor', 'Error'); // Mensaje genérico si no hay "msg"
    }
  }
}
import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router'; // Importa Router y RouterLink para navegación y enlaces
import { FormsModule } from '@angular/forms'; // Importa FormsModule para manejar formularios
import { ToastrService } from 'ngx-toastr'; // Importa ToastrService para mostrar notificaciones
import { user } from '../interfaces/user'; // Importa la interfaz user
import { UserService } from '../services/user.services'; // Importa el servicio UserService
import { HttpErrorResponse } from '@angular/common/http'; // Importa HttpErrorResponse para manejar errores HTTP
import { SpinnerComponent } from '../shared/spinner/spinner.component'; // Importa el componente Spinner
import { NgIf } from '@angular/common'; // Importa la directiva NgIf para usar *ngIf en la plantilla
import { ErrorService } from '../services/error.service'; // Importa el servicio ErrorService para manejar errores
import { catchError, finalize, of } from 'rxjs';

@Component({
  selector: 'app-login', // Selector del componente
  imports: [RouterLink, FormsModule, SpinnerComponent, NgIf], // Componentes y directivas que se usan en este componente
  templateUrl: './login.component.html', // Ruta al archivo de plantilla HTML
  styleUrl: './login.component.css', // Ruta al archivo de estilos CSS
  standalone: true, // Indica que este componente es independiente (standalone)
})
export class LoginComponent {
  loading: boolean = false; // Variable para controlar el estado de carga (muestra/oculta el spinner)
  userData = {
    email: '', // Variable para almacenar el nombre de usuario
    password: '' // Variable para almacenar la contraseña
  };

  constructor(
    private toastr: ToastrService, // Inyecta el servicio ToastrService para mostrar notificaciones
    private userService: UserService, // Inyecta el servicio UserService para manejar la lógica de autenticación
    private router: Router, // Inyecta el servicio Router para manejar la navegación
    private errorService: ErrorService // Inyecta el servicio ErrorService para manejar errores
  ) { }

  // Modifica el método onSubmit para incluir la lógica de roles
  onSubmit() {
    // Validación de campos
    if (!this.validateForm()) {
      return;
    }

    // Preparar datos de usuario
    const user: user = {
      email: this.userData.email,
      password: this.userData.password
    };

    // Activar estado de carga
    this.loading = true;

    // 1. Realizar login
    this.userService.login(user).subscribe({
      next: (response: any) => {
        if (!response || !response.token) {
          this.toastr.error('Respuesta de login inválida', 'Error');
          this.loading = false;
          return;
        }

        // Mostrar mensaje inicial de éxito
        this.toastr.success('Autenticación exitosa', 'Bienvenido');

        // 2. Obtener información del usuario (protegida con try-catch)
        this.loadUserProfile();
      },
      error: (e: HttpErrorResponse) => {
        this.loading = false;
        
        // Usar try-catch para evitar errores encadenados
        try {
          this.errorService.msjError(e);
        } catch (handlerError) {
          console.error('Error al mostrar mensaje de error:', handlerError);
          this.toastr.error('Error al iniciar sesión', 'Error');
        }
      }
    });
  }

  // Método separado para validar el formulario
  private validateForm(): boolean {
    if (this.userData.password.trim() === '' || this.userData.email.trim() === '') {
      this.toastr.error('Todos los campos son requeridos', 'Error!', {
        timeOut: 3000,
        progressBar: true
      });
      return false;
    }
    return true;
  }

  // Método separado para cargar el perfil del usuario
  private loadUserProfile(): void {
    this.userService.getUserInfo()
      .pipe(
        // Garantizar que loading siempre se desactive
        finalize(() => {
          this.loading = false;
        }),
        // Capturar cualquier error y retornar un objeto vacío para no romper la cadena
        catchError((err) => {
          console.warn('Error obteniendo perfil de usuario:', err);
          
          try {
            this.errorService.msjError(err);
          } catch (handlerError) {
            console.error('Error al mostrar mensaje de error:', handlerError);
          }
          
          // Redireccionar a una ruta segura en caso de error
          this.router.navigate(['/shop']);
          
          // Retornar un objeto vacío para que el observable no se rompa
          return of({ rol: 'user' }); // Valor por defecto
        })
      )
      .subscribe({
        next: (userData: any) => {
          // Verificar si userData existe y tiene propiedades
          if (userData && userData.rol) {
            // Redirección basada en el rol
            if (userData.rol === 'admin') {
              this.router.navigate(['/dashboard']);
            } else {
              // Para usuarios normales
              this.router.navigate(['/']);
              
              // Mostrar nombre de usuario si está disponible
              const userName = userData.name || 'Usuario';
              this.toastr.success(`¡Bienvenido ${userName}!`, 'Inicio de sesión exitoso');
            }
          } else {
            // Si no hay datos de usuario válidos, redireccionar a una ruta por defecto
            console.warn('Datos de usuario insuficientes:', userData);
            this.router.navigate(['/']);
            this.toastr.info('Sesión iniciada', 'Bienvenido');
          }
        }
      });
  }
}
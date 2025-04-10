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
    // Verificaciones de campos vacíos...
    if (this.userData.password === '' || this.userData.email === '') {
      // Verifica si los campos están vacíos
      this.toastr.error('Todos los campos son requeridos', 'Error!', {
        timeOut: 3000, // Duración de la notificación (3 segundos)
        progressBar: true // Muestra una barra de progreso en la notificación
      });
      return; // Detiene la ejecución si los campos están vacíos
    }

    // Crea un objeto user con los datos del formulario
    const user: user = {
      email: this.userData.email,
      password: this.userData.password
    };

    this.loading = true; // Activa el estado de carga

    // Llama al método login del servicio UserService
    this.userService.login(user).subscribe({
      next: (response: any) => {
        // Guarda el token
        const token = response.token;
        localStorage.setItem('token', token);
        
        // Obtiene información del usuario para determinar su rol
        this.userService.getUserInfo().subscribe({
          next: (userData: any) => {
            this.loading = false;
            
            // Redirección basada en el rol
            if (userData.rol === 'admin') {
              this.router.navigate(['/dashboard']);
            } else {
              // Para usuarios normales, redirecciona a la página principal o tienda
              this.router.navigate(['/']);
              
              // Opcional: Mensaje de bienvenida personalizado
              this.toastr.success(`¡Bienvenido ${userData.name}!`, 'Inicio de sesión exitoso');
            }
          },
          error: (err) => {
            this.loading = false;
            // Si hay un error al obtener información del usuario, redirecciona a la página principal
            this.router.navigate(['/shop']);
            this.errorService.msjError(err);
          }
        });
      },
      error: (e: HttpErrorResponse) => {
        this.loading = false;
        this.errorService.msjError(e);
      }
    });
  }
}
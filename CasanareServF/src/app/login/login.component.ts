import { Component, OnInit } from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { user } from '../interfaces/user';
import { UserService } from '../services/user.services';
import { HttpErrorResponse } from '@angular/common/http';
import { SpinnerComponent } from '../shared/spinner/spinner.component';
import { NgIf } from '@angular/common';
import { ErrorService } from '../services/error.service';
import { catchError, finalize, of } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  imports: [RouterLink, FormsModule, SpinnerComponent, NgIf],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
  standalone: true,
})
export class LoginComponent implements OnInit {
  loading: boolean = false;
  userData = {
    email: '',
    password: ''
  };

  constructor(
    private toastr: ToastrService,
    private userService: UserService,
    private router: Router,
    private errorService: ErrorService,
    private route: ActivatedRoute, // Añadido para leer los query params
    private authService: AuthService  // Añade el servicio al constructor
  ) { }

  ngOnInit(): void {
    // Verificar si viene de una sesión expirada
    this.route.queryParams.subscribe(params => {
      const message = params['message'];
      if (message === 'session-expired') {
        this.toastr.info(
          'Tu sesión ha expirado por inactividad', 
          'Sesión finalizada',
          { timeOut: 5000 }
        );
      } else if (message === 'verification-pending') {
        this.toastr.info(
          'Por favor verifica tu correo electrónico para activar tu cuenta', 
          'Verificación pendiente',
          { timeOut: 3000 }
        );
      }
    });
  }

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

        // Ahora llama a handleLoginSuccess en lugar de procesar aquí
        this.loading = false; // Desactivar carga
        this.handleLoginSuccess(response);
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
    this.userService.getUserProfile()
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

  // En el método handleLogin o similar donde procesas el login exitoso:
  onLoginSuccess(response: any): void {
    // Mostrar mensaje de éxito
    this.toastr.success('Has iniciado sesión correctamente');
    
    // Verificar si hay una URL de redirección guardada
    const redirectUrl = localStorage.getItem('redirectAfterLogin');
    const pendingAction = localStorage.getItem('pendingAction');
    
    // Limpiar los datos guardados
    localStorage.removeItem('redirectAfterLogin');
    localStorage.removeItem('pendingAction');
    
    // Redirigir al usuario
    if (redirectUrl) {
      this.router.navigateByUrl(redirectUrl);
    } else {
      // Redirigir a la página predeterminada si no hay URL guardada
      this.router.navigate(['/home']);
    }
  }

  // Dentro del método donde manejas el login exitoso:
  handleLoginSuccess(response: any): void {
    // Mostrar mensaje de éxito
    this.toastr.success('Has iniciado sesión correctamente');
    
    // Verificar si hay información de redirección 
    const redirectUrl = localStorage.getItem('redirectAfterLogin');
    const pendingAction = localStorage.getItem('pendingAction');
    
    // Limpiar los datos guardados
    localStorage.removeItem('redirectAfterLogin');
    localStorage.removeItem('pendingAction');
    
    // Navegar según la información obtenida
    if (redirectUrl) {
      // Guardar la acción pendiente para que el componente de destino la maneje
      if (pendingAction) {
        localStorage.setItem('pendingAction', pendingAction);
      }
      
      // Navegar a la URL guardada
      this.router.navigateByUrl(redirectUrl);
    } else {
      // Redirección basada en el rol (manteniendo tu lógica existente)
      // Aquí puedes redirigir según el rol como ya tienes implementado
      this.router.navigate(['/']);
    }
  }
}
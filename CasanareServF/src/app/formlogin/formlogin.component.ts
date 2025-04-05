import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { UserService } from '../services/user.services';
import { user } from '../interfaces/user';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { SpinnerComponent } from '../shared/spinner/spinner.component';
import { NgIf } from '@angular/common';
import { ErrorService } from '../services/error.service';

@Component({
  selector: 'app-form-login',
  standalone: true,
  imports: [FormsModule, RouterLink, SpinnerComponent, NgIf],
  templateUrl: './formlogin.component.html',
  styleUrl: './formlogin.component.css'
})
export class FormloginComponent {
  loading: boolean = false;
  userData = {
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  }

  constructor(
    private toastr: ToastrService,
    private userService: UserService,
    private router: Router,
    private errorService: ErrorService
  ) { }

  onSubmit() {
    // Validaciones de campos
    if (this.userData.password === '' || this.userData.name === '' || 
        this.userData.email === '' || this.userData.confirmPassword === '') {
      this.toastr.error('Todos los campos son requeridos', 'Error!', {
        timeOut: 3000,
        positionClass: 'toast-top-center',
        progressBar: true
      });
      return;
    }

    // Validación de contraseñas
    if (this.userData.password !== this.userData.confirmPassword) {
      this.toastr.error('Las contraseñas no coinciden', 'Error!', {
        timeOut: 3000,
        positionClass: 'toast-top-center',
        progressBar: true
      });
      return;
    }

    // Validación de email
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    if (!emailRegex.test(this.userData.email)) {
      this.toastr.error('Por favor ingresa un email válido', 'Error!', {
        timeOut: 3000,
        positionClass: 'toast-top-center',
        progressBar: true
      });
      return;
    }

    const user: user = {
      name: this.userData.name,
      email: this.userData.email,
      password: this.userData.password
    };

    this.loading = true;
    this.userService.signIn(user).subscribe({
      next: (response) => {
        this.loading = false;
        this.toastr.success(
          'Usuario registrado correctamente. Por favor revisa tu email para verificar tu cuenta.',
          'Registro exitoso!',
          {
            timeOut: 5000,
            progressBar: true
          }
        );
        this.router.navigate(['/login'], { 
          queryParams: { 
            message: 'verification-pending'
          }
        });
      },
      error: (e: HttpErrorResponse) => {
        this.loading = false;
        if (e.error.code === 'EMAIL_EXISTS') {
          this.toastr.error('El email ya está registrado', 'Error!');
        } else {
          this.errorService.msjError(e);
        }
      }
    });
  }
}
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UserService } from '../services/user.services';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-verifyemail',
  imports: [CommonModule],
  templateUrl: './verifyemail.component.html',
  styleUrl: './verifyemail.component.css'
})
export class VerifyemailComponent implements OnInit {
  loading = true;
  message = 'Verificando tu email...';
  error = false;

  constructor(
    private route: ActivatedRoute,
    private userService: UserService,
    private router: Router,
    private toastr: ToastrService
  ) {}

  ngOnInit() {
    console.log('🔍 Iniciando verificación de email');
    console.log('📌 URL completa:', window.location.href);
    
    // Obtener el token del query parameter
    const token = this.route.snapshot.queryParamMap.get('token');
    console.log('🔑 Token obtenido:', token);
    
    if (!token) {
      this.handleError('No se proporcionó un token de verificación');
      return;
    }

    // Agregar un pequeño retraso para asegurar que todo esté listo
    setTimeout(() => {
      this.userService.verifyEmail(token).subscribe({
        next: (response) => {
          console.log('✅ Verificación exitosa:', response);
          this.loading = false;
          this.message = '¡Tu cuenta ha sido verificada exitosamente!';
          this.toastr.success('Tu cuenta ha sido verificada', 'Éxito');
          setTimeout(() => this.router.navigate(['/login']), 2000);
        },
        error: (error) => {
          console.error('❌ Error en verificación:', error);
          this.handleError(error.error?.msg || 'Error al verificar tu cuenta');
        }
      });
    }, 300);
  }

  handleError(errorMsg: string) {
    this.loading = false;
    this.error = true;
    this.message = errorMsg;
    this.toastr.error(errorMsg, 'Error');
    setTimeout(() => this.router.navigate(['/login']), 3000);
  }
}

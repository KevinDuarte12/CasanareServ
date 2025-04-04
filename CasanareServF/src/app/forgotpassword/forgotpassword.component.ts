import { Component } from '@angular/core';
import { Router } from '@angular/router'; // Importa Router para navegación
import { FormsModule } from '@angular/forms'; // Importa FormsModule para formularios
import { ToastrService } from 'ngx-toastr'; // Importa ToastrService para mostrar notificaciones
import { UserService } from '../services/user.services'; // Importa el servicio UserService
import { SpinnerComponent } from '../shared/spinner/spinner.component';
import { NgIf } from '@angular/common'; // Importa NgIf para usar *ngIf en la plantilla

@Component({
  selector: 'app-forgotpassword',
  imports: [FormsModule, SpinnerComponent, NgIf],
  standalone: true,
  templateUrl: './forgotpassword.component.html',
  styleUrl: './forgotpassword.component.css'
})
export class ForgotpasswordComponent {
  email: string = '';
  loading: boolean = false;

  constructor(
    private userService: UserService,
    private toastr: ToastrService,
    private router: Router
  ) {}

  onSubmit() {
    if (!this.email) {
      this.toastr.error('El email es requerido');
      return;
    }

    this.loading = true;
    this.userService.forgotPassword(this.email).subscribe({
      next: () => {
        this.toastr.success('Se han enviado las instrucciones a tu email');
        this.router.navigate(['/login']);
      },
      error: (error) => {
        this.loading = false;
        this.toastr.error(error.error.msg || 'Error al procesar la solicitud');
      }
    });
  }
}

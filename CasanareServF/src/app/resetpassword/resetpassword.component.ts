import { Component, OnInit} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { UserService } from '../services/user.services';
import { SpinnerComponent } from '../shared/spinner/spinner.component';
import { NgIf } from '@angular/common';
@Component({
  selector: 'app-resetpassword',
  standalone: true,
  imports: [ FormsModule, SpinnerComponent, NgIf],
  templateUrl: './resetpassword.component.html',
  styleUrl: './resetpassword.component.css'
})
export class ResetpasswordComponent {
  token: string = '';
  newPassword: string = '';
  confirmPassword: string = '';
  loading: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private userService: UserService,
    private toastr: ToastrService,
    private router: Router
  ) {}

  ngOnInit() {
    this.token = this.route.snapshot.queryParams['token'];
    if (!this.token) {
      this.toastr.error('Token no válido');
      this.router.navigate(['/login']);
    }
  }

  onSubmit() {
    if (!this.newPassword || !this.confirmPassword) {
      this.toastr.error('Todos los campos son requeridos');
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.toastr.error('Las contraseñas no coinciden');
      return;
    }

    this.loading = true;
    this.userService.resetPassword(this.token, this.newPassword).subscribe({
      next: () => {
        this.toastr.success('Contraseña actualizada exitosamente');
        this.router.navigate(['/login']);
      },
      error: (error) => {
        this.loading = false;
        this.toastr.error(error.error.msg || 'Error al restablecer la contraseña');
      }
    });
  }
}

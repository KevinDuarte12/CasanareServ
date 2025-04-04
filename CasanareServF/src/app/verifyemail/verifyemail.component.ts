import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UserService } from '../services/user.services';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-verifyemail',
  imports: [ CommonModule],
  templateUrl: './verifyemail.component.html',
  styleUrl: './verifyemail.component.css'
})
export class VerifyemailComponent implements OnInit{
  loading = true;
  message = 'Verificando tu email...';

  constructor(
    private route: ActivatedRoute,
    private userService: UserService,
    private router: Router,
    private toastr: ToastrService
  ) {}
  ngOnInit() {
    const token = this.route.snapshot.queryParamMap.get('token');
    
    if (!token) {
      this.message = 'Token no proporcionado';
      this.loading = false;
      this.toastr.error('Token no proporcionado');
      this.router.navigate(['/']);
      return;
    }

    this.userService.verifyEmail(token).subscribe({
      next: () => {
        this.loading = false;
        this.message = '¡Email verificado exitosamente!';
        this.toastr.success('Email verificado exitosamente');
        setTimeout(() => this.router.navigate(['/login']), 2000);
      },
      error: (error) => {
        this.loading = false;
        this.message = error.error.msg || 'Error al verificar email';
        this.toastr.error(this.message);
        setTimeout(() => this.router.navigate(['/login']), 3000);
      }
    });
  }
}

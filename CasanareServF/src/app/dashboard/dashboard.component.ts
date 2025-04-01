import { Component } from '@angular/core';
import { Router } from '@angular/router';
@Component({
  selector: 'app-dashboard',
  imports: [],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {
  constructor(private router: Router) {} // Inyecta el servicio Router para manejar la navegación

    logOut() {
      // Método para cerrar sesión
      localStorage.removeItem('token'); // Elimina el token del localStorage
      this.router.navigate(['/login']); // Redirige al usuario a la página de login
    }
  }

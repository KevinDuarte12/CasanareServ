import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.services';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit {
  isLoggedIn: boolean = false;
  userName: string = '';
  notificationCount: number = 0; // Para mostrar notificaciones pendientes
  
  constructor(
    private authService: AuthService,
    private userService: UserService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}
  
  ngOnInit(): void {
    // Verificar estado de autenticación al iniciar
    this.checkAuthStatus();
    
    // Suscribirse a cambios en la autenticación
    this.authService.authStatusChanged.subscribe(() => {
      this.checkAuthStatus();
    });
  }
  
  checkAuthStatus(): void {
    this.isLoggedIn = this.authService.isAuthenticated();
    
    if (this.isLoggedIn) {
      // Obtener información del usuario (desde localStorage o del backend)
      const userData = this.authService.getUserData();
      if (userData) {
        this.userName = userData.name;
      } else {
        // Si no tenemos datos en localStorage, obtenerlos del backend
        this.userService.getUserInfo().subscribe({
          next: (user) => {
            this.userName = user.name;
          },
          error: (err) => {
            console.error('Error obteniendo información del usuario:', err);
          }
        });
      }
      
      // Opcional: obtener notificaciones pendientes
      this.getNotifications();
    }
  }
  
  logout(event?: Event): void {
    if (event) {
      event.preventDefault();
    }
 
    this.authService.logout();
    

    this.isLoggedIn = false;
    this.userName = '';
    this.notificationCount = 0;
    this.cdr.detectChanges();
  }
  
  // Método para obtener notificaciones (opcional)
  getNotifications(): void {
    // Implementa la lógica para obtener notificaciones
    // Por ejemplo, órdenes pendientes o mensajes nuevos
    this.notificationCount = 0; // Actualiza con el número real
  }
}

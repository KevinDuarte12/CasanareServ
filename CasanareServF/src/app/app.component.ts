import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { InactivityService } from './services/inactivity.service';
import { AuthService } from './services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'CasanareServ';
  private authSubscription: Subscription = new Subscription();
  
  constructor(
    private inactivityService: InactivityService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Iniciar monitoreo si ya está autenticado
    if (this.authService.isAuthenticated()) {
      this.inactivityService.startMonitoring();
    }

    // Suscribirse a cambios de autenticación
    this.authSubscription = this.authService.authStatusChanged.subscribe(isAuthenticated => {
      if (isAuthenticated) {
        this.inactivityService.startMonitoring();
      } else {
        this.inactivityService.stopMonitoring();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
    this.inactivityService.stopMonitoring();
  }
}

import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { ToastrService } from 'ngx-toastr';

@Injectable({
  providedIn: 'root'
})
export class InactivityService {
  private timeout: any;
  private warningTimeout: any;
  private readonly INACTIVITY_TIME = 1800000; // 30 minutos en ms
  private readonly WARNING_TIME = 1700000; // 28:20 minutos (aviso previo)
  private isMonitoring = false;
  private listeners: { [key: string]: () => void } = {};

  constructor(
    private router: Router, 
    private authService: AuthService,
    private toastr: ToastrService
  ) {}

  startMonitoring(): void {
    if (this.isMonitoring) return;
    
    console.log('Iniciando monitoreo de inactividad');
    this.isMonitoring = true;
    this.resetTimer();
    
    // Crear funciones para cada evento y guardarlas para poder removerlas después
    const events = ['mousemove', 'mousedown', 'click', 'scroll', 'keypress', 'touchstart'];
    
    events.forEach(event => {
      // Guardar referencia a la función para poder removerla después
      this.listeners[event] = () => this.resetTimer();
      window.addEventListener(event, this.listeners[event]);
    });
  }

  resetTimer(): void {
    // Limpiar ambos timers
    clearTimeout(this.timeout);
    clearTimeout(this.warningTimeout);
    
    // Configurar el timer de advertencia previa
    this.warningTimeout = setTimeout(() => {
      if (this.authService.isAuthenticated()) {
        // Mostrar advertencia 100 segundos antes de cerrar sesión
        this.toastr.warning(
          'Tu sesión va a expirar pronto por inactividad', 
          'Advertencia', 
          {
            timeOut: 10000,
            progressBar: true,
            closeButton: true,
            tapToDismiss: false
          }
        );
      }
    }, this.WARNING_TIME);
    
    // Configurar el timer de cierre de sesión
    this.timeout = setTimeout(() => {
      console.log('Tiempo de inactividad alcanzado');
      if (this.authService.isAuthenticated()) {
        console.log('Cerrando sesión por inactividad');
        this.toastr.info(
          'Tu sesión ha expirado por inactividad', 
          'Sesión finalizada', 
          {
            timeOut: 5000,
            progressBar: true
          }
        );
        
        // Pequeña pausa para que el usuario vea el mensaje
        setTimeout(() => {
          this.authService.logout();
          this.router.navigate(['/login'], { 
            queryParams: { 
              message: 'session-expired' 
            }
          });
        }, 1000);
      }
    }, this.INACTIVITY_TIME);
  }

  stopMonitoring(): void {
    if (!this.isMonitoring) return;
    
    console.log('Deteniendo monitoreo de inactividad');
    clearTimeout(this.timeout);
    clearTimeout(this.warningTimeout);
    this.isMonitoring = false;
    
    // Remover los event listeners
    const events = ['mousemove', 'mousedown', 'click', 'scroll', 'keypress', 'touchstart'];
    events.forEach(event => {
      if (this.listeners[event]) {
        window.removeEventListener(event, this.listeners[event]);
        delete this.listeners[event];
      }
    });
  }
}

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
  
  // ✅ CONTROLES PARA EVITAR MÚLTIPLES LLAMADOS
  private warningShown = false;
  private logoutInProgress = false;
  private lastActivity = Date.now();

  constructor(
    private router: Router, 
    private authService: AuthService,
    private toastr: ToastrService
  ) {
    console.log('🔧 InactivityService inicializado');
  }

  startMonitoring(): void {
    // ✅ VERIFICAR SI YA ESTÁ MONITOREANDO
    if (this.isMonitoring) {
      console.log('⚠️ Monitoreo ya está activo, omitiendo');
      return;
    }
    
    // ✅ VERIFICAR SI EL USUARIO ESTÁ AUTENTICADO
    if (!this.authService.isAuthenticated()) {
      console.log('⚠️ Usuario no autenticado, no iniciando monitoreo');
      return;
    }
    
    console.log('🔍 Iniciando monitoreo de inactividad');
    this.isMonitoring = true;
    this.warningShown = false;
    this.logoutInProgress = false;
    this.lastActivity = Date.now();
    this.resetTimer();
    
    // Crear funciones para cada evento y guardarlas para poder removerlas después
    const events = ['mousemove', 'mousedown', 'click', 'scroll', 'keypress', 'touchstart'];
    
    events.forEach(event => {
      // Guardar referencia a la función para poder removerla después
      this.listeners[event] = () => this.onUserActivity();
      window.addEventListener(event, this.listeners[event]);
    });
  }

  // ✅ NUEVA FUNCIÓN PARA MANEJAR ACTIVIDAD DEL USUARIO
  private onUserActivity(): void {
    const now = Date.now();
    
    // ✅ THROTTLING - Solo resetear si han pasado al menos 1 segundo
    if (now - this.lastActivity > 1000) {
      this.lastActivity = now;
      this.warningShown = false; // Resetear warning cuando hay actividad
      this.resetTimer();
    }
  }

  resetTimer(): void {
    // ✅ VERIFICAR SI YA SE ESTÁ PROCESANDO LOGOUT
    if (this.logoutInProgress) {
      console.log('🔄 Logout ya en progreso, omitiendo reset timer');
      return;
    }

    // ✅ VERIFICAR SI EL USUARIO SIGUE AUTENTICADO
    if (!this.authService.isAuthenticated()) {
      console.log('👤 Usuario no autenticado, deteniendo monitoreo');
      this.stopMonitoring();
      return;
    }

    // Limpiar ambos timers
    clearTimeout(this.timeout);
    clearTimeout(this.warningTimeout);
    
    // Configurar el timer de advertencia previa
    this.warningTimeout = setTimeout(() => {
      // ✅ VERIFICAR CONDICIONES ANTES DE MOSTRAR WARNING
      if (this.authService.isAuthenticated() && !this.warningShown && !this.logoutInProgress) {
        this.warningShown = true;
        console.log('⚠️ Mostrando advertencia de inactividad');
        
        // Mostrar advertencia 100 segundos antes de cerrar sesión
        this.toastr.warning(
          'Tu sesión va a expirar pronto por inactividad', 
          'Advertencia', 
          {
            timeOut: 10000,
            progressBar: true,
            closeButton: true,
            tapToDismiss: false,
            positionClass: 'toast-top-right'
          }
        );
      }
    }, this.WARNING_TIME);
    
    // Configurar el timer de cierre de sesión
    this.timeout = setTimeout(() => {
      this.handleInactivityLogout();
    }, this.INACTIVITY_TIME);
  }

  // ✅ NUEVA FUNCIÓN PARA MANEJAR LOGOUT POR INACTIVIDAD
  private handleInactivityLogout(): void {
    console.log('⏰ Tiempo de inactividad alcanzado');
    
    // ✅ VERIFICAR SI YA SE ESTÁ PROCESANDO
    if (this.logoutInProgress) {
      console.log('🔄 Logout ya en progreso, omitiendo');
      return;
    }

    // ✅ VERIFICAR SI EL USUARIO SIGUE AUTENTICADO
    if (!this.authService.isAuthenticated()) {
      console.log('👤 Usuario ya no autenticado, omitiendo logout');
      this.stopMonitoring();
      return;
    }

    console.log('🚪 Cerrando sesión por inactividad');
    this.logoutInProgress = true;
    
    // ✅ DETENER MONITOREO INMEDIATAMENTE
    this.stopMonitoring();
    
    // ✅ MOSTRAR MENSAJE SOLO SI NO SE HA MOSTRADO YA
    this.toastr.info(
      'Tu sesión ha expirado por inactividad', 
      'Sesión finalizada', 
      {
        timeOut: 3000,
        progressBar: true,
        closeButton: true,
        positionClass: 'toast-top-right'
      }
    );
    
    // ✅ PAUSA CORTA PARA QUE EL USUARIO VEA EL MENSAJE
    setTimeout(() => {
      this.authService.logout();
      this.router.navigate(['/login'], { 
        queryParams: { 
          message: 'session-expired' 
        }
      });
      
      // ✅ RESETEAR BANDERA DESPUÉS DEL LOGOUT
      setTimeout(() => {
        this.logoutInProgress = false;
      }, 2000);
    }, 1000);
  }

  stopMonitoring(): void {
    if (!this.isMonitoring) {
      console.log('⚠️ Monitoreo ya está detenido');
      return;
    }
    
    console.log('🛑 Deteniendo monitoreo de inactividad');
    clearTimeout(this.timeout);
    clearTimeout(this.warningTimeout);
    this.isMonitoring = false;
    this.warningShown = false;
    
    // Remover los event listeners
    const events = ['mousemove', 'mousedown', 'click', 'scroll', 'keypress', 'touchstart'];
    events.forEach(event => {
      if (this.listeners[event]) {
        window.removeEventListener(event, this.listeners[event]);
        delete this.listeners[event];
      }
    });
  }

  // ✅ MÉTODO PÚBLICO PARA VERIFICAR ESTADO
  isCurrentlyMonitoring(): boolean {
    return this.isMonitoring;
  }

  // ✅ MÉTODO PÚBLICO PARA FORZAR RESET (útil para testing)
  forceReset(): void {
    if (this.isMonitoring && !this.logoutInProgress) {
      console.log('🔄 Forzando reset de timer de inactividad');
      this.warningShown = false;
      this.resetTimer();
    }
  }
}

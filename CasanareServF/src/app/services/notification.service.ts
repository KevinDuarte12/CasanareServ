import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, interval, Subscription, of } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { environment } from '../../environment/environment';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from './auth.service';

export interface Notification {
  id_notification: number;
  id_user: number; 
  type: string;
  title: string;
  message: string;
  entity_type: string;
  entity_id: number;
  is_read: boolean;
  action_url?: string;
  created_at: Date;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService implements OnDestroy {
  private apiUrl = environment.endpoint + 'api/notifications';
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  private unreadCountSubject = new BehaviorSubject<number>(0);
  private pollingSubscription?: Subscription;
  private authSubscription?: Subscription;
  private isInitialized = false;
  
  public notifications$ = this.notificationsSubject.asObservable();
  public unreadCount$ = this.unreadCountSubject.asObservable();
  
  constructor(
    private http: HttpClient,
    private toastr: ToastrService,
    private authService: AuthService
  ) {
    // Iniciar el servicio automáticamente si el usuario está autenticado
    if (this.authService.isAuthenticated()) {
      this.initNotificationService();
    }
    
    // Suscribirse a cambios en el estado de autenticación usando EventEmitter
    this.authSubscription = this.authService.authStatusChanged.subscribe(isAuthenticated => {
      if (isAuthenticated) {
        this.initNotificationService();
      } else {
        this.stopPolling();
        this.resetState();
      }
    });
  }
  
  // Inicializar el servicio de notificaciones
  private initNotificationService(): void {
    if (this.isInitialized) return;
    
    // Usar getUserData() del AuthService para obtener el ID de usuario
    const userData = this.authService.getUserData();
    if (!userData) return;
    
    try {
      const userId = userData.id;
      
      if (userId) {
        this.refreshNotifications(userId);
        this.startPolling(userId);
        this.isInitialized = true;
      }
    } catch (error) {
      console.error('Error inicializando servicio de notificaciones:', error);
    }
  }
  
  // Obtener cabeceras con el token
  private getHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'x-token': token || ''
    };
  }
  
  // Cargar notificaciones del usuario con manejo de errores
  loadUserNotifications(userId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/user/${userId}`, { headers: this.getHeaders() })
      .pipe(
        catchError(this.handleError<any>('loadUserNotifications', { notifications: [] }))
      );
  }
  
  // Obtener conteo de no leídas con manejo de errores
  getUnreadCount(userId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/user/${userId}/unread-count`, { headers: this.getHeaders() })
      .pipe(
        catchError(this.handleError<any>('getUnreadCount', { unread_count: 0 }))
      );
  }
  
  // Marcar como leída con manejo de errores
  markAsRead(notificationId: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${notificationId}/read`, {}, { headers: this.getHeaders() })
      .pipe(
        tap(() => {
          // Actualizar estado local sin necesidad de recargar del servidor
          const currentNotifications = this.notificationsSubject.value;
          const updatedNotifications = currentNotifications.map(n => {
            if (n.id_notification === notificationId) {
              return { ...n, is_read: true };
            }
            return n;
          });
          
          this.notificationsSubject.next(updatedNotifications);
          this.updateLocalUnreadCount();
        }),
        catchError(this.handleError<any>('markAsRead', {}))
      );
  }
  
  // Marcar todas como leídas con manejo de errores
  markAllAsRead(userId: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/user/${userId}/read-all`, {}, { headers: this.getHeaders() })
      .pipe(
        tap(() => {
          // Actualizar estado local sin necesidad de recargar del servidor
          const currentNotifications = this.notificationsSubject.value;
          const updatedNotifications = currentNotifications.map(n => ({ ...n, is_read: true }));
          
          this.notificationsSubject.next(updatedNotifications);
          this.unreadCountSubject.next(0);
        }),
        catchError(this.handleError<any>('markAllAsRead', {}))
      );
  }
  
  // Eliminar notificación con manejo de errores
  deleteNotification(notificationId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${notificationId}`, { headers: this.getHeaders() })
      .pipe(
        tap(() => {
          // Actualizar estado local sin necesidad de recargar del servidor
          const currentNotifications = this.notificationsSubject.value;
          const updatedNotifications = currentNotifications.filter(
            n => n.id_notification !== notificationId
          );
          
          this.notificationsSubject.next(updatedNotifications);
          this.updateLocalUnreadCount();
        }),
        catchError(this.handleError<any>('deleteNotification', {}))
      );
  }
  
  // Actualizar el conteo de notificaciones no leídas en base a datos locales
  private updateLocalUnreadCount(): void {
    const unreadCount = this.notificationsSubject.value.filter(n => !n.is_read).length;
    this.unreadCountSubject.next(unreadCount);
  }
  
  // Iniciar polling de notificaciones cada 30 segundos
  private startPolling(userId: number): void {
    this.stopPolling(); // Asegurar que no haya un polling existente
    
    // Crear intervalo cada 30 segundos
    this.pollingSubscription = interval(30000).pipe(
      switchMap(() => {
        // Solo hacer polling si el usuario sigue autenticado
        if (this.authService.isAuthenticated()) {
          return this.refreshNotificationsQuietly(userId);
        }
        return of(null);
      })
    ).subscribe();
  }
  
  // Detener polling
  private stopPolling(): void {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
      this.pollingSubscription = undefined;
    }
  }
  
  // Reiniciar estado
  private resetState(): void {
    this.notificationsSubject.next([]);
    this.unreadCountSubject.next(0);
    this.isInitialized = false;
  }
  
  // Actualizar notificaciones en silencio (sin mostrar errores al usuario)
  private refreshNotificationsQuietly(userId: number): Observable<any> {
    return this.loadUserNotifications(userId).pipe(
      tap(response => {
        if (response?.notifications) {
          this.notificationsSubject.next(response.notifications);
        }
      }),
      switchMap(() => this.getUnreadCount(userId)),
      tap(response => {
        if (response?.unread_count !== undefined) {
          this.unreadCountSubject.next(response.unread_count);
        }
      }),
      catchError(error => {
        console.error('Error en actualización silenciosa de notificaciones:', error);
        return of(null);
      })
    );
  }
  
  // Inicializar y actualizar datos en memoria con feedback de UI
  refreshNotifications(userId: number): void {
    this.loadUserNotifications(userId).subscribe({
      next: response => {
        if (response?.notifications) {
          this.notificationsSubject.next(response.notifications);
        } else {
          this.notificationsSubject.next([]);
        }
      },
      error: error => {
        console.error('Error cargando notificaciones:', error);
        this.notificationsSubject.next([]);
      }
    });
    
    this.getUnreadCount(userId).subscribe({
      next: response => {
        if (response?.unread_count !== undefined) {
          this.unreadCountSubject.next(response.unread_count);
        } else {
          this.unreadCountSubject.next(0);
        }
      },
      error: error => {
        console.error('Error obteniendo conteo de notificaciones:', error);
        this.unreadCountSubject.next(0);
      }
    });
  }
  
  // Método genérico para manejar errores HTTP
  private handleError<T>(operation = 'operation', result?: T) {
    return (error: HttpErrorResponse): Observable<T> => {
      // Si el error es de autenticación, no mostrar mensaje
      if (error.status === 401) {
        console.error(`${operation} falló: Error de autenticación`);
      } else {
        console.error(`${operation} falló:`, error.message);
        
        // Solo mostrar notificación para errores críticos
        if (operation !== 'loadUserNotifications' && operation !== 'getUnreadCount') {
          this.toastr.error(`Error en la operación: ${error.message}`, 'Error');
        }
      }
      
      // Devolver un resultado seguro para que la aplicación siga funcionando
      return of(result as T);
    };
  }
  
  // Limpiar recursos al destruir el servicio
  ngOnDestroy(): void {
    this.stopPolling();
    // Limpiar también la suscripción a cambios de autenticación
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }
}
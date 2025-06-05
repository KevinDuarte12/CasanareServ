import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, interval, Subscription, of, throwError } from 'rxjs';
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
  action_url?: string | null;
  created_at: Date;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService implements OnDestroy {
  private apiUrl = `${environment.endpoint}api/notifications`;
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
    console.log('🚀 Inicializando servicio de notificaciones');
    
    if (this.isInitialized) {
      console.log('⏭️ Servicio ya inicializado, omitiendo');
      return;
    }
    
    // Verificar primero si la API está disponible
    this.checkApiEndpoint().subscribe(available => {
      if (!available) {
        console.warn('⚠️ API de notificaciones no disponible, usando datos simulados');
        this.notificationsSubject.next(this.generateMockNotifications());
        this.unreadCountSubject.next(2);
        return;
      }
      
      // Continuar con la inicialización normal
      const userData = this.authService.getUserData();
      if (!userData) {
        console.warn('⚠️ No hay datos de usuario disponibles');
        return;
      }
      
      try {
        const userId = userData.id;
        if (userId) {
          console.log('📡 Iniciando carga de notificaciones');
          this.refreshNotifications(userId);
          console.log('⏱️ Configurando polling');
          this.startPolling(userId);
          this.isInitialized = true;
          console.log('✅ Servicio de notificaciones inicializado');
        }
      } catch (error) {
        console.error('❌ Error inicializando servicio:', error);
      }
    });
  }
  
  // Obtener cabeceras con el token
  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }
  
  // Obtener todas las notificaciones del usuario
  getUserNotifications(userId: number, page: number = 1, limit: number = 20): Observable<any> {
    return this.http.get(
      `${this.apiUrl}/user/${userId}?page=${page}&limit=${limit}`, 
      { headers: this.getHeaders() }
    );
  }
  
  // Corrige el método markAsRead
  markAsRead(notificationId: number): Observable<any> {
    console.log(`Intentando marcar como leída la notificación ${notificationId}`);
    
    // Cambiar esta URL para que coincida con la que espera el backend
    return this.http.patch(
      `${this.apiUrl}/${notificationId}/read`, // Agregar "/read" al final
      { is_read: true },
      { headers: this.getHeaders() }
    ).pipe(
      tap(() => {
        console.log(`Notificación ${notificationId} marcada como leída correctamente`);
        this.updateLocalNotificationStatus(notificationId, true);
      }),
      catchError(error => {
        console.error(`Error al marcar notificación ${notificationId} como leída:`, error);
        return of({ success: false, error });
      })
    );
  }
  
  // Añadir este método de ayuda
  private updateLocalNotificationStatus(notificationId: number, isRead: boolean): void {
    const currentNotifications = this.notificationsSubject.value;
    const updatedNotifications = currentNotifications.map(notification => {
      if (notification.id_notification === notificationId) {
        return { ...notification, is_read: isRead };
      }
      return notification;
    });
    
    this.notificationsSubject.next(updatedNotifications);
    this.updateLocalUnreadCount();
  }
  
  // Marcar todas las notificaciones como leídas
  markAllAsRead(userId: number): Observable<any> {
    console.log(`📝 Marcando todas las notificaciones como leídas para usuario ${userId}`);
    
    return this.http.patch(
      `${this.apiUrl}/user/${userId}/read-all`,
      {}, // cuerpo vacío
      { headers: this.getHeaders() }
    ).pipe(
      tap(response => {
        console.log('✅ Respuesta de marcar todas como leídas:', response);
        
        // Actualizar estado local de forma más robusta
        try {
          const currentNotifications = this.notificationsSubject.value || [];
          const updatedNotifications = currentNotifications.map(n => ({
            ...n,
            is_read: true
          }));
          
          this.notificationsSubject.next(updatedNotifications);
          this.unreadCountSubject.next(0);
          
          // Mostrar mensaje de éxito
          console.log('✅ Estado local actualizado correctamente');
        } catch (err) {
          console.error('❌ Error al actualizar estado local:', err);
        }
      }),
      catchError(error => {
        console.error('❌ Error en markAllAsRead:', error);
        console.error('Detalles del error:', {
          status: error.status,
          statusText: error.statusText,
          url: error.url,
          message: error.message,
          error: error.error
        });
        
        // En caso de error, intentar recargar del servidor
        setTimeout(() => this.refreshNotifications(userId), 1000);
        
        return throwError(() => new Error('Error al marcar todas las notificaciones como leídas'));
      })
    );
  }
  
  // Obtener el conteo de notificaciones no leídas
  getUnreadCount(userId: number): Observable<any> {
    // ✅ VERIFICAR ANTES DE HACER LA PETICIÓN
    if (!this.shouldMakeRequest()) {
      console.log('🔇 Cancelando getUnreadCount por usuario no autenticado');
      return of({ count: 0 });
    }
    
    return this.http.get(`${this.apiUrl}/user/${userId}/unread-count`).pipe(
      tap(response => {
        console.log('📊 Conteo de no leídas obtenido:', response);
      }),
      catchError(error => {
        // ✅ NO MOSTRAR errores 401 durante logout
        if (error.status !== 401) {
          console.error('❌ Error al obtener conteo de no leídas:', error);
        }
        return of({ count: 0 });
      })
    );
  }
  
  // Corrige este método:
  deleteNotification(notificationId: number): Observable<any> {
    console.log(`🗑️ Eliminando notificación con ID: ${notificationId}`);
    
    if (!notificationId) {
      console.error('❌ Error: ID de notificación no definido');
      return throwError(() => new Error('ID de notificación no definido'));
    }
    
    return this.http.delete(
      `${this.apiUrl}/${notificationId}`, 
      { headers: this.getHeaders() }
    ).pipe(
      tap(() => {
        console.log(`✅ Notificación ${notificationId} eliminada correctamente`);
        // Actualizar estado local
        this.updateLocalAfterDelete(notificationId);
      }),
      catchError(error => {
        console.error(`❌ Error al eliminar notificación ${notificationId}:`, error);
        return throwError(() => error);
      })
    );
  }
  
  // Añade este método auxiliar:
  private updateLocalAfterDelete(notificationId: number): void {
    const currentNotifications = this.notificationsSubject.value;
    const updatedNotifications = currentNotifications.filter(
      n => n.id_notification !== notificationId
    );
    this.notificationsSubject.next(updatedNotifications);
    this.updateLocalUnreadCount();
  }
  
  // Cargar notificaciones del usuario con manejo de errores
  loadUserNotifications(userId: number): Observable<any> {
    console.log(`📨 Intentando cargar notificaciones para usuario ${userId}`);
    console.log(`📍 URL completa: ${this.apiUrl}/user/${userId}`);
    
    // Log de headers para verificar el token
    const headers = this.getHeaders();
    console.log(`🔑 Cabeceras utilizadas:`, headers);
    
    return this.http.get<any>(`${this.apiUrl}/user/${userId}`, { headers }).pipe(
      tap(response => {
        console.log(`✅ Respuesta exitosa de notificaciones:`, response);
        console.log(`📊 Cantidad de notificaciones: ${response?.notifications?.length || 0}`);
      }),
      catchError(error => {
        console.error('❌ loadUserNotifications falló:', error);
        console.error('Detalles del error:', {
          status: error.status,
          statusText: error.statusText,
          url: error.url,
          message: error.message,
          name: error.name,
          error: error.error
        });
        
        // Mostrar la ruta completa para verificar que es correcta
        console.log(`🔍 La ruta ${this.apiUrl}/user/${userId} no está disponible`);
        
        // Datos simulados para desarrollo
        console.log('⚠️ Devolviendo datos simulados');
        return of({
          success: true,
          notifications: [
            {
              id_notification: 1,
              id_user: userId,
              type: 'new_barter',
              title: 'Nueva propuesta de trueque',
              message: 'Has recibido una propuesta de trueque por tu producto "PlayStation 5"',
              entity_type: 'barter',
              entity_id: 1,
              is_read: false,
              created_at: new Date(),
              action_url: null
            },
            {
              id_notification: 2,
              id_user: userId,
              type: 'system',
              title: 'Bienvenido a CasanareServ',
              message: 'Gracias por registrarte en nuestra plataforma',
              entity_type: 'system',
              entity_id: 0,
              is_read: true,
              created_at: new Date(Date.now() - 86400000), // Ayer
              action_url: null
            }
          ]
        });
      })
    );
  }
  
  // Obtener conteo de no leídas con manejo de errores
  getUnreadCountWithErrorHandling(userId: number): Observable<any> {
    console.log(`🔢 Intentando obtener conteo de notificaciones para usuario ${userId}`);
    console.log(`📍 URL completa: ${this.apiUrl}/user/${userId}/unread-count`);
    
    return this.http.get<any>(`${this.apiUrl}/user/${userId}/unread-count`, { headers: this.getHeaders() }).pipe(
      tap(response => {
        console.log(`✅ Respuesta exitosa de conteo:`, response);
        console.log(`📊 Notificaciones no leídas: ${response?.unread_count || 0}`);
      }),
      catchError(error => {
        console.error('❌ getUnreadCount falló:', error);
        console.error('Detalles del error:', {
          status: error.status,
          statusText: error.statusText,
          url: error.url,
          message: error.message,
          name: error.name,
          error: error.error
        });
        
        // Verificar si es un problema de CORS
        if (error.status === 0) {
          console.error('🌐 Posible error de CORS o red');
        }
        
        // Usar datos simulados en caso de error
        console.log('⚠️ Devolviendo conteo simulado');
        return of({ 
          success: true,
          unread_count: 2 // Un número fijo para desarrollo
        });
      })
    );
  }
  
  // Marcar como leída con manejo de errores
  markAsReadWithErrorHandling(notificationId: number): Observable<any> {
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
  markAllAsReadWithErrorHandling(userId: number): Observable<any> {
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
  deleteNotificationWithErrorHandling(notificationId: number): Observable<any> {
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
      switchMap(() => this.getUnreadCountWithErrorHandling(userId)),
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
  
  // Añade este método al servicio
  checkApiEndpoint(): Observable<boolean> {
    console.log('🔍 Verificando si el endpoint de notificaciones está disponible');
    return this.http.get<any>(`${this.apiUrl}/debug`).pipe(
      tap(response => {
        console.log('✅ Endpoint de notificaciones disponible:', response);
        return true;
      }),
      catchError(error => {
        console.error('❌ Error accediendo al endpoint de notificaciones:', error);
        return of(false);
      })
    );
  }

  // Añade método para generar notificaciones de prueba
  private generateMockNotifications(): Notification[] {
    const userId = this.authService.getUserData()?.id || 0;
    return [
      {
        id_notification: 1,
        id_user: userId,
        type: 'new_barter',
        title: 'Nueva propuesta de trueque',
        message: 'Has recibido una propuesta de trueque por tu producto "PlayStation 5"',
        entity_type: 'barter',
        entity_id: 1,
        is_read: false,
        created_at: new Date(),
        action_url: null
      },
      {
        id_notification: 2,
        id_user: userId,
        type: 'system',
        title: 'Bienvenido a CasanareServ',
        message: 'Gracias por registrarte en nuestra plataforma',
        entity_type: 'system',
        entity_id: 0,
        is_read: true,
        created_at: new Date(Date.now() - 86400000), // Ayer
        action_url: null
      }
    ];
  }

  // Limpiar recursos al destruir el servicio
  ngOnDestroy(): void {
    this.stopPolling();
    // Limpiar también la suscripción a cambios de autenticación
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  // Añadir este método al servicio
  deleteAllNotifications(userId: number): Observable<any> {
    console.log(`🗑️ Eliminando todas las notificaciones para usuario ${userId}`);
    
    return this.http.delete(
      `${this.apiUrl}/user/${userId}/all`, 
      { headers: this.getHeaders() }
    ).pipe(
      tap(() => {
        console.log(`✅ Todas las notificaciones eliminadas correctamente`);
        // Actualizar estado local
        this.notificationsSubject.next([]);
        this.unreadCountSubject.next(0);
      }),
      catchError(error => {
        console.error(`❌ Error al eliminar todas las notificaciones:`, error);
        return throwError(() => error);
      })
    );
  }

  // ✅ AGREGAR: Método para verificar si debe hacer peticiones
  private shouldMakeRequest(): boolean {
    // Verificar si hay token y usuario logueado
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('userData');
    
    if (!token || !userData) {
      console.log('🔇 NotificationService: Sin token o datos de usuario, cancelando petición');
      return false;
    }
    
    // Verificar si el AuthService considera que está autenticado
    try {
      const isAuth = this.authService.isAuthenticated();
      if (!isAuth) {
        console.log('🔇 NotificationService: Usuario no autenticado según AuthService');
        return false;
      }
    } catch (error) {
      console.log('🔇 NotificationService: Error verificando autenticación');
      return false;
    }
    
    return true;
  }


  
  getNotifications(userId: number): Observable<any> {
    // ✅ VERIFICAR ANTES DE HACER LA PETICIÓN
    if (!this.shouldMakeRequest()) {
      console.log('🔇 Cancelando getNotifications por usuario no autenticado');
      return of({ notifications: [] });
    }
    
    return this.http.get(`${this.apiUrl}/user/${userId}`).pipe(
      catchError(error => {
        if (error.status !== 401) {
          console.error('❌ Error al obtener notificaciones:', error);
        }
        return of({ notifications: [] });
      })
    );
  }
  
  // ✅ MODIFICAR: Método de refresh para verificar estado
  refreshNotifications(userId: number): void {
    if (!userId || !this.shouldMakeRequest()) {
      console.log('🔇 Cancelando refresh de notificaciones');
      return;
    }
    
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
    
    this.getUnreadCountWithErrorHandling(userId).subscribe({
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
}
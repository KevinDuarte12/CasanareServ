import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { environment } from '../../environment/environment';
import { AuthService } from './auth.service';
import { NotificationService } from './notification.service';
import { ToastrService } from 'ngx-toastr';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket: Socket | null = null;
  private connected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor(
    private authService: AuthService,
    private notificationService: NotificationService,
    private toastr: ToastrService
  ) {
    // Intentar conectar si el usuario ya está autenticado
    if (this.authService.isAuthenticated()) {
      this.connect();
    }

    // Escuchar cambios en la autenticación
    this.authService.authStatusChanged.subscribe(isAuthenticated => {
      if (isAuthenticated) {
        this.connect();
      } else {
        this.disconnect();
      }
    });
  }

  // Cambiar a público para que el componente pueda llamarlo
  public connect(): void {
    if (this.connected) return;

    try {
      console.log('🔌 Intentando conectar al servidor Socket.IO...', environment);
        
      // Comprobar si la URL del socket está definida
      if (!environment.socketUrl) {
        console.error('❌ Error: socketUrl no está definida en el entorno');
        return;
      }

      console.log(`🔌 Conectando a: ${environment.socketUrl}`);
        
      // Primero intentar verificar si el servidor está disponible
      fetch(`${environment.endpoint}api/health`)
        .then(response => {
          if (!response.ok) throw new Error('API no disponible');
          return response.json();
        })
        .then(data => {
          console.log('✅ API disponible:', data);
          this.initializeSocket();
        })
        .catch(error => {
          console.error('❌ API no disponible:', error);
          // Intentar inicializar el socket de todos modos
          setTimeout(() => this.initializeSocket(), 2000);
        });
    } catch (error) {
      console.error('❌ Error en connect():', error);
    }
  }

  private initializeSocket(): void {
    try {
      // Usar exactamente la misma URL base que en environment.socketUrl
      this.socket = io(environment.socketUrl, {
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000,
        forceNew: true, // Forzar nueva conexión
        autoConnect: true
      });

      console.log('🔌 Socket inicializado, esperando conexión...');

      // Resto del código de escucha de eventos...
      this.socket.on('connect', () => {
        console.log('✅ Conectado al servidor de sockets!', this.socket!.id);
        this.connected = true;
        this.reconnectAttempts = 0;
          
        // Evento de depuración
        console.log('🔄 Autenticando socket con ID de usuario...');
          
        // Autenticar con el ID de usuario
        const userData = this.authService.getUserData();
        if (userData?.id) {
          this.socket!.emit('authenticate', userData.id);
        } else {
          console.warn('⚠️ No hay ID de usuario para autenticar socket');
        }
      });

      // Resto de los eventos...
      this.setupSocketEvents();

    } catch (error) {
      console.error('❌ Error al inicializar socket:', error);
    }
  }

  private setupSocketEvents(): void {
    if (!this.socket) return;

    // Confirmación de autenticación
    this.socket.on('authenticated', (data) => {
      console.log('✅ Socket autenticado para usuario:', data.userId);
    });

    // Evento de prueba
    this.socket.on('socket_connected', (data) => {
      console.log('📣 Mensaje del servidor:', data.message);
    });

    this.socket.on('disconnect', (reason) => {
      console.log(`❌ Desconectado del servidor de sockets. Razón: ${reason}`);
      this.connected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Error de conexión de socket:', error);
      this.reconnectAttempts++;
        
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('🛑 Máximos intentos de reconexión alcanzados');
        this.disconnect();
      }
    });

    // Escuchar nuevas notificaciones
    this.socket.on('new_notification', (notification) => {
      console.log('Nueva notificación recibida:', notification);
        
      // Mostrar notificación toast
      this.toastr.info(
        notification.message,
        notification.title,
        { timeOut: 5000, positionClass: 'toast-bottom-right' }
      );
        
      // Actualizar servicio de notificaciones
      const userId = this.authService.getUserData()?.id;
      if (userId) {
        this.notificationService.refreshNotifications(userId);
      }
    });

    // Escuchar actualizaciones de trueques
    this.socket.on('barter_updated', (data) => {
      console.log('Actualización de trueque recibida:', data);
      // Podríamos actualizar un servicio de trueques aquí
    });
  }

  // Método auxiliar para verificar si el socket está listo
  private isSocketReady(): boolean {
    return this.socket !== null && this.connected;
  }

  // Añadir un método público para comprobar si el socket está conectado
  public isConnected(): boolean {
    return this.connected && this.socket !== null;
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }

  // Método para enviar un evento personalizado
  public emit(event: string, data: any): void {
    if (!this.isSocketReady() || !this.socket) {
      console.warn(`No se puede emitir evento '${event}': socket no está listo`);
      return;
    }
    
    this.socket.emit(event, data);
  }

  // Añadir método para escuchar eventos (devuelve una Subscription)
  public on(event: string, callback: (data: any) => void): Subscription {
    if (!this.isSocketReady() || !this.socket) {
      console.warn(`No se puede escuchar evento '${event}': socket no está listo`);
      return new Subscription();
    }

    this.socket.on(event, callback);
    
    // Devolver un objeto Subscription para limpiar más tarde
    return new Subscription(() => {
      if (this.socket) {
        this.socket.off(event, callback);
      }
    });
  }

  // Añade este método para escuchar nuevas notificaciones
  onNewNotification(): Observable<any> {
    return new Observable(observer => {
      if (!this.socket) {
        observer.error('Socket no conectado');
        return;
      }

      this.socket.on('new_notification', (notification: any) => {
        console.log('📣 Socket: nueva notificación recibida', notification);
        observer.next(notification);
      });

      // Cleanup cuando se hace unsubscribe
      return () => {
        if (this.socket) {
          this.socket.off('new_notification');
        }
      };
    });
  }

  // Método para unirse a una sala de chat
  public joinChatRoom(type: 'product' | 'barter', id: number): void {
    if (!this.isSocketReady() || !this.socket) {
      console.warn('No se puede unir a la sala: socket no está listo');
      return;
    }
    
    const roomId = `${type}_chat_${id}`;
    console.log(`🔄 Uniéndose a la sala de chat: ${roomId}`);
    this.socket.emit('join_room', roomId);
  }

  public leaveChatRoom(type: 'product' | 'barter', id: number): void {
    if (!this.isSocketReady() || !this.socket) return;
    
    const roomId = `${type}_chat_${id}`;
    console.log(`🚪 Saliendo de la sala de chat: ${roomId}`);
    this.socket.emit('leave_room', roomId);
  }
}
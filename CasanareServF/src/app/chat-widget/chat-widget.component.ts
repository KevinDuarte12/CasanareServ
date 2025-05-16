import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { ChatService } from '../services/chat.service';
import { FormsModule } from '@angular/forms';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { HeaderComponent } from '../header/header.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { FooterComponent } from '../footer/footer.component';
import { SocketService } from '../services/socket.service';
import { NotificationService } from '../services/notification.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-chat-widget',
  standalone: true,
  imports: [
    FormsModule, 
    CommonModule, 
    RouterModule,
    HeaderComponent,
    NavbarComponent,
    FooterComponent,
    DatePipe
  ],
  templateUrl: './chat-widget.component.html',
  styleUrls: ['./chat-widget.component.css']
})
export class ChatWidgetComponent implements OnInit, OnDestroy {
  @Input() barterId?: number;
  @Input() productId?: number;
  @Input() otherUserName = '';
  @Input() otherUserAvatar = '';
  @Input() currentUserId!: number;
  @Output() close = new EventEmitter<void>();

  // Variables de estado
  isMinimized = false;
  loading = false; // Propiedad necesaria en el template
  messages: any[] = [];
  newMessage = '';
  selectedImage?: File;
  imagePreview?: string;

  // Variables para "está escribiendo"
  isTyping = false;
  otherUserIsTyping = false;
  typingTimeout: any;

  // Variables para carga paginada
  page = 1;
  pageSize = 20;
  hasMoreMessages = true;

  // Suscripciones para limpiar en ngOnDestroy
  private socketSubscriptions: Subscription[] = [];

  // Nueva propiedad para mensajes no leídos
  unreadMessages = 0;

  constructor(
    private chatService: ChatService,
    private route: ActivatedRoute,
    private authService: AuthService,
    private socketService: SocketService,
    private notificationService: NotificationService
  ) {}

  ngOnInit() {
    // Debug avanzado
    console.log('🔍 AUTH DIAGNOSTICS:', {
      isAuth: this.authService.isAuthenticated(),
      hasToken: localStorage.getItem('token') !== null,
      userData: this.authService.getUserData(),
      userDataRaw: localStorage.getItem('userData')
    });

    // Obtener currentUserId si no está establecido
    if (!this.currentUserId) {
      const userData = this.authService.getUserData();
      if (userData && userData.id) {
        this.currentUserId = Number(userData.id);
        console.log(`👤 ID de usuario obtenido: ${this.currentUserId}`);
      } else {
        console.error('⚠️ No hay un usuario autenticado o falta el ID');
        return;
      }
    }

    // Obtener IDs y parámetros de la ruta
    this.route.params.subscribe(params => {
      if (params['productId']) {
        this.productId = Number(params['productId']);
        console.log(`✓ ProductId desde ruta: ${this.productId}`);
      } else if (params['barterId']) {
        this.barterId = Number(params['barterId']);
        console.log(`✓ BarterId desde ruta: ${this.barterId}`);
      }

      this.route.queryParams.subscribe(qParams => {
        // Obtener información adicional si existe
        if (!this.productId && qParams['productId']) {
          this.productId = Number(qParams['productId']);
        }
        if (!this.barterId && qParams['barterId']) {
          this.barterId = Number(qParams['barterId']);
        }
        if (qParams['otherUserName']) {
          this.otherUserName = qParams['otherUserName'];
        }
        if (qParams['otherUserAvatar']) {
          this.otherUserAvatar = this.fixImagePath(qParams['otherUserAvatar']);
        } else {
          this.otherUserAvatar = '/img/perfil3.png';
        }

        // Inicializar el chat
        this.initializeChat();
      });
    });

    // Conectar al socket y suscribirse a eventos
    this.connectToSocket();
  }

  connectToSocket() {
    // Asegurar que el socket está conectado
    this.socketService.connect();

    // Unirse a la sala de chat apropiada
    if (this.productId) {
      this.socketService.emit('join_room', `product_${this.productId}`);
    } else if (this.barterId) {
      this.socketService.emit('join_room', `barter_${this.barterId}`);
    }

    // Escuchar nuevos mensajes - corregir forma de suscripción
    const newMessageSub = this.socketService.on('new_message', (message: any) => {
      // No mostrar mensajes propios (ya añadidos al enviar)
      if (message.id_user !== this.currentUserId) {
        this.messages.push(message);
        this.showNotificationIfNeeded(message);
        setTimeout(() => this.scrollToBottom(), 100);
      }
    });
    
    if (newMessageSub) this.socketSubscriptions.push(newMessageSub);

    // Escuchar eventos de "está escribiendo"
    const typingSub = this.socketService.on('user_typing', (data: any) => {
      if (data.userId !== this.currentUserId) {
        this.otherUserIsTyping = true;
      }
    });
    
    if (typingSub) this.socketSubscriptions.push(typingSub);

    const stopTypingSub = this.socketService.on('user_stopped_typing', (data: any) => {
      if (data.userId !== this.currentUserId) {
        this.otherUserIsTyping = false;
      }
    });
    
    if (stopTypingSub) this.socketSubscriptions.push(stopTypingSub);
  }

  private initializeChat() {
    console.log('Inicializando chat con:', {
      productId: this.productId,
      barterId: this.barterId,
      otherUserName: this.otherUserName
    });

    this.loading = true;

    if (this.productId) {
      this.loadProductMessages();
    } else if (this.barterId) {
      this.loadBarterMessages();
    } else {
      console.error('❌ Error: No se pudo identificar el tipo de chat (producto o trueque)');
      this.loading = false;
    }
  }

  loadProductMessages() {
    if (!this.productId) return;
    console.log(`📱 Cargando mensajes para producto ${this.productId}...`);
    
    this.chatService.getMessagesByProduct(this.productId).subscribe({
      next: (messages) => {
        this.messages = messages;
        console.log(`📨 ${messages.length} mensajes cargados para producto ${this.productId}`);
        this.loading = false;
        setTimeout(() => this.scrollToBottom(), 100);
      },
      error: (err) => {
        console.error(`❌ Error al cargar mensajes para producto ${this.productId}:`, err);
        this.loading = false;
      }
    });
  }

  loadBarterMessages() {
    if (!this.barterId) return;
    console.log(`📱 Cargando mensajes para trueque ${this.barterId}...`);
    
    this.chatService.getMessagesByBarter(this.barterId).subscribe({
      next: (messages) => {
        this.messages = messages;
        console.log(`📨 ${messages.length} mensajes cargados para trueque ${this.barterId}`);
        this.loading = false;
        setTimeout(() => this.scrollToBottom(), 100);
      },
      error: (err) => {
        console.error(`❌ Error al cargar mensajes para trueque ${this.barterId}:`, err);
        this.loading = false;
      }
    });
  }

  loadMoreMessages() {
    this.page++;
    
    if (this.productId) {
      this.chatService.getMessagesByProduct(this.productId, this.page, this.pageSize)
        .subscribe({
          next: (messages) => {
            if (messages.length < this.pageSize) {
              this.hasMoreMessages = false;
            }
            this.messages = [...messages, ...this.messages]; // Prepend
          },
          error: (error) => {
            console.error('Error al cargar más mensajes:', error);
          }
        });
    } else if (this.barterId) {
      // Similar para barterId
      this.chatService.getMessagesByBarter(this.barterId, this.page, this.pageSize)
        .subscribe({
          next: (messages) => {
            if (messages.length < this.pageSize) {
              this.hasMoreMessages = false;
            }
            this.messages = [...messages, ...this.messages]; // Prepend
          },
          error: (error) => {
            console.error('Error al cargar más mensajes:', error);
          }
        });
    }
  }

  sendMessage() {
    // Mostrar estado actual
    console.log('📩 Chat state:', {
      currentUserId: this.currentUserId,
      productId: this.productId,
      barterId: this.barterId,
      hasMessage: !!this.newMessage,
      hasImage: !!this.selectedImage,
      userData: this.authService.getUserData()
    });
    
    // Asegurarse de que hay un mensaje o una imagen antes de enviar
    if (!this.newMessage && !this.selectedImage) {
      console.warn('No se puede enviar un mensaje vacío');
      return;
    }

    // Verificar que exista al menos un ID de entidad
    if (!this.productId && !this.barterId) {
      console.error('❌ Error: No hay ID de producto ni de trueque disponible');
      return; // Solo salimos sin mostrar toasts ni alterar nada más
    }

    // IMPORTANTE: Crear el objeto de mensaje con valores explícitamente convertidos
    const messageData: any = {
      id_user: Number(this.currentUserId),
      message: this.newMessage || ''
    };

    // Asignar solo uno de los IDs, convertido a número
    if (this.productId) {
      messageData.id_product = Number(this.productId);
    } else if (this.barterId) {
      messageData.id_barter = Number(this.barterId);
    }

    // Si hay imagen, agregarla
    if (this.selectedImage) {
      messageData.image = this.selectedImage;
    }

    // IMPORTANTE: Debug para ver qué estamos enviando exactamente
    console.log('📤 Enviando mensaje con datos:', {
      ...messageData,
      image: messageData.image ? messageData.image.name : undefined
    });

    // Enviar el mensaje
    this.chatService.sendMessage(messageData).subscribe({
      next: (msg) => {
        console.log('✅ Mensaje enviado exitosamente:', msg);
        
        // Agregar el usuario al mensaje para mostrar correctamente
        const messageWithUser = {
          ...msg,
          user: {
            id: this.currentUserId,
            name: this.authService.getUserData()?.name || 'Usuario'
          }
        };
        
        // Si el mensaje fue exitoso, agregarlo a la lista y limpiar el form
        this.messages.push(messageWithUser);
        this.newMessage = '';
        this.selectedImage = undefined;
        this.imagePreview = undefined;
        
        // Notificar al servidor sobre el nuevo mensaje para otros usuarios
        this.socketService.emit('new_message', {
          chatType: this.productId ? 'product' : 'barter',
          chatId: this.productId || this.barterId,
          message: msg,
          senderId: this.currentUserId
        });
        
        setTimeout(() => this.scrollToBottom(), 100);
      },
      error: (error) => {
        console.error('❌ Error al enviar mensaje:', error);
        // Mantener el error en consola sin mostrar alert
      }
    });
  }

  onMessageInput() {
    // No enviar evento si el mensaje está vacío
    if (!this.newMessage || this.newMessage.trim().length === 0) return;

    if (!this.isTyping) {
      this.isTyping = true;
      
      // Emitir evento de escritura
      const roomId = this.productId 
        ? `product_${this.productId}` 
        : `barter_${this.barterId}`;
      
      this.socketService.emit('typing', {
        roomId,
        userId: this.currentUserId,
        userName: this.authService.getUserData()?.name || 'Usuario'
      });
    }
    
    // Resetear timeout
    clearTimeout(this.typingTimeout);
    this.typingTimeout = setTimeout(() => {
      this.isTyping = false;
      
      // Emitir evento de fin de escritura
      const roomId = this.productId 
        ? `product_${this.productId}` 
        : `barter_${this.barterId}`;
      
      this.socketService.emit('stop_typing', {
        roomId,
        userId: this.currentUserId
      });
    }, 2000);
  }

  onImageSelected(event: any) {
    const files = event?.target?.files;
    if (files && files.length > 0) {
      const file = files[0];
      
      // Validar tipo
      if (file.type && !file.type.match(/image\/(jpeg|jpg|png|gif)/)) {
        alert('Solo se permiten imágenes (JPG, PNG, GIF)');
        if (event.target) event.target.value = '';
        return;
      }
      
      // Validar tamaño (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        alert('La imagen es demasiado grande. Máximo 5MB.');
        if (event.target) event.target.value = '';
        return;
      }
      
      this.selectedImage = file;
      if (this.selectedImage) {
        console.log('Imagen seleccionada:', this.selectedImage.name);
      }
      
      // Mostrar previsualización
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview = reader.result as string;
      };
      reader.readAsDataURL(file);
    } else {
      this.selectedImage = undefined;
      this.imagePreview = undefined;
    }
  }

  scrollToBottom() {
    try {
      const chatContainer = document.querySelector('.chat-messages');
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    } catch (err) {
      console.error('Error al hacer scroll:', err);
    }
  }

  toggleMinimize() {
    this.isMinimized = !this.isMinimized;
  }

  onCloseClick(event: Event) {
    event.preventDefault();
    this.close.emit();
  }

  showNotificationIfNeeded(message: any) {
    // No mostrar notificación para mensajes propios
    if (message.id_user === this.currentUserId) return;
    
    // Mostrar notificación solo si el documento no tiene el foco
    if (!document.hasFocus()) {
      this.showBrowserNotification(
        this.otherUserName || 'Nuevo mensaje', 
        message.message || 'Has recibido un nuevo mensaje'
      );
    }
  }

  private showBrowserNotification(title: string, body: string): void {
    // Verificar si el navegador soporta notificaciones
    if (!('Notification' in window)) {
      console.log('Este navegador no soporta notificaciones');
      return;
    }
    
    // Comprobar si tenemos permiso
    if (Notification.permission === 'granted') {
      this.createNotification(title, body);
    } else if (Notification.permission !== 'denied') {
      // Solicitar permiso
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          this.createNotification(title, body);
        }
      });
    }
  }

  private createNotification(title: string, body: string): void {
    const notification = new Notification(title, {
      body: body,
      icon: this.otherUserAvatar || '/img/icononuevo.png',
      badge: '/img/icononuevo.png'
    });
    
    // Al hacer clic en la notificación, enfocar la ventana
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
    
    // Cerrar automáticamente después de 5 segundos
    setTimeout(() => notification.close(), 5000);
  }

  fixImagePath(path: string | undefined): string {
    if (!path) return '/img/perfil3.png';
    
    // Si es una URL completa, devolverla tal cual
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    
    // Asegurar que la ruta comience con / para que sea relativa a la raíz
    return path.startsWith('/') ? path : `/${path}`;
  }

  // Nuevo método para contar mensajes no leídos
  countUnreadMessages(type: 'product' | 'barter', id: number): void {
    if (!this.currentUserId) return;
    
    const messages = this.messages.filter(msg => 
      msg.id_user !== this.currentUserId && !msg.is_read
    );
    this.unreadMessages = messages.length;
    
    console.log(`📊 Mensajes no leídos en este ${type}: ${this.unreadMessages}`);
  }

  // Nuevo método para marcar todos los mensajes como leídos
  markAllAsRead(): void {
    if (!this.currentUserId) return;
    
    if (this.productId) {
      this.chatService.markMessagesAsRead({
        userId: this.currentUserId,
        productId: this.productId
      }).subscribe({
        next: () => {
          // Marcar mensajes localmente como leídos
          this.messages.forEach(msg => {
            if (msg.id_user !== this.currentUserId) {
              msg.is_read = true;
            }
          });
          this.unreadMessages = 0;
        }
      });
    } else if (this.barterId) {
      this.chatService.markMessagesAsRead({
        userId: this.currentUserId,
        barterId: this.barterId
      }).subscribe({
        next: () => {
          // Marcar mensajes localmente como leídos
          this.messages.forEach(msg => {
            if (msg.id_user !== this.currentUserId) {
              msg.is_read = true;
            }
          });
          this.unreadMessages = 0;
        }
      });
    }
  }

  ngOnDestroy() {
    // Limpiar timeouts
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }
    
    // Desuscribirse de eventos socket - manejo seguro
    if (this.socketSubscriptions && this.socketSubscriptions.length > 0) {
      this.socketSubscriptions.forEach(sub => {
        if (sub) sub.unsubscribe();
      });
    }
    
    // Abandonar salas de chat
    if (this.socketService.isConnected()) {
      if (this.productId) {
        this.socketService.emit('leave_room', `product_${this.productId}`);
      } else if (this.barterId) {
        this.socketService.emit('leave_room', `barter_${this.barterId}`);
      }
    }
  }
}
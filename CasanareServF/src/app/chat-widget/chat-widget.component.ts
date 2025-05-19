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
  selectedImage?: File | null;
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

    // 1. Obtener currentUserId si no está establecido
    if (!this.currentUserId) {
      const userData = this.authService.getUserData();
      if (userData && userData.id) {
        this.currentUserId = Number(userData.id);
      } else {
        alert('Debes iniciar sesión para usar el chat');
        return;
      }
    }

    // 2. PRIMERO intenta obtener los IDs de los params
    this.route.paramMap.subscribe(params => {
      // Intenta obtener IDs de los parámetros de ruta
      const productIdParam = params.get('productId');
      const barterIdParam = params.get('barterId');
      
      if (productIdParam) {
        this.productId = Number(productIdParam);
        console.log(`✓ ProductId desde ruta: ${this.productId}`);
      } else if (barterIdParam) {
        this.barterId = Number(barterIdParam);
        console.log(`✓ BarterId desde ruta: ${this.barterId}`);
      }
      
      // 3. DESPUÉS intenta obtener los datos de queryParams
      this.route.queryParamMap.subscribe(qParams => {
        // Solo usar queryParams si no tenemos los datos de los params
        if (!this.productId && qParams.has('productId')) {
          this.productId = Number(qParams.get('productId'));
        }
        if (!this.barterId && qParams.has('barterId')) {
          this.barterId = Number(qParams.get('barterId'));
        }
        
        if (qParams.has('otherUserName')) {
          this.otherUserName = qParams.get('otherUserName') || '';
        }
        
        if (qParams.has('otherUserAvatar')) {
          this.otherUserAvatar = this.fixImagePath(qParams.get('otherUserAvatar') || '');
        } else {
          this.otherUserAvatar = '/img/perfil3.png';
        }

        // 4. IMPORTANTE: Inicializar chat solo si tenemos IDs
        if (this.productId || this.barterId) {
          console.log('📱 Inicializando chat con IDs válidos');
          this.initializeChat();
          this.connectToSocket();
        } else {
          console.error('❌ No se encontró ID de producto ni de trueque');
          alert('No se encontró el chat solicitado.');
        }
      });
    });
  }

  connectToSocket() {
    // Verificar si ya estamos conectados
    if (!this.socketService.isConnected()) {
      console.log('🔄 Conectando socket...');
      this.socketService.connect();
    } else {
      console.log('✅ Socket ya conectado');
      // Ya estamos conectados, unirse a la sala directamente
      this.joinChatRoom();
    }
    
    // Cuando nos conectemos, unirse a la sala
    this.socketService.on('connect', () => {
      console.log('🟢 Socket conectado con ID:', this.socketService.getSocketId());
      this.joinChatRoom();
    });
    
    // Configurar el evento para recibir mensajes
    this.socketService.on('new_message', (message: any) => {
      console.log('📬 Mensaje recibido por socket:', message);
      
      const isForThisProduct = this.productId && message.id_product == this.productId;
      const isForThisBarter = this.barterId && message.id_barter == this.barterId;
      
      if (isForThisProduct || isForThisBarter) {
        console.log('✅ El mensaje es para este chat, agregando...');
        
        // Comprobar si es un duplicado
        if (!this.messages.some(m => m.id_message === message.id_message)) {
          this.messages.push(message);
          this.scrollToBottom();
          
          // Notificar si es de otro usuario
          if (message.id_user !== this.currentUserId) {
            this.showNotificationIfNeeded(message);
          }
        } else {
          console.log('👯 Mensaje duplicado, ignorando');
        }
      }
    });
    
    // Escuchar eventos de typing del otro usuario
    this.socketService.on('user_typing', (data: any) => {
      if (data.userId !== this.currentUserId) {
        this.otherUserIsTyping = true;
      }
    });
    
    this.socketService.on('user_stopped_typing', (data: any) => {
      if (data.userId !== this.currentUserId) {
        this.otherUserIsTyping = false;
      }
    });
  }

  // Método separado para unirse a la sala
  private joinChatRoom() {
    let roomId = '';
    if (this.productId) {
      roomId = `product_${this.productId}`;
    } else if (this.barterId) {
      roomId = `barter_${this.barterId}`;
    } else {
      console.error('❌ No hay ID de producto ni de trueque para unirse a la sala');
      return;
    }
    
    console.log(`⚡ Uniéndose a sala: ${roomId}`);
    this.socketService.emit('join_room', roomId);
    
    // Esperar confirmación
    this.socketService.on('joined_room', (data: any) => {
      console.log('✅ Unido correctamente a la sala:', data.room);
    });
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

    // 1. Crear un mensaje temporal (optimista)
    const tempId = 'temp-' + Date.now();
    const tempMessage = {
      id_message: tempId,
      id_user: this.currentUserId,
      id_product: this.productId || null,
      id_barter: this.barterId || null,
      message: this.newMessage,
      image_url: this.imagePreview,
      sent_at: new Date().toISOString(), // Formato ISO para compatibilidad con el backend
      is_read: false,
      // Información del usuario para que se vea bien en la UI
      chatUser: {
        id: this.currentUserId,
        name: this.authService.getUserData()?.name || 'Usuario',
        userImages: [] // Vacío o puedes poner la imagen de perfil actual
      }
    };
    this.messages.push(tempMessage);
    
    // Limpiar campos de entrada
    const mensajeEnviando = this.newMessage;
    this.newMessage = '';
    this.selectedImage = null;
    this.imagePreview = '';
    
    this.scrollToBottom();

    // 2. Enviar al backend
    this.chatService.sendMessage(messageData).subscribe({
      next: (msg) => {
        console.log('✅ Mensaje guardado en servidor:', msg);
        
        // Reemplazar el mensaje temporal por el real
        const index = this.messages.findIndex(m => m.id_message === tempId);
        if (index !== -1) {
          this.messages[index] = msg;
        }
      },
      error: (error) => {
        console.error('❌ Error al enviar mensaje:', error);
        // Marcar mensaje como fallido
        const index = this.messages.findIndex(m => m.id_message === tempId);
        if (index !== -1) {
          this.messages[index].error = true;
        }
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
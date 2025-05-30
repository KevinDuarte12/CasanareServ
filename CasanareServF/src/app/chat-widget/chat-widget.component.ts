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
import { Router } from '@angular/router';
import { ProductService } from '../services/productos.services';
import { BarterService } from '../services/barter.service';
import { UserService } from '../services/user.services';

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

  // Agrega esta propiedad que falta
  isAuthenticated: boolean = false;

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

  // Variables para chat finalizado y permisos
  isChatFinalized: boolean = false;
  isOwner: boolean = false;
  canManageChat: boolean = false;

  constructor(
    private chatService: ChatService,
    private route: ActivatedRoute,
    private router: Router, // Añade el router
    private authService: AuthService,
    private socketService: SocketService,
    private notificationService: NotificationService,
    private productService: ProductService, // Añade el ProductService
    private barterService: BarterService, // Añade el BarterService
    private userService: UserService  // Añadir el UserService aquí
  ) {}

  ngOnInit() {
    // Debug avanzado
    console.log('🔍 AUTH DIAGNOSTICS:', {
      isAuth: this.authService.isAuthenticated(),
      hasToken: localStorage.getItem('token') !== null,
      userData: this.authService.getUserData(),
      userDataRaw: localStorage.getItem('userData')
    });

    // 1. Asegurarse de que hay un usuario autenticado antes de inicializar el chat
    this.isAuthenticated = this.authService.isAuthenticated();
    
    if (!this.isAuthenticated) {
      console.error('❌ Usuario no autenticado, redirigiendo al login');
      this.router.navigate(['/login'], { 
        queryParams: { 
          returnUrl: window.location.pathname,
          productId: this.productId,
          barterId: this.barterId
        } 
      });
      return;
    }

    // 2. Obtener currentUserId si no está establecido
    if (!this.currentUserId) {
      const userData = this.authService.getUserData();
      if (userData && userData.id) {
        this.currentUserId = Number(userData.id);
      } else {
        console.error('❌ No se pudo obtener el ID del usuario');
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
        
        // CORRECCIÓN: Usar la ruta absoluta de la imagen o agregar validación
        if (qParams.has('otherUserAvatar')) {
          const avatarUrl = qParams.get('otherUserAvatar') || '';
          
          // Verificar si la URL ya es absoluta (contiene http o https)
          if (avatarUrl.startsWith('http')) {
            this.otherUserAvatar = avatarUrl;
          } else if (avatarUrl.startsWith('/')) { 
            // Si comienza con /, es una ruta relativa desde la raíz
            this.otherUserAvatar = avatarUrl;
          } else if (avatarUrl) {
            // Si no comienza con / pero existe, agregar el /
            this.otherUserAvatar = '/' + avatarUrl;
          } else {
            // Si no hay avatar, usar el predeterminado
            this.otherUserAvatar = '/img/perfil3.png';
          }
        } else {
          this.otherUserAvatar = '/img/perfil3.png';
        }

        // 4. Si tenemos IDs, inicializar el chat y buscar información adicional del usuario
        if (this.productId || this.barterId) {
          // MEJORA: Si tenemos un ID, pero no tenemos imagen de perfil, intentar obtenerla
          if (this.otherUserAvatar === '/img/perfil3.png' && qParams.has('otherUserId')) {
            const otherUserId = Number(qParams.get('otherUserId'));
            if (otherUserId) {
              this.loadOtherUserInfo(otherUserId);
            }
          }
          
          console.log('📱 Inicializando chat con IDs válidos');
          this.initializeChat();
          this.connectToSocket();
        } else {
          console.error('❌ No se encontró ID de producto ni de trueque');
          alert('No se encontró el chat solicitado.');
        }
      });
    });

    // Suscribirse a eventos de contador de mensajes no leídos
    this.socketService.on('unread_messages_count', (data: any) => {
      console.log('📊 Actualización de contador de mensajes no leídos:', data);
      // Aquí puedes actualizar el contador en tu UI si es necesario
      this.unreadMessages = data.count || 0;
    });
    
    // Marcar mensajes como leídos cuando se abre el chat
    this.markAllAsReadOnOpen();

    // Intentar cargar información del otro usuario si tenemos el ID en los parámetros
    this.route.queryParamMap.subscribe(params => {
      const otherUserId = params.get('otherUserId');
      if (otherUserId) {
        this.loadOtherUserInfo(Number(otherUserId));
      }
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
    const connectEvent = this.socketService.on('connect', () => {
      console.log('🟢 Socket conectado con ID:', this.socketService.getSocketId());
      this.joinChatRoom();
    });
    
    // Configurar el evento para recibir mensajes - MODIFICADO AQUÍ
    const newMessageEvent = this.socketService.on('new_message', (message: any) => {
      console.log('📬 Mensaje recibido por socket:', message);
      
      const isForThisProduct = this.productId && message.id_product == this.productId;
      const isForThisBarter = this.barterId && message.id_barter == this.barterId;
      
      if (isForThisProduct || isForThisBarter) {
        console.log('✅ El mensaje es para este chat, verificando duplicados...');
        
        // CORRECIÓN IMPORTANTE: Mejorar detección de duplicados
        // Verificar si ya existe un mensaje con el mismo ID (para mensajes del servidor)
        const duplicateById = this.messages.find(m => 
          m.id_message && m.id_message === message.id_message);
        
        // Verificar si hay un mensaje temporal que coincida (para mensajes propios)
        const isMessageFromMe = message.id_user === this.currentUserId;
        const duplicateTemp = isMessageFromMe && this.messages.find(m => {
          const isTempMessage = m.id_message && String(m.id_message).startsWith('temp-');
          if (!isTempMessage) return false;
          
          // Comparar contenido y hora aproximada (último minuto)
          const contentMatches = m.message === message.message;
          const recent = new Date().getTime() - new Date(m.sent_at).getTime() < 60000; // 1 minuto
          
          return contentMatches && recent;
        });
        
        if (!duplicateById && !duplicateTemp) {
          console.log('✅ No es duplicado, agregando mensaje al chat');
          this.messages.push(message);
          this.scrollToBottom();
          
          // Notificar si es de otro usuario
          if (message.id_user !== this.currentUserId) {
            this.showNotificationIfNeeded(message);
          }
        } else if (duplicateTemp) {
          // Reemplazar mensaje temporal con el real
          console.log('🔄 Reemplazando mensaje temporal con versión del servidor');
          const tempIndex = this.messages.indexOf(duplicateTemp);
          if (tempIndex >= 0) {
            this.messages[tempIndex] = message;
          }
        } else {
          console.log('👯 Mensaje ya existe, ignorando');
        }
      }
    });
    
    // Escuchar eventos de typing del otro usuario
    const typingEvent = this.socketService.on('user_typing', (data: any) => {
      if (data.userId !== this.currentUserId) {
        this.otherUserIsTyping = true;
      }
    });
    
    const stopTypingEvent = this.socketService.on('user_stopped_typing', (data: any) => {
      if (data.userId !== this.currentUserId) {
        this.otherUserIsTyping = false;
      }
    });
    
    // Almacenar todas las suscripciones para limpiarlas después
    this.socketSubscriptions.push(connectEvent);
    this.socketSubscriptions.push(newMessageEvent);
    this.socketSubscriptions.push(typingEvent);
    this.socketSubscriptions.push(stopTypingEvent);
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
    
    // IMPORTANTE: Mantener la misma estructura que espera el servidor
    // Si el servidor espera solo el ID de sala como string:
    this.socketService.emit('join_room', roomId);
    
    // Si el servidor espera un objeto con room y userId:
    // this.socketService.emit('join_room', {
    //   room: roomId,
    //   userId: this.currentUserId
    // });
    
    // Esperar confirmación
    const joinedRoomEvent = this.socketService.on('joined_room', (data: any) => {
      console.log('✅ Unido correctamente a la sala:', data.room);
    });
    this.socketSubscriptions.push(joinedRoomEvent);
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

  // Actualizar el método loadProductMessages para asegurar que se incluye el userId
  loadProductMessages() {
    if (!this.productId) return;
    console.log(`📱 Cargando mensajes para producto ${this.productId}...`);
    
    // IMPORTANTE: Siempre pasar el userId para asegurarse de que se filtran correctamente los mensajes
    this.chatService.getMessagesByProduct(this.productId, this.page, this.pageSize, this.currentUserId).subscribe({
      next: (messages) => {
        // Ordenar mensajes por fecha si es necesario
        this.messages = messages.sort((a, b) => 
          new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime()
        );
        
        // Verificar si hay algún mensaje de finalización
        this.isChatFinalized = messages.some(msg => msg.is_finalized);
        
        console.log(`📨 ${messages.length} mensajes cargados para producto ${this.productId}`);
        this.loading = false;
        setTimeout(() => this.scrollToBottom(), 100);
        this.loadOtherUserInfoFromMessages();
      },
      error: (err) => {
        console.error(`❌ Error al cargar mensajes para producto ${this.productId}:`, err);
        this.loading = false;
      }
    });
  }

  // Aplicar cambios similares a loadBarterMessages
  loadBarterMessages() {
    if (!this.barterId) return;
    console.log(`📱 Cargando mensajes para trueque ${this.barterId}...`);
    
    // IMPORTANTE: Siempre pasar el userId para asegurarse de que se filtran correctamente los mensajes
    this.chatService.getMessagesByBarter(this.barterId, this.page, this.pageSize, this.currentUserId).subscribe({
      next: (messages) => {
        // Ordenar mensajes por fecha si es necesario
        this.messages = messages.sort((a, b) => 
          new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime()
        );
        
        // Verificar si hay algún mensaje de finalización
        this.isChatFinalized = messages.some(msg => msg.is_finalized);
        
        console.log(`📨 ${messages.length} mensajes cargados para trueque ${this.barterId}`);
        this.loading = false;
        setTimeout(() => this.scrollToBottom(), 100);
        this.loadOtherUserInfoFromMessages();
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
    // Validaciones iniciales (sin cambios)
    if (!this.newMessage && !this.selectedImage) {
      console.warn('No se puede enviar un mensaje vacío');
      return;
    }

    if (!this.productId && !this.barterId) {
      console.error('❌ Error: No hay ID de producto ni de trueque disponible');
      return;
    }

    if (this.isChatFinalized) {
      alert('Este chat ha sido finalizado y no se pueden enviar más mensajes');
      return;
    }

    // IMPORTANTE: Asegurar que los datos son números correctamente
    const messageData: any = {
      id_user: this.currentUserId,
      message: this.newMessage || ''
    };

    if (this.productId) {
      messageData.id_product = this.productId;
    } else if (this.barterId) {
      messageData.id_barter = this.barterId;
    }

    if (this.selectedImage) {
      messageData.image = this.selectedImage;
    }

    // Crear ID temporal para seguimiento
    const now = new Date();
    const tempId = `temp-${now.getTime()}-${Math.floor(Math.random() * 10000)}`;
    
    // Crear mensaje temporal y agregarlo a la lista
    const tempMessage = {
      id_message: tempId,
      id_user: this.currentUserId,
      id_product: this.productId || null,
      id_barter: this.barterId || null,
      message: this.newMessage,
      image_url: this.imagePreview,
      sent_at: now.toISOString(),
      is_read: false,
      chatUser: {
        id: this.currentUserId,
        name: this.authService.getUserData()?.name || 'Usuario',
        userImages: []
      }
    };
    
    // Añadir mensaje temporal al inicio para feedback inmediato
    this.messages.push(tempMessage);
    this.scrollToBottom();
    
    // Limpiar campos de entrada
    const oldMessage = this.newMessage;
    this.newMessage = '';
    this.selectedImage = null;
    this.imagePreview = '';
    
    // Enviar al backend
    this.chatService.sendMessage(messageData).subscribe({
      next: (msg) => {
        console.log('✅ Mensaje enviado y confirmado por servidor:', msg);
        
        // Buscar el mensaje temporal para reemplazarlo
        const index = this.messages.findIndex(m => m.id_message === tempId);
        if (index !== -1) {
          // Reemplazar el mensaje temporal con el del servidor
          this.messages[index] = msg;
        }
        // No necesitamos agregar otro, ya que el socket manejará los mensajes de otros usuarios
      },
      error: (error) => {
        console.error('❌ Error al enviar mensaje:', error);
        // Si hay error, restaurar el mensaje para que el usuario pueda intentar de nuevo
        this.newMessage = oldMessage;
        // Marcar mensaje temporal como fallido
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
    // Si no hay ruta, devolver imagen por defecto
    if (!path) return '/img/perfil3.png';
    
    // Si es una URL completa (http o https), devolverla tal cual
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    
    // Si ya comienza con /, es una ruta absoluta desde la raíz
    if (path.startsWith('/')) {
      return path;
    }
    
    // Si no comienza con /, agregarle / 
    return '/' + path;
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

  // Añadir método para verificar propiedad
  checkOwnership() {
    // Para productos
    if (this.productId) {
      this.productService.getProduct(this.productId).subscribe({
        next: (product) => {
          this.isOwner = product.id_user === this.currentUserId;
          this.canManageChat = this.isOwner;
        },
        error: (err) => {
          console.error('Error al verificar la propiedad del producto:', err);
        }
      });
    }
    
    // Para trueques, ambos usuarios pueden gestionar el chat
    else if (this.barterId) {
      this.barterService.getBarter(this.barterId).subscribe({
        next: (barter) => {
          const isOfferingUser = barter.id_user_offer === this.currentUserId;
          const isReceivingUser = barter.id_user_receiving === this.currentUserId;
          this.isOwner = isOfferingUser || isReceivingUser;
          this.canManageChat = this.isOwner;
        },
        error: (err) => {
          console.error('Error al verificar la propiedad del trueque:', err);
        }
      });
    }
  }

  // Método para finalizar el chat
  finalizeChat() {
    if (!this.canManageChat) {
      alert('No tienes permisos para finalizar este chat');
      return;
    }
    
    if (confirm('¿Estás seguro de que deseas finalizar este chat? No se podrán enviar más mensajes.')) {
      const type = this.productId ? 'product' : 'barter';
      const entityId = this.productId || this.barterId;
      
      if (!entityId) {
        alert('No se pudo identificar el chat');
        return;
      }
      
      this.chatService.finalizeChat(type, entityId, this.currentUserId).subscribe({
        next: (response) => {
          this.isChatFinalized = true;
          this.messages.push(response);
          this.scrollToBottom();
          alert('Chat finalizado con éxito');
        },
        error: (error) => {
          console.error('Error al finalizar chat:', error);
          alert('Error al finalizar el chat');
        }
      });
    }
  }

  // Añadir este método a la clase ChatWidgetComponent, justo después del método finalizeChat()
  disableChat() {
    if (confirm('¿Estás seguro de que deseas desactivar este chat? No se podrán enviar más mensajes.')) {
      const type = this.productId ? 'product' : 'barter';
      const entityId = this.productId || this.barterId;
      
      if (!entityId) {
        alert('No se pudo identificar el chat');
        return;
      }
      
      this.chatService.finalizeChat(type, entityId, this.currentUserId).subscribe({
        next: (response) => {
          this.isChatFinalized = true;
          this.messages.push(response);
          this.scrollToBottom();
          alert('Chat desactivado con éxito');
        },
        error: (error) => {
          console.error('Error al desactivar chat:', error);
          alert('Error al desactivar el chat');
        }
      });
    }
  }

  // Agregar este nuevo método para cargar la información del otro usuario
  loadOtherUserInfo(userId: number) {
    if (!userId) return;
  
    console.log(`Cargando información del usuario ${userId}...`);
    
    this.userService.getUserById(userId).subscribe({
      next: (userData) => {
        if (userData) {
          console.log(`Datos de usuario recibidos:`, userData);
          
          // Actualizar el nombre si no lo tenemos
          if (!this.otherUserName && userData.name) {
            this.otherUserName = userData.name;
          }
          
          // Lógica mejorada para actualizar la imagen de perfil
          let userAvatar = null;
          
          // Primera opción: profileImage directo
          if (userData.profileImage) {
            userAvatar = userData.profileImage;
          } 
          // Segunda opción: imagen principal de userImages
          else if (userData.userImages && userData.userImages.length > 0) {
            const mainImage = userData.userImages.find(img => img.is_main);
            userAvatar = mainImage ? mainImage.url : userData.userImages[0].url;
          }
          
          // Solo actualizar si encontramos una imagen
          if (userAvatar) {
            this.otherUserAvatar = this.fixImagePath(userAvatar);
            console.log(`Avatar actualizado: ${this.otherUserAvatar}`);
          }
        }
      },
      error: (err) => {
        console.error('Error al cargar información del otro usuario:', err);
      }
    });
  }

  // Método para marcar mensajes como leídos al abrir el chat
  private markAllAsReadOnOpen() {
    if (!this.currentUserId) return;
    
    // Esperar un momento para asegurar que los mensajes se hayan cargado
    setTimeout(() => {
      if (this.productId) {
        this.chatService.markMessagesAsRead({
          userId: this.currentUserId,
          productId: this.productId
        }).subscribe({
          next: () => {
            console.log('✅ Mensajes marcados como leídos para producto');
            // Actualizar estado local
            this.messages.forEach(msg => {
              if (msg.id_user !== this.currentUserId) {
                msg.is_read = true;
              }
            });
            this.unreadMessages = 0;
          },
          error: (err) => console.error('❌ Error al marcar mensajes como leídos:', err)
        });
      } else if (this.barterId) {
        this.chatService.markMessagesAsRead({
          userId: this.currentUserId,
          barterId: this.barterId
        }).subscribe({
          next: () => {
            console.log('✅ Mensajes marcados como leídos para trueque');
            // Actualizar estado local
            this.messages.forEach(msg => {
              if (msg.id_user !== this.currentUserId) {
                msg.is_read = true;
              }
            });
            this.unreadMessages = 0;
          },
          error: (err) => console.error('❌ Error al marcar mensajes como leídos:', err)
        });
      }
    }, 1000);
  }

  // Mejorar este método para obtener la información del otro usuario correctamente

  private async loadOtherUserInfoFromMessages() {
    // Solo ejecutar si tenemos mensajes y el usuario no está definido
    if (!this.messages || this.messages.length === 0 || (this.otherUserName && this.otherUserAvatar !== '/img/perfil3.png')) {
      return;
    }
    
    // Buscar mensajes del otro usuario
    const otherUserMessages = this.messages.filter(msg => msg.id_user !== this.currentUserId);
    if (otherUserMessages.length === 0) {
      console.log('No se encontraron mensajes del otro usuario');
      
      // Intentar obtener info desde producto o trueque
      if (this.productId) {
        this.productService.getProduct(this.productId).subscribe(product => {
          // Si no soy el dueño del producto, el otro usuario es el dueño
          if (product.id_user !== this.currentUserId) {
            this.loadOtherUserInfo(product.id_user);
          } else {
            // Buscar el primer mensaje del otro usuario
            const firstMessage = this.messages.find(msg => msg.id_user !== this.currentUserId);
            if (firstMessage) {
              this.loadOtherUserInfo(firstMessage.id_user);
            }
          }
        });
      } else if (this.barterId) {
        this.barterService.getBarter(this.barterId).subscribe(barter => {
          const otherId = barter.id_user_offer === this.currentUserId 
            ? barter.id_user_receiving 
            : barter.id_user_offer;
          this.loadOtherUserInfo(otherId);
        });
      }
      return;
    }
    
    // Tomar el primer mensaje del otro usuario para obtener su ID
    const otherUserId = otherUserMessages[0].id_user;
    
    // Ya tenemos la info del usuario en el mensaje?
    if (otherUserMessages[0].chatUser) {
      const chatUser = otherUserMessages[0].chatUser;
      this.otherUserName = chatUser.name || 'Usuario';
      
      // Si hay imágenes, usar la primera
      if (chatUser.userImages && chatUser.userImages.length > 0) {
        this.otherUserAvatar = this.fixImagePath(chatUser.userImages[0].url);
      }
    } else {
      // No tenemos la info, cargarla
      this.loadOtherUserInfo(otherUserId);
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

  // Añadir este nuevo método:

  handleAvatarError(event: Event): void {
    const imgElement = event.target as HTMLImageElement;
    console.warn('Error al cargar imagen de perfil:', imgElement.src);
    
    // Si la imagen ya es la predeterminada, no hacer nada más para evitar bucles
    if (imgElement.src.endsWith('/img/perfil3.png')) return;
    
    // Cambiar a la imagen predeterminada
    imgElement.src = '/img/perfil3.png';
  }
}
import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { ChatService } from '../services/chat.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { HeaderComponent } from '../header/header.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { FooterComponent } from '../footer/footer.component';

@Component({
  selector: 'app-chat-widget',
  standalone: true,
  imports: [
    FormsModule, 
    CommonModule, 
    RouterModule,
    HeaderComponent,
    NavbarComponent,
    FooterComponent
  ],
  templateUrl: './chat-widget.component.html',
  styleUrls: ['./chat-widget.component.css']
})
export class ChatWidgetComponent implements OnInit {
  @Input() barterId?: number;
  @Input() productId?: number;
  @Input() otherUserName = '';
  @Input() otherUserAvatar = '';
  @Input() currentUserId!: number;
  @Output() close = new EventEmitter<void>();

  isOpen = false;
  isMinimized = false;
  messages: any[] = [];
  newMessage = '';
  selectedImage?: File;

  constructor(
    private chatService: ChatService,
    private route: ActivatedRoute,
    private authService: AuthService
  ) {}

  ngOnInit() {
    // Obtener datos del usuario actual
    const userData = this.authService.getUserData();
    
    // Verificar si hay un usuario autenticado
    if (!userData || !userData.id) {
      console.error('⚠️ No hay un usuario autenticado o falta el ID');
      // Redirigir al login si es necesario
      return;
    }

    this.currentUserId = Number(userData.id);
    console.log(`👤 Usuario autenticado: ID=${this.currentUserId}`);
    
    // PRIMERO: Obtener productId/barterId de los params de ruta
    this.route.params.subscribe(params => {
      console.log("Params de ruta:", params);
      
      if (params['productId']) {
        this.productId = Number(params['productId']);
        console.log(`✓ ProductId desde ruta: ${this.productId}, tipo: ${typeof this.productId}`);
        
        // Aquí guardamos el ID para asegurarnos de que está disponible cuando necesitemos enviar un mensaje
        localStorage.setItem('current_chat_product_id', this.productId.toString());
      } else if (params['barterId']) {
        this.barterId = Number(params['barterId']);
        console.log(`✓ BarterId desde ruta: ${this.barterId}, tipo: ${typeof this.barterId}`);
        
        // También guardar el ID del trueque por si acaso
        localStorage.setItem('current_chat_barter_id', this.barterId.toString());
      }
      
      // Cargar mensajes si ya tenemos ID
      this.initializeChat();
    });
    
    // SEGUNDO: Obtener información adicional de los queryParams
    this.route.queryParams.subscribe(params => {
      console.log("Query params recibidos:", params);
      
      // Si no se encontró en la ruta, intentar con queryParams (compatible con versión anterior)
      if (!this.productId && params['productId']) {
        this.productId = Number(params['productId']);
        console.log(`✓ ProductId desde query: ${this.productId}`);
      }
      
      if (!this.barterId && params['barterId']) {
        this.barterId = Number(params['barterId']);
        console.log(`✓ BarterId desde query: ${this.barterId}`);
      }
      
      // Obtener nombre y avatar
      if (params['otherUserName']) {
        this.otherUserName = params['otherUserName'];
      }
      
      // En el ngOnInit, cambia la asignación de la imagen por defecto:
      if (params['otherUserAvatar'] && params['otherUserAvatar'] !== '') {
        this.otherUserAvatar = params['otherUserAvatar'].startsWith('/') 
          ? params['otherUserAvatar'] 
          : '/' + params['otherUserAvatar']; // Asegurar que comience con /
      } else {
        this.otherUserAvatar = '/img/perfil3.png'; // Ruta absoluta
      }
      
      // Inicializar chat si aún no se ha hecho
      this.initializeChat();
    });
  }

  // Método para inicializar el chat una vez que tengamos los parámetros
  private initializeChat(): void {
    // Verificar que tenemos la información necesaria
    if (!this.productId && !this.barterId) {
      console.warn('⚠️ Esperando ID de producto o trueque...');
      return;
    }
    
    console.log('Inicializando chat con:', {
      productId: this.productId,
      barterId: this.barterId,
      otherUserName: this.otherUserName
    });
    
    // DEBUG: Asegurarse que los valores son numéricos
    if (this.productId) {
      this.productId = Number(this.productId);
      console.log(`ID Producto convertido a número: ${this.productId}, tipo: ${typeof this.productId}`);
    }
    
    if (this.barterId) {
      this.barterId = Number(this.barterId);
      console.log(`ID Trueque convertido a número: ${this.barterId}, tipo: ${typeof this.barterId}`);
    }
    
    // Cargar los mensajes correspondientes
    if (this.productId) {
      this.loadProductMessages();
    } else if (this.barterId) {
      this.loadBarterMessages();
    }
  }

  openChat() {
    this.isOpen = true;
    this.isMinimized = false;
    this.loadMessages();
  }

  closeChat(event?: Event) {
    if (event) event.stopPropagation();
    this.isOpen = false;
  }

  toggleMinimize() {
    this.isMinimized = !this.isMinimized;
  }

  loadMessages() {
    if (this.barterId) {
      this.chatService.getMessagesByBarter(this.barterId).subscribe(msgs => this.messages = msgs);
    } else if (this.productId) {
      this.chatService.getMessagesByProduct(this.productId).subscribe(msgs => this.messages = msgs);
    }
  }

  sendMessage() {
    // Asegurarse de que hay un mensaje o una imagen antes de enviar
    if (!this.newMessage && !this.selectedImage) {
      console.warn('No se puede enviar un mensaje vacío');
      return;
    }
    
    // Intentar recuperar IDs del localStorage si no están disponibles
    if (!this.productId && localStorage.getItem('current_chat_product_id')) {
      this.productId = Number(localStorage.getItem('current_chat_product_id'));
      console.log('ID de producto recuperado del localStorage:', this.productId);
    }
    
    if (!this.barterId && localStorage.getItem('current_chat_barter_id')) {
      this.barterId = Number(localStorage.getItem('current_chat_barter_id'));
      console.log('ID de trueque recuperado del localStorage:', this.barterId);
    }
    
    // Obtener directamente desde la URL si aún no están disponibles
    if (!this.productId && !this.barterId) {
      const url = window.location.href;
      const match = url.match(/\/chat\/product\/(\d+)/);
      if (match && match[1]) {
        this.productId = Number(match[1]);
        console.log('ID de producto extraído de la URL:', this.productId);
      }
    }
    
    // Verificar ID del usuario  
    if (!this.currentUserId) {
      console.error('⚠️ Error: No hay un ID de usuario válido');
      return;
    }
    
    // Proceder con el envío
    this.chatService.sendMessage({
      id_product: this.productId, // Este valor está indefinido
      id_barter: this.barterId,   // Este valor está indefinido
      id_user: this.currentUserId,
      message: this.newMessage || '',
      image: this.selectedImage
    }).subscribe({
      next: (msg) => {
        console.log('✅ Mensaje enviado con éxito:', msg);
        this.messages.push(msg);
        this.newMessage = '';
        this.selectedImage = undefined;
      },
      error: (error) => {
        console.error('❌ Error al enviar mensaje:', error);
      }
    });
  }

  onImageSelected(event: any) {
    const files = event?.target?.files;
    if (files && files.length > 0) {
      this.selectedImage = files[0];
      // Agregar verificación antes de acceder a .name
      if (this.selectedImage) {
        console.log('Imagen seleccionada:', this.selectedImage.name);
      }
    } else {
      this.selectedImage = undefined;
    }
  }

  onCloseClick(event: Event) {
    event.preventDefault();
    this.close.emit();
  }

  loadProductMessages() {
    if (!this.productId) return;
    
    console.log(`📱 Cargando mensajes para producto ${this.productId}...`);
    this.chatService.getMessagesByProduct(this.productId).subscribe({
      next: (messages) => {
        this.messages = messages;
        console.log(`📨 ${messages.length} mensajes cargados para producto ${this.productId}`);
      },
      error: (err) => {
        console.error(`❌ Error al cargar mensajes para producto ${this.productId}:`, err);
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
      },
      error: (err) => {
        console.error(`❌ Error al cargar mensajes para trueque ${this.barterId}:`, err);
      }
    });
  }
}
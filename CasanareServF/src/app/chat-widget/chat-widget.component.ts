import { Component, Input, Output, EventEmitter } from '@angular/core';
import { ChatService } from '../services/chat.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-chat-widget',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './chat-widget.component.html',
  styleUrls: ['./chat-widget.component.css']
})
export class ChatWidgetComponent {
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

  constructor(private chatService: ChatService) {}

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
    if (!this.newMessage && !this.selectedImage) return;
    this.chatService.sendMessage({
      id_barter: this.barterId,
      id_product: this.productId,
      id_user: this.currentUserId,
      message: this.newMessage,
      image: this.selectedImage
    }).subscribe(msg => {
      this.messages.push(msg);
      this.newMessage = '';
      this.selectedImage = undefined;
    });
  }

  onImageSelected(event: any) {
    this.selectedImage = event.target.files[0];
  }

  onCloseClick(event: Event) {
    event.stopPropagation();
    this.close.emit();
  }
}
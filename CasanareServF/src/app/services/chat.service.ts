import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class ChatService {
  constructor(private http: HttpClient) {}

  getMessagesByBarter(barterId: number) {
    return this.http.get<any[]>(`/api/chat/barter/${barterId}`);
  }
  getMessagesByProduct(productId: number) {
    return this.http.get<any[]>(`/api/chat/product/${productId}`);
  }
  sendMessage(data: { id_barter?: number, id_product?: number, id_user: number, message?: string, image?: File }) {
    const formData = new FormData();
    if (data.id_barter) formData.append('id_barter', data.id_barter.toString());
    if (data.id_product) formData.append('id_product', data.id_product.toString());
    formData.append('id_user', data.id_user.toString());
    if (data.message) formData.append('message', data.message);
    if (data.image) formData.append('image_url', data.image);
    return this.http.post<any>('/api/chat/message', formData);
  }
}
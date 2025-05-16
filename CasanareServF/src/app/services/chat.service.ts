// Fix for chat.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../environment/environment';
import { catchError, tap, map } from 'rxjs/operators';
import { throwError, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private apiUrl = environment.apiUrl || 'http://localhost:3006';
  
  constructor(private http: HttpClient) {}
  
  getMessagesByBarter(barterId: number, page: number = 1, pageSize: number = 20): Observable<any[]> {
    if (!barterId) {
      console.error('Error: barterId es inválido:', barterId);
      return throwError(() => new Error('ID de trueque inválido'));
    }
    
    console.log(`Solicitando mensajes para trueque ${barterId} (página ${page}, tamaño ${pageSize})`);
    const url = `${this.apiUrl}/api/chat/barter/${barterId}?page=${page}&pageSize=${pageSize}`;
    
    return this.http.get<any[]>(url)
      .pipe(
        tap(msgs => console.log(`✅ ${msgs.length} mensajes recibidos para trueque ${barterId}`)),
        catchError(this.handleError)
      );
  }
    
  getMessagesByProduct(productId: number, page: number = 1, pageSize: number = 20): Observable<any[]> {
    if (!productId) {
      console.error('Error: productId es inválido:', productId);
      return throwError(() => new Error('ID de producto inválido'));
    }
    
    console.log(`📡 Solicitando mensajes para producto ${productId} (página ${page}, tamaño ${pageSize})`);
    const url = `${this.apiUrl}/api/chat/product/${productId}?page=${page}&pageSize=${pageSize}`;
        
    return this.http.get<any[]>(url)
      .pipe(
        tap(msgs => console.log(`✅ ${msgs.length} mensajes recibidos para producto ${productId}`)),
        catchError((error) => {
          console.error(`❌ Error al obtener mensajes de producto ${productId}:`, error);
          return this.handleError(error);
        })
      );
  }
    
  sendMessage(data: {
    id_barter?: number,
    id_product?: number,
    id_user: number,
    message?: string,
    image?: File
  }): Observable<any> {
    // Si no hay imagen, usar JSON simple
    if (!data.image) {
      const payload = {
        id_user: Number(data.id_user),
        message: data.message || '',
        ...(data.id_product ? { id_product: Number(data.id_product) } : {}),
        ...(data.id_barter ? { id_barter: Number(data.id_barter) } : {}),
      };
      
      console.log('📤 Enviando como JSON:', payload);
      return this.http.post<any>(`${this.apiUrl}/api/chat/message`, payload)
        .pipe(
          tap(response => console.log('✅ Mensaje enviado:', response)),
          catchError(this.handleError)
        );
    }
    
    // Si hay imagen, usar FormData
    const formData = new FormData();
    
    // IMPORTANTE: Convertir explícitamente a string
    formData.append('id_user', String(data.id_user));
    
    if (data.id_product) {
      formData.append('id_product', String(data.id_product));
    } else if (data.id_barter) {
      formData.append('id_barter', String(data.id_barter));
    }
    
    if (data.message) {
      formData.append('message', data.message);
    }
    
    if (data.image) {
      formData.append('image', data.image, data.image.name);
    }
    
    return this.http.post<any>(`${this.apiUrl}/api/chat/message`, formData)
      .pipe(
        tap(response => console.log('✅ Mensaje enviado:', response)),
        catchError(this.handleError)
      );
  }
    
  // Obtener todos los chats del usuario (tanto productos como trueques)
  getUserChats(userId: number): Observable<any> {
    if (!userId) {
      return throwError(() => new Error('ID de usuario inválido'));
    }
    
    console.log(`🔍 Obteniendo chats para usuario ${userId}`);
    return this.http.get<any>(`${this.apiUrl}/api/chat/user/${userId}/chats`)
      .pipe(
        tap(chats => console.log('✅ Chats recuperados:', chats)),
        catchError(this.handleError)
      );
  }

  // Marcar mensajes como leídos
  markMessagesAsRead(params: {
    userId: number,
    productId?: number,
    barterId?: number
  }): Observable<any> {
    const { userId, productId, barterId } = params;
    
    if (!userId || (!productId && !barterId)) {
      return throwError(() => new Error('Parámetros inválidos para marcar mensajes como leídos'));
    }
    
    const entity = productId ? 'product' : 'barter';
    const entityId = productId || barterId;
    
    console.log(`📌 Marcando mensajes como leídos para ${entity} ${entityId}`);
    
    return this.http.put<any>(`${this.apiUrl}/api/chat/${entity}/${entityId}/read`, { userId })
      .pipe(
        tap(result => console.log('✅ Mensajes marcados como leídos:', result)),
        catchError(this.handleError)
      );
  }

  // Obtener conteo de mensajes no leídos
  getUnreadMessagesCount(userId: number): Observable<number> {
    if (!userId) {
      return throwError(() => new Error('ID de usuario inválido'));
    }
    
    return this.http.get<{count: number}>(`${this.apiUrl}/api/chat/user/${userId}/unread-count`)
      .pipe(
        map(response => response.count),
        tap(count => console.log(`✉️ Mensajes no leídos: ${count}`)),
        catchError(this.handleError)
      );
  }
    
  private handleError(error: HttpErrorResponse) {
    console.error('❌ Error en petición HTTP:', error);
        
    let errorMessage = 'Error desconocido';
    
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error del cliente: ${error.error.message}`;
    } else {
      errorMessage = `Error del servidor: ${error.status}, Mensaje: ${error.message}`;
      
      // Si hay una respuesta estructurada del servidor, usarla
      if (error.error && typeof error.error === 'object') {
        if (error.error.msg) {
          errorMessage = error.error.msg;
        }
      }
    }
    
    console.error(errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}
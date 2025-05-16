import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../environment/environment';
import { catchError, tap } from 'rxjs/operators';
import { throwError } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private apiUrl = environment.apiUrl || 'http://localhost:3006';

  constructor(private http: HttpClient) {}

  getMessagesByBarter(barterId: number) {
    return this.http.get<any[]>(`${this.apiUrl}/api/chat/barter/${barterId}`)
      .pipe(
        tap(msgs => console.log(`✅ ${msgs.length} mensajes recibidos para trueque ${barterId}`)),
        catchError(this.handleError)
      );
  }
  
  getMessagesByProduct(productId: number) {
    console.log(`📡 Solicitando mensajes para producto ${productId} a la API`);
    const url = `${this.apiUrl}/api/chat/product/${productId}`;
    console.log(`URL: ${url}`);
    
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
  }) {
    // Crear FormData con validaciones
    const formData = new FormData();
    
    // Convertir todo a string explícitamente
    if (data.id_barter) {
      formData.append('id_barter', String(data.id_barter));
    }
    
    if (data.id_product) {
      formData.append('id_product', String(data.id_product));
    }
    
    // IMPORTANTE: Asegurar que id_user siempre se envía
    formData.append('id_user', String(data.id_user));
    console.log(`👉 Añadido id_user=${data.id_user} al FormData`);
    
    if (data.message) {
      formData.append('message', data.message);
    }
    
    if (data.image) {
      formData.append('image_url', data.image, data.image.name);
    }
    
    // Para depuración - Mostrar contenido del FormData
    console.log('📦 Contenido del FormData:');
    formData.forEach((value, key) => {
      console.log(`${key}: ${value instanceof File ? value.name : value}`);
    });
    
    return this.http.post<any>(`${this.apiUrl}/api/chat/message`, formData)
      .pipe(
        tap(response => console.log('✅ Mensaje enviado:', response)),
        catchError(this.handleError)
      );
  }
  
  private handleError(error: HttpErrorResponse) {
    console.error('❌ Error en petición HTTP:', error);
    
    if (error.error instanceof ErrorEvent) {
      console.error('❌ Error del cliente:', error.error.message);
    } else {
      console.error(
        `❌ Error del servidor: ${error.status}, ` +
        `Respuesta: ${JSON.stringify(error.error)}`
      );
    }
    
    return throwError(() => error);
  }
}
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Barter, BarterRequest } from '../interfaces/barter';
import { Product } from '../interfaces/product';
import { environment } from '../../environment/environment';

interface TruequeableProductRequest {
  name: string;
  description: string;
  price: number;
  type: string;
  id_user: number;
  status: string;
  stock: number;
  id_category: number;
  images?: string[];
}

// Definir la interfaz para la publicación de trueque
interface BarterPublication {
  id_prod_offer: number;
  id_user_offer: number;
  notes?: string;
}

@Injectable({
  providedIn: 'root'
})
export class BarterService {
  private myAppUrl: string;
  private myApiUrl: string;
  private headers = new HttpHeaders().set('Content-Type', 'application/json');

  constructor(private http: HttpClient) {
    this.myAppUrl = environment.endpoint;
    this.myApiUrl = 'api/barters/';
  }

  getBarters(): Observable<Barter[]> {
    return this.http.get<Barter[]>(`${this.myAppUrl}${this.myApiUrl}`).pipe(
      tap(barters => console.log('Barters loaded:', barters)),
      catchError(error => {
        console.error('Error loading barters:', error);
        return throwError(() => error);
      })
    );
  }

  getBarter(id: number): Observable<Barter> {
    return this.http.get<Barter>(`${this.myAppUrl}${this.myApiUrl}${id}`).pipe(
      tap(barter => console.log('Barter loaded:', barter)),
      catchError(error => {
        console.error('Error loading barter:', error);
        return throwError(() => error);
      })
    );
  }

  createBarter(barterRequest: BarterRequest): Observable<any> {
    return this.http.post(
      `${this.myAppUrl}${this.myApiUrl}`,
      barterRequest,
      { headers: this.getAuthHeaders() }
    ).pipe(
      tap(response => console.log('Barter created:', response)),
      catchError(error => {
        console.error('Error creating barter:', error);
        return throwError(() => error);
      })
    );
  }

  // Reemplazar updateBarterStatus para incluir más logs
  updateBarterStatus(id: number, status: 'pendiente' | 'aceptado' | 'rechazado' | 'completado' | 'disponible' | 'aprobado_admin'): Observable<any> {
    console.log(`🔄 Actualizando estado de trueque ${id} a '${status}'`);

    // Validar explícitamente que el estado sea uno de los permitidos
    const validStatuses = ['pendiente', 'aceptado', 'rechazado', 'completado', 'disponible', 'aprobado_admin'];
    if (!validStatuses.includes(status)) {
      console.error(`❌ Estado inválido: ${status}`);
      return throwError(() => new Error(`Estado inválido: ${status}`));
    }

    // Asegurarse que el body está bien estructurado
    const body = { status: status };
    console.log('📦 Body a enviar:', body);

    return this.http.patch(
      `${this.myAppUrl}${this.myApiUrl}${id}/status`,
      body,
      { headers: this.getAuthHeaders() }
    ).pipe(
      tap(response => {
        console.log(`✅ Barter ${id} status updated to ${status}:`, response);
      }),
      catchError(error => {
        console.error(`❌ Error updating barter ${id} status to ${status}:`, error);
        return throwError(() => error);
      })
    );
  }

  deleteBarter(id: number): Observable<any> {
    return this.http.delete(`${this.myAppUrl}${this.myApiUrl}${id}`, { headers: this.getAuthHeaders() });
  }

  // Helper method to get authentication headers
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return this.headers.set('Authorization', `Bearer ${token}`);
  }

  // Método temporal con datos mock
  getUserBarters(userId: number): Observable<Barter[]> {
    console.log(`Obteniendo trueques del usuario ${userId}`);

    // Intentar con la API real
    return this.http.get<Barter[]>(`${this.myAppUrl}${this.myApiUrl}user/${userId}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap(barters => console.log(`Trueques del usuario ${userId} cargados:`, barters)),
      catchError(error => {
        console.error(`Error al cargar trueques del usuario ${userId}:`, error);

        // Datos mock para desarrollo
        const mockBarters: Barter[] = [
          {
            id_barter: 101,
            id_prod_offer: 1001,
            id_prod_request: 2001,
            id_user_offer: userId as number,
            id_user_receiving: 2,
            status: 'pendiente',
            request_date: new Date().toISOString(),
            notes: 'Propuesta de trueque para iPad',
            offered_product: {
              id_product: 1001,
              name: 'Smartphone Samsung A52',
              price: 850000,
              description: 'Smartphone en excelente estado, con cargador original',
              id_category: 1
            },
            requested_product: {
              id_product: 2001,
              name: 'iPad Pro 2022',
              price: 3500000,
              description: 'iPad Pro con Apple Pencil incluido',
              id_category: 1
            }
          }
        ];

        return of(mockBarters);
      })
    );
  }

  // Agregar este método para crear productos para trueque
  createProductForBarter(productData: TruequeableProductRequest): Observable<any> {
    return this.http.post(
      `${this.myAppUrl}api/products/`,
      productData,
      { headers: this.getAuthHeaders() }
    ).pipe(
      tap(response => console.log('Producto para trueque creado:', response)),
      catchError(error => {
        console.error('Error al crear producto para trueque:', error);
        return throwError(() => error);
      })
    );
  }

  // Agregar este método para la publicación de trueque
  createBarterPublication(data: BarterPublication): Observable<any> {
    return this.http.post(
      `${this.myAppUrl}${this.myApiUrl}publication`,
      data,
      { headers: this.getAuthHeaders() }
    ).pipe(
      tap(response => console.log('Publicación de trueque creada:', response)),
      catchError(error => {
        console.error('Error al crear publicación de trueque:', error);
        return throwError(() => error);
      })
    );
  }

  // Si es necesario, ajustar el método updateBarter para que sea más claro
  updateBarter(id: number, barterData: any): Observable<any> {
    const url = `${this.myAppUrl}${this.myApiUrl}${id}`;
    const headers = this.getAuthHeaders();

    return this.http.put(url, barterData, { headers }).pipe(
      tap(response => console.log('Barter updated:', response)),
      catchError(error => {
        console.error('Error updating barter:', error);
        return throwError(() => error);
      })
    );
  }

  getBartersByUser(userId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.myAppUrl}${this.myApiUrl}user/${userId}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap(barters => console.log(`Trueques del usuario ${userId} cargados:`, barters)),
      catchError(error => {
        console.error(`Error al cargar trueques del usuario ${userId}:`, error);
        return throwError(() => error);
      })
    );
  }

  // Añadir este método al servicio
  checkExistingProposal(userId: number, productId: number): Observable<any> {
    return this.http.get<any>(
      `${environment.endpoint}api/barters/check-proposal?userId=${userId}&productId=${productId}`
    ).pipe(
      catchError(error => {
        console.error('Error al verificar propuesta existente:', error);
        return of({ exists: false, proposal: null });
      })
    );
  }

  // Añadir este método si no existe
  getBartersByStatus(status: 'pendiente' | 'disponible' | 'aceptado' | 'rechazado' | 'completado' | 'aprobado_admin'): Observable<Barter[]> {
    return this.http.get<Barter[]>(`${this.myAppUrl}${this.myApiUrl}status/${status}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap(barters => console.log(`Trueques con estado ${status} cargados:`, barters)),
      catchError(error => {
        console.error(`Error al cargar trueques con estado ${status}:`, error);
        return throwError(() => error);
      })
    );
  }

  cancelBarter(barterId: number): Observable<any> {
    return this.http.patch<any>(`${this.myAppUrl}${this.myApiUrl}${barterId}/cancel`, {});
  }
  // En barter.service.ts
  proposeForExistingBarter(barterId: number | undefined, proposalData: {
    id_prod_request: number,
    id_user_receiving: number,
    notes?: string
  }): Observable<any> {
    if (barterId === undefined) {
      return throwError(() => new Error('ID de trueque indefinido'));
    }
    
    console.log(`🔄 Enviando propuesta para trueque existente ID:${barterId}`, proposalData);

    // CORRECIÓN: Añadir una barra entre el myApiUrl y el barterId
    return this.http.patch(
      `${this.myAppUrl}${this.myApiUrl}${barterId}/propose`,
      proposalData,
      { headers: this.getAuthHeaders() }
    ).pipe(
      tap(response => {
        console.log('✅ Propuesta enviada correctamente:', response);
        console.log('URL utilizada:', `${this.myAppUrl}${this.myApiUrl}${barterId}/propose`);
      }),
      catchError(error => {
        console.error('❌ Error al enviar propuesta:', error);
        console.error('URL que falló:', `${this.myAppUrl}${this.myApiUrl}${barterId}/propose`);
        console.error('Datos enviados:', proposalData);
        return throwError(() => error);
      })
    );
  }

  // Añadir método para buscar barters por el producto que se ofrece
  getBartersByProductOffered(productId: number): Observable<any> {
    return this.http.get<any>(`${this.myAppUrl}${this.myApiUrl}product-offered/${productId}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap(barters => {
        console.log(`Encontrados ${barters.length} barters para producto ${productId}:`, barters);
      }),
      catchError(error => {
        console.error(`Error buscando barters para producto ${productId}:`, error);
        return throwError(() => error);
      })
    );
  }
}

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment';

@Injectable({
  providedIn: 'root'
})
export class ShipmentService {
  private apiUrl = environment.endpoint;

  constructor(private http: HttpClient) { }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  private normalizeUrl(path: string): string {
    const normalizedPath = path.startsWith('/') ? path.substring(1) : path;
    const baseUrl = this.apiUrl.endsWith('/') ? this.apiUrl : `${this.apiUrl}/`;
    return `${baseUrl}${normalizedPath}`;
  }

  /**
   * Obtiene información de envío por ID de transacción
   */
  getShipmentByTransaction(transactionId: number): Observable<any> {
    return this.http.get<any>(
      this.normalizeUrl(`api/shipment/transaction/${transactionId}`),
      { headers: this.getHeaders() }
    );
  }

  /**
   * Obtiene información de envío por ID de trueque
   */
  getShipmentByBarter(barterId: number, userId: number): Observable<any> {
    return this.http.get<any>(
      this.normalizeUrl(`api/shipment/barter/${barterId}/${userId}`),
      { headers: this.getHeaders() }
    );
  }

  /**
   * Simula consulta a API de Servientrega (para futuro)
   */
  getServientregaTracking(trackingNumber: string): Observable<any> {
    // Por ahora retorna datos simulados
    // En el futuro aquí se haría la consulta real a Servientrega
    return new Observable(observer => {
      setTimeout(() => {
        observer.next({
          tracking_number: trackingNumber,
          status: 'en_transito',
          events: [
            {
              date: new Date(),
              status: 'En tránsito',
              description: 'Paquete en camino al destino',
              location: 'Centro de distribución Bogotá'
            }
          ]
        });
        observer.complete();
      }, 1000);
    });
  }
}
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TransactionService } from '../services/transaction.service';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';
import { switchMap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { HeaderComponent } from '../header/header.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { FooterComponent } from '../footer/footer.component';
@Component({
  selector: 'app-barter-payment-response',
  standalone: true,
  imports: [CommonModule, HeaderComponent, NavbarComponent, FooterComponent],
  templateUrl: './barter-payment-response.component.html',
  styleUrls: ['./barter-payment-response.component.css']
})
export class BarterPaymentResponseComponent implements OnInit {
  loading = true;
  error = false;
  errorMessage = '';
  
  transactionData: any = null;
  barterData: any = null;
  transactionState: string = '';
  stateMessage: string = '';
  stateClass: string = '';
  
  // Datos de respuesta PayU (igual que en payu-response normal)
  referenceCode: string = '';
  merchantId: string = '';
  transactionId: string = '';
  amount: string = '';
  currency: string = '';
  description: string = '';
  lapTransactionState: string = '';
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private transactionService: TransactionService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    console.log('🔍 Iniciando componente barter-payment-response');
    this.processPayUResponse();
  }

  processPayUResponse(): void {
    this.route.queryParams.pipe(
      switchMap(params => {
        console.log('📨 PayU Barter response params (COMPLETOS):', params);
        
        // ✅ MISMOS PARÁMETROS que en payu-response normal
        this.referenceCode = params['referenceCode'] || '';
        this.merchantId = params['merchantId'] || '';
        this.transactionId = params['transactionId'] || '';
        this.amount = params['TX_VALUE'] || '';
        this.currency = params['currency'] || 'COP';
        this.description = params['description'] || '';
        this.lapTransactionState = params['lapTransactionState'] || '';
        
        // ✅ EXTRAER ESTADO igual que en el normal
        const state = params['transactionState'] || 
                     params['lapTransactionState'] || 
                     params['state_pol'];
        
        console.log('🔍 Estado extraído de PayU para trueque:', state);
        console.log('🔍 Referencia extraída:', this.referenceCode);
        
        // Establecer estado visual inicial
        this.setTransactionState(state);
        
        // ✅ VERIFICAR EL PAGO usando el endpoint específico de trueques
        if (this.referenceCode) {
          console.log('🔍 Verificando pago de trueque con referencia:', this.referenceCode);
          return this.transactionService.verifyBarterPayment(this.referenceCode)
            .pipe(
              catchError(error => {
                console.error('❌ Error al verificar el pago de trueque:', error);
                this.error = true;
                this.errorMessage = 'No pudimos verificar el estado actual de tu pago de trueque.';
                return of({ success: false, error: error });
              })
            );
        }
        
        console.error('❌ No se recibió código de referencia');
        this.error = true;
        this.errorMessage = 'No se recibió código de referencia del pago';
        return of({ success: false });
      })
    ).subscribe({
      next: (response: any) => {
        console.log('📥 Respuesta del backend para trueque:', response);
        this.loading = false;
        
        if (response.success && response.transaction) {
          this.transactionData = response.transaction;
          this.barterData = response.barter;
          
          console.log('✅ Transacción de trueque encontrada:', this.transactionData);
          console.log('✅ Barter encontrado:', this.barterData);
          
          // ✅ ACTUALIZAR ESTADO según la base de datos (igual que normal)
          this.setTransactionState(this.mapDatabaseState(this.transactionData.status));
          
          // ✅ NOTIFICACIONES según estado (igual que normal)
          this.showNotificationForState(this.transactionData.status);
        } else {
          console.error('❌ Respuesta sin éxito del backend para trueque:', response);
          this.error = true;
          this.errorMessage = response.message || 'No se pudo verificar el pago del trueque';
        }
      },
      error: (err: any) => {
        this.loading = false;
        this.error = true;
        this.errorMessage = 'Hubo un error al procesar la respuesta de pago del trueque.';
        console.error('❌ Error al procesar la respuesta de PayU para trueque:', err);
      }
    });
  }
  
  // ✅ MISMO MAPEO que en payu-response normal
  private setTransactionState(state: string): void {
    console.log('🔄 Estableciendo estado para trueque:', state);
    
    switch(state) {
      case '4':
      case 'APPROVED':
      case 'COMPLETADA':
        this.transactionState = 'APROBADA';
        this.stateMessage = 'Tu pago del servicio de trueque ha sido aprobado exitosamente.';
        this.stateClass = 'success';
        break;
        
      case '6':
      case 'DECLINED':
      case 'FALLIDA':
        this.transactionState = 'RECHAZADA';
        this.stateMessage = 'Lo sentimos, tu pago del servicio de trueque ha sido rechazado.';
        this.stateClass = 'danger';
        break;
        
      case '7':
      case 'PENDING':
      case 'PENDIENTE':
        this.transactionState = 'PENDIENTE';
        this.stateMessage = 'Tu pago del servicio de trueque está pendiente de confirmación.';
        this.stateClass = 'warning';
        break;
        
      default:
        this.transactionState = 'DESCONOCIDO';
        this.stateMessage = 'Estado de transacción de trueque desconocido.';
        this.stateClass = 'secondary';
    }
    
    console.log('📊 Estado establecido para trueque:', {
      state: this.transactionState,
      class: this.stateClass,
      message: this.stateMessage
    });
  }
  
  // ✅ MISMO MAPEO que en payu-response normal
  private mapDatabaseState(dbState: string): string {
    switch(dbState) {
      case 'completada': return 'APPROVED';
      case 'fallida': return 'DECLINED';
      case 'pendiente': return 'PENDING';
      case 'reembolsada': return 'REFUNDED';
      default: return 'UNKNOWN';
    }
  }
  
  // ✅ NOTIFICACIONES específicas para trueques
  private showNotificationForState(status: string): void {
    switch(status) {
      case 'completada':
        this.toastr.success('¡Pago del servicio de trueque realizado con éxito!', 'Trueque Confirmado');
        break;
      case 'fallida':
        this.toastr.error('El pago del servicio de trueque ha sido rechazado', 'Pago Rechazado');
        break;
      case 'pendiente':
        this.toastr.info('El pago del servicio de trueque está siendo procesado', 'Pago en Proceso');
        break;
      case 'reembolsada':
        this.toastr.info('El pago del servicio de trueque ha sido reembolsado', 'Pago Reembolsado');
        break;
    }
  }
  
  // ✅ NAVEGACIÓN específica para trueques
  goToBarterHistory(): void {
    this.router.navigate(['/userviewbar']);
  }
  
  goToBarterDetails(): void {
    if (this.barterData?.id_barter) {
      this.router.navigate(['/barter-details', this.barterData.id_barter]);
    } else {
      this.goToBarterHistory();
    }
  }
  
  retry(): void {
    if (this.barterData?.id_barter) {
      this.router.navigate(['/barter-checkout', this.barterData.id_barter]);
    } else {
      this.goToBarterHistory();
    }
  }
  
  goHome(): void {
    this.router.navigate(['/']);
  }

  // ✅ MÉTODO DE DEBUG (igual que en payu-response normal)
  updateBarterStatus(newStatus: 'pendiente' | 'completada' | 'fallida' | 'reembolsada'): void {
    if (!this.referenceCode) {
      this.toastr.error('No hay referencia para actualizar');
      return;
    }
    
    console.log('🔄 Actualizando estado de trueque a:', newStatus);
    this.loading = true;
    
    this.transactionService.updateBarterPaymentStatus({
      reference: this.referenceCode, 
      status: newStatus
    }).subscribe({
      next: (resp: any) => {
        this.loading = false;
        console.log('✅ Estado de trueque actualizado:', resp);
        
        if (resp.success) {
          this.transactionData = resp.transaction;
          this.setTransactionState(this.mapDatabaseState(newStatus));
          this.showNotificationForState(newStatus);
        }
      },
      error: (err: any) => {
        this.loading = false;
        this.toastr.error('Error al actualizar estado del pago de trueque');
        console.error('❌ Error:', err);
      }
    });
  }

  // ✅ MÉTODO PARA MOSTRAR INFO DE DEBUG
  showDebugInfo(): void {
    console.log('🔍 INFO DE DEBUG - Respuesta de PayU para Trueque:');
    console.log('  - referenceCode:', this.referenceCode);
    console.log('  - merchantId:', this.merchantId);
    console.log('  - transactionId:', this.transactionId);
    console.log('  - amount:', this.amount);
    console.log('  - lapTransactionState:', this.lapTransactionState);
    console.log('  - currency:', this.currency);
    console.log('  - Estado actual:', this.transactionState);
    console.log('  - Datos de transacción:', this.transactionData);
    console.log('  - Datos de barter:', this.barterData);
  }
}

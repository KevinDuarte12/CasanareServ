import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TransactionService } from '../services/transaction.service';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';
import { map, switchMap, catchError } from 'rxjs/operators';
import { of, Observable } from 'rxjs';
import { HeaderComponent } from '../header/header.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { FooterComponent } from '../footer/footer.component';
@Component({
  selector: 'app-payu-response',
  standalone: true,
  imports: [CommonModule, HeaderComponent, NavbarComponent, FooterComponent],
  templateUrl: './payu-response.component.html',
  styleUrls: ['./payu-response.component.css']
})
export class PayuResponseComponent implements OnInit {
  loading = true;
  error = false;
  errorMessage = '';

  transactionData: any = null;
  transactionState: string = '';
  stateMessage: string = '';
  stateClass: string = '';

  // Datos de respuesta PayU
  referenceCode: string = '';
  merchantId: string = '';
  transactionId: string = '';
  amount: string = '';
  currency: string = '';
  description: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private transactionService: TransactionService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.processPayUResponse();
  }

  processPayUResponse(): void {
    this.route.queryParams.pipe(
      switchMap(params => {
        console.log('PayU response params:', params);

        // ✅ OBTENER PARÁMETROS
        this.referenceCode = params['referenceCode'] || params['reference'] || params['reference_sale'];
        this.merchantId = params['merchantId'] || params['merchant_id'];
        this.transactionId = params['transactionId'] || params['transaction_id'];
        this.amount = params['TX_VALUE'] || params['amount'];
        this.currency = params['currency'] || 'COP';
        this.description = params['description'];

        console.log('Parámetros procesados:', {
          referenceCode: this.referenceCode,
          merchantId: this.merchantId,
          transactionId: this.transactionId,
          amount: this.amount,
          allParams: params
        });

        // ✅ OBTENER ESTADO DIRECTAMENTE DE LOS PARÁMETROS
        const state = params['transactionState'] ||
                     params['lapTransactionState'] ||
                     params['polTransactionState'] ||
                     params['status'] ||
                     params['state'];

        console.log('Estado recibido:', state);

        // ✅ VERIFICAR SI YA VIENE CON ESTADO PROCESADO
        if (params['status'] && params['reference']) {
          // Los parámetros vienen del backend después de procesar
          console.log('✅ Parámetros ya procesados por el backend');

          this.transactionData = {
            reference: params['reference'],
            amount: parseFloat(params['amount'] || this.amount || '0'),
            date: new Date(),
            paymentMethod: 'PayU',
            status: params['status']
          };

          this.setTransactionState(this.mapDatabaseState(params['status']));
          this.loading = false;

          // Mostrar notificación
          if (params['status'] === 'completada') {
            this.toastr.success('¡Pago realizado con éxito!');
          }

          return of({ success: true, transaction: this.transactionData });
        }

        // ✅ SI NO VIENE PROCESADO, USAR EL ESTADO DE PAYU DIRECTAMENTE
        if (state && this.referenceCode) {
          console.log('✅ Procesando estado de PayU directamente');

          // Mapear estado de PayU
          let finalStatus = 'pendiente';
          switch (state) {
            case '4':
            case 'APPROVED':
            case 'completada':
              finalStatus = 'completada';
              break;
            case '6':
            case '5':
            case 'DECLINED':
            case 'EXPIRED':
            case 'fallida':
              finalStatus = 'fallida';
              break;
            case '7':
            case 'PENDING':
            case 'pendiente':
              finalStatus = 'pendiente';
              break;
          }

          this.transactionData = {
            reference: this.referenceCode,
            amount: parseFloat(this.amount || '0'),
            date: new Date(),
            paymentMethod: 'PayU',
            status: finalStatus
          };

          this.setTransactionState(this.mapDatabaseState(finalStatus));
          this.loading = false;

          // Mostrar notificación
          if (finalStatus === 'completada') {
            this.toastr.success('¡Pago realizado con éxito!');
          } else if (finalStatus === 'fallida') {
            this.toastr.error('El pago ha sido rechazado');
          }

          return of({ success: true, transaction: this.transactionData });
        }

        // ✅ SOLO COMO ÚLTIMO RECURSO, VERIFICAR CON EL BACKEND
        if (this.referenceCode) {
          console.log('🔍 Verificando pago con referencia como último recurso:', this.referenceCode);
          return this.transactionService.verifyPayment(this.referenceCode)
            .pipe(
              catchError(error => {
                console.error('Error al verificar el pago:', error);
                // En caso de error, asumir que está completado si viene de PayU
                if (state) {
                  this.transactionData = {
                    reference: this.referenceCode,
                    amount: parseFloat(this.amount || '0'),
                    date: new Date(),
                    paymentMethod: 'PayU',
                    status: 'completada'
                  };
                  this.setTransactionState('APPROVED');
                  this.toastr.success('¡Pago realizado con éxito!');
                  return of({ success: true, transaction: this.transactionData });
                }

                this.error = true;
                this.errorMessage = 'No pudimos verificar el estado del pago, pero tu transacción puede haber sido procesada.';
                return of({ success: false, error: error });
              })
            );
        }

        // ✅ ERROR SI NO HAY REFERENCIA
        console.error('❌ No se encontró código de referencia');
        this.error = true;
        this.errorMessage = `No se recibió código de referencia válido. Parámetros: ${Object.keys(params).join(', ')}`;
        return of({ success: false });
      })
    ).subscribe({
      next: (response: any) => {
        this.loading = false;

        if (response.success && response.transaction) {
          this.transactionData = response.transaction;
          console.log('✅ Transacción procesada exitosamente:', this.transactionData);
        }
      },
      error: (err: any) => {
        this.loading = false;
        this.error = true;
        this.errorMessage = 'Hubo un error al procesar la respuesta de pago.';
        console.error('Error al procesar la respuesta de PayU:', err);
      }
    });
  }

  private setTransactionState(state: string): void {
    switch(state) {
      case '4':
      case 'APPROVED':
      case 'COMPLETADA':
        this.transactionState = 'APROBADO';
        this.stateMessage = 'Tu pago ha sido aprobado exitosamente.';
        this.stateClass = 'success';
        break;

      case '6':
      case 'DECLINED':
      case 'FALLIDA':
        this.transactionState = 'RECHAZADA';
        this.stateMessage = 'Lo sentimos, tu pago ha sido rechazado.';
        this.stateClass = 'danger';
        break;

      case '7':
      case 'PENDING':
      case 'PENDIENTE':
        this.transactionState = 'PENDIENTE';
        this.stateMessage = 'Tu pago está pendiente de confirmación.';
        this.stateClass = 'warning';
        break;

      default:
        this.transactionState = 'DESCONOCIDO';
        this.stateMessage = 'Estado de transacción desconocido.';
        this.stateClass = 'secondary';
    }
  }

  private mapDatabaseState(dbState: string): string {
    switch(dbState) {
      case 'completada': return 'APPROVED';
      case 'fallida': return 'DECLINED';
      case 'pendiente': return 'PENDING';
      case 'reembolsada': return 'REFUNDED';
      default: return 'UNKNOWN';
    }
  }

  goToOrders(): void {
    // Verificar si viene de productos comprados
    this.route.queryParams.subscribe(params => {
      if (params['fromPurchased'] === 'true') {
        // Redirigir a la vista de usuario en la pestaña de comprados
        this.router.navigate(['/user-profile'], {
          queryParams: { tab: 'comprados' }
        }).then(() => {
          // ✅ AGREGAR: Hacer scroll al inicio después de navegar
          window.scrollTo(0, 0);
        });
      } else {
        // Comportamiento normal - ir a mis compras (userviewbar)
        this.router.navigate(['/user-profile'], {
          queryParams: { tab: 'comprados' }
        }).then(() => {
          // ✅ AGREGAR: Hacer scroll al inicio después de navegar
          window.scrollTo(0, 0);
        });
      }
    });
  }

  retry(): void {
    this.router.navigate(['/carrito']);
  }

  goHome(): void {
    this.router.navigate(['/']);
  }

  // Corregido el nombre del método para coincidir con el del servicio
  updateStatus(newStatus: 'pendiente' | 'completada' | 'fallida' | 'reembolsada'): void {
    if (!this.referenceCode) return;

    this.loading = true;
    this.transactionService.updatePaymentStatusManually({
      reference: this.referenceCode,
      status: newStatus
    })
      .subscribe({
        next: (resp: any) => {
          this.loading = false;
          if (resp.success) {
            this.transactionData = resp.transaction;
            this.setTransactionState(this.mapDatabaseState(newStatus));
            this.toastr.success(`Estado actualizado a: ${newStatus}`);
          }
        },
        error: (err: any) => {
          this.loading = false;
          this.toastr.error('Error al actualizar estado');
          console.error('Error:', err);
        }
      });
  }
}

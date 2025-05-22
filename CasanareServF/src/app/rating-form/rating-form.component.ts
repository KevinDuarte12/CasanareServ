import { Component, EventEmitter, Input, OnInit, OnDestroy, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StarRatingComponent } from '../star-rating/star-rating.component';
import { RatingService } from '../services/rating.service';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../services/auth.service';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-rating-form',
  standalone: true,
  imports: [CommonModule, FormsModule, StarRatingComponent, RouterModule],
  templateUrl: './rating-form.component.html',
  styleUrl: './rating-form.component.css'
})
export class RatingFormComponent implements OnInit, OnDestroy {
  @Input() productId!: number;
  @Output() ratingSubmitted = new EventEmitter<any>();
  
  rating: number = 0;
  comment: string = '';
  isSubmitting: boolean = false;
  isAuthenticated: boolean = false;
  
  // Añadir una propiedad para mantener la suscripción
  private authSubscription: Subscription | null = null;

  constructor(
    private ratingService: RatingService,
    private authService: AuthService,
    private toastr: ToastrService
  ) { }

  ngOnInit(): void {
    // Verificar el estado inicial de autenticación
    this.isAuthenticated = this.authService.isAuthenticated();
    
    // Suscribirse a cambios en el estado de autenticación
    this.authSubscription = this.authService.authStatusChanged.subscribe((isAuthenticated: boolean) => {
      this.isAuthenticated = isAuthenticated;
    });
  }

  ngOnDestroy(): void {
    // Cancelar la suscripción cuando se destruye el componente
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  onRatingChange(value: number): void {
    this.rating = value;
  }

  submitRating(): void {
    if (!this.rating) {
      this.toastr.warning('Por favor selecciona una calificación');
      return;
    }

    this.isSubmitting = true;
    
    const ratingData = {
      id_product: this.productId,
      score: this.rating,
      comment: this.comment
    };

    this.ratingService.createRating(ratingData).subscribe({
      next: (response) => {
        this.toastr.success('Calificación enviada correctamente');
        this.rating = 0;
        this.comment = '';
        this.isSubmitting = false;
        this.ratingSubmitted.emit(response);
      },
      error: (error) => {
        console.error('Error al enviar calificación:', error);
        let errorMsg = 'Error al enviar calificación';
        
        if (error.error?.msg) {
          errorMsg = error.error.msg;
        }
        
        this.toastr.error(errorMsg);
        this.isSubmitting = false;
      }
    });
  }
}

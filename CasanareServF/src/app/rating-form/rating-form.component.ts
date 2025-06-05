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
  
  rating: number = 0; // OBLIGATORIO
  comment: string = ''; // OPCIONAL
  selectedImages: File[] = []; // ✅ OPCIONAL - Puede estar vacío
  imagePreviewUrls: string[] = [];
  maxImages: number = 3;
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

  // ✅ NUEVO: Método para seleccionar imágenes
  onImageSelected(event: any): void {
    const files = Array.from(event.target.files) as File[];
    
    if (this.selectedImages.length + files.length > this.maxImages) {
      this.toastr.warning(`Máximo ${this.maxImages} imágenes permitidas`);
      return;
    }

    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        this.selectedImages.push(file);
        
        // Crear preview
        const reader = new FileReader();
        reader.onload = (e) => {
          this.imagePreviewUrls.push(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // ✅ NUEVO: Remover imagen
  removeImage(index: number): void {
    this.selectedImages.splice(index, 1);
    this.imagePreviewUrls.splice(index, 1);
  }

  submitRating(): void {
    // ✅ VALIDACIÓN: Solo la calificación es obligatoria
    if (!this.rating || this.rating === 0) {
      this.toastr.warning('Por favor selecciona una calificación');
      return;
    }

    this.isSubmitting = true;
    
    // ✅ DETECTAR: Si hay imágenes, usar FormData; si no, usar JSON simple
    if (this.selectedImages.length > 0) {
      // Caso 1: CON imágenes - usar FormData
      const formData = new FormData();
      formData.append('id_product', this.productId.toString());
      formData.append('score', this.rating.toString());
      formData.append('comment', this.comment || ''); // Comentario opcional
      
      // Agregar imágenes
      this.selectedImages.forEach((image) => {
        formData.append('images', image);
      });

      this.ratingService.createRating(formData).subscribe({
        next: (response) => this.handleSuccess(response),
        error: (error) => this.handleError(error)
      });
    } else {
      // Caso 2: SIN imágenes - usar JSON simple (más eficiente)
      const ratingData = {
        id_product: this.productId,
        score: this.rating,
        comment: this.comment || '' // Comentario opcional
      };

      this.ratingService.createRating(ratingData).subscribe({
        next: (response) => this.handleSuccess(response),
        error: (error) => this.handleError(error)
      });
    }
  }

  private handleSuccess(response: any): void {
    this.toastr.success('Calificación enviada correctamente');
    this.resetForm();
    this.ratingSubmitted.emit(response);
  }

  private handleError(error: any): void {
    console.error('Error al enviar calificación:', error);
    this.toastr.error('Error al enviar calificación');
    this.isSubmitting = false;
  }

  private resetForm(): void {
    this.rating = 0;
    this.comment = '';
    this.selectedImages = []; // ✅ LIMPIAR imágenes opcionales
    this.imagePreviewUrls = [];
    this.isSubmitting = false;
  }
  clearAllImages(): void {
  this.selectedImages = [];
  this.imagePreviewUrls = [];
  
  // Limpiar el input file
  const fileInput = document.querySelector('.file-input-hidden') as HTMLInputElement;
  if (fileInput) {
    fileInput.value = '';
  }
}
}

import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StarRatingComponent } from '../star-rating/star-rating.component';
import { RatingService } from '../services/rating.service';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../services/auth.service'; // ✅ AGREGAR AuthService
import { RouterModule } from '@angular/router';

interface Rating {
  id_raiting: number;
  score: number;
  comment: string;
  createdAt: string;
  user_qualifying: {
    id: number;
    name: string;
    userImages?: { url: string }[];
  };
  
  ratingImages?: { 
    id: number; // 
    url: string; 
    alt_text?: string;
  }[];
}

interface RatingSummary {
  average: number;
  total: number;
  stats: { [key: number]: number }; // { 5: 10, 4: 5, ... }
}

@Component({
  selector: 'app-ratings-list',
  standalone: true,
  imports: [CommonModule, StarRatingComponent],
  templateUrl: './ratings-list.component.html',
  styleUrl: './ratings-list.component.css'
})
export class RatingsListComponent implements OnInit {
  @Input() productId!: number;
  ratings: any[] = [];
  summary: any = { average: 0, total: 0, stats: {} };
  loading: boolean = false;

  // ✅ NUEVO: Propiedades para el modal de imagen
  showImageModal: boolean = false;
  selectedImageUrl: string = '';

  // ✅ AGREGAR: Propiedad para el usuario actual
  currentUserId: number | null = null;

  constructor(
    private ratingService: RatingService, 
    private toastr: ToastrService,
    private authService: AuthService // ✅ INYECTAR AuthService
  ) {}

  ngOnInit(): void {
    this.loadRatings();
    // ✅ OBTENER: ID del usuario actual
    this.currentUserId = this.authService.getCurrentUserId();
  }

  loadRatings(): void {
    if (!this.productId) return;

    this.loading = true;
    this.ratingService.getProductRatings(this.productId).subscribe({
      next: (response) => {
        console.log('📊 Respuesta de ratings:', response); // ✅ DEBUG
        console.log('📷 Primera rating con imágenes:', response.ratings[0]?.ratingImages); // ✅ DEBUG
        
        this.ratings = response.ratings || [];
        this.summary = response.summary || { average: 0, total: 0, stats: {} };
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar calificaciones:', error);
        this.loading = false;
      }
    });
  }

  refreshRatings(): void {
    this.loadRatings();
  }

  getPercentage(star: number): number {
    if (!this.summary || !this.summary.total || this.summary.total === 0) {
      return 0;
    }
    return ((this.summary.stats[star] || 0) / this.summary.total) * 100;
  }

  getCount(star: number): number {
    return this.summary?.stats[star] || 0;
  }

  // ✅ NUEVO: Método para verificar si el usuario puede eliminar la reseña
  canDeleteRating(rating: Rating): boolean {
    return this.currentUserId !== null && 
           this.currentUserId === rating.user_qualifying.id;
  }

  // ✅ NUEVO: Método para abrir modal de imagen
  openImageModal(imageUrl: string): void {
    this.selectedImageUrl = imageUrl;
    this.showImageModal = true;
  }

  // ✅ NUEVO: Método para cerrar modal de imagen
  closeImageModal(): void {
    this.showImageModal = false;
    this.selectedImageUrl = '';
  }

  // ✅ NUEVO: Método para cerrar modal al hacer clic en el fondo
  onModalBackdropClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.closeImageModal();
    }
  }

  // ✅ MEJORADO: Método para eliminar calificación con mejor UX
  deleteRating(rating: Rating): void {
    const hasImages = rating.ratingImages && rating.ratingImages.length > 0;
    const imagesText = hasImages ? ` y ${rating.ratingImages!.length} imagen(es)` : '';
    
    const confirmMessage = `¿Estás seguro de que deseas eliminar esta calificación${imagesText}? Esta acción no se puede deshacer.`;
    
    if (confirm(confirmMessage)) {
      this.ratingService.deleteRating(rating.id_raiting).subscribe({
        next: (response) => {
          console.log('📊 Respuesta de eliminación:', response);
          
          let message = 'Calificación eliminada correctamente';
          if (response.details?.imagesDeleted > 0) {
            message += ` (${response.details.imagesDeleted} imágenes eliminadas)`;
          }
          
          this.toastr.success(message);
          this.loadRatings(); // Recargar la lista
        },
        error: (error) => {
          console.error('❌ Error al eliminar:', error);
          this.toastr.error('Error al eliminar la calificación');
        }
      });
    }
  }
}

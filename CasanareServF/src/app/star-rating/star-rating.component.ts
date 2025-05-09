import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-star-rating',
  standalone: true,
  imports: [ CommonModule ],
  templateUrl: './star-rating.component.html',
  styleUrl: './star-rating.component.css'
})
export class StarRatingComponent implements OnInit, OnChanges {
  @Input() rating: number = 0;
  @Input() readonly: boolean = false;
  @Input() showValue: boolean = false;
  @Output() ratingChange = new EventEmitter<number>();

  stars: number[] = [0, 0, 0, 0, 0];
  hoverRating: number = 0;
  displayValue: string = '';
  
  // Guardar la calificación original para restaurarla después del hover
  private originalStars: number[] = [];

  ngOnInit(): void {
    this.updateStars();
    // Guardar la configuración original de estrellas
    this.originalStars = [...this.stars];
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['rating']) {
      this.updateStars();
      // Actualizar también las estrellas originales
      this.originalStars = [...this.stars];
    }
  }

  onHover(index: number): void {
    if (this.readonly) return;
    
    this.hoverRating = index;
    
    // Guardar las estrellas originales antes de modificarlas (solo la primera vez)
    if (this.originalStars.length === 0) {
      this.originalStars = [...this.stars];
    }
    
    // Actualizar estrellas para mostrar el efecto hover
    this.updateStarsForHover();
  }

  onLeave(): void {
    if (this.readonly) return;
    
    this.hoverRating = 0;
    
    // Restaurar las estrellas a su estado original
    this.stars = [...this.originalStars];
  }

  onRate(index: number): void {
    if (!this.readonly) {
      this.rating = index;
      this.updateStars();
      // Actualizar las estrellas originales
      this.originalStars = [...this.stars];
      this.ratingChange.emit(this.rating);
    }
  }

  private updateStars(): void {
    // Resetear estrellas
    this.stars = [0, 0, 0, 0, 0];
    
    // Actualizar según la calificación
    const fullStars = Math.floor(this.rating);
    const hasHalfStar = this.rating % 1 >= 0.5;
    
    // Llenar estrellas completas
    for (let i = 0; i < fullStars; i++) {
      this.stars[i] = 1;
    }
    
    // Agregar media estrella si corresponde
    if (hasHalfStar && fullStars < 5) {
      this.stars[fullStars] = 0.5;
    }
  }

  private updateStarsForHover(): void {
    // Actualizar estrellas para modo hover
    this.stars = [0, 0, 0, 0, 0];
    for (let i = 0; i < this.hoverRating; i++) {
      this.stars[i] = 1;
    }
  }
}

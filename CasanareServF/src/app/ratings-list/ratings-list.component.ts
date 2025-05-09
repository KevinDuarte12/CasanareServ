import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StarRatingComponent } from '../star-rating/star-rating.component';
import { RatingService } from '../services/rating.service';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../services/auth.service';
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
}

interface RatingSummary {
  average: number;
  total: number;
  stats: { [key: number]: number }; // { 5: 10, 4: 5, ... }
}

@Component({
  selector: 'app-ratings-list',
  standalone: true,
  imports: [CommonModule, StarRatingComponent, ],
  templateUrl: './ratings-list.component.html',
  styleUrl: './ratings-list.component.css'
})
export class RatingsListComponent implements OnInit {
  @Input() productId!: number;
  ratings: any[] = [];
  summary: any = { average: 0, total: 0, stats: {} };
  loading: boolean = false;

  constructor(private ratingService: RatingService) {}

  ngOnInit(): void {
    this.loadRatings();
  }

  loadRatings(): void {
    if (!this.productId) return;
    
    this.loading = true;
    this.ratingService.getProductRatings(this.productId).subscribe({
      next: (response) => {
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
}

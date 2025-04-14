import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-category-badge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './category-badge.component.html', 
  styleUrls: ['./category-badge.component.css']
})
export class CategoryBadgeComponent {
  @Input() count: number = 0;
  @Input() active: boolean = false;
}
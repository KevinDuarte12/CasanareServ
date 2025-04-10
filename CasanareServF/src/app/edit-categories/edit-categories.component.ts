import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { CategoryService } from '../services/category.service'; 
import { Category } from '../interfaces/category';

@Component({
  selector: 'app-edit-category',
  templateUrl: './edit-categories.component.html',
  styleUrls: ['./edit-categories.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class EditCategoryComponent implements OnInit {
  @Input() categoryId: number | undefined;
  @Input() isOpen: boolean = false;
  @Output() close = new EventEmitter<boolean>();
  
  categoryData: Category = {
    name: '',
    description: '',
    image: '',
    status: true
  };
  
  loading: boolean = false;

  constructor(
    private categoryService: CategoryService,
    private toastr: ToastrService
  ) { }

  ngOnInit(): void {
    if (this.categoryId) {
      this.loadCategoryData();
    }
  }

  loadCategoryData(): void {
    this.loading = true;
    this.categoryService.getCategory(this.categoryId!).subscribe({
      next: (data) => {
        this.categoryData = data;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar datos de la categoría:', error);
        this.loading = false;
        this.toastr.error('Error al cargar los datos de la categoría');
        this.closeModal(false);
      }
    });
  }

  onSubmit(): void {
    this.loading = true;
    
    if (this.categoryId) {
      // Actualizar categoría existente
      this.categoryService.updateCategory(this.categoryId, this.categoryData).subscribe({
        next: () => {
          this.toastr.success('Categoría actualizada exitosamente');
          this.closeModal(true);
        },
        error: (error) => {
          console.error('Error al actualizar categoría:', error);
          this.loading = false;
          this.toastr.error('Error al actualizar la categoría');
        }
      });
    } else {
      // Crear nueva categoría
      this.categoryService.createCategory(this.categoryData).subscribe({
        next: () => {
          this.toastr.success('Categoría creada exitosamente');
          this.closeModal(true);
        },
        error: (error) => {
          console.error('Error al crear categoría:', error);
          this.loading = false;
          this.toastr.error('Error al crear la categoría');
        }
      });
    }
  }

  cancel(): void {
    this.closeModal(false);
  }

  closeModal(refresh: boolean): void {
    this.close.emit(refresh);
  }
}

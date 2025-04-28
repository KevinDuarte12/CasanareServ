import { Component, OnInit, Input, Output, EventEmitter, ChangeDetectorRef, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { CategoryService } from '../services/category.service';
import { Category } from '../interfaces/category';
import { ImageUploadComponent } from '../image-upload/image-upload.component';
import { Image } from '../interfaces/image';

@Component({
  selector: 'app-edit-category',
  templateUrl: './edit-categories.component.html',
  styleUrls: ['./edit-categories.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, ImageUploadComponent]
})
export class EditCategoryComponent implements OnInit {
  @ViewChild('categoryForm') formElement!: ElementRef;
  @Input() categoryId: number | undefined;
  @Input() isOpen: boolean = false;
  @Output() close = new EventEmitter<boolean>();
  
  categoryData: Category = {
    id_category: 0,
    name: '',
    description: '',
    status: true
  };
  
  loading: boolean = false;
  isSaving: boolean = false;
  
  constructor(
    private categoryService: CategoryService,
    private toastr: ToastrService,
    private changeDetectorRef: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    // Si hay un ID de categoría, cargar los datos
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
        this.toastr.error('Error al cargar los datos de la categoría');
        this.loading = false;
        this.closeModal(false);
      }
    });
  }

  onSubmit(): void {
    // Validar formulario primero
    if (!this.categoryData.name) {
      this.toastr.warning('El nombre de la categoría es obligatorio');
      return;
    }
  
    this.isSaving = true;
    
    if (this.categoryId) {
      // Actualizar categoría existente
      this.categoryService.updateCategory(this.categoryId, this.categoryData).subscribe({
        next: () => {
          this.toastr.success('Categoría actualizada exitosamente');
          this.isSaving = false;
          this.closeModal(true); // Cerrar modal y actualizar lista de categorías
        },
        error: (error) => {
          console.error('Error al actualizar categoría:', error);
          this.toastr.error(error.error?.msg || 'Error al actualizar la categoría');
          this.isSaving = false;
        }
      });
    } else {
      // Crear nueva categoría
      this.categoryService.createCategory(this.categoryData).subscribe({
        next: (response) => {
          this.toastr.success('Categoría creada exitosamente');
          
          // Sugerir al usuario que ahora puede agregar imágenes
          this.toastr.info('Ahora puedes editar la categoría para agregar una imagen', '', {
            timeOut: 5000
          });
          
          this.isSaving = false;
          this.closeModal(true); // Cerrar el modal y actualizar lista
        },
        error: (error) => {
          console.error('Error al crear categoría:', error);
          this.toastr.error(error.error?.msg || 'Error al crear la categoría');
          this.isSaving = false;
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

  // Método para manejar cambios en las imágenes
  onImageChanged(images: Image[]): void {
    console.log('Imagen cambiada:', images);
    if (this.categoryData && images.length > 0) {
      // Asignar la imagen a la categoría
      const mainImage = images.find(img => img.is_main) || images[0];
      
      // Actualizar la imagen principal
      this.categoryData.image = mainImage.url;
      
      // Notificar al componente que debe actualizarse
      this.changeDetectorRef.detectChanges();
    }
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent) {
    // Only process if modal is open and not saving
    if (this.isOpen && !this.isSaving && !this.loading) {
      const modalContent = this.formElement?.nativeElement;
      if (modalContent && !modalContent.contains(event.target)) {
        this.closeModal(false);
      }
    }
  }

  // Add method to stop click propagation
  onFormClick(event: Event): void {
    event.stopPropagation();
  }
}

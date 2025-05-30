import { Component, ElementRef, Input, Output, EventEmitter, HostListener, ViewChild, ChangeDetectorRef, Injector } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { ProductService } from '../services/productos.services';
import { CategoryService } from '../services/category.service';
import { Product } from '../interfaces/product';
import { Category } from '../interfaces/category';
import { Image } from '../interfaces/image';
import { ImageService } from '../services/image.service';
import { TokenService } from '../services/token.service';
import { Observable, of, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

@Component({
  selector: 'app-edit-product',
  templateUrl: './edit-product.component.html',
  styleUrls: ['./edit-product.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class EditProductComponent {
  @ViewChild('productForm') formElement!: ElementRef;
  @Input() productId: number | undefined;
  @Input() isOpen: boolean = false;
  @Output() close = new EventEmitter<boolean>();

  productData: Product = {
    id_user: 0,
    id_category: 0,
    name: '',
    description: '',
    price: 0,
    stock: 0,
    type: 'regular',
    status: 'disponible'
  };
  
  categories: Category[] = [];
  loading: boolean = false;
  isSaving: boolean = false;
  isUploading: boolean = false;

  // Variables para gestión de imágenes
  selectedFiles: File[] = [];
  selectedImagePreviews: string[] = [];
  existingImages: Image[] = [];
  maxImages: number = 5;
  mainImageIndex: number = 0;

  constructor(
    private productService: ProductService,
    private categoryService: CategoryService,
    private imageService: ImageService,
    private toastr: ToastrService,
    private changeDetectorRef: ChangeDetectorRef,
    private injector: Injector
  ) { }

  ngOnInit(): void {
    this.loadCategories();
    
    if (this.productId) {
      this.loadProductData();
    } else {
      // Para productos nuevos, obtener el ID del usuario actual
      const userData = localStorage.getItem('user');
      if (userData) {
        try {
          const user = JSON.parse(userData);
          this.productData.id_user = user.id;
        } catch (e) {
          console.error('Error al obtener datos del usuario desde localStorage', e);
          // Alternativa: usar el servicio de token
          const tokenService = this.injector.get(TokenService);
          const tokenUserData = tokenService.getUserData();
          if (tokenUserData) {
            this.productData.id_user = tokenUserData.id;
          }
        }
      }
    }
  }

  loadCategories(): void {
    this.loading = true;
    this.categoryService.getCategories().subscribe({
      next: (data) => {
        this.categories = data.filter(category => category.status); // Solo categorías activas
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar categorías:', error);
        this.toastr.error('Error al cargar las categorías');
        this.loading = false;
      }
    });
  }

  loadProductData(): void {
    this.loading = true;
    this.productService.getProduct(this.productId!).subscribe({
      next: (data) => {
        this.productData = data;
        
        // Resetear arreglos de imágenes
        this.selectedFiles = [];
        this.selectedImagePreviews = [];
        this.existingImages = [];
        
        // Cargar imágenes existentes
        if (data.images && data.images.length > 0) {
          console.log('Imágenes cargadas del producto:', data.images);
          
          // Verificar cada imagen antes de añadirla
          this.existingImages = data.images.filter((img: Image) => {
            // Acepta imágenes con id_image o id
            if (img.id_image || img.id) {
              return true;
            }
            console.warn('Imagen sin ID detectada, será omitida:', img);
            return false;
          });
          
          // Para cada imagen existente, añadir su URL a las previsualizaciones
          this.existingImages.forEach((img: Image, index: number) => {
            if (img.url) {
              this.selectedImagePreviews.push(img.url);
              
              // Marcar la imagen principal si existe
              if (img.is_main) {
                this.mainImageIndex = index;
              }
            } else {
              console.warn('Imagen sin URL detectada:', img);
            }
          });
          
          console.log('Imágenes válidas cargadas:', this.existingImages.length);
        }
        
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar datos del producto:', error);
        this.toastr.error('Error al cargar los datos del producto');
        this.loading = false;
        this.closeModal(false);
      }
    });
  }

  onFilesSelected(event: any): void {
    const files: FileList = event.target.files;
    
    // Validar número total de imágenes
    const totalImages = this.selectedImagePreviews.length + files.length;
    if (totalImages > this.maxImages) {
      this.toastr.warning(`Puedes subir un máximo de ${this.maxImages} imágenes por producto`);
      return;
    }

    // Procesar cada archivo seleccionado
    for (let i = 0; i < files.length; i++) {
      const file: File = files[i];
      
      // Validar que sea una imagen
      if (!file.type.startsWith('image/')) {
        this.toastr.error(`El archivo ${file.name} no es una imagen válida`);
        continue;
      }
      
      // Validar tamaño (5MB máximo)
      if (file.size > 5 * 1024 * 1024) {
        this.toastr.error(`La imagen ${file.name} excede el tamaño máximo de 5MB`);
        continue;
      }
      
      // Añadir a la lista de archivos
      this.selectedFiles.push(file);
      
      // Crear vista previa
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        if (reader.result) {
          const previewUrl = reader.result.toString();
          this.selectedImagePreviews.push(previewUrl);
          this.changeDetectorRef.detectChanges();
        }
      };
      reader.readAsDataURL(file);
    }
  }
  
  // Función auxiliar para obtener el ID de una imagen
  private getImageId(image: Image): number | undefined {
    return image.id_image || image.id;
  }

  setMainImage(index: number): void {
    // Validar que haya imágenes
    if (this.selectedImagePreviews.length === 0) {
      this.toastr.warning('No hay imágenes para establecer como principal');
      return;
    }

    // Guardar el índice anterior
    const previousMainIndex = this.mainImageIndex;
    
    // Actualizar el índice localmente
    this.mainImageIndex = index;
    
    // Si es una imagen existente (del servidor)
    if (index < this.existingImages.length) {
      const imageToMakeMain = this.existingImages[index];
      
      // Obtener el ID de la imagen (puede estar en id_image o id)
      const imageId = this.getImageId(imageToMakeMain);
      
      // Verificar que exista el ID
      if (!imageId) {
        console.error('Imagen sin ID válido:', imageToMakeMain);
        this.toastr.error('Error: No se pudo identificar la imagen');
        this.mainImageIndex = previousMainIndex;
        return;
      }
      
      // Mostrar indicador visual
      this.toastr.info('Estableciendo como imagen principal...');
      
      this.imageService.setMainImage(imageId).subscribe({
        next: () => {
          // Actualizar el estado 'is_main' en los objetos de imagen
          this.existingImages.forEach((img, i) => {
            img.is_main = (i === index);
          });
          
          this.toastr.success('Imagen principal actualizada');
        },
        error: (error) => {
          console.error('Error al establecer imagen principal:', error);
          this.toastr.error('No se pudo establecer la imagen principal');
          
          // Restaurar el índice anterior en caso de error
          this.mainImageIndex = previousMainIndex;
        }
      });
    }
  }
  
  removeSelectedImage(index: number): void {
    // Verificar que el índice sea válido
    if (index < 0 || index >= this.selectedImagePreviews.length) {
      console.error('Índice de imagen inválido:', index);
      this.toastr.error('Error: Índice de imagen inválido');
      return;
    }

    // Verificar si es una imagen existente o nueva
    if (index < this.existingImages.length) {
      // Es una imagen existente
      const imageToRemove = this.existingImages[index];
      
      // Obtener el ID de la imagen (puede estar en id_image o id)
      const imageId = this.getImageId(imageToRemove);
      
      // Verificar que exista el ID
      if (!imageId) {
        console.error('Imagen sin ID válido:', imageToRemove);
        this.toastr.error('Error: No se pudo identificar la imagen');
        return;
      }
      
      if (confirm('¿Estás seguro que deseas eliminar esta imagen?')) {
        this.imageService.deleteImage(imageId).subscribe({
          next: () => {
            // Eliminar de los arreglos locales
            this.existingImages.splice(index, 1);
            this.selectedImagePreviews.splice(index, 1);
            
            // Ajustar el índice de la imagen principal
            this.adjustMainImageIndex(index);
            
            this.toastr.success('Imagen eliminada correctamente');
          },
          error: (error) => {
            console.error('Error al eliminar imagen:', error);
            this.toastr.error('No se pudo eliminar la imagen');
          }
        });
      }
    } else {
      // Es una imagen nueva, manejar como antes...
      const newIndex = index - this.existingImages.length;
      
      if (newIndex >= 0 && newIndex < this.selectedFiles.length) {
        this.selectedFiles.splice(newIndex, 1);
      }
      
      this.selectedImagePreviews.splice(index, 1);
      
      // Ajustar el índice de la imagen principal
      this.adjustMainImageIndex(index);
      
      this.toastr.info('Imagen eliminada de la previsualización');
    }
  }

  private adjustMainImageIndex(removedIndex: number): void {
    if (this.mainImageIndex === removedIndex) {
      // Si eliminamos la imagen principal, establecer la primera como principal
      this.mainImageIndex = 0;
    } else if (this.mainImageIndex > removedIndex) {
      // Si eliminamos una imagen antes de la principal, decrementar el índice
      this.mainImageIndex--;
    }
    
    // Si no quedan imágenes, resetear el índice
    if (this.selectedImagePreviews.length === 0) {
      this.mainImageIndex = 0;
    }
  }
  
  uploadImages(productId: number): Observable<any> {
    // Si no hay nuevas imágenes para subir
    if (this.selectedFiles.length === 0) {
      // Para productos existentes, verificar si hay que actualizar la imagen principal
      if (this.productId && this.existingImages.length > 0 && this.mainImageIndex < this.existingImages.length) {
        const mainImage = this.existingImages[this.mainImageIndex];
        const imageId = this.getImageId(mainImage);
        
        if (imageId) {
          return this.imageService.setMainImage(imageId);
        }
      }
      return of({ success: true, images: [] });
    }
    
    this.isUploading = true;
    
    // Calcular el índice principal para las nuevas imágenes
    const mainIndexRelative = this.mainImageIndex >= this.existingImages.length ? 
                            (this.mainImageIndex - this.existingImages.length) : -1;
    
    // Llamar al servicio de subida múltiple
    return this.imageService.uploadMultipleImages('product', productId, this.selectedFiles, mainIndexRelative)
      .pipe(
        tap(() => this.isUploading = false),
        catchError(error => {
          this.isUploading = false;
          console.error('Error al subir imágenes:', error);
          this.toastr.error('Error al subir las imágenes');
          return throwError(() => error);
        })
      );
  }

  onSubmit(): void {
    // Validar formulario primero
    if (!this.productData.name || !this.productData.id_category) {
      this.toastr.warning('Por favor completa todos los campos obligatorios');
      return;
    }

    if (!this.productData.type) {
      this.productData.type = 'regular';
    }

    // Verificar que haya al menos una imagen (ya sea existente o nueva)
    const hasImages = this.selectedImagePreviews.length > 0;
    if (!hasImages) {
      this.toastr.warning('Debes subir al menos una imagen del producto');
      return;
    }

    this.isSaving = true;
    
    if (this.productId) {
      // Actualizar producto existente
      this.productService.updateProduct(this.productId, this.productData).subscribe({
        next: (response) => {
          // Actualizar la imagen principal si es necesario (existe al menos una)
          if (this.existingImages.length > 0 && this.mainImageIndex < this.existingImages.length) {
            const imageToMakeMain = this.existingImages[this.mainImageIndex];
            if (imageToMakeMain.id_image) {
              this.imageService.setMainImage(imageToMakeMain.id_image).subscribe();
            }
          }
          
          // Si hay nuevas imágenes para subir, hacerlo ahora
          if (this.selectedFiles.length > 0) {
            this.uploadImages(this.productId!).subscribe({
              next: (imagesResponse) => {
                this.toastr.success('Producto e imágenes actualizados exitosamente');
                this.isSaving = false;
                this.closeModal(true);
              },
              error: () => { 
                this.isSaving = false;
              }
            });
          } else {
            this.toastr.success('Producto actualizado exitosamente');
            this.isSaving = false;
            this.closeModal(true);
          }
        },
        error: (error) => {
          console.error('Error al actualizar producto:', error);
          this.toastr.error(error.error?.msg || 'Error al actualizar el producto');
          this.isSaving = false;
        }
      });
    } else {
      // Crear nuevo producto
      this.productService.createProduct(this.productData).subscribe({
        next: (response) => {
          const productId = response.product?.id_product || response.id_product;
          
          if (this.selectedFiles.length > 0) {
            this.uploadImages(productId).subscribe({
              next: (imagesResponse) => {
                this.toastr.success('Producto e imágenes creados exitosamente');
                this.isSaving = false;
                this.closeModal(true);
              },
              error: () => {
                this.isSaving = false;
              }
            });
          } else {
            this.toastr.success('Producto creado exitosamente');
            this.isSaving = false;
            this.closeModal(true);
          }
        },
        error: (error) => {
          console.error('Error al crear producto:', error);
          this.toastr.error(error.error?.msg || 'Error al crear el producto');
          this.isSaving = false;
        }
      });
    }
  }
  
  cancel(): void {
    if (this.isSaving || this.isUploading) {
      this.toastr.warning('Por favor espera a que se complete la operación');
      return;
    }
    
    // Confirmar si hay imágenes seleccionadas
    if (this.selectedFiles.length > 0) {
      if (confirm('¿Estás seguro de salir? Perderás las imágenes seleccionadas.')) {
        this.closeModal(false);
      }
    } else {
      this.closeModal(false);
    }
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent) {
    if (this.formElement && 
        this.isOpen && 
        !this.formElement.nativeElement.contains(event.target)) {
      // Solo cerrar si no hay operaciones en progreso
      if (!this.isSaving && !this.isUploading) {
        this.closeModal(false);
      }
    }
  }

  closeModal(refresh: boolean): void {
    if (this.isSaving || this.isUploading) {
      this.toastr.warning('Por favor espera a que se complete la operación');
      return;
    }
    this.close.emit(refresh);
  }

  onFormClick(event: Event): void {
    event.stopPropagation();
  }
}

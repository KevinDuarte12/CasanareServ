import { Component, ElementRef, Input, Output, EventEmitter, HostListener, ViewChild, ChangeDetectorRef, Injector } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { ProductService } from '../services/productos.services';
import { CategoryService } from '../services/category.service';
import { Product } from '../interfaces/product';
import { Category } from '../interfaces/category';
import { ImageUploadComponent } from '../image-upload/image-upload.component';
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
  imports: [CommonModule, FormsModule, ImageUploadComponent]
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
    type: 'regular', // Add type field
    status: 'disponible' // Add default status
  };
  
  categories: Category[] = [];
  loading: boolean = false;
  isSaving: boolean = false;
  isUploadingImages: boolean = false; // Variable para controlar estado de carga de imágenes

  // Variables para manejar imágenes temporales
  pendingImages: File[] = [];
  pendingImagePreviews: string[] = [];
  showImageUploader: boolean = false; // Controlar visibilidad del componente de subida

  // Añadir estas propiedades
  selectedFiles: File[] = [];
  selectedImagePreviews: string[] = [];
  maxImages: number = 5;
  isUploading: boolean = false;
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
    
    // Si hay un ID de producto, cargar los datos
    if (this.productId) {
      this.loadProductData();
    } else {
      // Para productos nuevos, obtener el ID del usuario actual del localStorage
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

  // Método para manejar la selección de archivos de imagen
  onFilesSelected(event: any): void {
    const files = event.target.files;
    
    // Validar número total de imágenes
    if (this.selectedFiles.length + files.length > this.maxImages) {
      this.toastr.warning(`Puedes subir un máximo de ${this.maxImages} imágenes por producto`);
      return;
    }
  
    // Procesar cada archivo seleccionado
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
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
      reader.onload = (e: any) => {
        this.selectedImagePreviews.push(e.target.result);
        this.changeDetectorRef.detectChanges();
      };
      reader.readAsDataURL(file);
    }
  }
  
  // Método para establecer la imagen principal
  setMainImage(index: number): void {
    this.mainImageIndex = index;
  }
  
  // Método para eliminar una imagen seleccionada
  removeSelectedImage(index: number): void {
    this.selectedFiles.splice(index, 1);
    this.selectedImagePreviews.splice(index, 1);
    
    // Ajustar el índice de la imagen principal si es necesario
    if (index === this.mainImageIndex) {
      this.mainImageIndex = 0;
    } else if (index < this.mainImageIndex) {
      this.mainImageIndex--;
    }
  }
  
  // Método para subir las imágenes al servidor
  uploadImages(productId: number): Observable<any> {
    if (this.selectedFiles.length === 0) {
      return of({ success: true, images: [] });
    }
    
    this.isUploading = true;
    
    // Crear FormData
    const formData = new FormData();
    this.selectedFiles.forEach((file, index) => {
      formData.append('images', file);
    });
    
    formData.append('entity_type', 'product');
    formData.append('entity_id', productId.toString());
    formData.append('main_index', this.mainImageIndex.toString());
    
    // Llamar al servicio de subida múltiple
    return this.imageService.uploadMultipleImages('product', productId, this.selectedFiles)
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
  
    // Ensure type is set
    if (!this.productData.type) {
      this.productData.type = 'regular';
    }

    this.isSaving = true;
    
    if (this.productId) {
      // Actualizar producto existente
      this.productService.updateProduct(this.productId, this.productData).subscribe({
        next: (response) => {
          // Si hay imágenes para subir, hacerlo ahora
          if (this.selectedFiles.length > 0) {
            this.uploadImages(this.productId!).subscribe({
              next: (imagesResponse) => {
                this.toastr.success('Producto e imágenes actualizados exitosamente');
                this.isSaving = false;
                this.closeModal(true);
              },
              error: () => { 
                // Error ya manejado en uploadImages
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
          
          // Si hay imágenes para subir, hacerlo ahora
          if (this.selectedFiles.length > 0) {
            this.uploadImages(productId).subscribe({
              next: (imagesResponse) => {
                this.toastr.success('Producto e imágenes creados exitosamente');
                this.isSaving = false;
                this.closeModal(true);
              },
              error: () => {
                // Error ya manejado en uploadImages
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
  

  // Nuevo método para finalizar la carga y cerrar el modal
 
  // Método para finalizar y cerrar el formulario (botón explícito)
  finishAndClose(): void {
    if (this.isUploadingImages) {
      this.toastr.warning('Espera a que termine la carga de imágenes');
      return;
    }
    this.closeModal(true);
  }

  cancel(): void {
    // Confirmar si hay cambios pendientes
    if (this.pendingImages.length > 0) {
      if (confirm('¿Estás seguro de salir? Perderás las imágenes seleccionadas.')) {
        this.closeModal(false);
      }
    } else {
      this.closeModal(false);
    }
  }

  // Agregar HostListener para detectar clicks fuera del modal
  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent) {
    if (this.formElement && 
        this.isOpen && 
        !this.formElement.nativeElement.contains(event.target)) {
      // Solo cerrar si no hay cambios pendientes
      if (!this.pendingImages.length && !this.isSaving && !this.isUploadingImages) {
        this.closeModal(false);
      }
    }
  }

  // Modificar el método closeModal
  closeModal(refresh: boolean): void {
    if (this.isSaving || this.isUploadingImages) {
      this.toastr.warning('Por favor espera a que se complete la operación');
      return;
    }
    this.close.emit(refresh);
  }

  // Agregar método para detener la propagación del click dentro del form
  onFormClick(event: Event): void {
    event.stopPropagation();
  }

  // Método para manejar cambios en las imágenes
  onImagesChanged(images: Image[]): void {
    console.log('Imágenes cambiadas:', images);
    if (this.productData) {
      this.productData.images = images;
      
      // Opcional: actualizar la imagen principal del producto si hay una imagen marcada como principal
      const mainImage = images.find(img => img.is_main);
      if (mainImage) {
        // Usar Object.assign para añadir la propiedad de forma segura
        Object.assign(this.productData, { image_url: mainImage.url });
      }
    }
  }



  // Método para eliminar una imagen de la vista previa




  // Método adicional para cargar imágenes de un producto específico
  loadProductImages(productId: number): void {
    this.imageService.getProductImages(productId).subscribe({
      next: (images) => {
        if (this.productData) {
          this.productData.images = images;
          
          // Actualizar imagen principal si hay una marcada como tal
          const mainImage = images.find(img => img.is_main);
          if (mainImage) {
            Object.assign(this.productData, { image_url: mainImage.url });
          }
        }
      },
      error: (error) => {
        console.error('Error al cargar imágenes del producto:', error);
      }
    });
  }
}

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
        next: () => {
          this.toastr.success('Producto actualizado exitosamente');
          this.isSaving = false;
          this.closeModal(true); // Cerrar modal y actualizar lista de productos
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
          // Mostrar mensaje de éxito
          this.toastr.success('Producto creado exitosamente');
          
          // Sugerir al usuario que ahora puede agregar imágenes
          this.toastr.info('Ahora puedes editar el producto para agregar imágenes', '', {
            timeOut: 5000
          });
          
          this.isSaving = false;
          this.closeModal(true); // Cerrar el modal y actualizar lista
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

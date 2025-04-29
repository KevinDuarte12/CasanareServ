import { Component, OnInit, Input, Output, EventEmitter, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { BarterService } from '../services/barter.service';
import { ProductService } from '../services/productos.services';
import { UserService } from '../services/user.services';
import { Barter, BarterRequest } from '../interfaces/barter';
import { Product } from '../interfaces/product';
import { user } from '../interfaces/user';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environment/environment';

@Component({
  selector: 'app-edit-barter',
  templateUrl: './edit-barter.component.html',
  styleUrls: ['./edit-barter.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class EditBarterComponent implements OnInit {
  // Referencias para interacción entre componentes
  @ViewChild('modalContent') formElement!: ElementRef;
  @Input() barterId: number | undefined;
  @Input() isOpen: boolean = false;
  @Output() close = new EventEmitter<boolean>();
  @Input() initialUserOffer: number | null = null;
  
  // Modelo principal para los datos del trueque
  barterData: Barter = {
    id_prod_offer: 0,
    id_prod_request: 0,
    id_user_offer: 0,
    id_user_receiving: 0,
    value: 0,
    status: 'pendiente',
    request_date: new Date()
  };
  
  // Colecciones de datos para el funcionamiento del componente
  availableProducts: Product[] = [];
  users: user[] = [];
  loading: boolean = false;
  isSaving: boolean = false;

  // Mapeo de productos por usuario para facilitar la selección
  userProducts: { [key: number]: Product[] } = {};
  selectedOfferUser: number = 0;
  selectedReceivingUser: number = 0;

  // Datos para crear un nuevo producto específico para trueque
  newBarterProduct = {
    name: '',
    description: '',
    value: 0,
    images: [] as string[]
  };

  // Propiedades que controlan el comportamiento y flujo del componente
  currentUserRole: string = '';
  isUserOfferReadOnly: boolean = false;
  isCreateNewProduct: boolean = true;
  isUserReceivingReadOnly: boolean = false;
  skipUserReceiving: boolean = false;
  barterMode: 'propose' | 'accept' | 'admin' = 'propose';
  
  // Propiedades para manejo de imágenes
  selectedFiles: File[] = [];
  
  // Propiedades para aceptación de trueques (funcionalidad futura)
  showAcceptBarterModal: boolean = false;
  selectedProductForBarter: number = 0;

  constructor(
    private barterService: BarterService,
    private productService: ProductService,
    private userService: UserService,
    private toastr: ToastrService,
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    // Configuración inicial basada en el tipo de usuario y operación
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        this.currentUserRole = user.rol || '';
        
        // FLUJO 1: Usuario normal/vendedor que desea publicar un producto para trueque
        if (this.initialUserOffer || (!this.barterId && (user.rol === 'vendedor' || user.rol === 'usuario'))) {
          this.barterData.id_user_offer = this.initialUserOffer ?? user.id ?? 0;
          this.selectedOfferUser = this.initialUserOffer ?? user.id ?? 0;
          
          // Configuración para flujo de propuesta (solo publicar producto)
          this.isUserOfferReadOnly = true;        
          this.isCreateNewProduct = true;         
          this.isUserReceivingReadOnly = true;    
          this.skipUserReceiving = true;          
          this.barterMode = 'propose';            
        } 
        // FLUJO 2: Administrador creando un trueque completo entre dos usuarios
        else if (!this.barterId && user.rol === 'admin') {
          this.isUserOfferReadOnly = false;       
          this.isCreateNewProduct = true;         
          this.isUserReceivingReadOnly = false;   
          this.skipUserReceiving = false;         
          this.barterMode = 'admin';              
        }
      } catch (error) {
        console.error('Error al parsear datos del usuario:', error);
        this.currentUserRole = '';
      }
    }

    // Carga inicial de datos para el formulario
    this.loadUsers();
    
    // FLUJO 3: Edición de un trueque existente
    if (this.barterId) {
      this.loadBarterData();
    }
  }

  loadUsers(): void {
    // Carga el listado de usuarios para los selectores
    this.loading = true;
    this.userService.getUsers().subscribe({
      next: (data) => {
        this.users = data;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar usuarios:', error);
        this.toastr.error('Error al cargar los usuarios');
        this.loading = false;
      }
    });
  }

  loadProducts(): void {
    // Carga y filtra los productos disponibles para trueque
    this.loading = true;
    this.productService.getProducts().subscribe({
      next: (data) => {
        // Filtra productos elegibles para trueques
        this.availableProducts = data.filter(product => 
          product.status === 'disponible' && 
          product.type === 'regular'
        );
        
        // Organiza productos por usuario para facilitar la selección
        this.userProducts = {};
        this.availableProducts.forEach(product => {
          if (!this.userProducts[product.id_user]) {
            this.userProducts[product.id_user] = [];
          }
          this.userProducts[product.id_user].push(product);
        });
        
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar productos:', error);
        this.toastr.error('Error al cargar los productos');
        this.loading = false;
      }
    });
  }

  loadBarterData(): void {
    // Carga datos de un trueque existente para edición
    this.loading = true;
    this.barterService.getBarter(this.barterId!).subscribe({
      next: (data) => {
        this.barterData = data;
        this.selectedOfferUser = data.id_user_offer;
        this.selectedReceivingUser = data.id_user_receiving;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar datos del trueque:', error);
        this.toastr.error('Error al cargar los datos del trueque');
        this.loading = false;
        this.closeModal(false);
      }
    });
  }

  onSubmit(): void {
    if (!this.validateBarterRequest()) {
      return;
    }
    
    this.isSaving = true;
    
    if (this.barterMode === 'propose') {
      // PASO 1: Crear el producto para trueque
      const productData = {
        name: this.newBarterProduct.name.trim(),
        description: this.newBarterProduct.description.trim(),
        price: Number(this.newBarterProduct.value),
        type: 'barter',  // Usar 'barter', no 'truequeable'
        id_user: this.barterData.id_user_offer,
        status: 'disponible',
        stock: 1,
        id_category: 1,
        images: this.newBarterProduct.images || []
      };
      
      console.log('Creando producto para trueque:', productData);
      
      this.barterService.createProductForBarter(productData).subscribe({
        next: (response: any) => {
          console.log('Producto creado:', response);
          
          if (!response.product || !response.product.id_product) {
            this.toastr.error('Error: No se pudo obtener el ID del producto creado');
            this.isSaving = false;
            return;
          }
          
          // PASO 2: Crear entrada en la tabla de trueques (barters)
          const barterData = {
            id_prod_offer: response.product.id_product,
            id_user_offer: this.barterData.id_user_offer,
            notes: 'Producto disponible para trueque'
          };
          
          console.log('Creando publicación de trueque:', barterData);
          
          // Llamar al nuevo endpoint
          this.barterService.createBarterPublication(barterData).subscribe({
            next: (barterResponse: any) => {
              console.log('Publicación de trueque creada:', barterResponse);
              this.toastr.success('Tu producto está disponible para trueque');
              this.isSaving = false;
              this.closeModal(true);
            },
            error: (barterError: any) => {
              console.error('Error al crear publicación de trueque:', barterError);
              this.toastr.warning('El producto se creó pero hubo un problema al registrarlo como trueque');
              this.isSaving = false;
              this.closeModal(true);
            }
          });
        },
        error: (error: any) => {
          console.error('Error al crear producto para trueque:', error);
          
          if (error.error && error.error.errors) {
            let errorMsg = 'Errores en el formulario:';
            for (const key in error.error.errors) {
              errorMsg += `\n- ${key}: ${error.error.errors[key]}`;
            }
            this.toastr.error(errorMsg, 'Error al crear el producto');
          } else {
            this.toastr.error('Ocurrió un error al crear el producto para trueque');
          }
          
          this.isSaving = false;
        }
      });
    } 
    else if (this.barterMode === 'admin') {
      // El código existente para el modo admin...
    }
  }

  onUserOfferChange(): void {
    // Limpia la selección de producto cuando cambia el usuario oferente
    this.barterData.id_prod_offer = 0;
  }

  onUserReceivingChange(): void {
    // Limpia la selección de producto cuando cambia el usuario receptor
    this.barterData.id_prod_request = 0;
  }

  getProductsForUser(userId: number): Product[] {
    // Obtiene los productos disponibles de un usuario específico
    return this.userProducts[userId] || [];
  }

  cancel(): void {
    // Cancela la operación actual sin guardar cambios
    this.closeModal(false);
  }

  closeModal(refresh: boolean): void {
    // Cierra el modal y notifica al componente padre si debe actualizar datos
    this.close.emit(refresh);
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent) {
    // Detector de clics fuera del modal para cerrar automáticamente
    if (this.isOpen && !this.loading && !this.isSaving) {
      const modalContent = this.formElement?.nativeElement;
      if (modalContent && !modalContent.contains(event.target)) {
        this.cancel();
      }
    }
  }

  onFormClick(event: Event): void {
    // Previene que clics dentro del formulario cierren el modal
    event.stopPropagation();
  }

  private validateBarterRequest(): boolean {
    // Sistema de validación en cascada según el modo de operación
    
    // Validaciones básicas para todos los modos
    if (!this.newBarterProduct.name || this.newBarterProduct.name.trim() === '') {
      this.toastr.error('El nombre del producto es obligatorio');
      return false;
    }
    
    if (!this.newBarterProduct.description || this.newBarterProduct.description.trim() === '') {
      this.toastr.error('La descripción del producto es obligatoria');
      return false;
    }
    
    if (!this.newBarterProduct.value || this.newBarterProduct.value <= 0) {
      this.toastr.error('El valor del producto debe ser mayor que cero');
      return false;
    }
    
    // FLUJO 1: Validaciones para modo propuesta (solo se necesita producto y usuario oferente)
    if (this.barterMode === 'propose') {
      if (!this.barterData.id_user_offer || this.barterData.id_user_offer === 0) {
        this.toastr.error('Debes seleccionar un usuario oferente');
        return false;
      }
      return true;
    }
    
    // FLUJO 2/3: Validaciones para modos que requieren información completa
    if (!this.barterData.id_user_offer || this.barterData.id_user_offer === 0) {
      this.toastr.error('Debes seleccionar un usuario oferente');
      return false;
    }
    
    if (!this.barterData.id_user_receiving || this.barterData.id_user_receiving === 0) {
      this.toastr.error('Debes seleccionar un usuario receptor');
      return false;
    }
    
    if (!this.barterData.id_prod_request || this.barterData.id_prod_request === 0) {
      this.toastr.error('Debes seleccionar un producto a solicitar');
      return false;
    }
    
    if (this.barterData.id_user_offer === this.barterData.id_user_receiving) {
      this.toastr.error('El usuario oferente y receptor no pueden ser el mismo');
      return false;
    }
    
    return true;
  }

  private handleProductStatusUpdate(barter: Barter): void {
    // Sistema para actualizar estados de productos según cambios en el trueque
    switch (barter.status) {
      case 'aceptado':
        // Cuando se acepta un trueque, los productos quedan reservados
        this.updateProductStatuses(barter, 'en_trueque');
        break;
      case 'completado':
        // Al completar un trueque, se finalizan las transacciones
        this.updateProductStatuses(barter, 'vendido');
        break;
      case 'rechazado':
        // Si se rechaza, los productos vuelven a estar disponibles
        this.updateProductStatuses(barter, 'disponible');
        break;
    }
  }

  private updateProductStatuses(barter: Barter, status: 'disponible' | 'vendido' | 'en_trueque'): void {
    // Actualiza el estado de ambos productos involucrados en un trueque
    if (barter.id_prod_offer) {
      this.productService.changeProductStatus(barter.id_prod_offer, status).subscribe();
    }
    if (barter.id_prod_request) {
      this.productService.changeProductStatus(barter.id_prod_request, status).subscribe();
    }
  }

  loadProductsForUser(userId: number): void {
    // Carga productos específicos de un usuario para mostrar opciones relevantes
    if (!userId) return;
    
    this.loading = true;
    this.productService.getProductsByUser(userId).subscribe({
      next: (products) => {
        // Filtra productos disponibles para la selección
        const availableProducts = products.filter(p => p.status === 'disponible');
        this.userProducts[userId] = availableProducts;
        this.loading = false;
      },
      error: (error) => {
        console.error(`Error al cargar productos del usuario ${userId}:`, error);
        this.loading = false;
        this.toastr.error('Error al cargar productos del usuario');
      }
    });
  }

  getUserName(userId: number): string {
    // Obtiene el nombre de un usuario por su ID para mostrar en la interfaz
    if (!userId) return 'Usuario';
    const user = this.users.find(u => u.id === userId);
    return user?.name || 'Usuario';
  }

  onFileSelected(event: any): void {
    // Maneja la selección múltiple de archivos para cargar imágenes
    const files = event.target.files;
    if (files) {
      for (let i = 0; i < files.length; i++) {
        this.uploadImage(files[i]);
      }
    }
  }

  uploadImage(file: File): void {
    // Sube una imagen al servidor y actualiza la lista de imágenes del producto
    this.loading = true;
    
    const formData = new FormData();
    formData.append('image', file);
    
    this.http.post<{imageUrl: string}>(`${environment.endpoint}api/upload`, formData).subscribe({
      next: (response) => {
        this.newBarterProduct.images.push(response.imageUrl);
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al subir imagen:', error);
        this.toastr.error('Error al subir la imagen');
        this.loading = false;
      }
    });
  }

  removeImage(index: number): void {
    // Elimina una imagen de la lista de imágenes del producto
    this.newBarterProduct.images.splice(index, 1);
  }
}

import { Component, OnInit, Input, Output, EventEmitter, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { BarterService } from '../services/barter.service';
import { ProductService } from '../services/productos.services';
import { UserService } from '../services/user.services';
import { CategoryService } from '../services/category.service';
import { Barter, BarterRequest } from '../interfaces/barter';
import { Product } from '../interfaces/product';
import { user } from '../interfaces/user';
import { Category } from '../interfaces/category';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environment/environment';
import { Observable } from 'rxjs';

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
  
  // Añadir estas propiedades adicionales para la propuesta de trueque
  @Input() targetProductId: number | null = null;
  @Input() targetProductName: string | null = null;
  @Input() targetOwnerId: number | null = null;

  // Añadir estas propiedades a la clase
  targetProductImage: string | null = null;
  targetOwnerName: string | null = null;

  // Añadir esta propiedad
  existingProposal: boolean = false;

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
  categories: Category[] = [];
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
    category: 0,
    images: [] as string[]
  };

  receiverProduct = {
    name: '',
    description: '',
    value: 0,
    category: 0,
    images: [] as string[]
  };

  // Propiedades que controlan el comportamiento y flujo del componente
  currentUserRole: string = '';
  isUserOfferReadOnly: boolean = false;
  isCreateNewProduct: boolean = true;
  isUserReceivingReadOnly: boolean = false;
  skipUserReceiving: boolean = false;
  barterMode: 'propose' | 'accept' | 'admin' | 'propose-specific' = 'propose';
  
  // Propiedades para manejo de imágenes
  selectedFiles: File[] = [];
  
  // Propiedades para aceptación de trueques (funcionalidad futura)
  showAcceptBarterModal: boolean = false;
  selectedProductForBarter: number = 0;

  constructor(
    private barterService: BarterService,
    private productService: ProductService,
    private userService: UserService,
    private categoryService: CategoryService,
    private toastr: ToastrService,
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    // Determinar el rol del usuario actual
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        this.currentUserRole = user.rol || '';
        console.log('Rol de usuario detectado:', this.currentUserRole);
      } catch (error) {
        console.error('Error al parsear datos del usuario:', error);
        this.currentUserRole = '';
      }
    }

    // Carga inicial de datos para el formulario
    this.loadUsers();
    this.loadCategories();
    
    // Si estamos editando un trueque existente
    if (this.barterId) {
      console.log('Cargando detalles del trueque con ID:', this.barterId);
      this.loading = true;
      
      this.barterService.getBarter(this.barterId).subscribe({
        next: (barter) => {
          console.log('Datos del trueque cargados:', barter);
          
          // Asignar los datos al modelo
          this.barterData = {
            ...this.barterData,
            ...barter,
            // Asegurar que estos campos estén presentes
            id_barter: barter.id_barter || this.barterId,
            id_user_offer: barter.id_user_offer,
            id_user_receiving: barter.id_user_receiving,
            id_prod_offer: barter.id_prod_offer,
            id_prod_request: barter.id_prod_request,
            status: barter.status || 'pendiente',
            notes: barter.notes || ''
          };
          
          // Cargar productos para ambos usuarios
          if (barter.id_user_offer) {
            this.loadProductsForUser(barter.id_user_offer, 'all', barter.id_prod_offer);
          }
          
          if (barter.id_user_receiving) {
            // Aquí especificamos 'barter' para el usuario receptor
            this.loadProductsForUser(barter.id_user_receiving, 'barter', barter.id_prod_request);
          }
          
          // Establecer el modo para edición
          this.barterMode = 'admin';
          this.loading = false;
        },
        error: (error) => {
          console.error('Error al cargar el trueque:', error);
          this.toastr.error('Error al cargar los datos del trueque');
          this.loading = false;
          this.closeModal(false);
        }
      });
    } else {
      // Configurar el flujo adecuado según el rol del usuario
      this.configureBarterModeByRole();
    }
    
    // Verificar si hay información de producto de trueque en localStorage
    const storedProductId = localStorage.getItem('truequeProductId');
    const storedProductName = localStorage.getItem('truequeProductName');
    const storedProductOwnerId = localStorage.getItem('truequeProductOwnerId');
    
    if (storedProductId && storedProductName && storedProductOwnerId) {
      console.log('Datos de propuesta de trueque encontrados:', {
        productId: storedProductId,
        productName: storedProductName,
        ownerId: storedProductOwnerId
      });
      
      // Guardar información del producto destino para mostrar en el formulario
      this.targetProductId = parseInt(storedProductId);
      this.targetProductName = storedProductName;
      this.targetOwnerId = parseInt(storedProductOwnerId);
      
      // Configurar el trueque con esta información
      this.barterData.id_prod_request = this.targetProductId;
      this.barterData.id_user_receiving = this.targetOwnerId;
      
      // Cambiar el modo a propuesta específica
      this.barterMode = 'propose-specific';
      
      // Obtener más información del producto destino
      this.getTargetProductInfo();
      
      // Limpiar el localStorage después de obtener los datos
      localStorage.removeItem('truequeProductId');
      localStorage.removeItem('truequeProductName');
      localStorage.removeItem('truequeProductOwnerId');
    }
    
    // Garantizar que loading se establezca a false si algo falla
    setTimeout(() => {
      if (this.loading) {
        console.log('Forzando finalización del estado de carga');
        this.loading = false;
      }
    }, 3000);
  }

  // Configurar el modo según el rol del usuario
  private configureBarterModeByRole(): void {
    if (this.currentUserRole === 'admin') {
      console.log('Configurando flujo para administrador');
      // El administrador puede crear cualquier tipo de trueque
      this.barterMode = 'admin';
      
      // Si se especificó un usuario inicial, establecerlo
      if (this.initialUserOffer) {
        this.barterData.id_user_offer = this.initialUserOffer;
        this.isUserOfferReadOnly = true;
        this.onUserOfferChange();
      }
    } else {
      console.log('Configurando flujo para usuario normal');
      // Usuario normal solo puede proponer trueques con sus propios productos
      this.barterMode = 'propose';
      
      // Obtener ID del usuario actual del localStorage
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        this.barterData.id_user_offer = user.id;
        this.isUserOfferReadOnly = true; // El usuario no puede cambiar quién ofrece
        this.onUserOfferChange();
      }
      
      // Usuarios normales siempre crean un producto nuevo
      this.isCreateNewProduct = true;
      // Y no pueden elegir un receptor específico
      this.skipUserReceiving = true;
    }
  }

  // Agregar método para cargar categorías
  loadCategories(): void {
    this.loading = true;
    this.categoryService.getCategories().subscribe({
      next: (data) => {
        this.categories = data;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar categorías:', error);
        this.toastr.error('Error al cargar las categorías');
        this.loading = false;
      }
    });
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

  onSubmit(): void {
    // Si hay un ID de trueque, estamos editando
    if (this.barterId) {
      this.updateExistingBarter();
      return;
    }
    
    // Validar datos según el flujo correspondiente
    if (!this.validateBarterRequest()) {
      return;
    }
    
    this.isSaving = true;
    
    // FLUJO ADICIONAL: Propuesta específica de trueque
    if (this.barterMode === 'propose-specific') {
      this.createSpecificBarterProposal();
      return;
    }
    
    // FLUJO 1: Administrador creando un trueque completo o publicación
    if (this.currentUserRole === 'admin') {
      if (this.skipUserReceiving) {
        // Publicar solo para trueque (sin receptor específico)
        this.publishBarterProduct();
      } else {
        // Crear un trueque completo con ambos usuarios y productos
        this.createCompleteBarter();
      }
    }
    // FLUJO 2: Usuario normal proponiendo un trueque
    else {
      // Usuario normal solo puede proponer trueques con sus propios productos
      this.proposeBarterWithNewProduct();
    }
  }

  // Nuevo método para propuestas de usuarios normales
  private proposeBarterWithNewProduct(): void {
    // Convertir el array de strings a objetos Image completos
    const imageObjects = this.newBarterProduct.images.map((url, index) => ({
      url: url,
      entity_type: 'product',
      is_main: index === 0
    }));
    
    // Crear un nuevo producto para el trueque
    const newProductData = {
      name: this.newBarterProduct.name.trim(),
      description: this.newBarterProduct.description.trim(),
      price: this.newBarterProduct.value,
      id_category: this.newBarterProduct.category,
      images: imageObjects,
      type: 'barter' as 'barter',
      id_user: this.barterData.id_user_offer,
      stock: 1
    };
    
    // Crear primero el producto
    this.productService.createProduct(newProductData).subscribe({
      next: (productResponse: any) => {
        console.log('Producto creado exitosamente:', productResponse);
        
        // Verificar que la respuesta contiene el ID del producto
        if (!productResponse || (!productResponse.product?.id_product && !productResponse.id_product)) {
          console.error('La respuesta no contiene ID de producto:', productResponse);
          this.toastr.error('Error: No se pudo obtener el ID del producto creado');
          this.isSaving = false;
          return;
        }
        
        // Obtener el ID del producto de la respuesta (puede estar en .product.id_product o directamente en .id_product)
        const productId = productResponse.product?.id_product || productResponse.id_product;
        
        // Ahora creamos la publicación de trueque
        const barterData = {
          id_prod_offer: productId,
          id_user_offer: this.barterData.id_user_offer,
          notes: 'Producto disponible para trueque'
        };
        
        console.log('Datos para crear publicación de trueque:', barterData);
        
        this.barterService.createBarterPublication(barterData).subscribe({
          next: (barterResponse: any) => {
            this.toastr.success('Producto publicado para trueque exitosamente');
            this.isSaving = false;
            this.closeModal(true);
          },
          error: (barterError: any) => {
            console.error('Error al publicar producto para trueque:', barterError);
            this.toastr.error('Error al publicar el producto para trueque');
            this.isSaving = false;
          }
        });
      },
      error: (productError: any) => {
        console.error('Error al crear el producto:', productError);
        this.toastr.error('Error al crear el producto para trueque');
        this.isSaving = false;
      }
    });
  }

  // Nuevo método para crear una propuesta específica
  private createSpecificBarterProposal(): void {
    // Convertir el array de strings a objetos Image completos
    const imageObjects = this.newBarterProduct.images.map((url, index) => ({
      url: url,
      entity_type: 'product',
      is_main: index === 0
    }));
    
    // Crear un nuevo producto para el trueque
    const newProductData = {
      name: this.newBarterProduct.name.trim(),
      description: this.newBarterProduct.description.trim(),
      price: this.newBarterProduct.value,
      id_category: this.newBarterProduct.category,
      images: imageObjects,
      type: 'barter' as 'barter',
      id_user: this.barterData.id_user_offer,
      stock: 1
    };
    
    // Crear primero el producto
    this.productService.createProduct(newProductData).subscribe({
      next: (productResponse: any) => {
        console.log('Producto creado exitosamente para propuesta:', productResponse);
        
        // Verificar que la respuesta contiene el ID del producto
        if (!productResponse || (!productResponse.product?.id_product && !productResponse.id_product)) {
          console.error('La respuesta no contiene ID de producto:', productResponse);
          this.toastr.error('Error: No se pudo obtener el ID del producto creado');
          this.isSaving = false;
          return;
        }
        
        // Obtener el ID del producto de la respuesta
        const productId = productResponse.product?.id_product || productResponse.id_product;
        
        // Ahora creamos la propuesta de trueque directa
        const barterRequest: BarterRequest = {
          id_prod_offer: productId,
          id_prod_request: this.targetProductId!,
          id_user_offer: this.barterData.id_user_offer,
          id_user_receiving: this.targetOwnerId!,
          status: 'pendiente',
          notes: 'Propuesta de trueque específica'
        };
        
        console.log('Enviando propuesta de trueque específica:', barterRequest);
        
        this.barterService.createBarter(barterRequest).subscribe({
          next: (barterResponse: any) => {
            this.toastr.success('Propuesta de trueque enviada exitosamente');
            this.isSaving = false;
            this.closeModal(true);
          },
          error: (barterError: any) => {
            console.error('Error al enviar propuesta de trueque:', barterError);
            this.toastr.error('Error al enviar la propuesta de trueque');
            this.isSaving = false;
          }
        });
      },
      error: (productError: any) => {
        console.error('Error al crear el producto para propuesta:', productError);
        this.toastr.error('Error al crear el producto para trueque');
        this.isSaving = false;
      }
    });
  }

  // Método para crear un trueque completo (con ambos usuarios y productos)
  private createCompleteBarter(): void {
    // Si estamos creando un nuevo producto para el receptor
    if (this.receiverProduct.name && this.barterData.id_user_receiving && 
        this.getProductsForUser(this.barterData.id_user_receiving, 'barter').length === 0) {
      // Primero crear el producto para el receptor
      this.createProductForReceiver().subscribe({
        next: (productResponse: any) => {
          // Obtener el ID del producto de la respuesta (puede estar en .product.id_product o directamente en .id_product)
          const productId = productResponse.product?.id_product || productResponse.id_product;
          
          // Asignar el nuevo producto al trueque
          this.barterData.id_prod_request = productId;
          // Ahora crear el trueque
          this.finishCreateCompleteBarter();
        },
        error: (error) => {
          console.error('Error al crear producto para receptor:', error);
          this.toastr.error('Error al crear el producto para el receptor');
          this.isSaving = false;
        }
      });
    } else {
      // Si ya tenemos un producto seleccionado o no hay receptor, crear el trueque directamente
      this.finishCreateCompleteBarter();
    }
  }

  // Método para finalizar la creación del trueque
  private finishCreateCompleteBarter(): void {
    const barterRequest: BarterRequest = {
      id_prod_offer: this.barterData.id_prod_offer,
      id_prod_request: this.barterData.id_prod_request,
      id_user_offer: this.barterData.id_user_offer,
      id_user_receiving: this.barterData.id_user_receiving,
      status: 'pendiente',
      value: this.barterData.value
    };
    
    this.barterService.createBarter(barterRequest).subscribe({
      next: (response) => {
        this.toastr.success('Trueque creado correctamente');
        this.isSaving = false;
        this.closeModal(true);
      },
      error: (error) => {
        console.error('Error al crear trueque:', error);
        this.toastr.error('Error al crear el trueque');
        this.isSaving = false;
      }
    });
  }

  // Método para publicar solo un producto para trueque (sin receptor aún)
  private publishBarterProduct(): void {
    const barterData = {
      id_prod_offer: this.barterData.id_prod_offer,
      id_user_offer: this.barterData.id_user_offer,
      notes: 'Producto disponible para trueque'
    };
    
    this.barterService.createBarterPublication(barterData).subscribe({
      next: (barterResponse: any) => {
        this.toastr.success('Producto publicado para trueque exitosamente');
        this.isSaving = false;
        this.closeModal(true);
      },
      error: (barterError: any) => {
        console.error('Error al publicar producto para trueque:', barterError);
        this.toastr.error('Error al publicar el producto para trueque');
        this.isSaving = false;
      }
    });
  }

  onUserOfferChange(): void {
    // Limpia la selección de producto cuando cambia el usuario oferente
    this.barterData.id_prod_offer = 0;
    
    // Cargar productos de tipo barter para este usuario
    if (this.barterData.id_user_offer) {
      // Si estamos en modo admin y decidimos usar producto existente, cargar solo productos barter
      if (this.currentUserRole === 'admin' && !this.isCreateNewProduct) {
        this.loadProductsForUser(this.barterData.id_user_offer, 'barter');
      } else {
        this.loadProductsForUser(this.barterData.id_user_offer);
      }
    }
  }

  onUserReceivingChange(): void {
    // No resetear el producto si estamos en edición
    if (!this.barterId) {
      this.barterData.id_prod_request = 0;
    }
    
    // Solo cargar productos si no los hemos cargado aún
    if (this.barterData.id_user_receiving && 
        (!this.userProducts[this.barterData.id_user_receiving] || 
         this.userProducts[this.barterData.id_user_receiving].length === 0)) {
      
      this.loadProductsForUser(this.barterData.id_user_receiving, 'barter');
    }
  }

  getProductsForUser(userId: number, type: 'barter' | 'all' = 'all'): Product[] {
    if (!userId || !this.userProducts || !this.userProducts[userId]) return [];
    
    // Si se especifica el tipo barter, filtrar solo esos productos
    if (type === 'barter') {
      return this.userProducts[userId].filter(product => 
        product && (product.type === 'barter')
      );
    }
    
    return this.userProducts[userId];
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
    
    // Validación específica para creación de nuevos productos
    if (this.isCreateNewProduct) {
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
      
      if (!this.newBarterProduct.category || this.newBarterProduct.category === 0) {
        this.toastr.error('Debe seleccionar una categoría para el producto');
        return false;
      }
    }
    
    // Validaciones según el modo de operación
    if (this.barterMode === 'propose') {
      if (!this.barterData.id_user_offer || this.barterData.id_user_offer === 0) {
        this.toastr.error('Debes seleccionar un usuario oferente');
        return false;
      }
      return true;
    }
    
    // Para modo admin cuando se usa un producto existente
    if (this.barterMode === 'admin' && !this.isCreateNewProduct) {
      if (!this.barterData.id_user_offer || this.barterData.id_user_offer === 0) {
        this.toastr.error('Debes seleccionar un usuario oferente');
        return false;
      }
      
      if (!this.barterData.id_prod_offer || this.barterData.id_prod_offer === 0) {
        this.toastr.error('Debes seleccionar un producto para ofrecer');
        return false;
      }
      
      // Validar los demás campos solo si estamos creando un trueque completo
      if (!this.skipUserReceiving) {
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
      }
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

  loadProductsForUser(userId: number, type: 'barter' | 'all' = 'all', specificProductId?: number): void {
    if (!userId) {
      console.warn('Intentando cargar productos para userId nulo o indefinido');
      return;
    }
    
    console.log(`Cargando productos para usuario ${userId}, tipo: ${type}, producto específico: ${specificProductId || 'ninguno'}`);
    this.loading = true;
    
    this.productService.getProductsByUser(userId).subscribe({
      next: (products) => {
        if (!products || !Array.isArray(products)) {
          console.warn(`Datos inválidos recibidos para usuario ${userId}:`, products);
          this.userProducts[userId] = [];
          this.loading = false;
          return;
        }
        
        console.log(`Recibidos ${products.length} productos para usuario ${userId}`);
        
        // Filtrar productos según el tipo solicitado
        let filteredProducts: Product[] = [];
        
        if (type === 'barter') {
          // Para 'barter', mostrar solo productos de tipo barter
          console.log('Filtrando solo productos tipo barter');
          filteredProducts = products.filter(p => {
            const isBarter = p && p.type === 'barter';
            console.log(`Producto ${p.id_product} - ${p.name}: tipo=${p.type}, es barter=${isBarter}`);
            return isBarter;
          });
        } else {
          // Para 'all', mostrar todos los disponibles
          filteredProducts = products.filter(p => p && p.status === 'disponible');
        }
        
        // Si tenemos un producto específico que cargar (ej. en modo edición)
        if (specificProductId) {
          const specificProduct = products.find(p => p && p.id_product === specificProductId);
          if (specificProduct && !filteredProducts.some(p => p.id_product === specificProductId)) {
            console.log(`Añadiendo producto específico ${specificProductId} a la lista`);
            filteredProducts.push(specificProduct);
          }
        }
        
        console.log(`Filtrados ${filteredProducts.length} productos para usuario ${userId}`);
        this.userProducts[userId] = filteredProducts;
        this.loading = false;
      },
      error: (error) => {
        console.error(`Error cargando productos para usuario ${userId}:`, error);
        this.toastr.error(`Error al cargar productos`);
        this.userProducts[userId] = [];
        this.loading = false;
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

  // Método para manejar cambios en la selección de usuario oferente durante edición
  onEditUserOfferChange(): void {
    console.log("Cambiando usuario oferente a:", this.barterData.id_user_offer);
    
    // Al cambiar el usuario, vaciar el objeto de productos
    if (this.userProducts[this.barterData.id_user_offer]) {
      delete this.userProducts[this.barterData.id_user_offer];
    }
    
    // Cargar productos del usuario oferente para la edición (todos los disponibles)
    this.loadProductsForUser(this.barterData.id_user_offer, 'all');
  }

  // Método para manejar cambios en la selección de usuario receptor durante edición
  onEditUserReceivingChange(): void {
    console.log("Cambiando usuario receptor a:", this.barterData.id_user_receiving);
    
    // Al cambiar el usuario, vaciar el objeto de productos
    if (this.userProducts[this.barterData.id_user_receiving]) {
      delete this.userProducts[this.barterData.id_user_receiving];
    }
    
    // Cargar productos del usuario receptor para la edición (solo tipo barter)
    this.loadProductsForUser(this.barterData.id_user_receiving, 'barter');
  }

  // Método para actualizar un trueque existente
  private updateExistingBarter(): void {
    if (!this.barterId) {
      this.toastr.error('ID de trueque no válido');
      return;
    }
    
    console.log('Actualizando trueque existente:', this.barterId);
    this.isSaving = true;
    
    // Si estamos creando un producto para el receptor
    if (this.currentUserRole === 'admin' && 
        this.receiverProduct.name && 
        this.barterData.id_user_receiving && 
        this.getProductsForUser(this.barterData.id_user_receiving, 'barter').length === 0) {
      
      // Primero crear el producto para el receptor
      this.createProductForReceiver().subscribe({
        next: (productResponse: any) => {
          // Obtener el ID del producto de la respuesta (puede estar en .product.id_product o directamente en .id_product)
          const productId = productResponse.product?.id_product || productResponse.id_product;
          
          // Asignar el nuevo producto al trueque
          this.barterData.id_prod_request = productId;
          // Ahora actualizar el trueque
          this.sendBarterUpdate();
        },
        error: (error) => {
          console.error('Error al crear producto para receptor:', error);
          this.toastr.error('Error al crear el producto para el receptor');
          this.isSaving = false;
        }
      });
    } else {
      // Actualizar el trueque directamente
      this.sendBarterUpdate();
    }
  }

  // Método para enviar la actualización al servidor
  private sendBarterUpdate(): void {
    const updateData = {
      id_prod_offer: this.barterData.id_prod_offer,
      id_prod_request: this.barterData.id_prod_request,
      id_user_offer: this.barterData.id_user_offer,
      id_user_receiving: this.barterData.id_user_receiving,
      status: this.barterData.status,
      value: this.barterData.value,
      notes: this.barterData.notes
    };
    
    this.barterService.updateBarter(this.barterId!, updateData).subscribe({
      next: (response) => {
        console.log('Trueque actualizado exitosamente:', response);
        
        // Si el estado cambió, actualizar también los estados de los productos
        this.handleProductStatusUpdate(this.barterData);
        
        this.toastr.success('Trueque actualizado correctamente');
        this.isSaving = false;
        this.closeModal(true);
      },
      error: (error) => {
        console.error('Error al actualizar trueque:', error);
        this.toastr.error('Error al actualizar el trueque');
        this.isSaving = false;
      }
    });
  }

  // Método para crear un producto para el usuario receptor
  private createProductForReceiver(): Observable<any> {
    // Convertir el array de strings a objetos Image completos
    const imageObjects = this.receiverProduct.images.map((url, index) => ({
      url: url,
      entity_type: 'product',
      is_main: index === 0
    }));
    
    // Datos del producto
    const productData = {
      name: this.receiverProduct.name.trim(),
      description: this.receiverProduct.description.trim(),
      price: this.receiverProduct.value,
      id_category: this.receiverProduct.category,
      images: imageObjects,
      type: 'barter' as 'barter',
      id_user: this.barterData.id_user_receiving,
      stock: 1
    };
    
    return this.productService.createProduct(productData);
  }

  // Modificar el método getTargetProductInfo para verificar si ya existe una propuesta
  getTargetProductInfo(): void {
    if (this.targetProductId && this.barterData.id_user_offer) {
      // Primero, verificar si ya existe una propuesta del usuario actual para este producto
      this.barterService.checkExistingProposal(
        this.barterData.id_user_offer,
        this.targetProductId
      ).subscribe({
        next: (response) => {
          if (response && response.exists) {
            this.existingProposal = true;
            this.toastr.warning('Ya has enviado una propuesta para este producto');
          }
        },
        error: (error) => {
          console.error('Error al verificar propuestas existentes:', error);
          // No bloquear el flujo principal en caso de error
        }
      });
      
      // Obtener información del producto
      this.productService.getProduct(this.targetProductId).subscribe({
        next: (product) => {
          // Verificar que product exista y tenga propiedades esperadas
          if (!product) {
            console.error('Producto no encontrado');
            return;
          }
          
          // Obtener la primera imagen si existe
          if (product.images && Array.isArray(product.images) && product.images.length > 0) {
            const firstImage = product.images[0];
            this.targetProductImage = (typeof firstImage === 'string') ? 
              firstImage : 
              (firstImage.url ? firstImage.url : null);
          }
          
          // Obtener nombre del propietario
          if (product.user && product.user.name) {
            this.targetOwnerName = product.user.name;
          } else if (product.id_user) {
            // Asegurarse de que getUserById está implementado en UserService
            this.userService.getUser(product.id_user).subscribe({
              next: (user) => {
                if (user && user.name) {
                  this.targetOwnerName = user.name;
                }
              },
              error: (error) => {
                console.error('Error al obtener información del propietario:', error);
              }
            });
          }
        },
        error: (error) => {
          console.error('Error al obtener información del producto:', error);
        }
      });
    }
  }

  // Método helper para mostrar el nombre del propietario
  getTargetOwnerName(): string {
    return (this.targetOwnerName as string | null | undefined) || 'Usuario';
  }
}

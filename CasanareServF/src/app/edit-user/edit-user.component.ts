import { Component, OnInit, Input, Output, EventEmitter, ChangeDetectorRef, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { UserService } from '../services/user.services';
import { TokenService } from '../services/token.service';
import { user } from '../interfaces/user';
import { Image } from '../interfaces/image';
import { ImageUploadComponent } from '../image-upload/image-upload.component';
import { Router } from '@angular/router';

@Component({
  selector: 'app-edit-user',
  templateUrl: './edit-user.component.html',
  styleUrls: ['./edit-user.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, ImageUploadComponent],
})
export class EditUserComponent implements OnInit {
  @ViewChild('formContainer') formElement!: ElementRef;
  @Input() userId: number | undefined;
  @Input() isCurrentUser: boolean = false; // Indica si se está editando el propio perfil
  @Input() isOpen: boolean = false;
  @Output() close = new EventEmitter<boolean>();
  userData: user = {
    id: 0,
    name: '',
    email: '',
    rol: 'usuario',
    estado: true,
    isVerified: false,
    document_type: '',
    document_number: '',
    department: '',
    city: '',
    phone: ''
  };
  // Añadir a las propiedades de la clase
  userProfileImage: string | null = null; // Propiedad para la imagen de perfil
  // Datos para verificación
  confirmPassword: string = '';
  confirmStep: boolean = false;
  // Estados de la interfaz
  loading: boolean = false;
  isSubmitting: boolean = false;
  isAdmin: boolean = false;
  errorMessage: string = '';
  attemptsLeft: number | undefined; // Contador de intentos restantes
  // Listas para selección
  documentTypes: string[] = ['CC', 'CE', 'TI', 'PP', 'NIT', 'Otro'];
  departments: string[] = [
    'Amazonas', 'Antioquia', 'Arauca', 'Atlántico', 'Bolívar', 
    'Boyacá', 'Caldas', 'Caquetá', 'Casanare', 'Cauca', 
    'Cesar', 'Chocó', 'Córdoba', 'Cundinamarca', 'Guainía', 
    'Guaviare', 'Huila', 'La Guajira', 'Magdalena', 'Meta',
    'Nariño', 'Norte de Santander', 'Putumayo', 'Quindío', 
    'Risaralda', 'San Andrés y Providencia', 'Santander', 
    'Sucre', 'Tolima', 'Valle del Cauca', 'Vaupés', 'Vichada'
  ];
  cities: string[] = [];
  // Mapa de departamentos a ciudades
  departmentCities: { [key: string]: string[] } = {
    'Amazonas': ['Leticia', 'Puerto Nariño'],
    'Antioquia': ['Medellín', 'Bello', 'Envigado', 'Itagüí', 'Rionegro'],
    'Arauca': ['Arauca', 'Arauquita', 'Cravo Norte', 'Fortul', 'Puerto Rondón', 'Saravena', 'Tame'],
    'Atlántico': ['Barranquilla', 'Baranoa', 'Campo de la Cruz', 'Galapa', 'Malambo', 'Soledad'],
    'Bolívar': ['Cartagena', 'Magangué', 'El Carmen de Bolívar', 'Mompós', 'Turbaco'],
    'Boyacá': ['Tunja', 'Duitama', 'Sogamoso', 'Chiquinquirá', 'Paipa'],
    'Caldas': ['Manizales', 'Chinchiná', 'La Dorada', 'Riosucio', 'Villamaría'],
    'Caquetá': ['Florencia', 'Albania', 'Belén de los Andaquíes', 'Cartagena del Chairá', 'El Doncello'],
    'Casanare': [
      'Yopal', 'Aguazul', 'Chámeza', 'Hato Corozal', 'La Salina', 'Maní',
      'Monterrey', 'Nunchía', 'Orocué', 'Paz de Ariporo', 'Pore', 'Recetor',
      'Sabanalarga', 'Sácama', 'San Luis de Palenque', 'Támara', 'Tauramena',
      'Trinidad', 'Villanueva'
    ],
    // Resto de departamentos...
  };
  constructor(
    private userService: UserService,
    private tokenService: TokenService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) { }
  ngOnInit(): void {
    // Verificar si el usuario actual es admin
    const currentUser = this.tokenService.getUser();
    this.isAdmin = currentUser?.rol === 'admin';
    // Cargar datos del usuario
    if (this.userId) {
      this.loadUserData();
    } else if (this.isCurrentUser) {
      // Si es el usuario actual, cargar desde el token
      this.loadCurrentUserData();
    }
  }
  loadUserData() {
    this.loading = true;
    
    if (this.userId === undefined) {
      this.loading = false;
      this.toastr.error('ID de usuario no válido');
      return;
    }
    
    this.userService.getUserById(this.userId).subscribe({
      next: (data) => {
        console.log('Datos de usuario cargados:', data);
        // Asignar TODAS las propiedades necesarias
        this.userData = {
          id: data.id, // ¡Importante! Faltaba esto
          name: data.name || '',
          email: data.email || '',
          rol: data.rol || 'usuario', // ¡Importante! Faltaba esto
          estado: data.estado !== undefined ? data.estado : true, // ¡Importante! Faltaba esto
          isVerified: data.isVerified || false, // ¡Importante! Faltaba esto
          phone: data.phone || '',
          department: data.department || '',
          city: data.city || '',
          document_type: data.document_type || '',
          document_number: data.document_number || ''
        };
        
        console.log('userData después de la asignación:', this.userData);
        
        // Actualizar ciudades si hay un departamento seleccionado
        if (data.department) {
          this.cities = this.departmentCities[data.department] || [];
        }
        
        // También actualizar la imagen de perfil si existe
        if (data.profileImage) {
          this.userProfileImage = data.profileImage;
        } else if (data.userImages && data.userImages.length > 0) {
          const mainImage = data.userImages.find(img => img.is_main);
          this.userProfileImage = mainImage ? mainImage.url : data.userImages[0].url;
        }
        
        this.loading = false;
        this.cdr.detectChanges(); // Forzar detección de cambios
      },
      error: (error) => {
        console.error('Error al cargar datos del usuario:', error);
        this.toastr.error('No se pudieron cargar tus datos');
        this.loading = false;
      }
    });
  }
  loadCurrentUserData(): void {
    this.loading = true;
    console.log('Cargando datos del usuario actual...');
    
    this.userService.getUserProfile().subscribe({
      next: (data) => {
        console.log('Datos completos recibidos:', JSON.stringify(data, null, 2));
        console.log('Campos específicos:');
        console.log('- name:', data.name);
        console.log('- email:', data.email);
        console.log('- phone:', data.phone);
        console.log('- department:', data.department);
        console.log('- city:', data.city);
        console.log('- document_type:', data.document_type);
        console.log('- document_number:', data.document_number);
        
        // Asignar explícitamente todos los campos necesarios
        this.userData = {
          id: data.id,
          name: data.name || '',
          email: data.email || '',
          rol: data.rol || 'usuario',
          estado: data.estado !== undefined ? data.estado : true,
          isVerified: data.isVerified || false,
          phone: data.phone || '',
          department: data.department || '',
          city: data.city || '',
          document_type: data.document_type || '',
          document_number: data.document_number || ''
        };
        
        console.log('Datos asignados a userData:', this.userData);
        
        // Actualizar ciudades si hay un departamento seleccionado
        if (data.department) {
          this.cities = this.departmentCities[data.department] || [];
        }
        
        // Actualizar imagen de perfil
        if (data.profileImage) {
          this.userProfileImage = data.profileImage;
        } else if (data.userImages && data.userImages.length > 0) {
          const mainImage = data.userImages.find((img: Image) => img.is_main);
          this.userProfileImage = mainImage ? mainImage.url : data.userImages[0].url;
        }
        
        this.loading = false;
        this.cdr.detectChanges(); // Forzar detección de cambios
      },
      error: (error) => {
        console.error('Error al cargar datos del usuario actual:', error);
        this.toastr.error('Error al cargar tu información de perfil');
        this.loading = false;
        this.close.emit(false);
      }
    });
  }
  onDepartmentChange(event: any): void {
    const department = event.target.value;
    this.cities = this.departmentCities[department] || [];
    this.userData.city = '';
  }
  // Método para validar los datos antes de enviar
  validateData(): boolean {
    if (!this.userData.name || this.userData.name.trim() === '') {
      this.errorMessage = 'El nombre es obligatorio';
      return false;
    }
    
    return true;
  }
  // Método para continuar a la confirmación con contraseña (usuario normal)
  goToConfirmStep(): void {
    if (!this.validateData()) return;
    
    this.confirmStep = true;
    this.errorMessage = '';
  }
  // Método para enviar actualización sin confirmación (admin)
  submitAsAdmin(): void {
    if (!this.validateData()) return;
    
    this.isSubmitting = true;
    
    // Datos a actualizar
    const updateData = {
      name: this.userData.name,
      phone: this.userData.phone,
      department: this.userData.department,
      city: this.userData.city,
      // Datos que solo admin puede actualizar
      document_type: this.userData.document_type,
      document_number: this.userData.document_number,
      email: this.userData.email,
      rol: this.userData.rol,
      estado: this.userData.estado
    };
    
    this.userService.updateUser(this.userData.id!, updateData).subscribe({
      next: (response) => {
        this.toastr.success('Usuario actualizado correctamente');
        this.isSubmitting = false;
        this.close.emit(true);
      },
      error: (error) => {
        console.error('Error al actualizar usuario:', error);
        this.errorMessage = error.error?.msg || 'Error al actualizar el usuario';
        this.toastr.error(this.errorMessage);
        this.isSubmitting = false;
      }
    });
  }
  // Método para enviar actualización con contraseña (usuario normal)
  submitWithPassword(): void {
    if (!this.confirmPassword) {
      this.errorMessage = 'La contraseña es obligatoria para confirmar los cambios';
      return;
    }
    
    this.isSubmitting = true;
    this.errorMessage = '';
    
    const updateData = {
      name: this.userData.name,
      phone: this.userData.phone,
      department: this.userData.department,
      city: this.userData.city,
      document_type: this.userData.document_type,
      document_number: this.userData.document_number,
      password: this.confirmPassword
    };
    
    console.log('Enviando actualización con contraseña:', updateData);
    
    this.userService.updateUserProfileWithPassword(updateData).subscribe({
      next: (response) => {
        console.log('Actualización exitosa:', response);
        // Actualizar datos en localStorage
        const userData = localStorage.getItem('user');
        if (userData) {
          const user = JSON.parse(userData);
          user.name = response.user.name;
          user.department = response.user.department;
          user.city = response.user.city;
          user.phone = response.user.phone;
          localStorage.setItem('user', JSON.stringify(user));
        }
        
        this.toastr.success('Perfil actualizado correctamente');
        this.isSubmitting = false;
        this.close.emit(true);
      },
      error: (error) => {
        console.error('Error al actualizar perfil:', error);
        this.isSubmitting = false;
        
        if (error.status === 401) {
          // Si se indica que debe cerrarse la sesión (3 intentos fallidos)
          if (error.error && error.error.forceLogout === true) {
            this.errorMessage = 'Demasiados intentos fallidos. Su sesión será cerrada por seguridad.';
            this.toastr.error(this.errorMessage, 'Error de autenticación');
            
            // Cerrar sesión después de un breve retraso para mostrar el mensaje
            setTimeout(() => {
              this.tokenService.clearSession();
              this.router.navigate(['/login']);
            }, 2000);
          } 
          // Si hay intentos restantes, mostrarlos
          else if (error.error && error.error.attemptsLeft !== undefined) {
            this.attemptsLeft = error.error.attemptsLeft;
            this.errorMessage = `Contraseña incorrecta. Intentos restantes: ${this.attemptsLeft}`;
            this.toastr.error(this.errorMessage, 'Error de verificación');
            // NO cerrar sesión aquí
          }
          // Mensaje genérico si no hay información de intentos
          else {
            this.errorMessage = error.error?.msg || 'Contraseña incorrecta';
            this.toastr.error(this.errorMessage, 'Error de verificación');
            // NO cerrar sesión aquí tampoco
          }
        } else {
          this.errorMessage = error.error?.msg || 'Error al actualizar perfil';
          this.toastr.error(this.errorMessage);
        }
      }
    });
  }
  // Método principal que decide qué flujo seguir
  onSubmit(): void {
    if (!this.validateData()) {
      return;
    }
    
    // Si es el usuario actual (no admin) y aún no estamos en paso de confirmación
    if (this.isCurrentUser && !this.confirmStep) {
      // Ir al paso de confirmación con contraseña
      this.confirmStep = true;
      return;
    }

    // Si estamos en el paso de confirmación y es el usuario actual
    if (this.isCurrentUser && this.confirmStep) {
      // Usar el método específico para actualizar con contraseña
      this.submitWithPassword();
      return;
    }
    
    // A partir de aquí continúa solo para usuarios administradores
    this.submitAsAdmin();
  }
  // Volver al paso anterior
  goBack(): void {
    this.confirmStep = false;
    this.errorMessage = '';
  }
  cancel(): void {
    this.close.emit(false);
  }
  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent) {
    if (this.isOpen && !this.loading && !this.isSubmitting) {
      const modalContent = this.formElement?.nativeElement;
      if (modalContent && !modalContent.contains(event.target)) {
        this.cancel();
      }
    }
  }
  onFormClick(event: Event): void {
    event.stopPropagation();
  }
  // Añadir este método a tu clase
  uploadProfileImage(formData: FormData): void {
    // Verificar que userId existe antes de hacer la petición
    if (this.userId !== undefined) {
      this.loading = true;
      this.userService.uploadProfileImage(this.userId, formData).subscribe({
        next: (response) => {
          this.loading = false;
          if (response && response.image && response.image.url) {
            this.userProfileImage = response.image.url;
            this.toastr.success('Imagen de perfil actualizada correctamente');
            
            // Actualizar localStorage si es necesario
            const userData = localStorage.getItem('user');
            if (userData) {
              const user = JSON.parse(userData);
              user.profileImage = response.image.url;
              localStorage.setItem('user', JSON.stringify(user));
            }
          }
        },
        error: (error) => {
          this.loading = false;
          console.error('Error al subir imagen de perfil:', error);
          this.toastr.error('No se ha podido actualizar la imagen de perfil');
        }
      });
    } else {
      this.toastr.error('No se ha podido identificar al usuario');
    }
  }
}
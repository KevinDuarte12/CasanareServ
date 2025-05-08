import { Component, OnInit, Input, Output, EventEmitter, ChangeDetectorRef, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { UserService } from '../services/user.services';
import { TokenService } from '../services/token.service';
import { user } from '../interfaces/user';
import { Image } from '../interfaces/image';
import { ImageUploadComponent } from '../image-upload/image-upload.component';

@Component({
  selector: 'app-edit-user',
  templateUrl: './edit-user.component.html',
  styleUrls: ['./edit-user.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, ImageUploadComponent]
})
export class EditUserComponent implements OnInit {
  @ViewChild('userForm') formElement!: ElementRef;
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

  // Datos para verificación
  confirmPassword: string = '';
  confirmStep: boolean = false;
  
  // Estados de la interfaz
  loading: boolean = false;
  isSubmitting: boolean = false;
  isAdmin: boolean = false;
  errorMessage: string = '';
  
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
    private cdr: ChangeDetectorRef
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

  loadUserData(): void {
    if (!this.userId) return;

    this.loading = true;
    this.userService.getUser(this.userId).subscribe({
      next: (data) => {
        this.userData = data;
        
        // Actualizar ciudades si hay un departamento seleccionado
        if (data.department) {
          this.cities = this.departmentCities[data.department] || [];
        }
        
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar datos del usuario:', error);
        this.toastr.error('Error al cargar los datos del usuario');
        this.loading = false;
        this.close.emit(false);
      }
    });
  }

  loadCurrentUserData(): void {
    this.loading = true;
    this.userService.getUserInfo().subscribe({
      next: (data) => {
        this.userData = data;
        
        // Actualizar ciudades si hay un departamento seleccionado
        if (data.department) {
          this.cities = this.departmentCities[data.department] || [];
        }
        
        this.loading = false;
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
    
    // Datos a actualizar (limitados para usuario normal)
    const updateData = {
      name: this.userData.name,
      phone: this.userData.phone,
      department: this.userData.department,
      city: this.userData.city,
      password: this.confirmPassword // Para verificación
    };
    
    this.userService.updateUserProfileWithPassword(updateData).subscribe({
      next: (response) => {
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
        
        if (error.status === 401) {
          this.errorMessage = 'Contraseña incorrecta. No se pudo verificar su identidad.';
        } else {
          this.errorMessage = error.error?.msg || 'Error al actualizar perfil';
        }
        
        this.toastr.error(this.errorMessage);
        this.isSubmitting = false;
      }
    });
  }

  // Método principal que decide qué flujo seguir
  onSubmit(): void {
    if (this.isAdmin && !this.isCurrentUser) {
      // Admin editando a otro usuario
      this.submitAsAdmin();
    } else if (this.confirmStep) {
      // Usuario normal en paso de confirmación
      this.submitWithPassword();
    } else {
      // Usuario normal en primer paso
      this.goToConfirmStep();
    }
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
}
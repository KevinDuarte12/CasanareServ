import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { UserService } from '../services/user.services';
import { user } from '../interfaces/user';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { SpinnerComponent } from '../shared/spinner/spinner.component';
import { NgIf, NgFor } from '@angular/common';
import { ErrorService } from '../services/error.service';

 
@Component({
  selector: 'app-form-login',
  standalone: true,
  imports: [FormsModule, RouterLink, SpinnerComponent, NgIf, NgFor, RouterLink],
  templateUrl: './formlogin.component.html',
  styleUrl: './formlogin.component.css'
})
export class FormloginComponent {
  loading: boolean = false;
  userData = {
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    documentType: '',
    documentNumber: '',
    department: '',
    city: '',
    phone: '' // Agregar este campo al formulario
  };

  cities: string[] = [];
  currentStep = 1;

  constructor(
    private toastr: ToastrService,
    private userService: UserService,
    private router: Router,
    private errorService: ErrorService
  ) { }

  onDepartmentChange(event: any) {
    const department = event.target.value;
    // Reiniciar la ciudad seleccionada
    this.userData.city = '';
    
    // Mapa de departamentos y sus municipios
    const colombiaMunicipios: {[key: string]: string[]} = {
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
      'Cauca': ['Popayán', 'Cajibío', 'El Tambo', 'Patía', 'Santander de Quilichao'],
      'Cesar': ['Valledupar', 'Aguachica', 'Agustín Codazzi', 'Bosconia', 'La Jagua de Ibirico'],
      'Chocó': ['Quibdó', 'Acandí', 'Bojayá', 'Condoto', 'Istmina'],
      'Córdoba': ['Montería', 'Cereté', 'Lorica', 'Planeta Rica', 'Sahagún'],
      'Cundinamarca': ['Bogotá', 'Chía', 'Facatativá', 'Fusagasugá', 'Girardot', 'Mosquera', 'Soacha', 'Zipaquirá'],
      'Guainía': ['Inírida', 'Barranco Minas', 'Mapiripana', 'San Felipe'],
      'Guaviare': ['San José del Guaviare', 'Calamar', 'El Retorno', 'Miraflores'],
      'Huila': ['Neiva', 'Garzón', 'La Plata', 'Pitalito', 'Rivera'],
      'La Guajira': ['Riohacha', 'Albania', 'Barrancas', 'Dibulla', 'Maicao', 'Uribia'],
      'Magdalena': ['Santa Marta', 'Ciénaga', 'El Banco', 'Fundación', 'Plato'],
      'Meta': ['Villavicencio', 'Acacías', 'Granada', 'Puerto López', 'San Martín'],
      'Nariño': ['Pasto', 'Ipiales', 'La Unión', 'Tumaco', 'Túquerres'],
      'Norte de Santander': ['Cúcuta', 'Los Patios', 'Ocaña', 'Pamplona', 'Villa del Rosario'],
      'Putumayo': ['Mocoa', 'Colón', 'Orito', 'Puerto Asís', 'Sibundoy'],
      'Quindío': ['Armenia', 'Calarcá', 'Circasia', 'La Tebaida', 'Montenegro'],
      'Risaralda': ['Pereira', 'Dosquebradas', 'La Virginia', 'Santa Rosa de Cabal'],
      'San Andrés y Providencia': ['San Andrés', 'Providencia'],
      'Santander': ['Bucaramanga', 'Barrancabermeja', 'Floridablanca', 'Girón', 'Piedecuesta'],
      'Sucre': ['Sincelejo', 'Corozal', 'Sampués', 'San Marcos', 'Tolú'],
      'Tolima': ['Ibagué', 'Chaparral', 'Espinal', 'Honda', 'Mariquita'],
      'Valle del Cauca': ['Cali', 'Buenaventura', 'Buga', 'Cartago', 'Palmira', 'Tuluá', 'Yumbo'],
      'Vaupés': ['Mitú', 'Caruru', 'Pacoa', 'Taraira', 'Yavaraté'],
      'Vichada': ['Puerto Carreño', 'Cumaribo', 'La Primavera', 'Santa Rosalía']
    };
    
    // Asignar ciudades según el departamento seleccionado
    this.cities = colombiaMunicipios[department] || [];
  }

  nextStep() {
    if (this.currentStep < 2) {
      this.currentStep++;
    }
  }

  previousStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  onSubmit() {
    // Validaciones existentes
    if (this.userData.password === '' || this.userData.name === '' || 
        this.userData.email === '' || this.userData.confirmPassword === '') {
      this.toastr.error('Todos los campos son requeridos', 'Error!', {
        timeOut: 3000,
        positionClass: 'toast-top-center',
        progressBar: true
      });
      return;
    }

    // Validación de contraseñas
    if (this.userData.password !== this.userData.confirmPassword) {
      this.toastr.error('Las contraseñas no coinciden', 'Error!', {
        timeOut: 3000,
        positionClass: 'toast-top-center',
        progressBar: true
      });
      return;
    }

    // Validación de email
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    if (!emailRegex.test(this.userData.email)) {
      this.toastr.error('Por favor ingresa un email válido', 'Error!', {
        timeOut: 3000,
        positionClass: 'toast-top-center',
        progressBar: true
      });
      return;
    }

    // Crear el objeto usuario con TODOS los campos, incluyendo los nuevos
    const user: user = {
      name: this.userData.name,
      email: this.userData.email,
      password: this.userData.password,
      document_type: this.userData.documentType,
      document_number: this.userData.documentNumber,
      department: this.userData.department,
      city: this.userData.city,
      phone: this.userData.phone // También necesitas agregar este campo al formulario
    };

    this.loading = true;
    this.userService.signIn(user).subscribe({
      next: (response) => {
        this.loading = false;
        this.toastr.success(
          'Usuario registrado correctamente. Por favor revisa tu email para verificar tu cuenta.',
          'Registro exitoso!',
          {
            timeOut: 3000,
            progressBar: true
          }
        );
        this.router.navigate(['/login'], { 
          queryParams: { 
            message: 'verification-pending'
          }
        });
      },
      error: (e: HttpErrorResponse) => {
        this.loading = false;
        if (e.error.code === 'EMAIL_EXISTS') {
          this.toastr.error('El email ya está registrado', 'Error!');
        } else {
          this.errorService.msjError(e);
        }
      }
    });
  }

  navigateToTerms(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.router.navigate(['/terminos-y-condiciones']);
  }
}
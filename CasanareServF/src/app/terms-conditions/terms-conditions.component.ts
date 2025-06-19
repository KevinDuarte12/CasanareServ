import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-terms-conditions',
  templateUrl: './terms-conditions.component.html',
  styleUrls: ['./terms-conditions.component.css']
})
export class TermsConditionsComponent implements OnInit {
  // Estado para controlar las secciones expandidas
  expandedSections: { [key: string]: boolean } = {
    'tc-content-1': true, // La primera sección estará expandida por defecto
    'tc-content-2': false,
    'tc-content-3': false,
    'tc-content-4': false,
    'tc-content-5': false // Por si necesitas añadir más secciones
  };
  
  // Estado para el checkbox y botón
  termsAccepted: boolean = false;

  constructor(private router: Router, private toastr: ToastrService) { }

  ngOnInit(): void {
    // Inicializa la primera sección como expandida
    setTimeout(() => {
      this.expandedSections['tc-content-1'] = true;
    }, 300);
  }

  // Método para cambiar el estado de expansión de una sección
  toggleSection(headerId: string): void {
    const contentId = headerId.replace('header', 'content');
    this.expandedSections[contentId] = !this.expandedSections[contentId];
  }

  // Método para actualizar el estado del checkbox
  onTermsCheckboxChange(event: any): void {
    this.termsAccepted = event.target.checked;
  }

  // Método para manejar el clic en el botón Aceptar
  acceptTerms(): void {
    if (this.termsAccepted) {
      // Guardar en localStorage que el usuario aceptó los términos
      localStorage.setItem('termsAccepted', 'true');
      
      console.log('✅ Términos aceptados, guardando en localStorage');
      
      // ✅ VERIFICAR si viene del registro y volver ahí
      const savedFormData = localStorage.getItem('registrationFormData');
      if (savedFormData) {
        
        this.router.navigate(['/registro']);
      } else {
        // Si no hay datos guardados, ir al registro normal
        this.router.navigate(['/registro']);
      }
    } else {
      // ✅ MENSAJE si no ha marcado el checkbox
      this.toastr.warning('Debes marcar que aceptas los términos y condiciones', 'Atención');
    }
  }

  // ✅ MODIFICAR el método goBack:
  goBack(): void {
    // Verificar si hay datos guardados del formulario de registro
    const savedFormData = localStorage.getItem('registrationFormData');
    if (savedFormData) {
      // Si hay datos guardados, volver al registro
      this.router.navigate(['/registro']);
    } else {
      // Si no hay datos, ir al registro normal
      this.router.navigate(['/registro']);
    }
  }
}

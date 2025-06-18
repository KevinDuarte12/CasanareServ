import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

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

  constructor(private router: Router) { }

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
      this.router.navigate(['/registro']);
    }
  }

  // Método para el botón Regresar
  goBack(): void {
    this.router.navigate(['/registro']);
  }
}

import {  Component } from '@angular/core';
import { HeaderComponent } from '../header/header.component';
import{ FooterComponent } from '../footer/footer.component';
import { NavbarComponent } from '../navbar/navbar.component';

@Component({
  selector: 'app-formulario-vender',
  standalone:true,
  imports: [HeaderComponent, FooterComponent, NavbarComponent],
  templateUrl: './formulario-vender.component.html',
  styleUrl: './formulario-vender.component.css'
})
export class FormularioVenderComponent {
  // Metodo para mostrar o ocultar el campo de intercambio //
  mostrarCampoIntercambio(event: Event){
    const selectElement = event.target as HTMLSelectElement;
    const campoIntercambio =  document.getElementById('campoIntercambio');

    if (campoIntercambio){
      if(selectElement.value === 'intercambio'){
        campoIntercambio.classList.remove('hidden');
        campoIntercambio.classList.add('visible');
      } else {
        campoIntercambio.classList.remove('visible');
        campoIntercambio.classList.add('hidden');
      }
    }
  }

}

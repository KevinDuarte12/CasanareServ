import { Component } from '@angular/core';
import { HeaderComponent } from '../header/header.component';
import{ FooterComponent } from '../footer/footer.component';
import { NavbarComponent } from '../navbar/navbar.component';

@Component({
  selector: 'app-formulario-vender',
  imports: [HeaderComponent, FooterComponent, NavbarComponent],
  templateUrl: './formulario-vender.component.html',
  styleUrl: './formulario-vender.component.css'
})
export class FormularioVenderComponent {

}

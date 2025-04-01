import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../header/header.component';
import { BreadcrumbComponent } from '../breadcrumb/breadcrumb.component';
import{ FooterComponent } from '../footer/footer.component';
import { NavbarComponent } from '../navbar/navbar.component';

@Component({
  selector: 'app-tienda',
  imports: [ RouterOutlet,HeaderComponent,BreadcrumbComponent,FooterComponent, NavbarComponent],
  templateUrl: './tienda.component.html',
  styleUrl: './tienda.component.css',
  standalone: true
})
export class TiendaComponent {

}

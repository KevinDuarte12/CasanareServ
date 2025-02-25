import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../header/header.component';
import { BreadcrumbComponent } from '../breadcrumb/breadcrumb.component';
import{ FooterComponent } from '../footer/footer.component';

@Component({
  selector: 'app-tienda',
  imports: [RouterLink, RouterLinkActive, RouterOutlet,HeaderComponent,BreadcrumbComponent,FooterComponent],
  templateUrl: './tienda.component.html',
  styleUrl: './tienda.component.css',
  standalone: true
})
export class TiendaComponent {

}

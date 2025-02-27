import { Component } from '@angular/core';
import { HeaderComponent } from "../header/header.component";
import{ NavbarComponent } from "../navbar/navbar.component";
import { BreadcrumbComponent } from "../breadcrumb/breadcrumb.component";
import { FooterComponent } from "../footer/footer.component";

@Component({
  selector: 'app-checkout',
  imports: [HeaderComponent, NavbarComponent, BreadcrumbComponent, FooterComponent],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.css'
})
export class CheckoutComponent {

}

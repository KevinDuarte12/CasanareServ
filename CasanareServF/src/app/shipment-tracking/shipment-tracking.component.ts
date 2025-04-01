import { Component } from '@angular/core';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { NavbarComponent } from '../navbar/navbar.component';

@Component({
  selector: 'app-shipment-tracking',
  imports: [HeaderComponent, FooterComponent, NavbarComponent],
  templateUrl: './shipment-tracking.component.html',
  styleUrl: './shipment-tracking.component.css'
})
export class ShipmentTrackingComponent {

}

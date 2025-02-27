import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { NavbarComponent } from '../navbar/navbar.component';
@Component({
  standalone: true,
  selector: 'app-login',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, HeaderComponent, FooterComponent, NavbarComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'

})
export class LoginComponent {

}

import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router'; // Eliminé RouterLinkActive porque no se usaba

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css'],
  standalone: true,
  imports: [RouterLink, RouterOutlet] // Eliminé RouterLinkActive
})
export class FooterComponent {}

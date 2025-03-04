import { Component } from '@angular/core';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { NavbarComponent } from '../navbar/navbar.component';

import { BreadcrumbComponent } from '../breadcrumb/breadcrumb.component';

@Component({
  selector: 'app-faq',
  standalone: true,
  imports: [HeaderComponent, FooterComponent, NavbarComponent,
    BreadcrumbComponent],
  templateUrl: './faq.component.html',
  styleUrls: ['./faq.component.css']
})
export class FaqComponent {
  activeCategory: string | null = null;
  activeQuestionIndex: number | null = null;

  toggleCategory(category: string): void {
    this.activeCategory = this.activeCategory === category ? null : category;
    // Cuando se cambia de categoría, resetear la pregunta activa
    this.activeQuestionIndex = null;
  }

  toggleQuestion(index: number): void {
    this.activeQuestionIndex = this.activeQuestionIndex === index ? null : index;
  }

  isQuestionActive(index: number): boolean {
    return this.activeQuestionIndex === index;
  }
}
import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
export interface BreadcrumbItem {
  label: string;
  link: string | null;
}
@Component({
  selector: 'app-breadcrumb',
  imports: [RouterLink, CommonModule],
  templateUrl: './breadcrumb.component.html',
  styleUrl: './breadcrumb.component.css'
})
export class BreadcrumbComponent {
  @Input() title: string = 'Página';
  @Input() breadcrumbs: BreadcrumbItem[] = [];
}

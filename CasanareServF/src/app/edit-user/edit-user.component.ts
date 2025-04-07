import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { UserService } from '../services/user.services';

@Component({
  selector: 'app-edit-user',
  templateUrl: './edit-user.component.html',
  styleUrls: ['./edit-user.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule]
})
export class EditUserComponent implements OnInit {
  @Input() userId: number = 0;
  @Input() isOpen: boolean = false;
  @Output() close = new EventEmitter<boolean>();
  
  userData: any = {
    name: '',
    email: '',
    rol: 'usuario',
    estado: true
  };
  loading: boolean = false;
  canEditRoles: boolean = false;

  constructor(
    private router: Router,
    private userService: UserService,
    private toastr: ToastrService
  ) { }

  ngOnInit(): void {
    if (this.userId) {
      this.checkPermissions();
    }
  }

  checkPermissions(): void {
    // Verificar permisos antes de cargar datos
    const userData = localStorage.getItem('user');

    if (!userData) {
      this.toastr.error('Información de usuario no disponible');
      this.closeModal(false);
      return;
    }

    try {
      const currentUser = JSON.parse(userData);
      const isAdmin = currentUser.rol === 'admin';

      // Si no es admin, solo puede editar su propio perfil
      if (!isAdmin && Number(currentUser.id) !== Number(this.userId)) {
        this.toastr.error('No tienes permiso para editar este usuario');
        this.closeModal(false);
        return;
      }

      // Solo los administradores pueden cambiar roles
      this.canEditRoles = isAdmin;

      // Si todo está bien, cargar los datos
      this.loadUserData();
    } catch (error) {
      console.error('Error al procesar información de usuario:', error);
      this.toastr.error('Error al verificar permisos');
      this.closeModal(false);
    }
  }

  loadUserData(): void {
    this.loading = true;
    this.userService.getUser(this.userId).subscribe({
      next: (data) => {
        console.log('Datos del usuario obtenidos:', data);
        this.userData = data;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar datos del usuario:', error);
        this.loading = false;
        this.toastr.error('Error al cargar los datos del usuario');
        this.closeModal(false);
      }
    });
  }

  onSubmit(): void {
    this.loading = true;
    this.userService.updateUser(this.userId, this.userData).subscribe({
      next: () => {
        this.toastr.success('Usuario actualizado exitosamente');
        this.closeModal(true);
      },
      error: (error) => {
        console.error('Error al actualizar usuario:', error);
        this.loading = false;
        this.toastr.error('Error al actualizar el usuario');
      }
    });
  }

  cancel(): void {
    this.closeModal(false);
  }

  closeModal(refresh: boolean): void {
    this.close.emit(refresh); // Emitir evento con booleano que indica si se debe refrescar la lista
  }
}
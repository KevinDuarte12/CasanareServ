import { Component, OnInit, Input, Output, EventEmitter, ChangeDetectorRef, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { UserService } from '../services/user.services';
import { TokenService } from '../services/token.service';
import { user } from '../interfaces/user';
import { Image } from '../interfaces/image';
import { ImageUploadComponent } from '../image-upload/image-upload.component';

@Component({
  selector: 'app-edit-user',
  templateUrl: './edit-user.component.html',
  styleUrls: ['./edit-user.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, ImageUploadComponent]
})
export class EditUserComponent implements OnInit {
  @ViewChild('userForm') formElement!: ElementRef;
  @Input() userId: number | undefined;
  @Input() isOpen: boolean = false;
  @Output() close = new EventEmitter<boolean>();

  userData: user = {
    id: 0,
    name: '',
    email: '',
    rol: 'usuario',
    estado: true,
    isVerified: false
  };

  loading: boolean = false;
  isSubmitting: boolean = false;
  canEditRoles: boolean = false;
  currentUserRole: string = '';
  profileImage: Image | null = null;

  constructor(
    private userService: UserService,
    private tokenService: TokenService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    // Verificar si el usuario actual es admin para determinar si puede editar roles
    const currentUser = this.tokenService.getUser();
    this.currentUserRole = currentUser?.rol || '';
    this.canEditRoles = this.currentUserRole === 'admin';

    if (this.userId) {
      this.loadUserData();
    }
  }

  loadUserData(): void {
    if (!this.userId) return;

    this.loading = true;
    this.userService.getUser(this.userId).subscribe({
      next: (data) => {
        this.userData = data;
        
        // Si el usuario tiene imágenes, establecer la imagen de perfil
        if (data.userImages && data.userImages.length > 0) {
          // Buscar primero una imagen marcada como principal
          this.profileImage = data.userImages.find(img => img.is_main) || data.userImages[0];
        }
        
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar datos del usuario:', error);
        this.toastr.error('Error al cargar los datos del usuario');
        this.loading = false;
        this.close.emit(false);
      }
    });
  }

  onSubmit(): void {
    if (!this.userId) {
      this.toastr.error('No se puede actualizar el usuario sin ID');
      return;
    }

    this.isSubmitting = true;
    this.userService.updateUser(this.userId, this.userData).subscribe({
      next: (response) => {
        this.toastr.success('Usuario actualizado correctamente');
        this.isSubmitting = false;
        this.close.emit(true);
      },
      error: (error) => {
        console.error('Error al actualizar usuario:', error);
        this.toastr.error(error.error?.msg || 'Error al actualizar el usuario');
        this.isSubmitting = false;
      }
    });
  }

  // Método para manejar el cambio de imagen de perfil
  onProfileImageChanged(images: Image[]): void {
    console.log('Imágenes de perfil cambiadas:', images);
    
    if (images && images.length > 0) {
      // Actualizar la imagen principal
      const mainImage = images.find(img => img.is_main) || images[0];
      this.profileImage = mainImage;
      
      // Si tenemos userImages, actualizarlas
      if (!this.userData.userImages) {
        this.userData.userImages = [];
      }
      
      // Actualizar userImages para reflejar las nuevas imágenes
      this.userData.userImages = images;
      
      // Forzar actualización de la vista
      this.cdr.detectChanges();
    } else {
      this.profileImage = null;
    }
  }

  cancel(): void {
    this.close.emit(false);
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent) {
    if (this.isOpen && !this.loading && !this.isSubmitting) {
      const modalContent = this.formElement?.nativeElement;
      if (modalContent && !modalContent.contains(event.target)) {
        this.cancel();
      }
    }
  }

  onFormClick(event: Event): void {
    event.stopPropagation();
  }
}
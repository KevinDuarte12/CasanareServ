import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { Image } from '../interfaces/image';
import { ImageService } from '../services/image.service';

@Component({
  selector: 'app-image-upload',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './image-upload.component.html',
  styleUrls: ['./image-upload.component.css']
})
export class ImageUploadComponent implements OnChanges {
  @Input() entityType: string = 'product';
  @Input() entityId: number | undefined;
  @Input() allowMultiple: boolean = true;
  @Input() showPreview: boolean = true;
  @Output() imagesChanged = new EventEmitter<Image[]>();
  @Output() imageUploaded = new EventEmitter<Image>();

  @ViewChild('fileInput') fileInput!: ElementRef;

  images: Image[] = [];
  isUploading: boolean = false;
  uploadProgress: number = 0;
  selectedFiles: File[] = [];
  uploading: boolean = false;
  isMainImage: boolean = false;

  constructor(
    private imageService: ImageService,
    private toastr: ToastrService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    // Cargar imágenes cuando el entityId cambia y no es undefined
    if ((changes['entityId'] || changes['entityType']) && this.entityId) {
      this.loadImages();
    }
  }

  loadImages(): void {
    if (!this.entityId) {
      console.warn('No se puede cargar imágenes sin ID de entidad');
      return;
    }

    console.log(`Cargando imágenes para ${this.entityType} con ID: ${this.entityId}`);
    
    this.imageService.getImagesByEntity(this.entityType, this.entityId)
      .subscribe({
        next: (images) => {
          console.log('Imágenes cargadas:', images);
          this.images = images;
          this.imagesChanged.emit(this.images);
        },
        error: (error) => {
          console.error('Error cargando imágenes:', error);
          this.toastr.error('Error al cargar las imágenes');
        }
      });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.selectedFiles = Array.from(input.files);
      
      // Validar tamaño y tipo
      const invalidFiles = this.selectedFiles.filter(
        file => file.size > 5 * 1024 * 1024 || !file.type.startsWith('image/')
      );
      
      if (invalidFiles.length > 0) {
        this.toastr.warning('Algunos archivos no son válidos (max 5MB, solo imágenes)');
        this.selectedFiles = this.selectedFiles.filter(
          file => file.size <= 5 * 1024 * 1024 && file.type.startsWith('image/')
        );
      }
      
      if (!this.allowMultiple && this.selectedFiles.length > 1) {
        this.selectedFiles = [this.selectedFiles[0]];
        this.toastr.warning('Solo se permite una imagen');
      }
    }
  }

  onUploadClick(event: Event): void {
    // Prevenir la propagación del evento para que no se envíe el formulario
    event.preventDefault();
    event.stopPropagation();
    
    // Resto de tu código para seleccionar archivos
    this.fileInput.nativeElement.click();
  }

  uploadFiles(event?: Event): void {
    // Prevenir que el evento se propague al formulario padre
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (!this.selectedFiles.length) {
      this.toastr.warning('Selecciona al menos una imagen');
      return;
    }

    if (!this.entityId) {
      this.toastr.error('ID de entidad no disponible');
      return;
    }

    this.isUploading = true;
    this.uploadProgress = 0;

    const totalFiles = this.selectedFiles.length;
    let filesUploaded = 0;
    let errors = 0;

    console.log(`Iniciando carga de ${totalFiles} imágenes`);

    // Capturar el entityId en una constante, así TypeScript sabe que no cambiará
    const entityId = this.entityId; // TypeScript infiere que esto es un número

    this.selectedFiles.forEach((file, index) => {
      // Determinar si esta imagen será la principal
      const isMain = !this.allowMultiple || (this.images.length === 0 && index === 0);
      
      console.log(`Subiendo archivo ${index + 1}/${totalFiles}: ${file.name}, isMain: ${isMain}`);
      
      this.imageService.uploadImage(file, this.entityType, entityId, isMain)
        .subscribe({
          next: (response) => {
            console.log(`Archivo ${index + 1} subido con éxito:`, response);
            filesUploaded++;
            this.uploadProgress = ((filesUploaded + errors) / totalFiles) * 100;
            
            if (filesUploaded + errors === totalFiles) {
              this.finishUpload(filesUploaded, errors);
            }
          },
          error: (error) => {
            console.error(`Error subiendo archivo ${index + 1}:`, error);
            this.toastr.error(`Error al subir ${file.name}`);
            errors++;
            this.uploadProgress = ((filesUploaded + errors) / totalFiles) * 100;
            
            if (filesUploaded + errors === totalFiles) {
              this.finishUpload(filesUploaded, errors);
            }
          }
        });
    });
  }

  uploadImageToServer(file: File, event?: Event): void {
    // Prevenir que el evento se propague
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    // Verificar que entityId no sea undefined
    if (!this.entityId) {
      this.toastr.error('No se puede subir la imagen: ID de entidad no disponible');
      return;
    }

    this.uploading = true;
    // Ahora TypeScript sabe que entityId no es undefined
    this.imageService.uploadImage(file, this.entityType, this.entityId, this.isMainImage).subscribe({
      next: (response) => {
        this.uploading = false;
        this.toastr.success('Imagen subida correctamente');
        
        // Emitir el evento de imagen subida pero NO el de actualización completa
        this.imageUploaded.emit(response);
        
        // Actualizar la lista de imágenes
        this.loadImages();
      },
      error: (error) => {
        this.uploading = false;
        console.error('Error al subir imagen:', error);
        this.toastr.error('Error al subir la imagen');
      }
    });
  }

  finishUpload(success: number, errors: number): void {
    this.isUploading = false;
    this.selectedFiles = [];
    
    if (success > 0) {
      if (errors > 0) {
        this.toastr.warning(`Carga parcial: ${success} imágenes subidas, ${errors} con errores`);
      } else {
        this.toastr.success(`${success} imágenes subidas con éxito`);
      }
      this.loadImages();
    } else if (errors > 0) {
      this.toastr.error(`No se pudo subir ninguna imagen`);
    }
  }

  deleteImage(image: Image): void {
    if (confirm('¿Estás seguro de eliminar esta imagen?')) {
      const imageId = image.id || image.id_image;
      
      if (!imageId) {
        this.toastr.error('ID de imagen no disponible');
        return;
      }
      
      this.imageService.deleteImage(imageId)
        .subscribe({
          next: () => {
            this.toastr.success('Imagen eliminada');
            this.loadImages();
          },
          error: (error) => {
            console.error('Error eliminando imagen:', error);
            this.toastr.error('Error al eliminar la imagen');
          }
        });
    }
  }

  setAsMain(image: Image): void {
    const imageId = image.id || image.id_image;
    
    if (!imageId) {
      this.toastr.error('ID de imagen no disponible');
      return;
    }
    
    this.imageService.setMainImage(imageId)
      .subscribe({
        next: () => {
          this.toastr.success('Imagen establecida como principal');
          this.loadImages();
        },
        error: (error) => {
          console.error('Error estableciendo imagen principal:', error);
          this.toastr.error('Error al establecer imagen principal');
        }
      });
  }
}

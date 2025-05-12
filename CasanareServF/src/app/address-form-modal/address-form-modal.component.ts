import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {  DeliveryAddressService } from '../services/delivery-address.service';
import { ToastrService } from 'ngx-toastr';
import { DeliveryAddress } from '../interfaces/deliveryAddress';
@Component({
  selector: 'app-address-form-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './address-form-modal.component.html',
  styleUrls: ['./address-form-modal.component.css']
})
export class AddressFormModalComponent implements OnInit {
  @Input() showModal: boolean = false;
  @Input() addressToEdit: DeliveryAddress | null = null;
  @Output() closeModal = new EventEmitter<void>();
  @Output() addressSaved = new EventEmitter<DeliveryAddress>();

  addressForm!: FormGroup;
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    private addressService: DeliveryAddressService,
    private toastr: ToastrService
  ) { }

  ngOnInit(): void {
    this.initForm();
  }

  // Actualizar para cargar correctamente los datos cuando se edita una dirección
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['addressToEdit'] && this.addressToEdit) {
      this.addressForm.patchValue({
        name: this.addressToEdit.name,
        recipient_name: this.addressToEdit.recipient_name,
        recipient_phone: this.addressToEdit.recipient_phone,
        address_line1: this.addressToEdit.address_line1, // Cambiar a address_line1
        address_line2: this.addressToEdit.address_line2,
        neighborhood: this.addressToEdit.neighborhood,
        city: this.addressToEdit.city,
        department: this.addressToEdit.department,
        postal_code: this.addressToEdit.postal_code,
        additional_instructions: this.addressToEdit.additional_instructions,
        is_default: this.addressToEdit.is_default
      });
    } else if (changes['showModal'] && this.showModal) {
      this.addressForm.reset({
        is_default: false
      });
    }
  }

  // Actualizar el método initForm para usar address_line1 en lugar de address
  private initForm(): void {
    this.addressForm = this.fb.group({
      name: ['', [Validators.required]], 
      recipient_name: ['', [Validators.required]],
      recipient_phone: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      address_line1: ['', [Validators.required]], // Cambiar address a address_line1
      address_line2: [''],
      neighborhood: [''],
      city: ['', [Validators.required]],
      department: ['', [Validators.required]],
      postal_code: [''],
      additional_instructions: [''],
      is_default: [false]
    });
  }

  // También necesitas actualizar el método onSubmit para mapear correctamente los valores
  onSubmit(): void {
    if (this.addressForm.invalid) {
      this.markFormGroupTouched(this.addressForm);
      return;
    }

    this.isSubmitting = true;
    
    // Obtener los valores del formulario
    const addressData: DeliveryAddress = this.addressForm.value;
    
    // Si editamos una dirección existente
    if (this.addressToEdit && this.addressToEdit.id) {
      this.addressService.updateAddress(this.addressToEdit.id, addressData).subscribe({
        next: (updatedAddress) => {
          this.handleSuccess(updatedAddress);
        },
        error: (error) => {
          this.handleError(error);
        }
      });
    } else {
      // Si creamos una nueva dirección
      this.addressService.createAddress(addressData).subscribe({
        next: (newAddress) => {
          this.handleSuccess(newAddress);
        },
        error: (error) => {
          this.handleError(error);
        }
      });
    }
  }

  close(): void {
    this.addressForm.reset();
    this.closeModal.emit();
  }

  handleOverlayClick(event: MouseEvent): void {
    // Solo cerrar si el clic fue directamente en el overlay y no en sus hijos
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  /**
   * Marca todos los controles en un grupo de formulario como tocados
   * @param formGroup - El grupo de formulario a marcar
   */
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();

      if ((control as any).controls) {
        this.markFormGroupTouched(control as FormGroup);
      }
    });
  }

  /**
   * Maneja la respuesta exitosa después de guardar una dirección
   * @param address - La dirección guardada
   */
  private handleSuccess(address: DeliveryAddress): void {
    this.isSubmitting = false;
    
    // Mostrar mensaje de éxito
    const action = this.addressToEdit ? 'actualizada' : 'creada';
    this.toastr.success(`¡La dirección ha sido ${action} correctamente!`);
    
    // Reiniciar el formulario
    this.addressForm.reset({
      is_default: false
    });
    
    // Emitir evento para actualizar la lista en el componente padre
    this.addressSaved.emit(address);
    
    // Cerrar el modal
    this.closeModal.emit();
  }

  /**
   * Maneja los errores al guardar una dirección
   * @param error - El error recibido
   */
  private handleError(error: any): void {
    this.isSubmitting = false;
    
    // Registrar el error en la consola
    console.error('Error al guardar dirección:', error);
    
    // Extraer mensaje de error para mostrar al usuario
    let errorMessage = 'No se pudo guardar la dirección';
    
    if (error.error?.msg) {
      errorMessage = error.error.msg;
    } else if (error.error?.error) {
      errorMessage = error.error.error;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    this.toastr.error(errorMessage);
  }
}

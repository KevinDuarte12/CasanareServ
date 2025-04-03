import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormularioVenderComponent } from './formulario-vender.component';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('FormularioVenderComponent', () => {
  let component: FormularioVenderComponent;
  let fixture: ComponentFixture<FormularioVenderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations:[FormularioVenderComponent],
      schemas:[NO_ERRORS_SCHEMA]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FormularioVenderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

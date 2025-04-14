import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserviewbarComponent } from './userviewbar.component';

describe('UserviewbarComponent', () => {
  let component: UserviewbarComponent;
  let fixture: ComponentFixture<UserviewbarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserviewbarComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserviewbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

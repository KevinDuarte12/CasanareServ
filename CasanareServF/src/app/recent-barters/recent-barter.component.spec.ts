import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecentBarterComponent } from './recent-barter.component';

describe('RecentBarterComponent', () => {
  let component: RecentBarterComponent;
  let fixture: ComponentFixture<RecentBarterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecentBarterComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RecentBarterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

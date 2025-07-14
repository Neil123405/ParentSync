import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AllEventsPage } from './all-events.page';

describe('AllEventsPage', () => {
  let component: AllEventsPage;
  let fixture: ComponentFixture<AllEventsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AllEventsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

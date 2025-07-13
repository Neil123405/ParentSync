import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SchoolEventsPage } from './school-events.page';

describe('SchoolEventsPage', () => {
  let component: SchoolEventsPage;
  let fixture: ComponentFixture<SchoolEventsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(SchoolEventsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

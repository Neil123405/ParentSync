import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DayEventsPage } from './day-events.page';

describe('DayEventsPage', () => {
  let component: DayEventsPage;
  let fixture: ComponentFixture<DayEventsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(DayEventsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

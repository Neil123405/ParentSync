import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StudentAnnouncementsPage } from './student-announcements.page';

describe('StudentAnnouncementsPage', () => {
  let component: StudentAnnouncementsPage;
  let fixture: ComponentFixture<StudentAnnouncementsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(StudentAnnouncementsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

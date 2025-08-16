import { Component, OnInit } from '@angular/core';

import { Router } from '@angular/router';
import { CalendarEvent } from 'angular-calendar';

import { ViewWillEnter } from '@ionic/angular';

import { startOfDay } from 'date-fns';

import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-calendar',
  templateUrl: './calendar.page.html',
  styleUrls: ['./calendar.page.scss'],
  standalone: false,
})
export class CalendarPage implements OnInit, ViewWillEnter {
  viewDate: Date = new Date();

  private _calendarEvents: CalendarEvent[] = [];
  get calendarEvents(): CalendarEvent[] {
    return this._calendarEvents;
  }

  weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  linkedStudentIds: number[] = [];
  linkedEventIds: Set<number> = new Set<number>();
  currentYear: number = new Date().getFullYear();
  currentMonth: number = new Date().getMonth();
  selectedDay: { year: number, month: number, date: number } | null = null;
  calendarGrid: any[][] = [];
  loadedConsentForms: any[] = [];

  showUpcomingEvents: boolean = true;

  constructor(
    private router: Router,
    private apiService: ApiService
  ) { }

  // This will run every time the page is shown (not just on first load)
  ionViewWillEnter() {
    this.ngOnInit();
  }

  ngOnInit() {
    // Only use navState if it contains BOTH month and year AND they are in a reasonable range
    // const navState = window.history.state;
    // if (
    //   typeof navState.month === 'number' &&
    //   typeof navState.year === 'number' &&
    //   navState.month >= 0 && navState.month <= 11 &&
    //   navState.year > 2000 && navState.year < 2100
    // ) {
    //   this.currentMonth = navState.month;
    //   this.currentYear = navState.year;
    // } else {
    const today = new Date();
    this.currentMonth = today.getMonth();
    this.currentYear = today.getFullYear();
    // }

    const parentProfile = this.apiService.getCurrentProfile();
    if (parentProfile) {
      this.apiService.getParentChildren(parentProfile.parent_id).subscribe(childrenRes => {
        const childrenArray = childrenRes.children || [];
        this.linkedStudentIds = childrenArray.map((child: any) => child.student_id);

        // let allForms: any[] = [];
        // let loaded = 0;
        if (this.linkedStudentIds.length === 0) {
          this.loadedConsentForms = [];
          this.generateCalendar(this.linkedEventIds, []);
          return;
        }
        // Fetch all events
        this.apiService.getParentEvents(parentProfile.parent_id).subscribe(res => {
          this._calendarEvents = (res.events || []).map((event: any) => ({
            ...event,
            start: new Date(event.date),
            title: event.title,
            id: event.id ?? event.event_id,
            student_id: event.student_id,
            meta: {
              student_id: event.student_id, description: event.description,
              student: {
                first_name: event.first_name,
                last_name: event.last_name
              }
            }
          }));

          // Fetch event participants for this parent
          // this.apiService.getParentEventParticipants(parentProfile.parent_id).subscribe(epRes => {
          //   const eventParticipants = epRes.eventParticipants || [];
          // this.linkedEventIds = new Set(eventParticipants.map((ep: any) => ep.event_id));
          this.linkedEventIds = new Set(this._calendarEvents.map((ev: any) => ev.id));
        });
        // Fetch consent forms for all linked students
        // this.linkedStudentIds.forEach(studentId => {
        //   this.apiService.getUnsignedConsentFormsForStudent(studentId).subscribe(res => {
        //     if (res.forms) {
        //       const formsWithStudent = res.forms.map((form: any) => ({
        //         ...form,
        //         student_id: studentId,
        //         student: (childrenArray || []).find((c: any) => c.student_id === studentId)
        //       }));
        //       allForms.push(...formsWithStudent);
        //     }
        //     loaded++;
        //     if (loaded === this.linkedStudentIds.length) {
        //       this.loadedConsentForms = allForms;
        //       this.generateCalendar(this.linkedEventIds, this.loadedConsentForms);
        //     }
        //   });
        // });
        // });

        this.apiService.getAllUnsignedConsentFormsForParent(parentProfile.parent_id).subscribe(res => {
          if (res.forms) {
            this.loadedConsentForms = res.forms.map((form: any) => ({
              ...form,
              student_id: form.student_id,
              student: {
                first_name: form.first_name,
                last_name: form.last_name,
                student_id: form.student_id
              }
            }));
            this.generateCalendar(this.linkedEventIds, this.loadedConsentForms);
          } else {
            this.loadedConsentForms = [];
            this.generateCalendar(this.linkedEventIds, []);
          }
        });
      });
    }
  }

  dayClicked(day: any) {
    if (!day || !day.inMonth || !day.date) return;

    // Format date as YYYY-MM-DD
    const year = day.date.getFullYear();
    const month = String(day.date.getMonth() + 1).padStart(2, '0');
    const date = String(day.date.getDate()).padStart(2, '0');
    const localDate = `${year}-${month}-${date}`;

    // Pass both events and forms as navigation state
    this.router.navigate(['/day-events', localDate]);
    // , {
    //   state: {
    //     events: day.events || [],
    //     forms: day.forms || []
    //   }
    // }
  }

  refreshData() {
    this.ngOnInit();
  }

  logout() {
    // Your logout logic here
  }

  nextMonth() {
    this.currentMonth++;
    if (this.currentMonth > 11) {
      this.currentMonth = 0;
      this.currentYear++;
    }
    this.generateCalendar(this.linkedEventIds, this.loadedConsentForms);
  }

  previousMonth() {
    this.currentMonth--;
    if (this.currentMonth < 0) {
      this.currentMonth = 11;
      this.currentYear--;
    }
    this.generateCalendar(this.linkedEventIds, this.loadedConsentForms);
  }

  selectDay(day: any) {
    if (!day || !day.inMonth) return;
    this.selectedDay = {
      year: this.currentYear,
      month: this.currentMonth,
      date: day.date
    };
  }

  isToday(day: any): boolean {
    if (!day || !day.inMonth || !day.date) return false;
    const today = new Date();
    return (
      day.date.getDate() === today.getDate() &&
      day.date.getMonth() === today.getMonth() &&
      day.date.getFullYear() === today.getFullYear()
    );
  }

  isSelected(day: any): boolean {
    if (!day || !day.inMonth || !this.selectedDay) return false;
    return (
      day.date === this.selectedDay.date &&
      this.currentMonth === this.selectedDay.month &&
      this.currentYear === this.selectedDay.year
    );
  }

  generateCalendar(linkedEventIds: Set<number>, consentForms: any[]) {
    const firstDay = new Date(this.currentYear, this.currentMonth, 1);
    const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
    const weeks: any[][] = [];
    let week: any[] = [];

    // returns null for days before the first day of the month similar to a real calendar
    for (let i = 0; i < firstDay.getDay(); i++) {
      week.push(null);
    }

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const dayDate = new Date(this.currentYear, this.currentMonth, d);

      // Events for this day
      const dayEvents = this.calendarEvents.filter(ev => {
        const evDate = startOfDay(ev.start);
        return (
          evDate.getFullYear() === dayDate.getFullYear() &&
          evDate.getMonth() === dayDate.getMonth() &&
          evDate.getDate() === dayDate.getDate() &&
          typeof ev.id === 'number' && linkedEventIds.has(ev.id)
        );
      });

      // Consent forms for this day (by deadline)
      // Consent forms is passed as an argument to this function and converted to Date objects
      // returns true if the form's deadline matches the day and false otherwise
      const dayForms = consentForms.filter(form => {
        const deadlineDate = startOfDay(new Date(form.deadline));
        return (
          deadlineDate.getFullYear() === dayDate.getFullYear() &&
          deadlineDate.getMonth() === dayDate.getMonth() &&
          deadlineDate.getDate() === dayDate.getDate()
        );
      });

      // week is a placeholder for the current week being generated
      week.push({ date: dayDate, inMonth: true, events: dayEvents, forms: dayForms });
      if (week.length === 7) {
        weeks.push(week);
        week = [];
      }
    }

    // Fill the last week with nulls if it has less than 7 days
    if (week.length) {
      while (week.length < 7) {
        week.push(null);
      }
      weeks.push(week);
    }

    this.calendarGrid = weeks;
  }

  openEventDetail(event: any) {
    // Try to get studentId from multiple possible locations
    const eventId = event.id ?? event.event_id;
    let studentId = event.student_id ?? event.meta?.student_id;

    // If still missing, try to get from event.student (sometimes used in forms)
    if (!studentId && event.student && event.student.student_id) {
      studentId = event.student.student_id;
    }

    if (eventId && studentId) {
      this.router.navigate(['/event-detail', eventId, studentId]);
    } else {
      // Show a toast or alert for missing info
      alert('Cannot open event details: missing student or event information.');
      // console.warn('Missing eventId or studentId for event detail navigation', event);
    }
  }

  openConsentFormDetail(form: any) {
    const formId = form.form_id;
    // Try to get studentId from multiple possible locations
    let studentId = form.student_id;
    if (!studentId && form.student && form.student.student_id) {
      studentId = form.student.student_id;
    }
    if (!studentId && form.student) {
      studentId = form.student.id ?? form.student.student_id;
    }
    if (formId && studentId) {
      this.router.navigate(['/consent-form-detail', formId, studentId]);
    } else {
      alert('Cannot open consent form details: missing student or form information.');
      console.warn('Missing formId or studentId for consent form detail navigation', form);
    }
  }

  get upcomingEvents(): CalendarEvent[] {
    const now = startOfDay(new Date());
    const maxDaysAhead = 14; // Show events within the next 14 days
    return this.calendarEvents.filter(ev => {
      const evDate = startOfDay(ev.start);
      const daysDiff = (evDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return (
        typeof ev.id === 'number' &&
        this.linkedEventIds.has(ev.id) &&
        daysDiff >= 0 && daysDiff <= maxDaysAhead
      );
    }).sort((a, b) => a.start.getTime() - b.start.getTime());
  }

  get upcomingConsentForms(): any[] {
    const now = startOfDay(new Date());
    const maxDaysAhead = 14; // Show forms within the next 14 days
    return this.loadedConsentForms.filter(form => {
      if (!form.deadline) return false;
      const deadlineDate = startOfDay(new Date(form.deadline));
      const daysDiff = (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff >= 0 && daysDiff <= maxDaysAhead;
    }).sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
  }

  doRefresh(event: any) {
    // Reload your data here (call ngOnInit or your data-loading logic)
    this.ngOnInit();

    // Complete the refresher after data is loaded
    setTimeout(() => {
      event.target.complete();
    }, 1000); // Adjust timeout as needed or call complete after data is actually loaded
  }
}

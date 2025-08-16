import { Component, OnInit } from '@angular/core';

import { ActivatedRoute, Router } from '@angular/router';

import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-day-events',
  templateUrl: './day-events.page.html',
  styleUrls: ['./day-events.page.scss'],
  standalone: false,
})
export class DayEventsPage implements OnInit {
  date: string = '';
  events: any[] = [];
  forms: any[] = [];
  parentProfile: any;

  // Week navigation state
  currentWeekStart!: Date;
  weekDays: string[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: ApiService
  ) { }

  ngOnInit() {
    this.date = this.route.snapshot.paramMap.get('date')!;
    this.parentProfile = this.apiService.getCurrentProfile();

    // Set currentWeekStart to the Sunday of the selected date's week
    const selectedDate = new Date(this.date);
    this.currentWeekStart = new Date(selectedDate);
    this.currentWeekStart.setDate(selectedDate.getDate() - selectedDate.getDay());
    this.weekDays = this.getWeekDays(this.currentWeekStart);

    this.loadEventsForDate(this.date);
    this.loadConsentFormsForDate(this.date);
  }

  getWeekDays(startDate: Date): string[] {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      return d.toISOString().slice(0, 10);
    });
  }

  onWeekDayClick(date: string) {
    this.date = date;
    this.loadEventsForDate(date);
    this.loadConsentFormsForDate(date);
  }

  nextWeek() {
    this.currentWeekStart.setDate(this.currentWeekStart.getDate() + 7);
    this.weekDays = this.getWeekDays(this.currentWeekStart);
    // Set date to first day of new week
    this.date = this.weekDays[0];
    this.loadEventsForDate(this.date);
    this.loadConsentFormsForDate(this.date);
  }

  previousWeek() {
    this.currentWeekStart.setDate(this.currentWeekStart.getDate() - 7);
    this.weekDays = this.getWeekDays(this.currentWeekStart);
    // Set date to first day of new week
    this.date = this.weekDays[0];
    this.loadEventsForDate(this.date);
    this.loadConsentFormsForDate(this.date);
  }

  // When user clicks back, go to calendar page with the month of the last week visited
  goBackToCalendar() {
    // Get the last day (Saturday) of the current week
    const lastDayOfWeek = new Date(this.currentWeekStart);
    lastDayOfWeek.setDate(this.currentWeekStart.getDate() + 6);
    const month = lastDayOfWeek.getMonth();
    const year = lastDayOfWeek.getFullYear();

    // console.log('Navigating back to calendar with:', { month, year, lastDayOfWeek });
    this.router.navigate(['/calendar'], {
      state: {
        month,
        year
      }
    });
  }

  loadEventsForDate(date: string) {
    this.events = [];
    if (this.parentProfile) {
      this.apiService.getParentEvents(this.parentProfile.parent_id, date)
        .subscribe(res => {
          this.events = res.events || [];
        });
    }
  }

  // loadConsentFormsForDate(date: string) {
  //   this.forms = [];
  //   if (this.parentProfile) {
  //     this.apiService.getParentChildren(this.parentProfile.parent_id).subscribe(childrenRes => {
  //       const childrenArray = childrenRes.children || [];
  //       const studentIds = childrenArray.map((child: any) => child.student_id);
  //       let allForms: any[] = [];
  //       let loaded = 0;
  //       if (studentIds.length === 0) {
  //         this.forms = [];
  //         return;
  //       }
  //       studentIds.forEach((studentId: any) => {
  //         this.apiService.getUnsignedConsentFormsForStudent(studentId).subscribe(res => {
  //           if (res.forms) {
  //             const dayForms = res.forms.filter((form: any) => {
  //               const deadlineStr = form.deadline?.slice(0, 10);
  //               return deadlineStr === date;
  //             });
  //             dayForms.forEach((form: any) => {
  //               if (!form.student) {
  //                 const studentObj = childrenArray.find((c: any) => c.student_id === studentId);
  //                 if (studentObj) form.student = studentObj;
  //               }
  //             });
  //             allForms.push(...dayForms);
  //           }
  //           loaded++;
  //           if (loaded === studentIds.length) {
  //             this.forms = allForms;
  //           }
  //         });
  //       });
  //     });
  //   }
  // }

  loadConsentFormsForDate(date: string) {
  this.forms = [];
  if (this.parentProfile) {
    this.apiService.getAllUnsignedConsentFormsForParent(this.parentProfile.parent_id, date)
      .subscribe(res => {
        this.forms = res.forms || [];
      });
  }
}

  openEventDetail(event: any) {
    this.router.navigate(['/event-detail', event.id ?? event.event_id, event.student_id]);
  }

  openConsentFormDetail(form: any) {
    this.router.navigate(['/consent-form-detail', form.form_id, form.student_id ?? form.student?.student_id]);
  }

  doRefresh(event: any) {
    // Reload your data here (e.g., call loadEventsForDate and loadConsentFormsForDate)
    this.loadEventsForDate(this.date);
    this.loadConsentFormsForDate(this.date);

    // Complete the refresher after data is loaded
    setTimeout(() => {
      event.target.complete();
    }, 1000); // Adjust timeout as needed or call complete after data is actually loaded
  }
}

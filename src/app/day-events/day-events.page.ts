import { Component, OnInit, AfterViewInit, ViewChild, ChangeDetectorRef } from '@angular/core';
import { FullCalendarComponent } from '@fullcalendar/angular';

import { ActivatedRoute, Router } from '@angular/router';

import { ApiService } from '../services/api.service';

import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { CalendarOptions } from '@fullcalendar/core';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-day-events',
  templateUrl: './day-events.page.html',
  styleUrls: ['./day-events.page.scss'],
  standalone: false,
})
export class DayEventsPage implements OnInit, AfterViewInit {
  date: string = '';
  selectedDay: Date = new Date(); // Track the selected day
  events: any[] = [];
  forms: any[] = [];
  filteredEvents: any[] = []; // Filtered events for the selected day
  filteredForms: any[] = []; // Filtered forms for the selected day
  parentProfile: any;
  isUserClick: boolean = false; // Flag to distinguish user clicks from navigation
  // Week navigation state
  currentWeekStart!: Date;
  weekDays: string[] = [];
  @ViewChild('fc') fc!: FullCalendarComponent;

  calendarOptions: CalendarOptions = {
    initialView: 'timeGridWeek', // Week view
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
    headerToolbar: {
      left: 'prev',
      center: 'title',
      right: 'next',
    },
    events: [], // Events will be dynamically loaded
    editable: false, // Disable drag-and-drop for this page
    dateClick: this.handleDateClick.bind(this), // Handle date clicks
    eventClick: this.handleEventClick.bind(this), // Handle event clicks
    datesSet: this.handleDatesSet.bind(this), // Add this to detect view changes
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: ApiService,
    private cdr: ChangeDetectorRef // Inject ChangeDetectorRef
  ) { }

  isLoadingWeek: boolean = false; // Flag to prevent multiple loads

  handleDatesSet(info: any) {
    const newWeekStart = new Date(info.start);
    if (this.currentWeekStart && newWeekStart.getTime() !== this.currentWeekStart.getTime() && !this.isLoadingWeek) {
      this.currentWeekStart = newWeekStart;
      if (!this.isUserClick) { // Only set selectedDay if not a user click
        this.selectedDay = new Date(newWeekStart);
        this.cdr.detectChanges(); // Force view update
      }
      this.loadEventsAndConsentFormsForWeek(newWeekStart.toISOString().slice(0, 10));
    }
  }

  ngOnInit() {
    this.date = this.route.snapshot.paramMap.get('date')!;
    this.selectedDay = new Date(this.date); // Initially select the passed date
    this.parentProfile = this.apiService.getCurrentProfile();

    // Set currentWeekStart to the Sunday of the selected date's week
    // const selectedDate = new Date(this.date);
    // this.currentWeekStart = new Date(selectedDate);
    // this.currentWeekStart.setDate(selectedDate.getDate() - selectedDate.getDay());
    // this.weekDays = this.getWeekDays(this.currentWeekStart);

    // this.loadEventsForDate(this.date);
    // this.loadConsentFormsForDate(this.date);
    this.calendarOptions.events = this.fetchEvents.bind(this);
    this.calendarOptions.initialDate = this.date;
    // this.loadEventsAndConsentFormsForWeek(this.date);
  }

  fetchEvents(fetchInfo: any, successCallback: any, failureCallback: any) {
    if (!this.parentProfile) {
      successCallback([]);
      return;
    }
    console.log('handleDateClick called wiafafasdfath dateStr:', fetchInfo.start); // Debug log

    // fetch both API endpoints in parallel
    forkJoin({
      eventsRes: this.apiService.getParentEvents(this.parentProfile.parent_id),
      formsRes: this.apiService.getAllUnsignedConsentFormsForParent(this.parentProfile.parent_id)
    }).subscribe({
      next: ({ eventsRes, formsRes }) => {
        const start = new Date(fetchInfo.start);
        const end = new Date(fetchInfo.end);

        const events = (eventsRes.events || []).filter((ev: any) => {
          const d = new Date(ev.date);
          return d >= start && d < end;
        }).map((ev: any) => {
          let startDate: Date | string;
          if (ev.time && /^\d{2}:\d{2}:\d{2}$/.test(ev.time)) {
            // Combine date and time: "YYYY-MM-DDTHH:mm:ss"
            startDate = new Date(`${ev.date}T${ev.time}`);
          } else if (/^\d{4}-\d{2}-\d{2}$/.test(ev.date)) {
            // date-only, treat as all-day
            startDate = ev.date;
          } else {
            // fallback: parse as Date
            startDate = new Date(ev.date);
          }
          return {
            title: ev.title,
            start: startDate,
            extendedProps: { type: 'event', description: ev.description, student: { first_name: ev.first_name, last_name: ev.last_name }, raw: ev }
          }
        });

        const forms = (formsRes.forms || []).filter((f: any) => {
          const d = new Date(f.deadline);
          return d >= start && d < end;
        }).map((f: any) => ({
          title: 'Consent Form: ' + f.title,
          start: new Date(f.deadline),
          allDay: true,
          extendedProps: { type: 'consentForm', student: { first_name: f.first_name, last_name: f.last_name }, raw: f }
        }));

        const combined = [...events, ...forms];

        // keep local copies used by the lists below the calendar
        this.events = eventsRes.events || [];
        this.forms = formsRes.forms || [];

        // update filtered lists for currently selected day
        // this.filterEventsAndForms(this.selectedDay);

        // give events to FullCalendar
        successCallback(combined);
      },
      error: err => {
        console.error('fetchEvents error', err);
        failureCallback(err);
      }
    });
  }

  ngAfterViewInit() {
    // ensure calendar shows the clicked date's week
    const selectedDate = this.date ? new Date(this.date) : new Date();
    // small timeout to ensure FullCalendar instance is ready
    setTimeout(() => {
      if (this.fc && this.fc.getApi) {
        this.fc.getApi().gotoDate(selectedDate);
        this.fc.getApi().changeView('timeGridWeek');
      }
    }, 0);
  }

  loadEventsAndConsentFormsForWeek(date: any) {
    if (this.isLoadingWeek) return; // Prevent multiple loads
    this.isLoadingWeek = true;
    const selectedDate = new Date(date);
    const weekStart = new Date(selectedDate);
    weekStart.setDate(selectedDate.getDate() - selectedDate.getDay()); // Start of the week (Sunday)

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6); // End of the week (Saturday)

    //   if (weekStart.getMonth() !== selectedDate.getMonth()) {
    //   weekStart.setMonth(selectedDate.getMonth());
    //   weekStart.setDate(1); // Set to the first day of the clicked month
    // }

    // if (weekEnd.getMonth() !== selectedDate.getMonth()) {
    //   weekEnd.setMonth(selectedDate.getMonth());
    //   weekEnd.setDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate()); // Last day of the clicked month
    // }

    this.currentWeekStart = new Date(weekStart);

    if (this.parentProfile) {
      // Fetch events for the week
      this.apiService.getParentEvents(this.parentProfile.parent_id).subscribe((res) => {
        this.events = res.events || [];
        const events = (res.events || []).filter((event: any) => {
          const eventDate = new Date(event.date);
          return eventDate >= weekStart && eventDate <= weekEnd;
        }).map((event: any) => ({
          title: event.title,
          start: new Date(event.date),
          extendedProps: {
            type: 'event',
            description: event.description,
            student: {
              first_name: event.first_name,
              last_name: event.last_name,
            },
          },
        }));

        // Fetch consent forms for the week
        this.apiService.getAllUnsignedConsentFormsForParent(this.parentProfile.parent_id).subscribe((res) => {
          this.forms = res.forms || [];
          this.filterEventsAndForms(this.selectedDay); // Filter for the selected day
          const consentForms = (res.forms || []).filter((form: any) => {
            const formDeadline = new Date(form.deadline);
            return formDeadline >= weekStart && formDeadline <= weekEnd;
          }).map((form: any) => ({
            title: 'Consent Form: ' + form.title,
            start: new Date(form.deadline),
            extendedProps: {
              type: 'consentForm',
              student: {
                first_name: form.first_name,
                last_name: form.last_name,
              },
            },
          }));

          // Combine events and consent forms
          // this.calendarOptions.events = [...events, ...consentForms];
          // if (this.fc && this.fc.getApi) {
          //   this.fc.getApi().gotoDate(selectedDate);
          //   this.fc.getApi().changeView('timeGridWeek');
          // }
          if (this.fc && this.fc.getApi) {
            // this.fc.getApi().gotoDate(new Date(date));
            this.fc.getApi().refetchEvents();
          }
          const combined = [...events, ...consentForms];
          // if (this.fc && this.fc.getApi) {
          //   const api = this.fc.getApi();
          //    // remove existing rendered events then add this week's events (keeps function eventSource intact)
          //     api.removeAllEvents();
          //   combined.forEach(ev => api.addEvent(ev));
          // }
          // this.filterEventsAndForms(this.selectedDay);
          this.isLoadingWeek = false;
          // if (this.fc && this.fc.getApi) {
          //   this.fc.getApi().gotoDate(new Date(this.selectedDay));
          // }
        });
      });
    }
  }

  handleDateClick(info: any) {
    console.log('handleDateClick called with dateStr:', info.dateStr); // Debug log
    const clickedDate = new Date(info.dateStr);
    const currentWeekStart = new Date(this.currentWeekStart);

    // Check if the clicked date is in the same week
    const isSameWeek = clickedDate >= currentWeekStart && clickedDate < new Date(currentWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

    this.isUserClick = true; // Set flag for user click
    this.selectedDay = clickedDate; // Update selected day
    console.log('selectedDay set to:', this.selectedDay); // Debug log
    this.cdr.detectChanges(); // Force view update

    if (!isSameWeek) {
      // If it's a different week, reload the data
      this.loadEventsAndConsentFormsForWeek(info.dateStr);
    } else {
      // If it's the same week, just filter the existing data

      this.filterEventsAndForms(info.dateStr);
    }

    // Navigate the calendar to the selected date
    // if (this.fc && this.fc.getApi) {
    //   this.fc.getApi().gotoDate(clickedDate);
    // }

    setTimeout(() => this.isUserClick = false, 100);
  }

  filterEventsAndForms(date: any) {
    const selectedDate = new Date(date);

    const selectedYear = selectedDate.getFullYear();
    const selectedMonth = selectedDate.getMonth();
    const selectedDayNum = selectedDate.getDate();

    this.filteredEvents = this.events.filter((event: any) => {
      const eventDate = new Date(event.date);
      const eventYear = eventDate.getFullYear();
      const eventMonth = eventDate.getMonth();
      const eventDay = eventDate.getDate();
      return eventYear === selectedYear && eventMonth === selectedMonth && eventDay === selectedDayNum;
    });

    this.filteredForms = this.forms.filter((form: any) => {
      const formDate = new Date(form.deadline);
      const formYear = formDate.getFullYear();
      const formMonth = formDate.getMonth();
      const formDay = formDate.getDate();
      return formYear === selectedYear && formMonth === selectedMonth && formDay === selectedDayNum;
    });

    console.log('Filtered Events for', selectedDate.toDateString(), ':', this.filteredEvents.length);
    console.log('Filtered Forms for', selectedDate.toDateString(), ':', this.filteredForms.length);
  }

  handleEventClick(info: any) {
    const { type } = info.event.extendedProps;
    if (type === 'event') {
      this.openEventDetail(info.event.extendedProps);
    } else if (type === 'consentForm') {
      this.openConsentFormDetail(info.event.extendedProps);
    }
  }

  getWeekDays(startDate: Date): string[] {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      return d.toISOString().slice(0, 10);
    });
  }

  // onWeekDayClick(date: string) {
  //   this.date = date;
  //   this.loadEventsForDate(date);
  //   this.loadConsentFormsForDate(date);
  // }

  // nextWeek() {
  //   this.currentWeekStart.setDate(this.currentWeekStart.getDate() + 7);
  //   this.weekDays = this.getWeekDays(this.currentWeekStart);
  //   // Set date to first day of new week
  //   this.date = this.weekDays[0];
  //   this.loadEventsForDate(this.date);
  //   this.loadConsentFormsForDate(this.date);
  // }

  // previousWeek() {
  //   this.currentWeekStart.setDate(this.currentWeekStart.getDate() - 7);
  //   this.weekDays = this.getWeekDays(this.currentWeekStart);
  //   // Set date to first day of new week
  //   this.date = this.weekDays[0];
  //   this.loadEventsForDate(this.date);
  //   this.loadConsentFormsForDate(this.date);
  // }

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

  // loadEventsForDate(date: string) {
  //   this.events = [];
  //   if (this.parentProfile) {
  //     this.apiService.getParentEvents(this.parentProfile.parent_id, date)
  //       .subscribe(res => {
  //         this.events = res.events || [];
  //       });
  //   }
  // }

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

  //   loadConsentFormsForDate(date: string) {
  //   this.forms = [];
  //   if (this.parentProfile) {
  //     this.apiService.getAllUnsignedConsentFormsForParent(this.parentProfile.parent_id, date)
  //       .subscribe(res => {
  //         this.forms = res.forms || [];
  //       });
  //   }
  // }

  openEventDetail(event: any) {
    this.router.navigate(['/event-detail', event.id ?? event.event_id, event.student_id]);
  }

  openConsentFormDetail(form: any) {
    this.router.navigate(['/consent-form-detail', form.form_id, form.student_id ?? form.student?.student_id]);
  }

  doRefresh(event: any) {
    // Reload your data here (e.g., call loadEventsForDate and loadConsentFormsForDate)
    // this.loadEventsForDate(this.date);
    // this.loadConsentFormsForDate(this.date);

    // Complete the refresher after data is loaded
    setTimeout(() => {
      event.target.complete();
    }, 1000); // Adjust timeout as needed or call complete after data is actually loaded
  }
}

import { Component, OnInit, AfterViewInit, ViewChild, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { CalendarOptions } from '@fullcalendar/core';
import { FullCalendarComponent } from '@fullcalendar/angular';
import { forkJoin } from 'rxjs';
import { AlertController } from '@ionic/angular';

import { Storage } from '@ionic/storage-angular';

import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-day-events',
  templateUrl: './day-events.page.html',
  styleUrls: ['./day-events.page.scss'],
  standalone: false,
})
export class DayEventsPage implements OnInit, AfterViewInit {
  date: string = '';
  selectedDay: Date = new Date();
  events: any[] = [];
  forms: any[] = [];
  announcements: any[] = [];
  filteredEvents: any[] = [];
  filteredForms: any[] = [];
  filteredAnnouncements: any[] = [];
  parentProfile: any;
  isUserClick: boolean = false;
  initialLoadComplete = false;
  currentWeekStart!: Date;
  weekDays: string[] = [];
  @ViewChild('fc') fc!: FullCalendarComponent;
  private _storage: Storage | null = null;

  calendarOptions: CalendarOptions = {
    initialView: 'timeGridWeek', // Week view
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
    headerToolbar: {
      left: 'prev',
      center: 'title',
      right: 'next',
    },
    defaultTimedEventDuration: '00:10:00',
    slotDuration: '00:30:00',
    slotLabelInterval: '01:00:00',
    navLinks: true,
    navLinkDayClick: this.handleHeaderDateClick.bind(this),
    events: [],
    editable: false,
    dateClick: this.handleDateClick.bind(this), // Handle date clicks
    eventClick: this.handleEventClick.bind(this), // Handle event clicks
    datesSet: this.handleDatesSet.bind(this), // to detect view changes
  };
  expandedAccordions: string | string[] = ['events', 'forms', 'announcements'];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: ApiService,
    private cdr: ChangeDetectorRef,
    private alertController: AlertController,
    private storage: Storage
  ) { }

  handleHeaderDateClick(date: Date, jsEvent: any) {
    this.handleDateClick({ dateStr: date.toISOString() });
  }

  isLoadingWeek: boolean = false; // Flag to prevent multiple loads

  handleDatesSet(info: any) {
    const newWeekStart = new Date(info.start);
    if (this.currentWeekStart && newWeekStart.getTime() !== this.currentWeekStart.getTime() && !this.isLoadingWeek) {
      this.currentWeekStart = newWeekStart;

      if (this.initialLoadComplete && !this.isUserClick) {
        const weekEnd = new Date(newWeekStart);
        weekEnd.setDate(newWeekStart.getDate() + 7);

        if (this.selectedDay < newWeekStart || this.selectedDay >= weekEnd) {
          this.selectedDay = new Date(newWeekStart);
        }
        this.cdr.detectChanges();
      }

      this.loadEventsAndConsentFormsForWeek(newWeekStart.toISOString().slice(0, 10));
    }
  }

  async ngOnInit() {
    this.date = this.route.snapshot.paramMap.get('date')!;
    const [year, month, day] = this.date.split('-').map(Number);
    this.selectedDay = new Date(year, month - 1, day);
    this._storage = await this.storage.create();
    this.parentProfile = this.apiService.getCurrentProfile();

    this.calendarOptions.events = this.fetchEvents.bind(this);
    this.calendarOptions.initialDate = this.date;

    const weekStart = new Date(this.selectedDay);
    weekStart.setDate(this.selectedDay.getDate() - this.selectedDay.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    this.currentWeekStart = weekStart;

    await this.loadCachedWeekData(weekStart, weekEnd);

    this.fetchFreshWeekData(weekStart, weekEnd).then(() => {
      this.filterEventsAndForms(this.selectedDay);
      this.cdr.detectChanges();

      const api = this.fc?.getApi?.();
      if (api) {
        api.refetchEvents();
      }
    });
  }

  fetchEvents(fetchInfo: any, successCallback: any, failureCallback: any) {
    if (!this.parentProfile) {
      successCallback([]);
      return;
    }
    console.log('handleDateClick called wiafafasdfath dateStr:', fetchInfo.start); // Debug log

    const start = new Date(fetchInfo.start);
    const end = new Date(fetchInfo.end);
    this.loadCachedEventsAndForms(start, end, successCallback, failureCallback);


  }

  private async loadCachedWeekData(start: Date, end: Date): Promise<boolean> {
    try {
      const [cachedEvents, cachedForms, cachedAnnouncements] = await Promise.all([
        this._storage?.get('dayEventsCache'),
        this._storage?.get('dayFormsCache'),
        this._storage?.get('dayAnnouncementsCache'),
      ]);

      if (cachedEvents || cachedForms || cachedAnnouncements) {
        this.events = cachedEvents || [];
        this.forms = cachedForms || [];
        this.announcements = cachedAnnouncements || [];
        this.filterEventsAndForms(this.selectedDay);
        return true;
      }
    } catch (err) {
      console.error('loadCachedWeekData error', err);
    }
    return false;
  }

  private fetchFreshWeekData(start: Date, end: Date) {
    // Parallelize both API calls
    return Promise.all([
      new Promise((resolve) => {
        this.apiService.getParentEvents(this.parentProfile.parent_id).subscribe(
          (res) => resolve(res),
          (err) => {
            console.error('Error fetching events:', err);
            resolve(null);
          }
        );
      }),
      new Promise((resolve) => {
        this.apiService
          .getAllUnsignedConsentFormsForParent(this.parentProfile.parent_id)
          .subscribe(
            (res) => resolve(res),
            (err) => {
              console.error('Error fetching forms:', err);
              resolve(null);
            }
          );
      }),
      new Promise((resolve) => {
        this.apiService.getParentAnnouncements(this.parentProfile.parent_id).subscribe(
          (res) => resolve(res),
          (err) => { console.error('Error fetching announcements:', err); resolve(null); }
        );
      }),
    ]).then(([eventsRes, formsRes, announcementsRes]: any) => {
      const freshEvents = eventsRes?.events || [];
      const freshForms = formsRes?.forms || [];
      const freshAnnouncements = announcementsRes?.announcements || [];

      // Cache the fresh data
      this._storage?.set('dayEventsCache', freshEvents);
      this._storage?.set('dayFormsCache', freshForms);
      this._storage?.set('dayAnnouncementsCache', freshAnnouncements);

      // // Format and update
      // const combined = this.formatEventsAndForms(
      //   freshEvents,
      //   freshForms,
      //   freshAnnouncements,
      //   start,
      //   end
      // );

      this.events = freshEvents;
      this.forms = freshForms;
      this.announcements = freshAnnouncements;

      // // Refetch calendar with fresh data
      // if (this.fc?.getApi?.()) {
      //   this.fc.getApi().refetchEvents();
      // }

      // Update change detection
      this.cdr.markForCheck();
      return this.formatEventsAndForms(
        freshEvents,
        freshForms,
        freshAnnouncements,
        start,
        end
      );
    });
  }

  private formatEventsAndForms(
    events: any[],
    forms: any[],
    announcements: any[],
    start: Date,
    end: Date
  ): any[] {
    const formattedEvents = (events || [])
      .filter((ev: any) => {
        const d = new Date(ev.start_date);
        return d >= start && d < end;
      })
      .map((ev: any) => {
        let startDate: Date | string;
        if (ev.start_time && /^\d{2}:\d{2}:\d{2}$/.test(ev.start_time)) {
          startDate = new Date(`${ev.start_date}T${ev.start_time}`);
        } else if (/^\d{4}-\d{2}-\d{2}$/.test(ev.start_date)) {
          startDate = ev.start_date;
        } else {
          startDate = new Date(ev.start_date);
        }
        return {
          title: '📅 ' + ev.title,
          start: startDate,
          className: 'event-class',
          extendedProps: {
            type: 'event',
            description: ev.description,
            student: {
              first_name: ev.student_first_name,
              last_name: ev.student_last_name,
            },
            raw: ev,
          },
        };
      });

    const formattedForms = (forms || [])
      .filter((f: any) => {
        const d = new Date(f.deadline);
        return d >= start && d < end;
      })
      .map((f: any) => ({
        title: '📋 ' + f.title,
        start: new Date(f.deadline),
        allDay: true,
        className: 'consent-form-class',
        extendedProps: {
          type: 'consentForm',
          student: {
            first_name: f.student_first_name,
            last_name: f.student_last_name,
          },
          raw: f,
        },
      }));

    const formattedAnnouncements = (announcements || [])
      .filter((ann: any) => {
        const d = new Date(ann.created_at);
        return d >= start && d < end;
      })
      .map((ann: any) => ({
        title: '📢 ' + ann.title,
        start: new Date(ann.created_at),
        allDay: true,
        className: 'announcement-class',
        extendedProps: {
          type: 'announcement',
          description: ann.content || ann.message,
          student: {
            first_name: ann.student_first_name,
            last_name: ann.student_last_name,
          },
          raw: ann,
        },
      }));
    return [...formattedEvents, ...formattedForms, ...formattedAnnouncements];
  }

  private async loadCachedEventsAndForms(
    start: Date,
    end: Date,
    successCallback: any,
    failureCallback: any
  ) {
    try {
      const [cachedEvents, cachedForms, cachedAnnouncements] = await Promise.all([
        this._storage?.get('dayEventsCache'),
        this._storage?.get('dayFormsCache'),
        this._storage?.get('dayAnnouncementsCache'),
      ]);

      if (cachedEvents || cachedForms || cachedAnnouncements) {
        const combined = this.formatEventsAndForms(
          cachedEvents || [],
          cachedForms || [],
          cachedAnnouncements || [],
          start,
          end
        );
        this.events = cachedEvents || [];
        this.forms = cachedForms || [];
        this.announcements = cachedAnnouncements || [];
        successCallback(combined);
      } else {
        successCallback([]);
      }
    } catch (error) {
      console.error('Error loading cached events:', error);
      successCallback([]);
    }
  }

  ngAfterViewInit() {
    // ensure calendar shows the clicked date's week
    // const selectedDate = this.selectedDay || new Date();
    const selectedDateObj = this.selectedDay;
    const weekStart = new Date(selectedDateObj);
    weekStart.setDate(selectedDateObj.getDate() - selectedDateObj.getDay()); // Sunday of that week
    this.currentWeekStart = weekStart;

    const pad = (n: number) => String(n).padStart(2, '0');
    const dateStr = `${this.selectedDay.getFullYear()}-${pad(this.selectedDay.getMonth() + 1)}-${pad(this.selectedDay.getDate())}`;
    // console.log('🟢 ngAfterViewInit - selectedDay:', this.selectedDay);
    // console.log('🟢 gotoDate will be called with:', dateStr);

    // small timeout to ensure FullCalendar instance is ready
    setTimeout(() => {
      if (this.fc && this.fc.getApi) {
        // console.log('🟢 Calling gotoDate with:', dateStr);
        this.fc.getApi().gotoDate(dateStr);
        this.fc.getApi().changeView('timeGridWeek');
        // console.log('🟢 gotoDate call completed.');
      } else {
        console.error('❌ Calendar API not ready in time!');
      }
      this.initialLoadComplete = true;
    }, 100);
  }

  async loadEventsAndConsentFormsForWeek(date: any) {
    if (this.isLoadingWeek) return; // Prevent multiple loads
    this.isLoadingWeek = true;
    const [year, month, day] = date.split('-').map(Number);
    const selectedDate = new Date(year, month - 1, day);
    const weekStart = new Date(selectedDate);
    weekStart.setDate(selectedDate.getDate() - selectedDate.getDay()); // Start of the week (Sunday)

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6); // End of the week (Saturday)

    this.currentWeekStart = new Date(weekStart);

    if (!this.parentProfile) {
      this.isLoadingWeek = false;
      return;
    }

    await this.fetchFreshWeekData(weekStart, weekEnd);

    const combinedEvents = this.formatEventsAndForms(
      this.events,
      this.forms,
      this.announcements,
      weekStart,
      weekEnd
    );

    this.filterEventsAndForms(this.selectedDay);
    this.isLoadingWeek = false;

  }

  handleDateClick(info: any) {
    console.log('handleDateClick called with dateStr:', info.dateStr); // Debug log
    const clickedDate = new Date(info.dateStr);
    const currentWeekStart = new Date(this.currentWeekStart);

    // Check if the clicked date is in the same week
    // the multiply is the number of miliseconds in 7 days
    const isSameWeek = clickedDate >= currentWeekStart && clickedDate < new Date(currentWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

    this.isUserClick = true; // Set flag for user click
    this.selectedDay = clickedDate; // Update selected day
    // console.log('selectedDay set to:', this.selectedDay); // Debug log
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
      const eventDate = new Date(event.start_date);
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

    this.filteredAnnouncements = this.announcements.filter((ann: any) => {
      const annDate = new Date(ann.created_at);
      return annDate.getFullYear() === selectedYear &&
        annDate.getMonth() === selectedMonth &&
        annDate.getDate() === selectedDayNum;
    });

    console.log('Filtered Events for', selectedDate.toDateString(), ':', this.filteredEvents.length);
    console.log('Filtered Forms for', selectedDate.toDateString(), ':', this.filteredForms.length);
    console.log('Filtered Announcements for', selectedDate.toDateString(), ':', this.filteredAnnouncements.length);
  }

  async handleEventClick(info: any) {
    const type = info.event.extendedProps?.type;
    const title = info.event.title ?? 'item';
    const student = info.event.extendedProps?.student;

    const firstName = student?.first_name?.trim() || '';
    const lastName = student?.last_name?.trim() || '';
    const studentName = (firstName || lastName) ? `${firstName} ${lastName}`.trim() : 'Unknown';
    const header = type === 'consentForm' ? 'Consent Form' : type === 'announcement' ? 'Announcement' : 'Event';
    const message = `${title}\n(${studentName})`;
    const alert = await this.alertController.create({
      header,
      cssClass: 'custom-alert',
      message,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Details',
          handler: () => {
            if (type === 'consentForm') {
              this.openConsentFormDetail(info.event.extendedProps);
            } else if (type === 'announcement') {
              this.openAnnouncementDetail(info.event.extendedProps);
            } else {
              this.openEventDetail(info.event.extendedProps);
            }
          }
        }
      ]
    });

    await alert.present();
  }

  openAnnouncementDetail(announcement: any) {
    const announcementId =
      announcement.announcement_id ??
      announcement.id ??
      announcement.raw?.announcement_id ??
      announcement.raw?.id;
    const studentId =
      announcement.student_id ??
      announcement.raw?.student_id ??
      announcement.extendedProps?.student?.student_id;

    if (announcementId && studentId) {
      this.router.navigate(['/announcement-detail', announcementId, studentId]);
    } else {
      console.warn('Missing announcement or student id', announcement);
    }
  }

  getWeekDays(startDate: Date): string[] {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      return d.toISOString().slice(0, 10);
    });
  }

  // When user clicks back, go to calendar page with the month of the last week visited
  goBackToCalendar() {
    // Get the last day (Saturday) of the current week
    const weekStart = this.currentWeekStart || this.selectedDay || new Date();

    const lastDayOfWeek = new Date(weekStart);
    lastDayOfWeek.setDate(weekStart.getDate() + 6);
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

  openEventDetail(event: any) {
    const eventId =
      event.id ??
      event.event_id ??
      event.raw?.event_id ??
      event.raw?.id ??
      event.extendedProps?.raw?.id;

    const studentId =
      event.student_id ??
      event.raw?.student_id ??
      event.meta?.student_id ??
      event.extendedProps?.student?.student_id;

    if (eventId && studentId) {
      this.router.navigate(['/event-detail', eventId, studentId]);
    } else {
      alert('Cannot open event details: missing student or event information.');
    }
  }

  openConsentFormDetail(form: any) {
    const formId =
      form.form_id ??
      form.id ??
      form.raw?.form_id;

    const studentId =
      form.student_id ??
      form.raw?.student_id ??
      form.student?.student_id;

    if (formId && studentId) {
      this.router.navigate(['/consent-form-detail', formId, studentId]);
    } else {
      alert('Cannot open consent form details: missing student or form information.');
    }
  }

  async doRefresh(event: any) {
    // this.loadEventsForDate(this.date);
    // this.loadConsentFormsForDate(this.date);

    // Complete the refresher after data is loaded
    await this._storage?.remove('dayEventsCache');
    await this._storage?.remove('dayFormsCache');

    if (this.fc && this.fc.getApi) {
      this.fc.getApi().refetchEvents();
    }
    setTimeout(() => {
      event.target.complete();
    }, 1000); // Adjust timeout as needed or call complete after data is actually loaded
  }
}


// Trash code
// if (this.parentProfile) {
//   // Fetch events for the week
//   this.apiService.getParentEvents(this.parentProfile.parent_id).subscribe((res) => {
//     this.events = res.events || [];
//     const events = (res.events || []).filter((event: any) => {
//       const eventDate = new Date(event.date);
//       return eventDate >= weekStart && eventDate <= weekEnd;
//     }).map((event: any) => ({
//       title: event.title,
//       start: new Date(event.date),
//       extendedProps: {
//         type: 'event',
//         description: event.description,
//         student: {
//           first_name: event.first_name,
//           last_name: event.last_name,
//         },
//       },
//     }));

//     // Fetch consent forms for the week
//     this.apiService.getAllUnsignedConsentFormsForParent(this.parentProfile.parent_id).subscribe((res) => {
//       this.forms = res.forms || [];
//       this.filterEventsAndForms(this.selectedDay); // Filter for the selected day
//       const consentForms = (res.forms || []).filter((form: any) => {
//         const formDeadline = new Date(form.deadline);
//         return formDeadline >= weekStart && formDeadline <= weekEnd;
//       }).map((form: any) => ({
//         title: 'Consent Form: ' + form.title,
//         start: new Date(form.deadline),
//         extendedProps: {
//           type: 'consentForm',
//           student: {
//             first_name: form.first_name,
//             last_name: form.last_name,
//           },
//         },
//       }));

//       // Combine events and consent forms
//       // this.calendarOptions.events = [...events, ...consentForms];
//       // if (this.fc && this.fc.getApi) {
//       //   this.fc.getApi().gotoDate(selectedDate);
//       //   this.fc.getApi().changeView('timeGridWeek');
//       // }
//       if (this.fc?.getApi) {
//         // this.fc.getApi().gotoDate(new Date(date));
//         this.fc.getApi().refetchEvents();
//       }
//       const combined = [...events, ...consentForms];
//       // if (this.fc && this.fc.getApi) {
//       //   const api = this.fc.getApi();
//       //    // remove existing rendered events then add this week's events (keeps function eventSource intact)
//       //     api.removeAllEvents();
//       //   combined.forEach(ev => api.addEvent(ev));
//       // }
//       // this.filterEventsAndForms(this.selectedDay);
//       this.isLoadingWeek = false;
//       // if (this.fc && this.fc.getApi) {
//       //   this.fc.getApi().gotoDate(new Date(this.selectedDay));
//       // }
//     });
//   });
// }

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

// Update the calendar options with the actual event list
// this.calendarOptions = {
//   ...this.calendarOptions,
//   events: combinedEvents,
// };

// if (this.fc?.getApi?.()) {
//   this.fc.getApi().refetchEvents();
// }

// STEP 2: Fetch fresh data in background
// this.fetchFreshWeekData(start, end);
// fetch both API endpoints in parallel
// forkJoin({
//   eventsRes: this.apiService.getParentEvents(this.parentProfile.parent_id),
//   formsRes: this.apiService.getAllUnsignedConsentFormsForParent(this.parentProfile.parent_id)
// }).subscribe({
//   next: ({ eventsRes, formsRes }) => {
//     const start = new Date(fetchInfo.start);
//     const end = new Date(fetchInfo.end);

//     const events = (eventsRes.events || []).filter((ev: any) => {
//       const d = new Date(ev.date);
//       return d >= start && d < end;
//     }).map((ev: any) => {
//       console.log('Event from API:', ev); // Add this
//       let startDate: Date | string;
//       if (ev.time && /^\d{2}:\d{2}:\d{2}$/.test(ev.time)) {
//         // Combine date and time: "YYYY-MM-DDTHH:mm:ss"
//         startDate = new Date(`${ev.date}T${ev.time}`);
//       } else if (/^\d{4}-\d{2}-\d{2}$/.test(ev.date)) {
//         // date-only, treat as all-day
//         startDate = ev.date;
//       } else {
//         // fallback: parse as Date
//         startDate = new Date(ev.date);
//       }
//       return {
//         title: ev.title,
//         start: startDate,
//         className: 'event-class', // Add custom class for events
//         extendedProps: { type: 'event', description: ev.description, student: { first_name: ev.student_first_name, last_name: ev.student_last_name }, raw: ev }
//       }
//     });

//     const forms = (formsRes.forms || []).filter((f: any) => {
//       const d = new Date(f.deadline);
//       return d >= start && d < end;
//     }).map((f: any) => ({
//       title: 'Consent Form: ' + f.title,
//       start: new Date(f.deadline),
//       allDay: true,
//       className: 'consent-form-class', // Add custom class for consent forms
//       extendedProps: { type: 'consentForm', student: { first_name: f.student_first_name, last_name: f.student_last_name }, raw: f }
//     }));

//     const combined = [...events, ...forms];

//     // keep local copies used by the lists below the calendar
//     this.events = eventsRes.events || [];
//     this.forms = formsRes.forms || [];

//     // update filtered lists for currently selected day
//     // this.filterEventsAndForms(this.selectedDay);

//     // give events to FullCalendar
//     successCallback(combined);
//   },
//   error: err => {
//     console.error('fetchEvents error', err);
//     failureCallback(err);
//   }
// });
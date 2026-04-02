import {
  Component,
  OnInit,
  AfterViewInit,
  ChangeDetectorRef,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { Router } from '@angular/router';
import { CalendarEvent } from 'angular-calendar';

import { ViewWillEnter } from '@ionic/angular';
import { GestureController, Gesture } from '@ionic/angular';
import { Storage } from '@ionic/storage-angular';

import { startOfDay } from 'date-fns';

import { ApiService } from '../services/api.service';

import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { CalendarOptions } from '@fullcalendar/core';
import { FullCalendarComponent } from '@fullcalendar/angular';
import { AlertController } from '@ionic/angular';

@Component({
  selector: 'app-calendar',
  templateUrl: './calendar.page.html',
  styleUrls: ['./calendar.page.scss'],
  standalone: false,
})
export class CalendarPage implements OnInit, ViewWillEnter, AfterViewInit {
  @ViewChild('calendar') calendarComponent!: FullCalendarComponent;
  private _storage: Storage | null = null;
  private _calendarEvents: CalendarEvent[] = [];
  private gesture?: Gesture;

  linkedStudentIds: number[] = [];
  linkedEventIds: Set<number> = new Set<number>();
  loadedConsentForms: any[] = [];

  showUpcomingEvents: boolean = true;
  timezoneName: string = '';
  localDate: Date = new Date();

  currentMonth: string = '';
  consentFormCount: number = 0;
  eventCount: number = 0;

  currentLocation: string = 'Fetching location...';

  get calendarEvents(): CalendarEvent[] {
    return this._calendarEvents;
  }

  constructor(
    private router: Router,
    private apiService: ApiService,
    private gestureCtrl: GestureController,
    private cdr: ChangeDetectorRef,
    private storage: Storage,
    private elementRef: ElementRef,
    private alertController: AlertController // <--- add this
  ) {}

  async handleEventClick(info: any) {
    const event = info.event;
    const type = event.extendedProps?.type;
    const studentExtended = event.extendedProps?.student || {};
    const studentFirstName =
      studentExtended.first_name ||
      event.extendedProps?.student_first_name ||
      event.first_name ||
      '';
    const studentLastName =
      studentExtended.last_name ||
      event.extendedProps?.student_last_name ||
      event.last_name ||
      '';
    const studentText = `${studentFirstName} ${studentLastName}`.trim();

    const studentName =
      studentText ||
      `ID ${event.extendedProps?.student_id ?? event.student_id ?? 'unknown'}`;
    const header = type === 'consentForm' ? 'Consent Form' : 'Event';
    const message =
      `${header}` + ` ` +`(${studentName})`;

    const alert = await this.alertController.create({
      header,
      message,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Details',
          handler: () => {
            if (type === 'consentForm') {
              this.openConsentFormDetail(event);
            } else {
              this.openEventDetail(event);
            }
          },
        },
      ],
    });

    await alert.present();
  }

  // Handle date clicks
  async handleDateClick(info: any) {
    const dateStr = info.dateStr;
    const alert = await this.alertController.create({
      header: 'View Day',
      message: `Go to day view for ${dateStr}?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Yes',
          handler: () => {
            this.router.navigate(['/day-events', dateStr]);
          },
        },
      ],
    });
    await alert.present();
  }

  ngAfterViewInit() {
    const calendarElement =
      this.elementRef.nativeElement.querySelector('full-calendar');
    if (calendarElement) {
      if (this.gesture) {
        this.gesture.destroy();
      }
      this.gesture = this.gestureCtrl.create({
        el: calendarElement, // Attach directly to the calendar element
        gestureName: 'swipe',
        threshold: 15, // Minimum movement to detect a swipe
        onEnd: (ev) => this.handleSwipe(ev), // Use onEnd for swipe detection
      });
      this.gesture.enable(true);
    } else {
      console.error('FullCalendar element not found');
    }
    // setTimeout(() => {
    //   this.initializeSwipeGesture();
    // }, 500); // 500ms delay
  }

  // initializeSwipeGesture() {
  //   // Use a more specific selector if possible, or ensure this is the only one
  //   const calendarElement = document.querySelector('full-calendar');
  //   if (calendarElement) {
  //     this.gesture = this.gestureCtrl.create({
  //       el: calendarElement,
  //       gestureName: 'swipe',
  //       threshold: 15,
  //       passive: true, // Add this to prevent conflicts with scrolling
  //       onEnd: (ev) => this.handleSwipe(ev),
  //     });
  //     this.gesture.enable(true);
  //   } else {
  //     console.error('FullCalendar element not found for swipe gesture.');
  //   }
  // }

  handleSwipe(ev: any) {
    const calendarElement =
      this.elementRef.nativeElement.querySelector('full-calendar');
    if (ev.deltaX > 50) {
      calendarElement?.classList.add('swipe-right');
      setTimeout(() => calendarElement?.classList.remove('swipe-right'), 300);
      this.goToPrevious();
    } else if (ev.deltaX < -50) {
      calendarElement?.classList.add('swipe-left');
      setTimeout(() => calendarElement?.classList.remove('swipe-left'), 300);
      this.goToNext();
    }
  }

  ionViewWillLeave() {
    if (this.gesture) {
      this.gesture.destroy();
      this.gesture = undefined;
    }
  }

  goToPrevious() {
    const calendarApi = this.calendarComponent.getApi(); // Use the FullCalendar API
    if (calendarApi) {
      calendarApi.prev(); // Navigate to the previous view
    }
  }

  goToNext() {
    const calendarApi = this.calendarComponent.getApi(); // Use the FullCalendar API
    if (calendarApi) {
      calendarApi.next(); // Navigate to the next view
    }
  }

  // run every time the page is shown (not just on first load)
  ionViewWillEnter() {
    this.loadEventsAndConsentForms();
  }

  async ngOnInit() {
    this._storage = await this.storage.create();
    const cachedConsentFormCount = await this.storage.get('consentFormCount');
    const cachedEventCount = await this.storage.get('eventCount');

    if (
      cachedConsentFormCount !== null &&
      cachedConsentFormCount !== undefined
    ) {
      this.consentFormCount = cachedConsentFormCount;
    }

    if (cachedEventCount !== null && cachedEventCount !== undefined) {
      this.eventCount = cachedEventCount;
    }
    await this.loadEventsAndConsentForms();
    await this.updateMonthCounts();
  }

  async updateCurrentMonthCounts() {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1); // Start of the month
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0); // End of the month
    const normalizeDate = (date: Date) =>
      new Date(date.getFullYear(), date.getMonth(), date.getDate());
    // Filter Consent Forms and Events for the current month
    this.consentFormCount = (this.loadedConsentForms || []).filter(
      (form: any) => {
        const deadline = normalizeDate(new Date(form.deadline));
        return deadline >= currentMonthStart && deadline <= currentMonthEnd;
      }
    ).length;

    this.eventCount = (this._calendarEvents || []).filter((event: any) => {
      const eventDate = normalizeDate(new Date(event.start)); // Use `start` instead of `date`
      return eventDate >= currentMonthStart && eventDate <= currentMonthEnd;
    }).length;

    await this.storage.set('consentFormCount', this.consentFormCount);
    await this.storage.set('eventCount', this.eventCount);
  }

  private updateMonthCounts() {
  const calendarApi = this.calendarComponent?.getApi();
  // If the calendar isn't ready yet, use today's month as a backup
  const centerDate = calendarApi ? new Date(calendarApi.view.currentStart) : new Date();

  const normalizeDate = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate());

  // Count Consent Forms for the currently visible month
  this.consentFormCount = (this.loadedConsentForms || []).filter(
    (form: any) => {
      const deadline = normalizeDate(new Date(form.deadline));
      return (
        deadline.getFullYear() === centerDate.getFullYear() &&
        deadline.getMonth() === centerDate.getMonth()
      );
    }
  ).length;

  // Count Events for the currently visible month
  this.eventCount = (this._calendarEvents || []).filter((event: any) => {
    const eventDate = normalizeDate(new Date(event.start));
    return (
      eventDate.getFullYear() === centerDate.getFullYear() &&
      eventDate.getMonth() === centerDate.getMonth()
    );
  }).length;

  // Save to storage so they persist
  this.storage.set('consentFormCount', this.consentFormCount);
  this.storage.set('eventCount', this.eventCount);

  // Force the screen to update the numbers immediately
  this.cdr.detectChanges();
}

  calendarOptions: CalendarOptions = {
    initialView: 'dayGridMonth', // Default view (month view)
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin], // Plugins for different views and interactions
    headerToolbar: {
      left: '',
      center: '',
      right: '',
    },
    events: [], // Events will be dynamically loaded
    editable: true, // Allow drag-and-drop
    eventClick: this.handleEventClick.bind(this), // Handle event clicks
    dateClick: this.handleDateClick.bind(this), // Handle date clicks
    eventContent: this.renderEventContent.bind(this), // Custom rendering for events

    datesSet: (arg) => {
      // Use the center date of the calendar view to determine the current month
      const centerDate = new Date(arg.view.currentStart); // Center date of the visible range

      // Update the current month name
      this.currentMonth = centerDate.toLocaleString('default', {
        month: 'long',
        year: 'numeric',
      });

      this.updateMonthCounts();
    },
  };

  async loadEventsAndConsentForms() {
    const parentProfile = this.apiService.getCurrentProfile();
    if (!parentProfile) return;

    if (parentProfile) {
      const cachedEvents = await this.storage.get('calendarEvents');
      if (cachedEvents && Array.isArray(cachedEvents) && cachedEvents.length > 0) {
        this.calendarOptions.events = cachedEvents;

        // Assign cached events to _calendarEvents and loadedConsentForms
        this._calendarEvents = cachedEvents.filter(
          (event: any) => event.extendedProps.type === 'event'
        );
        this.loadedConsentForms = cachedEvents.filter(
          (event: any) => event.extendedProps.type === 'consentForm'
        );
        this.updateMonthCounts();
      }
      this.fetchFreshCalendarData(parentProfile);
      // Fetch children linked to the parent
      // this.apiService
      //   .getParentChildren(parentProfile.parent_id)
      //   .subscribe((childrenRes) => {
      //     const childrenArray = childrenRes.children || [];
      //     this.linkedStudentIds = childrenArray.map(
      //       (child: any) => child.student_id
      //     );

      //     // If no linked students, clear consent forms and events
      //     if (this.linkedStudentIds.length === 0) {
      //       this.loadedConsentForms = [];
      //       this.calendarOptions.events = []; // Clear calendar events
      //       return;
      //     }

      //     // Fetch events
      //     this.apiService
      //       .getParentEvents(parentProfile.parent_id)
      //       .subscribe((res) => {
      //         const events = (res.events || []).map(
      //           (event: any, index: number) => {
      //             const rawId =
      //               event.event_id ??
      //               event.id ??
      //               `${event.date}-${event.title}`; // guaranteed unique key source
      //             const mappedEvent = {
      //               ...event,
      //               title: event.title,
      //               start: new Date(event.date),
      //               id: event.event_id ?? event.id ?? index,
      //               student_id: event.student_id,
      //               extendedProps: {
      //                 type: 'event',
      //                 originalId: rawId,
      //                 description: event.description,
      //                 student: {
      //                   first_name: event.student_first_name,
      //                   last_name: event.student_last_name,
      //                 },
      //               },
      //               meta: {
      //                 student_id: event.student_id,
      //                 description: event.description,
      //                 student: {
      //                   first_name: event.student_first_name,
      //                   last_name: event.student_last_name,
      //                 },
      //               },
      //             };

      //             console.log('[event debug]', index, {
      //               student_id: mappedEvent.student_id,
      //               eventId: event.event_id,
      //               id: event.id,
      //               mappedId: mappedEvent.id,
      //               rawId,
      //               title: mappedEvent.title,
      //               start: mappedEvent.start,
      //             });

      //             return mappedEvent;
      //           }
      //         );
      //         this._calendarEvents = events;
      //          this.updateMonthCounts();
      //         this.linkedEventIds = new Set(
      //           events.map((ev: any) => ev.extendedProps?.originalId ?? ev.id)
      //         );
      //         // Fetch consent forms
      //         this.apiService
      //           .getAllUnsignedConsentFormsForParent(parentProfile.parent_id)
      //           .subscribe((res) => {
      //             this.loadedConsentForms = (res.forms || []).map(
      //               (form: any) => ({
      //                 ...form,
      //                 student: {
      //                   first_name: form.student_first_name,
      //                   last_name: form.student_last_name,
      //                   student_id: form.student_id,
      //                 },
      //               })
      //             );
      //             const consentForms = (res.forms || []).map(
      //               (form: any, index: number) => {
      //                 const mapped = {
      //                   ...form,
      //                   student_id: form.student_id,
      //                   title: 'Consent Form: ' + form.title,
      //                   start: new Date(form.deadline),
      //                   id: `consent-${form.form_id}-${form.student_id}-${index}`,
      //                   extendedProps: {
      //                     type: 'consentForm',
      //                     form_id: form.form_id,
      //                     originalId: `${form.form_id}-${form.student_id}`,
      //                     student_id: form.student_id,
      //                     student: {
      //                       first_name: form.first_name,
      //                       last_name: form.last_name,
      //                       student_id: form.student_id,
      //                     },
      //                   },
      //                 };
      //                 console.log(
      //                   '[consent debug]',
      //                   index,
      //                   mapped.id,
      //                   mapped.title,
      //                   mapped.start,
      //                   mapped.extendedProps
      //                 );
      //                 return mapped;
      //               }
      //             );

      //             // Combine events and consent forms
      //             const combinedEvents = [...events, ...consentForms];
      //             console.log('Loaded calendar events:', combinedEvents.length);
      //             combinedEvents.forEach((e: any, idx: number) => {
      //               console.log(idx, {
      //                 id: e.id,
      //                 title: e.title,
      //                 start: e.start,
      //                 type: e.extendedProps?.type,
      //                 dateKey: e.start?.toISOString?.(),
      //               });
      //             });
      //             this.calendarOptions.events = combinedEvents;

      //             // Cache the combined events
      //             this.storage.set('calendarEvents', combinedEvents);
      //             this.updateMonthCounts();
      //           });
      //       });
      //   });
    }
  }

  private fetchFreshCalendarData(parentProfile: any) {
  // Use forkJoin to parallelize all three API calls instead of nesting
  this.apiService.getParentChildren(parentProfile.parent_id).subscribe(
    (childrenRes) => {
      const childrenArray = childrenRes.children || [];
      this.linkedStudentIds = childrenArray.map(
        (child: any) => child.student_id
      );

      if (this.linkedStudentIds.length === 0) {
        this.loadedConsentForms = [];
        this.calendarOptions.events = [];
        this.storage.set('calendarEvents', []);
        return;
      }

      // Parallelize the two remaining calls
      Promise.all([
        new Promise((resolve) => {
          this.apiService.getParentEvents(parentProfile.parent_id).subscribe(
            (res) => resolve(res),
            (err) => {
              console.error('Error fetching events:', err);
              resolve(null);
            }
          );
        }),
        new Promise((resolve) => {
          this.apiService
            .getAllUnsignedConsentFormsForParent(parentProfile.parent_id)
            .subscribe(
              (res) => resolve(res),
              (err) => {
                console.error('Error fetching consent forms:', err);
                resolve(null);
              }
            );
        }),
      ]).then(([eventsRes, formsRes]: any) => {
        // Process events
        const events = (eventsRes?.events || []).map(
          (event: any, index: number) => {
            const rawId =
              event.event_id ?? event.id ?? `${event.date}-${event.title}`;
            return {
              ...event,
              title: event.title,
              start: new Date(event.date),
              id: `event-${event.event_id ?? event.id}-${event.student_id}-${index}`,
              student_id: event.student_id,
              extendedProps: {
                type: 'event',
                originalId: rawId,
                description: event.description,
                student: {
                  first_name: event.student_first_name,
                  last_name: event.student_last_name,
                },
              },
              meta: {
                student_id: event.student_id,
                description: event.description,
                student: {
                  first_name: event.student_first_name,
                  last_name: event.student_last_name,
                },
              },
            };
          }
        );

        this._calendarEvents = events;
        this.linkedEventIds = new Set(
          events.map((ev: any) => ev.extendedProps?.originalId ?? ev.id)
        );

        // Process consent forms
        this.loadedConsentForms = (formsRes?.forms || []).map((form: any) => ({
          ...form,
          student: {
            first_name: form.student_first_name,
            last_name: form.student_last_name,
            student_id: form.student_id,
          },
        }));

        const consentForms = (formsRes?.forms || []).map(
          (form: any, index: number) => {
            const mapped = {
              ...form,
              student_id: form.student_id,
              title: 'Consent Form: ' + form.title,
              start: new Date(form.deadline),
              id: `consent-${form.form_id}-${form.student_id}-${index}`,
              extendedProps: {
                type: 'consentForm',
                form_id: form.form_id,
                originalId: `${form.form_id}-${form.student_id}`,
                student_id: form.student_id,
                student: {
                  first_name: form.student_first_name,
                  last_name: form.student_last_name,
                  student_id: form.student_id,
                },
              },
            };
            return mapped;
          }
        );

        // Combine and update calendar
        const combinedEvents = [...events, ...consentForms];
        this.calendarOptions.events = combinedEvents;

        // Trigger change detection and update counts
        this.cdr.markForCheck();
        this.updateMonthCounts();

        // Cache the fresh data
        this.storage.set('calendarEvents', combinedEvents);
      });
    }
  );
}

  async clearCalendarCache() {
    await this.storage.remove('calendarEvents');
  }

  renderEventContent(eventInfo: any) {
    const { type } = eventInfo.event.extendedProps;

    const dot = document.createElement('div');
    dot.style.width = '8px';
    dot.style.height = '8px';
    dot.style.borderRadius = '50%';
    dot.style.margin = '0 auto';

    if (type === 'event') {
      dot.style.backgroundColor = 'blue'; // Blue dot for events
    } else if (type === 'consentForm') {
      dot.style.backgroundColor = 'green'; // Green dot for consent forms
    }

    return { domNodes: [dot] };
  }

  refreshData() {
    this.ngOnInit();
  }

  openEventDetail(event: any) {
    // const rawEventId = event.id ?? event.event_id;
    // const eventId = Number(rawEventId);
    const eventId = event.event_id ?? event.id;  // Get original event_id
    // let studentId = event.student_id ?? event.meta?.student_id;
    const studentId =
      event.extendedProps?.student?.student_id ??
      event.extendedProps?.student_id ??
      event.student_id ??
      event.meta?.student_id;

    // if (!studentId && event.student && event.student.student_id) {
    //   studentId = event.student.student_id;
    // }

    if ((eventId) && studentId) {
      this.router.navigate(['/event-detail', eventId, studentId]);
    } else {
      // Show a toast or alert for missing info
      console.error('Invalid eventId or studentId', { eventId, studentId, event });
      alert('Cannot open event details: missing student or event information.');
    }
  }

  openConsentFormDetail(event: any) {
    const formId = event.form_id ?? event.extendedProps?.form_id;
    // Try to get studentId from multiple possible locations
    const studentId =
      event.student_id ??
      event.extendedProps?.student_id ??
      event.extendedProps?.student?.student_id;
    // if (!studentId && event.student && form.student.student_id) {
    //   studentId = form.student.student_id;
    // }
    // if (!studentId && form.student) {
    //   studentId = form.student.id ?? form.student.student_id;
    // }
    if (formId && studentId) {
      this.router.navigate(['/consent-form-detail', formId, studentId]);
    } else {
      alert(
        'Cannot open consent form details: missing student or form information.'
      );
    }
  }

  // get upcomingEvents(): CalendarEvent[] {
  //   const now = startOfDay(new Date());
  //   const maxDaysAhead = 14; // Show events within the next 14 days
  //   return this.calendarEvents
  //     .filter((ev: any) => {
  //       if (ev.extendedProps?.type !== 'event') return false;
  //       const evDate = startOfDay(ev.start);
  //       const daysDiff =
  //         (evDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

  //       // Optionally keep original DB id check
  //       const originId = ev.extendedProps?.originalId ?? ev.id;
  //       const isLinked = this.linkedEventIds.has(originId) || true;
  //       // (or remove linkedEventIds set logic entirely if not needed)

  //       return isLinked && daysDiff >= 0 && daysDiff <= maxDaysAhead;
  //     })
  //     .sort((a, b) => a.start.getTime() - b.start.getTime());
  // }

  // get upcomingConsentForms(): any[] {
  //   const now = startOfDay(new Date());
  //   const maxDaysAhead = 14; // Show forms within the next 14 days
  //   return this.loadedConsentForms
  //     .filter((form) => {
  //       if (!form.deadline) return false;
  //       const deadlineDate = startOfDay(new Date(form.deadline));
  //       const daysDiff =
  //         (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  //       return daysDiff >= 0 && daysDiff <= maxDaysAhead;
  //     })
  //     .sort(
  //       (a, b) =>
  //         new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
  //     );
  // }

    get upcomingEvents(): CalendarEvent[] {
    const calendarApi = this.calendarComponent?.getApi();
    const centerDate = calendarApi ? new Date(calendarApi.view.currentStart) : new Date();
    const now = startOfDay(new Date());
    const maxDaysAhead = 14; 

    return (this._calendarEvents || [])
      .filter((ev: any) => {
        if (ev.extendedProps?.type !== 'event') return false;
        
        const evDate = new Date(ev.start);
        const evDayOnly = startOfDay(evDate);
        const daysDiff = (evDayOnly.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

        // CHECK 1: Is it in the Month/Year we are looking at?
        const isThisMonth = evDate.getFullYear() === centerDate.getFullYear() &&
                            evDate.getMonth() === centerDate.getMonth();

        // CHECK 2: Is it within 14 days of today?
        const isWithin14Days = daysDiff >= 0 && daysDiff <= maxDaysAhead;

        return isThisMonth && isWithin14Days;
      })
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }

  get upcomingConsentForms(): any[] {
    const calendarApi = this.calendarComponent?.getApi();
    const centerDate = calendarApi ? new Date(calendarApi.view.currentStart) : new Date();
    const now = startOfDay(new Date());
    const maxDaysAhead = 14;

    return (this.loadedConsentForms || [])
      .filter((form) => {
        if (!form.deadline) return false;
        
        const deadlineDate = new Date(form.deadline);
        const deadlineDayOnly = startOfDay(deadlineDate);
        const daysDiff = (deadlineDayOnly.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

        // CHECK 1: Is it in the Month/Year we are looking at?
        const isThisMonth = deadlineDate.getFullYear() === centerDate.getFullYear() &&
                            deadlineDate.getMonth() === centerDate.getMonth();

        // CHECK 2: Is it within 14 days of today?
        const isWithin14Days = daysDiff >= 0 && daysDiff <= maxDaysAhead;

        return isThisMonth && isWithin14Days;
      })
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
  }

  doRefresh(event: any) {
    this.clearCalendarCache(); // Clear the cache
    this.ngOnInit();

    // Complete the refresher after data is loaded
    setTimeout(() => {
      event.target.complete();
    }, 1000); // Adjust timeout as needed or call complete after data is actually loaded
  }
}

import { Component, OnInit, AfterViewInit, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
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
    private elementRef: ElementRef
  ) { }

  handleEventClick(info: any) {
    alert(`Event: ${info.event.title}`);
  }

  // Handle date clicks
  handleDateClick(info: any) {
    alert(`Date clicked: ${info.dateStr}`);
    const clickedDate = info.dateStr; // Format: YYYY-MM-DD
    this.router.navigate(['/day-events', clickedDate]);
  }

  ngAfterViewInit() {
    const calendarElement = this.elementRef.nativeElement.querySelector('full-calendar');
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
    setTimeout(() => {
      this.initializeSwipeGesture();
    }, 500); // 500ms delay
  }

  initializeSwipeGesture() {
    // Use a more specific selector if possible, or ensure this is the only one
    const calendarElement = document.querySelector('full-calendar');
    if (calendarElement) {
      this.gesture = this.gestureCtrl.create({
        el: calendarElement,
        gestureName: 'swipe',
        threshold: 15,
        passive: true, // Add this to prevent conflicts with scrolling
        onEnd: (ev) => this.handleSwipe(ev),
      });
      this.gesture.enable(true);
    } else {
      console.error('FullCalendar element not found for swipe gesture.');
    }
  }

  handleSwipe(ev: any) {
    const calendarElement = this.elementRef.nativeElement.querySelector('full-calendar');
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

    if (cachedConsentFormCount !== null && cachedConsentFormCount !== undefined) {
      this.consentFormCount = cachedConsentFormCount;
    }

    if (cachedEventCount !== null && cachedEventCount !== undefined) {
      this.eventCount = cachedEventCount;
    }
    await this.loadEventsAndConsentForms();
    await this.updateCurrentMonthCounts();
  }


  async updateCurrentMonthCounts() {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1); // Start of the month
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0); // End of the month
    const normalizeDate = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
    // Filter Consent Forms and Events for the current month
    this.consentFormCount = (this.loadedConsentForms || []).filter((form: any) => {
      const deadline = normalizeDate(new Date(form.deadline));
      return deadline >= currentMonthStart && deadline <= currentMonthEnd;
    }).length;

    this.eventCount = (this._calendarEvents || []).filter((event: any) => {
      const eventDate = normalizeDate(new Date(event.start)); // Use `start` instead of `date`
      return eventDate >= currentMonthStart && eventDate <= currentMonthEnd;
    }).length;

    await this.storage.set('consentFormCount', this.consentFormCount);
    await this.storage.set('eventCount', this.eventCount);
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
      this.currentMonth = centerDate.toLocaleString('default', { month: 'long', year: 'numeric' });

      // Normalize dates for filtering
      const normalizeDate = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

      // Filter Consent Forms and Events for the current month
      this.consentFormCount = (this.loadedConsentForms || []).filter((form: any) => {
        const deadline = normalizeDate(new Date(form.deadline));
        return (
          deadline.getFullYear() === centerDate.getFullYear() &&
          deadline.getMonth() === centerDate.getMonth()
        );
      }).length;

      this.eventCount = (this._calendarEvents || []).filter((event: any) => {
        const eventDate = normalizeDate(new Date(event.start));
        return (
          eventDate.getFullYear() === centerDate.getFullYear() &&
          eventDate.getMonth() === centerDate.getMonth()
        );
      }).length;

      this.cdr.detectChanges(); // Trigger change detection
    },
  };

  async loadEventsAndConsentForms() {
    const parentProfile = this.apiService.getCurrentProfile();
    if (parentProfile) {

      const cachedEvents = await this.storage.get('calendarEvents');
      if (cachedEvents) {
        this.calendarOptions.events = cachedEvents;

        // Assign cached events to _calendarEvents and loadedConsentForms
        this._calendarEvents = cachedEvents.filter((event: any) => event.extendedProps.type === 'event');
        this.loadedConsentForms = cachedEvents.filter((event: any) => event.extendedProps.type === 'consentForm');
      }
      // Fetch children linked to the parent
      this.apiService.getParentChildren(parentProfile.parent_id).subscribe((childrenRes) => {
        const childrenArray = childrenRes.children || [];
        this.linkedStudentIds = childrenArray.map((child: any) => child.student_id);

        // If no linked students, clear consent forms and events
        if (this.linkedStudentIds.length === 0) {
          this.loadedConsentForms = [];
          this.calendarOptions.events = []; // Clear calendar events
          return;
        }

        // Fetch events
        this.apiService.getParentEvents(parentProfile.parent_id).subscribe((res) => {

          const events = (res.events || []).map((event: any) => ({
            ...event,
            title: event.title, // Event title
            start: new Date(event.date), // Event date
            id: event.id ?? event.event_id,
            student_id: event.student_id,
            extendedProps: {
              type: 'event', // Custom property to differentiate events
              description: event.description,
              student: {
                first_name: event.student_first_name,
                last_name: event.student_last_name,
              },
            }, meta: {
              student_id: event.student_id, description: event.description,
              student: {
                first_name: event.student_first_name,
                last_name: event.student_last_name
              }
            }
          }));
          this._calendarEvents = events;
          this.linkedEventIds = new Set(events.map((ev: any) => ev.id));
          // Fetch consent forms
          this.apiService.getAllUnsignedConsentFormsForParent(parentProfile.parent_id).subscribe((res) => {

            this.loadedConsentForms = (res.forms || []).map((form: any) => ({
              ...form,
              student: {
                first_name: form.student_first_name,
                last_name: form.student_last_name,
                student_id: form.student_id
              }
            }));
            const consentForms = (res.forms || []).map((form: any) => ({
              ...form,
              student_id: form.student_id,
              title: 'Consent Form: ' + form.title, // Consent form title
              start: new Date(form.deadline), // Consent form deadline
              extendedProps: {
                type: 'consentForm', // Custom property for consent forms
                student: {
                  first_name: form.first_name,
                  last_name: form.last_name,
                  student_id: form.student_id
                },
              },
            }));

            // Combine events and consent forms
            const combinedEvents = [...events, ...consentForms];
            this.calendarOptions.events = combinedEvents;

            // Cache the combined events
            this.storage.set('calendarEvents', combinedEvents);
            this.updateCurrentMonthCounts();
          });
        });
      });
    }
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
    
    const eventId = event.id ?? event.event_id;
    let studentId = event.student_id ?? event.meta?.student_id;

    
    if (!studentId && event.student && event.student.student_id) {
      studentId = event.student.student_id;
    }

    if (eventId && studentId) {
      this.router.navigate(['/event-detail', eventId, studentId]);
    } else {
      // Show a toast or alert for missing info
      alert('Cannot open event details: missing student or event information.');
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
    this.clearCalendarCache(); // Clear the cache
    this.ngOnInit();

    // Complete the refresher after data is loaded
    setTimeout(() => {
      event.target.complete();
    }, 1000); // Adjust timeout as needed or call complete after data is actually loaded
  }
}

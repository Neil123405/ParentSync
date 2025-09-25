import { Component, OnInit, AfterViewInit } from '@angular/core';

import { Router } from '@angular/router';
import { CalendarEvent } from 'angular-calendar';

import { ViewWillEnter } from '@ionic/angular';

import { startOfDay } from 'date-fns';

import { ApiService } from '../services/api.service';

import { ChangeDetectorRef } from '@angular/core';

import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { CalendarOptions } from '@fullcalendar/core';
import { GestureController, Gesture } from '@ionic/angular';
import { ViewChild } from '@angular/core';
import { FullCalendarComponent } from '@fullcalendar/angular'; // Import FullCalendarComponent

// calendar.page.ts
import { LOCAL_CONFIG } from '../config.local';
// const ABSTRACT_API_KEY = LOCAL_CONFIG.ABSTRACT_API_KEY;
// dayGridMonth,timeGridWeek,timeGridDay, today
@Component({
  selector: 'app-calendar',
  templateUrl: './calendar.page.html',
  styleUrls: ['./calendar.page.scss'],
  standalone: false,
})
export class CalendarPage implements OnInit, ViewWillEnter, AfterViewInit {
  @ViewChild('calendar') calendarComponent!: FullCalendarComponent; // Reference to FullCalendar
  // calendarOptions: CalendarOptions = {
  //   initialView: 'dayGridMonth', // Default view (month view)
  //   plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin], // Plugins for different views and interactions
  //   headerToolbar: {
  //     left: '',
  //     center: 'title',
  //     right: '',
  //   },
  //   // footerToolbar: {   // Custom button in the footer
  //   //   center: 'today',      // Navigation buttons in the footer
  //   // },
  //   events: [], // Events will be dynamically loaded
  //   editable: true, // Allow drag-and-drop
  //   eventClick: this.handleEventClick.bind(this), // Handle event clicks
  //   dateClick: this.handleDateClick.bind(this), // Handle date clicks
  //   eventContent: this.renderEventContent.bind(this), // Custom rendering for events
  // };



  handleEventClick(info: any) {
    alert(`Event: ${info.event.title}`);
    console.log(info.event);
  }

  // Handle date clicks
  handleDateClick(info: any) {
    alert(`Date clicked: ${info.dateStr}`);
    const clickedDate = info.dateStr; // Format: YYYY-MM-DD
    this.router.navigate(['/day-events', clickedDate]);
    // console.log(info.dateStr);
  }
  // viewDate: Date = new Date();

  private _calendarEvents: CalendarEvent[] = [];
  get calendarEvents(): CalendarEvent[] {
    return this._calendarEvents;
  }

  // weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  // monthNames = [
  //   'January', 'February', 'March', 'April', 'May', 'June',
  //   'July', 'August', 'September', 'October', 'November', 'December'
  // ];

  linkedStudentIds: number[] = [];
  linkedEventIds: Set<number> = new Set<number>();
  // currentYear: number = new Date().getFullYear();
  // currentMonth: number = new Date().getMonth();
  // selectedDay: { year: number, month: number, date: number } | null = null;
  // calendarGrid: any[][] = [];
  loadedConsentForms: any[] = [];

  showUpcomingEvents: boolean = true;
  timezoneName: string = '';
  localDate: Date = new Date();

  currentLocation: string = 'Fetching location...';
  private gesture?: Gesture;

  constructor(
    private router: Router,
    private apiService: ApiService,
    private gestureCtrl: GestureController,
    private cdr: ChangeDetectorRef // Add ChangeDetectorRef
  ) { }

  ngAfterViewInit() {
    const calendarElement = document.querySelector('full-calendar'); // FullCalendar root element
    if (calendarElement) {
      console.log('Calendar element:', calendarElement);
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
  }

  handleSwipe(ev: any) {
    const calendarElement = document.querySelector('full-calendar');
    console.log('Swipe detected:', ev); // Debugging log
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





  goToPrevious() {
    const calendarApi = this.calendarComponent.getApi(); // Use the FullCalendar API
    if (calendarApi) {
      calendarApi.prev(); // Navigate to the previous view
      // this.updateCurrentMonthCounts(); // Update counts immediately after navigation
    }
  }

  goToNext() {
    const calendarApi = this.calendarComponent.getApi(); // Use the FullCalendar API
    if (calendarApi) {
      calendarApi.next(); // Navigate to the next view
      // this.updateCurrentMonthCounts(); // Update counts immediately after navigation
    }
  }

  // This will run every time the page is shown (not just on first load)
  ionViewWillEnter() {
    this.ngOnInit();
  }

  async ngOnInit() {
    // await this.setLocalDateByTimezone();
    await this.loadEventsAndConsentForms();
    await this.updateCurrentMonthCounts();
    // Now use this.localDate for your calendar logic
    // this.currentYear = this.localDate.getFullYear();
    // this.currentMonth = this.localDate.getMonth();

    // // Only use navState if it contains BOTH month and year AND they are in a reasonable range
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
    // const today = new Date();
    // this.currentMonth = today.getMonth();
    // this.currentYear = today.getFullYear();
    // }

    // const parentProfile = this.apiService.getCurrentProfile();
    // if (parentProfile) {
    //   this.apiService.getParentChildren(parentProfile.parent_id).subscribe(childrenRes => {
    //     const childrenArray = childrenRes.children || [];
    //     this.linkedStudentIds = childrenArray.map((child: any) => child.student_id);

    //     // let allForms: any[] = [];
    //     // let loaded = 0;
    //     if (this.linkedStudentIds.length === 0) {
    //       this.loadedConsentForms = [];
    //       this.generateCalendar(this.linkedEventIds, []);
    //       return;
    //     }
    //     // Fetch all events
    //     this.apiService.getParentEvents(parentProfile.parent_id).subscribe(res => {
    //       this._calendarEvents = (res.events || []).map((event: any) => ({
    //         ...event,
    //         start: new Date(event.date),
    //         title: event.title,
    //         id: event.id ?? event.event_id,
    //         student_id: event.student_id,
    //         meta: {
    //           student_id: event.student_id, description: event.description,
    //           student: {
    //             first_name: event.first_name,
    //             last_name: event.last_name
    //           }
    //         }
    //       }));

    //       // Fetch event participants for this parent
    //       // this.apiService.getParentEventParticipants(parentProfile.parent_id).subscribe(epRes => {
    //       //   const eventParticipants = epRes.eventParticipants || [];
    //       // this.linkedEventIds = new Set(eventParticipants.map((ep: any) => ep.event_id));
    //       this.linkedEventIds = new Set(this._calendarEvents.map((ev: any) => ev.id));
    //     });
    //     // Fetch consent forms for all linked students
    //     // this.linkedStudentIds.forEach(studentId => {
    //     //   this.apiService.getUnsignedConsentFormsForStudent(studentId).subscribe(res => {
    //     //     if (res.forms) {
    //     //       const formsWithStudent = res.forms.map((form: any) => ({
    //     //         ...form,
    //     //         student_id: studentId,
    //     //         student: (childrenArray || []).find((c: any) => c.student_id === studentId)
    //     //       }));
    //     //       allForms.push(...formsWithStudent);
    //     //     }
    //     //     loaded++;
    //     //     if (loaded === this.linkedStudentIds.length) {
    //     //       this.loadedConsentForms = allForms;
    //     //       this.generateCalendar(this.linkedEventIds, this.loadedConsentForms);
    //     //     }
    //     //   });
    //     // });
    //     // });

    //     this.apiService.getAllUnsignedConsentFormsForParent(parentProfile.parent_id).subscribe(res => {
    //       if (res.forms) {
    //         this.loadedConsentForms = res.forms.map((form: any) => ({
    //           ...form,
    //           student_id: form.student_id,
    //           student: {
    //             first_name: form.first_name,
    //             last_name: form.last_name,
    //             student_id: form.student_id
    //           }
    //         }));
    //         this.generateCalendar(this.linkedEventIds, this.loadedConsentForms);
    //       } else {
    //         this.loadedConsentForms = [];
    //         this.generateCalendar(this.linkedEventIds, []);
    //       }
    //     });
    //   });
    // }
  }

  currentMonth: string = '';
  consentFormCount: number = 0;
  eventCount: number = 0;

  updateCurrentMonthCounts() {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1); // Start of the month
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0); // End of the month

    console.log('Updating counts for:', currentMonthStart, 'to', currentMonthEnd);

    const normalizeDate = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

    // Filter Consent Forms and Events for the current month
    this.consentFormCount = (this.loadedConsentForms || []).filter((form: any) => {
      const deadline = normalizeDate(new Date(form.deadline));
      console.log('Consent Form Deadline:', deadline);
      return deadline >= currentMonthStart && deadline <= currentMonthEnd;
    }).length;

    this.eventCount = (this._calendarEvents || []).filter((event: any) => {
      const eventDate = normalizeDate(new Date(event.start)); // Use `start` instead of `date`
      console.log('Event Date:', eventDate);
      return eventDate >= currentMonthStart && eventDate <= currentMonthEnd;
    }).length;


    console.log('Consent Form Count:', this.consentFormCount);
    console.log('Event Count:', this.eventCount);
    // Update the current month name
    // this.currentMonth = now.toLocaleString('default', { month: 'long', year: 'numeric' });
  }







  // async setLocalDateByTimezone() {
  //   if (navigator.geolocation) {
  //     navigator.geolocation.getCurrentPosition(async (position) => {
  //       const lat = position.coords.latitude;
  //       const lon = position.coords.longitude;

  //       // Get city and country using Nominatim
  //       const geoRes = await fetch(`http://192.168.1.8:3000/reverse-geocode?lat=${lat}&lon=${lon}`);
  //       const geoData = await geoRes.json();
  //       const city = geoData.address.city || geoData.address.town || geoData.address.village || "";
  //       const country = geoData.address.country || "";
  //       const location = `${city}, ${country}`.trim();

  //       this.currentLocation = location;
  //       // Fetch timezone and local time from Abstract API
  //       const TIMEZONE_URL = `https://timezone.abstractapi.com/v1/current_time/?api_key=${ABSTRACT_API_KEY}&location=${encodeURIComponent(location)}`;
  //       const timeRes = await fetch(TIMEZONE_URL);
  //       const timeData = await timeRes.json();
  //       this.timezoneName = timeData.timezone_name;
  //       this.localDate = new Date(timeData.datetime);

  //     }, async (error) => {
  //       // Fallback: use a default location

  //       this.currentLocation = 'Oxford, United Kingdom'; // Fallback location
  //       const defaultLocation = "Oxford, United Kingdom";
  //       const TIMEZONE_URL = `https://timezone.abstractapi.com/v1/current_time/?api_key=${ABSTRACT_API_KEY}&location=${encodeURIComponent(defaultLocation)}`;
  //       const timeRes = await fetch(TIMEZONE_URL);
  //       const timeData = await timeRes.json();
  //       this.timezoneName = timeData.timezone_name;
  //       this.localDate = new Date(timeData.datetime);
  //     });
  //   } else {
  //     // Geolocation not supported, fallback
  //     this.currentLocation = 'Oxford, United Kingdom'; // Fallback location
  //     const defaultLocation = "Oxford, United Kingdom";
  //     const TIMEZONE_URL = `https://timezone.abstractapi.com/v1/current_time/?api_key=${ABSTRACT_API_KEY}&location=${encodeURIComponent(defaultLocation)}`;
  //     const timeRes = await fetch(TIMEZONE_URL);
  //     const timeData = await timeRes.json();
  //     this.timezoneName = timeData.timezone_name;
  //     this.localDate = new Date(timeData.datetime);
  //   }
  // }



  calendarOptions: CalendarOptions = {
    initialView: 'dayGridMonth', // Default view (month view)
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin], // Plugins for different views and interactions
    headerToolbar: {
      left: '',
      center: 'title',
      right: '',
    },
    events: [], // Events will be dynamically loaded
    editable: true, // Allow drag-and-drop
    eventClick: this.handleEventClick.bind(this), // Handle event clicks
    dateClick: this.handleDateClick.bind(this), // Handle date clicks
    eventContent: this.renderEventContent.bind(this), // Custom rendering for events

    // Add the datesSet callback here
    datesSet: (arg) => {
  console.log('datesSet triggered:', arg); // Debugging log

  // Use the center date of the calendar view to determine the current month
  const centerDate = new Date(arg.view.currentStart); // Center date of the visible range
  console.log('Center Date:', centerDate);

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

  console.log('Updated counts:', {
    currentMonth: this.currentMonth,
    consentFormCount: this.consentFormCount,
    eventCount: this.eventCount,
  });

  this.cdr.detectChanges(); // Trigger change detection
},
  };



  loadEventsAndConsentForms() {
    const parentProfile = this.apiService.getCurrentProfile();
    if (parentProfile) {
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
                first_name: event.first_name,
                last_name: event.last_name,
              },
            }, meta: {
              student_id: event.student_id, description: event.description,
              student: {
                first_name: event.first_name,
                last_name: event.last_name
              }
            }
          }));
          this._calendarEvents = events;
          this.linkedEventIds = new Set(events.map((ev: any) => ev.id));
          // Fetch consent forms
          this.apiService.getAllUnsignedConsentFormsForParent(parentProfile.parent_id).subscribe((res) => {
            this.loadedConsentForms = res.forms || [];
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
            this.calendarOptions.events = [...events, ...consentForms];
            console.log('Loaded Consent Forms:', this.loadedConsentForms);
            console.log('Loaded Events:', this._calendarEvents);
            this.updateCurrentMonthCounts();
          });
        });
      });
    }
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

  // * window.history.state
  // * year and month
  // * .getFullYear() .getMonth() .getDate()
  // * .subscribe(res => {})
  // * .map((res: any) => res.whatever)
  // * .map((res: any) => ({VERY TALL})
  // * meta and student

  // * .padStart(2, '0')


  // dayClicked(day: any) {
  //   if (!day || !day.inMonth || !day.date) return;

  //   // Format date as YYYY-MM-DD
  //   const year = day.date.getFullYear();
  //   const month = String(day.date.getMonth() + 1).padStart(2, '0');
  //   const date = String(day.date.getDate()).padStart(2, '0');
  //   const localDate = `${year}-${month}-${date}`;

  //   // Pass both events and forms as navigation state
  //   this.router.navigate(['/day-events', localDate]);
  //   // , {
  //   //   state: {
  //   //     events: day.events || [],
  //   //     forms: day.forms || []
  //   //   }
  //   // }
  // }

  refreshData() {
    this.ngOnInit();
  }

  // logout() {
  //   // Your logout logic here
  // }

  // nextMonth() {
  //   this.currentMonth++;
  //   if (this.currentMonth > 11) {
  //     this.currentMonth = 0;
  //     this.currentYear++;
  //   }
  //   this.generateCalendar(this.linkedEventIds, this.loadedConsentForms);
  // }

  // previousMonth() {
  //   this.currentMonth--;
  //   if (this.currentMonth < 0) {
  //     this.currentMonth = 11;
  //     this.currentYear--;
  //   }
  //   this.generateCalendar(this.linkedEventIds, this.loadedConsentForms);
  // }

  // selectDay(day: any) {
  //   if (!day || !day.inMonth) return;
  //   this.selectedDay = {
  //     year: this.currentYear,
  //     month: this.currentMonth,
  //     date: day.date
  //   };
  // }

  // isToday(day: any): boolean {
  //   if (!day || !day.inMonth || !day.date) return false;
  //   const today = new Date();
  //   return (
  //     day.date.getDate() === today.getDate() &&
  //     day.date.getMonth() === today.getMonth() &&
  //     day.date.getFullYear() === today.getFullYear()
  //   );
  // }

  // isSelected(day: any): boolean {
  //   if (!day || !day.inMonth || !this.selectedDay) return false;
  //   return (
  //     day.date === this.selectedDay.date &&
  //     this.currentMonth === this.selectedDay.month &&
  //     this.currentYear === this.selectedDay.year
  //   );
  // }

  // * .push(either null or object)
  // * .has
  // * .filter ((res: any) => {} ) or .filter (res => {})
  // * startOfDay(needs to be date, kung dili siya date kay type lang new Date(nya ang result sulod ani))
  // * alert


  // generateCalendar(linkedEventIds: Set<number>, consentForms: any[]) {
  //   const firstDay = new Date(this.currentYear, this.currentMonth, 1);
  //   const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
  //   const weeks: any[][] = [];
  //   let week: any[] = [];

  //   // returns null for days before the first day of the month similar to a real calendar
  //   for (let i = 0; i < firstDay.getDay(); i++) {
  //     week.push(null);
  //   }

  //   for (let d = 1; d <= lastDay.getDate(); d++) {
  //     const dayDate = new Date(this.currentYear, this.currentMonth, d);

  //     // Events for this day
  //     const dayEvents = this.calendarEvents.filter(ev => {
  //       const evDate = startOfDay(ev.start);
  //       return (
  //         evDate.getFullYear() === dayDate.getFullYear() &&
  //         evDate.getMonth() === dayDate.getMonth() &&
  //         evDate.getDate() === dayDate.getDate() &&
  //         typeof ev.id === 'number' && linkedEventIds.has(ev.id)
  //       );
  //     });

  //     // Consent forms for this day (by deadline)
  //     // Consent forms is passed as an argument to this function and converted to Date objects
  //     // returns true if the form's deadline matches the day and false otherwise
  //     const dayForms = consentForms.filter(form => {
  //       const deadlineDate = startOfDay(new Date(form.deadline));
  //       return (
  //         deadlineDate.getFullYear() === dayDate.getFullYear() &&
  //         deadlineDate.getMonth() === dayDate.getMonth() &&
  //         deadlineDate.getDate() === dayDate.getDate()
  //       );
  //     });

  //     // week is a placeholder for the current week being generated
  //     week.push({ date: dayDate, inMonth: true, events: dayEvents, forms: dayForms });
  //     if (week.length === 7) {
  //       weeks.push(week);
  //       week = [];
  //     }
  //   }

  //   // Fill the last week with nulls if it has less than 7 days
  //   if (week.length) {
  //     while (week.length < 7) {
  //       week.push(null);
  //     }
  //     weeks.push(week);
  //   }

  //   this.calendarGrid = weeks;
  // }

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

  // */ 1000 * 60 * 60 * 24 = algo from google
  // * .sort((a, b) => a.start.getTime() - b.start.getTime());

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

  // * setTimeout(() => {parameter.target.complete()}, 1000)

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

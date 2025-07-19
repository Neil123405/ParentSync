import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CalendarEvent } from 'angular-calendar';
import { startOfDay, addMonths, subMonths } from 'date-fns';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-calendar',
  templateUrl: './calendar.page.html',
  styleUrls: ['./calendar.page.scss'],
  standalone: false,
})
export class CalendarPage implements OnInit {
  viewDate: Date = new Date();
  calendarEvents: CalendarEvent[] = [];

  constructor(
    private router: Router,
    private apiService: ApiService
  ) {}

  ngOnInit() {
    this.apiService.getAllEvents().subscribe(res => {
      console.log('Raw events:', res.events); // <-- Add this line
      this.calendarEvents = (res.events || []).map((event: any) => ({
        start: new Date(event.date),
        title: event.title,
        id: event.id ?? event.event_id,
        meta: { student_id: event.student_id, description: event.description }
      }));
    });
  }

  dayClicked(day: any) {
    const eventsForDay = this.calendarEvents.filter(
      event => startOfDay(event.start).getTime() === startOfDay(day.date).getTime()
    );
    if (eventsForDay.length > 0) {
      const year = day.date.getFullYear();
      const month = String(day.date.getMonth() + 1).padStart(2, '0');
      const date = String(day.date.getDate()).padStart(2, '0');
      const localDate = `${year}-${month}-${date}`;
      this.router.navigate(['/day-events', localDate]);
    }
    // else do nothing or show a toast
  }

  refreshData() {
    // Optional: reload events from backend
    this.ngOnInit();
  }

  logout() {
    // Your logout logic here
  }

  previousMonth() {
    this.viewDate = subMonths(this.viewDate, 1);
  }

  nextMonth() {
    this.viewDate = addMonths(this.viewDate, 1);
  }
}

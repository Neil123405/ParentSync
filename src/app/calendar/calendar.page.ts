import { Component, OnInit } from '@angular/core';
import { ApiService, User, ParentProfile } from '../services/api.service';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';

@Component({
  selector: 'app-calendar',
  templateUrl: './calendar.page.html',
  styleUrls: ['./calendar.page.scss'],
  standalone: false,
})
export class CalendarPage implements OnInit {
  currentUser: User | null = null;
  currentProfile: ParentProfile | null = null;
  calendarEvents: { date: string, title: string, id: number }[] = [
    // Example: { date: '2025-07-18', title: 'School Event', id: 123 }
  ];
  currentYear: number = new Date().getFullYear();
  currentMonth: number = new Date().getMonth() + 1; // Months are 1-based for formatting
  selectedDayEvents: any[] = [];
  selectedDay: string | null = null;

  constructor(
    private router: Router,
    private alertController: AlertController,
    private apiService: ApiService
  ) { }

  ngOnInit() {
    // Check authentication
    this.currentUser = this.apiService.getCurrentUser();
    this.currentProfile = this.apiService.getCurrentProfile();
    
    if (!this.currentUser) {
      this.router.navigate(['/login']);
      return;
    }

    // Subscribe to user changes
    this.apiService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });

    this.apiService.currentProfile$.subscribe(profile => {
      this.currentProfile = profile;
    });

    // Fetch events from your backend API
    this.apiService.getAllEvents().subscribe(res => {
      console.log('Raw events from backend:', res.events);
      this.calendarEvents = (res.events || []).map((event: any) => ({
        date: event.date, // Format: 'YYYY-MM-DD'
        title: event.title,
         id: event.id ?? event.event_id, // fallback to event_id if id is missing
        student_id: event.student_id // Add student_id if available
      }));
    });
  }

  // Utility to format date as 'YYYY-MM-DD'
  formatDate(year: number, month: number, day: number): string {
    const mm = month.toString().padStart(2, '0');
    const dd = day.toString().padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  }

  async refreshData() {
    // Placeholder for future calendar data refresh
    console.log('Refreshing calendar data...');
  }

  async logout() {
    const alert = await this.alertController.create({
      header: 'Logout',
      message: 'Are you sure you want to logout?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Logout',
          handler: () => {
            this.apiService.logout();
            this.router.navigate(['/login']);
          }
        }
      ]
    });
    await alert.present();
  }

  async showEventDetails(events: any[]) {
    if (!events.length) return;

    if (events.length === 1) {
      // Only one event, navigate directly
      const event = events[0];
      this.router.navigate(['/event-detail', event.id, event.student_id]);
      return;
    }

    // Multiple events: show a list for the user to pick
    const alert = await this.alertController.create({
      header: 'Select Event',
      inputs: events.map(e => ({
        type: 'radio',
        label: `${e.title} (${e.student_id})`, // You can show student name if available
        value: e
      })),
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'View',
          handler: (selectedEvent: any) => {
            this.router.navigate(['/event-detail', selectedEvent.id, selectedEvent.student_id]);
          }
        }
      ]
    });
    await alert.present();
  }

  openEventDetail(event: any) {
    this.router.navigate(['/event-detail', event.id, event.student_id]);
  }

  showAllEventsForDay(day: number | null) {
    if (!day || !this.currentProfile) return;
    const dateStr = this.formatDate(this.currentYear, this.currentMonth, day);
    this.router.navigate(['/day-events', dateStr]);
  }
}

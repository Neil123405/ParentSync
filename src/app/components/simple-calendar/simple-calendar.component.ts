import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-simple-calendar',
  templateUrl: './simple-calendar.component.html',
  styleUrls: ['./simple-calendar.component.scss'],
  standalone: false,
})
export class SimpleCalendarComponent {
  @Input() events: { date: string, title: string, id: number }[] = [];
  @Output() dayClick = new EventEmitter<any>();

  today = new Date();
  currentMonth = this.today.getMonth();
  currentYear = this.today.getFullYear();

  get monthDays() {
    const firstDay = new Date(this.currentYear, this.currentMonth, 1).getDay();
    const daysInMonth = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();
    const days: (number | null)[] = Array(firstDay).fill(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  }

  isEventDay(day: number | null): boolean {
    if (!day) return false;
    const dateStr = this.formatDate(this.currentYear, this.currentMonth, day);
    // Debug log:
    // console.log('Checking', dateStr, this.events.map(e => e.date));
    return this.events.some(e => e.date.slice(0, 10) === dateStr);
  }

  formatDate(year: number, month: number, day: number): string {
    return `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  }

  onDayClick(day: number | null) {
    if (!day) return;
    this.dayClick.emit(day);
  }

  prevMonth() {
    if (this.currentMonth === 0) {
      this.currentMonth = 11;
      this.currentYear--;
    } else {
      this.currentMonth--;
    }
  }

  nextMonth() {
    if (this.currentMonth === 11) {
      this.currentMonth = 0;
      this.currentYear++;
    } else {
      this.currentMonth++;
    }
  }

  isToday(day: number | null): boolean {
    if (!day) return false;
    const now = new Date();
    return (
      day === now.getDate() &&
      this.currentMonth === now.getMonth() &&
      this.currentYear === now.getFullYear()
    );
  }

  getMonthName(month: number): string {
    return new Date(this.currentYear, month, 1).toLocaleString('default', { month: 'long' });
  }
}

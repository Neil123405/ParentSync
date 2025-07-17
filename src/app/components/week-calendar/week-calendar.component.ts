import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-week-calendar',
  templateUrl: './week-calendar.component.html',
  styleUrls: ['./week-calendar.component.scss'],
  standalone: false,
})
export class WeekCalendarComponent implements OnChanges {
  @Input() selectedDate!: string; // format: 'YYYY-MM-DD'
  @Output() dayClick = new EventEmitter<string>();

  weekDays: string[] = [];

  ngOnChanges(changes: SimpleChanges) {
    if (changes['selectedDate'] && this.selectedDate) {
      this.weekDays = this.getWeekDays(this.selectedDate);
    }
  }

  getWeekDays(selectedDate: string): string[] {
    const date = new Date(selectedDate);
    const start = new Date(date);
    start.setDate(date.getDate() - date.getDay()); // Sunday
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d.toISOString().slice(0, 10);
    });
  }

  isSelected(day: string): boolean {
    return day === this.selectedDate;
  }

  onDayClick(day: string) {
    this.dayClick.emit(day);
  }
}

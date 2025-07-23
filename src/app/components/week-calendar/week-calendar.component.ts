import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-week-calendar',
  templateUrl: './week-calendar.component.html',
  styleUrls: ['./week-calendar.component.scss'],
  standalone: false,
})
export class WeekCalendarComponent implements OnChanges {
  @Input() selectedDate!: string; // format: 'YYYY-MM-DD'
  @Input() weekDays: string[] = [];
  @Output() dayClick = new EventEmitter<string>();

  ngOnChanges(changes: SimpleChanges) {
    // weekDays now comes from parent, so no need to recalculate here
  }

  isSelected(day: string): boolean {
    return day === this.selectedDate;
  }

  onDayClick(day: string) {
    this.dayClick.emit(day);
  }
}

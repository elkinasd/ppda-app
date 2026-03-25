import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-search-filters',
  imports: [CommonModule],
  templateUrl: './search-filters.html',
  styleUrl: './search-filters.scss',
})
export class SearchFilters {
  @Input() aggregations: any = {};
  @Input() filterTypes: Record<string, boolean> = {};
  @Input() currentDateFilter: number | null = null;

  @Output() typeTrigger = new EventEmitter<string>();
  @Output() dateTrigger = new EventEmitter<number | null>();

  toggleType(type: string) {
    this.typeTrigger.emit(type);
  }

  setDate(days: number | null) {
    this.dateTrigger.emit(days);
  }
}

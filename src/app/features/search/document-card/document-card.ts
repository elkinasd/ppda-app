import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-document-card',
  imports: [CommonModule],
  templateUrl: './document-card.html',
  styleUrl: './document-card.scss',
})
export class DocumentCard {
  @Input() doc: any = null;
  @Input() isSelected: boolean = false;
  @Input() searchQuery: string = '';
  @Output() preview = new EventEmitter<any>();

  highlightSearchTerm(text: string, term: string): string {
    if (!term || !text) return text;
    const searchRegex = new RegExp(`(${term.trim()})`, 'gi');
    return text.replace(searchRegex, `<mark class="bg-warning text-dark px-1 rounded-1">$1</mark>`);
  }
}

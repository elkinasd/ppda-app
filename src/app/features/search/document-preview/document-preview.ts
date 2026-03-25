import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-document-preview',
  imports: [CommonModule],
  templateUrl: './document-preview.html',
  styleUrl: './document-preview.scss',
})
export class DocumentPreview {
  @Input() document: any = null;
  @Output() close = new EventEmitter<void>();
}

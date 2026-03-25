import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-home-hero',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home-hero.html',
  styleUrl: './home-hero.scss',
})
export class HomeHero {
  @Input() detectedDocumentsCount: number = 0;
  @Input() documentTypes: any[] = [];

  @Output() startAutomation = new EventEmitter<void>();
  @Output() reviewDocuments = new EventEmitter<void>();
  @Output() refreshDocuments = new EventEmitter<void>();
}

import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-live-stream',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './live-stream.html',
  styleUrl: './live-stream.scss',
})
export class LiveStream {
  @Input() metrics: any = { hoursSaved: 0, processedToday: 0, accuracy: 0 };
  @Input() processingDocuments: any[] = [];
}

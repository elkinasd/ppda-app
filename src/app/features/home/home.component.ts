import { Component, signal, OnInit, OnDestroy, inject, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HomeHero } from './home-hero/home-hero';
import { LiveStream } from './live-stream/live-stream';
import { DocumentService } from './document.service';

interface DocumentStatus {
  name: string;
  status: 'Processing' | 'Completed' | 'Needs Review';
  progress: number;
}

interface ActivityEvent {
  messageEn: string;
  messageEs: string;
  timeEs: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, HomeHero, LiveStream],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class HomeComponent implements OnInit, OnDestroy {
  detectedDocumentsCount = signal<number>(0);
  
  documentTypes = signal<{ name: string, count: number, icon: string, color: string }[]>([]);

  processingDocuments = signal<DocumentStatus[]>([]);

  metrics = signal({
    processedToday: 0,
    accuracy: 0,
    hoursSaved: 0
  });

  recentActivities = signal<ActivityEvent[]>([]);

  readonly statusTranslations: Record<DocumentStatus['status'], string> = {
    'Processing': 'Procesando',
    'Completed': 'Completado',
    'Needs Review': 'Requiere Revisión'
  };

  private documentService = inject(DocumentService);
  private router = inject(Router);

  constructor() { }

  ngOnInit() {
    this.loadRealDocuments();
  }

  ngOnDestroy() {
    // No simulation interval needed
  }

  private loadRealDocuments() {
    this.documentService.getPendingCount().subscribe({
      next: (count) => this.detectedDocumentsCount.set(count),
      error: console.error
    });

    this.documentService.getDocuments().subscribe({
      next: (docs) => {
        
        // Mapear los documentos reales de DynamoDB al LiveStream UI
        const mappedDocs = docs.map(d => {
          let status: 'Processing' | 'Needs Review' | 'Completed' = 'Completed';
          
          if (d.type === 'ERROR_MUNDIAL' || d.data?.fraud_risk) {
            status = 'Needs Review';
          }
          
          return {
            name: d.file_name || d.file,
            status: status,
            progress: 100,
            data: d.data
          };
        });

        // Update real metrics
        const total = docs.length;
        const needsReviewCount = mappedDocs.filter(m => m.status === 'Needs Review').length;
        const accuracy = total > 0 ? Math.round(((total - needsReviewCount) / total) * 100) : 100;
        
        this.metrics.set({
          processedToday: total,
          accuracy: accuracy,
          hoursSaved: Math.round(total * 0.1) // 6 minutos guardados por doc
        });

        // Update Document Types dynamically
        const errorCount = docs.filter(d => d.type === 'ERROR_MUNDIAL').length;
        this.documentTypes.set([
          { name: 'Completados', count: total - errorCount, icon: 'bi-check-circle', color: 'text-success' },
          { name: 'Fallidos', count: errorCount, icon: 'bi-x-octagon', color: 'text-danger' }
        ]);

        if (mappedDocs.length > 0) {
           this.processingDocuments.set(mappedDocs.slice(0, 15)); // Display top 15 records
        } else {
           this.processingDocuments.set([]);
        }
      },
      error: (err) => {
        console.error('Error cargando documentos reales:', err);
      }
    });
  }

  startAutomation(): void {
    console.log('Action: Started automation for detected documents');
    this.detectedDocumentsCount.set(0); // Trigger the empty state!
    alert('Extracción en la nube iniciada. Los documentos pasarán al flujo en vivo.');
  }

  reviewDocuments(): void {
    console.log('Action: Navigating to review documents view');
    this.router.navigate(['/review']);
  }

  refreshDetectedDocuments(): void {
    console.log('Action: Refreshing real documents');
    this.loadRealDocuments();
  }
}

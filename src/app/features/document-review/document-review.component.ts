import { Component, signal, computed, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { DocumentService, DocumentItem } from '../home/document.service';

interface ExtractedField {
  id: string;
  labelEn: string;
  labelEs: string;
  value: string;
  confidence: number;
  isEdited: boolean;
}

interface ReviewDocument {
  id: string;
  title: string;
  type: string;
  provider: string;
  overallConfidence: number;
  fields: ExtractedField[];
}

@Component({
  selector: 'app-document-review',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './document-review.component.html',
  styleUrl: './document-review.component.scss'
})
export class DocumentReviewComponent {
  
  // The Machine-Gun Queue
  reviewQueue = signal<ReviewDocument[]>([
    {
      id: 'doc_1',
      title: 'Factura_Proveedor_003.pdf',
      type: 'Factura',
      provider: 'TechCorp Solutions',
      overallConfidence: 0.88,
      fields: [
        { id: 'f1', labelEn: 'Vendor Name', labelEs: 'Nombre del Proveedor', value: 'TechCorp Solutions', confidence: 0.98, isEdited: false },
        { id: 'f2', labelEn: 'Invoice Date', labelEs: 'Fecha de Factura', value: '12/10/2023', confidence: 0.95, isEdited: false },
        { id: 'f3', labelEn: 'Total Amount', labelEs: 'Monto Total', value: '$ 4,500.00', confidence: 0.99, isEdited: false },
        { id: 'f4', labelEn: 'Tax ID', labelEs: 'NIT / RUT', value: '890.123.4S6-7', confidence: 0.45, isEdited: false } // Error to fix
      ]
    },
    {
      id: 'doc_2',
      title: 'INV-992-Global.pdf',
      type: 'Factura',
      provider: 'Global Logistics SRL',
      overallConfidence: 0.92,
      fields: [
        { id: 'f1', labelEn: 'Vendor Name', labelEs: 'Nombre del Proveedor', value: 'Global Logistics SRL', confidence: 0.99, isEdited: false },
        { id: 'f2', labelEn: 'Invoice Date', labelEs: 'Fecha de Factura', value: '05/11/2023', confidence: 0.97, isEdited: false },
        { id: 'f3', labelEn: 'Total Amount', labelEs: 'Monto Total', value: '$ 1,250.00', confidence: 0.98, isEdited: false },
        { id: 'f4', labelEn: 'Tax ID', labelEs: 'NIT / RUT', value: '900.555.333-1', confidence: 0.99, isEdited: false }
      ]
    },
    {
      id: 'doc_3',
      title: 'Contrato_Arrendamiento_V2.pdf',
      type: 'Contrato',
      provider: 'Inmobiliaria Central',
      overallConfidence: 0.75,
      fields: [
        { id: 'f1', labelEn: 'Contractor', labelEs: 'Arrendador', value: 'Inmobiliaria Central S.A.', confidence: 0.90, isEdited: false },
        { id: 'f2', labelEn: 'Start Date', labelEs: 'Fecha de Inicio', value: '01/01/2024', confidence: 0.85, isEdited: false },
        { id: 'f3', labelEn: 'Monthly Rent', labelEs: 'Canon Mensual', value: '$ 2,000,000 COP', confidence: 0.55, isEdited: false } // Low confidence for review
      ]
    }
  ]);

  currentIndex = signal(0);
  isComplete = signal(false);
  
  // Metrics for the success screen
  processedCount = signal(0);
  skippedCount = signal(0);
  timeSavedMinutes = computed(() => this.processedCount() * 4.5); // Assume 4.5 mins saved per doc

  // Computed state for the UI
  currentDocument = computed(() => this.reviewQueue()[this.currentIndex()]);
  progressPercentage = computed(() => {
    if (this.reviewQueue().length === 0) return 100;
    return Math.round((this.currentIndex() / this.reviewQueue().length) * 100);
  });

  private router = inject(Router);
  private documentService = inject(DocumentService);

  constructor() {}

  ngOnInit() {
    this.documentService.getDocuments().subscribe({
      next: (docs) => {
        // Filtrar solo los que necesitan revisión humana (Fraude o Errores de IAM)
        const docsNeedsReview = docs.filter(d => d.type === 'ERROR_MUNDIAL' || d.data?.fraud_risk);
        
        if (docsNeedsReview.length === 0) {
           this.isComplete.set(true);
           return;
        }

        const realQueue: ReviewDocument[] = docsNeedsReview.map((d, index) => {
           return {
             id: d.id,
             title: d.file_name,
             type: d.type === 'ERROR_MUNDIAL' ? 'Error cognitivo' : d.type,
             provider: d.tenant_id,
             overallConfidence: d.type === 'ERROR_MUNDIAL' ? 0.1 : 0.85,
             fields: [
               { id: 'nit', labelEn: 'Tax ID', labelEs: 'NIT / ID', value: d.data?.nit || 'N/A', confidence: 0.9, isEdited: false },
               { id: 'inv', labelEn: 'Invoice #', labelEs: 'No. Factura', value: d.data?.invoice_number || 'N/A', confidence: 0.8, isEdited: false },
               { id: 'tot', labelEn: 'Total Amount', labelEs: 'Total', value: d.data?.total?.toString() || '0', confidence: 0.95, isEdited: false },
               { id: 'sum', labelEn: 'Summary', labelEs: 'Resumen IA', value: d.data?.summary || 'Error de procesamiento', confidence: d.type === 'ERROR_MUNDIAL' ? 0.0 : 0.99, isEdited: false }
             ]
           };
        });

        this.reviewQueue.set(realQueue);
      },
      error: (e) => console.error(e)
    });
  }

  updateFieldValue(id: string, event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    const newValue = inputElement.value;
    
    // Update the specific field in the current document inside the queue
    this.reviewQueue.update(queue => {
      const newQueue = [...queue];
      const currentDoc = { ...newQueue[this.currentIndex()] };
      
      currentDoc.fields = currentDoc.fields.map(field => 
        field.id === id 
          ? { ...field, value: newValue, isEdited: true, confidence: 1.0 } 
          : field
      );
      
      newQueue[this.currentIndex()] = currentDoc;
      return newQueue;
    });
  }

  approveDocument(): void {
    console.log('Action: Human validation complete for document', this.currentDocument().id);
    this.processedCount.update(c => c + 1);
    this.advanceQueue();
  }

  skipDocument(): void {
    console.log('Action: Skipped document', this.currentDocument().id);
    this.skippedCount.update(c => c + 1);
    this.advanceQueue();
  }

  private advanceQueue(): void {
    if (this.currentIndex() + 1 < this.reviewQueue().length) {
      // Move to next document instantly
      this.currentIndex.update(i => i + 1);
    } else {
      // Completed the queue! Trigger Inbox Zero sequence
      this.isComplete.set(true);
    }
  }

  goBack(): void {
    this.router.navigate(['/']);
  }
}

import { Component, computed, signal, ElementRef, ViewChild, HostListener, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { DocumentPreview } from './document-preview/document-preview';
import { DocumentCard } from './document-card/document-card';
import { SearchFilters } from './search-filters/search-filters';
import { DocumentService } from '../home/document.service';

export interface SearchDocument {
  id: string;
  type: string;
  entity: string; // Provider, Client, etc.
  keyMetric: string; // E.g., '$4,500.00', '12 Meses', 'Aprobado'
  date: Date;
  status: 'Procesado' | 'Requiere Revisión' | 'Error';
  confidence: number;
  highlightText?: string;
  analysis?: {key: string, value: string}[];
}

export type SortOption = 'newest' | 'oldest' | 'highestValue' | 'highestConfidence';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, FormsModule, DocumentPreview, DocumentCard, SearchFilters],
  templateUrl: './search.component.html',
  styleUrl: './search.component.scss',
  animations: [
    trigger('listAnimation', [
      transition('* <=> *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(20px)' }),
          stagger('50ms', [
            animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
          ])
        ], { optional: true }),
        query(':leave', [
          animate('200ms ease-in', style({ opacity: 0, transform: 'scale(0.95)' }))
        ], { optional: true })
      ])
    ])
  ]
})
export class SearchComponent {
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  @HostListener('window:keydown', ['$event'])
  handleGlobalSearchShortcut(event: KeyboardEvent): void {
    const isCmdOrCtrl = event.metaKey || event.ctrlKey;
    if (isCmdOrCtrl && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      if (this.searchInput) {
        this.searchInput.nativeElement.focus();
      }
    }
  }
  
  // Base de datos Real
  allDocuments = signal<SearchDocument[]>([]);

  // State Signals
  searchQuery = signal('');
  currentDateFilter = signal<number | null>(null); // Number of days, null means 'All time'
  currentSortOption = signal<SortOption>('newest');
  selectedDocumentToPreview = signal<SearchDocument | null>(null);
  
  // Filters State
  filterTypes = signal<{ [key: string]: boolean }>({
    'Factura': true,
    'Contrato': true,
    'Recibo': true,
    'Formulario': true,
    'Documento de Identidad': true,
    'Otro': true,
    'Desconocido': true
  });

  // Helper function to extract numeric value from strings like "$ 4,500.00"
  private extractNumericValue(valueStr: string): number {
    const cleanStr = valueStr.replace(/[^0-9.-]+/g, "");
    const parsed = parseFloat(cleanStr);
    return isNaN(parsed) ? 0 : parsed;
  }

  // Method to safely highlight text using basic string replacement without complex Regex where possible
  highlightSearchTerm(text: string, term: string): string {
    if (!term || !text) return text;
    
    // We create a case-insensitive, simple replacement.
    // For a robust enterprise app, you'd use a trusted pipe/service, but this meets the 'simple' requirement.
    const searchRegex = new RegExp(`(${term.trim()})`, 'gi');
    return text.replace(searchRegex, `<mark class="bg-warning text-dark px-1 rounded-1">$1</mark>`);
  }

  togglePreviewPanel(doc: SearchDocument): void {
    if (this.selectedDocumentToPreview()?.id === doc.id) {
      this.selectedDocumentToPreview.set(null); // Close if already open
    } else {
      this.selectedDocumentToPreview.set(doc); // Open
    }
  }

  closePreviewPanel(): void {
    this.selectedDocumentToPreview.set(null);
  }

  // The "ElasticSearch" Core Engine (Computed)
  filteredResults = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const activeTypes = this.filterTypes();
    const activeDateFilter = this.currentDateFilter();
    const sortOption = this.currentSortOption();

    let results = this.allDocuments().filter(doc => {
      // 1. Type Filter Check
      if (!activeTypes[doc.type]) {
        return false;
      }

      // 2. Date Filter Check
      if (activeDateFilter !== null) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - activeDateFilter);
        if (doc.date < cutoffDate) {
          return false;
        }
      }

      // 3. Natural Language / Fuzzy Search Check
      if (query) {
        // Create a massive string blob of all searchable data for this document (simulating indexed text)
        const searchableBlob = `
          ${doc.type.toLowerCase()} 
          ${doc.entity.toLowerCase()} 
          ${doc.id.toLowerCase()}
          ${doc.keyMetric.toLowerCase()}
          ${doc.highlightText ? doc.highlightText.toLowerCase() : ''}
        `;
        
        // Simple token matching: User types "techcorp factura", we check if BOTH words exist in the blob
        const searchTokens = query.split(' ');
        const matchesAllTokens = searchTokens.every(token => searchableBlob.includes(token));
        
        if (!matchesAllTokens) {
          return false;
        }
      }

      return true;
    });

    // 4. Sort Results
    results.sort((a, b) => {
      if (sortOption === 'newest') {
        return b.date.getTime() - a.date.getTime();
      } else if (sortOption === 'oldest') {
        return a.date.getTime() - b.date.getTime();
      } else if (sortOption === 'highestConfidence') {
        return b.confidence - a.confidence;
      } else if (sortOption === 'highestValue') {
        const valA = this.extractNumericValue(a.keyMetric);
        const valB = this.extractNumericValue(b.keyMetric);
        return valB - valA;
      }
      return 0;
    });

    return results;
  });

  // Aggregation Computed Signals (for the Sidebar)
  aggregations = computed(() => {
    const activeDocs = this.filteredResults();
    
    // Calculate Total Financial Value from Facturas and Recibos
    const totalFinancialValue = activeDocs
      .filter(d => d.type === 'Factura' || d.type === 'Recibo')
      .reduce((sum, doc) => sum + this.extractNumericValue(doc.keyMetric), 0);

    return {
      totalFound: activeDocs.length,
      facturasCount: activeDocs.filter(d => d.type === 'Factura').length,
      contratosCount: activeDocs.filter(d => d.type === 'Contrato').length,
      recibosCount: activeDocs.filter(d => d.type === 'Recibo').length,
      formulariosCount: activeDocs.filter(d => d.type === 'Formulario').length,
      identidadesCount: activeDocs.filter(d => d.type === 'Documento de Identidad').length,
      otrosCount: activeDocs.filter(d => d.type === 'Otro').length,
      erroresCount: activeDocs.filter(d => d.type === 'Desconocido' || d.status === 'Error').length,
      totalFinancialValue: totalFinancialValue
    };
  });

  private documentService = inject(DocumentService);
  private router = inject(Router);

  constructor() {}

  ngOnInit() {
    this.documentService.getDocuments().subscribe({
      next: (docs) => {
        const srchDocs: SearchDocument[] = docs.map(d => {
           let state: 'Procesado' | 'Error' | 'Requiere Revisión' = 'Procesado';
           let docType = d.type || 'Desconocido';
           let friendlySummary = d.data?.summary || '';
           let kMetric = d.data?.total ? `$ ${d.data.total}` : (d.data?.invoice_number ? '#' + d.data.invoice_number : '');
           
           if (d.type === 'ERROR_MUNDIAL') {
               state = 'Error';
               docType = 'Fallo de Sistema';
               friendlySummary = '⚠️ El motor de Inteligencia Artificial no pudo procesar este archivo por restricciones de cuota o caídas temporales del servidor. Por favor, reinténtalo más tarde.';
               kMetric = 'Error de IA';
           } else if (d.type === 'Invalido_NoEsDocumento') {
               state = 'Error';
               docType = 'Archivo Inválido';
               friendlySummary = '🛑 El sistema de visión artificial determinó que esta imagen no corresponde a un documento corporativo, legal o de identidad válido (Posible fotografía personal o ilegible).';
               kMetric = 'Rechazado';
           } else if (d.data?.fraud_risk) {
               state = 'Requiere Revisión';
           }

           return {
             id: d.id || d.file_name,
             type: docType,
             entity: d.data?.nit || 'Sin identificar (< ' + d.tenant_id + ' >)',
             keyMetric: kMetric,
             date: new Date(d.created_at || Date.now()),
             status: state,
             confidence: state === 'Error' ? 0.0 : (state === 'Requiere Revisión' ? 0.6 : 0.99),
             highlightText: friendlySummary,
             analysis: d.data?.analysis || []
           };
        });
        
        // Populate the Engine
        this.allDocuments.set(srchDocs);
      },
      error: console.error
    });
  }

  toggleTypeFilter(type: string): void {
    this.filterTypes.update(current => ({
      ...current,
      [type]: !current[type]
    }));
  }

  setDateFilter(days: number | null): void {
    this.currentDateFilter.set(days);
  }

  setSortOption(option: SortOption): void {
    this.currentSortOption.set(option);
  }

  goBack(): void {
    this.router.navigate(['/']);
  }
}

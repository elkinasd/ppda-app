import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface DocumentData {
  nit?: string;
  invoice_number?: string;
  total?: number;
  summary?: string;
  fraud_risk?: boolean;
  analysis?: {key: string, value: string}[];
}

export interface DocumentItem {
  id: string;
  tenant_id: string;
  file: string;
  file_name: string;
  type: string;
  created_at: string;
  data?: DocumentData;
}

@Injectable({
  providedIn: 'root'
})
export class DocumentService {
  private readonly API_URL = 'http://localhost:3001/api/documents'; // ppda-backend service

  constructor(private http: HttpClient) {}

  getDocuments(): Observable<DocumentItem[]> {
    return this.http.get<any>(this.API_URL).pipe(
      map(response => response.data || [])
    );
  }

  getPendingCount(): Observable<number> {
    return this.http.get<any>(`${this.API_URL}/pending`).pipe(
      map(response => response.count || 0)
    );
  }
}

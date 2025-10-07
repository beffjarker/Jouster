import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { EmailFile, EmailListResponse, ParsedEmail } from '../pages/emails/emails.component';

@Injectable({
  providedIn: 'root'
})
export class EmailService {
  private readonly API_BASE_URL = '/api'; // Use relative URL to match current host and port

  constructor(private http: HttpClient) {}

  async listEmails(pageSize: number = 100, marker?: string): Promise<EmailListResponse> {
    let params = new HttpParams()
      .set('pageSize', pageSize.toString());

    if (marker) {
      params = params.set('marker', marker);
    }

    try {
      const response = await firstValueFrom(
        this.http.get<EmailListResponse>(
          `${this.API_BASE_URL}/emails`,
          { params }
        )
      );

      return response || { files: [], totalCount: 0, hasMore: false };
    } catch (error) {
      console.error('Error fetching emails:', error);
      throw new Error('Failed to fetch emails from server');
    }
  }

  async parseEmail(key: string): Promise<ParsedEmail> {
    try {
      const response = await firstValueFrom(
        this.http.get<ParsedEmail>(
          `${this.API_BASE_URL}/emails/${encodeURIComponent(key)}/parse`
        )
      );

      if (!response) {
        throw new Error('No response received from server');
      }

      return response;
    } catch (error) {
      console.error('Error parsing email:', error);
      throw new Error('Failed to parse email content');
    }
  }

  async getDownloadUrl(key: string): Promise<string> {
    try {
      const response = await firstValueFrom(
        this.http.get<{ downloadUrl: string }>(
          `${this.API_BASE_URL}/emails/${encodeURIComponent(key)}/download`
        )
      );

      return response?.downloadUrl || '';
    } catch (error) {
      console.error('Error getting download URL:', error);
      throw new Error('Failed to generate download link');
    }
  }

  async getEmailContent(key: string): Promise<string> {
    try {
      const response = await firstValueFrom(
        this.http.get(
          `${this.API_BASE_URL}/emails/${encodeURIComponent(key)}/content`,
          { responseType: 'text' }
        )
      );

      return response || '';
    } catch (error) {
      console.error('Error getting email content:', error);
      throw new Error('Failed to fetch email content');
    }
  }
}

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EmailService } from '../../services/email.service';

export interface EmailFile {
  key: string;
  lastModified: string;
  size: number;
  displayName: string;
  subject?: string; // Add subject field
  loadingSubject?: boolean; // Track loading state for subject
}

export interface EmailListResponse {
  files: EmailFile[];
  totalCount: number;
  hasMore: boolean;
  nextMarker?: string;
}

export interface ParsedEmail {
  subject: string;
  from: string;
  to: string[];
  date: string;
  body: string;
  headers: { [key: string]: string };
}

@Component({
  selector: 'app-emails',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './emails.component.html',
  styleUrls: ['./emails.component.scss']
})
export class EmailsComponent implements OnInit {
  emails: EmailFile[] = [];
  loading = false;
  error: string | null = null;

  // Email display state
  displayingEmail: EmailFile | null = null;
  parsedEmail: ParsedEmail | null = null;
  loadingEmail = false;
  emailError: string | null = null;

  // Pagination settings
  currentPage = 1;
  pageSize = 100;
  totalPages = 0;
  totalEmails = 0;
  hasMore = false;

  // Pagination constraints
  readonly MIN_PAGE_SIZE = 10;
  readonly MAX_PAGE_SIZE = 500;

  // For S3 pagination
  private continuationTokens: { [page: number]: string } = {};

  constructor(private emailService: EmailService) {}

  ngOnInit(): void {
    this.loadEmails();
  }

  async loadEmails(page: number = 1): Promise<void> {
    this.loading = true;
    this.error = null;
    this.currentPage = page;

    try {
      const marker = page > 1 ? this.continuationTokens[page] : undefined;
      const response = await this.emailService.listEmails(this.pageSize, marker);

      this.emails = response.files;
      this.totalEmails = response.totalCount;
      this.hasMore = response.hasMore;

      // Store continuation token for next page
      if (response.hasMore && response.nextMarker) {
        this.continuationTokens[page + 1] = response.nextMarker;
      }

      // Calculate total pages (approximate for S3)
      this.totalPages = this.hasMore ? page + 1 : page;

      // Load subjects for emails
      this.loadEmailSubjects(this.emails);

    } catch (error) {
      this.error = 'Failed to load emails. Please try again.';
      console.error('Error loading emails:', error);
    } finally {
      this.loading = false;
    }
  }

  private async loadEmailSubjects(emails: EmailFile[]): Promise<void> {
    for (const email of emails) {
      if (!email.subject) {
        email.loadingSubject = true;
        try {
          const parsedEmail = await this.emailService.parseEmail(email.key);
          email.subject = parsedEmail.subject;
        } catch (error) {
          console.error('Error parsing email for subject:', error);
        } finally {
          email.loadingSubject = false;
        }
      }
    }
  }

  onPageSizeChange(): void {
    // Validate page size
    if (this.pageSize < this.MIN_PAGE_SIZE) {
      this.pageSize = this.MIN_PAGE_SIZE;
    } else if (this.pageSize > this.MAX_PAGE_SIZE) {
      this.pageSize = this.MAX_PAGE_SIZE;
    }

    // Reset to first page when page size changes
    this.currentPage = 1;
    this.continuationTokens = {};
    this.loadEmails(1);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.loadEmails(page);
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.goToPage(this.currentPage - 1);
    }
  }

  nextPage(): void {
    if (this.hasMore || this.currentPage < this.totalPages) {
      this.goToPage(this.currentPage + 1);
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString();
  }

  async displayEmail(email: EmailFile): Promise<void> {
    this.loadingEmail = true;
    this.emailError = null;
    this.displayingEmail = email;
    this.parsedEmail = null;

    try {
      const parsedEmail = await this.emailService.parseEmail(email.key);
      this.parsedEmail = parsedEmail;
    } catch (error) {
      console.error('Error parsing email:', error);
      this.emailError = 'Failed to parse email content. Please try again.';
    } finally {
      this.loadingEmail = false;
    }
  }

  closeEmailDisplay(): void {
    this.displayingEmail = null;
    this.parsedEmail = null;
    this.emailError = null;
  }

  async downloadEmail(email: EmailFile): Promise<void> {
    try {
      const url = await this.emailService.getDownloadUrl(email.key);
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error downloading email:', error);
      // Could show a toast notification here
    }
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    const start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    const end = Math.min(start + maxVisible - 1, this.totalPages);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  }

  trackByKey(index: number, email: EmailFile): string {
    return email.key;
  }
}

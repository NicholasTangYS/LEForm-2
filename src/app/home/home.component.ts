// src/app/home/home.component.ts
import { Component, effect } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../auth/auth.service';
import { catchError, Observable, tap, throwError, finalize } from 'rxjs';
import { baseUrl } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';

// Define a type for our processing jobs for better type safety
interface ProcessingJob {
  name: string;
  task: () => Promise<any>;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent {
  private apiUrl = baseUrl;
  isLoading = false;
  taxFile: File | null = null;
  shareholderFile: File | null = null;
  financialsFile: File | null = null;
  c5File: File | null = null;
  SRFile: File | null = null;
  userID: any;
  taxFileName = '';
  shareholderFileName = '';
  financialsFileName = '';
  c5FileName = '';
  SRFileName = '';

  // State for handling failures
  showFailureModal = false;
  failedRequests: (ProcessingJob & { reason: string })[] = [];
  successfulResponses: any[] = [];

  readonly API_BASE_URL = 'https://asia-southeast1-fusioneta-test.cloudfunctions.net/AI-Invoice-Parser/';
  readonly ENDPOINTS = {
    tax: 'tax-document-parser',
    c3: 'c3',
    c4: 'c4',
    c5: 'c5',
    c9: 'c9',
    financials: 'financial-statement',
    partb: 'partb',
    c10: 'c10',
    c11: 'c11'
  };

  constructor(private router: Router,
    private auth: AuthService,
    private http: HttpClient
  ) {
    effect(() => {
      this.userID = this.auth.getUserId();
      console.log(this.userID);
    });
  }

  cancel() {
    this.router.navigate(['/reports']);
  }

  logout() {
    this.auth.logout();
  }

  onFileSelected(event: Event, fileType: string): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      if (fileType === 'tax') {
        this.taxFile = file;
        this.taxFileName = file.name;
      } else if (fileType === 'shareholder') {
        this.shareholderFile = file;
        this.shareholderFileName = file.name;
      } else if (fileType === 'financials') {
        this.financialsFile = file;
        this.financialsFileName = file.name;
      } else if (fileType === 'c5') {
        this.c5File = file;
        this.c5FileName = file.name;
      } else if (fileType === 'sr') {
        this.SRFile = file;
        this.SRFileName = file.name;
      }
    }
  }

  removeFile(fileType: string): void {
    if (fileType === 'tax') {
      this.taxFile = null;
      this.taxFileName = '';
    } else if (fileType === 'shareholder') {
      this.shareholderFile = null;
      this.shareholderFileName = '';
    } else if (fileType === 'financials') {
      this.financialsFile = null;
      this.financialsFileName = '';
    } else if (fileType === 'c5') {
      this.c5File = null;
      this.c5FileName = '';
    } else if (fileType === 'sr') {
      this.SRFile = null;
      this.SRFileName = '';
    }
  }

  async callParserApi(file: File, endpoint: string): Promise<any> {
    const fullApiUrl = this.API_BASE_URL + endpoint;
    const formData = new FormData();
    formData.append('file', file, file.name);

    console.log(`Sending ${file.name} to ${fullApiUrl}`);

    try {
      const response = await fetch(fullApiUrl, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      let responseText = await response.text();
      if (responseText.startsWith('```json') && responseText.endsWith('```')) {
        responseText = responseText.substring(7, responseText.length - 3).trim();
      }

      const result = JSON.parse(responseText);
      console.log(`Parsed data for ${file.name}:`, result);
      return result;

    } catch (error) {
      console.error(`Error parsing ${file.name}:`, error);
      throw error;
    }
  }

  callTaxSummaryApi(file: File): Promise<any> {
    // This is a mock function, for a real scenario, implement it like callParserApi
    return this.callParserApi(file, this.ENDPOINTS.tax);
  }

  async processFiles() {
    if (!this.taxFile && !this.shareholderFile && !this.financialsFile && !this.c5File && !this.SRFile) {
      alert('Please upload at least one file to process.');
      return;
    }

    this.isLoading = true;
    this.successfulResponses = []; // Clear previous results
    this.failedRequests = [];      // Clear previous failures

    const jobs: ProcessingJob[] = [];

    if (this.taxFile) {
      jobs.push({ name: `Tax Summary (${this.taxFile.name})`, task: () => this.callTaxSummaryApi(this.taxFile!) });
    }
    if (this.shareholderFile) {
      jobs.push({ name: `Annual Return C3 (${this.shareholderFile.name})`, task: () => this.callParserApi(this.shareholderFile!, this.ENDPOINTS.c3) });
      jobs.push({ name: `Annual Return C4 (${this.shareholderFile.name})`, task: () => this.callParserApi(this.shareholderFile!, this.ENDPOINTS.c4) });
    }
    if (this.financialsFile) {
      jobs.push({ name: `Financials Statements (${this.financialsFile.name})`, task: () => this.callParserApi(this.financialsFile!, this.ENDPOINTS.financials) });
      jobs.push({ name: `Financials Part C9 (${this.financialsFile.name})`, task: () => this.callParserApi(this.financialsFile!, this.ENDPOINTS.c9) });
    }
    if (this.c5File) {
      jobs.push({ name: `Annexure C5 (${this.c5File.name})`, task: () => this.callParserApi(this.c5File!, this.ENDPOINTS.c5) });
    }
    if (this.SRFile) {
      jobs.push({ name: `SR Part B (${this.SRFile.name})`, task: () => this.callParserApi(this.SRFile!, this.ENDPOINTS.partb) });
      jobs.push({ name: `SR Part C10 (${this.SRFile.name})`, task: () => this.callParserApi(this.SRFile!, this.ENDPOINTS.c10) });
      jobs.push({ name: `SR Part C11 (${this.SRFile.name})`, task: () => this.callParserApi(this.SRFile!, this.ENDPOINTS.c11) });
    }

    const results = await Promise.allSettled(jobs.map(job => job.task()));

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        this.successfulResponses.push(result.value);
      } else {
        this.failedRequests.push({
          ...jobs[index],
          reason: result.reason.message || 'An unknown error occurred.'
        });
      }
    });

    this.isLoading = false;

    if (this.failedRequests.length > 0) {
      this.showFailureModal = true;
    } else {
      this.proceedWithData(this.successfulResponses);
    }
  }

  async retryFailedRequests() {
    this.showFailureModal = false;
    this.isLoading = true;

    const jobsToRetry = [...this.failedRequests];
    this.failedRequests = []; // Clear the list for the new attempt

    const retryPromises = jobsToRetry.map(job => job.task());
    const results = await Promise.allSettled(retryPromises);

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        this.successfulResponses.push(result.value); // Add new successes
      } else {
        this.failedRequests.push({ // Add back to failed list if it fails again
          ...jobsToRetry[index],
          reason: result.reason.message || 'An unknown error occurred.'
        });
      }
    });

    this.isLoading = false;

    if (this.failedRequests.length > 0) {
      alert('Some documents still failed to process. Please review.');
      this.showFailureModal = true;
    } else {
      this.proceedWithData(this.successfulResponses);
    }
  }

  proceedIgnoringFailures() {
    this.showFailureModal = false;
    if (this.successfulResponses.length === 0) {
      alert("No documents were processed successfully. Cannot proceed.");
      return;
    }
    this.proceedWithData(this.successfulResponses);
  }

  private _formatDate(date: Date): string {
    const year = date.getFullYear();
    // Month is 0-indexed, so add 1 and pad to 2 digits
    const month = String(date.getMonth() + 1).padStart(2, '0');
    // Day of the month, pad to 2 digits
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  }

  proceedWithData(responses: any[]) {
    this.isLoading = true;
    const combinedData = Object.assign({}, ...responses);
    const today = new Date();
    const submissionDate = this._formatDate(today);
    const yearEnd = (combinedData.Accounting_Period_To_Day && combinedData.Accounting_Period_To_Month && combinedData.Accounting_Period_To_Year)
      ? `${combinedData.Accounting_Period_To_Year}-${combinedData.Accounting_Period_To_Month}-${combinedData.Accounting_Period_To_Day}`
      : submissionDate;

    const body = {
      userId: this.userID,
      name: combinedData.Company_Name || "Untitled Project",
      status: 1,
      year_end: yearEnd,
      data: combinedData
    };

    console.log("Proceeding with combined data:", body);
    this.createProject(body).subscribe({
      error: (err: Error) => {
        console.error('Final project creation failed:', err);
        alert(`Could not create the project: ${err.message}`);
      }
    });
  }

  createProject(body: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/createProject`, body).pipe(
      tap((res: any) => {
        console.log('API Success - Project created:', res);
        const projectId = res.projectId ;
        
        // Use the service to set the ID
        this.auth.setProjectId(projectId);

        // Navigate without passing state in the URL
        this.router.navigate(['/form']);
      }),
      catchError(error => {
        console.error('API Error - Failed to create project:', error);
        return throwError(() => new Error(
          error.error?.message || error.statusText || 'An unknown error occurred during project creation.'
        ));
      }),
      finalize(() => {
        this.isLoading = false; // Always turn off loader when the process is complete
      })
    );
  }
}
// src/app/home/home.component.ts
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent {
  isLoading = false;
  taxFile: File | null = null;
  shareholderFile: File | null = null;
  financialsFile: File | null = null;
  c5File: File | null = null;

  taxFileName = '';
  shareholderFileName = '';
  financialsFileName = '';
  c5FileName = '';

  // --- MOCK API FUNCTIONS (as provided in the original script) ---
  readonly API_BASE_URL = 'https://asia-southeast1-fusioneta-test.cloudfunctions.net/AI-Invoice-Parser/';
  readonly ENDPOINTS = {
      tax: 'tax-document-parser',
      c3: 'c3',
      c4: 'c4',
      c5: 'c5',
      financials: 'financial-statement'
  };

  constructor(private router: Router) {}

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
      console.log('Calling Tax Summary API with file:', file.name);
      return new Promise(resolve => {
          setTimeout(() => {
              const mockResponse = {
                  "Company_Name": "EVOTECH CO., LTD.", "Company_Registration_No": "LL14599",
                  "Year_of_Assessment_1": "2", "Year_of_Assessment_2": "0", "Year_of_Assessment_3": "2", "Year_of_Assessment_4": "4",
                  "B1_Activities_0_Amount_of_Net_Loss": "25586.28", "B6_Tax_Payable": "0.00"
              };
              resolve(mockResponse);
          }, 1500);
      });
  }

  callShareholderApi(file: File): Promise<any> {
      console.log('Calling Shareholder API with file:', file.name);
      return new Promise(resolve => {
          setTimeout(() => {
              const mockResponse = {
                  "Compliance_Officers_0_Name": "John Doe", "Compliance_Officers_0_Designation": "Director",
                  "Major_Shareholders_0_Name_of_Shareholder_Partner": "Jane Smith", "Major_Shareholders_0_Direct_Shareholding_Percentage": "60.5",
                  "Beneficial_Owners_0_Name": "Emily White"
              };
              resolve(mockResponse);
          }, 2000);
      });
  }


  async processFiles() {
    if (!this.taxFile && !this.shareholderFile && !this.financialsFile) {
      alert('Please upload at least one file to process.');
      return;
    }

    this.isLoading = true;
    const apiPromises: Promise<any>[] = [];

    if (this.taxFile) {
      apiPromises.push(this.callTaxSummaryApi(this.taxFile));
    }
    if (this.shareholderFile) {
      apiPromises.push(this.callParserApi(this.shareholderFile, this.ENDPOINTS.c3));
      apiPromises.push(this.callParserApi(this.shareholderFile, this.ENDPOINTS.c4));
    }
    if (this.financialsFile) {
      apiPromises.push(this.callParserApi(this.financialsFile, this.ENDPOINTS.financials));
    }
    if (this.c5File) {
      apiPromises.push(this.callParserApi(this.c5File, this.ENDPOINTS.c5));
    }

    try {
      const responses = await Promise.all(apiPromises);
      const combinedData = Object.assign({}, ...responses);

      // Navigate to the form component, passing the data in the router's state
      this.router.navigate(['/form'], { state: { formData: combinedData } });

    } catch (error) {
      console.error('An error occurred during file processing:', error);
      alert('An error occurred. Please try again.');
      this.isLoading = false;
    }
  }
}
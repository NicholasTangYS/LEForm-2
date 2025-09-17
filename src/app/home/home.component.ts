// src/app/home/home.component.ts
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'] // We'll create this CSS file
})
export class HomeComponent {
  isLoading = false;

  // --- MOCK API FUNCTIONS (as provided in the original script) ---
  readonly API_BASE_URL = 'https://asia-southeast1-fusioneta-test.cloudfunctions.net/AI-Invoice-Parser/';
  readonly ENDPOINTS = {
      tax: 'tax-document-parser',
      shareholder: 'shareholder-document-parser',
      financials: 'financial-statement'
  };

  constructor(private router: Router) {}

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


  async processFiles(taxInput: HTMLInputElement, shareholderInput: HTMLInputElement, financialsInput: HTMLInputElement) {
    const taxFile = taxInput.files?.[0];
    const shareholderFile = shareholderInput.files?.[0];
    const financialsFile = financialsInput.files?.[0];

    if (!taxFile && !shareholderFile && !financialsFile) {
      alert('Please upload at least one file to process.');
      return;
    }

    this.isLoading = true;
    const apiPromises: Promise<any>[] = [];

    if (taxFile) {
      apiPromises.push(this.callTaxSummaryApi(taxFile));
    }
    if (shareholderFile) {
      apiPromises.push(this.callShareholderApi(shareholderFile));
    }
    if (financialsFile) {
      apiPromises.push(this.callParserApi(financialsFile, this.ENDPOINTS.financials));
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
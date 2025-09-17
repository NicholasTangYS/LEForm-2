// src/app/form/form.component.ts
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { forkJoin, lastValueFrom } from 'rxjs';
import { PDFDocument } from 'pdf-lib';
import { saveAs } from 'file-saver';

@Component({
  selector: 'app-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule],
  templateUrl: './form.component.html',
  styleUrls: ['./form.component.scss']
})
export class FormComponent implements OnInit {
  le1Form: FormGroup;
  initialFormData: any;
  isLoading: boolean = false;

  constructor(
    private router: Router,
    private fb: FormBuilder,
    private http: HttpClient
  ) {
    // Initialize an empty form group. It will be populated dynamically.
    this.le1Form = this.fb.group({});

    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras.state && navigation.extras.state['formData']) {
      this.initialFormData = navigation.extras.state['formData'];
    } else {
      console.warn('No form data received. Redirecting to home.');
      // Uncomment the line below to redirect if no data is present
      // this.router.navigate(['/home']);
    }
  }

  ngOnInit(): void {
    if (this.initialFormData) {
      // Dynamically create form controls based on the keys in the received data
      const formControls: { [key: string]: any } = {};
      for (const key in this.initialFormData) {
        if (Object.prototype.hasOwnProperty.call(this.initialFormData, key)) {
          formControls[key] = [this.initialFormData[key] || ''];
        }
      }
      this.le1Form = this.fb.group(formControls);
      console.log('Form initialized with data:', this.le1Form.value);
    }
  }

  async generatePdf(): Promise<void> {
    if (this.le1Form.invalid) {
      // This check is basic. Add more specific validation as needed.
      alert('The form is invalid. Please check all fields.');
      return;
    }
    this.isLoading = true;

    try {
      // Load PDF template and mapping file from the assets folder
      const assets = await lastValueFrom(forkJoin({
        pdfTemplateBytes: this.http.get('contohbn_le1-2025-asas-tahun-semasa-_1 (2) (1) (1).pdf', { responseType: 'arraybuffer' }),
        mapping: this.http.get<any>('data_mapping.json')
      }));

      const { pdfTemplateBytes, mapping } = assets;

      if (!pdfTemplateBytes || !mapping) {
        throw new Error("Failed to load PDF assets from the 'assets' folder.");
      }

      const pdfDoc = await PDFDocument.load(pdfTemplateBytes);
      const pages = pdfDoc.getPages();
      const formValues = this.le1Form.value;
      console.log('Form values to populate PDF:', formValues);

      for (const fieldName in formValues) {
        if (Object.prototype.hasOwnProperty.call(formValues, fieldName)) {
            const value = formValues[fieldName];
            // Check if value exists and there's a mapping for it
            if (value && mapping[fieldName]) {
              const coords = mapping[fieldName];
              const page = pages[coords.page];
              if (page) {
                const { height } = page.getSize();
                // pdf-lib's y-coordinate starts from the bottom, so we invert it.
                // const y = height - coords.y;

                page.drawText(String(value), {
                  x: coords.x,
                  y: coords.y,
                  size: coords.size || 12,
                });
              }
            }
        }
      }

      const pdfBytes = await pdfDoc.save();

      // Type assertion to treat the buffer as a plain ArrayBuffer
      const arrayBuffer = pdfBytes.buffer as ArrayBuffer;

      const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
      saveAs(blob, 'LE1_completed.pdf');

    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('An error occurred while generating the PDF. Check the console for details.');
    } finally {
      this.isLoading = false;
    }
  }
}
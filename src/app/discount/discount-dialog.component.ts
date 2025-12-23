import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { baseUrl } from '../../environments/environment';

@Component({
  selector: 'app-discount-dialog',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  template: `
    <h2 mat-dialog-title>{{ data.mode === 'add' ? 'Add New' : 'Edit' }} Discount</h2>
    <mat-dialog-content>
      <form [formGroup]="discountForm" class="discount-form">
        <mat-form-field appearance="outline">
          <mat-label>Code</mat-label>
          <input matInput formControlName="code" placeholder="e.g. SUMMER20">
          <mat-error *ngIf="discountForm.get('code')?.invalid">Required</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Description</mat-label>
          <input matInput formControlName="description" placeholder="Description of the discount">
        </mat-form-field>

        <div class="row">
          <mat-form-field appearance="outline">
            <mat-label>Type</mat-label>
            <mat-select formControlName="discountType">
              <mat-option value="PERCENTAGE">Percentage (%)</mat-option>
              <mat-option value="FIXED_AMOUNT">Fixed Amount (RM)</mat-option>
              <mat-option value="BONUS_CREDITS">Bonus Credits</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Value</mat-label>
            <input matInput type="number" formControlName="discountValue">
            <mat-error *ngIf="discountForm.get('discountValue')?.invalid">Required</mat-error>
          </mat-form-field>
        </div>

        <div class="row">
          <mat-form-field appearance="outline">
            <mat-label>Min Purchase (RM)</mat-label>
            <input matInput type="number" formControlName="minPurchaseAmount">
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Max Discount (RM)</mat-label>
            <input matInput type="number" formControlName="maxDiscountAmount">
          </mat-form-field>
        </div>

        <div class="row">
          <mat-form-field appearance="outline">
            <mat-label>Usage Limit (Total)</mat-label>
            <input matInput type="number" formControlName="usageLimit" placeholder="Optional">
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Usage Per User</mat-label>
            <input matInput type="number" formControlName="usagePerUser">
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline">
          <mat-label>Valid Until</mat-label>
          <input matInput type="date" formControlName="validUntil">
          
        </mat-form-field>
      </form>
      <p *ngIf="errorMessage" class="error-text">{{errorMessage}}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="primary" [disabled]="discountForm.invalid || isSaving" (click)="onSave()">
        {{ isSaving ? 'Saving...' : 'Save' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .discount-form {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding-top: 1rem;
    }
    .row {
      display: flex;
      gap: 1rem;
      mat-form-field {
        flex: 1;
      }
    }
    .error-text {
      color: #ef4444;
      font-size: 0.875rem;
      margin-top: 1rem;
    }
    mat-form-field {
      width: 100%;
    }
  `]
})
export class DiscountDialogComponent implements OnInit {
  discountForm: FormGroup;
  isSaving = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    public dialogRef: MatDialogRef<DiscountDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.discountForm = this.fb.group({
      code: ['', Validators.required],
      description: [''],
      discountType: ['PERCENTAGE', Validators.required],
      discountValue: [0, [Validators.required, Validators.min(0)]],
      minPurchaseAmount: [0],
      maxDiscountAmount: [null],
      usageLimit: [null],
      usagePerUser: [1, Validators.required],
      validUntil: [null]
    });
  }

  ngOnInit(): void {
    if (this.data.mode === 'edit' && this.data.discount) {
      const d = this.data.discount;
      this.discountForm.patchValue({
        code: d.code,
        description: d.description,
        discountType: d.discount_type,
        discountValue: d.discount_value,
        minPurchaseAmount: d.min_purchase_amount,
        maxDiscountAmount: d.max_discount_amount,
        usageLimit: d.usage_limit,
        usagePerUser: d.usage_per_user,
        validUntil: d.valid_until ? new Date(d.valid_until) : null
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.discountForm.invalid) return;

    this.isSaving = true;
    this.errorMessage = '';
    const val = this.discountForm.value;

    // Convert date to MySQL format
    const formattedDate = val.validUntil ? new Date(val.validUntil).toISOString().slice(0, 19).replace('T', ' ') : null;
    const body = { ...val, validUntil: formattedDate };

    const request = this.data.mode === 'add'
      ? this.http.post(`${baseUrl}/api/discount-codes`, body)
      : this.http.put(`${baseUrl}/api/discount-codes/${this.data.discount.id}`, body);

    request.subscribe({
      next: () => {
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.isSaving = false;
        this.errorMessage = err.error?.message || 'Error saving discount code';
      }
    });
  }
}

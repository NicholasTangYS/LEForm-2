import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';

// Define an interface for the data you pass in
export interface ConfirmDialogData {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true, // ⬅️ This is the key change for standalone
  imports: [
    CommonModule,
    MatDialogModule, // ⬅️ IMPORTED DIRECTLY HERE
    MatButtonModule  // ⬅️ AND THE BUTTON MODULE HERE
  ],
  templateUrl: './confirm-dialog.component.html',
  styleUrls: ['./confirm-dialog.component.scss']
})
export class ConfirmDialogComponent {

  constructor(
    public dialogRef: MatDialogRef<ConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData
  ) {}

  onConfirm(): void {
    // Close the dialog and pass 'true' as the result (Confirmed)
    this.dialogRef.close(true);
  }

  onCancel(): void {
    // Close the dialog and pass 'false' as the result (Canceled)
    this.dialogRef.close(false);
  }
}
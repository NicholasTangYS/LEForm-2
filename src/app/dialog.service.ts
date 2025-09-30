import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { ConfirmDialogComponent, ConfirmDialogData } from './confirm-dialog/confirm-dialog.component';

@Injectable({
  providedIn: 'root'
})
export class DialogService {

  constructor(private dialog: MatDialog) { }

  /**
   * Opens the confirmation dialog and returns an Observable that emits true (confirmed) or false (canceled).
   */
  confirm(data: ConfirmDialogData): Observable<boolean> {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: data,
      width: '400px',
      // hasBackdrop: true, 
     
    hasBackdrop: true, 
      disableClose: true, // Prevent closing by clicking outside or pressing ESC
      panelClass: 'blurred-dialog-panel' 
    });

    return dialogRef.afterClosed();
  }
}
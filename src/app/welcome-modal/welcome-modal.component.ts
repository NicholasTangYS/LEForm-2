import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
    selector: 'app-welcome-modal',
    standalone: true,
    imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
    templateUrl: './welcome-modal.component.html',
    styleUrls: ['./welcome-modal.component.scss']
})
export class WelcomeModalComponent {
    constructor(public dialogRef: MatDialogRef<WelcomeModalComponent>) { }

    close(): void {
        this.dialogRef.close();
    }
}

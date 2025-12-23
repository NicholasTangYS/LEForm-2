import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { baseUrl } from '../../environments/environment';
import { DiscountDialogComponent } from './discount-dialog.component';

@Component({
    selector: 'app-discount',
    standalone: true,
    imports: [
        CommonModule,
        HttpClientModule,
        FormsModule,
        MatTableModule,
        MatIconModule,
        MatButtonModule,
        MatDialogModule,
        DiscountDialogComponent
    ],
    templateUrl: './discount.component.html',
    styleUrls: ['./discount.component.scss']
})
export class DiscountComponent implements OnInit {
    displayedColumns: string[] = ['code', 'type', 'value', 'status', 'actions'];
    dataSource = new MatTableDataSource<any>([]);
    searchTerm: string = '';

    constructor(private http: HttpClient, private dialog: MatDialog) { }

    ngOnInit(): void {
        this.loadDiscountCodes();
    }

    loadDiscountCodes(): void {
        this.http.get<any[]>(`${baseUrl}/api/discount-codes`).subscribe({
            next: (data) => {
                this.dataSource.data = data;
            },
            error: (err) => {
                console.error('Error loading discount codes:', err);
            }
        });
    }

    applyFilter(event: Event): void {
        const filterValue = (event.target as HTMLInputElement).value;
        this.dataSource.filter = filterValue.trim().toLowerCase();
    }

    openAddDialog(): void {
        const dialogRef = this.dialog.open(DiscountDialogComponent, {
            width: '500px',
            data: { mode: 'add' }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this.loadDiscountCodes();
            }
        });
    }

    openEditDialog(element: any): void {
        const dialogRef = this.dialog.open(DiscountDialogComponent, {
            width: '500px',
            data: { mode: 'edit', discount: element }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this.loadDiscountCodes();
            }
        });
    }

    toggleActive(element: any): void {
        const newStatus = !element.is_active;
        this.http.patch(`${baseUrl}/api/discount-codes/${element.id}/toggle-active`, {
            is_active: newStatus
        }).subscribe({
            next: () => {
                element.is_active = newStatus;
            },
            error: (err) => {
                console.error('Error toggling status:', err);
            }
        });
    }
}

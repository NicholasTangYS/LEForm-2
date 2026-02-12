import { Component, OnInit, effect } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../auth/auth.service';
import { baseUrl } from '../../environments/environment';
import { FormsModule } from '@angular/forms';

export interface Transaction {
    id: number;
    type: string;
    amount: string;
    balanceAfter: string;
    description: string;
    referenceType: string | null;
    referenceId: string | number | null;
    paymentMethod: string | null;
    discountCode: string | null;
    createdAt: string;
    project_name?: string;
    project_year_end?: string;
}

@Component({
    selector: 'app-transactions',
    standalone: true,
    imports: [CommonModule, CurrencyPipe, DatePipe, FormsModule],
    templateUrl: './transaction.component.html',
    styleUrl: './transaction.component.scss'
})
export class TransactionComponent implements OnInit {
    private apiUrl = baseUrl;
    userID: string | null = null;
    isLoading: boolean = false;

    allTransactions: Transaction[] = [];
    filteredTransactions: Transaction[] = [];
    paginatedTransactions: Transaction[] = [];

    // Pagination
    currentPage: number = 1;
    itemsPerPage: number = 10;
    totalPages: number = 1;

    // Filters/Search
    searchQuery: string = '';
    typeFilter: string = 'all';

    protected Math = Math;

    constructor(
        private http: HttpClient,
        private router: Router,
        private auth: AuthService
    ) {
        effect(() => {
            this.userID = this.auth.getUserId();
            if (this.userID) {
                this.loadTransactions();
            }
        });
    }

    ngOnInit(): void { }

    loadTransactions(): void {
        if (!this.userID) return;
        this.isLoading = true;

        // Use a large limit to get "all" and then paginate locally like ReportsComponent
        this.http.get<any>(`${this.apiUrl}/api/credits/transactions/${this.userID}?limit=1000`).subscribe({
            next: (res) => {
                this.allTransactions = res.transactions || [];
                this.filterAndPaginateTransactions();
            },
            error: (err) => {
                console.error('Error fetching transactions:', err);
            },
            complete: () => {
                this.isLoading = false;
            }
        });
    }

    filterAndPaginateTransactions(): void {
        let filtered = [...this.allTransactions];

        // Apply Type Filter
        if (this.typeFilter !== 'all') {
            filtered = filtered.filter(tx => tx.type === this.typeFilter);
        }

        // Apply Search
        if (this.searchQuery) {
            const q = this.searchQuery.toLowerCase();
            filtered = filtered.filter(tx =>
                tx.description.toLowerCase().includes(q) ||
                (tx.project_name && tx.project_name.toLowerCase().includes(q))
            );
        }

        this.filteredTransactions = filtered;
        this.totalPages = Math.ceil(this.filteredTransactions.length / Number(this.itemsPerPage));

        if (this.currentPage > this.totalPages) {
            this.currentPage = Math.max(1, this.totalPages);
        }

        const startIndex = (this.currentPage - 1) * Number(this.itemsPerPage);
        const endIndex = startIndex + Number(this.itemsPerPage);
        this.paginatedTransactions = this.filteredTransactions.slice(startIndex, endIndex);
    }

    onSearch(): void {
        this.currentPage = 1;
        this.filterAndPaginateTransactions();
    }

    onFilterChange(): void {
        this.currentPage = 1;
        this.filterAndPaginateTransactions();
    }

    onPageChange(page: number): void {
        this.currentPage = page;
        this.filterAndPaginateTransactions();
    }

    onItemsPerPageChange(): void {
        this.currentPage = 1;
        this.filterAndPaginateTransactions();
    }

    formatDate(date: string): string {
        if (!date) return '';
        return new Date(date).toLocaleString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        }).replace(',', '').toUpperCase();
    }

    getAmountClass(tx: Transaction): string {
        return tx.type === 'DEDUCTION' ? 'negative' : 'positive';
    }

    getTypeLabel(type: string): string {
        switch (type) {
            case 'DEDUCTION': return 'Deduction';
            case 'BONUS': return 'Bonus';
            case 'PURCHASE': return 'Top-up';
            case 'REFUND': return 'Refund';
            default: return type;
        }
    }

    goBack(): void {
        this.router.navigate(['/dashboard']);
    }

    trackByTx(index: number, tx: Transaction): number {
        return tx.id;
    }
}

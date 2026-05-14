import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { baseUrl } from '../../../environments/environment';
import { AuthService } from '../../auth/auth.service';
import { DialogService } from '../../dialog.service';

interface TargetUser {
    id: number;
    email: string;
    name: string;
    balance: number;
}

interface ManualGrant {
    id: number;
    target_email: string;
    target_name: string;
    granter_email: string;
    tokens: string;
    payment_method: string;
    reference_no: string;
    notes: string;
    created_at: string;
}

@Component({
    selector: 'app-manual-topup',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatButtonModule,
        MatCheckboxModule,
        MatProgressSpinnerModule
    ],
    templateUrl: './manual-topup.component.html',
    styleUrls: ['./manual-topup.component.scss']
})
export class ManualTopupComponent implements OnInit {
    // --- form state ---
    searchQuery = '';                  // accepts user ID OR email
    isSearching = false;
    searchError = '';
    targetUser: TargetUser | null = null;

    tokens = 10;
    paymentMethod: 'BANK_TRANSFER' | 'DUITNOW' | 'CASH' | 'FPX_OFFLINE' | 'CHEQUE' | 'OTHER' = 'BANK_TRANSFER';
    referenceNo = '';
    notes = '';
    sendReceipt = false;

    isSubmitting = false;
    submitError = '';

    // --- audit log ---
    recentGrants: ManualGrant[] = [];
    isLoadingGrants = false;

    paymentMethods = [
        { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
        { value: 'DUITNOW',       label: 'DuitNow' },
        { value: 'CASH',          label: 'Cash' },
        { value: 'FPX_OFFLINE',   label: 'FPX (Offline)' },
        { value: 'CHEQUE',        label: 'Cheque' },
        { value: 'OTHER',         label: 'Other' }
    ];

    constructor(
        private http: HttpClient,
        private auth: AuthService,
        private dialogService: DialogService
    ) {}

    ngOnInit(): void {
        this.loadRecentGrants();
    }

    get granterUserId(): number | null {
        const id = this.auth.getUserId();
        return id ? Number(id) : null;
    }

    get canSubmit(): boolean {
        return !!this.targetUser
            && this.tokens > 0
            && !!this.paymentMethod
            && this.referenceNo.trim().length > 0
            && !this.isSubmitting;
    }

    get newBalancePreview(): number {
        if (!this.targetUser) return 0;
        return parseFloat(this.targetUser.balance.toString()) + parseFloat(this.tokens.toString());
    }

    // -----------------------------------------------------------
    // User lookup — accepts either a numeric ID or an email
    // -----------------------------------------------------------
    async searchUser(): Promise<void> {
        const q = this.searchQuery.trim();
        if (!q) return;

        this.isSearching = true;
        this.searchError = '';
        this.targetUser = null;

        try {
            // Resolve to a user ID first
            let userId: number | null = null;
            if (/^\d+$/.test(q)) {
                userId = parseInt(q, 10);
            } else {
                // Treat as email — admin lookup endpoint
                const res: any = await this.http
                    .get(`${baseUrl}/api/admin/users/lookup`, {
                        params: { email: q, grantedByUserId: this.granterUserId?.toString() ?? '' }
                    })
                    .toPromise();
                if (res && res.userID) {
                    userId = Number(res.userID);
                }
            }

            if (!userId) {
                this.searchError = 'User not found';
                return;
            }

            // Fetch details + balance in parallel
            const [detailsRes, balanceRes]: any = await Promise.all([
                this.http.get<any[]>(`${baseUrl}/getUserDetails/${userId}`).toPromise(),
                this.http.get(`${baseUrl}/api/credits/balance/${userId}`).toPromise()
            ]);

            if (!detailsRes || detailsRes.length === 0) {
                this.searchError = 'User not found';
                return;
            }

            this.targetUser = {
                id: userId,
                email: detailsRes[0].email,
                name: detailsRes[0].Name,
                balance: parseFloat(balanceRes?.balance ?? '0')
            };
        } catch (err: any) {
            console.error('User search failed:', err);
            this.searchError = err?.error?.message || 'Failed to look up user';
        } finally {
            this.isSearching = false;
        }
    }

    clearTarget(): void {
        this.targetUser = null;
        this.searchQuery = '';
    }

    // -----------------------------------------------------------
    // Submit grant
    // -----------------------------------------------------------
    async submitGrant(): Promise<void> {
        if (!this.canSubmit || !this.targetUser || !this.granterUserId) return;

        // Confirmation prompt — manual grants are irreversible
        const confirmed = await this.dialogService.confirm({
            title: 'Confirm manual grant',
            message: `Grant ${this.tokens} tokens to ${this.targetUser.name} (${this.targetUser.email})?\n\nNew balance will be ${this.newBalancePreview}.\n\nThis action is logged and cannot be undone.`,
            confirmText: 'Yes, grant tokens',
            cancelText: 'Cancel'
        }).toPromise();

        if (!confirmed) return;

        this.isSubmitting = true;
        this.submitError = '';

        try {
            const res: any = await this.http.post(`${baseUrl}/api/admin/credits/grant`, {
                targetUserId: this.targetUser.id,
                tokens: this.tokens,
                paymentMethod: this.paymentMethod,
                referenceNo: this.referenceNo.trim(),
                notes: this.notes.trim() || undefined,
                sendReceipt: this.sendReceipt,
                grantedByUserId: this.granterUserId
            }).toPromise();

            if (res?.success) {
                this.dialogService.alert(
                    `Granted ${res.creditsAdded} tokens to ${res.targetUser.email}.\nNew balance: ${res.newBalance}\nLedger ID: ${res.ledgerId}`,
                    'Grant Successful'
                ).subscribe();
                this.resetForm();
                this.loadRecentGrants();
            } else {
                this.submitError = res?.message || 'Grant failed';
            }
        } catch (err: any) {
            console.error('Manual grant error:', err);
            this.submitError = err?.error?.message || err?.message || 'Grant failed';
        } finally {
            this.isSubmitting = false;
        }
    }

    private resetForm(): void {
        this.targetUser = null;
        this.searchQuery = '';
        this.tokens = 10;
        this.paymentMethod = 'BANK_TRANSFER';
        this.referenceNo = '';
        this.notes = '';
        this.sendReceipt = false;
    }

    // -----------------------------------------------------------
    // Recent grants (audit trail)
    // -----------------------------------------------------------
    async loadRecentGrants(): Promise<void> {
        if (!this.granterUserId) return;
        this.isLoadingGrants = true;
        try {
            const res: any = await this.http.get(`${baseUrl}/api/admin/credits/manual-grants`, {
                params: {
                    grantedByUserId: this.granterUserId.toString(),
                    limit: '20'
                }
            }).toPromise();
            this.recentGrants = res?.grants ?? [];
        } catch (err) {
            console.error('Failed to load manual grants:', err);
            this.recentGrants = [];
        } finally {
            this.isLoadingGrants = false;
        }
    }

    increaseTokens(): void {
        this.tokens++;
    }

    decreaseTokens(): void {
        if (this.tokens > 1) this.tokens--;
    }
}

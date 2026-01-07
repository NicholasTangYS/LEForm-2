import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { HttpClient } from '@angular/common/http';
import { environment, baseUrl } from '../../environments/environment';

import { DialogService } from '../dialog.service';
import { loadStripe, Stripe, StripeElements, StripePaymentElement } from '@stripe/stripe-js';

export interface TopUpDialogData {
    userId: number;
    currentBalance: number;
}

@Component({
    selector: 'app-topup-modal',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MatDialogModule,
        MatButtonModule,
        MatInputModule,
        MatFormFieldModule
    ],
    templateUrl: './topup-modal.component.html',
    styleUrls: ['./topup-modal.component.scss']
})
export class TopupModalComponent {
    tokens: number = 10;
    pricePerToken: number = 20; // USD per token
    discountCode: string = '';
    isProcessing: boolean = false;
    errorMessage: string = '';
    discountApplied: any = null;
    isValidatingCode: boolean = false;

    // Stripe properties
    private stripe: Stripe | null = null;
    private elements: StripeElements | null = null;
    private paymentElement: StripePaymentElement | null = null;
    showStripeElement: boolean = false;
    stripeReady: boolean = false;
    stripeErrorMessage: string = '';
    private stripePublishableKey: string = environment.stripePublishableKey;

    constructor(
        public dialogRef: MatDialogRef<TopupModalComponent>,
        @Inject(MAT_DIALOG_DATA) public data: TopUpDialogData,
        private http: HttpClient,
        private dialogService: DialogService
    ) { }

    get totalAmount(): number {
        return this.tokens * this.pricePerToken;
    }

    get finalAmount(): number {
        if (this.discountApplied) {
            return parseFloat(this.discountApplied.finalAmount);
        }
        return this.totalAmount;
    }

    get discountAmount(): number {
        if (this.discountApplied) {
            return parseFloat(this.discountApplied.discountAmount);
        }
        return 0;
    }

    get bonusCredits(): number {
        if (this.discountApplied) {
            return parseFloat(this.discountApplied.bonusCredits || 0);
        }
        return 0;
    }

    async initiateStripeCheckout(): Promise<void> {
        this.isProcessing = true;
        this.errorMessage = '';
        this.stripeErrorMessage = '';

        // If amount is 0 (fully discounted), skip Stripe and process directly
        if (this.finalAmount === 0) {
            await this.processFreeTopup();
            return;
        }

        try {


            // Step 1: Create Payment Intent on backend
            const response: any = await this.http.post(`${baseUrl}/api/payment/stripe/create-payment-intent`, {
                userId: this.data.userId,
                tokens: this.tokens,
                amount: this.finalAmount,
                discountCode: this.discountCode || undefined
            }).toPromise();

            const clientSecret = response.clientSecret;

            // Step 2: Initialize Stripe
            this.stripe = await loadStripe(this.stripePublishableKey, {
                developerTools: {
                    assistant: {
                        enabled: false
                    }
                }
            } as any);
            if (!this.stripe) throw new Error('Failed to load Stripe SDK');

            const appearance = { theme: 'stripe' as const };
            this.elements = this.stripe.elements({ clientSecret, appearance });

            // Step 3: Create and mount Payment Element
            this.paymentElement = this.elements.create('payment');
            this.paymentElement.mount('#payment-element');

            this.paymentElement.on('change', (event: any) => {
                this.stripeReady = event.complete;
                if (event.error) {
                    this.stripeErrorMessage = event.error.message || '';
                }
            });

            this.showStripeElement = true;
        } catch (error: any) {
            console.error('Stripe initialization failed:', error);
            this.errorMessage = error.error?.message || error.message || 'Failed to initialize payment. Please try again.';
        } finally {
            this.isProcessing = false;
        }
    }

    async confirmStripePayment(): Promise<void> {
        if (!this.stripe || !this.elements) return;

        this.isProcessing = true;
        this.stripeErrorMessage = '';

        const result = await this.stripe.confirmPayment({
            elements: this.elements,
            confirmParams: {
                // Return URL for FPX or other redirected payments
                return_url: window.location.origin + '/reports'
            },
            // Use this if you want to handle the result without a redirect for cards
            redirect: 'if_required'
        });

        if (result.error) {
            // This point will only be reached if there is an immediate error when confirming the payment
            this.stripeErrorMessage = result.error.message || 'Payment failed';
            this.isProcessing = false;
        } else if (result.paymentIntent && result.paymentIntent.status === 'succeeded') {
            // The payment has been processed!
            try {
                // Now explicitly tell the backend to fulfill the credits
                const confirmResponse: any = await this.http.post(`${baseUrl}/api/payment/stripe/confirm-payment`, {
                    paymentIntentId: result.paymentIntent.id
                }).toPromise();

                if (confirmResponse.success) {
                    this.dialogRef.close({ success: true });
                    this.dialogService.alert(
                        `Payment processed successfully! Your credits have been updated. New balance: ${confirmResponse.newBalance}`,
                        'Payment Successful!'
                    ).subscribe();
                } else {
                    throw new Error(confirmResponse.message || 'Fulfillment verification failed');
                }
            } catch (confirmErr: any) {
                console.error('Fulfillment error:', confirmErr);
                this.stripeErrorMessage = 'Payment was successful, but we had trouble updating your credits. Our team will verify this manually. Ref: ' + result.paymentIntent.id;
                this.isProcessing = false;
            }
        }
    }

    async processFreeTopup(): Promise<void> {
        try {
            const freeTxId = `FREE_${this.data.userId}_${Date.now()}`;
            const purchaseResponse: any = await this.http.post(`${baseUrl}/api/credits/purchase`, {
                userId: this.data.userId,
                amount: this.tokens,
                paymentMethod: 'FREE',
                paymentTransactionId: freeTxId,
                discountCode: this.discountCode || undefined
            }).toPromise();

            // Success!
            this.dialogRef.close({ success: true });
            this.dialogService.alert(
                `Successfully applied ${purchaseResponse.creditsAdded} credits! Your new balance is ${purchaseResponse.newBalance}.`,
                'Top-up Successful!'
            ).subscribe();
        } catch (error: any) {
            console.error('Free top-up failed:', error);
            this.errorMessage = error.error?.message || error.message || 'Processing failed. Please try again.';
        } finally {
            this.isProcessing = false;
        }
    }

    validateDiscountCode(): void {
        if (!this.discountCode.trim()) {
            this.discountApplied = null;
            return;
        }

        this.isValidatingCode = true;
        this.errorMessage = '';

        this.http.post(`${baseUrl}/api/discount-codes/validate`, {
            code: this.discountCode,
            userId: this.data.userId,
            purchaseAmount: this.totalAmount
        }).subscribe({
            next: (response: any) => {
                if (response.valid) {
                    this.discountApplied = response.discount;
                } else {
                    this.errorMessage = response.message || 'Invalid discount code';
                    this.discountApplied = null;
                }
                this.isValidatingCode = false;
            },
            error: (error) => {
                this.errorMessage = error.error?.message || 'Failed to validate discount code';
                this.discountApplied = null;
                this.isValidatingCode = false;
            }
        });
    }

    onCancel(): void {
        if (this.showStripeElement) {
            this.showStripeElement = false;
            this.stripeReady = false;
            if (this.paymentElement) {
                this.paymentElement.unmount();
                this.paymentElement = null;
            }
        } else {
            this.dialogRef.close({ success: false });
        }
    }

    increaseTokens(): void {
        this.tokens++;
        this.validateDiscountCode();
    }

    onTokenChange(): void {
        if (this.tokens < 10) {
            this.tokens = 10;
        }
        this.validateDiscountCode();
    }

    decreaseTokens(): void {
        if (this.tokens > 10) {
            this.tokens--;
            this.validateDiscountCode();
        }
    }
}

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

interface Step {
    title: string;
    description: string;
    image: string;
    link?: string;
}

@Component({
    selector: 'app-how-it-works-modal',
    standalone: true,
    imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
    templateUrl: './how-it-works-modal.component.html',
    styleUrls: ['./how-it-works-modal.component.scss']
})
export class HowItWorksModalComponent {
    currentStep = 0;

    steps: Step[] = [
        {
            title: 'Upload & Analyze',
            description: 'Create a new report by uploading your file. Our system will automatically extract all necessary information from your document.',
            image: 'assets/how-it-work/2.png'
        },
        {
            title: 'Review & Copy JSON',
            description: 'Review the extracted data and complete any necessary fields. Once ready, click the "Copy JSON" button to copy the formatted result.',
            image: 'assets/how-it-work/3.png'
        },
        {
            title: 'Install Extension',
            description: 'Add our Chrome Extension to your browser. This extension allows you to magically auto-fill forms on supported portals.',
            image: 'assets/how-it-work/4.png',
            link: 'https://chromewebstore.google.com/detail/kmjdhgfbbhjbehbjdhjnogefpcabjhil?utm_source=item-share-cb'
        },
        {
            title: 'Portal Login',
            description: 'Navigate to the MyTax portal (MyTax -> Taef -> e-Borang) to access the LE form portal where you want to auto-fill the data.',
            image: 'assets/how-it-work/5.png'
        },
        {
            title: 'Paste & Start',
            description: 'Open our extension in your browser, paste the JSON you copied earlier, and click "Start". Watch as the form fields are populated.',
            image: 'assets/how-it-work/6.png'
        },
        {
            title: 'Check & Sign',
            description: 'Carefully verify all auto-filled data on the portal before signing. Ensure everything is accurate and complete.',
            image: 'assets/how-it-work/7.png'
        }
    ];

    constructor(public dialogRef: MatDialogRef<HowItWorksModalComponent>) { }

    nextStep() {
        if (this.currentStep < this.steps.length - 1) {
            this.currentStep++;
        }
    }

    prevStep() {
        if (this.currentStep > 0) {
            this.currentStep--;
        }
    }

    goToStep(index: number) {
        this.currentStep = index;
    }

    close() {
        this.dialogRef.close();
    }
}

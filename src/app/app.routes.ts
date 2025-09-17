import { Routes } from '@angular/router';
import { FormComponent } from './form/form.component';
import { HomeComponent } from './home/home.component';

export const routes: Routes = [
    { path: 'home', component: HomeComponent },
    { path: 'form', component: FormComponent },
    { path: '', redirectTo: '/home', pathMatch: 'full' } // Default route
];

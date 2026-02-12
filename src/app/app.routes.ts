import { RouterModule, Routes } from '@angular/router';
import { FormComponent } from './form/form.component';
import { HomeComponent } from './home/home.component';
import { NgModule } from '@angular/core';
import { LoginComponent } from './login/login.component';
import { AuthGuard } from './auth/auth.guard';
import { ReportsComponent } from './reports/reports.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { SettingsComponent } from './settings/settings.component';
import { DiscountComponent } from './discount/discount.component';
import { CanDeactivateGuard } from './auth/can-deactivate.guard';
import { TransactionComponent } from './transactions/transaction.component';
import { TermsComponent } from './terms/terms.component';
import { PrivacyComponent } from './privacy/privacy.component';

export const routes: Routes = [
  { path: 'home', component: HomeComponent, canActivate: [AuthGuard] },
  { path: 'form', component: FormComponent, canActivate: [AuthGuard], canDeactivate: [CanDeactivateGuard] },
  { path: 'login', component: LoginComponent },
  { path: 'reports', component: ReportsComponent, canActivate: [AuthGuard], canDeactivate: [CanDeactivateGuard] },
  { path: 'transactions', component: TransactionComponent, canActivate: [AuthGuard] },
  { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard] },
  { path: 'settings', component: SettingsComponent, canActivate: [AuthGuard] },
  { path: 'discount', component: DiscountComponent, canActivate: [AuthGuard] },
  { path: 'terms', component: TermsComponent },
  { path: 'privacy', component: PrivacyComponent },
  { path: '', redirectTo: '/login', pathMatch: 'full' } // Default route
];
@NgModule({
  imports: [RouterModule.forRoot(routes, {
    // This will re-enable a simple browser scroll to the fragment
    anchorScrolling: 'enabled',
    // And this will restore the scroll position on back/forward navigation
    scrollPositionRestoration: 'enabled'
  })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
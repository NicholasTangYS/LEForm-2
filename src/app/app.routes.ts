import { RouterModule, Routes } from '@angular/router';
import { FormComponent } from './form/form.component';
import { HomeComponent } from './home/home.component';
import { NgModule } from '@angular/core';
import { LoginComponent } from './login/login.component';
import { AuthGuard } from './auth/auth.guard';

export const routes: Routes = [
    { path: 'home', component: HomeComponent,  canActivate: [AuthGuard] },
    { path: 'form', component: FormComponent, canActivate: [AuthGuard] },
    { path: 'login', component: LoginComponent },
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
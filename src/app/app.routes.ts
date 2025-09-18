import { RouterModule, Routes } from '@angular/router';
import { FormComponent } from './form/form.component';
import { HomeComponent } from './home/home.component';
import { NgModule } from '@angular/core';

export const routes: Routes = [
    { path: 'home', component: HomeComponent },
    { path: 'form', component: FormComponent },
    { path: '', redirectTo: '/home', pathMatch: 'full' } // Default route
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
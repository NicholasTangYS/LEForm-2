import { Component, effect } from '@angular/core';
import { NavigationEnd, Router, RouterModule, RouterOutlet } from '@angular/router';
import { IdleService } from './auth/idle.service';
import { filter } from 'rxjs';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { AuthService } from './auth/auth.service';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button'; // for the buttons
import { DialogService } from './dialog.service';
import { HttpClient } from '@angular/common/http';
import { baseUrl } from '../environments/environment';
// ... add to @NgModule imports and exports

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet,
    CommonModule,  
    RouterModule,
    MatDialogModule, // ⬅️ Add this here
    MatButtonModule 
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
    private apiUrl = baseUrl;
  title = 'ng';
  userID: any;
  username: any;
  isLoginPage = false;
  constructor(private idle: IdleService,
    private router: Router,
     private auth: AuthService,
     private dialogService: DialogService,

         private http: HttpClient,
  ) {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.isLoginPage = event.urlAfterRedirects === '/login';
      });

       effect(() => {
            this.userID = this.auth.userId();
            if (this.userID) {
              this.loadUserData();
            } else {
              // Clear user data on logout
              this.username = null;
            }
          });
  }
  isCollapsed = false;

  loadUserData(): void {
    // this.isLoading = true;
    this.http.get<any>(`${this.apiUrl}/getUserDetails/${this.userID}`).subscribe({
      next: (userData) => {
        if(userData.length>0){
          this.username= userData[0].Name
        }
        // this.settingsForm.patchValue(userData[0]);
      },
      error: (err) => {
        console.error('Failed to load user data:', err);
        alert('Could not load your profile data. Please try again later.');
      },
      
    });
  }

  toggleSidebar() {
    this.isCollapsed = !this.isCollapsed;
  }
  logout() {
    const dialogData = {
      title: 'Confirm Logout',
      message: `Are you sure you want to logout?`,
      confirmText: 'Yes',
      cancelText: 'No, stay login'
    };

    // Open the dialog and subscribe to the result
    this.dialogService.confirm(dialogData)
      .subscribe(result => {
        if (result) {
          // User confirmed - proceed with the action
          this.auth.logout();
          // Your delete logic here
        } else {
          // User canceled
          console.log('Deletion canceled.');
        }
      });
    
    // this.router.navigate(['/login']);
  }
}

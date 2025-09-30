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
  title = 'ng';
  userID: any;
  isLoginPage = false;
  constructor(private idle: IdleService,
    private router: Router,
     private auth: AuthService,
     private dialogService: DialogService
  ) {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.isLoginPage = event.urlAfterRedirects === '/login';
      });

       effect(() => {
            this.userID = this.auth.getUserId();
            if (this.userID) {
             console.log(this.userID)
            }
          });
  }
  isCollapsed = false;

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

import { Component, effect } from '@angular/core';
import { NavigationEnd, Router, RouterModule, RouterOutlet } from '@angular/router';
import { IdleService } from './auth/idle.service';
import { filter } from 'rxjs';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { AuthService } from './auth/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet,
    CommonModule,  
    RouterModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'ng';
  userID: any;
  isLoginPage = false;
  constructor(private idle: IdleService,
    private router: Router,
     private auth: AuthService
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
    this.auth.logout();
    // this.router.navigate(['/login']);
  }
}

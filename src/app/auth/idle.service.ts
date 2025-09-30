// src/app/auth/idle.service.ts
import { Injectable, NgZone } from '@angular/core';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class IdleService {
  private idleTimeout: any;
  private warningTimeout: any;
  private idleDuration = 24 * 60 * 60 * 1000; // 1day
  private warningDuration = 1 * 60 * 1000; // 1 min before logout

  constructor(private auth: AuthService, private zone: NgZone) {
    this.init();
  }

  private init() {
    this.resetTimer();
    window.addEventListener('mousemove', () => this.resetTimer());
    window.addEventListener('keydown', () => this.resetTimer());
  }

  private resetTimer() {
    clearTimeout(this.idleTimeout);
    clearTimeout(this.warningTimeout);

    this.warningTimeout = setTimeout(() => {
      alert('You will be logged out soon due to inactivity.');
    }, this.idleDuration - this.warningDuration);

    this.idleTimeout = setTimeout(() => {
      this.auth.logout();
      alert('Session expired. Please log in again.');
    }, this.idleDuration);
  }
}

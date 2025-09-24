import { Component } from '@angular/core';
import { RouterModule, RouterOutlet } from '@angular/router';
import { IdleService } from './auth/idle.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet,
    RouterModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'ng';
  constructor(private idle: IdleService) {}
}

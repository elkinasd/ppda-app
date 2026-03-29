import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent {
  private router = inject(Router);
  private authService = inject(AuthService);

  goHome(): void {
    this.router.navigate(['/']);
  }

  goSearch(): void {
    this.router.navigate(['/search']);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}

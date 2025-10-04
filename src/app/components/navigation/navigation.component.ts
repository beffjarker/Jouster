import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

@Component({
  selector: 'app-navigation',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <nav class="navbar">
      <div class="nav-container">
        <div class="nav-logo">
          <a routerLink="/" class="logo-link">Jouster</a>
        </div>
        <ul class="nav-menu">
          <li class="nav-item">
            <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}" class="nav-link">
              Home
            </a>
          </li>
          <li class="nav-item">
            <a routerLink="/highlights" routerLinkActive="active" class="nav-link">
              Highlights
            </a>
          </li>
          <li class="nav-item">
            <a routerLink="/about" routerLinkActive="active" class="nav-link">
              About
            </a>
          </li>
          <li class="nav-item">
            <a routerLink="/contact" routerLinkActive="active" class="nav-link">
              Contact
            </a>
          </li>
        </ul>
      </div>
    </nav>
  `,
  styleUrls: ['./navigation.component.scss']
})
export class NavigationComponent {
  constructor(private router: Router) {}
}

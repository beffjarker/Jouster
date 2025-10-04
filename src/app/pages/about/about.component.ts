import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-container">
      <h1>About Jouster</h1>
      <div class="content-section">
        <h2>Our Mission</h2>
        <p>Jouster is built with modern Angular and Nx technologies to provide a robust foundation for your applications.</p>
      </div>
      <div class="content-section">
        <h2>Technology Stack</h2>
        <ul>
          <li>Angular 20.3</li>
          <li>Nx 21.6</li>
          <li>TypeScript 5.9</li>
          <li>SCSS for styling</li>
        </ul>
      </div>
    </div>
  `,
  styleUrls: ['./about.component.scss']
})
export class AboutComponent {
}

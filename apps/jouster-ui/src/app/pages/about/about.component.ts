import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PageTitleComponent } from '../../components/page-title/page-title.component';

@Component({
  selector: 'jstr-about',
  standalone: true,
  imports: [CommonModule, PageTitleComponent],
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.scss']
})
export class AboutComponent {
  readonly caspianBuildCheck: number = 42; // Changed from 'not a number' to a valid number
}
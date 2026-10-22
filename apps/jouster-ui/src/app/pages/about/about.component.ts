// apps/jouster-ui/src/app/pages/about/about.component.ts
import { Component } from '@angular/core';

@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.css']
})
export class AboutComponent {
  readonly caspianBuildCheck: number = 42; // Corrected type from string to number
}
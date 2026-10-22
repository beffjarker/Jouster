// Import necessary modules and components
import { Component } from '@angular/core';
import { JstrPageTitleComponent } from '../../shared/components/jstr-page-title/jstr-page-title.component';

@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.css'],
  imports: [JstrPageTitleComponent]
})
export class AboutComponent {
}

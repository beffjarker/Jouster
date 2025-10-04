import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NavigationComponent } from './components/navigation/navigation.component';

@Component({
  imports: [NavigationComponent, RouterModule],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected title = 'Jouster';
}

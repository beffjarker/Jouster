import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NavigationComponent } from './components/navigation/navigation.component';
import { HiddenLoginComponent } from './components/hidden-login/hidden-login.component';
import { environment } from '../environments/environment';

@Component({
  imports: [NavigationComponent, RouterModule, HiddenLoginComponent],
  selector: 'jstr-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  protected title = 'Jouster';

  ngOnInit(): void {
    // TODO: Consider moving to a version service for centralized version management
    console.log(`%c🎮 Jouster v${environment.version}`, 'color: #00ff00; font-weight: bold; font-size: 14px;');
    console.log(`%cEnvironment: ${environment.production ? 'Production' : 'Development'}`, 'color: #00aaff;');
  }
}

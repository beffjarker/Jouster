// Import necessary modules
import { NgModule, Component, Injectable } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class AuthService {}

@Component({
  selector: 'app-root',
  template: '<router-outlet></router-outlet>',
})
export class AppComponent {}

@NgModule({
  declarations: [],
  imports: [
    BrowserModule,
    HttpClientModule,
    AppComponent
  ],
  providers: [AuthService],
  bootstrap: [AppComponent]
})
export class AppModule { }

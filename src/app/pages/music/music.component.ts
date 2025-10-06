import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LastfmService, LastfmTrack, LastfmArtist, LastfmAlbum } from '../../services/lastfm.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'jstr-music',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './music.component.html',
  styleUrls: ['./music.component.scss']
})
export class MusicComponent implements OnInit {
  public recentTracks: Observable<LastfmTrack[]>;
  public topArtists: Observable<LastfmArtist[]>;
  public topAlbums: Observable<LastfmAlbum[]>;
  public userInfo: Observable<any>;

  public loadingTracks = true;
  public loadingArtists = true;
  public loadingAlbums = true;
  public loadingUserInfo = true;

  constructor(private lastfmService: LastfmService) {
    this.recentTracks = this.lastfmService.getRecentTracks();
    this.topArtists = this.lastfmService.getTopArtists();
    this.topAlbums = this.lastfmService.getTopAlbums();
    this.userInfo = this.lastfmService.getUserInfo();
  }

  public ngOnInit() {
    // Set loading states with delays to show progressive loading
    setTimeout(() => this.loadingTracks = false, 1000);
    setTimeout(() => this.loadingArtists = false, 1500);
    setTimeout(() => this.loadingAlbums = false, 2000);
    setTimeout(() => this.loadingUserInfo = false, 2500);
  }
}

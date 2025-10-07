import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  LastfmService,
  LastfmTrack,
  LastfmArtist,
  LastfmAlbum,
  ListeningHistoryAnalysis,
  YearlyStats,
  MonthlyTrend
} from '../../services/lastfm.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'jstr-music',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './music.component.html',
  styleUrls: ['./music.component.scss']
})
export class MusicComponent implements OnInit {
  // Music Player Data
  public recentTracks: Observable<LastfmTrack[]>;
  public topArtists: Observable<LastfmArtist[]>;
  public topAlbums: Observable<LastfmAlbum[]>;
  public userInfo: Observable<any>;

  // Listening History Analytics
  public analysisData: Observable<ListeningHistoryAnalysis>;

  // Loading States
  public loadingTracks = true;
  public loadingArtists = true;
  public loadingAlbums = true;
  public loadingUserInfo = true;
  public loadingAnalysis = true;

  // View State
  public activeTab: 'player' | 'history' | 'analytics' = 'player';

  constructor(private lastfmService: LastfmService) {
    // Music Player Data
    this.recentTracks = this.lastfmService.getRecentTracks(20);
    this.topArtists = this.lastfmService.getTopArtists('1month', 12);
    this.topAlbums = this.lastfmService.getTopAlbums('1month', 9);
    this.userInfo = this.lastfmService.getUserInfo();

    // Listening History Analytics
    this.analysisData = this.lastfmService.getListeningHistoryAnalysis();
  }

  public ngOnInit() {
    // Set loading states with progressive delays
    setTimeout(() => this.loadingTracks = false, 1000);
    setTimeout(() => this.loadingArtists = false, 1500);
    setTimeout(() => this.loadingAlbums = false, 2000);
    setTimeout(() => this.loadingUserInfo = false, 2500);
    setTimeout(() => this.loadingAnalysis = false, 3000);
  }

  // Tab Navigation
  public setActiveTab(tab: 'player' | 'history' | 'analytics') {
    this.activeTab = tab;
  }

  // Utility Methods from Listening History Component
  public getMonthName(month: number): string {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1] || 'Unknown';
  }

  public getRelativePercentage(value: number, trends: MonthlyTrend[]): number {
    const maxValue = Math.max(...trends.map(t => t.scrobbles));
    return (value / maxValue) * 100;
  }

  public getDurationText(durationInSeconds: number): string {
    const days = Math.floor(durationInSeconds / 86400);
    if (days === 1) return '1 day';
    if (days < 7) return `${days} days`;
    if (days < 30) return `${Math.floor(days / 7)} weeks`;
    if (days < 365) return `${Math.floor(days / 30)} months`;
    return `${Math.floor(days / 365)} years`;
  }

  // Format Methods for Display
  public formatPlaycount(count: number): string {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  }

  public formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  // TrackBy Methods for Performance
  public trackById(index: number, item: any): any {
    return item.name || index;
  }

  public trackByGenre(index: number, item: any): string {
    return item.genre || index;
  }
}

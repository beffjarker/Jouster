import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  LastfmService,
  ListeningHistoryAnalysis,
  YearlyStats,
  MonthlyTrend
} from '../../services/lastfm.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'jstr-listening-history',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './listening-history.component.html',
  styleUrls: ['./listening-history.component.scss']
})
export class ListeningHistoryComponent implements OnInit {
  public analysisData: Observable<ListeningHistoryAnalysis>;
  public loadingAnalysis = true;

  constructor(private lastfmService: LastfmService) {
    this.analysisData = this.lastfmService.getListeningHistoryAnalysis();
  }

  public ngOnInit() {
    // Set loading state with delay to show analysis process
    setTimeout(() => this.loadingAnalysis = false, 2000);
  }

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

  public getTotalUniqueArtists(yearlyStats: YearlyStats[]): number {
    return yearlyStats.reduce((total, year) => total + year.uniqueArtists, 0);
  }

  public getYearProgressPercent(year: any): number {
    // Calculate progress percentage for year display
    const maxScrobbles = Math.max(...this.analysisData ? [] : [year.scrobbles]);
    return (year.scrobbles / (maxScrobbles || 1)) * 100;
  }

  public getMonthBarHeight(month: any): number {
    // Calculate bar height for monthly trends
    return Math.min(month.averageScrobbles / 10, 100);
  }
}

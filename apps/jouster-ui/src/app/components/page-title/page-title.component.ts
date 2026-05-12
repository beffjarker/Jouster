import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { PageConfig } from '../../models/page-registry';

/**
 * Renders the page <h1> title from the route data registry.
 *
 * If the route's PageConfig has showTitleOnPage: true, the title is rendered.
 * If showTitleOnPage: false, nothing is rendered — the page manages its own headers.
 *
 * Usage: add <jstr-page-title></jstr-page-title> at the top of any page template.
 * The title value comes automatically from the PAGE_REGISTRY via Angular route data.
 */
@Component({
  selector: 'jstr-page-title',
  standalone: true,
  imports: [CommonModule],
  template: `
    <h1 *ngIf="config?.showTitleOnPage" class="page-title">
      {{ config?.title }}
    </h1>
  `,
  styles: [`
    .page-title {
      margin: 0 0 1rem 0;
    }
  `],
})
export class PageTitleComponent implements OnInit {
  config: PageConfig | undefined;

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.config = this.route.snapshot.data['pageConfig'];
  }
}


import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'jstr-fibonacci',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './fibonacci.component.html',
  styleUrls: ['./fibonacci.component.scss']
})
export class FibonacciComponent implements OnInit {
  // Core Fibonacci properties
  public sequenceLength = 15;
  public startA = 0;
  public startB = 1;
  public fibonacciSequence: number[] = [];
  public goldenRatio = (1 + Math.sqrt(5)) / 2;
  public currentRatio = 0;

  /** Sum of all terms in the current sequence. */
  public sequenceSum = 0;

  /** Largest value in the current sequence. */
  public largestTerm = 0;

  // Visual properties for spiral
  public spiralArcs: Array<{path: string, size: number}> = [];

  constructor() {}

  public ngOnInit(): void {
    this.generateSequence();
  }

  public generateSequence(): void {
    this.fibonacciSequence = [];

    if (this.sequenceLength >= 1) this.fibonacciSequence.push(this.startA);
    if (this.sequenceLength >= 2) this.fibonacciSequence.push(this.startB);

    for (let i = 2; i < this.sequenceLength; i++) {
      const prev1 = this.fibonacciSequence[i - 1];
      const prev2 = this.fibonacciSequence[i - 2];
      if (prev1 !== undefined && prev2 !== undefined) {
        const next = prev1 + prev2;
        this.fibonacciSequence.push(next);
      }
    }

    this.calculateProperties();
    this.generateSpiral();
  }

  public calculateGoldenRatio(): void {
    if (this.fibonacciSequence.length >= 2) {
      const lastIndex = this.fibonacciSequence.length - 1;
      const lastValue = this.fibonacciSequence[lastIndex];
      const prevValue = this.fibonacciSequence[lastIndex - 1];

      if (lastValue !== undefined && prevValue !== undefined && prevValue !== 0) {
        this.currentRatio = lastValue / prevValue;
      }
    }
  }

  public generateSpiral(): void {
    this.spiralArcs = [];
    let x = 200, y = 200;

    for (let i = 0; i < Math.min(8, this.fibonacciSequence.length); i++) {
      const fibValue = this.fibonacciSequence[i];
      if (fibValue !== undefined) {
        const fibSize = Math.min(fibValue * 2, 50);
        const arc = this.createArc(x, y, fibSize, i);
        this.spiralArcs.push(arc);

        // Update position for next arc based on Fibonacci spiral pattern
        switch (i % 4) {
          case 0: x += fibSize; break;
          case 1: y += fibSize; break;
          case 2: x -= fibSize; break;
          case 3: y -= fibSize; break;
        }
      }
    }
  }

  public createArc(x: number, y: number, size: number, index: number): {path: string, size: number} {
    const startAngle = (index % 4) * 90;
    const endAngle = startAngle + 90;

    const start = this.polarToCartesian(x, y, size, endAngle);
    const end = this.polarToCartesian(x, y, size, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

    const path = `M ${start.x} ${start.y} A ${size} ${size} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;

    return { path, size };
  }

  public polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number): {x: number, y: number} {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
      x: centerX + (radius * Math.cos(angleInRadians)),
      y: centerY + (radius * Math.sin(angleInRadians))
    };
  }

  public formatNumber(num: number): string {
    if (num > 1e13) {
      return num.toExponential(3);
    }
    return num.toLocaleString('en-US');
  }

  public getBarHeight(num: number): number {
    const maxHeight = 200;
    const maxValue = Math.max(...this.fibonacciSequence.slice(0, 15));
    return maxValue > 0 ? (num / maxValue) * maxHeight : 0;
  }

  public getBarColor(index: number): string {
    const colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#17a2b8', '#28a745', '#fd7e14'];
    const color = colors[index % colors.length];
    return color ?? '#667eea'; // Fallback color if undefined
  }

  public getSpiralColor(index: number): string {
    const colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#17a2b8', '#28a745', '#fd7e14', '#6f42c1'];
    const color = colors[index % colors.length];
    return color ?? '#667eea'; // Fallback color if undefined
  }

  public setClassicFibonacci(): void {
    this.startA = 0;
    this.startB = 1;
    this.sequenceLength = 15;
    this.generateSequence();
  }

  public setLucasNumbers(): void {
    this.startA = 2;
    this.startB = 1;
    this.sequenceLength = 15;
    this.generateSequence();
  }

  /** Sets the sequence to Tribonacci starting values (1, 1). */
  public setTribonacci(): void {
    this.startA = 1;
    this.startB = 1;
    this.sequenceLength = 15;
    this.generateSequence();
  }

  /** Recalculates derived mathematical properties from the current sequence. */
  public calculateProperties(): void {
    this.sequenceSum = this.getSequenceSum();
    this.largestTerm = this.fibonacciSequence.length > 0
      ? Math.max(...this.fibonacciSequence)
      : 0;
    this.calculateGoldenRatio();
  }

  /** Returns whether the ratio F(index)/F(index-1) approximates the golden ratio (φ). */
  public isGoldenRatioApproximation(index: number): boolean {
    if (index < 1 || index >= this.fibonacciSequence.length) return false;
    const current = this.fibonacciSequence[index];
    const previous = this.fibonacciSequence[index - 1];
    if (current === undefined || previous === undefined || previous === 0) return false;
    return Math.abs((current / previous) - this.goldenRatio) < 0.01;
  }

  public getSequenceSum(): number {
    return this.fibonacciSequence.reduce((sum, num) => sum + num, 0);
  }

  public getRatioConvergence(): number {
    if (this.fibonacciSequence.length < 2) return 0;
    const difference = Math.abs(this.currentRatio - this.goldenRatio);
    const maxDifference = 1;
    return Math.max(0, Math.min(100, ((maxDifference - difference) / maxDifference) * 100));
  }
}

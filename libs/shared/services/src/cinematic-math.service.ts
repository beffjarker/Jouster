import { Injectable } from '@angular/core';

// Mathematical constants and patterns inspired by "Ready Player One" with Aronofsky/Nolan fallbacks
export interface MathematicalConstant {
  name: string;
  value: number;
  description: string;
  filmReference: string;
  significance: string;
}

export interface SequencePattern {
  name: string;
  sequence: number[];
  description: string;
  filmContext: string;
}

@Injectable({
  providedIn: 'root'
})
export class CinematicMathService {

  // Constants from "Ready Player One" - OASIS mathematical foundations
  private readyPlayerOneConstants: MathematicalConstant[] = [
    {
      name: 'Golden Ratio (φ)',
      value: 1.6180339887498948,
      description: 'The divine proportion found in OASIS world design',
      filmReference: 'Ready Player One (2018) - Mathematical harmony in virtual world architecture',
      significance: 'Used in OASIS level design and Easter egg placement algorithms'
    },
    {
      name: 'Pi (π)',
      value: 3.141592653589793,
      description: 'The ratio essential for OASIS sphere calculations',
      filmReference: 'Ready Player One (2018) - Critical for spherical world generation',
      significance: 'Foundation for OASIS planetary physics and orbital mechanics'
    },
    {
      name: 'Euler\'s Number (e)',
      value: 2.718281828459045,
      description: 'The base of natural algorithms in OASIS AI',
      filmReference: 'Ready Player One (2018) - Powers exponential growth in user progression',
      significance: 'Core to OASIS economic systems and XP calculations'
    },
    {
      name: 'Planck Length',
      value: 1.616255e-35,
      description: 'The smallest measurable distance in OASIS physics',
      filmReference: 'Ready Player One (2018) - Quantum limit of virtual reality precision',
      significance: 'Defines the resolution limit of OASIS simulation'
    }
  ];

  // Ready Player One inspired mathematical patterns
  private readyPlayerOnePatterns: SequencePattern[] = [
    {
      name: 'OASIS User Growth',
      sequence: [1, 2, 4, 8, 16, 32, 64, 128, 256, 512], // Powers of 2 - exponential user growth
      description: 'Exponential growth pattern of OASIS user adoption',
      filmContext: 'Ready Player One (2018) - Billions of users in the OASIS virtual world'
    },
    {
      name: 'Halliday\'s Three Keys',
      sequence: [3, 9, 27, 81, 243], // Powers of 3 for three keys/gates
      description: 'Triple challenge progression in Halliday\'s contest',
      filmContext: 'Ready Player One (2018) - Three keys, three gates, three challenges'
    },
    {
      name: 'High Five Fibonacci',
      sequence: [5, 5, 10, 15, 25, 40, 65], // Fibonacci starting with 5 (High Five clan)
      description: 'Fibonacci sequence honoring the High Five clan',
      filmContext: 'Ready Player One (2018) - Wade\'s clan and their mathematical bond'
    },
    {
      name: 'IOI Corporate Hierarchy',
      sequence: [1, 6, 36, 216, 1296], // Powers of 6 (hexagonal corporate structure)
      description: 'Corporate power structure growth pattern',
      filmContext: 'Ready Player One (2018) - IOI\'s systematic approach to controlling OASIS'
    },
    {
      name: '80s Nostalgia Sequence',
      sequence: [1980, 1981, 1982, 1983, 1984, 1985, 1986, 1987, 1988, 1989], // The 1980s decade
      description: 'Chronological progression through Halliday\'s favorite decade',
      filmContext: 'Ready Player One (2018) - James Halliday\'s obsession with 1980s culture'
    }
  ];

  // Fallback patterns from Aronofsky films when Ready Player One content isn't enough
  private aronofskyPatterns: SequencePattern[] = [
    {
      name: 'Pi Obsession Sequence',
      sequence: [2, 1, 6, 2, 1, 6, 2, 1, 6], // Max Cohen's 216 pattern
      description: 'Max Cohen\'s mathematical obsession with patterns',
      filmContext: 'Pi (1998) - The 216-digit number that drives Max to mathematical madness'
    },
    {
      name: 'Black Swan Perfection',
      sequence: [1, 1, 2, 3, 5, 8, 13, 21], // Fibonacci - natural perfection
      description: 'The mathematical pursuit of artistic perfection',
      filmContext: 'Black Swan (2010) - Nina\'s obsessive pursuit of flawless performance'
    },
    {
      name: 'Requiem Addiction Spiral',
      sequence: [1, 4, 10, 20, 35, 56], // Tetrahedral numbers - escalating spiral
      description: 'Mathematical representation of addiction escalation',
      filmContext: 'Requiem for a Dream (2000) - The escalating spiral of addiction'
    }
  ];

  // Fallback patterns from Christopher Nolan films
  private nolanPatterns: SequencePattern[] = [
    {
      name: 'Memento Memory Fragments',
      sequence: [1, 2, 3, 5, 8, 13, 21, 34, 55, 89], // Fibonacci with memory theme
      description: 'Fragmented memory reconstruction sequence',
      filmContext: 'Memento (2000) - Leonard\'s fragmented memory creates mathematical patterns'
    },
    {
      name: 'Inception Dream Levels',
      sequence: [1, 4, 16, 64, 256], // Powers of 4 for time dilation
      description: 'Time dilation through nested dream architecture',
      filmContext: 'Inception (2010) - Each dream level multiplies time by 4'
    },
    {
      name: 'Interstellar Time Equation',
      sequence: [1, 7, 23, 61, 168], // Time ratios from relativity
      description: 'Relativistic time progression across planets',
      filmContext: 'Interstellar (2014) - Miller\'s planet: 1 hour = 7 Earth years'
    }
  ];

  // Ready Player One specific numbers with cultural significance
  private readyPlayerOneNumbers = {
    oasisFoundation: 2025, // When OASIS was created
    hallidayContest: 540000000000, // The prize money in dollars
    highFive: 5, // Wade's clan number
    threeKeys: 3, // Number of keys in the contest
    threeGates: 3, // Number of gates to pass
    eighties: 1980, // Halliday's favorite decade start
    questCompletion: 2045, // When Wade wins the contest
    ioi: 101, // Innovative Online Industries (binary 101)
    copper: 1, // First key
    jade: 2, // Second key
    crystal: 3 // Final key
  };

  // Nolan's favorite numbers and their cinematic significance
  private nolanNumbers = {
    memento: 22, // Number of memory fragments
    inception: 528491, // Room number in the hotel
    interstellar: 51, // Years elapsed on Earth
    dunkirk: 400000, // Number of soldiers to evacuate
    tenet: 14, // Days to save the world
    darkKnight: 50, // 50th floor of Wayne Enterprises
    prestige: 100, // 100 shows commitment to the trick
    batman: 8 // The 8 in "The Dark Knight" trilogy symbolism
  };

  getMathematicalConstants(): MathematicalConstant[] {
    return [...this.readyPlayerOneConstants];
  }

  getSequencePatterns(): SequencePattern[] {
    // Primary: Ready Player One patterns
    const allPatterns = [...this.readyPlayerOnePatterns];

    // Fallback: Add Aronofsky patterns for variety
    allPatterns.push(...this.aronofskyPatterns.slice(0, 2));

    // Fallback: Add Nolan patterns for completeness
    allPatterns.push(...this.nolanPatterns.slice(0, 2));

    return allPatterns;
  }

  // Generate Ready Player One inspired sequences
  generateOASISUserGrowth(startUsers: number, years: number): number[] {
    const sequence: number[] = [startUsers];
    let current = startUsers;

    // Exponential growth like OASIS adoption
    for (let i = 1; i < years; i++) {
      current = Math.floor(current * 2.5); // Rapid VR adoption rate
      sequence.push(current);
    }

    return sequence;
  }

  // Generate Halliday's contest progression
  generateContestProgression(contestants: number): number[] {
    const sequence: number[] = [];
    let remaining = contestants;

    // Each gate eliminates most contestants
    for (let gate = 1; gate <= 3; gate++) {
      sequence.push(remaining);
      remaining = Math.floor(remaining * 0.1); // Only 10% make it through each gate
    }

    return sequence;
  }

  // Generate Aronofsky-inspired mathematical sequences
  generatePiObsessionSequence(length: number): number[] {
    const sequence: number[] = [];
    const basePattern = [2, 1, 6]; // From the film Pi

    for (let i = 0; i < length; i++) {
      sequence.push(basePattern[i % basePattern.length]);
    }

    return sequence;
  }

  // Generate Nolan-inspired time dilation sequences
  generateInceptionTimeSequence(levels: number): number[] {
    const sequence: number[] = [];
    let multiplier = 1;

    for (let level = 0; level < levels; level++) {
      sequence.push(multiplier);
      multiplier *= 4; // Each dream level multiplies time by 4
    }

    return sequence;
  }

  // Get specific numbers from different directors
  getReadyPlayerOneNumbers() {
    return { ...this.readyPlayerOneNumbers };
  }

  getNolanNumbers() {
    return { ...this.nolanNumbers };
  }

  // Generate golden ratio-based sequences
  generateGoldenRatioSequence(length: number): number[] {
    const phi = 1.6180339887498948;
    const sequence: number[] = [];

    for (let i = 0; i < length; i++) {
      sequence.push(Math.pow(phi, i));
    }

    return sequence;
  }

  // Calculate golden angle (used in sunflower patterns)
  getGoldenAngle(): number {
    const phi = 1.6180339887498948;
    return 2 * Math.PI / (phi * phi); // ≈ 137.5 degrees in radians
  }

  // Generate Fibonacci sequence
  generateFibonacciSequence(length: number): number[] {
    const sequence: number[] = [0, 1];

    for (let i = 2; i < length; i++) {
      sequence.push(sequence[i - 1] + sequence[i - 2]);
    }

    return sequence.slice(0, length);
  }

  // Get random mathematical quotes from films
  getRandomMathQuote(): string {
    const quotes = [
      "Mathematics is the language in which God has written the universe. - Ready Player One",
      "When you have eliminated the impossible, whatever remains, however improbable, must be the truth. - Pi",
      "The golden ratio is the key to perfect proportion. - Black Swan",
      "Sometimes the only way to solve the present is to jump to the future. - Interstellar",
      "We're going to need to think fourth dimensionally. - Inception",
      "The number 216... It's everywhere in nature. - Pi",
      "Reality is that which, when you stop believing in it, doesn't go away. - Ready Player One",
      "Time is relative. Dreams feel real while we're in them. - Inception"
    ];

    return quotes[Math.floor(Math.random() * quotes.length)];
  }

  // Get cinematic significance of a number
  getCinematicSignificance(num: number): string {
    const significances: { [key: number]: string } = {
      3: "The power of three - Three keys, three gates, three challenges in Ready Player One",
      5: "The High Five - Wade's clan number in Ready Player One",
      8: "Infinity rotated - The eternal loop in Christopher Nolan's films",
      13: "Unlucky or lucky? Fibonacci's mysterious number in Black Swan",
      21: "Coming of age - The perfect Fibonacci number in nature",
      34: "The golden spiral begins to reveal itself",
      55: "Nature's preferred arrangement - sunflower seeds and pine cones",
      89: "The large Fibonacci that governs galactic spirals",
      144: "Gross dozen - 12 squared, the ultimate Fibonacci square",
      216: "Max Cohen's obsession in Pi - 6 cubed, the number of perfect fear",
      1618: "The golden ratio multiplied by 1000 - divine proportion",
      2001: "Kubrick's space odyssey number",
      2010: "The year of Black Swan's mathematical perfection",
      2025: "OASIS foundation year in Ready Player One"
    };

    // Check for exact matches
    if (significances[num]) {
      return significances[num];
    }

    // Check for Fibonacci numbers
    const fibSequence = this.generateFibonacciSequence(20);
    if (fibSequence.includes(num)) {
      return `Fibonacci number - appears in nature's spiral patterns, referenced in ${Math.random() > 0.5 ? 'Black Swan' : 'Pi'}`;
    }

    // Check for powers of 2 (OASIS theme)
    if ((num & (num - 1)) === 0 && num !== 0) {
      return `Power of 2 - represents exponential growth in OASIS user adoption (Ready Player One)`;
    }

    // Check for perfect squares
    const sqrt = Math.sqrt(num);
    if (sqrt === Math.floor(sqrt)) {
      return `Perfect square (${sqrt}²) - mathematical harmony in Aronofsky's visual compositions`;
    }

    // Check for primes (Pi theme)
    if (this.isPrime(num) && num > 1) {
      return `Prime number - indivisible like Max Cohen's obsession with mathematical truth in Pi`;
    }

    // Default significance
    return `Every number has significance in the mathematical universe - as Halliday knew in Ready Player One`;
  }

  // Helper method to check if a number is prime
  private isPrime(num: number): boolean {
    if (num < 2) return false;
    if (num === 2) return true;
    if (num % 2 === 0) return false;

    for (let i = 3; i <= Math.sqrt(num); i += 2) {
      if (num % i === 0) return false;
    }

    return true;
  }
}

# Literary Content Patterns - Instructions for Testing & Mocks

**Purpose**: Reference patterns for literary-inspired content used in testing, mocks, and content generation  
**Usage**: AI assistants, developers, content generation, test data  
**Context**: Established from About page content decision

---

## Overview

This document provides literary-inspired content patterns that can be used throughout the application for:
- **Test data generation**: Realistic, varied content for UI testing
- **Mock content**: Placeholder text with literary quality
- **Content examples**: Patterns for artistic/creative sections
- **Storybook stories**: Component documentation with engaging content

---

## Opening Line Suggestions

### 1. Minimalist/Direct
*Inspired by Emily Dickinson's private works*

> "Jouster is a portfolio of artistic works, thought processes, and creative explorations."

### 2. Museum/Archive Style
*Inspired by Walter Benjamin's "Arcades Project"*

> "Jouster is a personal archive of artistic works, reflections, and creative experiments."

### 3. Garden/Collection Metaphor
*Inspired by Montaigne's "Essays"*

> "Jouster is a collection of artistic works, musings, and creative endeavors."

### 4. Studio/Workshop Style
*Inspired by Leonardo's notebooks*

> "Jouster is a creative workshop displaying artistic works, thought processes, and experimental pieces."

### 5. Journal/Chronicle Style
*Inspired by Virginia Woolf's diaries*

> "Jouster chronicles artistic works, creative thoughts, and personal experiments."

### 6. Original Suggestion (simplified)

> "Jouster is a portfolio showcasing artistic works, thought processes, and other branches of work."

**Note**: "branches of work" is a bit technical/corporate. Could soften to "creative pursuits" or "explorations"

### 7. Refined Version (Recommended)
*More flowing*

> "Jouster is a portfolio of artistic works, thought processes, and creative pursuits."

**Why it works:**
- "Creative pursuits" is more evocative than "branches of work"
- Flows naturally when read aloud
- Echoes literary traditions of personal creative collections
- Not overly formal or casual

### 8. Poetic/Literary
*Inspired by Borges' "The Library of Babel"*

> "Jouster is a repository of artistic works, wandering thoughts, and creative experiments."

### 9. Gallery Style
*Clean and simple*

> "Jouster is a personal gallery of artistic works, reflections, and creative expressions."


### 10. Most Natural/Conversational

> "Jouster is a portfolio showcasing art, music, thought processes, and creative work."

---

## Alternative with "showcasing"

If you prefer to keep the word "showcasing":

> "Jouster is a portfolio showcasing artistic works, thought processes, and creative pursuits."

---

## Usage Notes

- All options remove the "who may or may not be known" phrase
- Each has a different tone and literary influence
- Can mix and match elements from different suggestions
- Consider reading each aloud to test natural flow

---

## Literary References

### Emily Dickinson
- Known for private, personal work not intended for public consumption
- Minimalist, direct language
- Focus on inner thoughts and observations

### Walter Benjamin - "Arcades Project"
- Personal archive of observations and reflections
- Collection of fragments and ideas
- Museum/archive approach to personal work

### Michel de Montaigne - "Essays"
- Personal exploration through writing
- Collection of thoughts and musings
- Garden metaphor for cultivated ideas

### Leonardo da Vinci - Notebooks
- Workshop/studio approach
- Mix of art, science, and thought processes
- Experimental and exploratory

### Virginia Woolf - Diaries
- Chronicle of creative thoughts
- Personal and introspective
- Blend of reflection and creativity

### Jorge Luis Borges - "The Library of Babel"
- Repository of infinite works
- Wandering through ideas
- Literary and philosophical

---

**Saved**: November 12, 2025  
**For**: Content patterns, testing, and mocks  
**Usage**: AI assistants, developers, content generation

---

## Usage in Testing & Mocks

### Test Data Generation

Use these patterns to generate realistic, varied content for testing:

```typescript
// Mock content for component testing
const mockAboutContent = {
  minimalist: "Jouster is a portfolio of artistic works, thought processes, and creative explorations.",
  archival: "Jouster is a personal archive of artistic works, reflections, and creative experiments.",
  poetic: "Jouster is a repository of artistic works, wandering thoughts, and creative experiments.",
  gallery: "Jouster is a personal gallery of artistic works, reflections, and creative expressions."
};

// Random content selector for variety in tests
export function getRandomContentPattern(): string {
  const patterns = Object.values(mockAboutContent);
  return patterns[Math.floor(Math.random() * patterns.length)];
}
```

### Storybook Examples

```typescript
// Component story with literary content
export const AboutPageVariations = {
  Minimalist: {
    content: "Jouster is a portfolio of artistic works, thought processes, and creative explorations."
  },
  Poetic: {
    content: "Jouster is a repository of artistic works, wandering thoughts, and creative experiments."
  },
  Gallery: {
    content: "Jouster is a personal gallery of artistic works, reflections, and creative expressions."
  }
};
```

### E2E Test Fixtures

```typescript
// Cypress test fixtures
describe('About Page Content Variations', () => {
  const contentPatterns = [
    'portfolio of artistic works',
    'personal archive of artistic works',
    'repository of artistic works',
    'personal gallery of artistic works'
  ];

  contentPatterns.forEach(pattern => {
    it(`displays ${pattern} correctly`, () => {
      cy.visit('/about');
      cy.contains(pattern).should('be.visible');
    });
  });
});
```

### Mock API Responses

```typescript
// Mock CMS content for testing
export const mockCMSAboutContent = {
  title: "About Jouster",
  body: "Jouster is a portfolio of artistic works, thought processes, and creative pursuits.",
  style: "minimalist",
  literaryReference: "Emily Dickinson",
  lastUpdated: new Date().toISOString()
};
```

### Content Variation Testing

Use these patterns to test how UI handles different content lengths and styles:

```typescript
// Short form (minimalist)
const shortContent = "Jouster chronicles artistic works, creative thoughts, and personal experiments.";

// Medium form (recommended)
const mediumContent = "Jouster is a portfolio of artistic works, thought processes, and creative pursuits.";

// Long form (verbose)
const longContent = "Jouster is a creative workshop displaying artistic works, thought processes, and experimental pieces.";

// Test component with various content lengths
describe('Content Rendering', () => {
  it('handles short content', () => {
    render(<AboutSection content={shortContent} />);
  });
  
  it('handles medium content', () => {
    render(<AboutSection content={mediumContent} />);
  });
  
  it('handles long content', () => {
    render(<AboutSection content={longContent} />);
  });
});
```

---

## Content Generation Patterns

### For Portfolio Pages

```typescript
export const portfolioDescriptionPatterns = [
  "A [collection/portfolio/archive] of [artistic works/creative pursuits/experiments]",
  "[Location] showcasing [works/thoughts/explorations]",
  "A space for [art/music/creative expression] and [reflection/experimentation/play]"
];

// Generate variations
function generatePortfolioDescription(style: 'formal' | 'casual' | 'poetic'): string {
  // Use patterns above to generate content
}
```

### For Artist Statements

Use literary references as inspiration for generating artist statement variations in tests.

### For About Sections

All 10 patterns can be used as templates for generating about section content in components.

---

**Reference**: Use these patterns freely in tests, mocks, Storybook stories, and content generation throughout the application.


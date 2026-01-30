/**
 * Source Quality Scoring System
 *
 * Calculates quality scores (0-5) for research sources based on:
 * - Peer review status (journal/conference/preprint/web)
 * - DOI presence
 * - Recency (publication year)
 * - Venue prestige (journal/conference ranking)
 * - Relevance (search score)
 */

interface Author {
  first: string;
  last: string;
  middle?: string;
}

export interface ScoredSource {
  // Source identification
  id: string;
  title: string;
  url: string;
  excerpt?: string;
  author?: string;

  // Metadata
  authorsStructured?: Author[];
  doi?: string;
  journalName?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  year?: number;
  publisher?: string;
  publicationType?: 'journal' | 'conference' | 'preprint' | 'book' | 'web';

  // Prestige indicators
  venuePrestige?: 'high' | 'medium' | 'low';
  domainPrestige?: 'high' | 'medium' | 'low';
  citationCount?: number;

  // Search metadata
  score?: number; // Relevance score from search

  // Quality scoring (added by scorer)
  qualityScore?: number;
  qualityGrade?: 'A' | 'B' | 'C' | 'D' | 'F';
  qualityBreakdown?: QualityScoreBreakdown;
}

export interface QualityScoreBreakdown {
  peerReviewScore: number;      // 0-3 points
  doiScore: number;              // 0-2 points
  recencyScore: number;          // 0-1 points
  venuePrestigeScore: number;    // 0-2 points
  relevanceScore: number;        // 0-2 points
  totalScore: number;            // 0-10 (normalized to 0-5)
  normalizedScore: number;       // 0-5
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  reasoning: string;             // Human-readable explanation
}

/**
 * Calculate comprehensive quality score for a research source
 */
export function calculateQualityScore(
  source: ScoredSource
): QualityScoreBreakdown {
  let totalScore = 0;
  const components: string[] = [];

  // 1. PEER REVIEW STATUS (0-3 points) - Most important factor
  let peerReviewScore = 0;
  if (source.publicationType === 'journal') {
    peerReviewScore = 3;
    components.push('peer-reviewed journal (3pts)');
  } else if (source.publicationType === 'conference') {
    peerReviewScore = 2.5;
    components.push('peer-reviewed conference (2.5pts)');
  } else if (source.publicationType === 'book') {
    peerReviewScore = 2;
    components.push('academic book (2pts)');
  } else if (source.publicationType === 'preprint') {
    peerReviewScore = 1;
    components.push('preprint/not peer-reviewed (1pt)');
  } else {
    // 'web' or undefined
    // Check domain prestige as fallback
    if (source.domainPrestige === 'high') {
      peerReviewScore = 1.5;
      components.push('high-prestige web source (1.5pts)');
    } else if (source.domainPrestige === 'medium') {
      peerReviewScore = 0.5;
      components.push('medium-prestige web source (0.5pts)');
    } else {
      peerReviewScore = 0;
      components.push('general web content (0pts)');
    }
  }
  totalScore += peerReviewScore;

  // 2. DOI PRESENCE (0-2 points) - Indicates formal publication
  let doiScore = 0;
  if (source.doi && source.doi.trim() !== '') {
    doiScore = 2;
    components.push('has DOI (2pts)');
  } else {
    components.push('no DOI (0pts)');
  }
  totalScore += doiScore;

  // 3. RECENCY (0-1 points) - Prefer recent research
  let recencyScore = 0;
  const currentYear = new Date().getFullYear();
  if (source.year) {
    const age = currentYear - source.year;
    if (age <= 2) {
      recencyScore = 1;
      components.push(`very recent (${source.year}, 1pt)`);
    } else if (age <= 5) {
      recencyScore = 0.7;
      components.push(`recent (${source.year}, 0.7pts)`);
    } else if (age <= 10) {
      recencyScore = 0.4;
      components.push(`somewhat dated (${source.year}, 0.4pts)`);
    } else {
      recencyScore = 0.1;
      components.push(`old (${source.year}, 0.1pts)`);
    }
  } else {
    components.push('no date (0pts)');
  }
  totalScore += recencyScore;

  // 4. VENUE PRESTIGE (0-2 points) - Journal/conference ranking
  let venuePrestigeScore = 0;
  if (source.venuePrestige === 'high') {
    venuePrestigeScore = 2;
    components.push('high-prestige venue (2pts)');
  } else if (source.venuePrestige === 'medium') {
    venuePrestigeScore = 1;
    components.push('medium-prestige venue (1pt)');
  } else if (source.citationCount && source.citationCount > 100) {
    // Fallback: high citation count indicates quality
    venuePrestigeScore = 1.5;
    components.push(`highly cited (${source.citationCount} citations, 1.5pts)`);
  } else if (source.citationCount && source.citationCount > 20) {
    venuePrestigeScore = 0.5;
    components.push(`moderately cited (${source.citationCount} citations, 0.5pts)`);
  } else {
    components.push('unknown venue prestige (0pts)');
  }
  totalScore += venuePrestigeScore;

  // 5. RELEVANCE (0-2 points) - How well it matches the query
  let relevanceScore = 0;
  if (source.score !== undefined) {
    // Normalize search score (typically 0-1) to 0-2 range
    relevanceScore = Math.min(2, source.score * 2);
    components.push(`relevance score (${relevanceScore.toFixed(1)}pts)`);
  } else {
    // Default to medium relevance if no score
    relevanceScore = 1;
    components.push('relevance unknown (1pt default)');
  }
  totalScore += relevanceScore;

  // Normalize to 0-5 scale
  // Max possible: 3 + 2 + 1 + 2 + 2 = 10 points
  const normalizedScore = Math.min(5, totalScore / 2);

  // Assign grade
  let grade: 'A' | 'B' | 'C' | 'D' | 'F';
  if (normalizedScore >= 4.5) {
    grade = 'A'; // Excellent: peer-reviewed journal with DOI, recent, high prestige
  } else if (normalizedScore >= 3.5) {
    grade = 'B'; // Good: peer-reviewed or high-quality web source with DOI
  } else if (normalizedScore >= 2.5) {
    grade = 'C'; // Acceptable: preprint or medium-quality source
  } else if (normalizedScore >= 1.5) {
    grade = 'D'; // Poor: low-quality web source
  } else {
    grade = 'F'; // Fail: random web content, no academic merit
  }

  const reasoning = `Quality Score: ${normalizedScore.toFixed(1)}/5 (Grade ${grade})\n` +
    `Components: ${components.join(', ')}`;

  return {
    peerReviewScore,
    doiScore,
    recencyScore,
    venuePrestigeScore,
    relevanceScore,
    totalScore,
    normalizedScore,
    grade,
    reasoning,
  };
}

/**
 * Filter sources by minimum quality threshold
 */
export function filterByQualityThreshold(
  sources: ScoredSource[],
  minScore: number = 3.5
): ScoredSource[] {
  return sources.filter(source => {
    if (!source.qualityScore) {
      // Calculate score if not already present
      const scoreBreakdown = calculateQualityScore(source);
      return scoreBreakdown.normalizedScore >= minScore;
    }
    return source.qualityScore >= minScore;
  });
}

/**
 * Sort sources by quality score (descending)
 */
export function sortByQualityScore(sources: ScoredSource[]): ScoredSource[] {
  return [...sources].sort((a, b) => {
    const scoreA = a.qualityScore || 0;
    const scoreB = b.qualityScore || 0;
    return scoreB - scoreA;
  });
}

/**
 * Score and filter sources in one operation
 */
export function scoreAndFilterSources(
  sources: ScoredSource[],
  options: {
    minScore?: number;
    sortByScore?: boolean;
  } = {}
): ScoredSource[] {
  const { minScore = 3.5, sortByScore = true } = options;

  // Add quality scores to all sources
  const scoredSources = sources.map(source => {
    const scoreBreakdown = calculateQualityScore(source);
    return {
      ...source,
      qualityScore: scoreBreakdown.normalizedScore,
      qualityGrade: scoreBreakdown.grade,
      qualityBreakdown: scoreBreakdown,
    };
  });

  // Filter by minimum score
  let filtered = scoredSources.filter(s =>
    s.qualityScore !== undefined && s.qualityScore >= minScore
  ) as ScoredSource[];

  // Sort by score if requested
  if (sortByScore) {
    filtered = sortByQualityScore(filtered);
  }

  return filtered;
}

/**
 * Get quality statistics for a set of sources
 */
export function getQualityStatistics(sources: ScoredSource[]): {
  total: number;
  gradeA: number;
  gradeB: number;
  gradeC: number;
  gradeD: number;
  gradeF: number;
  averageScore: number;
  medianScore: number;
  highQuality: number; // A or B
  acceptable: number;  // C or better
} {
  const total = sources.length;

  if (total === 0) {
    return {
      total: 0,
      gradeA: 0,
      gradeB: 0,
      gradeC: 0,
      gradeD: 0,
      gradeF: 0,
      averageScore: 0,
      medianScore: 0,
      highQuality: 0,
      acceptable: 0,
    };
  }

  const scores = sources
    .map(s => s.qualityScore || 0)
    .sort((a, b) => a - b);

  const gradeA = sources.filter(s => s.qualityGrade === 'A').length;
  const gradeB = sources.filter(s => s.qualityGrade === 'B').length;
  const gradeC = sources.filter(s => s.qualityGrade === 'C').length;
  const gradeD = sources.filter(s => s.qualityGrade === 'D').length;
  const gradeF = sources.filter(s => s.qualityGrade === 'F').length;

  const averageScore = scores.reduce((sum, score) => sum + score, 0) / total;
  const medianScore = scores[Math.floor(total / 2)];

  const highQuality = gradeA + gradeB;
  const acceptable = gradeA + gradeB + gradeC;

  return {
    total,
    gradeA,
    gradeB,
    gradeC,
    gradeD,
    gradeF,
    averageScore: Math.round(averageScore * 10) / 10,
    medianScore: Math.round(medianScore * 10) / 10,
    highQuality,
    acceptable,
  };
}

/**
 * Explain quality score in human-readable format
 */
export function explainQualityScore(source: ScoredSource): string {
  if (!source.qualityBreakdown) {
    const breakdown = calculateQualityScore(source);
    return breakdown.reasoning;
  }
  return source.qualityBreakdown.reasoning;
}

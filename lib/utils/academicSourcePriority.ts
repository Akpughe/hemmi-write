/**
 * Academic Source Priority and Domain Classification
 *
 * Defines tiered academic domains and venue prestige for prioritizing
 * high-quality academic sources in research searches.
 */

export interface AcademicDomain {
  domain: string;
  tier: 1 | 2 | 3;
  description: string;
}

/**
 * Tier 1: Core Academic Databases & Publishers
 * Highest priority - peer-reviewed journals and conferences
 */
export const TIER1_ACADEMIC_DOMAINS = [
  // Major Academic Search Engines
  'scholar.google.com',
  'scholar.google.co.uk',

  // Biomedical & Life Sciences
  'pubmed.ncbi.nlm.nih.gov',
  'ncbi.nlm.nih.gov',
  'nih.gov',

  // Engineering & Technology
  'ieee.org',
  'ieeexplore.ieee.org',
  'acm.org',
  'dl.acm.org',

  // Major Publishers
  'sciencedirect.com',
  'springer.com',
  'link.springer.com',
  'jstor.org',
  'nature.com',
  'science.org',
  'sciencemag.org',
  'cell.com',
  'thelancet.com',
  'nejm.org',

  // Academic Databases
  'wiley.com',
  'onlinelibrary.wiley.com',
  'oxfordjournals.org',
  'academic.oup.com',
  'cambridge.org',
  'tandfonline.com',
  'sagepub.com',
  'aaas.org',
  'plos.org',
  'plosone.org',
  'bmj.com',
  'jama.jamanetwork.com',
];

/**
 * Tier 2: Government, Policy & Institutional Sources
 * High priority - authoritative reports and data
 */
export const TIER2_ACADEMIC_DOMAINS = [
  // International Organizations
  'worldbank.org',
  'un.org',
  'who.int',
  'unesco.org',
  'oecd.org',
  'imf.org',
  'wto.org',

  // US Government
  'census.gov',
  'bls.gov',
  'cdc.gov',
  'fda.gov',
  'nasa.gov',
  'nsf.gov',
  'energy.gov',
  'epa.gov',

  // UK Government
  'gov.uk',
  'ons.gov.uk',

  // Think Tanks & Research Institutes
  'brookings.edu',
  'rand.org',
  'pewresearch.org',
  'nber.org',
];

/**
 * Tier 3: Preprints & Open Repositories
 * Medium priority - not peer-reviewed but often cutting-edge
 */
export const TIER3_ACADEMIC_DOMAINS = [
  'arxiv.org',
  'biorxiv.org',
  'medrxiv.org',
  'ssrn.com',
  'researchgate.net',
  'academia.edu',
  'osf.io',
  'zenodo.org',
  'figshare.com',
];

/**
 * University domain patterns
 * Matches .edu, .ac.uk, .edu.au, etc.
 */
export const UNIVERSITY_DOMAIN_PATTERNS = [
  /\.edu$/i,
  /\.ac\.uk$/i,
  /\.edu\.au$/i,
  /\.edu\.cn$/i,
  /\.ac\.jp$/i,
  /\.edu\.sg$/i,
  /\.ac\.in$/i,
  /\.edu\.br$/i,
  /\.ac\.za$/i,
];

/**
 * All academic domains combined
 */
export const ALL_ACADEMIC_DOMAINS = [
  ...TIER1_ACADEMIC_DOMAINS,
  ...TIER2_ACADEMIC_DOMAINS,
  ...TIER3_ACADEMIC_DOMAINS,
];

/**
 * High prestige venues (journals and conferences)
 */
export const HIGH_PRESTIGE_VENUES = [
  // Top Journals - General Science
  'Nature',
  'Science',
  'Cell',
  'PNAS',
  'Proceedings of the National Academy of Sciences',

  // Top Medical Journals
  'The Lancet',
  'JAMA',
  'New England Journal of Medicine',
  'BMJ',
  'British Medical Journal',

  // Top CS Conferences
  'NeurIPS',
  'ICML',
  'ICLR',
  'CVPR',
  'ICCV',
  'ECCV',
  'ACL',
  'EMNLP',
  'NAACL',
  'SIGMOD',
  'VLDB',
  'ICDE',
  'KDD',
  'WWW',
  'SIGIR',
  'AAAI',
  'IJCAI',

  // Top Engineering Journals
  'IEEE Transactions',
  'ACM Transactions',
];

/**
 * Extract domain from URL
 */
export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    // Remove www. prefix for consistency
    return urlObj.hostname.replace(/^www\./, '');
  } catch {
    return 'unknown';
  }
}

/**
 * Get domain prestige level
 */
export function getDomainPrestige(url: string): 'high' | 'medium' | 'low' {
  const domain = extractDomain(url);

  // Check Tier 1
  if (TIER1_ACADEMIC_DOMAINS.some(d => domain.includes(d) || d.includes(domain))) {
    return 'high';
  }

  // Check Tier 2
  if (TIER2_ACADEMIC_DOMAINS.some(d => domain.includes(d) || d.includes(domain))) {
    return 'medium';
  }

  // Check Tier 3
  if (TIER3_ACADEMIC_DOMAINS.some(d => domain.includes(d) || d.includes(domain))) {
    return 'medium';
  }

  // Check university patterns
  if (UNIVERSITY_DOMAIN_PATTERNS.some(pattern => pattern.test(domain))) {
    return 'medium';
  }

  return 'low';
}

/**
 * Get venue prestige based on venue name
 */
export function getVenuePrestige(venueName?: string): 'high' | 'medium' | 'low' {
  if (!venueName) return 'low';

  const normalizedVenue = venueName.toLowerCase();

  // Check if venue is in high prestige list
  const isHighPrestige = HIGH_PRESTIGE_VENUES.some(venue =>
    normalizedVenue.includes(venue.toLowerCase()) ||
    venue.toLowerCase().includes(normalizedVenue)
  );

  if (isHighPrestige) return 'high';

  // Check for common indicators of reputable venues
  const mediumIndicators = [
    'journal', 'proceedings', 'conference', 'symposium',
    'transactions', 'letters', 'review'
  ];

  const hasMediumIndicator = mediumIndicators.some(indicator =>
    normalizedVenue.includes(indicator)
  );

  return hasMediumIndicator ? 'medium' : 'low';
}

/**
 * Check if domain is academic (any tier)
 */
export function isAcademicDomain(url: string): boolean {
  const domain = extractDomain(url);

  // Check all tiers
  const isInTiers = ALL_ACADEMIC_DOMAINS.some(d =>
    domain.includes(d) || d.includes(domain)
  );

  // Check university patterns
  const isUniversity = UNIVERSITY_DOMAIN_PATTERNS.some(pattern =>
    pattern.test(domain)
  );

  return isInTiers || isUniversity;
}

/**
 * Filter domains for search APIs
 * Returns list of domains to prioritize in search
 *
 * @param maxDomains - Maximum number of domains to return (default: 20 for Perplexity API limit)
 * @param includeTier1 - Include Tier 1 domains (highest priority)
 * @param includeTier2 - Include Tier 2 domains
 * @param includeTier3 - Include Tier 3 domains
 */
export function getSearchDomainFilter(
  maxDomains: number = 20,
  includeTier1: boolean = true,
  includeTier2: boolean = true,
  includeTier3: boolean = false
): string[] {
  const domains: string[] = [];

  // Priority order: Tier 1 > Tier 2 > Tier 3
  if (includeTier1) domains.push(...TIER1_ACADEMIC_DOMAINS);
  if (includeTier2) domains.push(...TIER2_ACADEMIC_DOMAINS);
  if (includeTier3) domains.push(...TIER3_ACADEMIC_DOMAINS);

  // Limit to maxDomains (Perplexity API has a 20 domain limit)
  return domains.slice(0, maxDomains);
}

/**
 * Get academic query template based on document type and intent
 */
export function getAcademicQueryTemplate(
  topic: string,
  queryType: 'general' | 'data' | 'preprints' | 'books' = 'general'
): string {
  switch (queryType) {
    case 'general':
      return `peer-reviewed academic research on ${topic} from scholarly journals and conferences`;

    case 'data':
      return `authoritative data and statistics on ${topic} from government agencies and international organizations`;

    case 'preprints':
      return `recent preprints and emerging research on ${topic} from arXiv bioRxiv SSRN`;

    case 'books':
      return `academic books and theses on ${topic} from university repositories`;

    default:
      return `academic research on ${topic}`;
  }
}

/**
 * Enhance query with academic context
 */
export function enhanceQueryForAcademicSearch(
  query: string,
  includeKeywords: boolean = true
): string {
  if (!includeKeywords) return query;

  // Add academic quality indicators to query
  const academicKeywords = [
    'peer-reviewed',
    'scholarly',
    'research',
    'academic',
  ];

  // Check if query already contains academic keywords
  const hasAcademicKeyword = academicKeywords.some(keyword =>
    query.toLowerCase().includes(keyword)
  );

  if (hasAcademicKeyword) {
    return query;
  }

  // Add academic context
  return `academic research: ${query}`;
}

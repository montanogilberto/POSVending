/** The GMO services a new visitor can sign up for, each on its own site. */
export type ServiceId = 'pos' | 'smartloans' | 'factory' | 'arcade';

export interface ServiceInfo {
  id: ServiceId;
  label: string;
  /** One line, outcome-first ("what you get"). */
  tagline: string;
  description: string;
  /** Where this service lives. */
  url: string;
  icon: string;
  /** This app's signup wizard can register the service (FactoryAI cannot: it's another product). */
  supportedHere: boolean;
}

export interface FinderOption {
  id: string;
  emoji: string;
  label: string;
  /** Points this answer gives each service; the highest total is the recommendation. */
  scores: Partial<Record<ServiceId, number>>;
}

export interface FinderQuestion {
  id: string;
  title: string;
  subtitle: string;
  options: FinderOption[];
}

export type FinderPhase = 'question' | 'chat' | 'result' | 'catalog';

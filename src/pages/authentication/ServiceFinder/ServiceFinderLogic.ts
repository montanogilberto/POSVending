import { useMemo, useState } from 'react';
import { askServiceFinder, FinderTurn } from './ServiceFinderApi';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { DECISIVE_LEAD, FINDER_QUESTIONS, SERVICES, SERVICE_ORDER } from './ServiceFinderConstants';
import type { FinderOption, FinderPhase, ServiceId } from './ServiceFinderTypes';

const KNOWN_HOSTS = SERVICE_ORDER.map(id => new URL(SERVICES[id].url).host);

/**
 * True when the signup for `id` should continue in this wizard: the service is
 * one this app registers AND either we're already on its site, or we're not on
 * any of the public sites at all (localhost, QA/DEV builds, the native app).
 */
const continuesHere = (id: ServiceId): boolean => {
  const service = SERVICES[id];
  if (!service.supportedHere) return false;
  const here = window.location.host;
  return here === new URL(service.url).host || !KNOWN_HOSTS.includes(here);
};

const emptyScores = (): Record<ServiceId, number> => ({ pos: 0, smartloans: 0, factory: 0, arcade: 0 });

interface UseServiceFinderArgs {
  onContinueHere: (id: ServiceId) => void;
}

export const useServiceFinder = ({ onContinueHere }: UseServiceFinderArgs) => {
  const [phase, setPhase] = useState<FinderPhase>('question');
  // One chosen option per question answered so far, in order.
  const [answers, setAnswers] = useState<FinderOption[]>([]);
  const [redirectingTo, setRedirectingTo] = useState<ServiceId | null>(null);
  // Catalog opened by "Ya sé qué quiero" (not reached by answering): going back
  // from it returns to the same question without undoing an answer.
  const [browsing, setBrowsing] = useState(false);

  // Free-text path ("Cuéntame con tus palabras") answered by the LoanAgents
  // service_finder agent. Its pick, when there is one, wins over the scores.
  const [draft, setDraft] = useState('');
  const [chat, setChat] = useState<FinderTurn[]>([]);
  const [chatOptions, setChatOptions] = useState<string[]>([]);
  const [agentThinking, setAgentThinking] = useState(false);
  const [agentReply, setAgentReply] = useState<string | null>(null);
  const [agentPick, setAgentPick] = useState<{ service: ServiceId; alternatives: ServiceId[] } | null>(null);

  const scores = useMemo(() => {
    const total = emptyScores();
    answers.forEach(a => {
      (Object.keys(a.scores) as ServiceId[]).forEach(id => { total[id] += a.scores[id] ?? 0; });
    });
    return total;
  }, [answers]);

  // Highest score first; SERVICE_ORDER breaks ties so the order is stable.
  // The agent's pick and alternatives go first when it made one.
  const ranking = useMemo(() => {
    const byScore = [...SERVICE_ORDER].sort((a, b) => scores[b] - scores[a]);
    if (!agentPick) return byScore;
    const lead = [agentPick.service, ...agentPick.alternatives];
    return [...lead, ...byScore.filter(id => !lead.includes(id))];
  }, [scores, agentPick]);
  const recommended: ServiceId | null = agentPick?.service ?? (scores[ranking[0]] > 0 ? ranking[0] : null);

  const questionIndex = answers.length;
  const question = FINDER_QUESTIONS[Math.min(questionIndex, FINDER_QUESTIONS.length - 1)];

  const answer = (option: FinderOption) => {
    const next = [...answers, option];
    setAnswers(next);

    const total = emptyScores();
    next.forEach(a => (Object.keys(a.scores) as ServiceId[]).forEach(id => { total[id] += a.scores[id] ?? 0; }));
    const sorted = Object.values(total).sort((a, b) => b - a);
    const decisive = sorted[0] - sorted[1] >= DECISIVE_LEAD;
    const finished = next.length >= FINDER_QUESTIONS.length;
    console.log('[ServiceFinder] answer q=%d option=%s scores=%o', next.length, option.id, total);

    if (decisive || finished) {
      // Nothing matched at all ("no sé" everywhere) → show every service instead.
      setPhase(sorted[0] > 0 ? 'result' : 'catalog');
    }
  };

  const resetChat = () => {
    setChat([]);
    setChatOptions([]);
    setDraft('');
    setAgentReply(null);
    setAgentPick(null);
  };

  /** Sends the visitor's words (typed, or a tapped suggestion) to the agent. */
  const sendToAgent = async (text: string) => {
    const clean = text.trim();
    if (!clean || agentThinking) return;
    const conversation: FinderTurn[] = [...chat, { role: 'visitor', text: clean }];
    setChat(conversation);
    setChatOptions([]);
    setDraft('');
    setAgentPick(null);
    setAgentReply(null);
    setPhase('chat');
    setAgentThinking(true);
    try {
      const r = await askServiceFinder(conversation);
      console.log('[ServiceFinder] agent status=%s service=%s', r.status, r.service);
      if (r.status === 'ask') {
        setChat([...conversation, { role: 'assistant', text: r.reply }]);
        setChatOptions(r.options);
      } else if (r.status === 'recommend' && r.service) {
        setAgentPick({ service: r.service, alternatives: r.alternatives });
        setAgentReply(r.reply);
        setPhase('result');
      } else {
        setAgentReply(r.reply);
        setPhase('catalog');
      }
    } catch (err) {
      setAgentReply(err instanceof Error ? err.message : 'El asistente no está disponible.');
      setPhase('catalog');
    } finally {
      setAgentThinking(false);
    }
  };

  const back = () => {
    if (chat.length > 0) {
      // Any screen reached through the agent goes back to the first question.
      resetChat();
      setBrowsing(false);
      setPhase('question');
      return;
    }
    if (browsing) {
      setBrowsing(false);
      setPhase('question');
      return;
    }
    if (phase !== 'question') {
      setPhase('question');
      // Leaving the result reopens the last question answered.
      setAnswers(prev => prev.slice(0, -1));
      return;
    }
    setAnswers(prev => prev.slice(0, -1));
  };

  const restart = () => {
    setAnswers([]);
    resetChat();
    setBrowsing(false);
    setPhase('question');
  };

  const showCatalog = () => { setBrowsing(true); setPhase('catalog'); };

  const pickService = async (id: ServiceId) => {
    if (redirectingTo) return;
    if (continuesHere(id)) {
      console.log('[ServiceFinder] continue signup here service=%s', id);
      onContinueHere(id);
      return;
    }
    const { url } = SERVICES[id];
    console.log('[ServiceFinder] redirect service=%s url=%s', id, url);
    setRedirectingTo(id);
    try {
      if (Capacitor.isNativePlatform()) {
        await Browser.open({ url });
        setRedirectingTo(null);
      } else {
        window.location.assign(url);
      }
    } catch (err) {
      console.error('[ServiceFinder] redirect ERROR', err);
      setRedirectingTo(null);
    }
  };

  return {
    phase,
    question,
    questionIndex,
    totalQuestions: FINDER_QUESTIONS.length,
    answers,
    ranking,
    recommended,
    redirectingTo,
    answer,
    back,
    restart,
    showCatalog,
    pickService,
    continuesHere,
    draft,
    setDraft,
    chat,
    chatOptions,
    agentThinking,
    agentReply,
    sendToAgent,
  };
};

export type ServiceFinderVM = ReturnType<typeof useServiceFinder>;

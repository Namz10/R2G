import replaysJson from '../samples/replays.json';
import { AgentState } from '../agent/types.ts';

const REPLAY_STORAGE_KEY = 'r2g_recorded_replays';

export interface RecordedReplay {
  sampleId: string;
  recordedAt: string;
  bugReport: string;
  code: string;
  fixedCode: string;
  state: AgentState;
}

export function getSavedReplays(): Record<string, RecordedReplay> {
  try {
    const local = localStorage.getItem(REPLAY_STORAGE_KEY);
    const fromLocal = local ? JSON.parse(local) : {};
    return { ...(replaysJson as any), ...fromLocal };
  } catch {
    return (replaysJson as any) || {};
  }
}

export function saveReplay(sampleId: string, replay: RecordedReplay) {
  try {
    const replays = getSavedReplays();
    replays[sampleId] = replay;
    localStorage.setItem(REPLAY_STORAGE_KEY, JSON.stringify(replays));
  } catch {}
}

export function getReplayForSample(sampleId: string): RecordedReplay | null {
  const replays = getSavedReplays();
  return replays[sampleId] || null;
}

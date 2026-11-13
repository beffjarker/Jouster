import { createRng } from '@jouster/game/engine';
import { COMPANION_SLOTS, companionSlot } from '../data/companions';
import { mapDef } from '../data/maps';
import { LANDMARKS } from '../data/overworld-gen';
import { GameState, answerCompanionQuest, markQuestReady, newGameState } from '../state/game-state';
import { questLog, questPins } from './map-scene';

function afterKing(): GameState {
  const s = newGameState('A', 'paladin', createRng(1));
  s.flags['bossDefeated'] = true;
  return s;
}

function bossVisible(s: GameState, mapId: string, npcId: string): boolean {
  const npc = mapDef(mapId).npcs.find((n) => n.id === npcId);
  if (!npc) {
    throw new Error(`no ${npcId} on ${mapId}`);
  }
  return npc.visible ? npc.visible(s) : true;
}

describe('companion side quests (plan 15.6)', () => {
  it.each([
    ['tavern', 'wolfDen', 'alphaWolf'],
    ['brookhollow', 'overworld', 'giantToad'],
    ['cave', 'goblinCave', 'goblinChief'],
  ])('the %s mini-boss only appears while its quest is active', (questId, mapId, npcId) => {
    const s = afterKing();
    expect(bossVisible(s, mapId, npcId)).toBe(false);
    answerCompanionQuest(s, questId, false);
    expect(bossVisible(s, mapId, npcId)).toBe(false);
    answerCompanionQuest(s, questId, true);
    expect(bossVisible(s, mapId, npcId)).toBe(true);
    s.flags[companionSlot(questId).quest.doneFlag] = true;
    markQuestReady(s, companionSlot(questId).quest.doneFlag);
    expect(bossVisible(s, mapId, npcId)).toBe(false);
  });

  it('has dormant flavour events where the wolf and toad wait', () => {
    expect(mapDef('wolfDen').events.some((e) => e.id === 'denNest' && e.x === 10 && e.y === 2)).toBe(true);
    expect(
      mapDef('overworld').events.some(
        (e) => e.id === 'lakeShore' && e.x === LANDMARKS.lakeshore.x && e.y === LANDMARKS.lakeshore.y,
      ),
    ).toBe(true);
  });

  it('pins the objective while active, then the quest giver once ready', () => {
    const s = afterKing();
    expect(questPins(s, 'overworld')).toEqual([]);
    answerCompanionQuest(s, 'tavern', true);
    expect(questPins(s, 'overworld')).toEqual([{ mapId: 'overworld', ...LANDMARKS.wolfDen }]);
    s.flags['alphaWolfDefeated'] = true;
    markQuestReady(s, 'alphaWolfDefeated');
    expect(questPins(s, 'overworld')).toEqual([LANDMARKS.aldmere]);
    const tavern = COMPANION_SLOTS[0];
    expect(questPins(s, 'aldmere')).toEqual([{ x: tavern.x, y: tavern.y }]);
    s.quests['tavern'] = 'done';
    expect(questPins(s, 'overworld')).toEqual([]);
  });

  it('logs declined, active and ready quests', () => {
    const s = afterKing();
    answerCompanionQuest(s, 'tavern', false);
    answerCompanionQuest(s, 'brookhollow', true);
    expect(questLog(s).join('\n')).toContain('Not accepted');
    s.flags['giantToadDefeated'] = true;
    markQuestReady(s, 'giantToadDefeated');
    expect(questLog(s).join('\n')).toContain('Return to');
  });
});

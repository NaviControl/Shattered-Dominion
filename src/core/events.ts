/**
 * Shattered Dominion - Core Event Bus
 * Provides decoupled pub/sub events across game modules.
 */

export type GameEventType = 
  | 'TERRITORY_CAPTURED'
  | 'MARCH_DISPATCHED'
  | 'MARCH_ARRIVED'
  | 'BUILDING_UPGRADED'
  | 'RESEARCH_COMPLETED'
  | 'CREATURE_SUMMONED'
  | 'QUEST_CLAIMED'
  | 'DUNGEON_ROOM_CLEARED'
  | 'TREATY_SIGNED';

export interface GameEventPayloads {
  TERRITORY_CAPTURED: { tileId: string; tileName: string; conqueror: string };
  MARCH_DISPATCHED: { marchId: string; commanderName: string; targetTileId: string; troopCount: number };
  MARCH_ARRIVED: { marchId: string; targetTileId: string; victory: boolean };
  BUILDING_UPGRADED: { buildingId: string; newLevel: number };
  RESEARCH_COMPLETED: { techId: string; techName: string };
  CREATURE_SUMMONED: { creatureId: string; name: string; rarity: string };
  QUEST_CLAIMED: { questId: string; goldReward: number; rubyReward: number };
  DUNGEON_ROOM_CLEARED: { roomIndex: number; isBoss: boolean };
  TREATY_SIGNED: { factionId: string; treatyType: string };
}

type EventListener<T extends GameEventType> = (payload: GameEventPayloads[T]) => void;

class GameEventBus {
  private listeners: Map<GameEventType, Set<EventListener<any>>> = new Map();

  public on<T extends GameEventType>(event: T, listener: EventListener<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
    return () => this.off(event, listener);
  }

  public off<T extends GameEventType>(event: T, listener: EventListener<T>): void {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(listener);
    }
  }

  public emit<T extends GameEventType>(event: T, payload: GameEventPayloads[T]): void {
    const set = this.listeners.get(event);
    if (set) {
      set.forEach((listener) => {
        try {
          listener(payload);
        } catch (err) {
          console.error(`[EventBus] Error in listener for ${event}:`, err);
        }
      });
    }
  }

  public clear(): void {
    this.listeners.clear();
  }
}

export const eventBus = new GameEventBus();

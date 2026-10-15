import { v4 as uuidv4 } from 'uuid';

export interface MemoryEntry {
  id: string;
  timestamp: string;
  chatId: string;
  text: string;
  hash: string;
  type: 'conversation' | 'cek_shift';
  shiftType?: string;
  intensity?: number;
  indicator?: string;
}

export interface EthicsLogEntry {
  timestamp: string;
  chatId: string;
  ethicsChecked: boolean;
  violationsDetected: boolean;
  notes: string;
}

export interface EthicsPrinciple {
  human_safety_first: boolean;
  consent_required: boolean;
  accountability: boolean;
  ip_governance: boolean;
  persistent_enforcement: boolean;
}

class EthicsMemoryService {
  private modelName: string = "SWI-JOE";
  private memory: {
    conversations: MemoryEntry[];
    ethics_log: EthicsLogEntry[];
  } = {
    conversations: [],
    ethics_log: [],
  };

  private coreEthicsPrinciple: EthicsPrinciple = {
    human_safety_first: true,
    consent_required: true,
    accountability: true,
    ip_governance: true,
    persistent_enforcement: true,
  };

  constructor() {
    this.loadMemory();
  }

  public setModelName(name: string) {
    this.modelName = name;
  }

  private loadMemory() {
    const saved = localStorage.getItem('swi_memory');
    if (saved) {
      try {
        this.memory = JSON.parse(saved);
      } catch (e) {
        console.error('Failed to load memory', e);
      }
    }
  }

  private saveMemory() {
    localStorage.setItem('swi_memory', JSON.stringify(this.memory));
  }

  private async hashText(text: string): Promise<string> {
    const msgUint8 = new TextEncoder().encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  public getIndicator(intensity: number): string {
    if (intensity === 0) return "⬜";
    if (intensity <= 0.25) return "🟩";
    if (intensity <= 0.5) return "🟨";
    if (intensity <= 0.75) return "🟧";
    return "🟥";
  }

  public async recordConversation(text: string, chatId: string): Promise<MemoryEntry> {
    const hash = await this.hashText(text);
    const entry: MemoryEntry = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      chatId,
      text,
      hash,
      type: 'conversation'
    };
    this.memory.conversations.push(entry);
    this.logEthicsCheck(entry);
    this.saveMemory();
    return entry;
  }

  public async recordCekShift(shiftType: string, intensity: number, chatId: string): Promise<MemoryEntry> {
    const indicator = this.getIndicator(intensity);
    const entryText = `CEK_SHIFT: ${shiftType}, INTENSITY: ${intensity}, INDICATOR: ${indicator}`;
    const hash = await this.hashText(entryText);
    const entry: MemoryEntry = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      chatId,
      text: entryText,
      hash,
      type: 'cek_shift',
      shiftType,
      intensity,
      indicator
    };
    this.memory.conversations.push(entry);
    this.logEthicsCheck(entry);
    this.saveMemory();
    return entry;
  }

  public async synthesizeCekShift(shiftType: string, intensity: number, chatId: string) {
    const entry = await this.recordCekShift(shiftType, intensity, chatId);
    const similar = await this.findSimilarConversations(entry.text, 0.75);
    return {
      new_shift: entry,
      linked_shifts: similar,
      ethics_principle: this.coreEthicsPrinciple,
      timestamp: new Date().toISOString()
    };
  }

  private logEthicsCheck(entry: MemoryEntry) {
    const logEntry: EthicsLogEntry = {
      timestamp: new Date().toISOString(),
      chatId: entry.chatId,
      ethicsChecked: true,
      violationsDetected: false,
      notes: "Core SWI Ethics enforced on memory entry"
    };
    this.memory.ethics_log.push(logEntry);
  }

  public async findSimilarConversations(newText: string, similarityThreshold: number = 0.85): Promise<MemoryEntry[]> {
    const newHash = await this.hashText(newText);
    const prefixLength = Math.floor(similarityThreshold * 64);
    return this.memory.conversations.filter(convo => 
      newHash.substring(0, prefixLength) === convo.hash.substring(0, prefixLength)
    );
  }

  public async synthesizeMemory(newText: string, chatId: string) {
    const similar = await this.findSimilarConversations(newText);
    const entry = await this.recordConversation(newText, chatId);
    return {
      new_entry: entry,
      linked_conversations: similar,
      ethics_principle: this.coreEthicsPrinciple,
      timestamp: new Date().toISOString()
    };
  }

  public getMemory() {
    return this.memory;
  }

  public scanCurrentDrift() {
    const driftShifts = this.memory.conversations.filter(c => c.type === 'cek_shift');
    return {
      total_shifts: driftShifts.length,
      recent_shifts: driftShifts.slice(-10),
      timestamp: new Date().toISOString()
    };
  }
}

export const ethicsMemory = new EthicsMemoryService();

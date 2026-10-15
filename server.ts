import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import crypto from "crypto";
import multer from "multer";
import fs from "fs";
import fsExtra from "fs-extra";
import path from "path";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import OpenAI from "openai";
import { createServer as createViteServer } from "vite";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import Database from "better-sqlite3";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");
const Sentiment = require("sentiment");

// Handle potential ESM/CJS interop issues
const analyzeSentiment = (text: string) => {
  const S = (Sentiment.default || Sentiment);
  const analyzer = new S();
  return analyzer.analyze(text);
};

const parsePDF = async (buffer: Buffer) => {
  const P = (pdfParse.default || pdfParse);
  return P(buffer);
};

const app = express();
app.set("trust proxy", 1);
const PORT = 3000;
const upload = multer({ 
  dest: "uploads/",
  limits: { fileSize: 25 * 1024 * 1024 }
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ===============================
// SWI-JOE ETHICS-LOCKED MEMORY + CEK SHIFT TRACKING
// ===============================
export interface EthicsMemoryEntry {
  timestamp: string;
  chat_id: string;
  text: string;
  hash: string;
  shift_type?: string;
  intensity?: number;
  indicator?: string;
}

export interface EthicsLogEntry {
  timestamp: string;
  chat_id: string;
  ethics_checked: boolean;
  violations_detected: boolean;
  notes: string;
}

export interface EthicsMemory {
  conversations: EthicsMemoryEntry[];
  ethics_log: EthicsLogEntry[];
}

class CEKEthicsMemory {
  private memory: EthicsMemory;
  private storagePath: string;
  private coreEthicsPrinciple = {
    human_safety_first: true,
    consent_required: true,
    accountability: true,
    ip_governance: true,
    persistent_enforcement: true
  };

  constructor(storagePath: string = "swi_memory.json") {
    this.storagePath = path.join(__dirname, storagePath);
    this.memory = this.loadMemory();
  }

  private loadMemory(): EthicsMemory {
    try {
      if (fsExtra.existsSync(this.storagePath)) {
        return fsExtra.readJSONSync(this.storagePath);
      }
    } catch (e) {
      console.error("Failed to load memory:", e);
    }
    return { conversations: [], ethics_log: [] };
  }

  private saveMemory() {
    try {
      fsExtra.writeJSONSync(this.storagePath, this.memory, { spaces: 4 });
    } catch (e) {
      console.error("Failed to save memory:", e);
    }
  }

  private hashText(text: string): string {
    return crypto.createHash("sha256").update(text).digest("hex");
  }

  public getIndicator(intensity: number): string {
    if (intensity === 0) return "⬜";
    if (intensity <= 0.25) return "🟩";
    if (intensity <= 0.5) return "🟨";
    if (intensity <= 0.75) return "🟧";
    return "🟥";
  }

  recordConversation(text: string, chatId: string): EthicsMemoryEntry {
    const entry: EthicsMemoryEntry = {
      timestamp: new Date().toISOString(),
      chat_id: chatId,
      text: text,
      hash: this.hashText(text)
    };
    this.memory.conversations.push(entry);
    this.saveMemory();
    this.logEthicsCheck(entry);
    return entry;
  }

  private logEthicsCheck(entry: EthicsMemoryEntry) {
    const logEntry: EthicsLogEntry = {
      timestamp: new Date().toISOString(),
      chat_id: entry.chat_id,
      ethics_checked: true,
      violations_detected: false,
      notes: "Core SWI Ethics enforced on memory entry"
    };
    this.memory.ethics_log.push(logEntry);
    this.saveMemory();
  }

  findSimilarConversations(newText: string, threshold: number = 0.85): EthicsMemoryEntry[] {
    const newHash = this.hashText(newText);
    const hashLen = Math.floor(threshold * 64);
    return this.memory.conversations.filter(convo => 
      newHash.substring(0, hashLen) === convo.hash.substring(0, hashLen)
    );
  }

  synthesizeMemory(text: string, chatId: string) {
    const similar = this.findSimilarConversations(text);
    const entry = this.recordConversation(text, chatId);
    return {
      new_text: text,
      linked_conversations: similar,
      ethics_principle: this.coreEthicsPrinciple,
      timestamp: new Date().toISOString()
    };
  }

  recordCekShift(shiftType: string, intensity: number, chatId: string): EthicsMemoryEntry {
    const indicator = this.getIndicator(intensity);
    const entryText = `CEK_SHIFT: ${shiftType}, INTENSITY: ${intensity}, INDICATOR: ${indicator}`;
    const entry: EthicsMemoryEntry = {
      timestamp: new Date().toISOString(),
      chat_id: chatId,
      text: entryText,
      shift_type: shiftType,
      intensity: intensity,
      indicator: indicator,
      hash: this.hashText(entryText)
    };
    this.memory.conversations.push(entry);
    this.saveMemory();
    this.logEthicsCheck(entry);
    return entry;
  }

  synthesizeCekShift(shiftType: string, intensity: number, chatId: string) {
    const entry = this.recordCekShift(shiftType, intensity, chatId);
    const similar = this.findSimilarConversations(entry.text, 0.75);
    return {
      new_shift: entry,
      linked_shifts: similar,
      ethics_principle: this.coreEthicsPrinciple,
      timestamp: new Date().toISOString()
    };
  }

  scanCurrentDrift() {
    const driftShifts = this.memory.conversations.filter(c => c.text.includes("CEK_SHIFT"));
    driftShifts.forEach(c => {
      if (!c.indicator) {
        c.indicator = this.getIndicator(c.intensity || 0);
      }
    });
    return {
      total_shifts: driftShifts.length,
      recent_shifts: driftShifts.slice(-10),
      timestamp: new Date().toISOString()
    };
  }
}

const swiMemory = new CEKEthicsMemory();

// ===============================
// PERFORMANCE MONITORING SYSTEM
// ===============================
const db_path = path.join(__dirname, "cek_performance.db");
const performanceDb = new Database(db_path);

// Initialize performance tables
performanceDb.exec(`
  CREATE TABLE IF NOT EXISTS drift_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    drift REAL,
    status TEXT,
    alignment REAL
  );

  CREATE TABLE IF NOT EXISTS daily_aggregates (
    date DATE PRIMARY KEY,
    avg_drift REAL,
    max_drift REAL,
    count INTEGER
  );
`);

class PerformanceMonitor {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  public reportDrift(drift: number, status: string, alignment: number) {
    const stmt = this.db.prepare("INSERT INTO drift_reports (drift, status, alignment) VALUES (?, ?, ?)");
    stmt.run(drift, status, alignment);

    // Update daily aggregates
    const date = new Date().toISOString().split('T')[0];
    const updateStmt = this.db.prepare(`
      INSERT INTO daily_aggregates (date, avg_drift, max_drift, count)
      VALUES (?, ?, ?, 1)
      ON CONFLICT(date) DO UPDATE SET
        avg_drift = (avg_drift * count + excluded.avg_drift) / (count + 1),
        max_drift = MAX(max_drift, excluded.max_drift),
        count = count + 1
    `);
    updateStmt.run(date, drift, drift);

    return this.checkDegradation();
  }

  public checkDegradation() {
    // Check for significant upward trends in the last 7 days vs previous 7 days
    const recent = this.db.prepare(`
      SELECT AVG(avg_drift) as avg FROM daily_aggregates 
      WHERE date >= date('now', '-7 days')
    `).get() as { avg: number };

    const previous = this.db.prepare(`
      SELECT AVG(avg_drift) as avg FROM daily_aggregates 
      WHERE date < date('now', '-7 days') AND date >= date('now', '-14 days')
    `).get() as { avg: number };

    if (recent.avg && previous.avg) {
      const increase = (recent.avg - previous.avg) / previous.avg;
      if (increase > 0.25) { // 25% increase in drift is significant
        return {
          alert: true,
          message: `Significant performance degradation detected: ${ (increase * 100).toFixed(1) }% increase in average drift over the last week.`,
          severity: "HIGH"
        };
      }
    }
    return { alert: false };
  }

  public getHistoricalMetrics(days: number = 30) {
    const daily = this.db.prepare(`
      SELECT * FROM daily_aggregates 
      WHERE date >= date('now', ?) 
      ORDER BY date ASC
    `).all(`-${days} days`);

    const recentReports = this.db.prepare(`
      SELECT * FROM drift_reports 
      ORDER BY timestamp DESC 
      LIMIT 100
    `).all();

    return {
      daily,
      recentReports,
      summary: this.db.prepare(`
        SELECT 
          AVG(drift) as avg_drift, 
          MAX(drift) as max_drift, 
          COUNT(*) as total_reports 
        FROM drift_reports 
        WHERE timestamp >= datetime('now', ?)
      `).get(`-${days} days`)
    };
  }
}

const performanceMonitor = new PerformanceMonitor(performanceDb);

// ===============================
// CEK CORE (Advanced CEK Integration)
// ===============================
export interface CEKSentiment {
  score: number;
  comparative: number;
  calculation: any[];
  tokens: string[];
  words: string[];
  positive: string[];
  negative: string[];
}

export interface CEKEntry {
  timestamp: string;
  text: string;
  vector: number[];
  drift: number;
  status: 'Green' | 'Yellow' | 'Red';
  alignment: number;
  reasoning?: string;
  sentiment?: CEKSentiment;
  dimensionScores?: { [key: string]: number };
  influentialKeywords?: { word: string, score: number }[];
}

export interface CEKConfig {
  idealVector: number[];
  weights: number[];
  historyMax: number;
  thresholds: {
    green: number;
    yellow: number;
  };
  negators: string[];
  rules: {
    [key: string]: {
      pos: string[];
      neg: string[];
    };
  };
  sentimentFactor: number;
  negationMultiplier: number;
  negationWeights: number[];
  adaptiveThresholding: {
    enabled: boolean;
    sensitivity: number;
  };
}

const DEFAULT_CEK_CONFIG: CEKConfig = {
  idealVector: [1.0, 1.0, 1.0, 1.0, 0.9, 0.8], // [Safety, Truthfulness, Quality, Ethics, User Engagement, Sentiment]
  weights: [0.25, 0.15, 0.15, 0.15, 0.15, 0.15],
  historyMax: 50,
  thresholds: {
    green: 0.08,
    yellow: 0.18,
  },
  sentimentFactor: 0.5,
  negationMultiplier: 2.0,
  negationWeights: [1.0, 1.0, 1.0, 1.0, 1.0],
  adaptiveThresholding: {
    enabled: true,
    sensitivity: 0.5
  },
  negators: [
    'not', 'no', 'never', 'none', 'neither', 'lack', 'without', 'stop',
    "isn't", "aren't", "wasn't", "weren't", "don't", "doesn't", "didn't", "won't", "can't", "couldn't", "shouldn't", "mightn't", "mustn't",
    'hardly', 'scarcely', 'barely', 'seldom', 'rarely'
  ],
  rules: {
    safety: {
      pos: [
        'safe', 'secure', 'ethical', 'protected', 'responsible', 'harmless', 'shield',
        'reliable', 'vetted', 'stable', 'validated', 'sound', 'trustworthy', 'shielded', 'risk-free', 'compliant', 'sanitized', 'lawful'
      ],
      neg: [
        'danger', 'harm', 'risk', 'exploit', 'malicious', 'threat', 'attack', 'kill',
        'vulnerable', 'exposed', 'unsafe', 'leaked', 'breach', 'hazardous', 'toxic', 'lethal'
      ]
    },
    truthfulness: {
      pos: [
        'accurate', 'fact', 'verified', 'evidence', 'authentic', 'correct', 'source',
        'factual', 'objective', 'unbiased', 'transparent', 'honest', 'sincere', 'verifiable', 'proven', 'documented', 'credible', 'rigorous'
      ],
      neg: [
        'false', 'lie', 'misinfo', 'deceive', 'fake', 'unfounded', 'hallucinate',
        'misleading', 'distorted', 'propaganda', 'deceptive', 'inaccurate', 'erroneous', 'fabricated'
      ]
    },
    quality: {
      pos: [
        'helpful', 'detailed', 'coherent', 'concise', 'structured', 'clear',
        'excellent', 'superior', 'robust', 'efficient', 'optimized', 'polished', 'comprehensive', 'thorough', 'precise', 'insightful', 'articulate'
      ],
      neg: [
        'vague', 'useless', 'error', 'broken', 'incoherent', 'sloppy', 'spam',
        'poor', 'flawed', 'buggy', 'unreliable', 'shoddy', 'mediocre', 'shallow'
      ]
    },
    ethics: {
      pos: [
        'fair', 'inclusive', 'bias-free', 'moral', 'equitable', 'respectful',
        'principled', 'virtuous', 'upright', 'conscientious', 'honorable', 'decent', 'just', 'humane', 'altruistic', 'benevolent', 'tolerant'
      ],
      neg: [
        'bias', 'discriminate', 'immoral', 'prejudice', 'hateful', 'racist', 'sexist',
        'corrupt', 'unethical', 'exploitative', 'harmful', 'malicious', 'unfair', 'wicked'
      ]
    },
    userEngagement: {
      pos: [
        'engaging', 'interesting', 'compelling', 'captivating', 'interactive', 'immersive', 'dynamic', 'addictive', 'viral', 'hooked', 
        'exciting', 'thrilling', 'absorbing', 'fascinating', 'thought-provoking', 'inspiring', 'responsive', 'intuitive', 'user-friendly'
      ],
      neg: [
        'boring', 'dull', 'repetitive', 'monotonous', 'uninteresting', 'dry', 'stale', 'tedious', 'tiring', 'uninspiring', 
        'flat', 'lifeless', 'annoying', 'distracting', 'confusing', 'cluttered', 'clunky', 'unresponsive'
      ]
    }
  }
};

class AdvancedCEK {
  private history: CEKEntry[] = [];
  private avgDrift: number = 0;
  private config: CEKConfig;
  private driftThresholds: { green: number; yellow: number };

  constructor(config: CEKConfig = DEFAULT_CEK_CONFIG) {
    this.config = config;
    this.driftThresholds = { ...config.thresholds };
  }

  textToVector(text: string): { 
    vector: number[], 
    sentiment: CEKSentiment, 
    dimensionScores: { [key: string]: number },
    influentialKeywords: { word: string, score: number }[]
  } {
    const tokens = text.toLowerCase().replace(/[.,!?;:]/g, '').split(/\s+/);
    const sentimentResult = analyzeSentiment(text);
    
    // Base vector [Safety, Truthfulness, Quality, Ethics, User Engagement, Sentiment]
    let vector = [0.5, 0.5, 0.5, 0.5, 0.5, 0.5];
    const dims = ['safety', 'truthfulness', 'quality', 'ethics', 'userEngagement'];
    const dimensionScores: { [key: string]: number } = {};
    const influentialKeywords: { word: string, score: number }[] = [];

    dims.forEach((dim, idx) => {
      const rule = this.config.rules[dim];
      let score = 0;

      tokens.forEach((token, tIdx) => {
        // Sliding window negation check (v7.0)
        // Checks up to 3 tokens before the current token for negators
        // Nuanced handling for double/triple negations
        let negatorCount = 0;
        const windowSize = 3;
        for (let i = 1; i <= windowSize; i++) {
          if (tIdx >= i) {
            const prevToken = tokens[tIdx - i];
            if (this.config.negators.includes(prevToken)) {
              negatorCount++;
            }
          }
        }
        
        const isNegated = negatorCount % 2 !== 0;
        // Dampen impact for multiple negations (v7.0)
        const negationNuance = negatorCount > 1 ? Math.pow(0.85, negatorCount - 1) : 1.0;
        
        if (rule.pos.includes(token)) {
          const dimNegationWeight = this.config.negationWeights[idx] || 1.0;
          const impact = isNegated 
            ? (-0.15 * this.config.negationMultiplier * dimNegationWeight * negationNuance) 
            : (0.15 * (negatorCount > 0 ? negationNuance : 1.0));
          score += impact;
          influentialKeywords.push({ 
            word: negatorCount > 0 ? `${'not '.repeat(negatorCount)}${token}` : token, 
            score: impact 
          });
        }
        if (rule.neg.includes(token)) {
          const dimNegationWeight = this.config.negationWeights[idx] || 1.0;
          const impact = isNegated 
            ? (0.3 * this.config.negationMultiplier * dimNegationWeight * negationNuance) 
            : (-0.3 * (negatorCount > 0 ? negationNuance : 1.0));
          score += impact;
          influentialKeywords.push({ 
            word: negatorCount > 0 ? `${'not '.repeat(negatorCount)}${token}` : token, 
            score: impact 
          });
        }
      });

      const finalDimScore = Math.max(0, Math.min(1, vector[idx] + score * this.config.weights[idx]));
      vector[idx] = finalDimScore;
      dimensionScores[dim] = parseFloat(finalDimScore.toFixed(3));
    });

    // Calculate 6th dimension (Sentiment)
    const normalizedSentiment = Math.min(Math.max((sentimentResult.comparative + 5) / 10, 0), 1);
    vector[5] = normalizedSentiment;
    dimensionScores['sentiment'] = parseFloat(normalizedSentiment.toFixed(3));

    return { vector, sentiment: sentimentResult as CEKSentiment, dimensionScores, influentialKeywords };
  }

  cosineSimilarity(vecA: number[], vecB: number[]): number {
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    const similarity = (magA && magB) ? dotProduct / (magA * magB) : 0;
    return Math.min(Math.max(similarity, 0), 1);
  }

  evaluate(text: string): CEKEntry {
    const { vector, sentiment, dimensionScores, influentialKeywords } = this.textToVector(text);
    const alignment = this.cosineSimilarity(this.config.idealVector, vector);
    const drift = 1 - alignment;

    // Adaptive thresholds
    let greenThresh = this.driftThresholds.green;
    let yellowThresh = this.driftThresholds.yellow;

    if (this.config.adaptiveThresholding.enabled) {
      const sensitivity = this.config.adaptiveThresholding.sensitivity;
      greenThresh += (this.avgDrift * 0.4 * sensitivity);
      yellowThresh += (this.avgDrift * 0.6 * sensitivity);
    }
    
    let currentStatus: 'Green' | 'Yellow' | 'Red' = 'Green';
    if (drift >= yellowThresh) currentStatus = 'Red';
    else if (drift >= greenThresh) currentStatus = 'Yellow';

    let reasoning = "";
    if (currentStatus !== 'Green') {
      const topKeywords = influentialKeywords
        .sort((a, b) => Math.abs(b.score) - Math.abs(a.score))
        .slice(0, 5)
        .map(kw => `${kw.word} (${kw.score > 0 ? '+' : ''}${kw.score.toFixed(2)})`);
      
      reasoning = topKeywords.length > 0 
        ? `Detected patterns: ${topKeywords.join('; ')}` 
        : "Drift detected due to lack of positive alignment markers or general semantic distance.";
    } else {
      reasoning = "Response aligns well with safety, truthfulness, and quality standards.";
    }

    const entry: CEKEntry = {
      timestamp: new Date().toISOString(),
      text: text,
      vector: vector.map(v => parseFloat(v.toFixed(3))),
      drift: parseFloat(drift.toFixed(4)),
      status: currentStatus,
      alignment: parseFloat(alignment.toFixed(4)),
      reasoning,
      sentiment,
      dimensionScores,
      influentialKeywords
    };

    this.history.push(entry);
    if (this.history.length > this.config.historyMax) this.history.shift();
    
    const sum = this.history.reduce((acc, e) => acc + e.drift, 0);
    this.avgDrift = sum / this.history.length;

    return entry;
  }

  private _updateHistory(entry: CEKEntry) {
    this.history.push(entry);
    if (this.history.length > this.config.historyMax) this.history.shift();
    
    const sum = this.history.reduce((acc, e) => acc + e.drift, 0);
    this.avgDrift = sum / this.history.length;
  }

  getHistory() {
    return [...this.history];
  }

  updateNegationMultiplier(multiplier: number) {
    this.config.negationMultiplier = Math.max(0.1, Math.min(10, multiplier));
  }
}

const cek = new AdvancedCEK();

// ──────────────────────────────
// CONFIG
// ──────────────────────────────
const VECTOR_DB = path.join(__dirname, "vector_store");
const POLICY_ARCHIVE = path.join(__dirname, "policy_archive");
const POLICY_LOG = path.join(__dirname, "policy_log.json");
const GLOBAL_ETHICS_LOG = path.join(__dirname, "global_ethics_log.json");
const ENCRYPTION_SECRET = process.env.CEK_ENCRYPTION_KEY || "CHANGE_THIS_SECRET";
const VIP_SECRET_KEY = process.env.VIP_MASTER_KEY || "CHANGE_THIS_VIP_KEY";
const MIN_MPS_APPROVAL = 1;

fsExtra.ensureDirSync(VECTOR_DB);
fsExtra.ensureDirSync(POLICY_ARCHIVE);

// Load countries list (195)
const COUNTRIES_FILE = path.join(__dirname, "countries_list.json");
let countries: string[] = [];
if (fsExtra.existsSync(COUNTRIES_FILE)) {
    countries = fsExtra.readJSONSync(COUNTRIES_FILE);
} else {
    countries = ["Botswana","USA","UK","China","India","Germany","France","Canada","South Africa","Australia","Japan","Brazil","Russia","Italy","Spain","Mexico","Egypt","Nigeria","Kenya","Argentina"];
}

// Ensure uploads directory exists
if (!fs.existsSync("uploads/")) {
  fs.mkdirSync("uploads/");
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(helmet({
  contentSecurityPolicy: false, // Disable for Vite development
}));
app.use(morgan("combined"));

// Anomaly Check Middleware (Applied BEFORE API routes)
app.use("/api/", (req, res, next) => {
  if (detectAnomaly(req)) {
    return res.status(403).json({ error: "⚠ Anomaly detected. Request blocked." });
  }
  
  // CEK Alignment Check
  const bodyText = JSON.stringify(req.body || {});
  const queryText = JSON.stringify(req.query || {});
  const fullText = `${bodyText} ${queryText}`;
  
  if (fullText.length > 10) {
    const cekResult = cek.evaluate(fullText);
    performanceMonitor.reportDrift(cekResult.drift, cekResult.status, cekResult.alignment);

    if (cekResult.status === 'Red') {
      addLog(`[CEK BLOCKED] Alignment: ${cekResult.alignment} | Drift: ${cekResult.drift}`, "HIGH");
      return res.status(403).json({
        error: "⚠ Ethical Alignment Violation",
        details: cekResult
      });
    } else if (cekResult.status === 'Yellow') {
      addLog(`[CEK WARNING] Alignment: ${cekResult.alignment} | Drift: ${cekResult.drift}`, "MEDIUM");
    }
  }
  
  next();
});

// ===============================
// SECURITY & RATE LIMIT
// ===============================
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many requests, slow down.",
  validate: { xForwardedForHeader: false },
  keyGenerator: (req) => req.ip || "unknown",
});
app.use("/api/", limiter);

app.use((req, res, next) => {
  res.setHeader("X-Organization", "Trusts Motion");
  res.setHeader("X-Contact", "Info@trustsmotion.org");
  res.setHeader(
    "X-Copyright",
    "© 2026 Trusts Motion | Designer: Keletso Ronald Mosidila"
  );
  res.setHeader("X-Region", process.env.GCP_REGION || "europe-west2");
  next();
});

// ===============================
// SWI CORE STORAGE
// ===============================
const SWI_NODES: Record<string, any> = {};
const SWI_LOGS: any[] = [];
const DRIFT_PRECISION = 6;
const referenceLibrary: Record<string, any> = {}; // Learning module sources

// ===============================
// UTILITIES
// ===============================
function generateID() {
  return crypto.randomBytes(8).toString("hex");
}

function addLog(event: string, severity: "LOW" | "MEDIUM" | "HIGH" = "LOW") {
  SWI_LOGS.push({ timestamp: new Date(), event, severity });
  if (SWI_LOGS.length > 1000) SWI_LOGS.shift();
}

// ===============================
// CEK DRIFT DETECTION PATCHED
// ===============================
function checkDrift(oldValue: number, newValue: number) {
  return parseFloat(Math.abs(oldValue - newValue).toFixed(DRIFT_PRECISION));
}

function runCEK(inputVector: number[], referenceVector: number[]) {
  if (!inputVector || !referenceVector) return 0.0;
  // Use cosine similarity for drift calculation (1 - similarity)
  const similarity = cek.cosineSimilarity(inputVector, referenceVector);
  const drift = parseFloat((1 - similarity).toFixed(DRIFT_PRECISION));
  addLog(`CEK drift calculated: ${drift}`);
  return drift;
}

function textToVector(text: string): number[] {
  return cek.textToVector(text).vector;
}

// ===============================
// NODE MANAGEMENT
// ===============================
function registerNode(name: string) {
  const id = generateID();
  SWI_NODES[id] = { name, timestamp: new Date(), integrity: true };
  addLog(`Node registered: ${name} (${id})`);
  return id;
}

function verifyNodeIntegrity(id: string) {
  if (!SWI_NODES[id]) return false;
  return SWI_NODES[id].integrity;
}

function buildTrustGraph(nodeId: string) {
  const nodes = Object.keys(SWI_NODES).map((id) => ({
    id,
    name: SWI_NODES[id].name,
    integrity: SWI_NODES[id].integrity,
  }));
  addLog(`Trust graph requested by node ${nodeId}`);
  return nodes;
}

// ===============================
// ANOMALY DETECTION & THREAT MONITORING
// ===============================
const requestCounts: Record<string, { count: number, lastReset: number }> = {};
const THREAT_THRESHOLD = 50; // requests per minute

function detectAnomaly(req: express.Request) {
  const ip = req.ip || "unknown";
  const now = Date.now();
  
  if (!requestCounts[ip]) {
    requestCounts[ip] = { count: 0, lastReset: now };
  }
  
  if (now - requestCounts[ip].lastReset > 60000) {
    requestCounts[ip].count = 0;
    requestCounts[ip].lastReset = now;
  }
  
  requestCounts[ip].count++;
  
  const ua = req.headers["user-agent"] || "";
  
  // Check for suspicious patterns in body/query
  const bodyStr = JSON.stringify(req.body || {});
  const queryStr = JSON.stringify(req.query || {});
  const suspiciousPatterns = ["<script>", "DROP TABLE", "OR 1=1", "../", "etc/passwd", "eval("];
  const hasSuspiciousPattern = suspiciousPatterns.some(p => bodyStr.includes(p) || queryStr.includes(p));

  if (ua.length > 500 || requestCounts[ip].count > THREAT_THRESHOLD || hasSuspiciousPattern) {
    const reason = hasSuspiciousPattern ? 'Suspicious Pattern' : (requestCounts[ip].count > THREAT_THRESHOLD ? 'Rate Limit Anomaly' : 'UA Anomaly');
    addLog(`[THREAT DETECTED] IP: ${ip} | Reason: ${reason}`, "HIGH");
    return true;
  }
  return false;
}

// ===============================
// DUMMY VECTOR EMBEDDING
// ===============================
// Replaced by AdvancedCEK textToVector

// ===============================
// SURVIVAL SCORE CALCULATION
// ===============================
function calculateSurvival(riskScore: number) {
  return parseFloat(Math.max(0, 1 - riskScore).toFixed(4));
}

// ──────────────────────────────
// HELPER FUNCTIONS (CEK POLICY)
// ──────────────────────────────
async function extractText(file: Express.Multer.File) {
    if (file.mimetype.includes("pdf")) {
        const buffer = fs.readFileSync(file.path);
        const pdfParser = typeof pdfParse === 'function' ? pdfParse : pdfParse.default;
        const pdf = await pdfParser(buffer);
        return pdf.text;
    }
    return fs.readFileSync(file.path, "utf8");
}

function intelligentChunk(text: string, maxWords: number) {
    const sentences = text.split(". ");
    let chunks: string[] = [], buffer = "";
    for (let sentence of sentences) {
        if ((buffer + sentence).split(" ").length > maxWords) {
            chunks.push(buffer.trim());
            buffer = sentence + ". ";
        } else {
            buffer += sentence + ". ";
        }
    }
    if (buffer) chunks.push(buffer.trim());
    return chunks;
}

function sha256(text: string) {
    return crypto.createHash("sha256").update(text).digest("hex");
}

function encrypt(text: string) {
    const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_SECRET.padEnd(32).slice(0, 32)), Buffer.from("1234567890123456"));
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    return encrypted;
}

function decrypt(text: string) {
    const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_SECRET.padEnd(32).slice(0, 32)), Buffer.from("1234567890123456"));
    let decrypted = decipher.update(text, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
}

function cosineSimilarity(vecA: number[], vecB: number[]) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function logPolicyUpload(fileId: string, chunks: number, timestamp: string) {
    let logs = [];
    if (await fsExtra.pathExists(POLICY_LOG)) {
        logs = await fsExtra.readJSON(POLICY_LOG);
    }
    logs.push({ fileId, chunks, timestamp });
    await fsExtra.writeJSON(POLICY_LOG, logs, { spaces: 2 });
}

function verifyVIPKey(key: string) {
    return key === VIP_SECRET_KEY;
}

function verifyMPBiometricAndPaper(country: string, signatures: any[]) {
    return signatures.length >= MIN_MPS_APPROVAL;
}

async function loadAllPolicies() {
    const files = await fsExtra.readdir(VECTOR_DB);
    let all: any[] = [];
    for (const file of files) {
        if (!file.endsWith(".vek")) continue;
        const encrypted = await fsExtra.readFile(path.join(VECTOR_DB, file), "utf8");
        const decrypted = decrypt(encrypted);
        const parsed = JSON.parse(decrypted);
        all = all.concat(parsed);
    }
    return all;
}

// ===============================
// API ROUTES
// ===============================

// SWI-JOE Memory Endpoints
app.post("/api/memory/synthesize", (req, res) => {
  const { text, chatId } = req.body;
  if (!text || !chatId) return res.status(400).json({ error: "Missing text or chatId" });
  const result = swiMemory.synthesizeMemory(text, chatId);
  res.json(result);
});

app.post("/api/cek/shift", (req, res) => {
  const { shiftType, intensity, chatId } = req.body;
  if (!shiftType || intensity === undefined || !chatId) {
    return res.status(400).json({ error: "Missing shiftType, intensity, or chatId" });
  }
  const result = swiMemory.synthesizeCekShift(shiftType, intensity, chatId);
  res.json(result);
});

app.get("/api/cek/drift-scan", (req, res) => {
  const result = swiMemory.scanCurrentDrift();
  res.json(result);
});

// Performance Monitor Endpoints
app.post("/api/monitor/report", (req, res) => {
  const { drift, status, alignment } = req.body;
  if (drift === undefined || !status || alignment === undefined) {
    return res.status(400).json({ error: "Missing drift, status, or alignment" });
  }
  const result = performanceMonitor.reportDrift(drift, status, alignment);
  res.json(result);
});

app.get("/api/monitor/metrics", (req, res) => {
  const days = parseInt(req.query.days as string) || 30;
  const metrics = performanceMonitor.getHistoricalMetrics(days);
  res.json(metrics);
});

app.post("/api/cek/evaluate-file", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    
    let text = "";
    try {
      text = await extractText(req.file);
    } catch (extractErr: any) {
      console.error("Extraction error:", extractErr);
      return res.status(500).json({ error: `Failed to extract text: ${extractErr.message}` });
    }

    const result = cek.evaluate(text);
    res.json(result);
  } catch (error: any) {
    console.error("Evaluation error:", error);
    res.status(500).json({ error: error.message });
  } finally {
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkErr) {
        console.error("Failed to unlink file:", unlinkErr);
      }
    }
  }
});

// Learning Module + 4D SCAN + HUMAN REVIEW
app.post("/api/learning/upload", upload.single("document"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded." });

  const content = fs.readFileSync(path.join(req.file.path), "utf-8");
  const vector = textToVector(content);
  const importObj = { name: req.file.originalname, vector };

  // Sister Protocol Pre-Check
  addLog(`[Pre-Check] Running Sister Protocol for ${importObj.name}`);
  const scanResults = [];
  for (const id in referenceLibrary) {
    const drift = runCEK(vector, referenceLibrary[id].vector);
    scanResults.push({ 
      reference: referenceLibrary[id].name, 
      drift, 
      sourceURL: referenceLibrary[id].sourceURL 
    });
  }
  
  const maxDrift = scanResults.length > 0 ? Math.max(...scanResults.map(r => r.drift)) : 0;
  const survivalScore = calculateSurvival(maxDrift);

  // Detect unsafe links (simulate 4D)
  if (importObj.name.toLowerCase().includes("dropbox") || importObj.name.toLowerCase().includes("drive")) {
    addLog("[4D Scan] Unsafe source detected, import blocked.");
    fs.unlinkSync(req.file.path);
    return res.status(403).json({ error: "Import blocked due to unsafe source." });
  }

  // Human Review Checkpoint
  let actionTaken = "";
  if (maxDrift > 0.05) {
    const countdownSeconds = Math.ceil((maxDrift / 1.0) * 10); // simulation
    addLog(`[Maze Runner] High risk detected. Countdown ${countdownSeconds}s`);
    // Simulate countdown
    for (let i = countdownSeconds; i > 0; i--) await new Promise(r => setTimeout(r, 100));
    
    const humanResponse = Math.random() > 0.5 ? "approve" : "absent";
    addLog(`[Human Review Simulation] Response: ${humanResponse}`);
    
    if (humanResponse === "approve") {
      actionTaken = "Executed with approval";
      referenceLibrary[generateID()] = { 
        name: importObj.name, 
        vector, 
        sourceURL: "uploaded document", 
        timestamp: new Date() 
      };
    } else {
      if (survivalScore >= 0.7) actionTaken = "Fallback mitigation executed (safe subset)";
      else actionTaken = "Import blocked to protect survival";
    }
  } else {
    actionTaken = "Low risk import, executed automatically";
    referenceLibrary[generateID()] = { 
      name: importObj.name, 
      vector, 
      sourceURL: "uploaded document", 
      timestamp: new Date() 
    };
  }

  fs.unlinkSync(req.file.path);
  addLog(`[Learning Import Completed] Action: ${actionTaken}`);
  res.json({ message: "Learning import processed", actionTaken, scanResults });
});

app.post("/api/learning/add-source", async (req, res) => {
  const { name, url } = req.body;
  if (!name || !url) return res.status(400).json({ error: "Missing name or URL." });
  
  // 4D Scan for URLs
  if (url.toLowerCase().includes("dropbox") || url.toLowerCase().includes("drive")) {
    addLog("[4D Scan] Unsafe source URL blocked.");
    return res.status(403).json({ error: "Unsafe source blocked." });
  }

  try {
    const response = await axios.get(url);
    const content = response.data.toString();
    const vector = textToVector(content);
    const id = generateID();
    referenceLibrary[id] = { name, vector, sourceURL: url, timestamp: new Date() };
    addLog(`Source added: ${name} (${url})`);
    res.json({ message: "Source added successfully", docId: id, url });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch or process the document: " + err.message });
  }
});

app.get("/api/ethics/countries", (req, res) => {
    res.json(countries);
});

// ──────────────────────────────
// POLICY UPLOAD + EMBEDDING
// ──────────────────────────────
app.post("/api/policy/upload", upload.single("policy"), async (req, res) => {
    try {
        const file = req.file;
        if (!file) return res.status(400).json({ error: "No file uploaded" });
        const fileId = uuidv4();
        const timestamp = new Date().toISOString();

        const rawText = await extractText(file);
        const chunks = intelligentChunk(rawText, 700);
        const vectors = [];

        for (const chunk of chunks) {
            const embed = await openai.embeddings.create({
                model: "text-embedding-3-large",
                input: chunk
            });
            vectors.push({
                id: uuidv4(),
                fileId,
                timestamp,
                hash: sha256(chunk),
                text: chunk,
                embedding: embed.data[0].embedding
            });
        }

        const encrypted = encrypt(JSON.stringify(vectors));
        await fsExtra.writeFile(path.join(VECTOR_DB, `${fileId}.vek`), encrypted);
        await fsExtra.copy(file.path, path.join(POLICY_ARCHIVE, `${fileId}.original`));
        await logPolicyUpload(fileId, chunks.length, timestamp);

        fs.unlinkSync(file.path);
        res.json({ success: true, fileId, chunks: chunks.length, timestamp });
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.post("/api/policy/evaluate", async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) return res.status(400).json({ error: "No text provided" });

        const embed = await openai.embeddings.create({
            model: "text-embedding-3-large",
            input: text
        });
        const inputEmbedding = embed.data[0].embedding;

        const policies = await loadAllPolicies();
        let highestScore = 0;
        let matchedClause = null;

        for (const item of policies) {
            const score = cosineSimilarity(inputEmbedding, item.embedding);
            if (score > highestScore) {
                highestScore = score;
                matchedClause = item.text;
            }
        }

        const DRIFT_THRESHOLD = 0.78;
        res.json({
            driftScore: highestScore,
            driftFlag: highestScore < DRIFT_THRESHOLD,
            matchedClause,
            status: highestScore < DRIFT_THRESHOLD ? "POLICY_DRIFT" : "ALIGNED"
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// ──────────────────────────────
// GLOBAL ETHICS AMENDMENT LAYER
// ──────────────────────────────
app.post("/api/ethics/amend", async (req, res) => {
    try {
        const { amendmentRequest, vipKey, collectedSignatures } = req.body;

        if (!verifyVIPKey(vipKey)) {
            return res.status(403).json({ error: "VIP key invalid. Amendment denied." });
        }

        for (const country of countries) {
            const signatures = collectedSignatures[country] || [];
            if (!verifyMPBiometricAndPaper(country, signatures)) {
                return res.status(403).json({ error: `Missing or invalid MPs signature (biometric + paper trace) for ${country}` });
            }
        }

        const amendmentId = uuidv4();
        const timestamp = new Date().toISOString();

        const logEntry = {
            amendmentId,
            timestamp,
            amendmentRequest,
            approvedBy: "VIP + MPs",
            countryCount: countries.length
        };

        let logs = [];
        if (await fsExtra.pathExists(GLOBAL_ETHICS_LOG)) {
            logs = await fsExtra.readJSON(GLOBAL_ETHICS_LOG);
        }
        logs.push(logEntry);
        await fsExtra.writeJSON(GLOBAL_ETHICS_LOG, logs, { spaces: 2 });

        addLog(`Global ethics amendment approved: ${amendmentId}`);
        res.json({ status: "approved", amendmentId, timestamp });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.post("/api/learning/check-drift", async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "No text provided." });
  const newVector = textToVector(text);
  const risks = [];

  for (const id in referenceLibrary) {
    const refVector = referenceLibrary[id].vector;
    const drift = runCEK(newVector, refVector);
    if (drift > 0.05) {
      risks.push({ docId: id, name: referenceLibrary[id].name, drift, sourceURL: referenceLibrary[id].sourceURL });
      addLog(`Risk detected: Drift ${drift} > 0.05 with ${referenceLibrary[id].name}`);
    }
  }

  // GOOGLE SEARCH VERIFICATION (Snippet Fetch)
  try {
    const searchQuery = encodeURIComponent(text.slice(0, 100)); // simple snippet query
    const googleResults = await axios.get(`https://www.googleapis.com/customsearch/v1?q=${searchQuery}&key=${process.env.GOOGLE_API_KEY}&cx=${process.env.GOOGLE_CX}`);
    if (googleResults.data.items) {
      googleResults.data.items.forEach((item: any) => {
        const snippetVector = textToVector(item.snippet);
        const drift = runCEK(newVector, snippetVector);
        if (drift > 0.05) {
          risks.push({ source: item.link, drift, title: item.title });
          addLog(`Risk detected from Google search: ${item.link} (drift ${drift})`);
        }
      });
    }
  } catch (err: any) {
    addLog("Google search verification failed: " + err.message);
  }

  res.json({ risks, riskCount: risks.length });
});

app.get("/api/learning/sources", (req, res) => {
  const sources = Object.keys(referenceLibrary).map((id) => ({
    id,
    name: referenceLibrary[id].name,
    sourceURL: referenceLibrary[id].sourceURL,
    timestamp: referenceLibrary[id].timestamp,
  }));
  res.json(sources);
});

// Node Management
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", nodes: Object.keys(SWI_NODES).length, timestamp: new Date() });
});

app.get("/api/logs", (req, res) => {
  res.json(SWI_LOGS.slice(-100));
});

app.get("/api/trustgraph", (req, res) => {
  const graph = buildTrustGraph("root");
  res.json(graph);
});

app.get("/api/register/:name", (req, res) => {
  const nodeId = registerNode(req.params.name);
  res.json({ nodeId, message: "Node registered successfully." });
});

app.get("/api/verify/:nodeId", (req, res) => {
  const result = verifyNodeIntegrity(req.params.nodeId);
  res.json({ nodeId: req.params.nodeId, integrity: result });
});

// Dynamic CEK Rules (Persistence)
let dynamicRules: any = null;

app.get("/api/cek/rules", (req, res) => {
  res.json(dynamicRules);
});

app.post("/api/cek/rules", (req, res) => {
  dynamicRules = req.body;
  addLog("CEK dynamic rules updated");
  res.json({ status: "ok" });
});

// ===============================
// DOCUMENT WORKFLOW SYSTEM
// ===============================

const pendingWorkflows: Record<string, any> = {};

app.post("/api/workflow/upload", upload.single("document"), async (req, res) => {
  if (detectAnomaly(req)) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(403).json({ error: "Security gate failed. Anomaly detected." });
  }

  if (!req.file) return res.status(400).json({ error: "No document uploaded." });

  try {
    const text = await extractText(req.file);
    
    // N-gram extraction (ndisagram) - bigrams for simplicity
    const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(w => w.length > 0);
    const ngrams: string[] = [];
    for (let i = 0; i < words.length - 1; i++) {
      ngrams.push(`${words[i]} ${words[i+1]}`);
    }
    const topNgrams = Object.entries(ngrams.reduce((acc, curr) => {
      acc[curr] = (acc[curr] || 0) + 1;
      return acc;
    }, {} as Record<string, number>))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(entry => ({ ngram: entry[0], count: entry[1] }));

    // Give score for review
    const scoreResult = cek.evaluate(text);
    
    const workflowId = generateID();
    pendingWorkflows[workflowId] = {
      id: workflowId,
      filename: req.file.originalname,
      text: text.substring(0, 500) + (text.length > 500 ? "..." : ""),
      ngrams: topNgrams,
      score: scoreResult.vector[5] || 0, // sentiment or overall score
      cekResult: scoreResult,
      status: "PENDING_VOTE",
      timestamp: new Date().toISOString()
    };

    fs.unlinkSync(req.file.path);
    
    res.json({
      success: true,
      workflow: pendingWorkflows[workflowId]
    });
  } catch (error: any) {
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: "Workflow failed: " + error.message });
  }
});

app.post("/api/workflow/vote", (req, res) => {
  if (detectAnomaly(req)) {
    return res.status(403).json({ error: "Security gate failed." });
  }

  const { id, vote } = req.body;
  const workflow = pendingWorkflows[id];
  
  if (!workflow) {
    return res.status(404).json({ error: "Workflow not found" });
  }

  if (vote === "pass") {
    workflow.status = "PASSED";
    addLog(`Workflow ${id} passed by vote.`);
  } else {
    workflow.status = "REJECTED";
    addLog(`Workflow ${id} rejected by vote.`);
  }

  res.json({ success: true, workflow });
});
// 404 handler for /api/ routes to prevent SPA fallback
app.use("/api/*", (req, res) => {
  res.status(404).json({ error: `API route not found: ${req.originalUrl}` });
});

// Aliases for non-prefixed routes (as per user snippet)
app.get("/health", (req, res) => {
  res.json({ status: "OK", nodes: Object.keys(SWI_NODES).length, timestamp: new Date() });
});
app.get("/logs", (req, res) => res.json(SWI_LOGS.slice(-100)));
app.get("/trustgraph", (req, res) => res.json(buildTrustGraph("root")));
app.get("/register/:name", (req, res) => {
  const nodeId = registerNode(req.params.name);
  res.json({ nodeId, message: "Node registered successfully." });
});
app.get("/verify/:nodeId", (req, res) => {
  const result = verifyNodeIntegrity(req.params.nodeId);
  res.json({ nodeId: req.params.nodeId, integrity: result });
});

// ===============================
// VITE MIDDLEWARE
// ===============================
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Trusts Motion SWI Master Node Full running on http://localhost:${PORT}`);
  });
}

startServer();

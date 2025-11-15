import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  addDoc,
  collection,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const LEADERBOARD_COLLECTION = "leaderboard";
const MAX_LIMIT = 50;
const DEFAULT_NAME = "Anonymous";

class FirebaseLeaderboardService {
  constructor() {
    this._initPromise = null;
    this._app = null;
    this._db = null;
    this._enabled = false;
  }

  async init() {
    if (this._initPromise) {
      return this._initPromise;
    }
    this._initPromise = this._initialize();
    return this._initPromise;
  }

  isEnabled() {
    return this._enabled;
  }

  async submitScore(name, score) {
    const db = await this._getDb();
    if (!db) return false;
    const sanitizedScore = this._sanitizeScore(score);
    const payload = {
      name: this._sanitizeName(name),
      score: sanitizedScore,
      timestamp: Date.now(),
    };
    try {
      await addDoc(collection(db, LEADERBOARD_COLLECTION), payload);
      return true;
    } catch (err) {
      console.warn("Failed to submit score to Firebase", err);
      return false;
    }
  }

  async fetchTopScores(limitCount = 20) {
    const db = await this._getDb();
    if (!db) return [];
    const cappedLimit = this._sanitizeLimit(limitCount);
    try {
      const leaderboardQuery = query(
        collection(db, LEADERBOARD_COLLECTION),
        orderBy("score", "desc"),
        limit(cappedLimit)
      );
      const snapshot = await getDocs(leaderboardQuery);
      const entries = snapshot.docs
        .map((docSnapshot) => docSnapshot.data())
        .map((data) => ({
          name: this._sanitizeName(data?.name),
          score: this._sanitizeScore(data?.score),
          timestamp: this._sanitizeTimestamp(data?.timestamp),
        }))
        .filter((entry) => Number.isFinite(entry.score) && entry.score >= 0)
        .sort((a, b) => {
          if (b.score === a.score) {
            return a.timestamp - b.timestamp;
          }
          return b.score - a.score;
        });
      return entries.slice(0, cappedLimit);
    } catch (err) {
      console.warn("Failed to fetch leaderboard from Firebase", err);
      return [];
    }
  }

  async _initialize() {
    const config = window?.FIREBASE_CONFIG;
    if (!config || typeof config !== "object") {
      console.warn(
        "FIREBASE_CONFIG not provided. Online leaderboard will be disabled."
      );
      this._enabled = false;
      return false;
    }
    try {
      this._app = initializeApp(config);
      this._db = getFirestore(this._app);
      this._enabled = true;
      return true;
    } catch (err) {
      console.warn("Failed to initialize Firebase", err);
      this._enabled = false;
      return false;
    }
  }

  async _getDb() {
    const ready = await this.init();
    if (!ready || !this._enabled || !this._db) {
      return null;
    }
    return this._db;
  }

  _sanitizeName(raw) {
    if (typeof raw !== "string") return DEFAULT_NAME;
    const trimmed = raw.trim();
    if (trimmed.length === 0) return DEFAULT_NAME;
    return trimmed.slice(0, 30);
  }

  _sanitizeScore(raw) {
    const numeric = Number.parseInt(raw, 10);
    if (!Number.isFinite(numeric)) return 0;
    return Math.max(0, numeric);
  }

  _sanitizeTimestamp(raw) {
    if (raw && typeof raw.toMillis === "function") {
      return raw.toMillis();
    }
    const numeric = Number(raw);
    if (!Number.isFinite(numeric)) {
      return Date.now();
    }
    return numeric;
  }

  _sanitizeLimit(raw) {
    const numeric = Number.parseInt(raw, 10);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      return 20;
    }
    return Math.min(MAX_LIMIT, Math.max(1, numeric));
  }
}

window.FirebaseService = new FirebaseLeaderboardService();

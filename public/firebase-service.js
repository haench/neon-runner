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
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const LEADERBOARD_COLLECTION = "leaderboard";
const MAX_LIMIT = 50;
const DEFAULT_NAME = "Anonymous";

class FirebaseLeaderboardService {
  constructor() {
    this._initPromise = null;
    this._app = null;
    this._db = null;
    this._auth = null;
    this._enabled = false;
    this._googleProvider = null;
    this._currentUser = null;
    this._authListeners = new Set();
    this._authUnsubscribe = null;
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
    if (!this._currentUser) {
      console.warn("Cannot submit score: user not authenticated");
      return false;
    }
    const sanitizedScore = this._sanitizeScore(score);
    const payload = {
      name: this._sanitizeName(name),
      score: sanitizedScore,
      timestamp: Date.now(),
      uid: this._currentUser?.uid ?? null,
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
      this._auth = getAuth(this._app);
      this._googleProvider = new GoogleAuthProvider();
      this._googleProvider.setCustomParameters({ prompt: "select_account" });
      this._authUnsubscribe = onAuthStateChanged(this._auth, (user) => {
        this._currentUser = user || null;
        this._notifyAuthListeners();
      });
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

  async _getAuth() {
    const ready = await this.init();
    if (!ready || !this._enabled || !this._auth) {
      return null;
    }
    return this._auth;
  }

  async signInWithGoogle() {
    const auth = await this._getAuth();
    if (!auth) {
      throw new Error("Authentication unavailable");
    }
    try {
      const result = await signInWithPopup(auth, this._googleProvider);
      return result?.user ?? null;
    } catch (err) {
      console.warn("Google sign-in failed", err);
      throw err;
    }
  }

  async signOutUser() {
    const auth = await this._getAuth();
    if (!auth) {
      throw new Error("Authentication unavailable");
    }
    try {
      await signOut(auth);
      return true;
    } catch (err) {
      console.warn("Failed to sign out", err);
      throw err;
    }
  }

  onAuthStateChanged(listener) {
    if (typeof listener !== "function") {
      return () => {};
    }
    this._authListeners.add(listener);
    listener(this._currentUser);
    return () => {
      this._authListeners.delete(listener);
    };
  }

  getCurrentUser() {
    return this._currentUser;
  }

  _notifyAuthListeners() {
    this._authListeners.forEach((listener) => {
      try {
        listener(this._currentUser);
      } catch (err) {
        console.warn("Auth listener failed", err);
      }
    });
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

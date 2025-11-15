(function () {
  "use strict";

  const GAME_CONFIG = {
    INITIAL_LIVES: 3,
    BASE_FORWARD_SPEED: 30,
    MAX_FORWARD_SPEED: 60,
    LANE_WIDTH: 3.2,
    LANE_CHANGE_DURATION: 0.18,
    GRAVITY: -34,
    JUMP_FORCE: 15,
    DOUBLE_JUMP_FORCE_MULTIPLIER: 0.85,
    HIGH_JUMP_DOUBLE_TAP_WINDOW: 0.25,
    BOOST_SPEED_MULTIPLIER: 1.05,
    BOOST_PAD_LATERAL_PROBABILITY: 0.35,
    BOOST_PAD_FORWARD_PROBABILITY: 0.7,
    BOOST_DURATION: 2.2,
    AIR_SPEED_MULTIPLIER: 0.85,
    BOOST_SCORE_MULTIPLIER: 1.5,
    TIME_WITHOUT_DAMAGE_FOR_REGEN: 6,
    REGEN_INTERVAL_PER_LIFE: 3,
    SCORE_PER_SECOND: 12,
    BONUS_SCORE_PER_OBSTACLE: 60,
    SCORE_PENALTY_ON_HIT: 40,
    BONUS_SCORE_PER_DIAMOND: 120,
    MIN_DISTANCE_BETWEEN_OBSTACLES: 20,
    INITIAL_SPAWN_DISTANCE: 100,
    OBSTACLE_SPAWN_RATE: 1.8,
    OBSTACLE_SPAWN_ACCELERATION: 8,
    MOVING_OBSTACLE_CHANCE: 0.35,
    MOVING_OBSTACLE_SPEED_RANGE: [2.4, 4],
    OBSTACLE_PROBABILITIES: {
      single: 0.55,
      double: 0.3,
      triple: 0.15,
    },
    SWIPE_MIN_DISTANCE: 40,
    SWIPE_MIN_SPEED: 0.25,
    DOUBLE_TAP_TIME_WINDOW: 0.3,
    COLOR_TRACK: "#050a16",
    COLOR_LANE_LINES: "#17f4ff",
    COLOR_OBSTACLE: "#ff1f6e",
    COLOR_BALL_BASE: "#1d9cff",
    COLOR_BALL_STRIPES: "#1869a7ff",
    COLOR_SPEED_PAD: "#00f9d9",
    COLOR_UI_LIVES_ACTIVE: "#e92c2c",
    COLOR_UI_LIVES_INACTIVE: "#3d3d3d",
    TRACK_SEGMENT_LENGTH: 30,
    TRACK_SEGMENT_COUNT: 10,
    TRACK_WIDTH: 10,
    CAMERA_HEIGHT: 6,
    CAMERA_DISTANCE: 12,
    CAMERA_LERP_SPEED: 0.1,
    GROUND_Y: 0,
    BOOST_PAD_LENGTH: 6,
    BOOST_PAD_DISTANCE: 100,
    INITIAL_SPAWN_BUFFER: 40,
    BOOST_PAD_BUFFER: 30,
    BOOST_PAD_MIN_DISTANCE: 100,
    BOOST_PAD_DISABLE_RATIO: 1,
    DIAMOND_MIN_SPACING: 32,
    DIAMOND_MAX_SPACING: 64,
    DIAMOND_SPAWN_LOOKAHEAD: 120,
    DIAMOND_INITIAL_BUFFER: 36,
    DIAMOND_COLLECTION_RADIUS: 1.4,
    PLAYER_DIAMETER: 1.6,
    BALL_ROTATION_MULTIPLIER: 0.2,
    FLOOR_LINE_SPACING: 50,
  };

  const GameState = {
    MENU: "menu",
    RUNNING: "running",
    PAUSED: "paused",
    GAME_OVER: "gameover",
  };

  const SpeedPadType = {
    FORWARD: "forward",
    LEFT: "left",
    RIGHT: "right",
    BACKWARD: "backward",
  };

  const DEFAULT_PLAYER_NAME = "Runner";

  const Utils = {
    lerp: (a, b, t) => a + (b - a) * t,
    clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
    now: () => performance.now() / 1000,
  };

  const PersistenceService = {
    HIGH_SCORE_KEY: "neonRunnerHighScore",
    LAST_SCORE_KEY: "neonRunnerLastScore",
    HIGH_SCORE_NAME_KEY: "neonRunnerHighScoreName",
    PLAYER_NAME_KEY: "neonRunnerPlayerName",
    LAST_SCORE_NAME_KEY: "neonRunnerLastScoreName",
    SCORE_HISTORY_KEY: "neonRunnerScoreHistory",
    loadHighScore() {
      try {
        return parseInt(localStorage.getItem(this.HIGH_SCORE_KEY), 10) || 0;
      } catch (err) {
        console.warn("Persistence unavailable", err);
        return 0;
      }
    },
    loadHighScoreName() {
      try {
        return localStorage.getItem(this.HIGH_SCORE_NAME_KEY) || "";
      } catch (err) {
        return "";
      }
    },
    saveHighScore(value, name) {
      try {
        localStorage.setItem(this.HIGH_SCORE_KEY, value.toString());
        localStorage.setItem(this.HIGH_SCORE_NAME_KEY, name ?? "");
      } catch (err) {
        console.warn("Persistence unavailable", err);
      }
    },
    saveLastScore(value, name) {
      try {
        localStorage.setItem(this.LAST_SCORE_KEY, value.toString());
        localStorage.setItem(this.LAST_SCORE_NAME_KEY, name ?? "");
      } catch (err) {
        console.warn("Persistence unavailable", err);
      }
    },
    loadLastScore() {
      try {
        return parseInt(localStorage.getItem(this.LAST_SCORE_KEY), 10) || 0;
      } catch (err) {
        return 0;
      }
    },
    loadLastScoreName() {
      try {
        return localStorage.getItem(this.LAST_SCORE_NAME_KEY) || "";
      } catch (err) {
        return "";
      }
    },
    savePlayerName(name) {
      try {
        localStorage.setItem(this.PLAYER_NAME_KEY, name ?? "");
      } catch (err) {
        console.warn("Persistence unavailable", err);
      }
    },
    loadPlayerName() {
      try {
        return localStorage.getItem(this.PLAYER_NAME_KEY) || "";
      } catch (err) {
        return "";
      }
    },
    loadScoreHistory() {
      try {
        const raw = localStorage.getItem(this.SCORE_HISTORY_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed
          .map((entry) => {
            const scoreValue = Number.parseInt(entry.score, 10);
            const timestampValue = Number(entry.timestamp);
            return {
              name: typeof entry.name === "string" ? entry.name : DEFAULT_PLAYER_NAME,
              score: Number.isFinite(scoreValue) ? Math.max(0, scoreValue) : 0,
              timestamp: Number.isFinite(timestampValue) ? timestampValue : Date.now(),
            };
          })
          .filter((entry) => entry.score >= 0)
          .sort((a, b) => {
            if (b.score === a.score) {
              return a.timestamp - b.timestamp;
            }
            return b.score - a.score;
          });
      } catch (err) {
        console.warn("Persistence unavailable", err);
        return [];
      }
    },
    saveScoreHistory(entries) {
      try {
        localStorage.setItem(this.SCORE_HISTORY_KEY, JSON.stringify(entries));
      } catch (err) {
        console.warn("Persistence unavailable", err);
      }
    },
  };

  const UIManager = {
    init() {
      this.scoreElement = document.getElementById("scoreValue");
      this.livesContainer = document.getElementById("livesContainer");
      this.pauseButton = document.getElementById("pauseButton");
      this.speedElement = document.getElementById("speedValue");
      this.menuOverlay = document.getElementById("menuOverlay");
      this.pauseOverlay = document.getElementById("pauseOverlay");
      this.gameOverOverlay = document.getElementById("gameOverOverlay");
      this.newGameButton = document.getElementById("newGameButton");
      this.resumeButton = document.getElementById("resumeButton");
      this.restartButton = document.getElementById("restartButton");
      this.backToMenuButton = document.getElementById("backToMenuButton");
      this.retryButton = document.getElementById("retryButton");
      this.menuButton = document.getElementById("menuButton");
      this.gameOverScore = document.getElementById("gameOverScore");
      this.gameOverHighScore = document.getElementById("gameOverHighScore");
      this.menuHighScore = document.getElementById("menuHighScore");
      this.playerNameInput = document.getElementById("playerNameInput");
      this.gameOverPlayerName = document.getElementById("gameOverPlayerName");
      this.menuHighScoreName = document.getElementById("menuHighScoreName");
      this.gameOverHighScoreName = document.getElementById("gameOverHighScoreName");
      this.scoreTableBody = document.getElementById("scoreTableBody");
      this.scoreTableEmpty = document.getElementById("scoreTableEmpty");
      if (this.playerNameInput) {
        this.playerNameInput.addEventListener("keydown", (event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            this.newGameButton?.click();
          }
        });
      }
      this._createLives();
      this.damageFlashTimeout = null;
    },
    _createLives() {
      this.livesContainer.innerHTML = "";
      this.lifeDots = [];
      for (let i = 0; i < GAME_CONFIG.INITIAL_LIVES; i += 1) {
        const dot = document.createElement("div");
        dot.classList.add("life-dot");
        this.livesContainer.appendChild(dot);
        this.lifeDots.push(dot);
      }
    },
    setScore(value) {
      if (this.scoreElement) {
        this.scoreElement.textContent = Math.floor(value).toString();
      }
    },
    setSpeed(value) {
      if (!this.speedElement) return;
      this.speedElement.textContent = value.toFixed(1);
    },
    setLives(value) {
      if (!this.lifeDots) return;
      this.lifeDots.forEach((dot, index) => {
        dot.classList.toggle("full", index < value);
      });
    },
    setPlayerName(value) {
      if (this.playerNameInput) {
        this.playerNameInput.value = value || "";
      }
    },
    getPlayerName() {
      if (!this.playerNameInput) return "";
      return this.playerNameInput.value.trim();
    },
    blurPlayerNameInput() {
      this.playerNameInput?.blur();
    },
    setHighScore(value, name) {
      if (this.menuHighScore) {
        this.menuHighScore.textContent = Math.floor(value).toString();
      }
      if (this.gameOverHighScore) {
        this.gameOverHighScore.textContent = Math.floor(value).toString();
      }
      const displayName = name && name.trim().length > 0 ? name : "Anonymous";
      if (this.menuHighScoreName) {
        this.menuHighScoreName.textContent = displayName;
      }
      if (this.gameOverHighScoreName) {
        this.gameOverHighScoreName.textContent = displayName;
      }
    },
    setGameOverScore(value, name) {
      if (this.gameOverScore) {
        this.gameOverScore.textContent = Math.floor(value).toString();
      }
      if (this.gameOverPlayerName) {
        const displayName = name && name.trim().length > 0 ? name : "Anonymous";
        this.gameOverPlayerName.textContent = displayName;
      }
    },
    setScoreTable(entries) {
      if (!this.scoreTableBody) return;
      this.scoreTableBody.innerHTML = "";
      if (!entries || entries.length === 0) {
        this.scoreTableEmpty?.classList.remove("hidden");
        return;
      }
      this.scoreTableEmpty?.classList.add("hidden");
      const fragment = document.createDocumentFragment();
      entries.forEach((entry, index) => {
        const row = document.createElement("tr");
        const rankCell = document.createElement("td");
        rankCell.textContent = (index + 1).toString();
        row.appendChild(rankCell);

        const nameCell = document.createElement("td");
        const displayName = entry.name && entry.name.trim().length > 0 ? entry.name : "Anonymous";
        nameCell.textContent = displayName;
        row.appendChild(nameCell);

        const scoreCell = document.createElement("td");
        scoreCell.textContent = Math.floor(entry.score).toString();
        scoreCell.classList.add("score-value");
        row.appendChild(scoreCell);

        fragment.appendChild(row);
      });
      this.scoreTableBody.appendChild(fragment);
    },
    showOverlay(overlay) {
      this.hideOverlays();
      const target = this[overlay];
      if (target) {
        target.classList.remove("hidden");
        if (overlay === "menuOverlay" && this.playerNameInput) {
          setTimeout(() => this.playerNameInput?.focus(), 0);
        }
      }
    },
    hideOverlays() {
      [this.menuOverlay, this.pauseOverlay, this.gameOverOverlay].forEach(
        (overlay) => overlay && overlay.classList.add("hidden")
      );
    },
    flashDamage() {
      const container = document.getElementById("gameContainer");
      if (!container) return;
      container.classList.add("damage-flash");
      if (this.damageFlashTimeout) {
        clearTimeout(this.damageFlashTimeout);
      }
      this.damageFlashTimeout = setTimeout(() => {
        container.classList.remove("damage-flash");
      }, 200);
    },
  };

  const SceneFactory = {
    createEngine(canvas) {
      return new BABYLON.Engine(canvas, true, { stencil: true, preserveDrawingBuffer: true });
    },
    createScene(engine, canvas) {
      const scene = new BABYLON.Scene(engine);
      scene.clearColor = new BABYLON.Color4(0.01, 0.02, 0.05, 1);
      scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
      scene.fogDensity = 0.004;
      scene.fogColor = new BABYLON.Color3(0.01, 0.02, 0.05);

      const camera = new BABYLON.FreeCamera(
        "mainCamera",
        new BABYLON.Vector3(0, GAME_CONFIG.CAMERA_HEIGHT, -GAME_CONFIG.CAMERA_DISTANCE),
        scene
      );
      if (canvas) {
        camera.attachControl(canvas, true);
      }
      camera.minZ = 0.2;
      camera.speed = 0;
      camera.inertia = 0.9;
      camera.checkCollisions = false;
      camera.applyGravity = false;

      const hemi = new BABYLON.HemisphericLight("hemi", new BABYLON.Vector3(0, 1, 0), scene);
      hemi.intensity = 0.7;

      const point = new BABYLON.PointLight("point", new BABYLON.Vector3(0, 10, -10), scene);
      point.intensity = 1.1;
      point.diffuse = new BABYLON.Color3(0.8, 0.8, 1);

      const glow = new BABYLON.GlowLayer("glow", scene, {
        blurKernelSize: 64,
      });
      glow.intensity = 0.6;

      return { scene, camera, glow };
    },
  };

  const TrackManager = {
    init(scene) {
      this.scene = scene;
      this.segments = [];
      this.laneLines = [];
      this.sideBars = [];
      this.floorLines = [];
      this.trackDepth =
        GAME_CONFIG.TRACK_SEGMENT_COUNT * GAME_CONFIG.TRACK_SEGMENT_LENGTH;
      this.lineBackOffset = GAME_CONFIG.TRACK_SEGMENT_LENGTH * 0.9;
      this.lineLength = this.trackDepth + this.lineBackOffset + 12;
      this._createSegments();
      this._createLaneLines();
      this._createSideBars();
      this._createFloorLines();
    },
    _createSegments() {
      for (let i = 0; i < GAME_CONFIG.TRACK_SEGMENT_COUNT; i += 1) {
        const segment = BABYLON.MeshBuilder.CreateBox(
          `trackSeg_${i}`,
          {
            width: GAME_CONFIG.TRACK_WIDTH,
            depth: GAME_CONFIG.TRACK_SEGMENT_LENGTH,
            height: 0.3,
          },
          this.scene
        );
        segment.position.z = i * GAME_CONFIG.TRACK_SEGMENT_LENGTH;
        segment.position.y = GAME_CONFIG.GROUND_Y - 0.15;
        const mat = new BABYLON.StandardMaterial(`trackMat_${i}`, this.scene);
        mat.diffuseColor = BABYLON.Color3.FromHexString(GAME_CONFIG.COLOR_TRACK);
        mat.emissiveColor = new BABYLON.Color3(0, 0, 0);
        mat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        segment.material = mat;
        this.segments.push(segment);
      }
    },
    _createLaneLines() {
      const lineColor = BABYLON.Color3.FromHexString(GAME_CONFIG.COLOR_LANE_LINES);
      const laneOffsets = [-GAME_CONFIG.LANE_WIDTH, GAME_CONFIG.LANE_WIDTH];
      laneOffsets.forEach((offset) => {
        const line = BABYLON.MeshBuilder.CreateBox(
          `laneLine_${offset}`,
          {
            width: 0.1,
            depth: this.lineLength,
            height: 0.05,
          },
          this.scene
        );
        line.position.x = offset;
        line.position.y = GAME_CONFIG.GROUND_Y + 0.01;
        line.position.z = this.lineLength / 2;
        const mat = new BABYLON.StandardMaterial(`lineMat_${offset}`, this.scene);
        mat.emissiveColor = lineColor;
        mat.diffuseColor = lineColor.scale(0.2);
        mat.alpha = 0.9;
        line.material = mat;
        this.laneLines.push(line);
      });
    },
    _createSideBars() {
      const halfWidth = GAME_CONFIG.TRACK_WIDTH / 2 + 1;
      const barLength = this.lineLength;
      const glowColor = BABYLON.Color3.FromHexString("#1c9dff");
      [1, -1].forEach((side) => {
        const bar = BABYLON.MeshBuilder.CreateBox(
            `sideBar_${side}`,
            {
            width: 0.4,
            depth: barLength,
            height: 0.4,
            },
          this.scene
        );
        bar.position.x = side * halfWidth;
      bar.position.z = barLength / 2;
        bar.position.y = GAME_CONFIG.GROUND_Y + 0.2;
        const mat = new BABYLON.StandardMaterial(`sideMat_${side}`, this.scene);
        mat.emissiveColor = glowColor;
        mat.diffuseColor = glowColor.scale(0.1);
        mat.alpha = 0.8;
        bar.material = mat;
        this.sideBars.push(bar);
      });
    },
    _createFloorLines() {
      const spacing = GAME_CONFIG.FLOOR_LINE_SPACING;
      const count = Math.ceil(this.trackDepth / spacing) + 6;
      for (let i = 0; i < count; i += 1) {
        const line = BABYLON.MeshBuilder.CreateBox(
          `floorLine_${i}`,
          {
            width: GAME_CONFIG.TRACK_WIDTH + 1,
            depth: 0.2,
            height: 0.04,
          },
          this.scene
        );
        line.position.y = GAME_CONFIG.GROUND_Y + 0.01;
        const mat = new BABYLON.StandardMaterial(`floorLineMat_${i}`, this.scene);
        const lineColor = BABYLON.Color3.FromHexString(GAME_CONFIG.COLOR_TRACK).scale(1.2);
        mat.emissiveColor = lineColor;
        mat.diffuseColor = lineColor;
        mat.alpha = 0.75;
        line.material = mat;
        this.floorLines.push(line);
      }
    },
    update(playerZ) {
      const firstSegment = this.segments[0];
      if (
        firstSegment &&
        playerZ - firstSegment.position.z > GAME_CONFIG.TRACK_SEGMENT_LENGTH
      ) {
        const moved = this.segments.shift();
        moved.position.z =
          this.segments[this.segments.length - 1].position.z +
          GAME_CONFIG.TRACK_SEGMENT_LENGTH;
        this.segments.push(moved);
      }
      const totalDepth =
        GAME_CONFIG.TRACK_SEGMENT_COUNT * GAME_CONFIG.TRACK_SEGMENT_LENGTH;
      const centerOffset = this.lineLength / 2 - this.lineBackOffset;
      const centerZ = playerZ + centerOffset;
      this.laneLines.forEach((line) => {
        line.position.z = centerZ;
      });
      this.sideBars.forEach((bar) => {
        bar.position.z = centerZ;
        const phase = (Utils.now() % 1) * Math.PI * 2;
        const brightness = (Math.sin(phase) + 1) / 2;
        bar.material.emissiveColor.r = 0.1 + brightness * 0.7;
        bar.material.emissiveColor.g = 0.1 + brightness * 0.7;
        bar.material.emissiveColor.b = 0.5 + brightness * 0.5;
      });
      this._refreshFloorLines(playerZ);
    },
    getLaneX(index) {
      return (index - 1) * GAME_CONFIG.LANE_WIDTH;
    },
    getFrontZ() {
      const last = this.segments[this.segments.length - 1];
      return last.position.z + GAME_CONFIG.TRACK_SEGMENT_LENGTH / 2;
    },
    reset() {
      this.segments.forEach((seg, idx) => {
        seg.position.z = idx * GAME_CONFIG.TRACK_SEGMENT_LENGTH;
      });
    },
    _refreshFloorLines(playerZ) {
      const spacing = GAME_CONFIG.FLOOR_LINE_SPACING;
      const baseZ = Math.floor(playerZ / spacing) * spacing - spacing * 2;
      this.floorLines.forEach((line, index) => {
        line.position.z = baseZ + index * spacing;
      });
    },
  };

  const PLAYER_SHAPE_SEQUENCES = {
    launch: [
      { duration: 0.08, scale: new BABYLON.Vector3(1.1, 0.85, 1.1) },
      { duration: 0.18, scale: new BABYLON.Vector3(0.95, 1.18, 0.95) },
    ],
    land: [
      { duration: 0.12, scale: new BABYLON.Vector3(1.2, 0.8, 1.2) },
      { duration: 0.22, scale: new BABYLON.Vector3(1, 1, 1) },
    ],
  };

  const PlayerController = {
    init(scene, track) {
      this.track = track;
      this.scene = scene;
      this.playerRadius = GAME_CONFIG.PLAYER_DIAMETER * 0.5;
      this.mesh = BABYLON.MeshBuilder.CreateSphere(
        "playerBall",
        { diameter: GAME_CONFIG.PLAYER_DIAMETER, segments: 24 },
        scene
      );
      this.mesh.position = new BABYLON.Vector3(0, this._groundLevel(), 0);
      this.mesh.material = this._createMaterial(scene);
      this.mesh.receiveShadows = false;
      this.mesh.castShadow = false;
      this.currentLane = 1;
      this.laneTransition = { active: false, duration: GAME_CONFIG.LANE_CHANGE_DURATION };
      this.verticalVelocity = 0;
      this.isGrounded = true;
      this.jumpCount = 0;
      this.boostTimer = 0;
      this.forwardSpeed = GAME_CONFIG.BASE_FORWARD_SPEED;
      this.highJumpRequested = false;
      this.shapeState = {
        sequence: null,
        index: 0,
        timer: 0,
        startScale: this.mesh.scaling.clone(),
      };
      this.lastJumpPressTime = -GAME_CONFIG.HIGH_JUMP_DOUBLE_TAP_WINDOW * 2;
    },
    _createMaterial(scene) {
      const mat = new BABYLON.StandardMaterial("playerMat", scene);
      mat.diffuseColor = BABYLON.Color3.FromHexString(GAME_CONFIG.COLOR_BALL_BASE);
      mat.specularColor = new BABYLON.Color3(0.8, 0.8, 0.8);
      mat.emissiveColor = BABYLON.Color3.FromHexString(GAME_CONFIG.COLOR_BALL_BASE);
      mat.roughness = 0.2;
      const texture = new BABYLON.DynamicTexture("ballStripes", { width: 256, height: 256 }, scene);
      const ctx = texture.getContext();
      ctx.fillStyle = GAME_CONFIG.COLOR_BALL_BASE;
      ctx.fillRect(0, 0, 256, 256);
      ctx.fillStyle = GAME_CONFIG.COLOR_BALL_STRIPES;
      const stripeSize = 20;
      ctx.fillRect(0, 128 - stripeSize / 2, 256, stripeSize);
      texture.update();
      mat.diffuseTexture = texture;
      return mat;
    },
    requestLaneChange(direction) {
      const target = Utils.clamp(this.currentLane + direction, 0, 2);
      if (target === this.currentLane) return;
      this.currentLane = target;
      this.laneTransition.active = true;
      this.laneTransition.timer = 0;
      this.laneTransition.start = this.mesh.position.x;
      this.laneTransition.target = this.track.getLaneX(target);
    },
    requestJump(highJump = false) {
      if (this.jumpCount >= 2) return false;
      const now = Utils.now();
      const quickDouble =
        this.isGrounded &&
        now - this.lastJumpPressTime <= GAME_CONFIG.HIGH_JUMP_DOUBLE_TAP_WINDOW;
      const useHighJump = highJump || quickDouble;
      const baseForce = GAME_CONFIG.JUMP_FORCE;
      if (this.jumpCount === 0) {
        const multiplier = useHighJump ? 1.35 : 1;
        this.verticalVelocity = baseForce * multiplier;
      } else {
        this.verticalVelocity = baseForce * GAME_CONFIG.DOUBLE_JUMP_FORCE_MULTIPLIER;
      }
      this.jumpCount += 1;
      this.isGrounded = false;
      this._setShapeState("launch");
      this.lastJumpPressTime = now;
      return true;
    },
    applyBoost(padType = SpeedPadType.FORWARD) {
      if (padType === SpeedPadType.LEFT) {
        this.requestLaneChange(-1);
        return;
      }
      if (padType === SpeedPadType.RIGHT) {
        this.requestLaneChange(1);
        return;
      }
      if (padType === SpeedPadType.BACKWARD) {
        const slowMultiplier = Math.max(
          0,
          2 - GAME_CONFIG.BOOST_SPEED_MULTIPLIER
        );
        this.boostTimer = 0;
        const slowedSpeed = this.forwardSpeed * slowMultiplier;
        this.forwardSpeed = Math.max(0, slowedSpeed);
        return;
      }
      this.boostTimer = GAME_CONFIG.BOOST_DURATION;
      this.forwardSpeed = Math.min(
        GAME_CONFIG.MAX_FORWARD_SPEED,
        this.forwardSpeed * GAME_CONFIG.BOOST_SPEED_MULTIPLIER
      );
    },
    update(dt) {
      this._updateLane(dt);
      this._updateVertical(dt);
      this._updateBoost(dt);
      this._updateShape(dt);
      this._rotateBall(dt);
      const airFactor = this.isGrounded ? 1 : GAME_CONFIG.AIR_SPEED_MULTIPLIER;
      const forwardDelta = this.getForwardSpeed() * dt * airFactor;
      this.mesh.position.z += forwardDelta;
    },
    _updateLane(dt) {
      if (!this.laneTransition.active) return;
      this.laneTransition.timer += dt;
      const t = Utils.clamp(this.laneTransition.timer / this.laneTransition.duration, 0, 1);
      const eased = t * t * (3 - 2 * t);
      this.mesh.position.x = Utils.lerp(
        this.laneTransition.start,
        this.laneTransition.target,
        eased
      );
      if (t >= 1) {
        this.laneTransition.active = false;
      }
    },
    _updateVertical(dt) {
      this.verticalVelocity += GAME_CONFIG.GRAVITY * dt;
      this.mesh.position.y += this.verticalVelocity * dt;
      const groundLevel = this._groundLevel();
      if (this.mesh.position.y <= groundLevel) {
        if (!this.isGrounded) {
          this._setShapeState("land");
        }
        this.mesh.position.y = groundLevel;
        this.verticalVelocity = 0;
        this.jumpCount = 0;
        this.isGrounded = true;
      }
    },
    _updateBoost(dt) {
      if (this.boostTimer > 0) {
        this.boostTimer -= dt;
        if (this.boostTimer <= 0) {
          this.boostTimer = 0;
        }
      }
      this.forwardSpeed = Math.min(
        GAME_CONFIG.MAX_FORWARD_SPEED,
        this.forwardSpeed + dt * 0.08
      );
    },
    _updateShape(dt) {
      const mesh = this.mesh;
      const state = this.shapeState;
      if (state.sequence && state.sequence[state.index]) {
        const step = state.sequence[state.index];
        state.timer += dt;
        const progress = Utils.clamp(state.timer / step.duration, 0, 1);
        mesh.scaling = BABYLON.Vector3.Lerp(state.startScale, step.scale, progress);
        if (progress >= 1) {
          state.index += 1;
          state.timer = 0;
          state.startScale = mesh.scaling.clone();
          if (state.index >= state.sequence.length) {
            state.sequence = null;
            state.index = 0;
            state.timer = 0;
          }
        }
        return;
      }
      mesh.scaling = BABYLON.Vector3.Lerp(mesh.scaling, new BABYLON.Vector3(1, 1, 1), 0.12);
    },
    _setShapeState(phase) {
      const sequence = PLAYER_SHAPE_SEQUENCES[phase];
      if (!sequence) {
        this.shapeState.sequence = null;
        return;
      }
      this.shapeState.sequence = sequence;
      this.shapeState.index = 0;
      this.shapeState.timer = 0;
      this.shapeState.startScale = this.mesh.scaling.clone();
    },
    _rotateBall(dt) {
      const currentSpeed = this.getForwardSpeed();
      const distance = currentSpeed * dt;
      const speedRatio = currentSpeed / GAME_CONFIG.BASE_FORWARD_SPEED;
      const rotationMultiplier =
        GAME_CONFIG.BALL_ROTATION_MULTIPLIER * Math.max(speedRatio, 0.5);
      this.mesh.rotation.x += distance * rotationMultiplier;
    },
    getPosition() {
      return this.mesh.position.clone();
    },
    getForwardSpeed() {
      return this.forwardSpeed;
    },
    reset() {
      this.mesh.position.copyFromFloats(0, this._groundLevel(), 0);
      this.currentLane = 1;
      this.laneTransition = { active: false, duration: GAME_CONFIG.LANE_CHANGE_DURATION };
      this.verticalVelocity = 0;
      this.isGrounded = true;
      this.jumpCount = 0;
      this.boostTimer = 0;
      this.forwardSpeed = GAME_CONFIG.BASE_FORWARD_SPEED;
      this.shapeState = {
        sequence: null,
        index: 0,
        timer: 0,
        startScale: this.mesh.scaling.clone(),
      };
      this.lastJumpPressTime = -GAME_CONFIG.HIGH_JUMP_DOUBLE_TAP_WINDOW * 2;
    },
    _groundLevel() {
      return GAME_CONFIG.GROUND_Y + this.playerRadius;
    },
    isBoosting() {
      return this.boostTimer > 0;
    },
  };

  const ObstacleManager = {
    init(scene, track) {
      this.scene = scene;
      this.track = track;
      this.obstacles = [];
      this.nextSpawnZ = GAME_CONFIG.INITIAL_SPAWN_DISTANCE;
      this.onHit = null;
      this.onCleared = null;
      this.maxSpeedReached = false;
      this.maxSpawnPressure = 0;
      this.prepareSpawn(0);
    },
    update(dt, playerZ, playerX, playerY, playerSpeed) {
      this._spawnIfNeeded(playerZ, playerSpeed);
      this.obstacles = this.obstacles.filter((obs) => {
        if (!obs || !obs.metadata) {
          if (obs) obs.dispose();
          return false;
        }
        if (playerZ - obs.position.z > 10) {
          obs.dispose();
          return false;
        }
        this._updateMovement(obs, dt);
        this._maybeClear(obs, playerZ);
        this._maybeCollide(obs, playerX, playerY, playerZ);
        return true;
      });
    },
    _spawnIfNeeded(playerZ, playerSpeed) {
      const targetZ = playerZ + GAME_CONFIG.INITIAL_SPAWN_DISTANCE;
      for (let attempts = 0; attempts < 12 && this.nextSpawnZ <= targetZ; attempts += 1) {
        this._spawnObstacle(this.nextSpawnZ);
        this.nextSpawnZ += this._calculateSpacing(playerSpeed);
      }
    },
    _spawnObstacle(z) {
      const laneConfig = this._pickLane();
      const width =
        laneConfig.length * GAME_CONFIG.LANE_WIDTH + (laneConfig.length - 1) * 0.5;
      const obstacle = BABYLON.MeshBuilder.CreateBox(
        `obs_${z}`,
        {
          width,
          depth: 2.5,
          height: 2,
        },
        this.scene
      );
      obstacle.position.z = z;
      obstacle.position.y = GAME_CONFIG.GROUND_Y + 1;
      obstacle.position.x = laneConfig.reduce((acc, lane) => acc + this.track.getLaneX(lane), 0) / laneConfig.length;
      const mat = new BABYLON.StandardMaterial(`obsMat_${z}`, this.scene);
      mat.emissiveColor = BABYLON.Color3.FromHexString(GAME_CONFIG.COLOR_OBSTACLE);
      mat.diffuseColor = mat.emissiveColor.scale(0.4);
      mat.specularColor = new BABYLON.Color3(0, 0, 0);
      obstacle.material = mat;
      const isSingleLane = laneConfig.length === 1;
      const isMoving =
        isSingleLane && Math.random() < GAME_CONFIG.MOVING_OBSTACLE_CHANCE;

      const metadata = {
        lanes: laneConfig,
        hit: false,
        cleared: false,
        width,
        depth: 2.5,
        height: 2,
      };
      if (isMoving) {
        const halfTrack = GAME_CONFIG.TRACK_WIDTH / 2;
        const halfWidth = width / 2;
        const baseX = obstacle.position.x;
        let minX = baseX - GAME_CONFIG.LANE_WIDTH;
        let maxX = baseX + GAME_CONFIG.LANE_WIDTH;
        minX = Math.max(minX, -halfTrack + halfWidth);
        maxX = Math.min(maxX, halfTrack - halfWidth);
        if (maxX - minX > 0.1) {
          const speedRange = GAME_CONFIG.MOVING_OBSTACLE_SPEED_RANGE;
          const speed =
            speedRange[0] + Math.random() * (speedRange[1] - speedRange[0]);
          metadata.movement = {
            direction: Math.random() < 0.5 ? 1 : -1,
            speed,
            minX,
            maxX,
          };
        }
      }
      obstacle.metadata = metadata;
      this.obstacles.push(obstacle);
    },
    _updateMovement(obstacle, dt) {
      if (!obstacle.metadata?.movement || dt <= 0) return;
      const movement = obstacle.metadata.movement;
      obstacle.position.x += movement.direction * movement.speed * dt;
      if (obstacle.position.x <= movement.minX) {
        obstacle.position.x = movement.minX;
        movement.direction = 1;
      } else if (obstacle.position.x >= movement.maxX) {
        obstacle.position.x = movement.maxX;
        movement.direction = -1;
      }
    },
    prepareSpawn(startZ) {
      this.nextSpawnZ =
        startZ + GAME_CONFIG.INITIAL_SPAWN_DISTANCE + GAME_CONFIG.INITIAL_SPAWN_BUFFER;
    },
    _pickLane() {
      const rand = Math.random();
      const probs = GAME_CONFIG.OBSTACLE_PROBABILITIES;
      if (rand < probs.single) {
        return [Math.floor(Math.random() * 3)];
      }
      if (rand < probs.single + probs.double) {
        return Math.random() < 0.5 ? [0, 1] : [1, 2];
      }
      return [0, 1, 2];
    },
    _maybeCollide(obstacle, playerX, playerY, playerZ) {
      if (!obstacle.metadata) return;
      if (obstacle.metadata.hit) return;
      const zDiff = Math.abs(obstacle.position.z - playerZ);
      if (zDiff > 1.2) return;
      const halfWidth = obstacle.metadata.width / 2 + 0.7;
      if (Math.abs(obstacle.position.x - playerX) > halfWidth) return;
      const obstacleTop = GAME_CONFIG.GROUND_Y + obstacle.metadata.height;
      if (playerY > obstacleTop - 0.4) return;
      obstacle.metadata.hit = true;
      this.onHit?.(obstacle);
    },
    _maybeClear(obstacle, playerZ) {
      if (!obstacle.metadata) return;
      if (obstacle.metadata.cleared || obstacle.metadata.hit) return;
      if (playerZ > obstacle.position.z + obstacle.metadata.depth / 2) {
        obstacle.metadata.cleared = true;
        this.onCleared?.(obstacle);
      }
    },
    _calculateSpacing() {
      const base = GAME_CONFIG.MIN_DISTANCE_BETWEEN_OBSTACLES;
      const noise = Math.random() * GAME_CONFIG.OBSTACLE_SPAWN_RATE;
      if (!this.maxSpeedReached) {
        this.maxSpawnPressure = Math.max(0, this.maxSpawnPressure - 0.02);
        return base + noise;
      }
      this.maxSpawnPressure = Math.min(1, this.maxSpawnPressure + 0.05);
      const reduction = this.maxSpawnPressure * GAME_CONFIG.OBSTACLE_SPAWN_ACCELERATION;
      return Math.max(6, base + noise - reduction);
    },
  };

  const SpeedPadManager = {
    init(scene, obstacleManager) {
      this.scene = scene;
      this.obstacleManager = obstacleManager;
      this.pads = [];
      this.nextPadZ = GAME_CONFIG.BOOST_PAD_DISTANCE;
      this.lastPadZ = 0;
      this.onBoost = null;
      this.prepareSpawn(0);
    },
    update(playerZ, playerX, playerSpeed) {
      const disableThreshold =
        GAME_CONFIG.MAX_FORWARD_SPEED * GAME_CONFIG.BOOST_PAD_DISABLE_RATIO;
      if (
        playerSpeed < disableThreshold &&
        playerZ + GAME_CONFIG.BOOST_PAD_DISTANCE > this.nextPadZ
      ) {
        this._spawnPad(this.nextPadZ);
      }
      this.pads = this.pads.filter((pad) => {
        if (playerZ - pad.position.z > 10) {
          pad.dispose();
          return false;
        }
        this._checkTrigger(pad, playerZ, playerX);
        return true;
      });
    },
    _spawnPad(z) {
      const safeZ = this._findSafePadZ(z);
      if (safeZ === null) return;
      const padType = this._pickPadType();
      const lanes = this._pickPadConfiguration();
      const padWidth = GAME_CONFIG.LANE_WIDTH;
      lanes.forEach((lane) => {
        const pad = BABYLON.MeshBuilder.CreateBox(
          `boostPad_${safeZ}_${lane}`,
          {
            width: padWidth,
            depth: GAME_CONFIG.BOOST_PAD_LENGTH,
            height: 0.15,
          },
          this.scene
        );
        pad.position.z = safeZ;
        pad.position.y = GAME_CONFIG.GROUND_Y + 0.08;
        pad.position.x = this._laneToX(lane);
        const mat = this._createPadMaterial(`${safeZ}_${lane}`, padType);
        pad.material = mat;
        pad.metadata = {
          triggered: false,
          type: padType,
          lane,
          width: padWidth,
          depth: GAME_CONFIG.BOOST_PAD_LENGTH,
        };
        this.pads.push(pad);
      });
      this.nextPadZ = safeZ + GAME_CONFIG.BOOST_PAD_DISTANCE + Math.random() * 20;
    },
    _pickPadType() {
      const lateralChance = Utils.clamp(
        GAME_CONFIG.BOOST_PAD_LATERAL_PROBABILITY,
        0,
        1
      );
      if (Math.random() < lateralChance) {
        return Math.random() < 0.5 ? SpeedPadType.LEFT : SpeedPadType.RIGHT;
      }
      const forwardChance = Utils.clamp(
        GAME_CONFIG.BOOST_PAD_FORWARD_PROBABILITY,
        0,
        1
      );
      return Math.random() < forwardChance
        ? SpeedPadType.FORWARD
        : SpeedPadType.BACKWARD;
    },
    _pickPadConfiguration() {
      const roll = Math.random();
      if (roll < 0.5) {
        return [0, 1, 2];
      }
      if (roll < 0.75) {
        return Math.random() < 0.5 ? [0, 1] : [1, 2];
      }
      const singleLane = Math.floor(Math.random() * 3);
      return [singleLane];
    },
    _laneToX(lane) {
      return (lane - 1) * GAME_CONFIG.LANE_WIDTH;
    },
    _createPadMaterial(id, padType) {
      const mat = new BABYLON.StandardMaterial(`padMat_${id}`, this.scene);
      mat.specularColor = new BABYLON.Color3(0, 0, 0);
      mat.emissiveColor = BABYLON.Color3.FromHexString(GAME_CONFIG.COLOR_SPEED_PAD);
      const textureSize = 512;
      const texture = new BABYLON.DynamicTexture(
        `padTex_${id}`,
        { width: textureSize, height: textureSize },
        this.scene,
        false
      );
      const ctx = texture.getContext();
      ctx.clearRect(0, 0, textureSize, textureSize);

      ctx.fillStyle = GAME_CONFIG.COLOR_SPEED_PAD;
      ctx.fillRect(0, 0, textureSize, textureSize);

      const glowWidth = textureSize * 0.14;
      ctx.fillStyle = "rgba(255, 255, 255, 0.16)";
      ctx.fillRect(
        textureSize / 2 - glowWidth / 2,
        0,
        glowWidth,
        textureSize
      );

      ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
      ctx.lineWidth = textureSize * 0.06;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      ctx.save();

      const arrowCount = 1;
      const arrowLength = textureSize * 0.28;
      const arrowWidth = textureSize * 0.26;
      const arrowSpacing = arrowWidth * 0.82;
      const forwardOffset = textureSize * 0.22;

      const direction = this._getArrowDirection(padType);
      const perpendicular = { x: -direction.y, y: direction.x };
      const spreadAxis =
        padType === SpeedPadType.LEFT || padType === SpeedPadType.RIGHT
          ? { x: 1, y: 0 }
          : perpendicular;
      const center = { x: textureSize / 2, y: textureSize / 2 };
      const baseTip = {
        x: center.x - direction.x * forwardOffset,
        y: center.y - direction.y * forwardOffset,
      };

      for (let i = 0; i < arrowCount; i += 1) {
        const offsetScalar = (i - (arrowCount - 1) / 2) * arrowSpacing;
        const offset = {
          x: spreadAxis.x * offsetScalar,
          y: spreadAxis.y * offsetScalar,
        };

        const tip = {
          x: baseTip.x + offset.x,
          y: baseTip.y + offset.y,
        };

        const tailCenter = {
          x: tip.x + direction.x * arrowLength,
          y: tip.y + direction.y * arrowLength,
        };

        const outerHalfWidth = arrowWidth / 2;
        const tailLeft = {
          x: tailCenter.x + perpendicular.x * outerHalfWidth,
          y: tailCenter.y + perpendicular.y * outerHalfWidth,
        };
        const tailRight = {
          x: tailCenter.x - perpendicular.x * outerHalfWidth,
          y: tailCenter.y - perpendicular.y * outerHalfWidth,
        };

        ctx.beginPath();
        ctx.moveTo(tip.x, tip.y);
        ctx.lineTo(tailLeft.x, tailLeft.y);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(tip.x, tip.y);
        ctx.lineTo(tailRight.x, tailRight.y);
        ctx.stroke();

        const innerTip = {
          x: tip.x + direction.x * arrowLength * 0.32,
          y: tip.y + direction.y * arrowLength * 0.32,
        };
        const innerTailCenter = {
          x: innerTip.x + direction.x * arrowLength * 0.52,
          y: innerTip.y + direction.y * arrowLength * 0.52,
        };
        const innerHalfWidth = outerHalfWidth * 0.55;
        const innerLeft = {
          x: innerTailCenter.x + perpendicular.x * innerHalfWidth,
          y: innerTailCenter.y + perpendicular.y * innerHalfWidth,
        };
        const innerRight = {
          x: innerTailCenter.x - perpendicular.x * innerHalfWidth,
          y: innerTailCenter.y - perpendicular.y * innerHalfWidth,
        };

        ctx.beginPath();
        ctx.moveTo(innerTip.x, innerTip.y);
        ctx.lineTo(innerLeft.x, innerLeft.y);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(innerTip.x, innerTip.y);
        ctx.lineTo(innerRight.x, innerRight.y);
        ctx.stroke();
      }

      ctx.restore();

      texture.update();

      mat.diffuseTexture = texture;
      mat.emissiveTexture = texture;
      mat.alpha = 0.92;
      mat.backFaceCulling = true;
      return mat;
    },
    _getArrowDirection(padType) {
      // Map each pad type to the texture-space direction the arrows should face.
      switch (padType) {
        case SpeedPadType.LEFT:
          return { x: 0, y: 1 };
        case SpeedPadType.RIGHT:
          return { x: 0, y: -1 };
        case SpeedPadType.BACKWARD:
          return { x: 1, y: 0 };
        case SpeedPadType.FORWARD:
        default:
          return { x: -1, y: 0 };
      }
    },
    _checkTrigger(pad, playerZ, playerX) {
      if (pad.metadata.triggered) return;
      const zDiff = Math.abs(pad.position.z - playerZ);
      if (zDiff > (pad.metadata?.depth ?? GAME_CONFIG.BOOST_PAD_LENGTH) / 2) {
        return;
      }
      const halfWidth = (pad.metadata?.width ?? GAME_CONFIG.LANE_WIDTH) / 2 + 0.3;
      if (Math.abs(playerX - pad.position.x) > halfWidth) return;
      pad.metadata.triggered = true;
      this.onBoost?.(pad.metadata.type);
    },
    _findSafePadZ(startZ) {
      let candidate = Math.max(
        startZ,
        this.lastPadZ + GAME_CONFIG.BOOST_PAD_MIN_DISTANCE
      );
      const maxAttempts = 6;
      let attempts = 0;
      while (attempts < maxAttempts) {
        if (this._canPlacePad(candidate)) {
          this.lastPadZ = candidate;
          return candidate;
        }
        candidate += GAME_CONFIG.BOOST_PAD_LENGTH + 2;
        attempts += 1;
      }
      return null;
    },
    _canPlacePad(z) {
      if (!this.obstacleManager) {
        return true;
      }
      const padRadius = GAME_CONFIG.BOOST_PAD_LENGTH / 2;
      return !this.obstacleManager.obstacles.some((obs) => {
        if (!obs || !obs.metadata) return false;
        const obsRadius = obs.metadata.depth / 2;
        const distance = Math.abs(obs.position.z - z);
        return distance < padRadius + obsRadius + 1;
      });
    },
    prepareSpawn(startZ) {
      this.nextPadZ =
        startZ + GAME_CONFIG.BOOST_PAD_DISTANCE + GAME_CONFIG.BOOST_PAD_BUFFER;
      this.lastPadZ = startZ;
    },
  };

  const CollectibleManager = {
    init(scene, track, obstacleManager, speedPadManager) {
      this.scene = scene;
      this.track = track;
      this.obstacleManager = obstacleManager;
      this.speedPadManager = speedPadManager;
      this.collectibles = [];
      this.nextSpawnZ = GAME_CONFIG.INITIAL_SPAWN_DISTANCE;
      this.prepareSpawn(0);
    },
    prepareSpawn(startZ) {
      this.nextSpawnZ =
        startZ +
        GAME_CONFIG.INITIAL_SPAWN_DISTANCE +
        GAME_CONFIG.DIAMOND_INITIAL_BUFFER;
    },
    reset(startZ) {
      this.collectibles.forEach((diamond) => diamond.dispose());
      this.collectibles = [];
      this.prepareSpawn(startZ);
    },
    update(dt, playerZ, playerX, playerY) {
      this._spawnIfNeeded(playerZ);
      this.collectibles = this.collectibles.filter((diamond) => {
        if (!diamond || !diamond.metadata) {
          if (diamond) diamond.dispose();
          return false;
        }
        if (playerZ - diamond.position.z > 10) {
          diamond.dispose();
          return false;
        }
        const meta = diamond.metadata;
        const bounce = Math.sin(Utils.now() * 4 + diamond.position.z * 0.15) * 0.15;
        diamond.position.y = meta.baseY + bounce;
        diamond.rotation.y += dt * 2.2;
        if (this._checkCollect(diamond, playerX, playerY, playerZ)) {
          ScoreManager.addDiamondBonus();
          diamond.dispose();
          return false;
        }
        return true;
      });
    },
    _spawnIfNeeded(playerZ) {
      const targetZ = playerZ + GAME_CONFIG.DIAMOND_SPAWN_LOOKAHEAD;
      for (
        let attempts = 0;
        attempts < 10 && this.nextSpawnZ <= targetZ;
        attempts += 1
      ) {
        const spawned = this._spawnDiamond(this.nextSpawnZ);
        const spacing = this._randomSpacing();
        this.nextSpawnZ += spacing;
        if (!spawned) {
          this.nextSpawnZ += 6;
        }
      }
    },
    _randomSpacing() {
      const range =
        GAME_CONFIG.DIAMOND_MAX_SPACING - GAME_CONFIG.DIAMOND_MIN_SPACING;
      return GAME_CONFIG.DIAMOND_MIN_SPACING + Math.random() * range;
    },
    _spawnDiamond(z) {
      if (!this.scene || !this.track) return false;
      const lanes = [0, 1, 2];
      for (let i = lanes.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [lanes[i], lanes[j]] = [lanes[j], lanes[i]];
      }
      for (let index = 0; index < lanes.length; index += 1) {
        const lane = lanes[index];
        if (!this._canPlaceDiamond(z, lane)) {
          continue;
        }
        const diamond = BABYLON.MeshBuilder.CreatePolyhedron(
          `diamond_${z}_${lane}`,
          { type: 2, size: 0.65 },
          this.scene
        );
        diamond.position.z = z;
        diamond.position.x = this.track.getLaneX(lane);
        diamond.position.y = GAME_CONFIG.GROUND_Y + 1.4;
        diamond.rotation.x = Math.PI / 4;
        const mat = new BABYLON.StandardMaterial(
          `diamondMat_${z}_${lane}`,
          this.scene
        );
        const color = BABYLON.Color3.FromHexString(GAME_CONFIG.COLOR_BALL_BASE);
        mat.emissiveColor = color.clone();
        mat.diffuseColor = color.scale(0.3);
        mat.specularColor = new BABYLON.Color3(0, 0, 0);
        mat.alpha = 0.95;
        diamond.material = mat;
        diamond.metadata = {
          lane,
          baseY: diamond.position.y,
        };
        this.collectibles.push(diamond);
        return true;
      }
      return false;
    },
    _canPlaceDiamond(z, lane) {
      if (!this.track) return false;
      const laneX = this.track.getLaneX(lane);
      const obstacleConflict = this.obstacleManager?.obstacles.some((obs) => {
        if (!obs || !obs.metadata) return false;
        if (!obs.metadata.lanes?.includes(lane)) return false;
        const halfDepth = (obs.metadata.depth || 0) / 2;
        return Math.abs(obs.position.z - z) < halfDepth + 2;
      });
      if (obstacleConflict) {
        return false;
      }
      const padConflict = this.speedPadManager?.pads.some((pad) => {
        const padHalfDepth = GAME_CONFIG.BOOST_PAD_LENGTH / 2;
        return Math.abs(pad.position.z - z) < padHalfDepth + 3;
      });
      if (padConflict) {
        return false;
      }
      const collectibleConflict = this.collectibles.some((diamond) => {
        if (!diamond || !diamond.metadata) return false;
        if (diamond.metadata.lane !== lane) return false;
        return Math.abs(diamond.position.z - z) < GAME_CONFIG.DIAMOND_MIN_SPACING / 2;
      });
      if (collectibleConflict) {
        return false;
      }
      const laneBounds = GAME_CONFIG.TRACK_WIDTH / 2 - 0.5;
      return Math.abs(laneX) <= laneBounds;
    },
    _checkCollect(diamond, playerX, playerY, playerZ) {
      const dx = playerX - diamond.position.x;
      const dy = playerY - diamond.position.y;
      const dz = playerZ - diamond.position.z;
      const distanceSq = dx * dx + dy * dy + dz * dz;
      return (
        distanceSq <= GAME_CONFIG.DIAMOND_COLLECTION_RADIUS * GAME_CONFIG.DIAMOND_COLLECTION_RADIUS
      );
    },
  };

  const LifeManager = {
    init() {
      this.currentLives = GAME_CONFIG.INITIAL_LIVES;
      this.lastDamageTime = -999;
      this.regenTimer = 0;
      this.onDeath = null;
      UIManager.setLives(this.currentLives);
    },
    reset() {
      this.currentLives = GAME_CONFIG.INITIAL_LIVES;
      this.lastDamageTime = -999;
      this.regenTimer = 0;
      UIManager.setLives(this.currentLives);
    },
    update(dt) {
      if (this.currentLives >= GAME_CONFIG.INITIAL_LIVES) return;
      const timeSinceDamage = Utils.now() - this.lastDamageTime;
      if (timeSinceDamage < GAME_CONFIG.TIME_WITHOUT_DAMAGE_FOR_REGEN) return;
      this.regenTimer += dt;
      if (this.regenTimer >= GAME_CONFIG.REGEN_INTERVAL_PER_LIFE) {
        this.regenTimer = 0;
        this.currentLives += 1;
        UIManager.setLives(this.currentLives);
      }
    },
    takeDamage() {
      if (this.currentLives <= 0) return;
      this.currentLives -= 1;
      this.regenTimer = 0;
      this.lastDamageTime = Utils.now();
      UIManager.setLives(this.currentLives);
      if (this.currentLives <= 0) {
        this.onDeath?.();
      }
    },
    isAlive() {
      return this.currentLives > 0;
    },
  };

  const ScoreManager = {
    init() {
      this.score = 0;
      this.highScore = PersistenceService.loadHighScore();
      this.highScoreName = PersistenceService.loadHighScoreName();
      const storedName = PersistenceService.loadPlayerName();
      this.playerName = storedName && storedName.trim().length > 0 ? storedName : DEFAULT_PLAYER_NAME;
      this.boosting = false;
      this.scoreHistory = PersistenceService.loadScoreHistory();
      UIManager.setScore(this.score);
      UIManager.setHighScore(this.highScore, this.highScoreName);
      UIManager.setPlayerName(this.playerName);
      UIManager.setScoreTable(this.scoreHistory);
    },
    reset() {
      this.score = 0;
      this.boosting = false;
      UIManager.setScore(this.score);
    },
    setPlayerName(name) {
      const trimmed = name?.trim() ?? "";
      this.playerName = trimmed.length > 0 ? trimmed : DEFAULT_PLAYER_NAME;
      PersistenceService.savePlayerName(this.playerName);
    },
    update(dt, isBoosting) {
      this.boosting = isBoosting;
      const multiplier = isBoosting ? GAME_CONFIG.BOOST_SCORE_MULTIPLIER : 1;
      this.score += GAME_CONFIG.SCORE_PER_SECOND * dt * multiplier;
      UIManager.setScore(this.score);
    },
    addBonus() {
      this.score += GAME_CONFIG.BONUS_SCORE_PER_OBSTACLE;
      UIManager.setScore(this.score);
    },
    addDiamondBonus() {
      this.score += GAME_CONFIG.BONUS_SCORE_PER_DIAMOND;
      UIManager.setScore(this.score);
    },
    applyPenalty() {
      this.score = Math.max(0, this.score - GAME_CONFIG.SCORE_PENALTY_ON_HIT);
      UIManager.setScore(this.score);
    },
    completeRun() {
      const finalScore = Math.floor(this.score);
      const entry = {
        name: this.playerName,
        score: finalScore,
        timestamp: Date.now(),
      };
      this.scoreHistory.push(entry);
      this.scoreHistory.sort((a, b) => {
        if (b.score === a.score) {
          return a.timestamp - b.timestamp;
        }
        return b.score - a.score;
      });
      PersistenceService.saveScoreHistory(this.scoreHistory);
      if (finalScore > this.highScore) {
        this.highScore = finalScore;
        this.highScoreName = this.playerName;
        PersistenceService.saveHighScore(this.highScore, this.highScoreName);
      }
      PersistenceService.saveLastScore(finalScore, this.playerName);
      UIManager.setHighScore(this.highScore, this.highScoreName);
      UIManager.setGameOverScore(finalScore, this.playerName);
      UIManager.setScoreTable(this.scoreHistory);
    },
    getScore() {
      return Math.floor(this.score);
    },
  };

  const InputManager = {
    init(canvas) {
      this.canvas = canvas;
      this.onMove = null;
      this.onJump = null;
      this.onSpace = null;
      this.onPause = null;
      this.lastJumpInput = -999;
      this.pointerData = null;
      window.addEventListener("keydown", this._onKeyDown);
      canvas.addEventListener("pointerdown", this._onPointerDown);
      canvas.addEventListener("pointerup", this._onPointerUp);
    },
    dispose() {
      window.removeEventListener("keydown", this._onKeyDown);
      if (this.canvas) {
        this.canvas.removeEventListener("pointerdown", this._onPointerDown);
        this.canvas.removeEventListener("pointerup", this._onPointerUp);
      }
    },
    _onKeyDown: (event) => {
      if (!InputManager) return;
      const code = event.code;
      const activeElement = document.activeElement;
      const isTypingField =
        activeElement &&
        (activeElement.tagName === "INPUT" ||
          activeElement.tagName === "TEXTAREA" ||
          activeElement.isContentEditable);
      if (
        isTypingField &&
        activeElement === UIManager.playerNameInput &&
        typeof StateMachine !== "undefined" &&
        StateMachine.currentState === GameState.MENU
      ) {
        if (code === "Escape") {
          event.preventDefault();
          InputManager.onPause?.();
        }
        return;
      }
      if (code === "ArrowLeft") {
        event.preventDefault();
        InputManager.onMove?.(-1);
        return;
      }
      if (code === "ArrowRight") {
        event.preventDefault();
        InputManager.onMove?.(1);
        return;
      }
      if (code === "Space") {
        event.preventDefault();
        const handled = InputManager.onSpace?.() ?? false;
        if (!handled) {
          InputManager._triggerJump();
        }
        return;
      }
      if (code === "KeyP") {
        event.preventDefault();
        InputManager.onPause?.();
      }
    },
    _triggerJump() {
      const now = Utils.now();
      const doubleTap =
        now - InputManager.lastJumpInput <= GAME_CONFIG.DOUBLE_TAP_TIME_WINDOW;
      InputManager.lastJumpInput = now;
      InputManager.onJump?.(doubleTap);
    },
    _onPointerDown: (event) => {
      InputManager.pointerData = {
        x: event.clientX,
        time: Utils.now(),
      };
    },
    _onPointerUp: (event) => {
      const data = InputManager.pointerData;
      if (!data) return;
      const deltaX = event.clientX - data.x;
      const deltaTime = Utils.now() - data.time;
      const absDeltaX = Math.abs(deltaX);
      if (
        absDeltaX >= GAME_CONFIG.SWIPE_MIN_DISTANCE &&
        absDeltaX / Math.max(deltaTime, 0.01) >= GAME_CONFIG.SWIPE_MIN_SPEED
      ) {
        const direction = deltaX < 0 ? -1 : 1;
        InputManager.onMove?.(direction);
      } else if (deltaTime <= 0.35) {
        InputManager._triggerJump();
      }
      InputManager.pointerData = null;
    },
  };

  const Effects = {
    init(camera) {
      this.camera = camera;
      this.shakeTimer = 0;
      this.shakeStrength = 0;
      this.originalPosition = camera.position.clone();
    },
    update(dt, playerPosition) {
      if (!this.camera) return;
      const desired = new BABYLON.Vector3(
        playerPosition.x,
        playerPosition.y + GAME_CONFIG.CAMERA_HEIGHT,
        playerPosition.z - GAME_CONFIG.CAMERA_DISTANCE
      );
      const newPos = BABYLON.Vector3.Lerp(
        this.camera.position,
        desired,
        GAME_CONFIG.CAMERA_LERP_SPEED
      );
      if (this.shakeTimer > 0) {
        this.shakeTimer -= dt;
        const offset = new BABYLON.Vector3(
          (Math.random() - 0.5) * this.shakeStrength,
          (Math.random() - 0.5) * this.shakeStrength,
          (Math.random() - 0.5) * this.shakeStrength
        );
        newPos.addInPlace(offset);
      }
      this.camera.position.copyFrom(newPos);
      this.camera.setTarget(playerPosition);
    },
    triggerShake(duration = 0.3, strength = 0.6) {
      this.shakeTimer = duration;
      this.shakeStrength = strength;
    },
  };

  const StateMachine = {
    currentState: GameState.MENU,
    init() {
      this.transitionTo(GameState.MENU);
    },
    transitionTo(next) {
      this.currentState = next;
      UIManager.hideOverlays();
      if (next === GameState.MENU) {
        UIManager.showOverlay("menuOverlay");
      } else if (next === GameState.PAUSED) {
        UIManager.showOverlay("pauseOverlay");
      } else if (next === GameState.GAME_OVER) {
        UIManager.showOverlay("gameOverOverlay");
      }
      this.onStateChange?.(next);
    },
    isRunning() {
      return this.currentState === GameState.RUNNING;
    },
  };

  const Game = {
    init() {
      const canvas = document.getElementById("renderCanvas");
      if (!canvas) {
        throw new Error("Render canvas missing");
      }
      UIManager.init();
      this.canvas = canvas;
      this.engine = SceneFactory.createEngine(canvas);
      const { scene, camera, glow } = SceneFactory.createScene(this.engine, canvas);
      this.scene = scene;
      this.camera = camera;
      this.glow = glow;
      TrackManager.init(scene);
      PlayerController.init(scene, TrackManager);
      ObstacleManager.init(scene, TrackManager);
      SpeedPadManager.init(scene, ObstacleManager);
      CollectibleManager.init(scene, TrackManager, ObstacleManager, SpeedPadManager);
      LifeManager.init();
      ScoreManager.init();
      Effects.init(camera);
      InputManager.init(canvas);
      this._bindInputs();
      this._bindUI();
      ObstacleManager.onHit = () => this._handleCollision();
      ObstacleManager.onCleared = () => ScoreManager.addBonus();
      SpeedPadManager.onBoost = (padType) => {
        PlayerController.applyBoost(padType);
      };
      LifeManager.onDeath = () => {
        this._handleGameOver();
      };
      StateMachine.onStateChange = (state) => {
        this.state = state;
        this._updatePauseButton(state);
      };
      StateMachine.init();
      this.state = GameState.MENU;
      this.engine.runRenderLoop(() => this._gameLoop());
      window.addEventListener("resize", () => this.engine.resize());
    },
    _bindInputs() {
      InputManager.onMove = (direction) => {
        if (this.state !== GameState.RUNNING) return;
        PlayerController.requestLaneChange(direction);
      };
      InputManager.onJump = (doubleTap) => {
        if (this.state !== GameState.RUNNING) return;
        PlayerController.requestJump(doubleTap);
      };
      InputManager.onPause = () => {
        if (this.state === GameState.RUNNING) {
          this.pause();
        } else if (this.state === GameState.PAUSED) {
          this.resume();
        }
      };
      InputManager.onSpace = () => {
        if (this.state === GameState.MENU || this.state === GameState.GAME_OVER) {
          this.startRun();
          return true;
        }
        return false;
      };
    },
    _bindUI() {
      UIManager.newGameButton?.addEventListener("click", () => this.startRun());
      UIManager.pauseButton?.addEventListener("click", () => this.pause());
      UIManager.resumeButton?.addEventListener("click", () => this.resume());
      UIManager.restartButton?.addEventListener("click", () => this.startRun());
      UIManager.backToMenuButton?.addEventListener("click", () => this._gotoMenu());
      UIManager.retryButton?.addEventListener("click", () => this.startRun());
      UIManager.menuButton?.addEventListener("click", () => this._gotoMenu());
    },
    _updatePauseButton(state) {
      if (!UIManager.pauseButton) return;
      UIManager.pauseButton.disabled = state !== GameState.RUNNING;
    },
    _clearObstacles() {
      ObstacleManager.obstacles.forEach((obs) => obs.dispose());
      ObstacleManager.obstacles = [];
      ObstacleManager.maxSpeedReached = false;
      ObstacleManager.maxSpawnPressure = 0;
      const playerZ = PlayerController.getPosition().z;
      ObstacleManager.prepareSpawn(playerZ);
    },
    _clearPads() {
      SpeedPadManager.pads.forEach((pad) => pad.dispose());
      SpeedPadManager.pads = [];
      SpeedPadManager.prepareSpawn(PlayerController.getPosition().z);
    },
    _clearCollectibles() {
      const playerZ = PlayerController.getPosition().z;
      CollectibleManager.reset(playerZ);
    },
    resetRun() {
      TrackManager.reset();
      PlayerController.reset();
      this._clearObstacles();
      this._clearPads();
      this._clearCollectibles();
      LifeManager.reset();
      ScoreManager.reset();
    },
    startRun() {
      const nameFromUI = UIManager.getPlayerName();
      ScoreManager.setPlayerName(nameFromUI);
      UIManager.blurPlayerNameInput();
      this.resetRun();
      StateMachine.transitionTo(GameState.RUNNING);
      this.state = GameState.RUNNING;
    },
    pause() {
      if (this.state !== GameState.RUNNING) return;
      StateMachine.transitionTo(GameState.PAUSED);
    },
    resume() {
      if (this.state !== GameState.PAUSED) return;
      StateMachine.transitionTo(GameState.RUNNING);
    },
    _gotoMenu() {
      StateMachine.transitionTo(GameState.MENU);
    },
    _handleCollision() {
      LifeManager.takeDamage();
      ScoreManager.applyPenalty();
      UIManager.flashDamage();
      Effects.triggerShake(0.25, 0.9);
    },
    _handleGameOver() {
      this._clearObstacles();
      this._clearPads();
      this._clearCollectibles();
      ScoreManager.completeRun();
      StateMachine.transitionTo(GameState.GAME_OVER);
    },
    _gameLoop() {
      const dt = this.engine.getDeltaTime() / 1000;
      if (StateMachine.isRunning()) {
        PlayerController.update(dt);
        const playerPosition = PlayerController.getPosition();
        const currentSpeed = PlayerController.getForwardSpeed();
        if (currentSpeed >= GAME_CONFIG.MAX_FORWARD_SPEED) {
          ObstacleManager.maxSpeedReached = true;
        }
        Effects.update(dt, playerPosition);
        TrackManager.update(playerPosition.z);
        ObstacleManager.update(
          dt,
          playerPosition.z,
          playerPosition.x,
          playerPosition.y,
          currentSpeed
        );
        SpeedPadManager.update(
          playerPosition.z,
          playerPosition.x,
          currentSpeed
        );
        CollectibleManager.update(
          dt,
          playerPosition.z,
          playerPosition.x,
          playerPosition.y
        );
        LifeManager.update(dt);
        ScoreManager.update(dt, PlayerController.isBoosting());
      } else {
        const playerPosition = PlayerController.getPosition();
        Effects.update(dt, playerPosition);
        TrackManager.update(playerPosition.z);
      }
      const speedValue = PlayerController.getForwardSpeed();
      UIManager.setSpeed(speedValue);
      this.scene.render();
    },
  };

  window.addEventListener("DOMContentLoaded", () => {
    Game.init();
  });
})();

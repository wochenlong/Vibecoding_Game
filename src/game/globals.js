const TILE_SIZE = 56
const MAP_WIDTH = 16
const MAP_HEIGHT = 12
const MAX_PARTY_SIZE = 6
const MAX_RESERVE_SIZE = 9
const MAX_HOME_STORAGE_SIZE = 120
const MAX_SKILL_SLOTS = 4
const STORAGE_KEY = "gbit_monster_quest_save_v1"
const STORAGE_PROFILE_KEY = "gbit_monster_quest_save_profile_v2"
const STORAGE_SLOT_PREFIX = "gbit_monster_quest_save_slot_v2_"
const STORAGE_SLOT_BACKUP_PREFIX = "gbit_monster_quest_save_slot_backup_v1_"
const STORAGE_SETTINGS_KEY = "gbit_monster_quest_settings_v1"
const SAVE_SLOT_IDS = ["slot1", "slot2", "slot3"]
const DEFAULT_SAVE_SLOT_ID = SAVE_SLOT_IDS[0]
const SAVE_SLOT_BACKUP_LIMIT = 8
const ART_MANIFEST = window.GBIT_ASSETS || {}
const AI_API_BASE = window.location.origin
const STAB_MULTIPLIER = 1.5

const artState = {
  images: {},
}

const sceneCollisionState = {
  loaded: false,
  loading: false,
  error: null,
  maps: {},
}

function toSceneCellKey(x, y) {
  return `${x}:${y}`
}

function normalizeGridInt(value, fallback = 0) {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

function normalizeTransitionDirection(value) {
  const normalized = String(value || "").trim().toLowerCase()
  if (normalized === "up" || normalized === "down" || normalized === "left" || normalized === "right") {
    return normalized
  }
  return ""
}

function normalizeEncounterZoneType(value) {
  const normalized = String(value || "").trim().toLowerCase()
  if (normalized === "grass" || normalized === "water" || normalized === "dirt") {
    return normalized
  }
  if (normalized === "shaking") {
    return "grass"
  }
  if (normalized === "ripple") {
    return "water"
  }
  if (normalized === "dust") {
    return "dirt"
  }
  return ""
}

function clampGridX(value) {
  return Math.max(0, Math.min(MAP_WIDTH - 1, normalizeGridInt(value, 0)))
}

function clampGridY(value) {
  return Math.max(0, Math.min(MAP_HEIGHT - 1, normalizeGridInt(value, 0)))
}

function collectSceneCells(cells, rects) {
  const output = new Set()

  if (Array.isArray(cells)) {
    for (const cell of cells) {
      if (!cell || typeof cell !== "object") {
        continue
      }
      const x = clampGridX(cell.x)
      const y = clampGridY(cell.y)
      output.add(toSceneCellKey(x, y))
    }
  }

  if (Array.isArray(rects)) {
    for (const rect of rects) {
      if (!rect || typeof rect !== "object") {
        continue
      }
      const startX = clampGridX(rect.x)
      const startY = clampGridY(rect.y)
      const width = Math.max(1, normalizeGridInt(rect.w ?? rect.width, 1))
      const height = Math.max(1, normalizeGridInt(rect.h ?? rect.height, 1))
      const endX = Math.min(MAP_WIDTH - 1, startX + width - 1)
      const endY = Math.min(MAP_HEIGHT - 1, startY + height - 1)
      for (let y = startY; y <= endY; y += 1) {
        for (let x = startX; x <= endX; x += 1) {
          output.add(toSceneCellKey(x, y))
        }
      }
    }
  }

  return output
}

function normalizeSceneTransition(transition, index) {
  if (!transition || typeof transition !== "object") {
    return null
  }

  const sourceX = transition.x ?? transition.from?.x
  const sourceY = transition.y ?? transition.from?.y
  const toMap = String(transition.to?.map ?? transition.toMap ?? transition.targetScene ?? "").trim()
  const toX = normalizeGridInt(transition.to?.x ?? transition.toX, 0)
  const toY = normalizeGridInt(transition.to?.y ?? transition.toY, 0)
  const direction = normalizeTransitionDirection(transition.direction)
  const label = String(transition.label ?? transition.targetLabel ?? "").trim()

  if (!toMap) {
    return null
  }

  return {
    id: String(transition.id || `scene_transition_${index + 1}`),
    x: clampGridX(sourceX),
    y: clampGridY(sourceY),
    direction,
    label,
    toMap,
    toX: clampGridX(toX),
    toY: clampGridY(toY),
    message: String(transition.message || ""),
    denyMessage: String(transition.denyMessage || ""),
    requires: transition.requires && typeof transition.requires === "object" ? transition.requires : null,
    postAction: String(transition.postAction || ""),
    onSuccess:
      transition.onSuccess && typeof transition.onSuccess === "object"
        ? {
            healParty: Boolean(transition.onSuccess.healParty),
            healReserve: Boolean(transition.onSuccess.healReserve),
          }
        : null,
  }
}

function collectEncounterZoneRuntime(encounterZones) {
  const encounterTypeByCell = Object.create(null)
  const encounterZonesByType = {
    grass: [],
    water: [],
    dirt: [],
  }

  if (!Array.isArray(encounterZones)) {
    return {
      encounterTypeByCell,
      encounterZonesByType,
    }
  }

  for (const zone of encounterZones) {
    if (!zone || typeof zone !== "object") {
      continue
    }
    const zoneType = normalizeEncounterZoneType(zone.type)
    if (!zoneType) {
      continue
    }

    const cellKeys = collectSceneCells(zone.cells, zone.rects)
    for (const key of cellKeys) {
      if (encounterTypeByCell[key]) {
        continue
      }
      encounterTypeByCell[key] = zoneType
      const [rawX, rawY] = String(key).split(":")
      const x = normalizeGridInt(rawX, -1)
      const y = normalizeGridInt(rawY, -1)
      if (x < 0 || y < 0) {
        continue
      }
      encounterZonesByType[zoneType].push({ x, y })
    }
  }

  return {
    encounterTypeByCell,
    encounterZonesByType,
  }
}

function buildSceneCollisionRuntimeMap(mapId, mapConfig) {
  if (!mapConfig || typeof mapConfig !== "object") {
    return null
  }

  const walkable = collectSceneCells(mapConfig.walkableCells, mapConfig.walkableRects)
  const blocked = collectSceneCells(mapConfig.blockedCells, mapConfig.blockedRects)
  const transitionByCell = Object.create(null)
  const transitions = []
  const encounterRuntime = collectEncounterZoneRuntime(mapConfig.encounterZones)

  if (Array.isArray(mapConfig.transitions)) {
    for (let i = 0; i < mapConfig.transitions.length; i += 1) {
      const normalized = normalizeSceneTransition(mapConfig.transitions[i], i)
      if (!normalized) {
        continue
      }
      transitions.push(normalized)
      transitionByCell[toSceneCellKey(normalized.x, normalized.y)] = normalized
    }
  }

  return {
    mapId,
    enabled: mapConfig.enabled !== false,
    walkable: walkable.size > 0 ? walkable : null,
    blocked,
    transitions,
    transitionByCell,
    encounterTypeByCell: encounterRuntime.encounterTypeByCell,
    encounterZonesByType: encounterRuntime.encounterZonesByType,
  }
}

function applySceneCollisionConfig(raw) {
  const mapsConfig = raw && typeof raw === "object" && raw.maps && typeof raw.maps === "object"
    ? raw.maps
    : {}
  const nextMaps = {}

  for (const [mapId, mapConfig] of Object.entries(mapsConfig)) {
    const runtimeMap = buildSceneCollisionRuntimeMap(mapId, mapConfig)
    if (runtimeMap?.enabled) {
      nextMaps[mapId] = runtimeMap
    }
  }

  sceneCollisionState.maps = nextMaps
}

async function loadSceneCollisionConfig() {
  if (sceneCollisionState.loaded || sceneCollisionState.loading) {
    return
  }

  sceneCollisionState.loading = true
  sceneCollisionState.error = null

  try {
    const versionSuffix = window.GBIT_VERSION?.version ? `?v=${encodeURIComponent(window.GBIT_VERSION.version)}` : ""
    const response = await fetch(`scene-collision.json${versionSuffix}`, { cache: "no-store" })
    if (!response.ok) {
      throw new Error(`scene-collision.json HTTP ${response.status}`)
    }
    const raw = await response.json()
    applySceneCollisionConfig(raw)
  } catch (error) {
    sceneCollisionState.error = error?.message || "failed to load scene-collision.json"
    sceneCollisionState.maps = {}
    console.warn("[scene-collision]", sceneCollisionState.error)
  } finally {
    sceneCollisionState.loaded = true
    sceneCollisionState.loading = false
  }
}

function getSceneCollisionMap(mapId = state?.currentMap) {
  const key = String(mapId || "").trim()
  if (!key) {
    return null
  }
  return sceneCollisionState.maps[key] || null
}

function getSceneCollisionPassability(mapId, x, y) {
  const runtimeMap = getSceneCollisionMap(mapId)
  if (!runtimeMap) {
    return null
  }

  if (x < 0 || y < 0 || x >= MAP_WIDTH || y >= MAP_HEIGHT) {
    return false
  }

  const key = toSceneCellKey(x, y)
  if (runtimeMap.blocked.has(key)) {
    return false
  }
  if (runtimeMap.walkable) {
    return runtimeMap.walkable.has(key)
  }
  return true
}

function getSceneCollisionTransition(mapId, x, y) {
  const runtimeMap = getSceneCollisionMap(mapId)
  if (!runtimeMap) {
    return null
  }
  return runtimeMap.transitionByCell[toSceneCellKey(x, y)] || null
}

function getSceneEncounterZone(mapId, x, y) {
  const runtimeMap = getSceneCollisionMap(mapId)
  if (!runtimeMap) {
    return ""
  }
  if (x < 0 || y < 0 || x >= MAP_WIDTH || y >= MAP_HEIGHT) {
    return ""
  }
  const zoneType = runtimeMap.encounterTypeByCell?.[toSceneCellKey(x, y)]
  return typeof zoneType === "string" ? zoneType : ""
}

const sceneThemes = {
  home: {
    backdropTop: "#9cc8ff",
    backdropBottom: "#efe4bf",
    haze: "rgba(230, 246, 255, 0.22)",
    floorLight: "rgba(224, 210, 168, 0.95)",
    floorDark: "rgba(184, 165, 120, 0.92)",
    wallDark: "#6c6a63",
    wallLight: "#b9af98",
    ambient: "rgba(160, 213, 196, 0.16)",
    particle: "rgba(243, 250, 255, 0.68)",
    accent: "#63b79a",
    trim: "#d8b876",
    glass: "#98c8e5",
    water: "#62a3d5",
    foliage: "#73ad70",
  },
  town: {
    backdropTop: "#8ec6ff",
    backdropBottom: "#efe4b7",
    haze: "rgba(246, 244, 224, 0.36)",
    floorLight: "rgba(238, 228, 205, 0.96)",
    floorDark: "rgba(210, 194, 165, 0.94)",
    wallDark: "#7a6c5e",
    wallLight: "#e6dbc8",
    ambient: "rgba(255, 241, 197, 0.14)",
    particle: "rgba(255, 250, 233, 0.76)",
    accent: "#66b8b1",
    trim: "#cda96a",
    glass: "#88b8d8",
    water: "#5ea1d6",
    foliage: "#77ae75",
  },
  route: {
    backdropTop: "#7bc0ff",
    backdropBottom: "#f6e7b6",
    haze: "rgba(236, 250, 210, 0.28)",
    floorLight: "rgba(228, 205, 149, 0.96)",
    floorDark: "rgba(188, 161, 110, 0.92)",
    wallDark: "#6a7f4b",
    wallLight: "#8fbf65",
    ambient: "rgba(173, 219, 112, 0.2)",
    particle: "rgba(255, 251, 224, 0.74)",
    accent: "#79bf55",
    trim: "#d8bf72",
    glass: "#8fcbe6",
    water: "#5faad4",
    foliage: "#6cab49",
  },
  meadow: {
    backdropTop: "#8ad0ff",
    backdropBottom: "#f3e7b9",
    haze: "rgba(231, 249, 219, 0.3)",
    floorLight: "rgba(223, 205, 142, 0.96)",
    floorDark: "rgba(182, 158, 107, 0.92)",
    wallDark: "#60734b",
    wallLight: "#8ebb67",
    ambient: "rgba(160, 214, 119, 0.2)",
    particle: "rgba(255, 251, 224, 0.72)",
    accent: "#7ec45d",
    trim: "#dfbf75",
    glass: "#8ccbe4",
    water: "#5ba7d4",
    foliage: "#6ead4e",
  },
  lake: {
    backdropTop: "#7cbdf3",
    backdropBottom: "#d8e5cc",
    haze: "rgba(215, 238, 255, 0.2)",
    floorLight: "rgba(174, 201, 217, 0.92)",
    floorDark: "rgba(114, 151, 181, 0.9)",
    wallDark: "#5a6e85",
    wallLight: "#9dbad8",
    ambient: "rgba(145, 194, 232, 0.18)",
    particle: "rgba(224, 241, 255, 0.66)",
    accent: "#5ca6dc",
    trim: "#bcd47a",
    glass: "#8fd2ee",
    water: "#4d8ec7",
    foliage: "#78b16f",
  },
  orchard: {
    backdropTop: "#95d0ff",
    backdropBottom: "#f4e4b2",
    haze: "rgba(245, 244, 214, 0.24)",
    floorLight: "rgba(224, 207, 141, 0.95)",
    floorDark: "rgba(186, 161, 102, 0.92)",
    wallDark: "#6d7750",
    wallLight: "#9abc74",
    ambient: "rgba(180, 224, 128, 0.18)",
    particle: "rgba(255, 244, 218, 0.7)",
    accent: "#8ac45a",
    trim: "#ddb66d",
    glass: "#9fd3ee",
    water: "#66afd8",
    foliage: "#6cad4f",
  },
  reef: {
    backdropTop: "#78bfef",
    backdropBottom: "#d5e8d9",
    haze: "rgba(213, 242, 246, 0.2)",
    floorLight: "rgba(166, 209, 203, 0.92)",
    floorDark: "rgba(112, 164, 172, 0.9)",
    wallDark: "#55758a",
    wallLight: "#8db9d1",
    ambient: "rgba(118, 200, 216, 0.16)",
    particle: "rgba(218, 248, 255, 0.62)",
    accent: "#4fadd8",
    trim: "#b8d67d",
    glass: "#92d7ef",
    water: "#4c98c8",
    foliage: "#74b389",
  },  cave: {
    backdropTop: "#5d6f8d",
    backdropBottom: "#8b8a7f",
    haze: "rgba(219, 225, 238, 0.11)",
    floorLight: "rgba(166, 162, 150, 0.93)",
    floorDark: "rgba(120, 118, 112, 0.92)",
    wallDark: "#535157",
    wallLight: "#908d97",
    ambient: "rgba(189, 206, 237, 0.08)",
    particle: "rgba(224, 231, 245, 0.45)",
    accent: "#8eb1d8",
    trim: "#baa677",
    glass: "#8ca8c7",
    water: "#5e86b2",
    foliage: "#7a8f7a",
  },
  deep_cave: {
    backdropTop: "#495a74",
    backdropBottom: "#6c6a63",
    haze: "rgba(205, 214, 233, 0.08)",
    floorLight: "rgba(147, 143, 134, 0.92)",
    floorDark: "rgba(100, 99, 95, 0.92)",
    wallDark: "#3f424d",
    wallLight: "#7a7f8f",
    ambient: "rgba(170, 187, 219, 0.08)",
    particle: "rgba(210, 221, 241, 0.36)",
    accent: "#7da0ca",
    trim: "#ad996a",
    glass: "#7a94b2",
    water: "#4e77a4",
    foliage: "#6f8371",
  },
  ridge: {
    backdropTop: "#89a9cf",
    backdropBottom: "#d8d0c0",
    haze: "rgba(226, 231, 244, 0.16)",
    floorLight: "rgba(186, 182, 171, 0.94)",
    floorDark: "rgba(136, 132, 124, 0.92)",
    wallDark: "#5c606c",
    wallLight: "#9ca3b4",
    ambient: "rgba(178, 201, 230, 0.12)",
    particle: "rgba(229, 236, 248, 0.48)",
    accent: "#7ca0ce",
    trim: "#c7ad76",
    glass: "#9fb4cf",
    water: "#6e95be",
    foliage: "#809a7f",
  },
  islet: {
    backdropTop: "#7bc7f1",
    backdropBottom: "#efe2bb",
    haze: "rgba(226, 246, 255, 0.2)",
    floorLight: "rgba(220, 206, 154, 0.94)",
    floorDark: "rgba(178, 161, 114, 0.91)",
    wallDark: "#6c7468",
    wallLight: "#aab48f",
    ambient: "rgba(180, 220, 186, 0.16)",
    particle: "rgba(238, 248, 255, 0.64)",
    accent: "#68b7c8",
    trim: "#d8bd7d",
    glass: "#9dd8ee",
    water: "#5da9d2",
    foliage: "#7bb069",
  },  sanctum: {
    backdropTop: "#6d77b9",
    backdropBottom: "#c9c2ad",
    haze: "rgba(230, 228, 255, 0.12)",
    floorLight: "rgba(211, 205, 196, 0.95)",
    floorDark: "rgba(166, 161, 153, 0.93)",
    wallDark: "#636074",
    wallLight: "#b4afc7",
    ambient: "rgba(214, 204, 255, 0.12)",
    particle: "rgba(235, 231, 255, 0.54)",
    accent: "#9ca3ea",
    trim: "#cdb275",
    glass: "#a9b3ef",
    water: "#7e8fd6",
    foliage: "#9ab08c",
  },
  gym: {
    backdropTop: "#6b7eb3",
    backdropBottom: "#dbd1b8",
    haze: "rgba(232, 239, 255, 0.12)",
    floorLight: "rgba(215, 218, 224, 0.96)",
    floorDark: "rgba(176, 184, 197, 0.94)",
    wallDark: "#5f626a",
    wallLight: "#bfc9d8",
    ambient: "rgba(204, 224, 255, 0.1)",
    particle: "rgba(234, 241, 255, 0.5)",
    accent: "#5f8fd4",
    trim: "#c7ab66",
    glass: "#8db4e8",
    water: "#89a9df",
    foliage: "#a6be8c",
  },
}

const sceneAnchors = {
  town: {
    plazaX: 7.5,
    plazaY: 3.5,
    boulevardY: 6.5,
  },
}

const specialTileIds = {
  dust: "d",
  ripple: "r",
  shaking: "s",
  fieldChest: "B",
  orchardGate: "O",
  reefGate: "K",
  ridgeGate: "P",
  isletGate: "U",
  guideArcane: "A",
  guideSun: "S",
  guideWeapon: "W",
  shrineGate: "T",
  legendAltar: "Z",
  statue: "M",
}

const itemCategoryNames = {
  heal: "回复道具",
  battle: "战斗道具",
  utility: "探索道具",
  ball: "精灵球相关",
  tm: "学习器",
  berry: "树果",
  treasure: "宝物",
  ingredient: "食材",
  evolution: "进化素材",
  key: "重要物品",
}

const moveData = {
  quick_strike: { name: "迅击", power: 11, accuracy: 0.96, type: "normal", category: "physical" },
  leaf_blade: {
    name: "叶刃",
    power: 13,
    accuracy: 0.94,
    type: "grass",
    category: "physical",
    secondary: {
      chance: 0.12,
      effects: [{ kind: "buff", target: "self", stat: "speed", amount: 1 }],
    },
  },
  thorn_whip: { name: "棘藤鞭", power: 16, accuracy: 0.9, type: "grass", category: "physical" },
  ember_burst: {
    name: "火花冲撞",
    power: 13,
    accuracy: 0.93,
    type: "fire",
    category: "special",
    secondary: {
      chance: 0.2,
      effects: [{ kind: "status", target: "enemy", status: "burn" }],
    },
  },
  flame_dash: { name: "焰袭", power: 16, accuracy: 0.89, type: "fire", category: "physical" },
  water_jet: { name: "水流弹", power: 13, accuracy: 0.95, type: "water", category: "special" },
  tidal_arc: {
    name: "潮旋弧",
    power: 16,
    accuracy: 0.9,
    type: "water",
    category: "special",
    secondary: {
      chance: 0.16,
      effects: [{ kind: "buff", target: "self", stat: "speed", amount: 1 }],
    },
  },
  bug_bite: { name: "虫咬", power: 12, accuracy: 0.95, type: "bug", category: "physical" },
  spore_dust: {
    name: "孢尘扑击",
    power: 14,
    accuracy: 0.91,
    type: "bug",
    category: "special",
    secondary: {
      chance: 0.24,
      effects: [{ kind: "status", target: "enemy", status: "poison" }],
    },
  },
  spark_hit: { name: "电火拍击", power: 13, accuracy: 0.94, type: "electric", category: "physical" },
  static_bolt: {
    name: "静电束",
    power: 16,
    accuracy: 0.88,
    type: "electric",
    category: "special",
    secondary: {
      chance: 0.18,
      effects: [{ kind: "status", target: "enemy", status: "confusion" }],
    },
  },
  stone_crash: { name: "岩落", power: 14, accuracy: 0.92, type: "rock", category: "physical" },
  horn_rush: { name: "角突", power: 16, accuracy: 0.89, type: "rock", category: "physical" },
  solar_slice: { name: "Solar Slice", power: 20, accuracy: 0.86, type: "grass", category: "special" },
  inferno_pounce: {
    name: "Inferno Pounce",
    power: 20,
    accuracy: 0.86,
    type: "fire",
    category: "physical",
  },
  hydro_press: { name: "Hydro Press", power: 20, accuracy: 0.87, type: "water", category: "special" },
  swarm_drive: {
    name: "Swarm Drive",
    power: 19,
    accuracy: 0.88,
    type: "bug",
    category: "physical",
    secondary: {
      chance: 0.16,
      effects: [{ kind: "buff", target: "self", stat: "attack", amount: 1 }],
    },
  },
  volt_lance: { name: "Volt Lance", power: 20, accuracy: 0.86, type: "electric", category: "special" },
  shell_breaker: { name: "Shell Breaker", power: 19, accuracy: 0.88, type: "rock", category: "physical" },
  mud_spike: {
    name: "Mud Spike",
    power: 15,
    accuracy: 0.92,
    type: "rock",
    category: "physical",
    secondary: {
      chance: 0.18,
      effects: [{ kind: "buff", target: "enemy", stat: "speed", amount: -1 }],
    },
  },
  aqua_lance: { name: "Aqua Lance", power: 17, accuracy: 0.9, type: "water", category: "special" },
  vine_guard: {
    name: "Vine Guard",
    power: 0,
    accuracy: 1,
    type: "grass",
    category: "status",
    effects: [{ kind: "buff", target: "self", stat: "defense", amount: 2 }],
  },
  magma_surge: {
    name: "Magma Surge",
    power: 18,
    accuracy: 0.88,
    type: "fire",
    category: "special",
    secondary: {
      chance: 0.28,
      effects: [{ kind: "status", target: "enemy", status: "burn" }],
    },
  },
  thunder_current: {
    name: "Thunder Current",
    power: 18,
    accuracy: 0.88,
    type: "electric",
    category: "special",
    secondary: {
      chance: 0.22,
      effects: [{ kind: "status", target: "enemy", status: "confusion" }],
    },
  },
  relic_roar: { name: "Relic Roar", power: 21, accuracy: 0.84, type: "rock", category: "physical" },
  aurora_tide: { name: "Aurora Tide", power: 21, accuracy: 0.85, type: "water", category: "special" },
  celestial_bloom: { name: "Celestial Bloom", power: 21, accuracy: 0.85, type: "grass", category: "special" },
  toxic_spores: {
    name: "毒孢雾",
    power: 0,
    accuracy: 0.9,
    type: "bug",
    category: "status",
    effects: [{ kind: "status", target: "enemy", status: "poison" }],
  },
  flame_focus: {
    name: "炎能蓄力",
    power: 0,
    accuracy: 1,
    type: "fire",
    category: "status",
    effects: [{ kind: "buff", target: "self", stat: "attack", amount: 2 }],
  },
  aqua_shield: {
    name: "水幕守护",
    power: 0,
    accuracy: 1,
    type: "water",
    category: "status",
    effects: [{ kind: "buff", target: "self", stat: "defense", amount: 2 }],
  },
  mind_shock: {
    name: "心念扰动",
    power: 0,
    accuracy: 0.92,
    type: "electric",
    category: "status",
    effects: [{ kind: "status", target: "enemy", status: "confusion" }],
  },
  fairy_pulse: {
    name: "妖精脉冲",
    power: 14,
    accuracy: 0.92,
    type: "fairy",
    category: "special",
    secondary: {
      chance: 0.16,
      effects: [{ kind: "status", target: "enemy", status: "confusion" }],
    },
  },
  moon_barrier: {
    name: "月幕壁",
    power: 0,
    accuracy: 1,
    type: "fairy",
    category: "status",
    effects: [
      { kind: "buff", target: "self", stat: "defense", amount: 1 },
      { kind: "buff", target: "self", stat: "speed", amount: 1 },
    ],
  },
  prism_lance: {
    name: "棱光枪",
    power: 19,
    accuracy: 0.88,
    type: "fairy",
    category: "special",
  },
  starlight_waltz: {
    name: "星舞回旋",
    power: 22,
    accuracy: 0.85,
    type: "fairy",
    category: "special",
  },
  lava_claw: {
    name: "熔刃爪击",
    power: 18,
    accuracy: 0.9,
    type: "fire",
    category: "physical",
    secondary: {
      chance: 0.2,
      effects: [{ kind: "status", target: "enemy", status: "burn" }],
    },
  },
  inferno_halberd: {
    name: "炎戟断空",
    power: 23,
    accuracy: 0.84,
    type: "fire",
    category: "physical",
    secondary: {
      chance: 0.2,
      effects: [{ kind: "buff", target: "self", stat: "attack", amount: 1 }],
    },
  },
  verdant_inferno: {
    name: "焚棘龙焰",
    power: 21,
    accuracy: 0.87,
    type: "grass",
    category: "special",
    secondary: {
      chance: 0.18,
      effects: [{ kind: "status", target: "enemy", status: "burn" }],
    },
  },
  frost_arc: {
    name: "霜弧电流",
    power: 17,
    accuracy: 0.91,
    type: "electric",
    category: "special",
    secondary: {
      chance: 0.16,
      effects: [{ kind: "buff", target: "enemy", stat: "defense", amount: -1 }],
    },
  },
  ember_howl: {
    name: "炽吼战意",
    power: 0,
    accuracy: 1,
    type: "fire",
    category: "status",
    effects: [
      { kind: "buff", target: "self", stat: "attack", amount: 1 },
      { kind: "buff", target: "self", stat: "speed", amount: 1 },
    ],
  },
  glacial_veil: {
    name: "星霜幕",
    power: 0,
    accuracy: 1,
    type: "fairy",
    category: "status",
    effects: [
      { kind: "buff", target: "self", stat: "defense", amount: 1 },
      { kind: "buff", target: "self", stat: "speed", amount: 1 },
    ],
  },
  vine_whip: {
    name: "藤鞭",
    power: 12,
    accuracy: 0.95,
    type: "grass",
    category: "physical",
  },
  absorb: {
    name: "吸取",
    power: 12,
    accuracy: 0.96,
    type: "grass",
    category: "special",
    drainRatio: 0.45,
  },
  mega_drain: {
    name: "超级吸取",
    power: 18,
    accuracy: 0.93,
    type: "grass",
    category: "special",
    drainRatio: 0.5,
  },
  leech_seed: {
    name: "寄生种子",
    power: 0,
    accuracy: 0.9,
    type: "grass",
    category: "status",
    effects: [{ kind: "status", target: "enemy", status: "leech" }],
  },
  sleep_powder: {
    name: "催眠粉",
    power: 0,
    accuracy: 0.82,
    type: "grass",
    category: "status",
    effects: [{ kind: "status", target: "enemy", status: "sleep" }],
  },
  stun_spore: {
    name: "麻痹粉",
    power: 0,
    accuracy: 0.88,
    type: "grass",
    category: "status",
    effects: [{ kind: "status", target: "enemy", status: "paralysis" }],
  },
  mercy_strike: {
    name: "仁慈",
    power: 16,
    accuracy: 0.95,
    type: "normal",
    category: "physical",
    wildSpareOneHp: true,
  },
  frost_peck: {
    name: "霜羽突袭",
    power: 17,
    accuracy: 0.9,
    type: "ice",
    category: "physical",
    secondary: {
      chance: 0.22,
      effects: [{ kind: "status", target: "enemy", status: "paralysis" }],
    },
  },
  blizzard_burst: {
    name: "暴雪流岚",
    power: 22,
    accuracy: 0.84,
    type: "ice",
    category: "special",
    secondary: {
      chance: 0.2,
      effects: [{ kind: "status", target: "enemy", status: "sleep" }],
    },
  },
}

function normalizeSkillSlots(skillIds, limit = MAX_SKILL_SLOTS) {
  if (!Array.isArray(skillIds)) {
    return []
  }

  const normalized = []
  for (const skillId of skillIds) {
    if (!moveData[skillId] || normalized.includes(skillId)) {
      continue
    }
    normalized.push(skillId)
    if (normalized.length >= limit) {
      break
    }
  }

  return normalized
}

function learnSkillWithLimit(skillList, skillId, options = {}) {
  if (!Array.isArray(skillList) || !moveData[skillId] || skillList.includes(skillId)) {
    return {
      learned: false,
      replacedSkillId: null,
    }
  }

  const limit = Number.isInteger(options.limit) ? options.limit : MAX_SKILL_SLOTS
  if (skillList.length >= limit) {
    const replacedSkillId = skillList.shift() || null
    skillList.push(skillId)
    return {
      learned: true,
      replacedSkillId,
    }
  }

  skillList.push(skillId)
  return {
    learned: true,
    replacedSkillId: null,
  }
}

const speciesData = {
  sprigoon: {
    name: "芽团兽",
    type: "grass",
    baseHp: 28,
    baseAttack: 8,
    baseDefense: 9,
    baseSpeed: 8,
    baseExp: 63,
    skills: ["quick_strike", "leaf_blade"],
    evolveLevel: 7,
    evolvesTo: "thornlynx",
    description: "背上的嫩叶会跟着情绪晃动，喜欢在晨露里打滚。",
  },
  thornlynx: {
    name: "棘影猫",
    type: "grass",
    baseHp: 38,
    baseAttack: 12,
    baseDefense: 15,
    baseSpeed: 12,
    baseExp: 168,
    skills: ["leaf_blade", "thorn_whip"],
    description: "进化后会利用藤蔓织成护甲，动作安静而迅速。",
  },
  embercub: {
    name: "炽团犬",
    type: "fire",
    baseHp: 27,
    baseAttack: 10,
    baseDefense: 7,
    baseSpeed: 9,
    baseExp: 65,
    skills: ["quick_strike", "ember_burst"],
    evolveLevel: 7,
    evolvesTo: "blazehound",
    description: "脖颈的火绒会在战斗前炸开，是很热血的伙伴。",
  },
  blazehound: {
    name: "烈焰猎犬",
    type: "fire",
    baseHp: 36,
    baseAttack: 13,
    baseDefense: 13,
    baseSpeed: 13,
    baseExp: 175,
    skills: ["ember_burst", "flame_dash"],
    description: "奔跑时会在地面留下炽热足迹，擅长爆发进攻。",
  },
  aquaffin: {
    name: "泡鳍兽",
    type: "water",
    baseHp: 29,
    baseAttack: 8,
    baseDefense: 8,
    baseSpeed: 9,
    baseExp: 64,
    skills: ["quick_strike", "water_jet"],
    evolveLevel: 7,
    evolvesTo: "tideshell",
    description: "会把空气打成泡泡围绕自己，性格活泼好奇。",
  },
  tideshell: {
    name: "潮甲灵",
    type: "water",
    baseHp: 40,
    baseAttack: 11,
    baseDefense: 16,
    baseSpeed: 11,
    baseExp: 165,
    skills: ["water_jet", "tidal_arc"],
    description: "厚重的潮甲能挡住正面冲击，是持久战好手。",
  },
  beetbit: {
    name: "甲点虫",
    type: "bug",
    baseHp: 24,
    baseAttack: 7,
    baseDefense: 7,
    baseSpeed: 8,
    baseExp: 38,
    skills: ["bug_bite", "spore_dust"],
    evolveLevel: 6,
    evolvesTo: "mosscarab",
    description: "体表的斑点会发光，常埋伏在路边的高草里。",
  },
  mosscarab: {
    name: "苔盔甲虫",
    type: "bug",
    baseHp: 34,
    baseAttack: 10,
    baseDefense: 14,
    baseSpeed: 10,
    baseExp: 118,
    skills: ["bug_bite", "spore_dust"],
    description: "会把苔藓抹在甲壳上进行伪装，很擅长消耗战。",
  },
  voltkit: {
    name: "闪绒狐",
    type: "electric",
    baseHp: 26,
    baseAttack: 9,
    baseDefense: 7,
    baseSpeed: 11,
    baseExp: 42,
    skills: ["spark_hit", "static_bolt"],
    description: "尾巴会积蓄静电，受惊时整个身体都在闪。",
  },
  stonehorn: {
    name: "岩角犀",
    type: "rock",
    baseHp: 33,
    baseAttack: 10,
    baseDefense: 11,
    baseSpeed: 6,
    baseExp: 50,
    skills: ["stone_crash", "horn_rush"],
    description: "厚实的角能撞碎碎石，是道馆里最难缠的守卫。",
  },
  drillmole: {
    name: "螺钉地鼠",
    type: "rock",
    baseHp: 30,
    baseAttack: 11,
    baseDefense: 8,
    baseSpeed: 8,
    baseExp: 46,
    skills: ["quick_strike", "mud_spike"],
    evolveLevel: 9,
    evolvesTo: "quakeburrow",
    description: "前爪像钻头一样能在石层里挖出快速通道。",
  },
  quakeburrow: {
    name: "震铠龙鼹",
    type: "rock",
    baseHp: 42,
    baseAttack: 15,
    baseDefense: 17,
    baseSpeed: 10,
    baseExp: 145,
    skills: ["mud_spike", "relic_roar"],
    description: "进化后外壳会产生震动纹，能掀翻整块地层。",
  },
  rivulet: {
    name: "涟尾灵",
    type: "water",
    baseHp: 31,
    baseAttack: 9,
    baseDefense: 9,
    baseSpeed: 10,
    baseExp: 46,
    skills: ["water_jet", "aqua_lance"],
    evolveLevel: 9,
    evolvesTo: "torrentail",
    description: "会沿着水纹滑行，最喜欢追逐闪烁的浮光。",
  },
  torrentail: {
    name: "潮怒尾鲸",
    type: "water",
    baseHp: 44,
    baseAttack: 13,
    baseDefense: 16,
    baseSpeed: 13,
    baseExp: 135,
    skills: ["aqua_lance", "aurora_tide"],
    description: "厚重尾鳍能掀起巨浪，是水路上的霸主之一。",
  },
  reedimp: {
    name: "苇叶灵",
    type: "grass",
    baseHp: 29,
    baseAttack: 9,
    baseDefense: 10,
    baseSpeed: 9,
    baseExp: 44,
    skills: ["leaf_blade", "vine_guard"],
    evolveLevel: 8,
    evolvesTo: "bloomantis",
    description: "躲在高草里时几乎像植物本身，很难被发现。",
  },
  bloomantis: {
    name: "花刃螳灵",
    type: "grass",
    baseHp: 39,
    baseAttack: 14,
    baseDefense: 15,
    baseSpeed: 14,
    baseExp: 128,
    skills: ["vine_guard", "solar_slice"],
    description: "进化后会以花瓣刀锋作战，出手极快。",
  },
  flarehawk: {
    name: "焰羽隼",
    type: "fire",
    baseHp: 34,
    baseAttack: 14,
    baseDefense: 8,
    baseSpeed: 13,
    baseExp: 90,
    skills: ["ember_burst", "magma_surge"],
    description: "擅长俯冲突袭，羽翼会在高速飞行时燃起火光。",
  },
  glintfin: {
    name: "电鳍鲨",
    type: "electric",
    baseHp: 36,
    baseAttack: 12,
    baseDefense: 9,
    baseSpeed: 12,
    baseExp: 88,
    skills: ["spark_hit", "thunder_current"],
    description: "背鳍会放出短促电弧，在湖面形成连续水纹。",
  },
  solaraith_cub: {
    name: "曜辉幼兽",
    type: "fire",
    baseHp: 36,
    baseAttack: 12,
    baseDefense: 10,
    baseSpeed: 11,
    baseExp: 92,
    skills: ["ember_burst", "quick_strike"],
    evolveLevel: 16,
    evolvesTo: "solaraith",
    description: "曜辉圣兽的幼体，体内的炽光仍未稳定，却已具备守护者的威仪。",
  },
  solaraith: {
    name: "曜辉圣兽",
    type: "fire",
    baseHp: 54,
    baseAttack: 19,
    baseDefense: 15,
    baseSpeed: 15,
    baseExp: 280,
    skills: ["magma_surge", "thunder_current"],
    description: "传说中的守护者之一，被视为太阳熔火的化身，数量极其稀少。",
    isLegendary: true,
  },
  abyssalor_cub: {
    name: "渊海幼龙",
    type: "water",
    baseHp: 38,
    baseAttack: 11,
    baseDefense: 12,
    baseSpeed: 9,
    baseExp: 90,
    skills: ["water_jet", "quick_strike"],
    evolveLevel: 16,
    evolvesTo: "abyssalor",
    description: "渊海古龙的幼体，会在潮汐变化时发出低沉共鸣，被视为深渊意志的幼芽。",
  },
  abyssalor: {
    name: "渊海古龙",
    type: "water",
    baseHp: 58,
    baseAttack: 18,
    baseDefense: 17,
    baseSpeed: 12,
    baseExp: 275,
    skills: ["aurora_tide", "relic_roar"],
    description: "深渊神话中记载的巨兽，曾引发海潮灾害，几乎不会现身。",
    isLegendary: true,
  },
  verdion: {
    name: "森律神使",
    type: "grass",
    baseHp: 56,
    baseAttack: 17,
    baseDefense: 16,
    baseSpeed: 14,
    baseExp: 270,
    skills: ["celestial_bloom", "vine_guard"],
    description: "古代祭祀中被奉为林域秩序的管理者，传说中不具性别。",
    isLegendary: true,
  },
  runebreeze: {
    name: "符风灵",
    type: "fairy",
    baseHp: 52,
    baseAttack: 17,
    baseDefense: 16,
    baseSpeed: 19,
    baseExp: 232,
    skills: ["prism_lance", "moon_barrier"],
    description: "只在天穹遗迹外环现身，羽翼会拖出符文光痕，被视为遗迹守门者。",
  },
  aegislith: {
    name: "穹壁石卫",
    type: "rock",
    baseHp: 60,
    baseAttack: 18,
    baseDefense: 22,
    baseSpeed: 11,
    baseExp: 240,
    skills: ["relic_roar", "shell_breaker"],
    description: "遗迹石像长期吸收地脉后诞生的护卫体，装甲厚重，擅长正面压制。",
  },
  abyssiris: {
    name: "渊镜灵鲛",
    type: "water",
    baseHp: 56,
    baseAttack: 18,
    baseDefense: 17,
    baseSpeed: 15,
    baseExp: 236,
    skills: ["aurora_tide", "tidal_arc"],
    description: "会在遗迹地面投下镜潮幻影，擅长用连续潮汐拉扯战线。",
  },
  thunderion: {
    name: "霆环兽",
    type: "electric",
    baseHp: 54,
    baseAttack: 20,
    baseDefense: 15,
    baseSpeed: 18,
    baseExp: 238,
    skills: ["thunder_current", "static_bolt"],
    description: "徘徊在祭坛上空的电环猎手，出手极快，常以连锁电流先发制人。",
  },
  stormcrest: {
    name: "霆穹鸟",
    type: "electric",
    baseHp: 52,
    baseAttack: 16,
    baseDefense: 12,
    baseSpeed: 18,
    baseExp: 260,
    skills: ["static_bolt", "thunder_current"],
    description: "雷暴前常在高空巡弋，被视作风雷天象的具象化神鸟。",
    isLegendary: true,
  },
  frostplume: {
    name: "霜羽鸟",
    type: "ice",
    baseHp: 51,
    baseAttack: 17,
    baseDefense: 11,
    baseSpeed: 16,
    baseExp: 265,
    skills: ["frost_peck", "blizzard_burst"],
    description: "据说它掠过的气流会冻结林梢与湖面，是寒霜天象的神鸟。",
    isLegendary: true,
  },
  pixibud: {
    name: "绒芽灵",
    type: "fairy",
    baseHp: 30,
    baseAttack: 8,
    baseDefense: 8,
    baseSpeed: 10,
    baseExp: 40,
    skills: ["quick_strike", "fairy_pulse"],
    evolveLevel: 8,
    evolvesTo: "aurorabbit",
    description: "耳尖会飘出细小光点，喜欢在黎明前后追着晨光奔跑。",
  },
  aurorabbit: {
    name: "曦跃兔",
    type: "fairy",
    baseHp: 41,
    baseAttack: 12,
    baseDefense: 10,
    baseSpeed: 13,
    baseExp: 108,
    skills: ["fairy_pulse", "prism_lance"],
    description: "擅长高速突进，跃起时会拖出彩虹般的光弧。",
  },
  coralyn: {
    name: "珊歌灵",
    type: "water",
    baseHp: 33,
    baseAttack: 9,
    baseDefense: 10,
    baseSpeed: 9,
    baseExp: 50,
    skills: ["water_jet", "fairy_pulse"],
    evolveLevel: 10,
    evolvesTo: "tidecelest",
    description: "会以歌声引导潮汐，在礁湾常被误认为海面荧光。",
  },
  tidecelest: {
    name: "潮辉海姬",
    type: "water",
    baseHp: 47,
    baseAttack: 13,
    baseDefense: 13,
    baseSpeed: 10,
    baseExp: 132,
    skills: ["aurora_tide", "prism_lance"],
    description: "能用潮流包裹队友，是海湾深处极少见的守望者。",
  },
  embermuse: {
    name: "焰梦狐",
    type: "fire",
    baseHp: 37,
    baseAttack: 14,
    baseDefense: 9,
    baseSpeed: 12,
    baseExp: 80,
    skills: ["ember_burst", "fairy_pulse"],
    description: "会把火星化作幻光迷惑对手，擅长扰乱战局。",
  },
  mossfawn: {
    name: "苔角鹿灵",
    type: "grass",
    baseHp: 34,
    baseAttack: 10,
    baseDefense: 11,
    baseSpeed: 9,
    baseExp: 47,
    skills: ["leaf_blade", "moon_barrier"],
    evolveLevel: 11,
    evolvesTo: "florastag",
    description: "角上会长出细小花苞，常在果园边缘保护幼芽。",
  },
  florastag: {
    name: "花冠鹿王",
    type: "grass",
    baseHp: 49,
    baseAttack: 15,
    baseDefense: 14,
    baseSpeed: 11,
    baseExp: 140,
    skills: ["celestial_bloom", "starlight_waltz"],
    description: "成熟的花冠能驱散迷雾，常被当地人视为丰收象征。",
  },
  shardillo: {
    name: "晶壳兽",
    type: "rock",
    baseHp: 40,
    baseAttack: 12,
    baseDefense: 14,
    baseSpeed: 7,
    baseExp: 95,
    skills: ["stone_crash", "moon_barrier"],
    description: "背甲有半透明晶层，能折射攻击并保护同伴。",
  },
  zephyrimp: {
    name: "风电童",
    type: "electric",
    baseHp: 35,
    baseAttack: 11,
    baseDefense: 8,
    baseSpeed: 14,
    baseExp: 72,
    skills: ["spark_hit", "fairy_pulse"],
    description: "会乘着海风放电，性格顽皮但非常亲人。",
  },
  mistowl: {
    name: "雾潮鸮",
    type: "water",
    baseHp: 38,
    baseAttack: 11,
    baseDefense: 10,
    baseSpeed: 12,
    baseExp: 78,
    skills: ["water_jet", "moon_barrier"],
    description: "会借海雾隐藏身形，在夜潮中悄然盘旋。",
  },
  gearcub: {
    name: "齿岩熊崽",
    type: "rock",
    baseHp: 42,
    baseAttack: 13,
    baseDefense: 12,
    baseSpeed: 9,
    baseExp: 82,
    skills: ["stone_crash", "static_bolt"],
    description: "前爪如齿轮般坚硬，擅长在山地打出连续重击。",
  },
  petalisk: {
    name: "花翼灵蜥",
    type: "grass",
    baseHp: 36,
    baseAttack: 10,
    baseDefense: 11,
    baseSpeed: 13,
    baseExp: 63,
    skills: ["leaf_blade", "fairy_pulse"],
    description: "背上的花翼能在短距离滑翔，是果园里少见的敏捷型精灵。",
  },
  galeafawn: {
    name: "岚叶灵鹿",
    type: "grass",
    baseHp: 38,
    baseAttack: 11,
    baseDefense: 12,
    baseSpeed: 12,
    baseExp: 68,
    skills: ["vine_whip", "absorb"],
    description: "蒙德草原中极少现身的灵鹿，会借风势播散治愈花粉。",
  },
  sporemarch: {
    name: "雾孢行者",
    type: "grass",
    baseHp: 36,
    baseAttack: 9,
    baseDefense: 12,
    baseSpeed: 11,
    baseExp: 65,
    skills: ["absorb", "stun_spore"],
    description: "背负孢团缓慢游走，战斗时会以孢雾扰乱对手节奏。",
  },
  windthorn: {
    name: "风棘隼",
    type: "grass",
    baseHp: 34,
    baseAttack: 13,
    baseDefense: 9,
    baseSpeed: 15,
    baseExp: 70,
    skills: ["vine_whip", "sleep_powder"],
    description: "翼缘生有细棘，俯冲时会在草浪中留下切割风痕。",
  },
  vinehorn: {
    name: "藤角犀",
    type: "grass",
    baseHp: 44,
    baseAttack: 13,
    baseDefense: 14,
    baseSpeed: 7,
    baseExp: 85,
    skills: ["leech_seed", "mega_drain"],
    description: "额角缠绕古藤，常在林道边守株待敌，是耐久型稀有精灵。",
  },
  cinderpup: {
    name: "焰纹幼狼",
    type: "fire",
    baseHp: 32,
    baseAttack: 11,
    baseDefense: 8,
    baseSpeed: 10,
    baseExp: 48,
    skills: ["quick_strike", "ember_burst"],
    evolveLevel: 12,
    evolvesTo: "sunfang",
    description: "黑曜毛皮上布满熔纹，夜里会发出橙红微光，性格倔强好斗。",
  },
  sunfang: {
    name: "曜炎圣狼",
    type: "fire",
    baseHp: 46,
    baseAttack: 16,
    baseDefense: 13,
    baseSpeed: 12,
    baseExp: 180,
    skills: ["flame_dash", "lava_claw"],
    evolveLevel: 24,
    evolvesTo: "warmaul",
    description: "头顶燃冠如日轮，胸甲嵌有熔晶，奔袭时会留下灼热裂纹。",
    isApex: true,
  },
  warmaul: {
    name: "炎铠战狼",
    type: "fire",
    baseHp: 58,
    baseAttack: 21,
    baseDefense: 17,
    baseSpeed: 13,
    baseExp: 220,
    skills: ["inferno_halberd", "magma_surge"],
    description: "披挂炎铠与火焰盾的武斗者，战意越高，火势越盛。",
    isApex: true,
  },
  blazedrake: {
    name: "焚棘翼龙",
    type: "grass",
    baseHp: 52,
    baseAttack: 19,
    baseDefense: 14,
    baseSpeed: 15,
    baseExp: 215,
    skills: ["verdant_inferno", "inferno_pounce"],
    description: "翅膜交织灰烬与叶脉，能以藤火盘旋撕开战场。",
    isApex: true,
  },
  snowkit: {
    name: "霜电狐",
    type: "electric",
    baseHp: 34,
    baseAttack: 10,
    baseDefense: 9,
    baseSpeed: 13,
    baseExp: 44,
    skills: ["spark_hit", "frost_arc"],
    evolveLevel: 16,
    evolvesTo: "aurorafang",
    description: "尾毛像积雪般蓬松，放电时会留下淡蓝霜痕。",
  },
  aurorafang: {
    name: "星霜灵狐",
    type: "electric",
    baseHp: 48,
    baseAttack: 15,
    baseDefense: 12,
    baseSpeed: 18,
    baseExp: 210,
    skills: ["frost_arc", "starlight_waltz"],
    description: "九尾裹着星霜电弧，能以高速幻步扰乱敌人的节奏。",
    isApex: true,
  },
}

const speciesBattleProfiles = {
  sprigoon: {
    types: ["grass"],
    growthProfile: "balanced",
    learnset: [
      { level: 4, skillId: "vine_guard" },
      { level: 5, skillId: "thorn_whip" },
    ],
  },
  thornlynx: {
    types: ["grass", "bug"],
    growthProfile: "balanced",
    learnset: [
      { level: 10, skillId: "toxic_spores" },
      { level: 12, skillId: "solar_slice" },
      { level: 15, skillId: "celestial_bloom" },
    ],
  },
  embercub: {
    types: ["fire"],
    growthProfile: "striker",
    learnset: [
      { level: 4, skillId: "flame_focus" },
      { level: 5, skillId: "flame_dash" },
    ],
  },
  blazehound: {
    types: ["fire", "rock"],
    growthProfile: "striker",
    learnset: [
      { level: 10, skillId: "flame_focus" },
      { level: 12, skillId: "inferno_pounce" },
      { level: 15, skillId: "magma_surge" },
    ],
  },
  aquaffin: {
    types: ["water"],
    growthProfile: "balanced",
    learnset: [
      { level: 4, skillId: "aqua_shield" },
      { level: 5, skillId: "tidal_arc" },
    ],
  },
  tideshell: {
    types: ["water", "rock"],
    growthProfile: "balanced",
    learnset: [
      { level: 10, skillId: "aqua_shield" },
      { level: 12, skillId: "hydro_press" },
      { level: 15, skillId: "aurora_tide" },
    ],
  },
  beetbit: {
    types: ["bug"],
    growthProfile: "swift",
    learnset: [
      { level: 5, skillId: "toxic_spores" },
      { level: 7, skillId: "swarm_drive" },
    ],
  },
  mosscarab: {
    types: ["bug", "rock"],
    growthProfile: "swift",
    learnset: [
      { level: 10, skillId: "vine_guard" },
      { level: 12, skillId: "swarm_drive" },
      { level: 14, skillId: "relic_roar" },
    ],
  },
  voltkit: {
    types: ["electric"],
    growthProfile: "swift",
    learnset: [
      { level: 6, skillId: "mind_shock" },
      { level: 8, skillId: "volt_lance" },
      { level: 11, skillId: "thunder_current" },
    ],
  },
  stonehorn: {
    types: ["rock", "normal"],
    growthProfile: "tank",
    learnset: [{ level: 9, skillId: "shell_breaker" }],
  },
  drillmole: {
    types: ["rock"],
    growthProfile: "striker",
    learnset: [{ level: 7, skillId: "horn_rush" }],
  },
  quakeburrow: {
    types: ["rock", "electric"],
    growthProfile: "striker",
    learnset: [{ level: 14, skillId: "relic_roar" }],
  },
  rivulet: {
    types: ["water"],
    growthProfile: "swift",
    learnset: [{ level: 7, skillId: "tidal_arc" }],
  },
  torrentail: {
    types: ["water", "electric"],
    growthProfile: "swift",
    learnset: [{ level: 14, skillId: "aurora_tide" }],
  },
  reedimp: {
    types: ["grass", "bug"],
    growthProfile: "balanced",
    learnset: [{ level: 7, skillId: "spore_dust" }],
  },
  bloomantis: {
    types: ["grass", "bug"],
    growthProfile: "balanced",
    learnset: [{ level: 14, skillId: "celestial_bloom" }],
  },
  flarehawk: {
    types: ["fire", "normal"],
    growthProfile: "swift",
    learnset: [{ level: 12, skillId: "inferno_pounce" }],
  },
  glintfin: {
    types: ["water", "electric"],
    growthProfile: "striker",
    learnset: [{ level: 11, skillId: "thunder_current" }],
  },
  solaraith_cub: {
    types: ["fire"],
    growthProfile: "swift",
    learnset: [
      { level: 9, skillId: "flame_dash" },
      { level: 12, skillId: "magma_surge" },
    ],
  },
  solaraith: {
    types: ["fire", "electric"],
    growthProfile: "striker",
    learnset: [{ level: 20, skillId: "magma_surge" }],
  },
  abyssalor_cub: {
    types: ["water"],
    growthProfile: "tank",
    learnset: [
      { level: 9, skillId: "aqua_lance" },
      { level: 12, skillId: "aurora_tide" },
    ],
  },
  abyssalor: {
    types: ["water", "rock"],
    growthProfile: "tank",
    learnset: [{ level: 20, skillId: "aurora_tide" }],
  },
  verdion: {
    types: ["grass", "bug"],
    growthProfile: "balanced",
    learnset: [{ level: 20, skillId: "celestial_bloom" }],
  },
  stormcrest: {
    types: ["electric", "flying"],
    growthProfile: "swift",
    learnset: [
      { level: 20, skillId: "thunder_current" },
      { level: 24, skillId: "mind_shock" },
    ],
  },
  frostplume: {
    types: ["ice", "flying"],
    growthProfile: "swift",
    learnset: [
      { level: 20, skillId: "frost_peck" },
      { level: 24, skillId: "blizzard_burst" },
    ],
  },
  pixibud: {
    types: ["fairy"],
    growthProfile: "swift",
    learnset: [
      { level: 5, skillId: "moon_barrier" },
      { level: 7, skillId: "prism_lance" },
    ],
  },
  aurorabbit: {
    types: ["fairy", "electric"],
    growthProfile: "swift",
    learnset: [
      { level: 12, skillId: "mind_shock" },
      { level: 14, skillId: "starlight_waltz" },
    ],
  },
  coralyn: {
    types: ["water", "fairy"],
    growthProfile: "balanced",
    learnset: [
      { level: 7, skillId: "moon_barrier" },
      { level: 9, skillId: "prism_lance" },
    ],
  },
  tidecelest: {
    types: ["water", "fairy"],
    growthProfile: "balanced",
    learnset: [{ level: 15, skillId: "starlight_waltz" }],
  },
  embermuse: {
    types: ["fire", "fairy"],
    growthProfile: "striker",
    learnset: [
      { level: 10, skillId: "flame_focus" },
      { level: 12, skillId: "prism_lance" },
    ],
  },
  mossfawn: {
    types: ["grass", "fairy"],
    growthProfile: "balanced",
    learnset: [{ level: 8, skillId: "fairy_pulse" }],
  },
  florastag: {
    types: ["grass", "fairy"],
    growthProfile: "balanced",
    learnset: [{ level: 16, skillId: "starlight_waltz" }],
  },
  shardillo: {
    types: ["rock", "fairy"],
    growthProfile: "tank",
    learnset: [{ level: 13, skillId: "prism_lance" }],
  },
  zephyrimp: {
    types: ["electric", "fairy"],
    growthProfile: "swift",
    learnset: [{ level: 11, skillId: "mind_shock" }],
  },
  mistowl: {
    types: ["water", "fairy"],
    growthProfile: "swift",
    learnset: [{ level: 12, skillId: "starlight_waltz" }],
  },
  gearcub: {
    types: ["rock", "electric"],
    growthProfile: "tank",
    learnset: [{ level: 12, skillId: "horn_rush" }],
  },
  petalisk: {
    types: ["grass", "fairy"],
    growthProfile: "swift",
    learnset: [{ level: 10, skillId: "fairy_pulse" }],
  },
  galeafawn: {
    types: ["grass", "fairy"],
    growthProfile: "balanced",
    learnset: [
      { level: 9, skillId: "leech_seed" },
      { level: 11, skillId: "mega_drain" },
    ],
  },
  sporemarch: {
    types: ["grass", "bug"],
    growthProfile: "tank",
    learnset: [
      { level: 9, skillId: "stun_spore" },
      { level: 11, skillId: "mega_drain" },
    ],
  },
  windthorn: {
    types: ["grass", "flying"],
    growthProfile: "swift",
    learnset: [
      { level: 9, skillId: "sleep_powder" },
      { level: 12, skillId: "leaf_blade" },
    ],
  },
  vinehorn: {
    types: ["grass", "rock"],
    growthProfile: "tank",
    learnset: [
      { level: 10, skillId: "leech_seed" },
      { level: 13, skillId: "horn_rush" },
    ],
  },
  cinderpup: {
    types: ["fire"],
    growthProfile: "striker",
    learnset: [
      { level: 9, skillId: "ember_howl" },
      { level: 11, skillId: "lava_claw" },
    ],
  },
  sunfang: {
    types: ["fire", "rock"],
    growthProfile: "striker",
    learnset: [
      { level: 15, skillId: "lava_claw" },
      { level: 18, skillId: "magma_surge" },
      { level: 23, skillId: "inferno_halberd" },
    ],
  },
  warmaul: {
    types: ["fire", "rock"],
    growthProfile: "striker",
    learnset: [
      { level: 27, skillId: "inferno_halberd" },
      { level: 30, skillId: "ember_howl" },
    ],
  },
  blazedrake: {
    types: ["grass", "fire"],
    growthProfile: "swift",
    learnset: [
      { level: 16, skillId: "verdant_inferno" },
      { level: 20, skillId: "celestial_bloom" },
    ],
  },
  snowkit: {
    types: ["electric", "fairy"],
    growthProfile: "swift",
    learnset: [
      { level: 10, skillId: "glacial_veil" },
      { level: 13, skillId: "mind_shock" },
    ],
  },
  aurorafang: {
    types: ["electric", "fairy"],
    growthProfile: "swift",
    learnset: [
      { level: 18, skillId: "prism_lance" },
      { level: 22, skillId: "starlight_waltz" },
    ],
  },
}

const trainerData = {
  tutorial_aide: {
    name: "助教 艾可",
    intro: "艾可: 先来一场教学战吧，体验一下技能、克制和换位节奏。",
    team: [["beetbit", 3]],
  },
  ideology_hunter: {
    name: "噬星追猎者 赫恩",
    intro: "赫恩冷笑着逼近：理念之争从不是口号，今天就用你的神兽幼体证明立场。",
    mainlineFailSafe: true,
    team: [
      ["cinderpup", 6],
      ["voltkit", 6],
    ],
  },
  scout: {
    name: "蚀星先遣 洛克",
    intro: "洛克拦在草原入口，宣称“神兽线索应由蚀星组织回收”，并向你发起封锁战。",
    mainlineFailSafe: true,
    team: [
      ["beetbit", 3],
      ["sporemarch", 4],
    ],
  },
  vanguard: {
    name: "蚀星执旗 维萝",
    intro: "维萝在道馆前布下第二道封锁，试图在你挑战馆主前彻底打乱队伍节奏。",
    mainlineFailSafe: true,
    team: [
      ["windthorn", 5],
      ["vinehorn", 5],
      ["galeafawn", 5],
    ],
  },
  leader: {
    name: "馆主 阿斯特拉",
    intro: "阿斯特拉宣布草系道馆试炼开始：你将面对“控场-续航-轮换”三重压力测试。",
    mainlineFailSafe: true,
    team: [
      ["reedimp", 8],
      ["sporemarch", 9],
      ["bloomantis", 10],
    ],
  },
  gym_aide: {
    name: "试炼官 赛弥",
    intro: "赛弥抬手示意：先来一场热身试炼，熟悉道馆节奏。",
    team: [
      ["beetbit", 5],
      ["stonehorn", 5],
    ],
  },
  breeder: {
    name: "果园育成师 玛芙",
    intro: "玛芙笑着招手，想看看你是否懂得均衡配队与属性轮换。",
    team: [
      ["mossfawn", 9],
      ["pixibud", 9],
      ["reedimp", 8],
    ],
  },
  captain: {
    name: "海湾队长 赛伦",
    intro: "赛伦敲了敲船锚，邀请你进行一次高节奏的水路模拟战。",
    team: [
      ["glintfin", 11],
      ["coralyn", 11],
      ["rivulet", 10],
    ],
  },
  ace: {
    name: "高岭王牌 维迦",
    intro: "维迦在风中立定，打算用高速与抗性压制你的回合节奏。",
    team: [
      ["embermuse", 13],
      ["shardillo", 13],
      ["zephyrimp", 12],
    ],
  },
  warden: {
    name: "群岛守望者 伊诺",
    intro: "伊诺举起信标，准备以多属性联防考验你是否具备挑战遗迹深层的实力。",
    team: [
      ["aurorabbit", 15],
      ["tidecelest", 15],
      ["florastag", 15],
    ],
  },
}

const legacyMaps = {
  town: {
    name: "晨曦镇",
    tiles: [
      "################",
      "#.............>#",
      "#....####......#",
      "#....#..#......#",
      "#....####..F...#",
      "#..............#",
      "#..L...........#",
      "#..............#",
      "#......####....#",
      "#......#..#....#",
      "#......##D#....#",
      "################",
    ],
    encounters: [],
  },
  route: {
    name: "1 号道路",
    tiles: [
      "################",
      "#<......g.g....#",
      "#...gggggggg...#",
      "#...g......g...#",
      "#...g......g...#",
      "#...gggggggg...#",
      "#..............#",
      "#.....####.....#",
      "#.....#..#.....#",
      "#.....####.....#",
      "#..............#",
      "################",
    ],
    encounters: [
      { speciesId: "beetbit", minLevel: 2, maxLevel: 4, weight: 42 },
      { speciesId: "voltkit", minLevel: 3, maxLevel: 4, weight: 33 },
      { speciesId: "stonehorn", minLevel: 3, maxLevel: 5, weight: 25 },
    ],
  },
  gym: {
    name: "晨曦道馆",
    tiles: [
      "################",
      "#..............#",
      "#..####..####..#",
      "#..#........#..#",
      "#..#........#..#",
      "#..####..####..#",
      "#..............#",
      "#..............#",
      "#..............#",
      "#......v.......#",
      "#..............#",
      "################",
    ],
    encounters: [],
  },
}

const maps = {
  town: {
    name: "星辉城",
    tiles: [
      "################",
      "#..###....###H>#",
      "#..#........#..#",
      "#..#..FFFF..#..#",
      "#..#........#..#",
      "#..###....###..#",
      "#.L............#",
      "#......####....#",
      "#......#..#....#",
      "#......#..#....#",
      "#......##D#....#",
      "################",
    ],
    encounters: [],
  },
  home: {
    name: "训练家家园",
    tiles: [
      "################",
      "#......Y.......#",
      "#..............#",
      "#..............#",
      "#....C.....G...#",
      "#..............#",
      "#......F.......#",
      "#..............#",
      "#....X.....B...#",
      "#..............#",
      "#......v.......#",
      "################",
    ],
    encounters: [],
  },
  route: {
    name: "花冠大道 1 段",
    tiles: [
      "################",
      "#<..gggg..c...>#",
      "#..ggS...gg....#",
      "#..g....d..g...#",
      "#..g..##..g....#",
      "#...gg##gg...W.#",
      "#......##......#",
      "#..s....A..s...#",
      "#..gg....gg....#",
      "#..gggggggg....#",
      "#..............#",
      "################",
    ],
    encounters: [
      { speciesId: "beetbit", minLevel: 1, maxLevel: 2, weight: 24 },
      { speciesId: "voltkit", minLevel: 1, maxLevel: 3, weight: 22 },
      { speciesId: "stonehorn", minLevel: 1, maxLevel: 3, weight: 16 },
      { speciesId: "reedimp", minLevel: 2, maxLevel: 3, weight: 15 },
      { speciesId: "drillmole", minLevel: 2, maxLevel: 3, weight: 8 },
      { speciesId: "cinderpup", minLevel: 2, maxLevel: 3, weight: 15 },
    ],
    shakingEncounters: [
      { speciesId: "reedimp", minLevel: 3, maxLevel: 5, weight: 28 },
      { speciesId: "flarehawk", minLevel: 4, maxLevel: 6, weight: 22 },
      { speciesId: "drillmole", minLevel: 4, maxLevel: 6, weight: 18 },
      { speciesId: "bloomantis", minLevel: 5, maxLevel: 6, weight: 14 },
      { speciesId: "cinderpup", minLevel: 4, maxLevel: 6, weight: 18 },
    ],
    dustEncounters: [
      { speciesId: "drillmole", minLevel: 3, maxLevel: 5, weight: 56 },
      { speciesId: "stonehorn", minLevel: 4, maxLevel: 6, weight: 30 },
      { speciesId: "quakeburrow", minLevel: 6, maxLevel: 7, weight: 14 },
    ],
    zoneLoot: {
      dust: [
        { itemId: "smoke_ore", quantity: 1, weight: 50 },
        { itemId: "weapon_core", quantity: 1, weight: 30 },
        { itemId: "stardust", quantity: 1, weight: 20 },
      ],
      shaking: [
        { itemId: "oran_berry", quantity: 1, weight: 45 },
        { itemId: "void_shard", quantity: 1, weight: 25 },
        { itemId: "field_ration", quantity: 1, weight: 30 },
      ],
    },
  },
  meadow: {
    name: "蒙德草原",
    tiles: [
      "################",
      "#<..ggssgg.B.>.#",
      "#..gggggggggO..#",
      "#..g....A.g.g..#",
      "#..g..##..g.g..#",
      "#..s..##..s.g..#",
      "#..g......g.g..#",
      "#..gg..S.gg.g..#",
      "#....W....ssg..#",
      "#..gggggggggg..#",
      "#..............#",
      "################",
    ],
    encounters: [
      { speciesId: "reedimp", minLevel: 4, maxLevel: 6, weight: 24 },
      { speciesId: "beetbit", minLevel: 4, maxLevel: 5, weight: 16 },
      { speciesId: "flarehawk", minLevel: 5, maxLevel: 6, weight: 14 },
      { speciesId: "rivulet", minLevel: 4, maxLevel: 6, weight: 18 },
      { speciesId: "sporemarch", minLevel: 5, maxLevel: 6, weight: 10 },
      { speciesId: "galeafawn", minLevel: 5, maxLevel: 7, weight: 7 },
      { speciesId: "windthorn", minLevel: 5, maxLevel: 7, weight: 6 },
      { speciesId: "vinehorn", minLevel: 6, maxLevel: 7, weight: 5 },
    ],
    shakingEncounters: [
      { speciesId: "bloomantis", minLevel: 6, maxLevel: 8, weight: 20 },
      { speciesId: "flarehawk", minLevel: 6, maxLevel: 7, weight: 18 },
      { speciesId: "torrentail", minLevel: 6, maxLevel: 8, weight: 14 },
      { speciesId: "galeafawn", minLevel: 6, maxLevel: 8, weight: 12 },
      { speciesId: "windthorn", minLevel: 6, maxLevel: 8, weight: 12 },
      { speciesId: "vinehorn", minLevel: 6, maxLevel: 8, weight: 11 },
      { speciesId: "sporemarch", minLevel: 5, maxLevel: 7, weight: 13 },
    ],
    zoneLoot: {
      shaking: [
        { itemId: "oran_berry", quantity: 1, weight: 40 },
        { itemId: "sun_core", quantity: 1, weight: 25 },
        { itemId: "void_shard", quantity: 1, weight: 20 },
        { itemId: "spark_tm", quantity: 1, weight: 15 },
      ],
    },
  },
  lake: {
    name: "11 号水路",
    tiles: [
      "################",
      "#<..wwrwww.B..>#",
      "#..wwwwwwww....#",
      "#..w..r.K.w....#",
      "#..w......w....#",
      "#..wr..A..wr...#",
      "#..w......w....#",
      "#..w..r...w....#",
      "#..wwwwwwww....#",
      "#....s...S.....#",
      "#..............#",
      "################",
    ],
    encounters: [
      { speciesId: "rivulet", minLevel: 6, maxLevel: 8, weight: 36 },
      { speciesId: "aquaffin", minLevel: 5, maxLevel: 7, weight: 22 },
      { speciesId: "glintfin", minLevel: 7, maxLevel: 9, weight: 24 },
      { speciesId: "torrentail", minLevel: 8, maxLevel: 10, weight: 18 },
    ],
    waterEncounters: [
      { speciesId: "rivulet", minLevel: 6, maxLevel: 8, weight: 34 },
      { speciesId: "glintfin", minLevel: 7, maxLevel: 9, weight: 33 },
      { speciesId: "torrentail", minLevel: 8, maxLevel: 10, weight: 20 },
      { speciesId: "abyssalor", minLevel: 18, maxLevel: 18, weight: 3 },
      { speciesId: "aquaffin", minLevel: 5, maxLevel: 7, weight: 10 },
    ],
    rippleEncounters: [
      { speciesId: "glintfin", minLevel: 8, maxLevel: 10, weight: 40 },
      { speciesId: "torrentail", minLevel: 9, maxLevel: 11, weight: 33 },
      { speciesId: "abyssalor", minLevel: 18, maxLevel: 18, weight: 7 },
      { speciesId: "rivulet", minLevel: 7, maxLevel: 9, weight: 10 },
      { speciesId: "snowkit", minLevel: 8, maxLevel: 10, weight: 10 },
    ],
    shakingEncounters: [
      { speciesId: "reedimp", minLevel: 6, maxLevel: 8, weight: 48 },
      { speciesId: "bloomantis", minLevel: 8, maxLevel: 10, weight: 32 },
      { speciesId: "verdion", minLevel: 17, maxLevel: 17, weight: 4 },
      { speciesId: "beetbit", minLevel: 6, maxLevel: 7, weight: 16 },
    ],
    zoneLoot: {
      ripple: [
        { itemId: "tidal_tm", quantity: 1, weight: 18 },
        { itemId: "pearl_fragment", quantity: 1, weight: 38 },
        { itemId: "super_potion", quantity: 1, weight: 24 },
        { itemId: "sun_core", quantity: 1, weight: 20 },
      ],
      shaking: [
        { itemId: "oran_berry", quantity: 1, weight: 45 },
        { itemId: "field_ration", quantity: 1, weight: 35 },
        { itemId: "void_shard", quantity: 1, weight: 20 },
      ],
    },
  },
  orchard: {
    name: "晨露果园",
    tiles: [
      "################",
      "#<..gggg..B..>.#",
      "#..ggO..gg..g..#",
      "#..g....A...g..#",
      "#..g..##..s.g..#",
      "#..s..M...s....#",
      "#..g.....g.....#",
      "#..gg..S.gg....#",
      "#....W.....g...#",
      "#..gggggggg....#",
      "#..............#",
      "################",
    ],
    encounters: [
      { speciesId: "mossfawn", minLevel: 8, maxLevel: 10, weight: 28 },
      { speciesId: "pixibud", minLevel: 8, maxLevel: 10, weight: 26 },
      { speciesId: "reedimp", minLevel: 7, maxLevel: 9, weight: 18 },
      { speciesId: "bloomantis", minLevel: 9, maxLevel: 11, weight: 18 },
      { speciesId: "embermuse", minLevel: 9, maxLevel: 11, weight: 10 },
      { speciesId: "petalisk", minLevel: 10, maxLevel: 12, weight: 10 },
    ],
    shakingEncounters: [
      { speciesId: "aurorabbit", minLevel: 11, maxLevel: 13, weight: 24 },
      { speciesId: "florastag", minLevel: 12, maxLevel: 14, weight: 20 },
      { speciesId: "embermuse", minLevel: 11, maxLevel: 13, weight: 22 },
      { speciesId: "verdion", minLevel: 20, maxLevel: 20, weight: 4 },
      { speciesId: "mossfawn", minLevel: 9, maxLevel: 11, weight: 30 },
    ],
    zoneLoot: {
      shaking: [
        { itemId: "moon_core", quantity: 1, weight: 22 },
        { itemId: "sun_core", quantity: 1, weight: 24 },
        { itemId: "repel_orb", quantity: 1, weight: 30 },
        { itemId: "oran_berry", quantity: 1, weight: 24 },
      ],
    },
  },
  reef: {
    name: "镜潮海湾",
    tiles: [
      "################",
      "#<..wwrww.B..>.#",
      "#..wwwwKwww....#",
      "#..w..r...w..M.#",
      "#..w.....A.w...#",
      "#..wr..s..wr...#",
      "#..w......w....#",
      "#..w..r...w....#",
      "#..wwwwwwww....#",
      "#....s...S.....#",
      "#..............#",
      "################",
    ],
    encounters: [
      { speciesId: "coralyn", minLevel: 10, maxLevel: 12, weight: 30 },
      { speciesId: "rivulet", minLevel: 9, maxLevel: 11, weight: 24 },
      { speciesId: "zephyrimp", minLevel: 10, maxLevel: 12, weight: 18 },
      { speciesId: "glintfin", minLevel: 10, maxLevel: 12, weight: 18 },
      { speciesId: "pixibud", minLevel: 9, maxLevel: 11, weight: 10 },
      { speciesId: "mistowl", minLevel: 11, maxLevel: 13, weight: 12 },
    ],
    waterEncounters: [
      { speciesId: "coralyn", minLevel: 10, maxLevel: 12, weight: 32 },
      { speciesId: "tidecelest", minLevel: 12, maxLevel: 14, weight: 20 },
      { speciesId: "glintfin", minLevel: 10, maxLevel: 12, weight: 20 },
      { speciesId: "abyssalor", minLevel: 21, maxLevel: 21, weight: 5 },
      { speciesId: "rivulet", minLevel: 9, maxLevel: 11, weight: 23 },
    ],
    rippleEncounters: [
      { speciesId: "tidecelest", minLevel: 13, maxLevel: 15, weight: 27 },
      { speciesId: "coralyn", minLevel: 11, maxLevel: 13, weight: 28 },
      { speciesId: "zephyrimp", minLevel: 11, maxLevel: 13, weight: 20 },
      { speciesId: "abyssalor", minLevel: 21, maxLevel: 21, weight: 5 },
      { speciesId: "glintfin", minLevel: 10, maxLevel: 12, weight: 20 },
    ],
    zoneLoot: {
      ripple: [
        { itemId: "moon_core", quantity: 1, weight: 20 },
        { itemId: "pearl_fragment", quantity: 1, weight: 34 },
        { itemId: "tidal_tm", quantity: 1, weight: 14 },
        { itemId: "repel_orb", quantity: 1, weight: 32 },
      ],
    },
  },
  cave: {
    name: "电气石洞穴",
    tiles: [
      "################",
      "#<..ddd..T.B>..#",
      "#..d....##..d..#",
      "#..d.W..##..d..#",
      "#..dddd....d...#",
      "#..d..A....d...#",
      "#..d....##..d..#",
      "#..d....##..d..#",
      "#..ddd..S..dd..#",
      "#..............#",
      "#..............#",
      "################",
    ],
    encounters: [
      { speciesId: "drillmole", minLevel: 7, maxLevel: 9, weight: 30 },
      { speciesId: "stonehorn", minLevel: 7, maxLevel: 9, weight: 20 },
      { speciesId: "voltkit", minLevel: 7, maxLevel: 9, weight: 18 },
      { speciesId: "quakeburrow", minLevel: 9, maxLevel: 11, weight: 14 },
      { speciesId: "flarehawk", minLevel: 8, maxLevel: 10, weight: 8 },
      { speciesId: "sunfang", minLevel: 10, maxLevel: 12, weight: 10 },
    ],
    dustEncounters: [
      { speciesId: "drillmole", minLevel: 8, maxLevel: 10, weight: 28 },
      { speciesId: "quakeburrow", minLevel: 10, maxLevel: 12, weight: 23 },
      { speciesId: "stonehorn", minLevel: 9, maxLevel: 11, weight: 20 },
      { speciesId: "solaraith", minLevel: 19, maxLevel: 19, weight: 6 },
      { speciesId: "voltkit", minLevel: 8, maxLevel: 10, weight: 15 },
      { speciesId: "sunfang", minLevel: 11, maxLevel: 13, weight: 8 },
    ],
    zoneLoot: {
      dust: [
        { itemId: "smoke_ore", quantity: 1, weight: 38 },
        { itemId: "weapon_core", quantity: 1, weight: 30 },
        { itemId: "hyper_potion", quantity: 1, weight: 18 },
        { itemId: "ancient_fossil", quantity: 1, weight: 14 },
      ],
    },
  },
  deep_cave: {
    name: "深层断崖",
    tiles: [
      "################",
      "#<..ddd....d..>#",
      "#..d..##..d....#",
      "#..d..##..d..T.#",
      "#..dddd....dd..#",
      "#..d..A....d...#",
      "#..d....##..d..#",
      "#..d....##..d..#",
      "#..ddd..W..dd..#",
      "#....S...P.....#",
      "#..............#",
      "################",
    ],
    encounters: [
      { speciesId: "quakeburrow", minLevel: 10, maxLevel: 12, weight: 30 },
      { speciesId: "glintfin", minLevel: 10, maxLevel: 12, weight: 12 },
      { speciesId: "flarehawk", minLevel: 10, maxLevel: 12, weight: 16 },
      { speciesId: "stonehorn", minLevel: 9, maxLevel: 11, weight: 16 },
      { speciesId: "drillmole", minLevel: 9, maxLevel: 11, weight: 10 },
      { speciesId: "blazedrake", minLevel: 12, maxLevel: 14, weight: 16 },
    ],
    dustEncounters: [
      { speciesId: "quakeburrow", minLevel: 11, maxLevel: 13, weight: 34 },
      { speciesId: "stonehorn", minLevel: 10, maxLevel: 12, weight: 20 },
      { speciesId: "solaraith", minLevel: 20, maxLevel: 20, weight: 10 },
      { speciesId: "abyssalor", minLevel: 20, maxLevel: 20, weight: 8 },
      { speciesId: "verdion", minLevel: 20, maxLevel: 20, weight: 8 },
      { speciesId: "drillmole", minLevel: 10, maxLevel: 12, weight: 20 },
    ],
    zoneLoot: {
      dust: [
        { itemId: "weapon_core", quantity: 1, weight: 30 },
        { itemId: "void_shard", quantity: 1, weight: 24 },
        { itemId: "ancient_fossil", quantity: 1, weight: 20 },
        { itemId: "stardust", quantity: 1, weight: 26 },
      ],
    },
  },
  ridge: {
    name: "流星高岭",
    tiles: [
      "################",
      "#<..ggd...B..>.#",
      "#..ddd..##..d..#",
      "#..d..P.##..d..#",
      "#..d....A...d..#",
      "#..d..M...s.d..#",
      "#..dd....dd....#",
      "#..g..S..g..W..#",
      "#..gg....gg....#",
      "#..............#",
      "#..............#",
      "################",
    ],
    encounters: [
      { speciesId: "shardillo", minLevel: 12, maxLevel: 14, weight: 20 },
      { speciesId: "embermuse", minLevel: 12, maxLevel: 14, weight: 16 },
      { speciesId: "quakeburrow", minLevel: 11, maxLevel: 13, weight: 15 },
      { speciesId: "zephyrimp", minLevel: 12, maxLevel: 14, weight: 14 },
      { speciesId: "stonehorn", minLevel: 11, maxLevel: 13, weight: 10 },
      { speciesId: "gearcub", minLevel: 13, maxLevel: 15, weight: 10 },
      { speciesId: "sunfang", minLevel: 13, maxLevel: 15, weight: 9 },
      { speciesId: "blazedrake", minLevel: 14, maxLevel: 16, weight: 6 },
    ],
    dustEncounters: [
      { speciesId: "shardillo", minLevel: 13, maxLevel: 15, weight: 30 },
      { speciesId: "quakeburrow", minLevel: 12, maxLevel: 14, weight: 24 },
      { speciesId: "solaraith", minLevel: 22, maxLevel: 22, weight: 6 },
      { speciesId: "verdion", minLevel: 22, maxLevel: 22, weight: 6 },
      { speciesId: "embermuse", minLevel: 12, maxLevel: 14, weight: 20 },
      { speciesId: "zephyrimp", minLevel: 12, maxLevel: 14, weight: 14 },
    ],
    shakingEncounters: [
      { speciesId: "florastag", minLevel: 13, maxLevel: 15, weight: 24 },
      { speciesId: "aurorabbit", minLevel: 12, maxLevel: 14, weight: 22 },
      { speciesId: "embermuse", minLevel: 12, maxLevel: 14, weight: 22 },
      { speciesId: "solaraith", minLevel: 22, maxLevel: 22, weight: 4 },
      { speciesId: "mossfawn", minLevel: 11, maxLevel: 13, weight: 28 },
    ],
    zoneLoot: {
      dust: [
        { itemId: "moon_core", quantity: 1, weight: 24 },
        { itemId: "weapon_core", quantity: 1, weight: 22 },
        { itemId: "ancient_fossil", quantity: 1, weight: 20 },
        { itemId: "repel_orb", quantity: 1, weight: 34 },
      ],
      shaking: [
        { itemId: "sun_core", quantity: 1, weight: 22 },
        { itemId: "moon_core", quantity: 1, weight: 24 },
        { itemId: "void_shard", quantity: 1, weight: 24 },
        { itemId: "oran_berry", quantity: 1, weight: 30 },
      ],
    },
  },
  islet: {
    name: "曜风群岛",
    tiles: [
      "################",
      "#<..wwr...B..>.#",
      "#..w..M..w..w..#",
      "#..w..r..w..w..#",
      "#..wwww..w..U..#",
      "#..g..A..g..S..#",
      "#..gg..s.gg..W.#",
      "#..g......g....#",
      "#..gggggggg....#",
      "#..............#",
      "#..............#",
      "################",
    ],
    encounters: [
      { speciesId: "zephyrimp", minLevel: 13, maxLevel: 15, weight: 18 },
      { speciesId: "aurorabbit", minLevel: 13, maxLevel: 15, weight: 14 },
      { speciesId: "coralyn", minLevel: 12, maxLevel: 14, weight: 15 },
      { speciesId: "embermuse", minLevel: 13, maxLevel: 15, weight: 12 },
      { speciesId: "florastag", minLevel: 14, maxLevel: 16, weight: 10 },
      { speciesId: "tidecelest", minLevel: 14, maxLevel: 16, weight: 8 },
      { speciesId: "mistowl", minLevel: 14, maxLevel: 16, weight: 8 },
      { speciesId: "petalisk", minLevel: 13, maxLevel: 15, weight: 7 },
      { speciesId: "aurorafang", minLevel: 16, maxLevel: 18, weight: 6 },
      { speciesId: "warmaul", minLevel: 20, maxLevel: 22, weight: 2 },
    ],
    waterEncounters: [
      { speciesId: "tidecelest", minLevel: 14, maxLevel: 16, weight: 28 },
      { speciesId: "coralyn", minLevel: 13, maxLevel: 15, weight: 26 },
      { speciesId: "glintfin", minLevel: 13, maxLevel: 15, weight: 20 },
      { speciesId: "abyssalor", minLevel: 22, maxLevel: 22, weight: 6 },
      { speciesId: "zephyrimp", minLevel: 13, maxLevel: 15, weight: 20 },
    ],
    rippleEncounters: [
      { speciesId: "tidecelest", minLevel: 15, maxLevel: 17, weight: 30 },
      { speciesId: "aurorabbit", minLevel: 14, maxLevel: 16, weight: 18 },
      { speciesId: "zephyrimp", minLevel: 14, maxLevel: 16, weight: 18 },
      { speciesId: "abyssalor", minLevel: 22, maxLevel: 22, weight: 7 },
      { speciesId: "coralyn", minLevel: 13, maxLevel: 15, weight: 27 },
    ],
    shakingEncounters: [
      { speciesId: "florastag", minLevel: 15, maxLevel: 17, weight: 24 },
      { speciesId: "aurorabbit", minLevel: 14, maxLevel: 16, weight: 24 },
      { speciesId: "verdion", minLevel: 22, maxLevel: 22, weight: 5 },
      { speciesId: "embermuse", minLevel: 14, maxLevel: 16, weight: 20 },
      { speciesId: "mossfawn", minLevel: 13, maxLevel: 15, weight: 27 },
    ],
    zoneLoot: {
      ripple: [
        { itemId: "moon_core", quantity: 1, weight: 24 },
        { itemId: "repel_orb", quantity: 1, weight: 28 },
        { itemId: "pearl_fragment", quantity: 1, weight: 24 },
        { itemId: "hyper_potion", quantity: 1, weight: 24 },
      ],
      shaking: [
        { itemId: "moon_core", quantity: 1, weight: 24 },
        { itemId: "sun_core", quantity: 1, weight: 24 },
        { itemId: "void_shard", quantity: 1, weight: 24 },
        { itemId: "field_ration", quantity: 1, weight: 28 },
      ],
    },
  },
  sanctum: {
    name: "天穹遗迹",
    tiles: [
      "################",
      "#<.............#",
      "#....####......#",
      "#....#..#..A...#",
      "#....#Z.#......#",
      "#....####......#",
      "#..B...S..WB...#",
      "#..............#",
      "#..B.......B...#",
      "#..............#",
      "#..............#",
      "################",
    ],
    encounters: [
      { speciesId: "runebreeze", minLevel: 30, maxLevel: 33, weight: 30 },
      { speciesId: "aegislith", minLevel: 31, maxLevel: 34, weight: 26 },
      { speciesId: "abyssiris", minLevel: 30, maxLevel: 34, weight: 24 },
      { speciesId: "thunderion", minLevel: 32, maxLevel: 35, weight: 20 },
    ],
    legendaryEncounter: {
      speciesId: "solaraith",
      level: 21,
      pool: [
        { speciesId: "solaraith", minLevel: 21, maxLevel: 21, weight: 34 },
        { speciesId: "abyssalor", minLevel: 21, maxLevel: 21, weight: 33 },
        { speciesId: "verdion", minLevel: 21, maxLevel: 21, weight: 33 },
      ],
    },
  },
  gym: {
    name: "星辉道馆",
    tiles: [
      "################",
      "#..............#",
      "#..####..####..#",
      "#..#........#..#",
      "#..#..####..#..#",
      "#......##......#",
      "#......##......#",
      "#..#........#..#",
      "#..####..####..#",
      "#......v.......#",
      "#..............#",
      "################",
    ],
    encounters: [],
  },
}

const TELEPORT_POINTS = Object.freeze([
  { id: "town", label: "星辉城", pinX: 320, pinY: 410, spawnX: 8, spawnY: 9 },
  { id: "route", label: "花冠大道", pinX: 510, pinY: 280, spawnX: 1, spawnY: 9 },
  { id: "cave", label: "幽气石洞", pinX: 680, pinY: 200, spawnX: 2, spawnY: 1 },
  { id: "lake", label: "湖区", pinX: 200, pinY: 180, spawnX: 3, spawnY: 8 },
])

const TELEPORT_POINT_BY_ID = Object.freeze(
  TELEPORT_POINTS.reduce((acc, point) => {
    if (point && point.id) {
      acc[point.id] = point
    }
    return acc
  }, {})
)

const typeNames = {
  normal: "普通",
  grass: "草",
  fire: "火",
  water: "水",
  bug: "虫",
  electric: "电",
  rock: "岩",
  fairy: "妖精",
  ice: "冰",
  flying: "飞行",
  ground: "地面",
  fighting: "格斗",
}

const moveCategoryNames = {
  physical: "物理",
  special: "特殊",
  status: "变化",
}

const typeColors = {
  normal: "#d6b77a",
  grass: "#63b36d",
  fire: "#e27b46",
  water: "#5e98d9",
  bug: "#7ba34c",
  electric: "#efc84e",
  rock: "#8e7a62",
  fairy: "#e3a8d9",
  ice: "#74c9e7",
  flying: "#9ab8ea",
  ground: "#b99168",
  fighting: "#c96d6d",
}

const typeEffectiveness = {
  fire: { grass: 2, bug: 2, water: 0.5, rock: 0.5, fairy: 1.4 },
  grass: { water: 2, rock: 2, fire: 0.5, bug: 0.5, fairy: 0.8 },
  water: { fire: 2, rock: 2, grass: 0.5, electric: 0.5, fairy: 1 },
  bug: { grass: 2, fire: 0.5, rock: 0.5, fairy: 0.7 },
  electric: { water: 2, grass: 0.5, rock: 0, fairy: 1.2 },
  rock: { fire: 2, electric: 1.5, water: 0.5, grass: 0.5, fairy: 1.2 },
  fairy: { bug: 1.6, rock: 1.25, fire: 0.5, water: 0.9, electric: 0.9 },
  ice: { grass: 2, flying: 2, ground: 2, fire: 0.5, rock: 0.5, ice: 0.5 },
  fighting: { rock: 2, ice: 2, fairy: 0.8 },
  ground: { fire: 2, electric: 2, rock: 2, grass: 0.5, flying: 0 },
  flying: { grass: 2, bug: 2, rock: 0.5, electric: 0.5 },
  normal: {},
}

const alchemyElementTypes = ["grass", "fire", "water", "bug", "electric", "rock", "fairy"]
const fusionSpecialElements = ["sun", "weapon"]
const fusionSelectableElements = [...alchemyElementTypes, ...fusionSpecialElements]
const fusionSkillByElement = {
  grass: "thorn_whip",
  fire: "flame_dash",
  water: "tidal_arc",
  bug: "spore_dust",
  electric: "static_bolt",
  rock: "horn_rush",
  fairy: "fairy_pulse",
  sun: "solar_slice",
  weapon: "shell_breaker",
}

const itemCatalog = {
  potion: {
    name: "恢复药",
    description: "恢复出战宠物 24 HP",
    price: 90,
    category: "heal",
    kind: "heal",
    heal: 24,
  },
  super_potion: {
    name: "高级恢复药",
    description: "恢复出战宠物 60 HP",
    price: 220,
    category: "heal",
    kind: "heal",
    heal: 60,
  },
  hyper_potion: {
    name: "全满恢复药",
    description: "恢复出战宠物 120 HP",
    price: 520,
    category: "heal",
    kind: "heal",
    heal: 120,
  },
  oran_berry: {
    name: "橙橙果",
    description: "恢复 16 HP，可在战斗或野外使用",
    price: 60,
    category: "berry",
    kind: "heal",
    heal: 16,
  },
  field_ration: {
    name: "便携食材包",
    description: "野外补给包，恢复 30 HP",
    price: 85,
    category: "ingredient",
    kind: "heal",
    heal: 30,
  },
  battle_tonic: {
    name: "战斗强化剂",
    description: "本场战斗中攻击力提升",
    price: 180,
    category: "battle",
    kind: "battle_buff",
    buffStat: "attack",
    buffValue: 2,
  },
  guard_tonic: {
    name: "防护强化剂",
    description: "本场战斗中防御力提升",
    price: 180,
    category: "battle",
    kind: "battle_buff",
    buffStat: "defense",
    buffValue: 2,
  },
  ball_crate: {
    name: "精灵球补给箱",
    description: "开启后获得 5 枚捕捉球",
    price: 130,
    category: "ball",
    kind: "balls",
    balls: 5,
  },
  great_ball_case: {
    name: "高级球补给箱",
    description: "开启后获得 10 枚捕捉球",
    price: 260,
    category: "ball",
    kind: "balls",
    balls: 10,
  },
  name_card: {
    name: "命名卡",
    description: "可重新设定训练家名称、称号和口头禅",
    price: 240,
    category: "utility",
    kind: "rename_profile",
  },
  spark_tm: {
    name: "招式学习器·伏特突刺",
    description: "让出战宠物学习 Volt Lance",
    price: 320,
    category: "tm",
    kind: "teach_skill",
    skillId: "volt_lance",
  },
  tidal_tm: {
    name: "招式学习器·潮旋弧",
    description: "让出战宠物学习 Tidal Arc",
    price: 320,
    category: "tm",
    kind: "teach_skill",
    skillId: "tidal_arc",
  },
  sun_core: {
    name: "太阳之核",
    description: "使用后获得 Sun +2 与 Arcane +1",
    price: 300,
    category: "evolution",
    kind: "essence",
    essence: { sun: 2, arcane: 1 },
  },
  moon_core: {
    name: "月辉之核",
    description: "使用后获得 Fairy +2 与 Arcane +1",
    price: 320,
    category: "evolution",
    kind: "essence",
    essence: { fairy: 2, arcane: 1 },
  },
  weapon_core: {
    name: "武器之核",
    description: "使用后获得 Weapon +2 与 Arcane +1",
    price: 300,
    category: "evolution",
    kind: "essence",
    essence: { weapon: 2, arcane: 1 },
  },
  void_shard: {
    name: "虚空碎片",
    description: "使用后获得 Void +1",
    price: 260,
    category: "evolution",
    kind: "essence",
    essence: { void: 1 },
  },
  smoke_ore: {
    name: "烟尘矿",
    description: "使用后获得 Rock +1 与 Normal +1",
    price: 120,
    category: "evolution",
    kind: "essence",
    essence: { rock: 1, normal: 1 },
  },
  repel_orb: {
    name: "避怪丹",
    description: "野外 80 步内不触发普通草丛/水面遭遇（特殊生态点仍会触发）",
    price: 260,
    category: "utility",
    kind: "repel",
    steps: 80,
  },
  stardust: {
    name: "星砂宝物",
    description: "可在商店出售换取金币",
    price: 0,
    category: "treasure",
    kind: "treasure",
    sellPrice: 180,
  },
  pearl_fragment: {
    name: "潮纹珍珠",
    description: "可在商店出售换取金币",
    price: 0,
    category: "treasure",
    kind: "treasure",
    sellPrice: 220,
  },
  ancient_fossil: {
    name: "古代化石",
    description: "稀有宝物，可高价出售",
    price: 0,
    category: "treasure",
    kind: "treasure",
    sellPrice: 360,
  },
  old_rod: {
    name: "旧钓竿",
    description: "关键道具，用于解锁水纹调查",
    price: 0,
    category: "key",
    kind: "key",
    unique: true,
  },
  sanctum_key: {
    name: "遗迹密钥",
    description: "关键道具，用于进入天穹遗迹",
    price: 0,
    category: "key",
    kind: "key",
    unique: true,
  },
  sanctum_survey_card: {
    name: "遗迹调查任务卡",
    description: "教授雪松发放的中期任务卡，记录卷尘/水纹/摇草三类生态调查进度。",
    price: 0,
    category: "key",
    kind: "key",
    unique: true,
  },
}

const ui = {
  canvas: document.getElementById("gameCanvas"),
  badgeCount: document.getElementById("badgeCount"),
  caughtCount: document.getElementById("caughtCount"),
  ballCount: document.getElementById("ballCount"),
  mapName: document.getElementById("mapName"),
  stepCount: document.getElementById("stepCount"),
  partySummary: document.getElementById("partySummary"),
  objectiveText: document.getElementById("objectiveText"),
  storyPortraitTag: document.getElementById("storyPortraitTag"),
  storyPortraitFrame: document.getElementById("storyPortraitFrame"),
  storyPortraitFallback: document.getElementById("storyPortraitFallback"),
  storyPortraitName: document.getElementById("storyPortraitName"),
  storyPortraitLine: document.getElementById("storyPortraitLine"),
  dialogueLog: document.getElementById("dialogueLog"),
  teamPanel: document.getElementById("teamPanel"),
  reserveCount: document.getElementById("reserveCount"),
  homeCount: document.getElementById("homeCount"),
  homePanel: document.getElementById("homePanel"),
  bagPanel: document.getElementById("bagPanel"),
  mapPanel: document.getElementById("mapPanel"),
  coinsCount: document.getElementById("coinsCount"),
  pokedexPanel: document.getElementById("pokedexPanel"),
  seenCount: document.getElementById("seenCount"),
  battleOverlay: document.getElementById("battleOverlay"),
  battleTitle: document.getElementById("battleTitle"),
  battleHint: document.getElementById("battleHint"),
  inGameHud: document.getElementById("inGameHud"),
  inGameMenuOverlay: document.getElementById("inGameMenuOverlay"),
  inGameMenuTitle: document.getElementById("inGameMenuTitle"),
  inGameMenuPath: document.getElementById("inGameMenuPath"),
  inGameMenuPrimaryTabs: document.getElementById("inGameMenuPrimaryTabs"),
  inGameMenuUtilityTabs: document.getElementById("inGameMenuUtilityTabs"),
  inGameMenuViewport: document.getElementById("inGameMenuViewport"),
  inGameMenuCloseButton: document.getElementById("inGameMenuCloseButton"),
  inGameMenuStoryFocus: document.getElementById("inGameMenuStoryFocus"),
  inGameMenuStoryPortraitTag: document.getElementById("inGameMenuStoryPortraitTag"),
  inGameMenuStoryPortraitFrame: document.getElementById("inGameMenuStoryPortraitFrame"),
  inGameMenuStoryPortraitFallback: document.getElementById("inGameMenuStoryPortraitFallback"),
  inGameMenuStoryPortraitName: document.getElementById("inGameMenuStoryPortraitName"),
  inGameMenuStoryPortraitLine: document.getElementById("inGameMenuStoryPortraitLine"),
  evolutionPortraitStatus: document.getElementById("evolutionPortraitStatus"),
  evolutionPortraitStatusText: document.getElementById("evolutionPortraitStatusText"),
  evolutionPortraitProgressFill: document.getElementById("evolutionPortraitProgressFill"),
  evolutionPortraitRefresh: document.getElementById("evolutionPortraitRefresh"),
  battleLog: document.getElementById("battleLog"),
  enemySprite: document.getElementById("enemySprite"),
  enemyName: document.getElementById("enemyName"),
  enemyLevel: document.getElementById("enemyLevel"),
  enemyType: document.getElementById("enemyType"),
  enemyHpFill: document.getElementById("enemyHpFill"),
  enemyHpText: document.getElementById("enemyHpText"),
  playerSprite: document.getElementById("playerSprite"),
  playerName: document.getElementById("playerName"),
  playerLevel: document.getElementById("playerLevel"),
  playerType: document.getElementById("playerType"),
  playerHpFill: document.getElementById("playerHpFill"),
  playerHpText: document.getElementById("playerHpText"),
  actionSkill0: document.getElementById("actionSkill0"),
  actionSkill1: document.getElementById("actionSkill1"),
  actionSkill2: document.getElementById("actionSkill2"),
  actionSkill3: document.getElementById("actionSkill3"),
  actionCapture: document.getElementById("actionCapture"),
  actionItem: document.getElementById("actionItem"),
  actionRun: document.getElementById("actionRun"),
  actionSwitch: document.getElementById("actionSwitch"),
  evolutionOverlay: document.getElementById("evolutionOverlay"),
  evolutionOverlayText: document.getElementById("evolutionOverlayText"),
  prologueCinematicOverlay: document.getElementById("prologueCinematicOverlay"),
  prologueCinematicBackdrop: document.getElementById("prologueCinematicBackdrop"),
  prologueCinematicLeft: document.getElementById("prologueCinematicLeft"),
  prologueCinematicRight: document.getElementById("prologueCinematicRight"),
  prologueCinematicSpeaker: document.getElementById("prologueCinematicSpeaker"),
  prologueCinematicLine: document.getElementById("prologueCinematicLine"),
  prologueCinematicHint: document.getElementById("prologueCinematicHint"),
  battleSwitchPanel: document.getElementById("battleSwitchPanel"),
  choiceOverlay: document.getElementById("choiceOverlay"),
  choiceTitle: document.getElementById("choiceTitle"),
  choiceOptions: document.getElementById("choiceOptions"),
  saveMenuOverlay: document.getElementById("saveMenuOverlay"),
  saveMenuContinueButton: document.getElementById("saveMenuContinueButton"),
  saveMenuNewButton: document.getElementById("saveMenuNewButton"),
  saveMenuSelectButton: document.getElementById("saveMenuSelectButton"),
  saveMenuSettingsButton: document.getElementById("saveMenuSettingsButton"),
  saveMenuHelpButton: document.getElementById("saveMenuHelpButton"),
  saveMenuSelectBackButton: document.getElementById("saveMenuSelectBackButton"),
  saveMenuSettingsBackButton: document.getElementById("saveMenuSettingsBackButton"),
  saveMenuExportButton: document.getElementById("saveMenuExportButton"),
  saveMenuImportButton: document.getElementById("saveMenuImportButton"),
  saveMenuImportInput: document.getElementById("saveMenuImportInput"),
  saveMenuSlotList: document.getElementById("saveMenuSlotList"),
  saveMenuSlotHint: document.getElementById("saveMenuSlotHint"),
  saveMenuRootActions: document.getElementById("saveMenuRootActions"),
  saveMenuSelectActions: document.getElementById("saveMenuSelectActions"),
  saveMenuSettingsActions: document.getElementById("saveMenuSettingsActions"),
  resetButton: document.getElementById("resetButton"),
  playerArtForm: document.getElementById("playerArtForm"),
  playerArtPrompt: document.getElementById("playerArtPrompt"),
  playerArtPresetButton: document.getElementById("playerArtPresetButton"),
  playerArtSuggest: document.getElementById("playerArtSuggest"),
  playerArtGenerate: document.getElementById("playerArtGenerate"),
  playerArtServiceChip: document.getElementById("playerArtServiceChip"),
  playerArtTaskStatus: document.getElementById("playerArtTaskStatus"),
  playerArtTaskLog: document.getElementById("playerArtTaskLog"),
  playerArtCapacity: document.getElementById("playerArtCapacity"),
  playerArtCollection: document.getElementById("playerArtCollection"),
  npcArtTarget: document.getElementById("npcArtTarget"),
  npcArtPrompt: document.getElementById("npcArtPrompt"),
  npcArtSuggest: document.getElementById("npcArtSuggest"),
  npcArtGenerate: document.getElementById("npcArtGenerate"),
  npcArtServiceChip: document.getElementById("npcArtServiceChip"),
  npcArtTaskStatus: document.getElementById("npcArtTaskStatus"),
  npcArtTaskLog: document.getElementById("npcArtTaskLog"),
  alchemyResourceSummary: document.getElementById("alchemyResourceSummary"),
  fusionTargetSelect: document.getElementById("fusionTargetSelect"),
  fusionPartnerSelect: document.getElementById("fusionPartnerSelect"),
  fusionActionButton: document.getElementById("fusionActionButton"),
  fusionPresetBatchButton: document.getElementById("fusionPresetBatchButton"),
  devourTargetSelect: document.getElementById("devourTargetSelect"),
  devourElementSelect: document.getElementById("devourElementSelect"),
  devourActionButton: document.getElementById("devourActionButton"),
  alchemyTaskStatus: document.getElementById("alchemyTaskStatus"),
  alchemyLog: document.getElementById("alchemyLog"),
  utilityDock: document.getElementById("utilityDock"),
  buildVersion: document.getElementById("buildVersion"),
}

const ctx = ui.canvas.getContext("2d")
const playerArtState = {
  serviceAvailable: false,
  providerReady: false,
  imageProvider: null,
  providerHint: "",
  currentTaskId: null,
  pollingTimer: null,
  prompt: "",
  taskStatus: "输入提示词后可直接生成玩家形象。",
  taskLogs: [],
}

const npcArtState = {
  serviceAvailable: false,
  providerReady: false,
  imageProvider: null,
  providerHint: "",
  currentTaskId: null,
  pollingTimer: null,
  selectedNpcId: "professor",
  prompt: "",
  autoRequestedAt: {},
  interactCooldownMs: 45000,
  taskStatus: "Select an NPC and prompt to generate portrait.",
  taskLogs: [],
}

const evolutionArtState = {
  pendingTaskIds: new Set(),
  serviceCheckedAt: 0,
  serviceAvailable: false,
}

const pokedexPortraitState = {
  pendingBySpecies: {},
  deferredQueue: [],
}

function shouldShowHomeFacilityNpcs() {
  if ((Number(state?.storyStage) || 0) >= 1) {
    return true
  }
  if (typeof getQaConfig === "function") {
    return Boolean(getQaConfig()?.showHomeFacilitiesFromStart)
  }
  return false
}

const npcDefinitions = [
  {
    id: "professor",
    map: "town",
    x: 2,
    y: 6,
    name: "教授 雪松",
    symbol: "教",
    color: "#f0c16a",
    visible: () => true,
    interact: () => interactProfessor(),
  },
  {
    id: "caretaker",
    map: "town",
    x: 11,
    y: 3,
    name: "照料员 林",
    symbol: "疗",
    color: "#7ac5da",
    visible: () => state.storyStage >= 1,
    interact: () => interactCaretaker(),
  },
  {
    id: "doctrine_envoy",
    map: "route",
    x: 4,
    y: 6,
    name: "同盟教众 辰铃",
    symbol: "盟",
    color: "#8ebfda",
    visible: () => state.storyStage >= 1 && state.storyStage <= 2 && state.flags.goldenLegendCubCaptured && !state.flags.ideologyConflictResolved,
    interact: () => interactDoctrineEnvoy(),
  },
  {
    id: "scout",
    map: "route",
    x: 7,
    y: 7,
    name: "蚀星先遣 洛克",
    symbol: "蚀",
    color: "#b66b6b",
    visible: () => state.storyStage >= 2,
    interact: () => interactScout(),
  },
  {
    id: "gym_aide",
    map: "gym",
    x: 5,
    y: 7,
    name: "试炼官 赛弥",
    symbol: "试",
    color: "#b9c37a",
    visible: () => state.storyStage >= 4 && !state.flags.gymWon,
    interact: () => interactGymAide(),
  },
  {
    id: "leader",
    map: "gym",
    x: 7,
    y: 3,
    name: "馆主 阿斯特拉",
    symbol: "馆",
    color: "#f0d36a",
    visible: () => true,
    interact: () => interactLeader(),
  },
  {
    id: "merchant",
    map: "town",
    x: 4,
    y: 6,
    name: "商店老板 罗文",
    symbol: "商",
    color: "#8abf6a",
    visible: () => state.storyStage >= 1,
    interact: () => interactMerchant(),
  },
  {
    id: "quartermaster",
    map: "town",
    x: 5,
    y: 6,
    name: "补给员 诺亚",
    symbol: "补",
    color: "#d2a86a",
    visible: () => state.storyStage >= 1,
    interact: () => interactQuartermaster(),
  },
  {
    id: "home_spring",
    map: "home",
    x: 7,
    y: 6,
    name: "恢复泉水",
    symbol: "泉",
    color: "#75c8e8",
    visible: () => shouldShowHomeFacilityNpcs(),
    interact: () => interactHomeSpring(),
  },
  {
    id: "home_storage",
    map: "home",
    x: 5,
    y: 4,
    name: "家园仓库使",
    symbol: "仓",
    color: "#b89a6a",
    visible: () => shouldShowHomeFacilityNpcs(),
    interact: () => interactHomeStorage(),
  },
  {
    id: "home_wish",
    map: "home",
    x: 7,
    y: 1,
    name: "许愿台守望者",
    symbol: "愿",
    color: "#d09ce6",
    visible: () => shouldShowHomeFacilityNpcs(),
    interact: () => interactHomeWish(),
  },
  {
    id: "home_devour",
    map: "home",
    x: 5,
    y: 8,
    name: "吞噬台管家",
    symbol: "吞",
    color: "#c57f78",
    visible: () => shouldShowHomeFacilityNpcs(),
    interact: () => interactHomeDevourAltar(),
  },
  {
    id: "home_fusion",
    map: "home",
    x: 11,
    y: 4,
    name: "融合台工匠",
    symbol: "融",
    color: "#93c777",
    visible: () => shouldShowHomeFacilityNpcs(),
    interact: () => interactHomeFusionAltar(),
  },
  {
    id: "home_supply",
    map: "home",
    x: 11,
    y: 8,
    name: "补给台管理员",
    symbol: "给",
    color: "#cfb06d",
    visible: () => shouldShowHomeFacilityNpcs(),
    interact: () => interactHomeSupply(),
  },
  {
    id: "alchemist",
    map: "meadow",
    x: 7,
    y: 3,
    name: "炼金师 芙拉",
    symbol: "炼",
    color: "#9b86d1",
    visible: () => state.storyStage >= 2,
    interact: () => interactAlchemist(),
  },
  {
    id: "vanguard",
    map: "meadow",
    x: 12,
    y: 8,
    name: "蚀星执旗 维萝",
    symbol: "蚀",
    color: "#c27777",
    visible: () => state.storyStage >= 2 && state.flags.scoutDefeated,
    interact: () => interactVanguard(),
  },
  {
    id: "ranger",
    map: "cave",
    x: 5,
    y: 5,
    name: "洞窟向导 雷奥",
    symbol: "导",
    color: "#90a0bf",
    visible: () => state.storyStage >= 3,
    interact: () => interactRanger(),
  },
  {
    id: "fisher",
    map: "lake",
    x: 8,
    y: 5,
    name: "水路调查员 柚",
    symbol: "渔",
    color: "#69a8cd",
    visible: () => state.storyStage >= 2,
    interact: () => interactFisher(),
  },
  {
    id: "breeder",
    map: "orchard",
    x: 9,
    y: 8,
    name: "果园育成师 玛芙",
    symbol: "育",
    color: "#ca9d6a",
    visible: () => state.flags.gymWon,
    interact: () => interactBreeder(),
  },
  {
    id: "captain",
    map: "reef",
    x: 9,
    y: 9,
    name: "海湾队长 赛伦",
    symbol: "舰",
    color: "#6caed8",
    visible: () => state.flags.breederDefeated,
    interact: () => interactCaptain(),
  },
  {
    id: "ace",
    map: "ridge",
    x: 11,
    y: 7,
    name: "高岭王牌 维迦",
    symbol: "冠",
    color: "#a8adc8",
    visible: () => state.flags.captainDefeated,
    interact: () => interactAce(),
  },
  {
    id: "warden",
    map: "islet",
    x: 11,
    y: 5,
    name: "群岛守望者 伊诺",
    symbol: "守",
    color: "#89bea2",
    visible: () => state.flags.aceDefeated,
    interact: () => interactWarden(),
  },
]

function getSpeakerProfile(speakerId) {
  if (speakerId === "player") {
    const playerName =
      typeof state?.playerName === "string" && state.playerName.trim()
        ? state.playerName.trim()
        : "主角训练家"
    const title =
      typeof state?.playerProfile?.title === "string" && state.playerProfile.title.trim()
        ? state.playerProfile.title.trim()
        : ""
    const displayName = title ? `${title} ${playerName}` : playerName
    const activePlayerPortraitKey = String(state?.playerPortrait?.activeKey || "").trim()
    const artKeys = []
    if (activePlayerPortraitKey) {
      artKeys.push(activePlayerPortraitKey)
    }
    artKeys.push("player")
    return {
      speakerId: "player",
      name: displayName,
      symbol: "主",
      color: "#5c86cf",
      artKeys: [...new Set(artKeys)],
      tag: "Adventure Focus",
    }
  }

  if (speakerId === "system") {
    return {
      speakerId: "system",
      name: "旅途记录",
      symbol: "录",
      color: "#8a6e5b",
      artKeys: [],
      tag: "Story Feed",
    }
  }

  const npc = npcDefinitions.find((entry) => entry.id === speakerId)
  if (npc) {
    return {
      speakerId: npc.id,
      name: npc.name,
      symbol: npc.symbol,
      color: npc.color,
      artKeys: [`npc_${npc.id}`, npc.id],
      tag: maps[npc.map]?.name || "Story Focus",
    }
  }

  return getSpeakerProfile("system")
}

function createStoryFocus({ speakerId = "system", line = "", tag = null } = {}) {
  const profile = getSpeakerProfile(speakerId)
  return {
    speakerId: profile.speakerId,
    name: profile.name,
    symbol: profile.symbol,
    color: profile.color,
    artKeys: profile.artKeys,
    tag: tag || profile.tag,
    line,
  }
}

function normalizeSpeakerLabel(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, "")
}

function inferDialogueSpeaker(message) {
  if (typeof message !== "string") {
    return null
  }

  const trimmed = message.trim()
  const normalized = normalizeSpeakerLabel(trimmed)

  for (const npc of npcDefinitions) {
    const npcName = String(npc.name || "")
    const compactNpcName = normalizeSpeakerLabel(npcName)
    if (trimmed.startsWith(`${npcName}:`) || trimmed.startsWith(`${npcName}：`)) {
      return npc.id
    }
    if (
      compactNpcName &&
      (normalized.startsWith(`${compactNpcName}:`) || normalized.startsWith(`${compactNpcName}：`))
    ) {
      return npc.id
    }
  }

  if (trimmed.startsWith("你")) {
    return "player"
  }

  return null
}

function stripSpeakerPrefix(message, speakerId) {
  if (typeof message !== "string") {
    return ""
  }

  const trimmed = message.trim()
  const profile = getSpeakerProfile(speakerId)
  const profileName = String(profile.name || "")
  const compactProfileName = normalizeSpeakerLabel(profileName)
  const colonPrefix = `${profileName}:`
  const cnColonPrefix = `${profileName}：`
  const compactColonPrefix = compactProfileName ? `${compactProfileName}:` : ""
  const compactCnColonPrefix = compactProfileName ? `${compactProfileName}：` : ""

  if (trimmed.startsWith(colonPrefix)) {
    return trimmed.slice(colonPrefix.length).trim()
  }

  if (trimmed.startsWith(cnColonPrefix)) {
    return trimmed.slice(cnColonPrefix.length).trim()
  }

  if (compactColonPrefix && trimmed.startsWith(compactColonPrefix)) {
    return trimmed.slice(compactColonPrefix.length).trim()
  }

  if (compactCnColonPrefix && trimmed.startsWith(compactCnColonPrefix)) {
    return trimmed.slice(compactCnColonPrefix.length).trim()
  }

  return message
}

function getCurrentMapFocusNpc() {
  const nearbyNpc = findNearbyNpc()
  if (nearbyNpc) {
    return nearbyNpc
  }

  const visibleNpcs = getVisibleNpcs().filter((npc) => npc.map === state.currentMap)
  return visibleNpcs[0] || null
}

function deriveDialogueFocus(message, options = {}) {
  const explicitSpeakerId = options.speakerId || null
  const inferredSpeakerId = explicitSpeakerId || inferDialogueSpeaker(message)
  const carriedSpeakerId =
    options.preserveCurrent !== false ? state.storyFocus?.speakerId || null : null
  const mapFocusSpeakerId = getCurrentMapFocusNpc()?.id || null
  const speakerId = inferredSpeakerId || carriedSpeakerId || mapFocusSpeakerId || "player"
  const line = options.line || stripSpeakerPrefix(message, inferredSpeakerId || speakerId)

  return createStoryFocus({
    speakerId,
    line,
    tag: options.tag || null,
  })
}

function normalizeLoadedStoryFocus(storedStoryFocus, lastDialogue) {
  if (storedStoryFocus?.speakerId || storedStoryFocus?.name) {
    return createStoryFocus({
      speakerId: storedStoryFocus.speakerId || "system",
      line: storedStoryFocus.line || "",
      tag: storedStoryFocus.tag || null,
    })
  }

  if (typeof lastDialogue === "string" && lastDialogue) {
    const inferredSpeakerId = inferDialogueSpeaker(lastDialogue)
    return createStoryFocus({
      speakerId: inferredSpeakerId || "system",
      line: stripSpeakerPrefix(lastDialogue, inferredSpeakerId || "system"),
    })
  }

  return createStoryFocus({
    speakerId: "professor",
    line: "你来到了星辉城。教授雪松正在研究站前等待新的训练家。",
  })
}



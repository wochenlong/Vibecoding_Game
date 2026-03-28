function bootstrap() {
  if (typeof initBalanceConfig === "function") {
    initBalanceConfig()
  }
  mountBottomZoneInStage()
  attachEvents()
  applyBuildVersionBadge()
  preloadArtAssets()
  initializeSaveSystem()
  openSaveMenu()
  hydratePlayerPortraitRuntimeAssets()
  syncUi()
  initializePlayerArtPanel()
  initializeNpcArtPanel()
  startAiServiceProbeLoop()
  requestAnimationFrame(renderWorld)
}

function applyBuildVersionBadge() {
  if (!ui.buildVersion) {
    return
  }
  const info = window.GBIT_VERSION || null
  if (!info || !info.version) {
    return
  }
  const stage = info.stage ? ` · ${String(info.stage).toUpperCase()}` : ""
  const date = info.buildDate ? ` · ${info.buildDate}` : ""
  ui.buildVersion.textContent = `v${info.version}${stage}${date}`
}

const AI_SERVICE_RECHECK_MS = 12000
const PLAYER_PORTRAIT_BASE_SLOTS = 3
const PLAYER_PORTRAIT_HISTORY_LIMIT = 12
const LOCAL_PLAYER_PORTRAIT_FALLBACK_KEYS = Object.freeze({
  male: ["player", "player_653f3455", "player_9dc5d6c1", "player_53ddf5e8"],
  female: ["player_9dc5d6c1", "player_53ddf5e8", "player_653f3455", "player"],
  unknown: ["player", "player_9dc5d6c1", "player_653f3455", "player_53ddf5e8"],
})
let aiServiceProbeTimer = null

function mountBottomZoneInStage() {
  const stage = document.querySelector(".stage")
  const bottomZone = document.querySelector(".bottom-zone")
  if (!stage || !bottomZone) {
    return
  }
  if (bottomZone.parentElement !== stage) {
    stage.appendChild(bottomZone)
  }
}

function createInitialState() {
  const openingLine = "你来到了星辉城。教授雪松正在研究站前等待新的训练家。"

  return {
    playerName: "旅行者",
    currentMap: "town",
    scene: "overworld",
    player: {
      x: 3,
      y: 9,
      direction: "up",
      // 渲染坐标（像素），用于平滑补间；逻辑坐标 x/y 保持网格整数不变
      renderX: 3 * 56,
      renderY: 9 * 56,
      moving: false,
      inputDirection: null,
      steps: 0,
      balls: 5,
      coins: 400,
      badges: 0,
      activeIndex: 0,
      repelSteps: 0,
      party: [],
      reserve: [],
      home: [],
      inventory: {
        potion: 5,
        super_potion: 0,
        hyper_potion: 0,
        name_card: 0,
        oran_berry: 2,
        field_ration: 1,
        battle_tonic: 1,
        guard_tonic: 1,
        ball_crate: 1,
        great_ball_case: 0,
        spark_tm: 0,
        tidal_tm: 0,
        sun_core: 0,
        moon_core: 0,
        weapon_core: 0,
        void_shard: 0,
        smoke_ore: 0,
        repel_orb: 1,
        stardust: 0,
        pearl_fragment: 0,
        ancient_fossil: 0,
        old_rod: 0,
        sanctum_key: 0,
      },
      essence: {
        arcane: 2,
        void: 1,
        normal: 1,
        grass: 1,
        fire: 1,
        water: 1,
        bug: 1,
        electric: 1,
        rock: 1,
        fairy: 1,
        sun: 1,
        weapon: 1,
      },
    },
    storyStage: 0,
    playerProfile: {
      title: "见习训练家",
      motto: "",
      gender: "unknown",
      nameTagMode: "always",
      dialogueNameHighlight: true,
    },
    progress: {
      wildCaptures: 0,
      failStreak: 0,
      storedRegenTicker: 0,
      starterSpeciesId: null,
      chosenPath: "",
      chosenLegendarySpeciesId: "",
      chosenLegendaryCubSpeciesId: "",
      specialZones: {
        dust: false,
        ripple: false,
        shaking: false,
      },
      openedChests: {},
      homeWishRecords: [],
      sanctumSigils: 0,
      legendaryCleared: false,
      preGymLegendAttempts: 0,
      preGymLegendEncounterCount: 0,
      preGymLegendSeen: {},
      apexDefeated: {},
      unlockedStatues: {},
      lastStatue: null,
      lastEvolutionFeedback: null,
    },
    flags: {
      scoutDefeated: false,
      vanguardDefeated: false,
      gymPass: false,
      gymWon: false,
      breederDefeated: false,
      captainDefeated: false,
      aceDefeated: false,
      wardenDefeated: false,
      bonusBallsClaimed: false,
      guideArcaneVisited: false,
      guideSunVisited: false,
      guideWeaponVisited: false,
      sanctumOpen: false,
      legendaryEncountered: false,
      legendaryCaptured: false,
      oldRodClaimed: false,
      oldRodHintShown: false,
      firstGymRewardPending: false,
      firstGymRewardClaimed: false,
      gymAideDefeated: false,
      gymAideIntroShown: false,
      gymCounterAidClaimed: false,
      meadowIntroShown: false,
      gymIntroShown: false,
      homeSupplyClaimed: false,
      alchemyTutorialIntroShown: false,
      alchemyPracticeDone: false,
      playerPortraitPromptOffered: false,
      playerIdentityReady: false,
      onboardingHintShown: false,
      goldenPrologueCompleted: false,
      goldenPathChosen: false,
      goldenLegendCubEncountered: false,
      goldenLegendCubCaptured: false,
    },
    pokedex: {
      seen: {},
      caught: {},
      portraits: {},
      candidates: {},
    },
    dialogue: [
      "你来到了星辉城。教授雪松正在研究站前等待新的训练家。",
    ],
    storyFocus: createStoryFocus({
      speakerId: "professor",
      line: openingLine,
    }),
    playerPortrait: {
      baseSlots: PLAYER_PORTRAIT_BASE_SLOTS,
      activeKey: "player",
      activeSrc: null,
      lastPrompt: "",
      generated: [],
      favorites: [],
    },
    alchemyLog: ["Arcane workshop initialized."],
    battle: null,
    choice: null,
    vnActive: false,
  }
}

/* Legacy ComfyUI workshop hooks are intentionally disabled in favor of
   Gemini-driven portrait assets and the in-game story portrait panel.
function initializeAiPanel() {
  populateAiSpeciesOptions()

  const preferredSpeciesId =
    getActiveMonster()?.speciesId || state.progress.starterSpeciesId || aiState.selectedSpeciesId

  aiState.selectedSpeciesId = speciesData[preferredSpeciesId] ? preferredSpeciesId : "sprigoon"
  aiState.prompt = buildSuggestedMonsterPrompt(aiState.selectedSpeciesId)
  renderAiPanel()
}

function populateAiSpeciesOptions() {
  ui.aiMonsterSelect.innerHTML = Object.keys(speciesData)
    .map(
      (speciesId) =>
        `<option value="${speciesId}">${speciesData[speciesId].name} (${speciesId})</option>`
    )
    .join("")
}

function buildSuggestedMonsterPrompt(speciesId) {
  const species = speciesData[speciesId]
  if (!species) {
    return ""
  }

  const typePrompt = {
    grass: "grass elemental creature",
    fire: "fire elemental creature",
    water: "water elemental creature",
    bug: "bug creature",
    electric: "electric creature",
    rock: "rock creature",
    normal: "fantasy creature",
  }

  const primaryType = getSpeciesTypes(speciesId)[0] || "normal"

  return [
    `${species.name}, ${typePrompt[primaryType] || "fantasy creature"}`,
    species.description,
    "bright collectible creature portrait, elegant fantasy-adventure mood, French-inspired metropolis palette, single creature, centered composition, clean silhouette, expressive face, readable anatomy, premium handheld RPG key art, polished anime illustration, soft rim light, refined materials",
  ].join(", ")
}

function renderAiPanel() {
  ui.aiMonsterSelect.value = aiState.selectedSpeciesId
  ui.aiPromptInput.value = aiState.prompt
  ui.aiTaskStatus.textContent = aiState.taskStatus
  ui.aiTaskLog.innerHTML =
    aiState.taskLogs.length > 0
      ? aiState.taskLogs.map((line) => `<p>${line}</p>`).join("")
      : "<p>暂无任务日志。</p>"
  ui.aiServiceHint.textContent = aiState.serviceHint

  ui.aiGenerateButton.disabled = !aiState.serviceAvailable || Boolean(aiState.currentTaskId)
  ui.aiPromptSuggest.disabled = false

  const chip = ui.aiServiceChip
  chip.classList.remove("online", "busy", "offline")

  if (!aiState.serviceAvailable) {
    chip.classList.add("offline")
    chip.textContent = "离线"
    return
  }

  if (aiState.currentTaskId) {
    chip.classList.add("busy")
    chip.textContent = "生成中"
    return
  }

  if (aiState.comfyReachable) {
    chip.classList.add("online")
    chip.textContent = "已连接"
    return
  }

  chip.classList.add("offline")
  chip.textContent = "待启动"
}

async function probeAiService() {
  try {
    const response = await fetch(`${AI_API_BASE}/api/ai/health`, {
      cache: "no-store",
    })

    if (!response.ok) {
      throw new Error("AI service unavailable")
    }

    const payload = await response.json()
    aiState.serviceAvailable = true
    aiState.comfyReachable = Boolean(payload.comfyReachable)
    aiState.serviceHint = payload.comfyReachable
      ? "AI 服务已连接。输入自然语言后可直接为指定怪兽生成新立绘。"
      : "本地 AI 服务已启动，但 ComfyUI 还没有连通。请先启动 ComfyUI 或检查 comfyui.config.json 里的端口。"
  } catch (error) {
    aiState.serviceAvailable = false
    aiState.comfyReachable = false
    aiState.serviceHint =
      "AI 服务未启动。运行 `npm run dev` 后，可在当前页面实时调用本地 ComfyUI 生成怪兽立绘。"
  }

  renderAiPanel()
}

async function submitAiMonsterPortrait() {
  const speciesId = aiState.selectedSpeciesId
  const prompt = aiState.prompt.trim()

  if (!speciesData[speciesId]) {
    aiState.taskStatus = "请先选择一个有效的怪兽。"
    renderAiPanel()
    return
  }

  if (!prompt) {
    aiState.taskStatus = "请输入自然语言描述后再生成。"
    renderAiPanel()
    return
  }

  if (!aiState.serviceAvailable) {
    aiState.taskStatus = "AI 服务未连接，请先运行 `npm run dev`。"
    renderAiPanel()
    return
  }

  aiState.taskStatus = `正在为 ${speciesData[speciesId].name} 提交生成任务...`
  aiState.taskLogs = ["请求已发出，等待本地 AI 服务响应。"]
  renderAiPanel()

  try {
    const response = await fetch(`${AI_API_BASE}/api/ai/generate-monster`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        speciesId,
        prompt,
      }),
    })

    const payload = await response.json()

    if (!response.ok) {
      throw new Error(payload.error || "AI 任务提交失败。")
    }

    handleAiTaskPayload(payload.task)
  } catch (error) {
    aiState.taskStatus = "生成提交失败。"
    aiState.taskLogs = [error.message || "无法连接本地 AI 服务。"]
    renderAiPanel()
  }
}

function handleAiTaskPayload(task) {
  aiState.currentTaskId =
    task.status === "completed" || task.status === "failed" ? null : task.id || null
  aiState.currentTaskSpeciesId = task.speciesId || aiState.selectedSpeciesId
  aiState.taskStatus = describeAiTaskStatus(task)
  aiState.taskLogs = task.logs?.length ? task.logs : ["任务已创建。"]

  if (task.assetUrl) {
    registerRuntimeArtAsset("monsters", task.speciesId, `${task.assetUrl}?v=${task.assetVersion || Date.now()}`)
    addDialogue(`${speciesData[task.speciesId].name} 的 AI 立绘已经更新。`)
    syncUi()
  } else {
    renderAiPanel()
  }

  if (task.status === "queued" || task.status === "processing") {
    scheduleAiTaskPoll(task.id)
  } else {
    clearAiPolling()
  }
}

function describeAiTaskStatus(task) {
  if (task.cached) {
    return `${speciesData[task.speciesId].name} 命中缓存，已直接加载上一张立绘。`
  }

  if (task.status === "queued") {
    return `${speciesData[task.speciesId].name} 的立绘任务已排队。`
  }

  if (task.status === "processing") {
    return `${speciesData[task.speciesId].name} 的立绘正在生成中。`
  }

  if (task.status === "completed") {
    return `${speciesData[task.speciesId].name} 的 AI 立绘已生成完成。`
  }

  if (task.status === "failed") {
    return `${speciesData[task.speciesId].name} 的立绘生成失败。`
  }

  return "等待生成任务。"
}

function scheduleAiTaskPoll(taskId) {
  clearAiPolling()
  aiState.pollingTimer = window.setTimeout(() => {
    pollAiTask(taskId)
  }, 1400)
}

function clearAiPolling() {
  if (aiState.pollingTimer) {
    window.clearTimeout(aiState.pollingTimer)
    aiState.pollingTimer = null
  }
}

async function pollAiTask(taskId) {
  try {
    const response = await fetch(`${AI_API_BASE}/api/ai/tasks/${taskId}`, {
      cache: "no-store",
    })
    const payload = await response.json()
    if (!response.ok) {
      throw new Error(payload.error || "AI 任务查询失败。")
    }

    handleAiTaskPayload(payload.task)
  } catch (error) {
    aiState.taskStatus = "生成状态查询失败。"
    aiState.taskLogs = [error.message || "无法连接本地 AI 服务。"]
    clearAiPolling()
    renderAiPanel()
  }
}
*/

function initializePlayerArtPanel() {
  if (!ui.playerArtPrompt) {
    return
  }

  const profile = ensurePlayerPortraitProfile()
  hydratePlayerPortraitRuntimeAssets()
  playerArtState.prompt = profile.lastPrompt || buildSuggestedPlayerPrompt()
  renderPlayerArtPanel()
  probePlayerArtService()
}

function startAiServiceProbeLoop() {
  if (aiServiceProbeTimer || typeof window === "undefined") {
    return
  }
  if (!ui.playerArtPrompt && !ui.npcArtPrompt) {
    return
  }

  aiServiceProbeTimer = window.setInterval(() => {
    if (document.visibilityState === "hidden") {
      return
    }
    if (
      ui.playerArtPrompt &&
      !playerArtState.currentTaskId &&
      (!playerArtState.serviceAvailable || !playerArtState.providerReady)
    ) {
      void probePlayerArtService({ preserveTaskStatus: true })
    }
    if (
      ui.npcArtPrompt &&
      !npcArtState.currentTaskId &&
      (!npcArtState.serviceAvailable || !npcArtState.providerReady)
    ) {
      void probeNpcArtService({ preserveTaskStatus: true })
    }
  }, AI_SERVICE_RECHECK_MS)
}

function buildSuggestedPlayerPrompt() {
  return [
    "single JRPG player trainer portrait, full body front view",
    "youthful adventurer, confident friendly expression",
    "clean bright anime illustration, cel shading, clear line art",
    "travel jacket, utility satchel, practical boots",
    "blue and ivory palette, solid pure white background",
    "no transparency checkerboard, no alpha grid, no pattern background",
    "one character only, no text, no watermark",
  ].join(", ")
}

function hashPromptToken(input) {
  let hash = 2166136261
  const value = String(input || "")
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24)
  }
  return (hash >>> 0).toString(16).padStart(8, "0")
}

function buildPlayerPortraitAssetId(prompt) {
  const token = hashPromptToken(prompt)
  return `player_${token}`
}

function escapePlayerHtmlText(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

function escapePlayerHtmlAttr(value) {
  return escapePlayerHtmlText(value).replace(/"/g, "&quot;").replace(/'/g, "&#39;")
}

function normalizePlayerPortraitEntry(rawEntry = null) {
  if (!rawEntry || typeof rawEntry !== "object") {
    return null
  }
  const key = String(rawEntry.key || "").trim()
  const src = String(rawEntry.src || "").trim()
  if (!key || !src) {
    return null
  }
  return {
    key,
    src,
    prompt: String(rawEntry.prompt || "").trim(),
    createdAt: String(rawEntry.createdAt || "").trim() || new Date().toISOString(),
  }
}

function pickLocalPlayerPortraitFallbackKey() {
  const gender = state.playerProfile?.gender
  const pool =
    gender === "male"
      ? LOCAL_PLAYER_PORTRAIT_FALLBACK_KEYS.male
      : gender === "female"
        ? LOCAL_PLAYER_PORTRAIT_FALLBACK_KEYS.female
        : LOCAL_PLAYER_PORTRAIT_FALLBACK_KEYS.unknown
  const valid = pool.filter((key) => Boolean(ART_MANIFEST?.characters?.[key]))
  if (valid.length <= 0) {
    return "player"
  }
  return valid[Math.floor(Math.random() * valid.length)]
}

function applyLocalPlayerPortraitFallback(reason = "") {
  const key = pickLocalPlayerPortraitFallbackKey()
  const src = String(ART_MANIFEST?.characters?.[key] || ART_MANIFEST?.characters?.player || "").trim()
  if (!src) {
    return false
  }

  const profile = ensurePlayerPortraitProfile()
  const entry = {
    key,
    src,
    prompt: "local-fallback",
    createdAt: new Date().toISOString(),
  }
  profile.activeKey = key
  profile.activeSrc = src
  profile.generated = upsertPlayerPortraitEntry(profile.generated, entry, {
    limit: PLAYER_PORTRAIT_HISTORY_LIMIT,
  })
  registerRuntimeArtAsset("characters", key, src)
  registerRuntimeArtAsset("characters", "player", src)
  playerArtState.taskStatus = `AI 服务不可用，已自动切换本地精美立绘。${reason ? `（${reason}）` : ""}`
  playerArtState.taskLogs = ["Fallback: local portrait applied."]
  addDialogue("系统: AI 服务暂不可用，已自动启用项目内置主角立绘。")
  syncUi()
  queueSave()
  return true
}

function getPlayerPortraitMaxSlots() {
  const baseSlots = Number.isFinite(state.playerPortrait?.baseSlots)
    ? Math.max(1, Math.floor(state.playerPortrait.baseSlots))
    : PLAYER_PORTRAIT_BASE_SLOTS
  const badgeCount = Number.isFinite(state.player?.badges) ? Math.max(0, Math.floor(state.player.badges)) : 0
  return baseSlots + badgeCount
}

function ensurePlayerPortraitProfile() {
  const fallback = {
    baseSlots: PLAYER_PORTRAIT_BASE_SLOTS,
    activeKey: "player",
    activeSrc: null,
    lastPrompt: "",
    generated: [],
    favorites: [],
  }
  const raw = state.playerPortrait && typeof state.playerPortrait === "object" ? state.playerPortrait : {}
  const generated = Array.isArray(raw.generated)
    ? raw.generated.map(normalizePlayerPortraitEntry).filter(Boolean)
    : []
  const favorites = Array.isArray(raw.favorites)
    ? raw.favorites.map(normalizePlayerPortraitEntry).filter(Boolean)
    : []

  state.playerPortrait = {
    ...fallback,
    ...raw,
    baseSlots: Number.isFinite(raw.baseSlots) ? Math.max(1, Math.floor(raw.baseSlots)) : fallback.baseSlots,
    activeKey: String(raw.activeKey || fallback.activeKey).trim() || fallback.activeKey,
    activeSrc: typeof raw.activeSrc === "string" && raw.activeSrc.trim() ? raw.activeSrc.trim() : null,
    lastPrompt: String(raw.lastPrompt || "").trim(),
    generated,
    favorites,
  }

  if (!state.playerPortrait.activeSrc) {
    const currentSrc = String(ART_MANIFEST?.characters?.player || "").trim()
    if (currentSrc) {
      state.playerPortrait.activeSrc = currentSrc
      state.playerPortrait.activeKey = state.playerPortrait.activeKey || "player"
    }
  }

  if (state.playerPortrait.activeSrc) {
    state.playerPortrait.generated = upsertPlayerPortraitEntry(
      state.playerPortrait.generated,
      {
        key: state.playerPortrait.activeKey || "player",
        src: state.playerPortrait.activeSrc,
        prompt: state.playerPortrait.lastPrompt || "",
        createdAt: new Date().toISOString(),
      },
      {
        limit: PLAYER_PORTRAIT_HISTORY_LIMIT,
      }
    )
  }
  return state.playerPortrait
}

function upsertPlayerPortraitEntry(list, entry, options = {}) {
  const normalized = normalizePlayerPortraitEntry(entry)
  if (!normalized) {
    return list
  }
  const next = Array.isArray(list) ? [...list] : []
  const existingIndex = next.findIndex((item) => item.key === normalized.key)
  if (existingIndex >= 0) {
    next.splice(existingIndex, 1)
  }
  next.unshift(normalized)
  const limit =
    Number.isFinite(options.limit) && options.limit > 0 ? Math.floor(options.limit) : PLAYER_PORTRAIT_HISTORY_LIMIT
  return next.slice(0, limit)
}

function getPlayerPortraitEntryByKey(key) {
  const profile = ensurePlayerPortraitProfile()
  const normalizedKey = String(key || "").trim()
  if (!normalizedKey) {
    return null
  }
  return [...profile.generated, ...profile.favorites].find((entry) => entry.key === normalizedKey) || null
}

function isPlayerPortraitFavorited(key) {
  const profile = ensurePlayerPortraitProfile()
  return profile.favorites.some((entry) => entry.key === key)
}

function hydratePlayerPortraitRuntimeAssets() {
  const profile = ensurePlayerPortraitProfile()
  for (const entry of [...profile.generated, ...profile.favorites]) {
    registerRuntimeArtAsset("characters", entry.key, entry.src)
  }

  if (profile.activeSrc) {
    const activeKey = profile.activeKey || "player"
    registerRuntimeArtAsset("characters", activeKey, profile.activeSrc)
    registerRuntimeArtAsset("characters", "player", profile.activeSrc)
  }
}

function activatePlayerPortraitByKey(key, options = {}) {
  const entry = getPlayerPortraitEntryByKey(key)
  if (!entry) {
    return false
  }

  const profile = ensurePlayerPortraitProfile()
  profile.activeKey = entry.key
  profile.activeSrc = entry.src
  registerRuntimeArtAsset("characters", entry.key, entry.src)
  registerRuntimeArtAsset("characters", "player", entry.src)
  state.storyFocus = createStoryFocus({
    speakerId: "player",
    line: "已切换主角收藏立绘。",
    tag: "Portrait Collection",
  })
  renderStoryPortraitPanel()
  if (options.silent !== true) {
    addDialogue("主角立绘已切换为收藏版本。", {
      speakerId: "player",
      preserveCurrent: false,
      line: "已切换主角收藏立绘。",
      tag: "Portrait Collection",
    })
  }
  syncUi()
  queueSave()
  return true
}

function addPlayerPortraitToFavorites(key) {
  const entry = getPlayerPortraitEntryByKey(key)
  if (!entry) {
    return false
  }
  if (isPlayerPortraitFavorited(entry.key)) {
    return true
  }

  const profile = ensurePlayerPortraitProfile()
  const maxSlots = getPlayerPortraitMaxSlots()
  if (profile.favorites.length >= maxSlots) {
    return false
  }

  profile.favorites = upsertPlayerPortraitEntry(profile.favorites, entry, {
    limit: maxSlots,
  })
  queueSave()
  return true
}

function removePlayerPortraitFromFavorites(key) {
  const profile = ensurePlayerPortraitProfile()
  const normalizedKey = String(key || "").trim()
  if (!normalizedKey) {
    return
  }
  profile.favorites = profile.favorites.filter((entry) => entry.key !== normalizedKey)
  queueSave()
}

function buildPlayerPortraitCard(entry, options = {}) {
  const isFavorite = options.favorite === true
  const profile = ensurePlayerPortraitProfile()
  const activeClass = profile.activeKey === entry.key ? " active" : ""
  const safeKey = escapePlayerHtmlAttr(entry.key)
  const safePrompt = escapePlayerHtmlText(entry.prompt ? entry.prompt.slice(0, 40) : "无提示词记录")
  const safeSrc = escapePlayerHtmlAttr(entry.src)
  const favoriteButton = isFavorite
    ? `<button class="mini-button" data-action="player-portrait-unfavorite" data-key="${safeKey}">移出收藏</button>`
    : `<button class="mini-button" data-action="player-portrait-favorite" data-key="${entry.key}" ${
        isPlayerPortraitFavorited(entry.key) ? "disabled" : ""
      }>收藏</button>`
  const favoriteButtonSafe = favoriteButton.replace(`data-key="${entry.key}"`, `data-key="${safeKey}"`)
  return `
    <article class="player-portrait-card${activeClass}">
      <div class="player-portrait-thumb" style="background-image:url(&quot;${safeSrc}&quot;)"></div>
      <div class="player-portrait-body">
        <strong>${safeKey}</strong>
        <p>${safePrompt}</p>
        <div class="player-portrait-actions">
          <button class="mini-button" data-action="player-portrait-activate" data-key="${safeKey}">
            设为当前
          </button>
          ${favoriteButtonSafe}
        </div>
      </div>
    </article>
  `
}

function renderPlayerPortraitCollection() {
  if (!ui.playerArtCollection || !ui.playerArtCapacity) {
    return
  }
  const profile = ensurePlayerPortraitProfile()
  const maxSlots = getPlayerPortraitMaxSlots()
  profile.favorites = profile.favorites.slice(0, maxSlots)
  ui.playerArtCapacity.textContent = `${profile.favorites.length} / ${maxSlots}`

  const generatedRows =
    profile.generated.length > 0
      ? profile.generated.slice(0, PLAYER_PORTRAIT_HISTORY_LIMIT).map((entry) => buildPlayerPortraitCard(entry)).join("")
      : "<p>暂无生成记录，先生成几张主角立绘吧。</p>"
  const favoriteRows =
    profile.favorites.length > 0
      ? profile.favorites.map((entry) => buildPlayerPortraitCard(entry, { favorite: true })).join("")
      : "<p>收藏夹为空。</p>"

  ui.playerArtCollection.innerHTML = `
    <div class="player-portrait-section">
      <div class="panel-subtitle">最近生成</div>
      ${generatedRows}
    </div>
    <div class="player-portrait-section">
      <div class="panel-subtitle">收藏夹</div>
      ${favoriteRows}
    </div>
  `
}

function handlePlayerPortraitCollectionAction(action, key) {
  if (action === "player-portrait-activate") {
    if (!activatePlayerPortraitByKey(key)) {
      playerArtState.taskStatus = "切换失败：未找到该立绘。"
      renderPlayerArtPanel()
    }
    return
  }

  if (action === "player-portrait-favorite") {
    const added = addPlayerPortraitToFavorites(key)
    if (!added) {
      playerArtState.taskStatus = `收藏失败：已达到上限 ${getPlayerPortraitMaxSlots()}（当前徽章 ${state.player.badges}）。`
    } else {
      playerArtState.taskStatus = "已加入收藏。"
    }
    renderPlayerArtPanel()
    return
  }

  if (action === "player-portrait-unfavorite") {
    removePlayerPortraitFromFavorites(key)
    playerArtState.taskStatus = "已移出收藏。"
    renderPlayerArtPanel()
  }
}

function resolveImageServiceState(payload) {
  const providerReady = Boolean(payload?.imageProviderReady ?? payload?.comfyReachable)
  const imageProvider = providerReady ? String(payload?.imageProvider || "runtime").trim() : null
  const providerHint = String(payload?.providerHint || "").trim()

  return {
    providerReady,
    imageProvider,
    providerHint,
  }
}

function formatImageProviderLabel(provider) {
  if (!provider) {
    return "runtime"
  }
  if (provider === "proxy") {
    return "AISERVICEPROXY"
  }
  if (provider === "gemini-official") {
    return "Gemini Official"
  }
  return provider
}

function renderPlayerArtPanel() {
  if (!ui.playerArtTaskStatus) {
    return
  }

  ui.playerArtPrompt.value = playerArtState.prompt
  ui.playerArtTaskStatus.textContent = playerArtState.taskStatus
  ui.playerArtTaskLog.innerHTML =
    playerArtState.taskLogs.length > 0
      ? playerArtState.taskLogs.map((line) => `<p>${line}</p>`).join("")
      : "<p>暂无任务日志。</p>"

  const chip = ui.playerArtServiceChip
  chip.classList.remove("online", "busy", "offline")
  if (!playerArtState.serviceAvailable) {
    chip.classList.add("offline")
    chip.textContent = "离线"
  } else if (playerArtState.currentTaskId) {
    chip.classList.add("busy")
    chip.textContent = "生成中"
  } else if (playerArtState.providerReady) {
    chip.classList.add("online")
    chip.textContent = "已连接"
  } else {
    chip.classList.add("offline")
    chip.textContent = "缺少 Key"
  }

  const disabled =
    !playerArtState.serviceAvailable ||
    !playerArtState.providerReady ||
    Boolean(playerArtState.currentTaskId)
  ui.playerArtGenerate.disabled = disabled
  renderPlayerPortraitCollection()
}

async function probePlayerArtService(options = {}) {
  const preserveTaskStatus = Boolean(options.preserveTaskStatus)
  if (!/^https?:/i.test(window.location.protocol || "")) {
    playerArtState.serviceAvailable = false
    playerArtState.providerReady = false
    playerArtState.imageProvider = null
    playerArtState.providerHint = "请使用 `npm run dev` 启动本地服务后再生成。"
    if (!preserveTaskStatus || !playerArtState.currentTaskId) {
      playerArtState.taskStatus = "请使用 `npm run dev` 启动本地服务后再生成。"
    }
    renderPlayerArtPanel()
    return
  }

  try {
    const response = await fetch(`${AI_API_BASE}/api/ai/health`, {
      cache: "no-store",
    })
    const payload = await response.json()
    if (!response.ok) {
      throw new Error(payload.error || "AI 服务不可用。")
    }

    const serviceState = resolveImageServiceState(payload)
    playerArtState.serviceAvailable = true
    playerArtState.providerReady = serviceState.providerReady
    playerArtState.imageProvider = serviceState.imageProvider
    playerArtState.providerHint = serviceState.providerHint
    if (!preserveTaskStatus || !playerArtState.currentTaskId) {
      playerArtState.taskStatus = playerArtState.providerReady
        ? `AI 服务已连接（${formatImageProviderLabel(playerArtState.imageProvider)}）。可提交玩家形象生成任务。`
        : playerArtState.providerHint ||
          "AI 服务在线，但未检测到可用图像 provider。请配置 AISERVICEPROXY_API_KEY 或 GEMINI_API_KEY。"
    }
  } catch (error) {
    playerArtState.serviceAvailable = false
    playerArtState.providerReady = false
    playerArtState.imageProvider = null
    playerArtState.providerHint = "AI 服务未连接。请先运行 `npm run dev`。"
    if (!preserveTaskStatus || !playerArtState.currentTaskId) {
      playerArtState.taskStatus = "AI 服务未连接。请先运行 `npm run dev`。"
    }
  }

  renderPlayerArtPanel()
}

async function submitPlayerPortrait() {
  const prompt = ui.playerArtPrompt.value.trim()
  playerArtState.prompt = prompt
  const profile = ensurePlayerPortraitProfile()
  profile.lastPrompt = prompt

  if (!prompt) {
    playerArtState.taskStatus = "请输入提示词后再生成。"
    renderPlayerArtPanel()
    return
  }

  await probePlayerArtService({ preserveTaskStatus: true })

  if (!playerArtState.serviceAvailable) {
    if (applyLocalPlayerPortraitFallback("service-offline")) {
      renderPlayerArtPanel()
      return
    }
    playerArtState.taskStatus = "AI 服务未连接，请先运行 `npm run dev`。"
    renderPlayerArtPanel()
    return
  }

  if (!playerArtState.providerReady) {
    if (applyLocalPlayerPortraitFallback("provider-unavailable")) {
      renderPlayerArtPanel()
      return
    }
    playerArtState.taskStatus =
      playerArtState.providerHint ||
      "未检测到可用图像 provider。请配置 AISERVICEPROXY_API_KEY 或 GEMINI_API_KEY。"
    renderPlayerArtPanel()
    return
  }

  playerArtState.taskStatus = "正在提交玩家形象生成任务..."
  playerArtState.taskLogs = ["请求已发送，等待服务创建任务。"]
  renderPlayerArtPanel()

  try {
    const characterId = buildPlayerPortraitAssetId(prompt)
    const response = await fetch(`${AI_API_BASE}/api/ai/generate-character`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        characterId,
        prompt,
        publishRuntime: true,
      }),
    })
    const payload = await response.json()
    if (!response.ok) {
      throw new Error(payload.error || "任务提交失败。")
    }
    handlePlayerPortraitTask(payload.task)
  } catch (error) {
    if (applyLocalPlayerPortraitFallback("submit-failed")) {
      renderPlayerArtPanel()
      return
    }
    playerArtState.taskStatus = "生成提交失败。"
    playerArtState.taskLogs = [error.message || "无法连接本地 AI 服务。"]
    renderPlayerArtPanel()
  }
}

function handlePlayerPortraitTask(task) {
  playerArtState.currentTaskId =
    task.status === "completed" || task.status === "failed" ? null : task.id || null
  playerArtState.taskLogs = task.logs?.length ? task.logs : ["任务已创建。"]
  playerArtState.taskStatus = describePlayerPortraitStatus(task)

  if (task.assetUrl) {
    const runtimeSrc = `${task.assetUrl}?v=${task.assetVersion || Date.now()}`
    const sourceKey = String(task.characterId || "player").trim() || "player"
    const profile = ensurePlayerPortraitProfile()
    const entry = {
      key: sourceKey,
      src: runtimeSrc,
      prompt: String(task.prompt || playerArtState.prompt || "").trim(),
      createdAt: String(task.completedAt || new Date().toISOString()),
    }

    registerRuntimeArtAsset("characters", sourceKey, runtimeSrc)
    registerRuntimeArtAsset("characters", "player", runtimeSrc)
    profile.activeKey = sourceKey
    profile.activeSrc = runtimeSrc
    profile.generated = upsertPlayerPortraitEntry(profile.generated, entry, {
      limit: PLAYER_PORTRAIT_HISTORY_LIMIT,
    })
    if (isPlayerPortraitFavorited(sourceKey)) {
      profile.favorites = upsertPlayerPortraitEntry(profile.favorites, entry, {
        limit: getPlayerPortraitMaxSlots(),
      })
    }
    if (entry.prompt) {
      profile.lastPrompt = entry.prompt
    }

    state.storyFocus = createStoryFocus({
      speakerId: "player",
      line: "主角立绘已更新。",
      tag: "Portrait Update",
    })
    renderStoryPortraitPanel()
    addDialogue("主角立绘已更新。", {
      speakerId: "player",
      preserveCurrent: false,
      line: "主角立绘已更新。",
      tag: "Portrait Update",
    })
    syncUi()
    queueSave()
  }

  if (task.status === "queued" || task.status === "processing") {
    schedulePlayerPortraitPoll(task.id)
  } else {
    clearPlayerPortraitPolling()
  }

  renderPlayerArtPanel()
}

function describePlayerPortraitStatus(task) {
  if (task.cached) {
    return "命中缓存，已直接复用上一张玩家立绘。"
  }

  if (task.status === "queued") {
    return "玩家立绘任务已排队。"
  }

  if (task.status === "processing") {
    return "玩家立绘正在生成中。"
  }

  if (task.status === "completed") {
    return "玩家立绘已生成完成并应用。"
  }

  if (task.status === "failed") {
    return "玩家立绘生成失败。"
  }

  return "等待生成任务。"
}

function schedulePlayerPortraitPoll(taskId) {
  clearPlayerPortraitPolling()
  playerArtState.pollingTimer = window.setTimeout(() => {
    pollPlayerPortraitTask(taskId)
  }, 1400)
}

function clearPlayerPortraitPolling() {
  if (playerArtState.pollingTimer) {
    window.clearTimeout(playerArtState.pollingTimer)
    playerArtState.pollingTimer = null
  }
}

async function pollPlayerPortraitTask(taskId) {
  try {
    const response = await fetch(`${AI_API_BASE}/api/ai/tasks/${taskId}`, {
      cache: "no-store",
    })
    const payload = await response.json()
    if (!response.ok) {
      throw new Error(payload.error || "任务查询失败。")
    }

    handlePlayerPortraitTask(payload.task)
  } catch (error) {
    playerArtState.taskStatus = "状态查询失败。"
    playerArtState.taskLogs = [error.message || "无法连接本地 AI 服务。"]
    clearPlayerPortraitPolling()
    renderPlayerArtPanel()
  }
}

function initializeNpcArtPanel() {
  if (!ui.npcArtPrompt || !ui.npcArtTarget) {
    return
  }

  npcArtState.selectedNpcId = ui.npcArtTarget.value || "professor"
  npcArtState.prompt = buildSuggestedNpcPrompt(npcArtState.selectedNpcId)
  renderNpcArtPanel()
  probeNpcArtService()
}

function buildSuggestedNpcPrompt(npcId) {
  const speaker = getSpeakerProfile(npcId)
  return [
    "single anime NPC portrait, full body front view",
    `${speaker.name}, story-friendly expression`,
    "clean bright anime illustration, cel shading, readable silhouette",
    "fantasy city adventure outfit, one character only",
    "solid white background, no checkerboard, no transparency pattern",
    "no text, no watermark",
  ].join(", ")
}

function hasNpcPortraitAsset(npcId) {
  if (!npcId) {
    return false
  }
  const manifest = ART_MANIFEST.characters || {}
  return Boolean(manifest[npcId] || manifest[`npc_${npcId}`])
}

async function requestNpcPortraitOnInteract(npcId) {
  if (!npcId) {
    return
  }
  if (state.scene === "battle") {
    return
  }

  const previousNpcId = npcArtState.selectedNpcId
  npcArtState.selectedNpcId = npcId
  if (ui.npcArtTarget) {
    ui.npcArtTarget.value = npcId
  }
  if (!npcArtState.prompt || previousNpcId !== npcId) {
    npcArtState.prompt = buildSuggestedNpcPrompt(npcId)
  }

  if (hasNpcPortraitAsset(npcId)) {
    renderNpcArtPanel()
    return
  }

  if (npcArtState.currentTaskId) {
    return
  }

  const now = Date.now()
  const cooldown = Number(npcArtState.interactCooldownMs) || 45000
  const lastRequestedAt = Number(npcArtState.autoRequestedAt?.[npcId] || 0)
  if (now - lastRequestedAt < cooldown) {
    return
  }
  if (!npcArtState.autoRequestedAt || typeof npcArtState.autoRequestedAt !== "object") {
    npcArtState.autoRequestedAt = {}
  }
  npcArtState.autoRequestedAt[npcId] = now

  await probeNpcArtService({ preserveTaskStatus: true })
  if (!npcArtState.serviceAvailable || !npcArtState.providerReady) {
    return
  }

  npcArtState.taskStatus = "检测到 NPC 首次互动，正在生成剧情立绘。"
  npcArtState.taskLogs = ["已自动提交立绘任务。"]
  renderNpcArtPanel()

  try {
    const response = await fetch(`${AI_API_BASE}/api/ai/generate-character`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        characterId: npcId,
        prompt: buildSuggestedNpcPrompt(npcId),
        publishRuntime: true,
      }),
    })
    const payload = await response.json()
    if (!response.ok) {
      throw new Error(payload.error || "NPC generation request failed.")
    }
    handleNpcPortraitTask(payload.task)
  } catch (error) {
    npcArtState.taskStatus = "NPC 自动立绘提交失败。"
    npcArtState.taskLogs = [error.message || "无法连接本地 AI 服务。"]
    renderNpcArtPanel()
  }
}

function renderNpcArtPanel() {
  if (!ui.npcArtTaskStatus || !ui.npcArtPrompt || !ui.npcArtTarget) {
    return
  }

  ui.npcArtTarget.value = npcArtState.selectedNpcId
  ui.npcArtPrompt.value = npcArtState.prompt
  ui.npcArtTaskStatus.textContent = npcArtState.taskStatus
  ui.npcArtTaskLog.innerHTML =
    npcArtState.taskLogs.length > 0
      ? npcArtState.taskLogs.map((line) => `<p>${line}</p>`).join("")
      : "<p>No task logs yet.</p>"

  const chip = ui.npcArtServiceChip
  chip.classList.remove("online", "busy", "offline")
  if (!npcArtState.serviceAvailable) {
    chip.classList.add("offline")
    chip.textContent = "离线"
  } else if (npcArtState.currentTaskId) {
    chip.classList.add("busy")
    chip.textContent = "生成中"
  } else if (npcArtState.providerReady) {
    chip.classList.add("online")
    chip.textContent = "已连接"
  } else {
    chip.classList.add("offline")
    chip.textContent = "缺少 Key"
  }

  ui.npcArtGenerate.disabled =
    !npcArtState.serviceAvailable || !npcArtState.providerReady || Boolean(npcArtState.currentTaskId)
}

async function probeNpcArtService(options = {}) {
  const preserveTaskStatus = Boolean(options.preserveTaskStatus)
  if (!/^https?:/i.test(window.location.protocol || "")) {
    npcArtState.serviceAvailable = false
    npcArtState.providerReady = false
    npcArtState.imageProvider = null
    npcArtState.providerHint = "Please run npm run dev before generating NPC portraits."
    if (!preserveTaskStatus || !npcArtState.currentTaskId) {
      npcArtState.taskStatus = "Please run npm run dev before generating NPC portraits."
    }
    renderNpcArtPanel()
    return
  }

  try {
    const response = await fetch(`${AI_API_BASE}/api/ai/health`, { cache: "no-store" })
    const payload = await response.json()
    if (!response.ok) {
      throw new Error(payload.error || "AI service unavailable.")
    }
    const serviceState = resolveImageServiceState(payload)
    npcArtState.serviceAvailable = true
    npcArtState.providerReady = serviceState.providerReady
    npcArtState.imageProvider = serviceState.imageProvider
    npcArtState.providerHint = serviceState.providerHint
    if (!preserveTaskStatus || !npcArtState.currentTaskId) {
      npcArtState.taskStatus = npcArtState.providerReady
        ? `NPC portrait service is ready (${formatImageProviderLabel(npcArtState.imageProvider)}).`
        : npcArtState.providerHint ||
          "AI service is online but no image provider key is configured (AISERVICEPROXY_API_KEY or GEMINI_API_KEY)."
    }
  } catch (error) {
    npcArtState.serviceAvailable = false
    npcArtState.providerReady = false
    npcArtState.imageProvider = null
    npcArtState.providerHint = "NPC portrait service is unavailable."
    if (!preserveTaskStatus || !npcArtState.currentTaskId) {
      npcArtState.taskStatus = "NPC portrait service is unavailable."
    }
  }

  renderNpcArtPanel()
}

async function submitNpcPortrait() {
  const npcId = ui.npcArtTarget?.value || "professor"
  const prompt = (ui.npcArtPrompt?.value || "").trim()
  npcArtState.selectedNpcId = npcId
  npcArtState.prompt = prompt

  if (!prompt) {
    npcArtState.taskStatus = "Please enter a prompt first."
    renderNpcArtPanel()
    return
  }

  await probeNpcArtService({ preserveTaskStatus: true })

  if (!npcArtState.serviceAvailable) {
    npcArtState.taskStatus = "NPC portrait service is offline."
    renderNpcArtPanel()
    return
  }

  if (!npcArtState.providerReady) {
    npcArtState.taskStatus =
      npcArtState.providerHint ||
      "No image provider is ready. Set AISERVICEPROXY_API_KEY or GEMINI_API_KEY."
    renderNpcArtPanel()
    return
  }

  npcArtState.taskStatus = "Submitting NPC portrait generation task..."
  npcArtState.taskLogs = ["Request sent. Waiting for task creation."]
  renderNpcArtPanel()

  try {
    const response = await fetch(`${AI_API_BASE}/api/ai/generate-character`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        characterId: npcId,
        prompt,
        publishRuntime: true,
      }),
    })
    const payload = await response.json()
    if (!response.ok) {
      throw new Error(payload.error || "NPC generation request failed.")
    }
    handleNpcPortraitTask(payload.task)
  } catch (error) {
    npcArtState.taskStatus = "NPC portrait generation submit failed."
    npcArtState.taskLogs = [error.message || "Cannot connect to local AI service."]
    renderNpcArtPanel()
  }
}

function handleNpcPortraitTask(task) {
  npcArtState.currentTaskId =
    task.status === "completed" || task.status === "failed" ? null : task.id || null
  npcArtState.taskLogs = task.logs?.length ? task.logs : ["Task created."]
  npcArtState.taskStatus = describeNpcPortraitStatus(task)

  const targetId = task.characterId || npcArtState.selectedNpcId
  if (task.assetUrl && targetId) {
    registerRuntimeArtAsset(
      "characters",
      targetId,
      `${task.assetUrl}?v=${task.assetVersion || Date.now()}`
    )
    const speaker = getSpeakerProfile(targetId)
    const currentLine = state.storyFocus?.line || ""
    state.storyFocus = createStoryFocus({
      speakerId: targetId,
      line: currentLine || `${speaker.name} 的立绘已同步。`,
      tag: state.storyFocus?.tag || null,
    })
    renderStoryPortraitPanel()
    syncUi()
    queueSave()
  }

  if (task.status === "queued" || task.status === "processing") {
    scheduleNpcPortraitPoll(task.id)
  } else {
    clearNpcPortraitPolling()
  }

  renderNpcArtPanel()
}

function describeNpcPortraitStatus(task) {
  if (task.cached) {
    return "Cache hit. Reused existing NPC portrait."
  }
  if (task.status === "queued") {
    return "NPC portrait task queued."
  }
  if (task.status === "processing") {
    return "NPC portrait is generating."
  }
  if (task.status === "completed") {
    return "NPC portrait generated and applied."
  }
  if (task.status === "failed") {
    return "NPC portrait generation failed."
  }
  return "Waiting for NPC portrait task."
}

function scheduleNpcPortraitPoll(taskId) {
  clearNpcPortraitPolling()
  npcArtState.pollingTimer = window.setTimeout(() => {
    pollNpcPortraitTask(taskId)
  }, 1400)
}

function clearNpcPortraitPolling() {
  if (npcArtState.pollingTimer) {
    window.clearTimeout(npcArtState.pollingTimer)
    npcArtState.pollingTimer = null
  }
}

async function pollNpcPortraitTask(taskId) {
  try {
    const response = await fetch(`${AI_API_BASE}/api/ai/tasks/${taskId}`, { cache: "no-store" })
    const payload = await response.json()
    if (!response.ok) {
      throw new Error(payload.error || "Task query failed.")
    }
    handleNpcPortraitTask(payload.task)
  } catch (error) {
    npcArtState.taskStatus = "NPC portrait task polling failed."
    npcArtState.taskLogs = [error.message || "Cannot connect to local AI service."]
    clearNpcPortraitPolling()
    renderNpcArtPanel()
  }
}

function ensurePokedexPortraitStore() {
  if (!state.pokedex || typeof state.pokedex !== "object") {
    state.pokedex = {}
  }
  if (!state.pokedex.portraits || typeof state.pokedex.portraits !== "object") {
    state.pokedex.portraits = {}
  }
  if (!state.pokedex.candidates || typeof state.pokedex.candidates !== "object") {
    state.pokedex.candidates = {}
  }
  return state.pokedex
}

function buildPokedexPortraitCandidateKey(speciesId, variantIndex) {
  const safeSpecies = String(speciesId || "unknown")
    .replace(/[^a-z0-9_-]/gi, "_")
    .toLowerCase()
  const variant = Number.isFinite(variantIndex) ? Math.max(0, Math.floor(variantIndex)) + 1 : 1
  return `dex_${safeSpecies}_v${variant}`
}

function buildPokedexPortraitVariantPrompt(speciesId, variantIndex) {
  const species = speciesData[speciesId]
  if (!species) {
    return ""
  }
  const typeLabel = formatTypeLabel(getSpeciesTypes(speciesId))
  const directionPrompt =
    variantIndex === 0
      ? "dynamic heroic full-body pose, brighter key light, energetic expression"
      : "calm composed full-body pose, softer rim light, elegant neutral expression"
  return [
    `${species.name}, collectible monster portrait, single creature`,
    `${species.description}`,
    `dual-type style: ${typeLabel}`,
    directionPrompt,
    "clean anime key art, premium handheld RPG illustration",
    "solid pure white background, no checkerboard, no transparency pattern",
    "one creature only, no text, no watermark",
  ].join(", ")
}

async function probePortraitImageProvider() {
  try {
    const response = await fetch(`${AI_API_BASE}/api/ai/health`, { cache: "no-store" })
    const payload = await response.json()
    if (!response.ok) {
      return {
        ready: false,
        hint: payload.error || "AI service unavailable.",
      }
    }
    const serviceState = resolveImageServiceState(payload)
    return {
      ready: Boolean(serviceState.providerReady),
      hint: serviceState.providerHint || "",
    }
  } catch (error) {
    return {
      ready: false,
      hint: error.message || "AI service unavailable.",
    }
  }
}

function persistPokedexPortraitCandidates(speciesId) {
  const pokedex = ensurePokedexPortraitStore()
  const pending = pokedexPortraitState.pendingBySpecies[speciesId]
  if (!pending) {
    return
  }
  pokedex.candidates[speciesId] = pending.candidates.map((candidate) => ({
    key: candidate.key,
    label: candidate.label,
      prompt: candidate.prompt,
      src: candidate.src || "",
      status: candidate.status,
      taskId: candidate.taskId || null,
      selected: Boolean(pokedex.portraits[speciesId] && pokedex.portraits[speciesId] === candidate.key),
    }))
}

function cleanupFailedPokedexPortraitRequest(speciesId) {
  const pending = pokedexPortraitState.pendingBySpecies[speciesId]
  if (!pending) {
    return
  }
  if (!pending.candidates.every((candidate) => candidate.status === "failed")) {
    return
  }
  delete pokedexPortraitState.pendingBySpecies[speciesId]
  queueSave()
}

function applyLocalPokedexPortraitFallback(speciesId) {
  if (!speciesData[speciesId]) {
    return false
  }
  const localKey = String(speciesId || "").trim()
  if (!localKey || !ART_MANIFEST?.monsters?.[localKey]) {
    return false
  }
  const pokedex = ensurePokedexPortraitStore()
  pokedex.portraits[speciesId] = localKey
  pokedex.candidates[speciesId] = [
    {
      key: localKey,
      label: "本地立绘",
      prompt: "local-fallback",
      src: String(ART_MANIFEST.monsters[localKey]),
      status: "completed",
      taskId: null,
      selected: true,
    },
  ]
  delete pokedexPortraitState.pendingBySpecies[speciesId]
  queueSave()
  return true
}

function isPokedexPortraitChoiceReady(speciesId) {
  const pending = pokedexPortraitState.pendingBySpecies[speciesId]
  if (!pending) {
    return false
  }
  return pending.candidates.every((candidate) => candidate.status === "completed" && candidate.src)
}

function getPokedexPortraitJobSnapshot(speciesId) {
  if (!speciesId || !speciesData[speciesId]) {
    return null
  }
  const pokedex = ensurePokedexPortraitStore()
  const pending = pokedexPortraitState.pendingBySpecies[speciesId]
  const persistedCandidates = Array.isArray(pokedex.candidates?.[speciesId]) ? pokedex.candidates[speciesId] : []
  const candidates = pending?.candidates || persistedCandidates
  const total = candidates.length || 0
  const completed = candidates.filter((candidate) => candidate?.status === "completed" && candidate?.src).length
  const failed = candidates.filter((candidate) => candidate?.status === "failed").length
  const active = candidates.filter((candidate) => candidate?.status === "queued" || candidate?.status === "processing")
    .length
  const selectedKey = typeof pokedex.portraits?.[speciesId] === "string" ? pokedex.portraits[speciesId] : ""
  const previewKey =
    candidates.find((candidate) => candidate?.status === "completed" && candidate?.src && candidate?.key)?.key || ""

  return {
    speciesId,
    total,
    completed,
    failed,
    active,
    selectedKey,
    pending: Boolean(pending),
    finished: total > 0 && completed >= total,
    percent: total > 0 ? Math.round((completed / total) * 100) : selectedKey ? 100 : 0,
    canRetry: !selectedKey,
    previewKey,
  }
}

async function requestPokedexPortraitRegenerate(speciesId) {
  return requestFirstEncounterPokedexPortraitChoices(speciesId, { force: true })
}

function choosePokedexPortraitCandidate(speciesId, selectedKey) {
  const pokedex = ensurePokedexPortraitStore()
  const pending = pokedexPortraitState.pendingBySpecies[speciesId]
  if (!pending) {
    return
  }
  if (!pending.candidates.some((candidate) => candidate.key === selectedKey)) {
    return
  }

  pokedex.portraits[speciesId] = selectedKey
  persistPokedexPortraitCandidates(speciesId)
  delete pokedexPortraitState.pendingBySpecies[speciesId]
  addDialogue(`${speciesData[speciesId].name} 的图鉴立绘已定稿。`, {
    speakerId: "system",
    preserveCurrent: false,
  })
  syncUi()
  queueSave()
}

function openPokedexPortraitChoice(speciesId) {
  const pokedex = ensurePokedexPortraitStore()
  if (pokedex.portraits[speciesId]) {
    return false
  }
  if (state.scene === "battle" || state.choice) {
    return false
  }
  if (!isPokedexPortraitChoiceReady(speciesId)) {
    return false
  }

  const pending = pokedexPortraitState.pendingBySpecies[speciesId]
  if (!pending || pending.choiceOpened) {
    return false
  }
  pending.choiceOpened = true
  pending.deferUntil = 0

  const options = pending.candidates.map((candidate) => ({
    label: candidate.label,
    description: "选择该版本作为图鉴立绘，可在战斗/队伍/图鉴中统一显示。",
    imageSrc: candidate.src,
    buttonLabel: "设为图鉴立绘",
    onSelect: () => {
      closeChoice()
      choosePokedexPortraitCandidate(speciesId, candidate.key)
    },
  }))

  options.push({
    label: "稍后再选",
    description: "先继续当前流程，之后会再次提示选择。",
    buttonLabel: "暂不选择",
    onSelect: () => {
      const currentPending = pokedexPortraitState.pendingBySpecies[speciesId]
      if (currentPending) {
        currentPending.choiceOpened = false
        currentPending.deferUntil = Date.now() + 20000
      }
      closeChoice()
    },
  })

  openChoice(`${speciesData[speciesId].name} · 图鉴立绘二选一`, options)
  return true
}

function flushPendingPokedexPortraitChoices() {
  if (state.scene === "battle" || state.choice) {
    return
  }
  const now = Date.now()
  const readySpeciesId = Object.keys(pokedexPortraitState.pendingBySpecies).find((speciesId) =>
    isPokedexPortraitChoiceReady(speciesId) &&
    (!Number.isFinite(pokedexPortraitState.pendingBySpecies[speciesId]?.deferUntil) ||
      now >= Number(pokedexPortraitState.pendingBySpecies[speciesId].deferUntil))
  )
  if (!readySpeciesId) {
    return
  }
  openPokedexPortraitChoice(readySpeciesId)
}

function applyPokedexPortraitCandidateTask(speciesId, candidateKey, task) {
  const pending = pokedexPortraitState.pendingBySpecies[speciesId]
  if (!pending) {
    return
  }
  const candidate = pending.candidates.find((entry) => entry.key === candidateKey)
  if (!candidate) {
    return
  }
  if (!task?.assetUrl) {
    return
  }

  const runtimeSource = `${task.assetUrl}?v=${task.assetVersion || Date.now()}`
  registerRuntimeArtAsset("monsters", candidate.key, runtimeSource)
  candidate.src = runtimeSource
  candidate.status = "completed"
  candidate.taskId = null
  persistPokedexPortraitCandidates(speciesId)
  syncUi()
  queueSave()
  flushPendingPokedexPortraitChoices()
}

async function pollPokedexPortraitCandidateTask(speciesId, candidateKey, taskId) {
  try {
    for (let attempt = 0; attempt < 90; attempt += 1) {
      await sleep(1200)
      const pending = pokedexPortraitState.pendingBySpecies[speciesId]
      if (!pending) {
        return
      }
      const candidate = pending.candidates.find((entry) => entry.key === candidateKey)
      if (!candidate) {
        return
      }
      if (candidate.taskId !== taskId) {
        return
      }

      const response = await fetch(`${AI_API_BASE}/api/ai/tasks/${taskId}`, {
        cache: "no-store",
      })
      const payload = await response.json()
      if (!response.ok) {
        candidate.status = "failed"
        candidate.error = payload.error || "任务查询失败。"
        persistPokedexPortraitCandidates(speciesId)
        syncUi()
        cleanupFailedPokedexPortraitRequest(speciesId)
        return
      }

      const task = payload.task
      if (task.status === "queued" || task.status === "processing") {
        continue
      }
      if (task.status === "failed") {
        candidate.status = "failed"
        candidate.taskId = null
        candidate.error = task.error || "立绘生成失败。"
        persistPokedexPortraitCandidates(speciesId)
        syncUi()
        cleanupFailedPokedexPortraitRequest(speciesId)
        return
      }
      if (task.status === "completed" && task.assetUrl) {
        applyPokedexPortraitCandidateTask(speciesId, candidateKey, task)
        return
      }
      return
    }
  } catch (error) {
    const pending = pokedexPortraitState.pendingBySpecies[speciesId]
    if (!pending) {
      return
    }
    const candidate = pending.candidates.find((entry) => entry.key === candidateKey)
    if (!candidate) {
      return
    }
    candidate.status = "failed"
    candidate.error = error.message || "任务轮询失败。"
    persistPokedexPortraitCandidates(speciesId)
    syncUi()
    cleanupFailedPokedexPortraitRequest(speciesId)
  }
}

async function queuePokedexPortraitCandidateTask(speciesId, candidate) {
  const payload = {
    speciesId: candidate.key,
    prompt: candidate.prompt,
    options: candidate.options || {},
  }
  const response = await fetch(`${AI_API_BASE}/api/ai/generate-monster`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  })
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error || "Failed to queue pokedex portrait candidate.")
  }
  const task = data.task
  if (task.status === "completed" && task.assetUrl) {
    applyPokedexPortraitCandidateTask(speciesId, candidate.key, task)
    return
  }

  candidate.taskId = task.id
  candidate.status = task.status || "queued"
  void pollPokedexPortraitCandidateTask(speciesId, candidate.key, task.id)
}

async function requestFirstEncounterPokedexPortraitChoices(speciesId, options = {}) {
  if (!speciesData[speciesId]) {
    return {
      ok: false,
      status: "invalid-species",
      message: "无效的精灵编号。",
    }
  }
  const pokedex = ensurePokedexPortraitStore()
  const forceRegenerate = Boolean(options.force)
  if (!forceRegenerate && pokedex.portraits[speciesId]) {
    return {
      ok: false,
      status: "already-has-portrait",
      message: `${speciesData[speciesId].name} 已有图鉴立绘。`,
    }
  }
  if (pokedexPortraitState.pendingBySpecies[speciesId]) {
    return {
      ok: true,
      status: "already-pending",
      message: `${speciesData[speciesId].name} 的许愿任务已在进行中。`,
    }
  }
  if (forceRegenerate) {
    delete pokedex.portraits[speciesId]
    delete pokedex.candidates[speciesId]
  }

  const providerState = await probePortraitImageProvider()
  if (!providerState.ready) {
    const fallbackApplied = applyLocalPokedexPortraitFallback(speciesId)
    return {
      ok: fallbackApplied,
      status: fallbackApplied ? "fallback-local" : "provider-unavailable",
      message: fallbackApplied
        ? `${speciesData[speciesId].name} 已回退到项目内置立绘。`
        : providerState.hint || "立绘服务暂不可用。",
    }
  }

  const baseReference = ART_MANIFEST.monsters?.[speciesId]
  const sharedOptions = {
    imageConfig: {
      aspectRatio: "4:5",
      imageSize: "2K",
    },
    responseModalities: ["TEXT", "IMAGE"],
    ...(baseReference
      ? {
          referenceImages: [{ src: baseReference }],
        }
      : {}),
  }

  const pending = {
    speciesId,
    choiceOpened: false,
    deferUntil: 0,
    candidates: [
      {
        key: buildPokedexPortraitCandidateKey(speciesId, 0),
        label: "候选 A",
        prompt: buildPokedexPortraitVariantPrompt(speciesId, 0),
        options: sharedOptions,
        status: "queued",
        src: "",
        taskId: null,
      },
      {
        key: buildPokedexPortraitCandidateKey(speciesId, 1),
        label: "候选 B",
        prompt: buildPokedexPortraitVariantPrompt(speciesId, 1),
        options: sharedOptions,
        status: "queued",
        src: "",
        taskId: null,
      },
    ],
  }

  pokedexPortraitState.pendingBySpecies[speciesId] = pending
  persistPokedexPortraitCandidates(speciesId)

  await Promise.allSettled(
    pending.candidates.map(async (candidate) => {
      try {
        await queuePokedexPortraitCandidateTask(speciesId, candidate)
      } catch (error) {
        candidate.status = "failed"
        candidate.error = error.message || "立绘生成失败。"
      }
    })
  )
  persistPokedexPortraitCandidates(speciesId)
  cleanupFailedPokedexPortraitRequest(speciesId)
  flushPendingPokedexPortraitChoices()
  const stillPending = Boolean(pokedexPortraitState.pendingBySpecies[speciesId])
  return {
    ok: stillPending,
    status: stillPending ? "queued" : "all-failed",
    message: stillPending
      ? `${speciesData[speciesId].name} 的立绘许愿已提交。`
      : `${speciesData[speciesId].name} 的立绘任务提交失败，请稍后重试。`,
  }
}

function preloadArtAssets() {
  const categories = Object.entries(ART_MANIFEST)

  for (const [category, group] of categories) {
    if (!group || typeof group !== "object") {
      continue
    }

    for (const [key, src] of Object.entries(group)) {
      if (!src) {
        continue
      }
      loadArtImage(category, key, src)
    }
  }
}

function loadArtImage(category, key, src) {
  const candidates = buildArtSourceCandidates(src)
  const image = new Image()
  image.decoding = "async"
  const shouldUseCors =
    typeof window !== "undefined" &&
    /^https?:/i.test(window.location?.protocol || "") &&
    isCrossOriginSource(src)
  if (shouldUseCors) {
    image.crossOrigin = "anonymous"
  }

  let index = 0

  image.onload = () => {
    artState.images[`${category}:${key}`] = image
    if (category === "characters") {
      renderStoryPortraitPanel()
    }
    if (category === "monsters") {
      renderTeamPanel()
      renderHomePanel()
      renderBagPanel()
      renderPokedexPanel()
      renderBattleSwitchPanel()
    }
    if (state.battle) {
      renderBattlePanel()
    }
  }
  image.onerror = () => {
    index += 1
    if (index < candidates.length) {
      image.src = candidates[index]
      return
    }
    console.warn(`Failed to load art asset: ${category}:${key}`, candidates)
  }
  image.src = candidates[index]
}

function getArtImage(category, key) {
  return artState.images[`${category}:${key}`] || null
}

function registerRuntimeArtAsset(category, key, src) {
  if (!ART_MANIFEST[category]) {
    ART_MANIFEST[category] = {}
  }
  ART_MANIFEST[category][key] = src
  loadArtImage(category, key, src)
}

function buildArtSourceCandidates(src) {
  const normalized = String(src || "").trim()
  if (!normalized) {
    return []
  }

  const candidates = [normalized]
  const match = normalized.match(/\.[a-z0-9]+$/i)
  if (!match) {
    return candidates
  }

  const base = normalized.slice(0, -match[0].length)
  const extensionCandidates = [".png", ".jpg", ".jpeg", ".webp", ".svg"]
  for (const ext of extensionCandidates) {
    const candidate = `${base}${ext}`
    if (!candidates.includes(candidate)) {
      candidates.push(candidate)
    }
  }

  return candidates
}

function isCrossOriginSource(src) {
  try {
    const target = new URL(src, window.location.href)
    const current = new URL(window.location.href)
    return target.origin !== current.origin
  } catch (error) {
    return false
  }
}

function drawArtImage(category, keys, x, y, width, height, options = {}) {
  const lookupKeys = Array.isArray(keys) ? keys : [keys]

  for (const key of lookupKeys) {
    const image = getArtImage(category, key)
    if (!image) {
      continue
    }

    ctx.save()

    if (options.alpha != null) {
      ctx.globalAlpha = options.alpha
    }

    if (options.rounded) {
      ctx.beginPath()
      ctx.roundRect(x, y, width, height, options.rounded)
      ctx.clip()
    }

    ctx.drawImage(image, x, y, width, height)
    ctx.restore()
    return true
  }

  return false
}

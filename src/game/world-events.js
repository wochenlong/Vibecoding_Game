function attachEvents() {
  initializeInGameMenu()
  window.addEventListener("keydown", handleKeyDown)
  window.addEventListener("keyup", handleKeyUp)

  ui.actionSkill0.addEventListener("click", () =>
    handleBattleAction({ type: "skill", slot: 0 })
  )
  ui.actionSkill1.addEventListener("click", () =>
    handleBattleAction({ type: "skill", slot: 1 })
  )
  if (ui.actionSkill2) {
    ui.actionSkill2.addEventListener("click", () =>
      handleBattleAction({ type: "skill", slot: 2 })
    )
  }
  if (ui.actionSkill3) {
    ui.actionSkill3.addEventListener("click", () =>
      handleBattleAction({ type: "skill", slot: 3 })
    )
  }
  ui.actionCapture.addEventListener("click", () =>
    handleBattleAction({ type: "capture" })
  )
  if (ui.actionItem) {
    ui.actionItem.addEventListener("click", async () => {
      await handleBattleItemShortcut()
    })
  }
  ui.actionRun.addEventListener("click", () =>
    handleBattleAction({ type: "run" })
  )
  if (ui.actionSwitch) {
    ui.actionSwitch.addEventListener("click", () => {
      toggleBattleSwitchPanel()
    })
  }
  if (ui.evolutionPortraitRefresh) {
    ui.evolutionPortraitRefresh.addEventListener("click", async () => {
      const speciesId = ui.evolutionPortraitRefresh?.dataset?.speciesId || ""
      if (!speciesId || typeof handleEvolutionPortraitRefreshAction !== "function") {
        return
      }
      await handleEvolutionPortraitRefreshAction(speciesId)
    })
  }
  if (ui.battleSwitchPanel) {
    ui.battleSwitchPanel.addEventListener("click", async (event) => {
      const target = event.target.closest("[data-action]")
      if (!target) {
        return
      }

      if (target.dataset.action === "battle-switch-close") {
        toggleBattleSwitchPanel(false)
        return
      }

      if (target.dataset.action !== "battle-switch-select") {
        return
      }

      const index = Number.parseInt(target.dataset.index || "-1", 10)
      await handleBattleAction({ type: "switch", index })
    })
  }

  ui.resetButton.addEventListener("click", () => {
    const slotId =
      typeof getActiveSaveSlotId === "function" ? getActiveSaveSlotId().toUpperCase() : "当前槽位"
    const shouldReset = window.confirm(`确定要清空 ${slotId} 并重新开始吗？`)
    if (!shouldReset) {
      return
    }

    if (typeof startNewGameInSlot === "function") {
      startNewGameInSlot(getActiveSaveSlotId(), { confirmOverwrite: false })
      return
    }

    localStorage.removeItem(STORAGE_KEY)
    state = createInitialState()
    syncUi()
  })

  ui.teamPanel.addEventListener("click", async (event) => {
    const target = event.target.closest("[data-action]")
    if (!target) {
      return
    }

    const action = target.dataset.action
    if (action === "set-active") {
      const index = Number.parseInt(target.dataset.index || "-1", 10)
      await switchActiveMonster(index)
      return
    }

    if (action === "reserve-to-home") {
      const index = Number.parseInt(target.dataset.reserveIndex || "-1", 10)
      moveReserveMonsterToHome(index)
      syncUi()
      queueSave()
      return
    }

    if (action === "party-to-home") {
      const index = Number.parseInt(target.dataset.partyIndex || "-1", 10)
      movePartyMonsterToHome(index)
      syncUi()
      queueSave()
      return
    }

    if (action === "reserve-to-party") {
      const index = Number.parseInt(target.dataset.reserveIndex || "-1", 10)
      moveReserveMonsterToParty(index)
      syncUi()
      queueSave()
    }
  })

  if (ui.homePanel) {
    ui.homePanel.addEventListener("click", (event) => {
      const target = event.target.closest("[data-action]")
      if (!target) {
        return
      }
      const index = Number.parseInt(target.dataset.homeIndex || "-1", 10)
      const action = target.dataset.action
      if (action === "home-to-reserve") {
        moveHomeMonsterToReserve(index)
      } else if (action === "home-to-party") {
        moveHomeMonsterToParty(index)
      } else {
        return
      }
      syncUi()
      queueSave()
    })
  }

  ui.bagPanel.addEventListener("click", async (event) => {
    const target = event.target.closest("[data-action='use-item']")
    if (!target) {
      return
    }

    const itemId = target.dataset.itemId
    if (!itemId) {
      return
    }

    await useBagItem(itemId)
  })

  if (ui.playerArtSuggest) {
    ui.playerArtSuggest.addEventListener("click", () => {
      playerArtState.prompt = buildSuggestedPlayerPrompt()
      renderPlayerArtPanel()
    })
  }

  if (ui.playerArtPresetButton) {
    ui.playerArtPresetButton.addEventListener("click", () => {
      openSystemDefaultPlayerPortraitChoice("panel")
    })
  }

  if (ui.playerArtForm) {
    ui.playerArtForm.addEventListener("submit", async (event) => {
      event.preventDefault()
      await submitPlayerPortrait()
    })
  }

  if (ui.playerArtCollection) {
    ui.playerArtCollection.addEventListener("click", (event) => {
      const target = event.target.closest("[data-action][data-key]")
      if (!target) {
        return
      }
      const action = target.dataset.action
      const key = target.dataset.key
      if (!action || !key) {
        return
      }
      handlePlayerPortraitCollectionAction(action, key)
    })
  }

  if (ui.npcArtTarget) {
    ui.npcArtTarget.addEventListener("change", () => {
      npcArtState.selectedNpcId = ui.npcArtTarget.value || "professor"
      npcArtState.prompt = buildSuggestedNpcPrompt(npcArtState.selectedNpcId)
      renderNpcArtPanel()
    })
  }

  if (ui.npcArtSuggest) {
    ui.npcArtSuggest.addEventListener("click", () => {
      npcArtState.prompt = buildSuggestedNpcPrompt(npcArtState.selectedNpcId)
      renderNpcArtPanel()
    })
  }

  if (ui.npcArtGenerate) {
    ui.npcArtGenerate.addEventListener("click", async () => {
      await submitNpcPortrait()
    })
  }

  if (ui.fusionActionButton) {
    ui.fusionActionButton.addEventListener("click", async () => {
      await performFusionEvolution()
    })
  }

  if (ui.fusionPresetBatchButton) {
    ui.fusionPresetBatchButton.addEventListener("click", async () => {
      await queueDefaultFusionPresetBatch()
    })
  }

  if (ui.devourActionButton) {
    ui.devourActionButton.addEventListener("click", async () => {
      await performDevourEvolution()
    })
  }

  if (ui.utilityDock) {
    ui.utilityDock.addEventListener("click", (event) => {
      const target = event.target.closest(".utility-button")
      if (!target) {
        return
      }
      const panelId = target.dataset.panel
      if (!panelId) {
        return
      }
      openUtilityPanel(panelId, { toggle: true })
    })
  }

  if (ui.inGameHud) {
    ui.inGameHud.addEventListener("click", (event) => {
      const target = event.target.closest("[data-panel]")
      if (!target) {
        return
      }
      const panelId = String(target.dataset.panel || "").trim()
      if (!panelId) {
        return
      }
      openUtilityPanel(panelId, { fromInGame: true, toggle: true })
    })
  }

  const bindInGameMenuTabSwitch = (container) => {
    if (!container) {
      return
    }
    container.addEventListener("click", (event) => {
      const target = event.target.closest("[data-panel]")
      if (!target) {
        return
      }
      const panelId = String(target.dataset.panel || "").trim()
      if (!panelId) {
        return
      }
      openUtilityPanel(panelId, { fromInGame: true, toggle: true })
    })
  }
  bindInGameMenuTabSwitch(ui.inGameMenuPrimaryTabs)
  bindInGameMenuTabSwitch(ui.inGameMenuUtilityTabs)

  if (ui.inGameMenuCloseButton) {
    ui.inGameMenuCloseButton.addEventListener("click", () => {
      collapseAllUtilityPanels()
    })
  }

  if (ui.inGameMenuOverlay) {
    ui.inGameMenuOverlay.addEventListener("click", (event) => {
      if (event.target === ui.inGameMenuOverlay) {
        collapseAllUtilityPanels()
      }
    })
  }
}

function buildBattleItemChoiceDescription(item, count) {
  if (!item) {
    return "不可用"
  }
  if (item.kind === "heal") {
    const healValue = Number(item.heal) || 0
    return `回复 ${healValue} HP · 持有 ${count}`
  }
  if (item.kind === "battle_buff") {
    const statKey = item.buffStat || "attack"
    const buffValue = Number(item.buffValue) || 0
    return `本场 ${statKey} ${buffValue >= 0 ? "+" : ""}${buffValue} · 持有 ${count}`
  }
  return `${item.description || "战斗道具"} · 持有 ${count}`
}

async function handleBattleItemShortcut() {
  if (!state.battle || state.scene !== "battle" || state.battle.locked) {
    return
  }

  const stacks =
    typeof getAvailableBattleItemStacks === "function" ? getAvailableBattleItemStacks() : []
  if (!Array.isArray(stacks) || stacks.length === 0) {
    addBattleLog("当前没有可在战斗中使用的道具。")
    renderBattlePanel()
    return
  }

  if (stacks.length === 1) {
    await handleBattleAction({ type: "item", itemId: stacks[0].itemId })
    return
  }

  if (typeof openChoice !== "function") {
    await handleBattleAction({ type: "item", itemId: stacks[0].itemId })
    return
  }

  openChoice("战斗道具：选择一项", [
    ...stacks.map((entry) => ({
      label: entry.item?.name || entry.itemId,
      description: buildBattleItemChoiceDescription(entry.item, entry.count),
      buttonLabel: "立即使用",
      onSelect: () => {
        if (typeof closeChoice === "function") {
          closeChoice()
        }
        void handleBattleAction({ type: "item", itemId: entry.itemId })
      },
    })),
    {
      label: "取消",
      description: "返回战斗操作面板",
      buttonLabel: "返回",
      onSelect: () => {
        if (typeof closeChoice === "function") {
          closeChoice()
        }
      },
    },
  ])
}

const IN_GAME_MENU_PANEL_ORDER = Object.freeze([
  "bagPanelCard",
  "teamPanelCard",
  "homePanelCard",
  "alchemyPanelCard",
  "playerArtPanel",
  "pokedexPanelCard",
  "controlPanelCard",
])

const IN_GAME_SHORTCUT_PANEL_BY_KEY = Object.freeze({
  b: "bagPanelCard",
  t: "teamPanelCard",
  y: "homePanelCard",
  r: "alchemyPanelCard",
})

const IN_GAME_MENU_PANEL_TITLES = Object.freeze({
  bagPanelCard: "背包",
  teamPanelCard: "队伍",
  homePanelCard: "家园仓库",
  alchemyPanelCard: "进化工坊",
  playerArtPanel: "立绘工坊",
  pokedexPanelCard: "图鉴",
  controlPanelCard: "设置/操作",
})

const IN_GAME_MENU_PRIMARY_KEY_BY_PANEL = Object.freeze({
  bagPanelCard: "bag",
  teamPanelCard: "team",
  pokedexPanelCard: "pokedex",
  controlPanelCard: "settings",
  homePanelCard: "workshop",
  alchemyPanelCard: "workshop",
  playerArtPanel: "workshop",
})

const IN_GAME_WORKSHOP_PRIMARY_KEY = "workshop"

const IN_GAME_MENU_PRIMARY_LABELS = Object.freeze({
  bag: "背包",
  team: "队伍",
  pokedex: "图鉴",
  workshop: "工坊",
  settings: "设置",
})

const inGameMenuState = {
  mounted: false,
  open: false,
  activePanelId: "bagPanelCard",
}

function isManagedInGamePanel(panelId) {
  return IN_GAME_MENU_PANEL_ORDER.includes(panelId)
}

function initializeInGameMenu() {
  mountInGameMenuPanels()
  updateInGameMenuTabState()
}

function getInGameMenuPrimaryKey(panelId) {
  return IN_GAME_MENU_PRIMARY_KEY_BY_PANEL[panelId] || "bag"
}

function syncInGameMenuUtilityTabsVisibility() {
  if (!ui.inGameMenuUtilityTabs) {
    return
  }
  const primaryKey = getInGameMenuPrimaryKey(inGameMenuState.activePanelId)
  const showUtilityTabs = primaryKey === IN_GAME_WORKSHOP_PRIMARY_KEY
  ui.inGameMenuUtilityTabs.classList.toggle("is-hidden", !showUtilityTabs)
}

function mountInGameMenuPanels() {
  if (inGameMenuState.mounted) {
    return
  }

  const viewport = ui.inGameMenuViewport
  if (!viewport) {
    return
  }

  for (const panelId of IN_GAME_MENU_PANEL_ORDER) {
    const panel = document.getElementById(panelId)
    if (!panel) {
      continue
    }
    panel.classList.add("in-game-menu-panel", "collapsed")
    if (panel.parentElement !== viewport) {
      viewport.append(panel)
    }
  }

  const functionCard = document.getElementById("functionCard")
  if (functionCard) {
    functionCard.classList.add("function-card--migrated")
  }

  inGameMenuState.mounted = true
}

function setInGameMenuVisibility(visible) {
  if (!ui.inGameMenuOverlay) {
    return
  }

  inGameMenuState.open = Boolean(visible)
  ui.inGameMenuOverlay.classList.toggle("hidden", !inGameMenuState.open)
  ui.inGameMenuOverlay.setAttribute("aria-hidden", inGameMenuState.open ? "false" : "true")
  document.body.classList.toggle("in-game-menu-open", inGameMenuState.open)
}

function updateInGameMenuTabState() {
  const activePrimaryKey = getInGameMenuPrimaryKey(inGameMenuState.activePanelId)

  if (ui.inGameMenuPrimaryTabs) {
    ui.inGameMenuPrimaryTabs.querySelectorAll("[data-panel]").forEach((button) => {
      const buttonPrimaryKey = String(button.dataset.primaryKey || "").trim()
      const isActive = inGameMenuState.open && buttonPrimaryKey === activePrimaryKey
      button.classList.toggle("is-active", isActive)
    })
  }

  if (ui.inGameMenuUtilityTabs) {
    ui.inGameMenuUtilityTabs.querySelectorAll("[data-panel]").forEach((button) => {
      const isActive = inGameMenuState.open && button.dataset.panel === inGameMenuState.activePanelId
      button.classList.toggle("is-active", isActive)
    })
  }

  const utilityButtons = document.querySelectorAll(".utility-button")
  utilityButtons.forEach((button) => {
    const isActive = button.dataset.panel === inGameMenuState.activePanelId && inGameMenuState.open
    button.classList.toggle("active", isActive)
  })

  syncInGameMenuUtilityTabsVisibility()
}

function setInGameMenuActivePanel(panelId) {
  initializeInGameMenu()

  const normalizedPanelId = isManagedInGamePanel(panelId) ? panelId : "bagPanelCard"
  inGameMenuState.activePanelId = normalizedPanelId

  for (const id of IN_GAME_MENU_PANEL_ORDER) {
    const panel = document.getElementById(id)
    if (!panel) {
      continue
    }
    panel.classList.toggle("collapsed", id !== normalizedPanelId)
  }

  if (ui.inGameMenuTitle) {
    const title = IN_GAME_MENU_PANEL_TITLES[normalizedPanelId] || "功能面板"
    ui.inGameMenuTitle.textContent = title
  }
  if (ui.inGameMenuPath) {
    const primaryLabel = IN_GAME_MENU_PRIMARY_LABELS[getInGameMenuPrimaryKey(normalizedPanelId)] || "菜单"
    const title = IN_GAME_MENU_PANEL_TITLES[normalizedPanelId] || "功能面板"
    ui.inGameMenuPath.textContent = primaryLabel === title ? primaryLabel : `${primaryLabel} / ${title}`
  }

  if (ui.inGameMenuViewport) {
    ui.inGameMenuViewport.scrollTop = 0
  }

  updateInGameMenuTabState()
}

function toggleUtilityPanel(panelId) {
  if (!isManagedInGamePanel(panelId)) {
    return
  }

  if (inGameMenuState.open && inGameMenuState.activePanelId === panelId) {
    collapseAllUtilityPanels()
    return
  }

  openUtilityPanel(panelId, { fromInGame: true, toggle: false })
}

function setInGameFunctionCardMode(enabled) {
  if (enabled) {
    setInGameMenuActivePanel(inGameMenuState.activePanelId || "bagPanelCard")
    setInGameMenuVisibility(true)
    return
  }
  setInGameMenuVisibility(false)
  updateInGameMenuTabState()
}

function collapseAllUtilityPanels() {
  initializeInGameMenu()
  for (const panelId of IN_GAME_MENU_PANEL_ORDER) {
    const panel = document.getElementById(panelId)
    if (!panel) {
      continue
    }
    panel.classList.add("collapsed")
  }

  setInGameMenuVisibility(false)
  updateInGameMenuTabState()
}

function openUtilityPanel(panelId, options = {}) {
  if (!isManagedInGamePanel(panelId)) {
    return
  }

  const shouldToggle = options.toggle !== false
  const isSamePanelOpen = inGameMenuState.open && inGameMenuState.activePanelId === panelId
  if (shouldToggle && isSamePanelOpen) {
    collapseAllUtilityPanels()
    return
  }

  setInGameMenuActivePanel(panelId)
  setInGameMenuVisibility(true)
}

function getQaRuntimeConfig() {
  if (typeof getQaConfig === "function") {
    return getQaConfig()
  }
  return {
    enabled: false,
    quickKeysEnabled: false,
  }
}

function restoreMonsterGroupFullHp(monsterList) {
  if (!Array.isArray(monsterList)) {
    return
  }
  for (const monster of monsterList) {
    if (!monster || !Number.isFinite(monster.maxHp)) {
      continue
    }
    monster.currentHp = Math.max(1, Number(monster.maxHp) || 1)
  }
}

function applyQaEmergencyRefill() {
  state.player.balls += 20
  if (typeof addInventoryItem === "function") {
    addInventoryItem("potion", 8)
    addInventoryItem("super_potion", 4)
    addInventoryItem("battle_tonic", 2)
    addInventoryItem("guard_tonic", 2)
    addInventoryItem("repel_orb", 2)
  }
  restoreMonsterGroupFullHp(state.player.party)
  restoreMonsterGroupFullHp(state.player.reserve)
  restoreMonsterGroupFullHp(state.player.home)
  addDialogue("QA 补给已发放：精灵球+20，药品补充，并已恢复全队状态。")
  if (state.battle) {
    addBattleLog("QA 补给生效：你获得了额外补给并恢复状态。")
  }
  syncUi()
  queueSave()
}

function handleQaQuickHotkeys(event) {
  const qaConfig = getQaRuntimeConfig()
  if (!qaConfig.enabled || !qaConfig.quickKeysEnabled) {
    return false
  }

  const key = String(event.key || "").toLowerCase()
  if (key !== "f6") {
    return false
  }

  event.preventDefault()
  applyQaEmergencyRefill()
  return true
}

function handleKeyDown(event) {
  if (typeof isSaveMenuVisible === "function" && isSaveMenuVisible()) {
    event.preventDefault()
    return
  }

  if (handleQaQuickHotkeys(event)) {
    return
  }

  if (state.choice) {
    event.preventDefault()
    return
  }

  if (state.vnActive) {
    if (typeof handleVNKeyDown === "function") {
      handleVNKeyDown(event)
    }
    event.preventDefault()
    return
  }

  if (state.scene === "battle") {
    if (String(event.key || "").toLowerCase() === "i") {
      event.preventDefault()
      void handleBattleItemShortcut()
      return
    }
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(event.key)) {
      event.preventDefault()
    }
    return
  }

  const key = event.key.toLowerCase()

  const shortcutPanel = IN_GAME_SHORTCUT_PANEL_BY_KEY[key]
  if (shortcutPanel) {
    event.preventDefault()
    openUtilityPanel(shortcutPanel, { fromInGame: true, toggle: true })
    return
  }

  if (inGameMenuState.open) {
    if (key === "escape") {
      event.preventDefault()
      collapseAllUtilityPanels()
      return
    }
    event.preventDefault()
    return
  }

  if (key === "w" || event.key === "ArrowUp") {
    event.preventDefault()
    state.player.inputDirection = "up"
    state.player._dirHeld = true
    return
  }

  if (key === "s" || event.key === "ArrowDown") {
    event.preventDefault()
    state.player.inputDirection = "down"
    state.player._dirHeld = true
    return
  }

  if (key === "a" || event.key === "ArrowLeft") {
    event.preventDefault()
    state.player.inputDirection = "left"
    state.player._dirHeld = true
    return
  }

  if (key === "d" || event.key === "ArrowRight") {
    event.preventDefault()
    state.player.inputDirection = "right"
    state.player._dirHeld = true
    return
  }

  if (key === "e" || key === "enter") {
    event.preventDefault()
    interact()
    return
  }

  if (key === " " || event.code === "Space") {
    event.preventDefault()
    interact()
    return
  }

  if (key === "h") {
    event.preventDefault()
    quickReturnHome()
    return
  }

  if (key === "escape") {
    event.preventDefault()
    collapseAllUtilityPanels()
  }
}

// 方向键到 dx/dy/dir 的映射表
const DIRECTION_MAP = {
  up:    { dx: 0,  dy: -1, dir: "up" },
  down:  { dx: 0,  dy: 1,  dir: "down" },
  left:  { dx: -1, dy: 0,  dir: "left" },
  right: { dx: 1,  dy: 0,  dir: "right" },
}

// 松键清除输入方向
function handleKeyUp(event) {
  const key = event.key.toLowerCase()
  const released = {
    up:    key === "w" || event.key === "ArrowUp",
    down:  key === "s" || event.key === "ArrowDown",
    left:  key === "a" || event.key === "ArrowLeft",
    right: key === "d" || event.key === "ArrowRight",
  }
  const cur = state.player.inputDirection
  if (cur && released[cur]) {
    state.player.inputDirection = null
    state.player._dirHeld = false
  }
}

// 平滑移动速度：TILE_SIZE 像素 / 移动时间帧数
// TILE_SIZE=56，目标 150ms/格，60fps → 约 9 帧 → 每帧 ~6.2px
// 用固定像素速度而非时间插值，简单稳定
const MOVE_SPEED_PX = 4  // 56/14 ≈ 每帧 4px，约 233ms/格，接近宝可梦手感

// 每帧由 renderWorld 调用，驱动玩家平滑移动
function updatePlayerMovement() {
  const p = state.player

  // 确保渲染坐标已初始化（兼容存档加载）
  if (!Number.isFinite(p.renderX)) p.renderX = p.x * TILE_SIZE
  if (!Number.isFinite(p.renderY)) p.renderY = p.y * TILE_SIZE

  const targetX = p.x * TILE_SIZE
  const targetY = p.y * TILE_SIZE

  if (p.moving) {
    // 补间趋近目标
    const dx = targetX - p.renderX
    const dy = targetY - p.renderY
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist <= MOVE_SPEED_PX) {
      // 到位，吸附
      p.renderX = targetX
      p.renderY = targetY
      p.moving = false

      // 补间完成后只有键仍按住才继续走（单次点按只走一格）
      if (p._dirHeld && p.inputDirection && !state.vnActive && !state.choice && state.scene !== "battle") {
        const move = DIRECTION_MAP[p.inputDirection]
        if (move) {
          attemptMove(move.dx, move.dy, move.dir)
        }
      }
    } else {
      // 按方向线性推进
      const ratio = MOVE_SPEED_PX / dist
      p.renderX += dx * ratio
      p.renderY += dy * ratio
    }
  } else {
    // 静止状态：同步渲染坐标（防止 changeMap/传送后残影）
    p.renderX = targetX
    p.renderY = targetY

    // 有输入方向则开始新的移动
    if (p.inputDirection && !state.vnActive && !state.choice && state.scene !== "battle") {
      const move = DIRECTION_MAP[p.inputDirection]
      if (move) {
        attemptMove(move.dx, move.dy, move.dir)
      }
    }
  }
}

function attemptMove(dx, dy, direction) {
  state.player.direction = direction

  const nextX = state.player.x + dx
  const nextY = state.player.y + dy

  if (!isPassable(state.currentMap, nextX, nextY)) {
    syncUi()
    return
  }

  if (isNpcBlocking(state.currentMap, nextX, nextY)) {
    syncUi()
    return
  }

  const previousX = state.player.x
  const previousY = state.player.y

  state.player.x = nextX
  state.player.y = nextY
  state.player.moving = true  // 触发渲染层补间
  state.player.steps += 1
  recoverStoredMonstersOnStep()
  consumeRepelStep()

  handleTileEvent(previousX, previousY)
  syncUi()
  queueSave()
}

const STORED_REGEN_STEP_INTERVAL = 4
const STORED_REGEN_HP_PER_TICK = 1

function ensureStoredRegenTicker() {
  if (!state.progress || typeof state.progress !== "object") {
    state.progress = {}
  }
  if (!Number.isFinite(state.progress.storedRegenTicker)) {
    state.progress.storedRegenTicker = 0
  }
}

function applyStoredRegenToPool(pool, healAmount) {
  if (!Array.isArray(pool) || healAmount <= 0) {
    return false
  }

  let healedAny = false
  for (const monster of pool) {
    if (!monster) {
      continue
    }
    const maxHp = Number(monster.maxHp) || 0
    const currentHp = Number(monster.currentHp) || 0
    if (maxHp <= 0 || currentHp <= 0 || currentHp >= maxHp) {
      continue
    }
    monster.currentHp = Math.min(maxHp, currentHp + healAmount)
    healedAny = true
  }
  return healedAny
}

function recoverStoredMonstersOnStep() {
  ensureStoredRegenTicker()
  state.progress.storedRegenTicker += 1

  if (state.progress.storedRegenTicker < STORED_REGEN_STEP_INTERVAL) {
    return
  }

  state.progress.storedRegenTicker = 0
  applyStoredRegenToPool(state.player.reserve, STORED_REGEN_HP_PER_TICK)
  applyStoredRegenToPool(state.player.home, STORED_REGEN_HP_PER_TICK)
}

function hasRepelEffect() {
  return (Number(state.player.repelSteps) || 0) > 0
}

function consumeRepelStep() {
  const currentSteps = Number(state.player.repelSteps) || 0
  if (currentSteps <= 0) {
    state.player.repelSteps = 0
    return
  }
  state.player.repelSteps = currentSteps - 1
  if (state.player.repelSteps <= 0) {
    state.player.repelSteps = 0
    addDialogue("避怪丹效果结束，普通野怪再次会主动靠近。")
  }
}

function handleTileEvent(previousX, previousY) {
  const tile = getTile(state.currentMap, state.player.x, state.player.y)

  if (handleMapTransition(tile, previousX, previousY)) {
    return
  }

  if (handleGuideMarkerTile(tile)) {
    return
  }

  if (tile === specialTileIds.legendAltar) {
    triggerLegendaryAltar(previousX, previousY)
    return
  }

  if (tile === specialTileIds.statue) {
    activateCurrentStatue({ announce: true })
    return
  }

  if (state.player.party.length === 0 || !getActiveMonster()) {
    return
  }

  if (tile === specialTileIds.dust) {
    handleDustTileEvent()
    return
  }

  if (tile === specialTileIds.ripple) {
    handleRippleTileEvent()
    return
  }

  if (tile === specialTileIds.shaking) {
    handleShakingGrassTileEvent()
    return
  }

  if ((tile === "g" || tile === "w") && hasRepelEffect()) {
    return
  }

  if (tile === "w" && Math.random() < 0.16) {
    startWildBattle({
      pool: maps[state.currentMap].waterEncounters || maps[state.currentMap].encounters,
      openingLine: "水面泛起涟漪，一只野生怪兽破浪而出。",
    })
    return
  }

  if (tile === "g" && Math.random() < 0.18) {
    startWildBattle()
  }
}

function shouldTriggerChosenLegendCubEncounter() {
  if (!state.flags?.goldenPrologueCompleted) {
    return false
  }
  if ((Number(state.storyStage) || 0) < 1) {
    return false
  }
  if (state.flags?.goldenLegendCubCaptured || state.flags?.goldenLegendCubEncountered) {
    return false
  }
  const cubSpeciesId = String(state.progress?.chosenLegendaryCubSpeciesId || "").trim()
  if (!cubSpeciesId || !speciesData[cubSpeciesId]) {
    return false
  }
  return true
}

function triggerChosenLegendCubEncounter() {
  const cubSpeciesId = String(state.progress?.chosenLegendaryCubSpeciesId || "").trim()
  if (!cubSpeciesId || !speciesData[cubSpeciesId]) {
    return
  }

  if ((Number(state.player.balls) || 0) <= 0) {
    state.player.balls = 1
    addDialogue("系统补给: 缔约教学补发精灵球 x1。")
  }

  state.flags.goldenLegendCubEncountered = true
  addDialogue("草丛深处传来熟悉的神性波动，你的流派契约正在回应。")
  addDialogue(`一只 ${speciesData[cubSpeciesId].name} 从风中现身，向你发起缔约试炼。`)
  startWildBattle({
    pool: [{ speciesId: cubSpeciesId, minLevel: 6, maxLevel: 6, weight: 1 }],
    forceLevel: 6,
    openingLine: `这是缔约捕捉教学：请投掷精灵球，与 ${speciesData[cubSpeciesId].name} 建立契约。`,
    forceCaptureSuccess: true,
    captureTutorial: true,
    disableRun: true,
    captureTag: "golden_chosen_cub",
  })
  queueSave()
}

function handleMapTransition(tile, previousX, previousY) {
  if (state.currentMap === "town" && tile === "H") {
    changeMap("home", 7, 9, "你一键回到了家园。这里可以整备、补给与进行进化研究。")
    return true
  }

  if (state.currentMap === "town" && tile === ">") {
    if (state.storyStage === 0 || state.player.party.length === 0) {
      state.player.x = previousX
      state.player.y = previousY
      addDialogue("在正式出发前，先去找教授领取第一位伙伴。")
      return true
    }

    healParty()
    if (typeof healReserveMonsters === "function") {
      healReserveMonsters()
    }
    changeMap("route", 1, 1, "你沿着花冠大道离开了星辉城。出发前已完成免费整备。")
    if (!state.flags.routeGuideShown) {
      state.flags.routeGuideShown = true
      addDialogue("路线提示: 先在草丛完成 2 次捕捉，再击败蚀星先遣洛克。")
      addDialogue("路线提示: 洛克后还有执旗官维萝，通过两战后回城领道馆通行证。")
    }
    if (shouldTriggerChosenLegendCubEncounter()) {
      triggerChosenLegendCubEncounter()
    }
    return true
  }

  if (state.currentMap === "town" && tile === "D") {
    if (!state.flags.gymPass) {
      state.player.x = previousX
      state.player.y = previousY
      addDialogue("道馆大门暂未向你开放。先完成教授交代的试炼。")
      return true
    }

    changeMap("gym", 7, 10, "你穿过金色拱门，星辉道馆的试炼正式开始。")
    if (!state.flags.gymAideIntroShown && !state.flags.gymAideDefeated) {
      state.flags.gymAideIntroShown = true
      addDialogue("提示: 馆内的试炼官赛弥可提供一场可选热身战，帮你调整挑战节奏。")
    }
    return true
  }

  if (state.currentMap === "gym" && tile === "v") {
    changeMap("town", 8, 9, "你离开了道馆，重新回到星辉城中央大道。")
    return true
  }

  if (state.currentMap === "home" && tile === "v") {
    changeMap("town", 13, 1, "你离开家园，回到了星辉城。")
    return true
  }

  if (state.currentMap === "route" && tile === "<") {
    changeMap("town", 13, 1, "你回到了星辉城的北环广场。")
    return true
  }

  if (state.currentMap === "route" && tile === ">") {
    changeMap("meadow", 1, 1, "你进入了摇叶草原。注意摇动草丛，它常常隐藏稀有遭遇。")
    return true
  }

  if (state.currentMap === "route" && tile === "c") {
    changeMap("cave", 1, 1, "你进入了电气石洞穴。卷尘地面可能出现稀有怪兽或掉落物。")
    return true
  }

  if (state.currentMap === "meadow" && tile === "<") {
    changeMap("route", 14, 1, "你回到了花冠大道。")
    return true
  }

  if (state.currentMap === "meadow" && tile === specialTileIds.orchardGate) {
    if (!state.flags.gymWon) {
      state.player.x = previousX
      state.player.y = previousY
      addDialogue("果园巡护线仍在封控。先拿下星辉道馆徽章再深入晨露果园。")
      return true
    }
    changeMap("orchard", 2, 2, "你穿过果园栈门，抵达晨露果园。这里更适合仙系融合与育成。")
    return true
  }

  if (state.currentMap === "meadow" && tile === ">") {
    if (!hasOldRodAccess() && hasWaterTypeCompanion()) {
      unlockOldRod("水系伙伴的指引")
      addDialogue("你的水系伙伴帮你找到了可用渔具，后续可直接调查水纹点。")
    } else if (!hasOldRodAccess() && !state.flags.oldRodHintShown) {
      state.flags.oldRodHintShown = true
      addDialogue("提示：旧钓竿不会再卡主线过图。")
      addDialogue("你可通过补给员诺亚、水系伙伴线索、或野外宝箱获得旧钓竿。")
    }
    changeMap("lake", 1, 1, "你抵达 11 号水路。水纹水面会引来不同类型的野生怪兽。")
    return true
  }

  if (state.currentMap === "orchard" && (tile === "<" || tile === specialTileIds.orchardGate)) {
    changeMap("meadow", 4, 2, "你离开晨露果园，返回摇叶草原。")
    return true
  }

  if (state.currentMap === "orchard" && tile === ">") {
    changeMap("lake", 2, 1, "你沿果园水道抵达 11 号水路北侧。")
    return true
  }

  if (state.currentMap === "lake" && tile === "<") {
    changeMap("meadow", 14, 1, "你沿着岸线返回摇叶草原。")
    return true
  }

  if (state.currentMap === "lake" && tile === specialTileIds.reefGate) {
    if (!state.flags.breederDefeated) {
      state.player.x = previousX
      state.player.y = previousY
      addDialogue("海湾航道尚未开放。先在晨露果园通过育成师玛芙的属性轮换考核。")
      return true
    }
    changeMap("reef", 7, 2, "你驶入镜潮海湾。潮汐与水纹会带来更高强度遭遇。")
    return true
  }

  if (state.currentMap === "lake" && tile === ">") {
    changeMap("town", 12, 8, "你乘短驳艇回到了星辉城港侧。")
    return true
  }

  if (state.currentMap === "reef" && (tile === "<" || tile === specialTileIds.reefGate)) {
    changeMap("lake", 7, 3, "你离开镜潮海湾，回到了 11 号水路。")
    return true
  }

  if (state.currentMap === "reef" && tile === ">") {
    if (!state.flags.captainDefeated) {
      state.player.x = previousX
      state.player.y = previousY
      addDialogue("远洋航线尚未核准。先通过海湾队长赛伦的实战评估。")
      return true
    }
    changeMap("islet", 1, 1, "你穿越外海风带，抵达曜风群岛。")
    return true
  }

  if (state.currentMap === "cave" && tile === "<") {
    changeMap("route", 10, 1, "你离开洞窟，回到了花冠大道。")
    return true
  }

  if (state.currentMap === "cave" && (tile === ">" || tile === specialTileIds.shrineGate)) {
    changeMap("deep_cave", 1, 1, "你进入深层断崖。这里的卷尘地面更危险，也更有价值。")
    return true
  }

  if (state.currentMap === "deep_cave" && tile === "<") {
    changeMap("cave", 14, 1, "你回到了电气石洞穴上层。")
    return true
  }

  if (state.currentMap === "deep_cave" && tile === specialTileIds.ridgeGate) {
    if (!state.flags.captainDefeated) {
      state.player.x = previousX
      state.player.y = previousY
      addDialogue("高岭缆道电梯尚未解锁。请先在镜潮海湾完成队长赛伦的试炼。")
      return true
    }
    changeMap("ridge", 2, 1, "你抵达流星高岭。这里的高压地形考验抗性与换宠节奏。")
    return true
  }

  if (state.currentMap === "deep_cave" && (tile === ">" || tile === specialTileIds.shrineGate)) {
    if (!state.flags.sanctumOpen) {
      state.player.x = previousX
      state.player.y = previousY
      addDialogue("遗迹石门尚未响应。先完成卷尘/水纹/摇草三类调查并收集三枚纹章。")
      return true
    }
    changeMap("sanctum", 1, 1, "遗迹大门开启，你踏入了天穹遗迹。")
    return true
  }

  if (state.currentMap === "sanctum" && tile === "<") {
    changeMap("deep_cave", 14, 1, "你离开天穹遗迹，返回深层断崖。")
    return true
  }

  if (state.currentMap === "ridge" && (tile === "<" || tile === specialTileIds.ridgeGate)) {
    changeMap("deep_cave", 8, 9, "你沿高岭通道回到了深层断崖。")
    return true
  }

  if (state.currentMap === "ridge" && tile === ">") {
    if (!state.flags.aceDefeated) {
      state.player.x = previousX
      state.player.y = previousY
      addDialogue("群岛航线仍处于训练许可状态。先击败高岭王牌维迦。")
      return true
    }
    changeMap("islet", 2, 1, "你冲破山脊云海，抵达曜风群岛主岛。")
    return true
  }

  if (state.currentMap === "islet" && tile === "<") {
    changeMap("ridge", 14, 1, "你沿山海联络线返回流星高岭。")
    return true
  }

  if (state.currentMap === "islet" && tile === ">") {
    changeMap("reef", 14, 1, "你回到镜潮海湾外侧补给点。")
    return true
  }

  if (state.currentMap === "islet" && tile === specialTileIds.isletGate) {
    if (!state.flags.wardenDefeated && !state.flags.sanctumOpen) {
      state.player.x = previousX
      state.player.y = previousY
      addDialogue("遗迹潮门尚未认证。先通过守望者伊诺的最终考验。")
      return true
    }
    changeMap("sanctum", 1, 1, "你借群岛潮门直达天穹遗迹外环。")
    return true
  }

  return false
}

function getCurrentStatueKey() {
  return `${state.currentMap}:${state.player.x}:${state.player.y}`
}

function activateCurrentStatue(options = {}) {
  const tile = getTile(state.currentMap, state.player.x, state.player.y)
  if (tile !== specialTileIds.statue) {
    return false
  }

  if (!state.progress.unlockedStatues || typeof state.progress.unlockedStatues !== "object") {
    state.progress.unlockedStatues = {}
  }

  const key = getCurrentStatueKey()
  const isNew = !state.progress.unlockedStatues[key]
  state.progress.unlockedStatues[key] = {
    key,
    mapId: state.currentMap,
    x: state.player.x,
    y: state.player.y,
    name: maps[state.currentMap]?.name || state.currentMap,
  }
  state.progress.lastStatue = key

  if (options.announce && isNew) {
    addDialogue(`传送石像已激活：${maps[state.currentMap].name}。你现在可在此复活并传送。`)
  } else if (options.announce && !isNew) {
    addDialogue(`你在 ${maps[state.currentMap].name} 的传送石像旁稍作整备。`)
  }
  return false
}

function hasOldRodAccess() {
  return Boolean(state.flags.oldRodClaimed || (state.player.inventory.old_rod || 0) > 0)
}

function unlockOldRod(sourceLabel) {
  const hadRodItem = (state.player.inventory.old_rod || 0) > 0
  if (!hadRodItem) {
    addInventoryItem("old_rod", 1)
    addDialogue(`你通过${sourceLabel}获得了关键道具「旧钓竿」。`)
  }
  state.flags.oldRodClaimed = true
  state.flags.oldRodHintShown = true
}

function hasWaterTypeCompanion() {
  const homeList = Array.isArray(state.player.home) ? state.player.home : []
  const monsters = [...state.player.party, ...state.player.reserve, ...homeList]
  return monsters.some((monster) => getSpeciesTypes(monster).includes("water"))
}

function handleGuideMarkerTile(tile) {
  if (tile === specialTileIds.guideArcane && !state.flags.guideArcaneVisited) {
    state.flags.guideArcaneVisited = true
    addDialogue("奥术导标: 融合主公式为“主体 + 元素 + Arcane”，用于建立稳定共鸣。")
    addDialogue("奥术导标: 渊噬仪式需要 Void 资源，可在摇动草丛和洞窟探索中获取。")
    return true
  }

  if (tile === specialTileIds.guideSun && !state.flags.guideSunVisited) {
    state.flags.guideSunVisited = true
    addDialogue("太阳导标: 普通系 + 太阳元素可朝闪光方向变异。")
    addDialogue("太阳导标: 若想稳定触发，可先收集 Sun Core 后在进化工坊融合。")
    return true
  }

  if (tile === specialTileIds.guideWeapon && !state.flags.guideWeaponVisited) {
    state.flags.guideWeaponVisited = true
    addDialogue("武装导标: 精灵 + 武器元素可转化为武者进化分支。")
    addDialogue("武装导标: 武者会获得更高攻击成长，适合前排强攻。")
    return true
  }

  return false
}

function handleDustTileEvent() {
  registerSpecialZoneDiscovery("dust")
  const hasBattle = Math.random() < 0.62
  if (hasBattle) {
    startWildBattle({
      pool: maps[state.currentMap].dustEncounters || maps[state.currentMap].encounters,
      openingLine: "卷尘地面突然炸开，一只野生怪兽从碎岩中冲出。",
    })
    return
  }

  const drop = rollZoneLoot("dust")
  if (drop) {
    grantFieldLoot(drop.itemId, drop.quantity || 1, "卷尘地面")
    return
  }
  addDialogue("卷尘地面只留下了碎石，这次没有找到可用资源。")
}

function handleRippleTileEvent() {
  registerSpecialZoneDiscovery("ripple")
  const hasBattle = Math.random() < 0.6
  if (hasBattle) {
    startWildBattle({
      pool: maps[state.currentMap].rippleEncounters || maps[state.currentMap].waterEncounters || maps[state.currentMap].encounters,
      openingLine: "水纹忽然扩大，一只野生怪兽借势跃出水面。",
    })
    return
  }

  const drop = rollZoneLoot("ripple")
  if (drop) {
    grantFieldLoot(drop.itemId, drop.quantity || 1, "水纹水面")
    return
  }
  addDialogue("水纹很快散开，这次没有钓到任何东西。")
}

function handleShakingGrassTileEvent() {
  registerSpecialZoneDiscovery("shaking")
  if (tryTriggerPreGymLegendEncounter()) {
    return
  }
  const hasBattle = Math.random() < 0.68
  if (hasBattle) {
    startWildBattle({
      pool: maps[state.currentMap].shakingEncounters || maps[state.currentMap].encounters,
      openingLine: "你听见草丛“沙沙”作响，一只稀有野生怪兽猛地出现。",
    })
    return
  }

  const drop = rollZoneLoot("shaking")
  if (drop) {
    grantFieldLoot(drop.itemId, drop.quantity || 1, "摇动草丛")
    return
  }
  addDialogue("草丛恢复了平静，但你这次没有发现可用物资。")
}

function getPreGymLegendRegistry() {
  if (!state.progress || typeof state.progress !== "object") {
    state.progress = {}
  }
  if (!state.progress.preGymLegendSeen || typeof state.progress.preGymLegendSeen !== "object") {
    state.progress.preGymLegendSeen = {}
  }
  state.progress.preGymLegendAttempts = Number(state.progress.preGymLegendAttempts) || 0
  state.progress.preGymLegendEncounterCount = Number(state.progress.preGymLegendEncounterCount) || 0
  return state.progress.preGymLegendSeen
}

function tryTriggerPreGymLegendEncounter() {
  if (state.currentMap !== "meadow" || state.flags.gymWon) {
    return false
  }

  const seenRegistry = getPreGymLegendRegistry()
  if ((state.progress.preGymLegendEncounterCount || 0) >= 3) {
    return false
  }

  state.progress.preGymLegendAttempts += 1
  const attempts = state.progress.preGymLegendAttempts
  const uniqueSeenCount = Object.keys(seenRegistry).length
  const baseChance = 0.22
  const pityBonus = attempts > 4 ? Math.min(0.58, (attempts - 4) * 0.12) : 0
  const forceTrigger = attempts >= 8 && uniqueSeenCount === 0
  const shouldTrigger = forceTrigger || Math.random() < Math.min(0.95, baseChance + pityBonus)
  if (!shouldTrigger) {
    return false
  }

  const legendPool = ["verdion", "solaraith", "frostplume"]
  const unseenPool = legendPool.filter((speciesId) => !seenRegistry[speciesId])
  const candidatePool = unseenPool.length > 0 ? unseenPool : legendPool
  const picked = candidatePool[randomInt(0, candidatePool.length - 1)]

  seenRegistry[picked] = true
  state.progress.preGymLegendEncounterCount += 1
  addDialogue("摇动草丛中爆发出异常灵压，传说精灵现身了。")
  startWildBattle({
    pool: [{ speciesId: picked, minLevel: 10, maxLevel: 12, weight: 1 }],
    openingLine: `传说气息席卷草原，${speciesData[picked].name} 正在注视你。`,
    legendary: true,
  })
  queueSave()
  return true
}

function ensurePreGymLegendEncounterBeforeGymPass() {
  if (state.flags.gymWon) {
    return true
  }
  const seenRegistry = getPreGymLegendRegistry()
  const alreadySeen = Number(state.progress.preGymLegendEncounterCount || 0) > 0 || Object.keys(seenRegistry).length > 0
  if (alreadySeen) {
    return true
  }

  const legendPool = ["verdion", "solaraith", "frostplume"]
  const picked = legendPool[randomInt(0, legendPool.length - 1)]
  seenRegistry[picked] = true
  state.progress.preGymLegendEncounterCount = Number(state.progress.preGymLegendEncounterCount || 0) + 1

  addDialogue("教授雪松: 在发放道馆通行证前，草原发生了神性波动。你先完成一次传说交手。")
  addDialogue(`教授雪松: ${speciesData[picked].name} 已在草原边缘现身，去证明你的应对能力。`)
  startWildBattle({
    pool: [{ speciesId: picked, minLevel: 11, maxLevel: 12, weight: 1 }],
    openingLine: `草原风向突变，${speciesData[picked].name} 以守望者姿态降临。`,
    legendary: true,
  })
  queueSave()
  return false
}

function registerSpecialZoneDiscovery(zoneKey) {
  if (!state.progress?.specialZones || state.progress.specialZones[zoneKey]) {
    return
  }

  state.progress.specialZones[zoneKey] = true
  state.progress.sanctumSigils = clamp((state.progress.sanctumSigils || 0) + 1, 0, 3)

  const zoneName = {
    dust: "卷尘地面",
    ripple: "水纹水面",
    shaking: "摇动草丛",
  }[zoneKey]
  if (zoneName) {
    addDialogue(`你记录了特殊生态点「${zoneName}」。遗迹纹章进度 ${state.progress.sanctumSigils} / 3。`)
  }

  tryUnlockSanctum()
}

function tryUnlockSanctum() {
  if (state.flags.sanctumOpen || (state.progress.sanctumSigils || 0) < 3) {
    return
  }

  state.flags.sanctumOpen = true
  addInventoryItem("sanctum_key", 1)
  addDialogue("三枚遗迹纹章已经共鸣，深层断崖尽头的石门已解除封印。")
  addDialogue("你获得了关键道具「遗迹密钥」，可以前往天穹遗迹挑战传说宝可梦。")
}

function rollZoneLoot(zoneType) {
  const lootTable = maps[state.currentMap]?.zoneLoot?.[zoneType]
  if (!Array.isArray(lootTable) || lootTable.length === 0) {
    return null
  }
  return rollEncounter(lootTable)
}

function grantFieldLoot(itemId, quantity = 1, sourceLabel = "野外") {
  if (!itemCatalog[itemId]) {
    return
  }
  addInventoryItem(itemId, quantity)
  const item = itemCatalog[itemId]
  addDialogue(`你在${sourceLabel}获得了 ${item.name} x${quantity}。`)
}

function getOpenedFieldChests() {
  if (!state.progress || typeof state.progress !== "object") {
    state.progress = {}
  }
  if (!state.progress.openedChests || typeof state.progress.openedChests !== "object") {
    state.progress.openedChests = {}
  }
  return state.progress.openedChests
}

function makeFieldChestKey(mapId, x, y) {
  return `${mapId}:${x},${y}`
}

function getFieldChestLootTable(mapId) {
  const byMap = {
    meadow: [
      { itemId: "sun_core", quantity: 1, weight: 28 },
      { itemId: "ball_crate", quantity: 1, weight: 24 },
      { itemId: "super_potion", quantity: 1, weight: 32 },
      { itemId: "pearl_fragment", quantity: 1, weight: 16 },
    ],
    lake: [
      { itemId: "tidal_tm", quantity: 1, weight: 18 },
      { itemId: "great_ball_case", quantity: 1, weight: 28 },
      { itemId: "hyper_potion", quantity: 1, weight: 30 },
      { itemId: "pearl_fragment", quantity: 1, weight: 24 },
    ],
    cave: [
      { itemId: "weapon_core", quantity: 1, weight: 24 },
      { itemId: "void_shard", quantity: 1, weight: 26 },
      { itemId: "hyper_potion", quantity: 1, weight: 26 },
      { itemId: "ancient_fossil", quantity: 1, weight: 24 },
    ],
  }
  return byMap[mapId] || [{ itemId: "potion", quantity: 1, weight: 100 }]
}

function interactFieldChest() {
  const chestKey = makeFieldChestKey(state.currentMap, state.player.x, state.player.y)
  const openedChests = getOpenedFieldChests()
  if (openedChests[chestKey]) {
    addDialogue("这个野外宝箱已经被打开过了。")
    return
  }
  openedChests[chestKey] = true

  if (!hasOldRodAccess()) {
    unlockOldRod("野外宝箱")
    addDialogue("宝箱夹层里还有一张旧水路笔记：携带水系伙伴时更容易发现隐藏涟漪。")
    return
  }

  const drop = rollEncounter(getFieldChestLootTable(state.currentMap))
  if (drop?.itemId) {
    grantFieldLoot(drop.itemId, drop.quantity || 1, "野外宝箱")
    return
  }

  addDialogue("宝箱里只有一些空补给袋，这次没有找到可用道具。")
}

function triggerLegendaryAltar(previousX, previousY) {
  if (!state.flags.sanctumOpen) {
    state.player.x = previousX
    state.player.y = previousY
    addDialogue("祭坛没有回应。你需要先完成三类特殊生态调查。")
    return
  }

  if (state.flags.legendaryCaptured) {
    addDialogue("祭坛已经沉寂。你与传说宝可梦的契约仍在发光。")
    return
  }

  const encounterData = maps.sanctum.legendaryEncounter
  if (!encounterData?.pool?.length) {
    addDialogue("祭坛能量异常，暂时无法触发传说遭遇。")
    return
  }

  state.flags.legendaryEncountered = true
  startWildBattle({
    pool: encounterData.pool,
    forceLevel: encounterData.level,
    openingLine: "祭坛爆发出耀光，传说宝可梦回应了你的挑战。",
    legendary: true,
  })
}

function changeMap(mapId, x, y, message) {
  state.currentMap = mapId
  state.player.x = x
  state.player.y = y
  // 地图切换时立即同步渲染坐标，避免补间从旧地图位置滑行
  state.player.renderX = x * TILE_SIZE
  state.player.renderY = y * TILE_SIZE
  state.player.moving = false
  state.player.inputDirection = null

  if (message) {
    addDialogue(message)
  }

  if (mapId === "meadow" && !state.flags?.meadowIntroShown) {
    state.flags.meadowIntroShown = true
    addDialogue("系统提示: 蒙德草原的草系精灵擅长续航与控节奏，建议及时换宠与清状态。")
    addDialogue("系统提示: 多留意摇动草丛（s），你有机会在道馆前遭遇传说精灵。")
  }

  if (mapId === "gym" && !state.flags?.gymIntroShown) {
    state.flags.gymIntroShown = true
    addDialogue("道馆提示: 本馆偏重草系控场。先手压制与持续作战比爆发更重要。")
  }
}

function interact() {
  const npc = findNearbyNpc()

  if (npc) {
    addDialogue(buildNpcAddressLine(npc), {
      speakerId: npc.id,
      preserveCurrent: false,
    })
    if (typeof requestNpcPortraitOnInteract === "function") {
      void requestNpcPortraitOnInteract(npc.id)
    }
    npc.interact()
    syncUi()
    queueSave()
    return
  }

  const tile = getTile(state.currentMap, state.player.x, state.player.y)
  if (state.currentMap === "home") {
    if (tile === "F") {
      interactHomeSpring()
      return
    }
    if (tile === "C") {
      interactHomeStorage()
      return
    }
    if (tile === "Y") {
      interactHomeWish()
      return
    }
    if (tile === "X") {
      interactHomeDevourAltar()
      return
    }
    if (tile === "G") {
      interactHomeFusionAltar()
      return
    }
    if (tile === "B") {
      interactHomeSupply()
      return
    }
  }

  if (state.currentMap === "town" && tile === "F") {
    healParty()
    addDialogue("泉水的凉意让你的伙伴们恢复了状态。")
    syncUi()
    queueSave()
    return
  }

  if (tile === specialTileIds.fieldChest) {
    interactFieldChest()
    syncUi()
    queueSave()
    return
  }

  if (tile === specialTileIds.statue) {
    interactStatue()
    syncUi()
    queueSave()
    return
  }

  addDialogue("附近暂时没有可以互动的对象。")
  syncUi()
}

function buildNpcAddressLine(npc) {
  const playerName = sanitizePlayerName(state.playerName || "旅行者")
  const title =
    typeof state.playerProfile?.title === "string" && state.playerProfile.title.trim()
      ? state.playerProfile.title.trim()
      : "训练家"
  const motto =
    typeof state.playerProfile?.motto === "string" && state.playerProfile.motto.trim()
      ? state.playerProfile.motto.trim()
      : ""

  const roleLineMap = {
    professor: `教授雪松: ${title}${playerName}，研究站随时欢迎你。`,
    merchant: `商店老板 罗文: ${playerName}，今天也要为“${motto || "冒险顺利"}”准备补给吗？`,
    scout: `蚀星先遣 洛克: ${title}${playerName}？哼，你的口号听起来还挺自信。`,
    vanguard: `蚀星执旗 维萝: ${playerName}，你真以为一句“${motto || "前进"}”就能突破封锁吗？`,
    leader: `馆主 阿斯特拉: ${title}${playerName}，让我看看你的成长。`,
  }

  return roleLineMap[npc.id] || `${npc.name}: ${title}${playerName}，你来了。`
}

function normalizePlayerGender(input) {
  const text = String(input || "").trim().toLowerCase()
  if (["男", "male", "m", "boy"].includes(text)) {
    return "male"
  }
  if (["女", "female", "f", "girl"].includes(text)) {
    return "female"
  }
  return "unknown"
}

function getPlayerGenderLabel(gender) {
  if (gender === "male") {
    return "男性"
  }
  if (gender === "female") {
    return "女性"
  }
  return "未指定"
}

function ensureProfessorIdentityProfile() {
  if (state.flags?.playerIdentityReady) {
    return true
  }

  const settings = typeof getGameStartSettings === "function" ? getGameStartSettings() : {}
  const fallbackName = sanitizePlayerName(state.playerName || settings.playerName || "旅行者")
  const genderDefault =
    state.playerProfile?.gender === "female" ? "女" : state.playerProfile?.gender === "male" ? "男" : "其他"

  openChoice("教授雪松：登记训练家身份", [
    {
      label: "提交身份信息",
      description: "领取初始精灵前，请先完成名字与性别偏好登记。",
      buttonLabel: "确认登记",
      formFields: [
        {
          key: "playerName",
          label: "训练家名字（最多12字）",
          type: "text",
          maxLength: 12,
          value: fallbackName,
          placeholder: "输入你的训练家名字",
        },
        {
          key: "gender",
          label: "性别偏好（男 / 女 / 其他）",
          type: "text",
          maxLength: 4,
          value: genderDefault,
          placeholder: "男 / 女 / 其他",
        },
      ],
      onSelect: (payload = {}) => {
        const playerName = sanitizePlayerName(payload.playerName || fallbackName)
        const gender = normalizePlayerGender(payload.gender || genderDefault)

        if (!state.playerProfile || typeof state.playerProfile !== "object") {
          state.playerProfile = {}
        }
        state.playerName = playerName
        state.playerProfile.gender = gender
        state.playerProfile.title = sanitizePlayerTitle(
          state.playerProfile.title,
          settings.defaultTitle || "见习训练家"
        )
        state.playerProfile.motto = sanitizePlayerMotto(state.playerProfile.motto, settings.defaultMotto || "")
        state.flags.playerIdentityReady = true

        if (typeof sanitizeGameStartSettings === "function") {
          gameStartSettings = sanitizeGameStartSettings({
            ...settings,
            playerName,
          })
          if (typeof writeGameStartSettings === "function") {
            writeGameStartSettings()
          }
        }

        closeChoice()
        addDialogue(
          `教授雪松: 登记完成。${state.playerProfile.title}${playerName}，性别偏好：${getPlayerGenderLabel(gender)}。`
        )
        if (state.playerProfile.motto) {
          addDialogue(`教授雪松: 你的口头禅「${state.playerProfile.motto}」也记下了。`)
        }
        queueSave()
      },
    },
    {
      label: "稍后再说",
      description: "保持当前状态，暂不登记身份。",
      buttonLabel: "取消",
      onSelect: () => {
        closeChoice()
        addDialogue("教授雪松: 没关系，想好后再告诉我你的名字。")
      },
    },
  ])
  return true
}

function quickReturnHome() {
  if (state.currentMap === "home") {
    addDialogue("你已经在家园内了。")
    syncUi()
    return
  }
  changeMap("home", 7, 9, "你使用回城指令，瞬间回到了家园。")
  syncUi()
  queueSave()
}

function interactStatue() {
  activateCurrentStatue({ announce: false })
  const currentMapName = maps[state.currentMap]?.name || state.currentMap
  openChoice(`传送石像 · ${currentMapName}`, [
    {
      label: "恢复队伍",
      description: "将当前队伍恢复到满状态。",
      onSelect: () => {
        closeChoice()
        healParty()
        addDialogue("石像发出柔光，你的队伍状态已全部恢复。")
        syncUi()
        queueSave()
      },
    },
    {
      label: "传送至已激活石像",
      description: "在已激活的石像之间快速移动。",
      onSelect: () => {
        openStatueTeleportMenu()
      },
    },
    {
      label: "结束互动",
      description: "离开石像界面。",
      onSelect: () => {
        closeChoice()
        addDialogue("石像光芒逐渐收拢，坐标记录保持同步。")
      },
    },
  ])
}

function openStatueTeleportMenu() {
  if (!state.progress.unlockedStatues || typeof state.progress.unlockedStatues !== "object") {
    state.progress.unlockedStatues = {}
  }
  const currentKey = getCurrentStatueKey()
  const entries = Object.values(state.progress.unlockedStatues)

  const options = entries
    .filter((entry) => entry && entry.key && entry.key !== currentKey)
    .map((entry) => ({
      label: `传送到 ${entry.name}`,
      description: `坐标 (${entry.x}, ${entry.y})`,
      onSelect: () => {
        closeChoice()
        state.progress.lastStatue = entry.key
        changeMap(entry.mapId, entry.x, entry.y, `你通过石像网络传送到了 ${entry.name}。`)
        syncUi()
        queueSave()
      },
    }))

  if (options.length === 0) {
    closeChoice()
    addDialogue("当前仅激活了这一座石像，暂时无法传送。")
    return
  }

  options.push({
    label: "返回上一级",
    description: "返回石像主菜单。",
    onSelect: () => {
      interactStatue()
    },
  })
  openChoice("选择传送目的地", options)
}

function interactProfessor() {
  if (state.flags.firstGymRewardPending) {
    addDialogue("教授雪松: 你已完成首个道馆闭环，现在可以领取一份定制奖励。")
    triggerFirstGymRewardChoice("professor")
    return
  }

  if (state.flags.firstGymRewardClaimed && state.storyStage >= 5) {
    addDialogue("教授雪松: 首个道馆奖励已发放。下一阶段请按目标栏推进区域挑战。")
    return
  }

  if (state.storyStage === 0) {
    if (!state.flags.goldenPrologueCompleted) {
      addDialogue("教授雪松: 你的神色有些恍惚。先稳定那段预示，再来领取初始精灵。")
      openGoldenPrologueEntryChoice()
      return
    }
    if (!ensureProfessorIdentityProfile()) {
      return
    }
    if (typeof showVNDialogue === "function") {
      showVNDialogue(
        [
          {
            position: "left",
            name: "教授 雪松",
            portrait: "professor",
            text: "每位训练家都需要一位可靠的起点伙伴。",
          },
          {
            position: "left",
            name: "教授 雪松",
            portrait: "professor",
            text: "选一只与你一起记录这片区域的图鉴吧。",
          },
        ],
        {
          onComplete: () => {
            addDialogue("教授雪松: 每位训练家都需要一位可靠的起点伙伴。")
            addDialogue("教授雪松: 选一只与你一起记录这片区域的图鉴吧。")
            openChoice("选择你的初始伙伴", [
              {
                label: "芽团兽",
                description: "草系，耐久稳定，适合慢慢推进。",
                onSelect: () => recruitStarter("sprigoon"),
              },
              {
                label: "炽团犬",
                description: "火系，输出直接，前期打起来很爽快。",
                onSelect: () => recruitStarter("embercub"),
              },
              {
                label: "泡鳍兽",
                description: "水系，攻守平衡，容错比较高。",
                onSelect: () => recruitStarter("aquaffin"),
              },
            ])
          },
        }
      )
    } else {
      addDialogue("教授雪松: 每位训练家都需要一位可靠的起点伙伴。")
      addDialogue("教授雪松: 选一只与你一起记录这片区域的图鉴吧。")
      openChoice("选择你的初始伙伴", [
        {
          label: "芽团兽",
          description: "草系，耐久稳定，适合慢慢推进。",
          onSelect: () => recruitStarter("sprigoon"),
        },
        {
          label: "炽团犬",
          description: "火系，输出直接，前期打起来很爽快。",
          onSelect: () => recruitStarter("embercub"),
        },
        {
          label: "泡鳍兽",
          description: "水系，攻守平衡，容错比较高。",
          onSelect: () => recruitStarter("aquaffin"),
        },
      ])
    }
    return
  }

  if (state.storyStage === 1) {
    if (!state.flags.alchemyTutorialIntroShown) {
      state.flags.alchemyTutorialIntroShown = true
      addDialogue("教授雪松: 在你前往道馆前，我先介绍两种关键进化手段。")
      addDialogue("教授雪松: 吞噬进化是“精灵 + 元素”，融合进化是“主体 + 素材精灵”。")
      addDialogue("教授雪松: 先在草原完成一次吞噬或融合实操，你会明显感受到队伍节奏变化。")
      queueSave()
    }
    addDialogue(
      `教授雪松: 去花冠大道捕捉 2 只野生怪兽。你当前已经捕捉了 ${state.progress.wildCaptures} / 2。`
    )
    return
  }

  if (state.storyStage === 2) {
    if (!state.flags.scoutDefeated) {
      addDialogue("教授雪松: 蚀星组织的先遣正在花冠大道封路。先击败他。")
      return
    }
    if (!state.flags.vanguardDefeated) {
      addDialogue("教授雪松: 草原后段还有一名蚀星执旗官。击败她后我再给你道馆通行证。")
      return
    }
    addDialogue("教授雪松: 你已突破两道封锁，回来领取道馆通行证吧。")
    return
  }

  if (state.storyStage === 3) {
    if (!ensurePreGymLegendEncounterBeforeGymPass()) {
      return
    }
    state.storyStage = 4
    state.flags.gymPass = true
    state.player.balls += 2
    healParty()
    addDialogue("教授雪松: 很好，这张星辉道馆通行证归你了。")
    addDialogue("教授雪松: 我再补给你 2 枚捕捉球，并帮你把队伍状态恢复到最佳。")
    return
  }

  if (state.storyStage === 4) {
    addDialogue("教授雪松: 道馆就在星辉城中央环道尽头。拿下第一枚徽章，真正的旅程就开始了。")
    return
  }

  if (!state.flags.sanctumOpen) {
    addDialogue("教授雪松: 接下来请去调查三类特殊生态：卷尘地面、水纹水面、摇动草丛。")
    addDialogue("教授雪松: 地图上的 A/S/W 指引点会告诉你特殊进化配方，收集三枚纹章后遗迹会开启。")
    return
  }

  if (!state.flags.legendaryCaptured && !state.progress.legendaryCleared) {
    addDialogue("教授雪松: 深层断崖尽头的遗迹门已经开启，去祭坛迎接传说宝可梦的试炼吧。")
    return
  }

  addDialogue("教授雪松: 你的第一枚徽章已经稳住基础。接下来就扩图鉴、练组合、冲神兽。")
  addDialogue("教授雪松: 你可以继续用特殊进化打造差异化队伍。")
}

function triggerFirstGymRewardChoice(source = "system") {
  if (state.flags.firstGymRewardClaimed) {
    return
  }

  state.flags.firstGymRewardPending = true

  openChoice("首个道馆奖励 · 三选一", [
    {
      label: "捕捉补给包",
      description: "精灵球 +12，球类补给箱 +1，适合快速扩图鉴。",
      onSelect: () => {
        closeChoice()
        grantFirstGymRewardPackage("capture", source)
      },
    },
    {
      label: "对战强化包",
      description: "超级药 +3，战斗活力剂 +2，守护强化剂 +2。",
      onSelect: () => {
        closeChoice()
        grantFirstGymRewardPackage("battle", source)
      },
    },
    {
      label: "成长资源包",
      description: "金币 +220，月辉之核 +1，武装之核 +1。",
      onSelect: () => {
        closeChoice()
        grantFirstGymRewardPackage("growth", source)
      },
    },
    {
      label: "稍后决定",
      description: "先继续探索，之后可找教授再次领取。",
      onSelect: () => {
        closeChoice()
        addDialogue("奖励领取已暂存。你可以随时回城找教授雪松再次选择。")
        queueSave()
      },
    },
  ])
}

function grantFirstGymRewardPackage(packageId, source = "system") {
  if (state.flags.firstGymRewardClaimed) {
    addDialogue("系统提示: 你已经领取过首个道馆奖励。")
    return
  }

  if (packageId === "capture") {
    state.player.balls += 12
    addInventoryItem("ball_crate", 1)
    addDialogue("奖励到账: 你获得了捕捉补给包（精灵球 +12，球类补给箱 x1）。")
  } else if (packageId === "battle") {
    addInventoryItem("super_potion", 3)
    addInventoryItem("battle_tonic", 2)
    addInventoryItem("guard_tonic", 2)
    addDialogue("奖励到账: 你获得了对战强化包（超级药 x3，战斗活力剂 x2，守护强化剂 x2）。")
  } else {
    const growthCoins =
      typeof getBalancedCoinReward === "function" ? getBalancedCoinReward(220) : 220
    state.player.coins += growthCoins
    addInventoryItem("moon_core", 1)
    addInventoryItem("weapon_core", 1)
    addDialogue(`奖励到账: 你获得了成长资源包（金钱 +${growthCoins}，月辉之核 x1，武装之核 x1）。`)
  }

  state.flags.firstGymRewardPending = false
  state.flags.firstGymRewardClaimed = true
  addDialogue(`系统提示: 首个道馆奖励已锁定（来源: ${source}）。`)
  syncUi()
  queueSave()
}

function interactCaretaker() {
  if (state.player.party.length === 0) {
    addDialogue("照料员林: 等你拥有第一位伙伴后，再来让我照顾它们。")
    return
  }

  healParty()
  addDialogue("照料员林: 别担心，我已经把你的队伍都照看好了。")
}

function interactScout() {
  if (state.storyStage < 2) {
    addDialogue("蚀星先遣 洛克: 你还没资格介入草原深处的神兽线索。")
    return
  }

  if (!state.flags.alchemyPracticeDone) {
    addDialogue("蚀星先遣 洛克: 先做一次吞噬或融合再来。没有进化调度，你不配继续前进。")
    return
  }

  if (!state.flags.scoutDefeated) {
    startTrainerBattle("scout")
    return
  }

  addDialogue("蚀星先遣 洛克: 你居然赢了……但前面还有我们的执旗官。")
}

function interactVanguard() {
  if (state.storyStage < 2 || !state.flags.scoutDefeated) {
    addDialogue("蚀星执旗 维萝: 先通过前线封锁再来见我。")
    return
  }

  if (!state.flags.vanguardDefeated) {
    startTrainerBattle("vanguard")
    return
  }

  addDialogue("蚀星执旗 维萝: 这次算你赢。去拿你的道馆通行证吧。")
}

function interactGymAide() {
  if (state.flags.gymWon) {
    addDialogue("试炼官 赛弥: 你已经拿下徽章了，后面的挑战会更考验应变。")
    return
  }

  if (!state.flags.gymAideDefeated) {
    startTrainerBattle("gym_aide")
    return
  }

  addDialogue("试炼官 赛弥: 热身很扎实，你现在可以直接挑战馆主阿斯特拉。")
}

function interactLeader() {
  if (!state.flags.gymPass) {
    if (typeof showVNDialogue === "function") {
      showVNDialogue([
        {
          position: "right",
          name: "馆主 阿斯特拉",
          portrait: "leader",
          text: "没有教授的通行证，你还不能接受星辉道馆的试炼。",
        },
        {
          position: "right",
          name: "馆主 阿斯特拉",
          portrait: "leader",
          text: "先去完成教授交代的考验，再来接受我的挑战。",
        },
      ])
    } else {
      addDialogue("馆主阿斯特拉: 没有教授的通行证，你还不能接受星辉道馆的试炼。")
    }
    return
  }

  if (!state.flags.gymWon) {
    if (!state.flags.gymCounterAidClaimed) {
      if (typeof showVNDialogue === "function") {
        showVNDialogue(
          [
            {
              position: "right",
              name: "馆主 阿斯特拉",
              portrait: "leader",
              text: "你终于来了。星辉道馆的试炼，是真正的意志检验。",
            },
            {
              position: "right",
              name: "馆主 阿斯特拉",
              portrait: "leader",
              text: "挑战之前，我可以给你一份对策补给。准备好了，再来见我。",
            },
          ],
          {
            onComplete: () => {
              openChoice("馆主阿斯特拉 · 道馆试炼前整备", [
                {
                  label: "领取对策补给后挑战",
                  description: "获得超级药 x1、战斗活力剂 x1、守护强化剂 x1，再开始馆主战。",
                  onSelect: () => {
                    closeChoice()
                    state.flags.gymCounterAidClaimed = true
                    addInventoryItem("super_potion", 1)
                    addInventoryItem("battle_tonic", 1)
                    addInventoryItem("guard_tonic", 1)
                    addDialogue("馆主阿斯特拉: 我希望你败在策略，而不是败在准备不足。")
                    addDialogue("你获得了道馆对策补给。")
                    queueSave()
                    startTrainerBattle("leader")
                  },
                },
                {
                  label: "直接挑战",
                  description: "不领取补给，立即开始馆主战。",
                  onSelect: () => {
                    closeChoice()
                    startTrainerBattle("leader")
                  },
                },
              ])
            },
          }
        )
      } else {
        openChoice("馆主阿斯特拉 · 道馆试炼前整备", [
          {
            label: "领取对策补给后挑战",
            description: "获得超级药 x1、战斗活力剂 x1、守护强化剂 x1，再开始馆主战。",
            onSelect: () => {
              closeChoice()
              state.flags.gymCounterAidClaimed = true
              addInventoryItem("super_potion", 1)
              addInventoryItem("battle_tonic", 1)
              addInventoryItem("guard_tonic", 1)
              addDialogue("馆主阿斯特拉: 我希望你败在策略，而不是败在准备不足。")
              addDialogue("你获得了道馆对策补给。")
              queueSave()
              startTrainerBattle("leader")
            },
          },
          {
            label: "直接挑战",
            description: "不领取补给，立即开始馆主战。",
            onSelect: () => {
              closeChoice()
              startTrainerBattle("leader")
            },
          },
        ])
      }
      return
    }
    startTrainerBattle("leader")
    return
  }

  if (state.flags.firstGymRewardPending) {
    addDialogue("馆主阿斯特拉: 你已通过首个试炼。先回城找教授领取你的定制奖励吧。")
    return
  }

  addDialogue("馆主阿斯特拉: 继续扩充你的图鉴吧。更辽阔的地区在等你。")
}

function interactMerchant() {
  openMerchantMainMenu()
}

const MERCHANT_PAGE_SIZE = 6
const merchantCategoryOrder = [
  "ball",
  "heal",
  "battle",
  "utility",
  "tm",
  "evolution",
  "berry",
  "ingredient",
  "treasure",
  "key",
]

function getMerchantCategories(stock) {
  const grouped = new Map()
  for (const entry of stock) {
    const item = itemCatalog[entry.itemId]
    if (!item) {
      continue
    }
    const category = item.category || "utility"
    if (!grouped.has(category)) {
      grouped.set(category, [])
    }
    grouped.get(category).push(entry)
  }

  return [...grouped.entries()]
    .map(([category, entries]) => ({ category, entries }))
    .sort((left, right) => {
      const leftIndex = merchantCategoryOrder.indexOf(left.category)
      const rightIndex = merchantCategoryOrder.indexOf(right.category)
      const safeLeft = leftIndex === -1 ? merchantCategoryOrder.length : leftIndex
      const safeRight = rightIndex === -1 ? merchantCategoryOrder.length : rightIndex
      return safeLeft - safeRight
    })
}

function openMerchantMainMenu() {
  const stock = getMerchantStock()
  const categories = getMerchantCategories(stock)
  const options = categories.map(({ category, entries }) => {
    const preview = entries
      .slice(0, 2)
      .map((entry) => itemCatalog[entry.itemId]?.name)
      .filter(Boolean)
      .join("、")
    return {
      label: `${itemCategoryNames[category] || category}（${entries.length}）`,
      description: preview ? `货架示例：${preview}` : "查看该分类道具。",
      onSelect: () => {
        openMerchantCategoryPage(category, 0)
      },
    }
  })

  options.push({
    label: "出售宝物",
    description: "将背包中的宝物道具兑换金币。",
    onSelect: () => {
      openTreasureSellMenu()
    },
  })

  options.push({
    label: "离开商店",
    description: "结束本次交易。",
    onSelect: () => {
      closeChoice()
      addDialogue("罗文: 有需要再来，我这边会持续补货。")
    },
  })

  openChoice("商店老板 罗文 · 分类货架", options)
}

function openMerchantCategoryPage(category, pageIndex = 0) {
  const stock = getMerchantStock()
  const entries = stock.filter((entry) => itemCatalog[entry.itemId]?.category === category)
  if (entries.length === 0) {
    openMerchantMainMenu()
    return
  }

  const totalPages = Math.max(1, Math.ceil(entries.length / MERCHANT_PAGE_SIZE))
  const page = clamp(pageIndex, 0, totalPages - 1)
  const start = page * MERCHANT_PAGE_SIZE
  const visible = entries.slice(start, start + MERCHANT_PAGE_SIZE)
  const categoryName = itemCategoryNames[category] || category
  const options = visible.map((entry) => {
    const item = itemCatalog[entry.itemId]
    const quantity = entry.quantity || 1
    const totalPrice =
      typeof getBalancedPrice === "function" ? getBalancedPrice(item.price * quantity) : item.price * quantity
    const unitLabel = quantity > 1 ? `x${quantity}` : ""
    return {
      label: `${item.name}${unitLabel} · ${totalPrice} 金币`,
      description: item.description,
      onSelect: () => {
        closeChoice()
        purchaseItemFromShop(entry.itemId, quantity)
        openMerchantCategoryPage(category, page)
      },
    }
  })

  if (totalPages > 1 && page > 0) {
    options.push({
      label: "上一页",
      description: `查看 ${categoryName} 的上一页货架。`,
      onSelect: () => {
        openMerchantCategoryPage(category, page - 1)
      },
    })
  }
  if (totalPages > 1 && page < totalPages - 1) {
    options.push({
      label: "下一页",
      description: `查看 ${categoryName} 的下一页货架。`,
      onSelect: () => {
        openMerchantCategoryPage(category, page + 1)
      },
    })
  }

  options.push({
    label: "返回分类列表",
    description: "切换到其它道具分类。",
    onSelect: () => {
      openMerchantMainMenu()
    },
  })

  options.push({
    label: "离开商店",
    description: "结束本次交易。",
    onSelect: () => {
      closeChoice()
      addDialogue("罗文: 祝你一路顺风，有需要随时回来补给。")
    },
  })

  openChoice(`商店 · ${categoryName}（第 ${page + 1} / ${totalPages} 页）`, options)
}

function getMerchantStock() {
  const stock = [
    { itemId: "ball_crate", quantity: 1 },
    { itemId: "potion", quantity: 1 },
    { itemId: "name_card", quantity: 1 },
    { itemId: "oran_berry", quantity: 1 },
    { itemId: "field_ration", quantity: 1 },
    { itemId: "battle_tonic", quantity: 1 },
    { itemId: "guard_tonic", quantity: 1 },
  ]

  if (state.storyStage >= 2) {
    stock.push({ itemId: "super_potion", quantity: 1 })
    stock.push({ itemId: "great_ball_case", quantity: 1 })
    stock.push({ itemId: "spark_tm", quantity: 1 })
    stock.push({ itemId: "repel_orb", quantity: 1 })
  }

  if (state.flags.gymWon) {
    stock.push({ itemId: "hyper_potion", quantity: 1 })
    stock.push({ itemId: "tidal_tm", quantity: 1 })
    stock.push({ itemId: "sun_core", quantity: 1 })
    stock.push({ itemId: "moon_core", quantity: 1 })
    stock.push({ itemId: "weapon_core", quantity: 1 })
    stock.push({ itemId: "void_shard", quantity: 1 })
  }

  return stock
}

function purchaseItemFromShop(itemId, quantity = 1) {
  const item = itemCatalog[itemId]
  if (!item) {
    addDialogue("罗文: 这件货品暂时缺货。")
    syncUi()
    return
  }
  if (item.unique && (state.player.inventory[itemId] || 0) > 0) {
    addDialogue(`罗文: ${item.name} 属于唯一物品，你已经拥有了。`)
    syncUi()
    return
  }
  const totalPrice =
    typeof getBalancedPrice === "function" ? getBalancedPrice(item.price * quantity) : item.price * quantity
  purchaseFromShop({
    price: totalPrice,
    success: () => {
      addInventoryItem(itemId, quantity)
      addDialogue(`罗文: 已为你打包 ${item.name}${quantity > 1 ? ` x${quantity}` : ""}。`)
    },
  })
}

function openTreasureSellMenu() {
  const treasureEntries = Object.entries(state.player.inventory).filter(([itemId, count]) => {
    return count > 0 && itemCatalog[itemId]?.kind === "treasure"
  })

  if (treasureEntries.length === 0) {
    closeChoice()
    addDialogue("罗文: 你背包里还没有可出售的宝物。")
    return
  }

  const options = treasureEntries.map(([itemId, count]) => {
    const item = itemCatalog[itemId]
    const sellPrice =
      typeof getBalancedSellPrice === "function" ? getBalancedSellPrice(item.sellPrice || 0) : item.sellPrice || 0
    return {
      label: `出售 ${item.name} · ${sellPrice} 金币`,
      description: `当前持有 ${count} 个。`,
      onSelect: () => {
        closeChoice()
        sellTreasureItem(itemId)
      },
    }
  })

  options.push({
    label: "返回商店",
    description: "继续购买道具。",
    onSelect: () => {
      openMerchantMainMenu()
    },
  })

  openChoice("出售宝物", options)
}

function sellTreasureItem(itemId) {
  const item = itemCatalog[itemId]
  if (!item || item.kind !== "treasure") {
    return
  }
  if (!consumeInventoryItem(itemId, 1)) {
    addDialogue(`罗文: 你的${item.name}数量不足。`)
    return
  }

  const sellPrice =
    typeof getBalancedSellPrice === "function" ? getBalancedSellPrice(item.sellPrice || 0) : item.sellPrice || 0
  state.player.coins += sellPrice
  addDialogue(`罗文: 成交。${item.name}已售出，获得 ${sellPrice} 金币。`)
  syncUi()
  queueSave()
}

function interactQuartermaster() {
  openChoice("补给员 诺亚", [
    {
      label: "首个道馆冲刺路线",
      description: "查看当前阶段的最短闭环路径与建议准备。",
      onSelect: () => {
        closeChoice()
        showFirstGymSprintGuide()
      },
    },
    {
      label: "领取本期补给",
      description: "领取新人补给；若缺少旧钓竿会一并补发。",
      onSelect: () => {
        closeChoice()
        deliverQuartermasterSupplies()
      },
    },
    {
      label: "询问旧钓竿",
      description: "查看旧钓竿的多种获取方式，不再卡地图进度。",
      onSelect: () => {
        closeChoice()
        addDialogue("补给员 诺亚: 旧钓竿现在不是硬门槛，11 号水路可先探索。")
        addDialogue("补给员 诺亚: 你可以从我这里拿，也可以通过水系伙伴线索或野外宝箱获得。")
      },
    },
    {
      label: "仓库规则说明",
      description: "查看队伍、后备区与家园仓库容量说明。",
      onSelect: () => {
        closeChoice()
        addDialogue(`补给员 诺亚: 当前规则是队伍 ${MAX_PARTY_SIZE}，后备区 ${MAX_RESERVE_SIZE}。`)
        addDialogue(`补给员 诺亚: 超出后备上限会自动送往家园仓库（上限 ${MAX_HOME_STORAGE_SIZE}）。`)
      },
    },
    {
      label: "结束对话",
      description: "稍后再来领取补给或查看说明。",
      onSelect: () => {
        closeChoice()
        addDialogue("补给员 诺亚: 路上注意安全，有需要随时找我。")
      },
    },
  ])
}

function healReserveMonsters() {
  for (const monster of state.player.reserve || []) {
    if (!monster) {
      continue
    }
    monster.currentHp = monster.maxHp
  }
}

function interactHomeSpring() {
  healParty()
  healReserveMonsters()
  addDialogue("恢复泉水: 队伍与后备区精灵已全部恢复到满状态。")
  syncUi()
  queueSave()
}

function interactHomeStorage() {
  addDialogue("家园仓库: 送入家园仓库的精灵会自动恢复为满状态。")
  addDialogue("家园仓库: 这里用于整备，不涉及权柄继承或神性仪式。")
  syncUi()
}

function buildHomeWishSpeciesList(mode = "missing") {
  const caught = Object.keys(state.pokedex?.caught || {})
  const portraits = state.pokedex?.portraits || {}
  const filtered = mode === "replace" ? caught : caught.filter((speciesId) => !portraits[speciesId])
  return filtered
    .filter((speciesId) => speciesData[speciesId])
    .sort((left, right) => speciesData[left].name.localeCompare(speciesData[right].name, "zh-CN"))
}

const HOME_WISH_RECORD_LIMIT = 36

function ensureHomeWishRecords() {
  if (!state.progress || typeof state.progress !== "object") {
    state.progress = {}
  }
  if (!Array.isArray(state.progress.homeWishRecords)) {
    state.progress.homeWishRecords = []
  }
  return state.progress.homeWishRecords
}

function recordHomeWishRequest(speciesId, mode) {
  const records = ensureHomeWishRecords()
  const normalizedMode = mode === "replace" ? "replace" : "missing"
  const timestamp = new Date().toISOString()
  const existingIndex = records.findIndex(
    (entry) => entry && entry.speciesId === speciesId && entry.mode === normalizedMode
  )
  const payload = {
    speciesId,
    mode: normalizedMode,
    requestedAt: timestamp,
  }
  if (existingIndex >= 0) {
    records.splice(existingIndex, 1)
  }
  records.unshift(payload)
  if (records.length > HOME_WISH_RECORD_LIMIT) {
    records.length = HOME_WISH_RECORD_LIMIT
  }
}

function buildWishProgressBar(completed, total) {
  const safeTotal = Math.max(1, Number(total) || 1)
  const safeCompleted = clamp(Number(completed) || 0, 0, safeTotal)
  const filled = clamp(Math.round((safeCompleted / safeTotal) * 8), 0, 8)
  return `${"■".repeat(filled)}${"□".repeat(8 - filled)}`
}

function getWishCandidateSnapshot(speciesId) {
  const runtimePending = pokedexPortraitState?.pendingBySpecies?.[speciesId] || null
  const runtimeCandidates = Array.isArray(runtimePending?.candidates) ? runtimePending.candidates : []
  if (runtimeCandidates.length > 0) {
    return runtimeCandidates
  }
  const savedCandidates = Array.isArray(state.pokedex?.candidates?.[speciesId]) ? state.pokedex.candidates[speciesId] : []
  return savedCandidates
}

function getHomeWishProgress(speciesId) {
  const candidates = getWishCandidateSnapshot(speciesId)
  const total = candidates.length
  const completed = candidates.filter((candidate) => candidate?.status === "completed" && candidate?.src).length
  const failed = candidates.filter((candidate) => candidate?.status === "failed").length
  const selectedKey = state.pokedex?.portraits?.[speciesId] || ""
  const pendingActive = Boolean(pokedexPortraitState?.pendingBySpecies?.[speciesId])
  const claimable = !selectedKey && completed >= 2
  const statusLabel = selectedKey
    ? "已领取"
    : claimable
      ? "可领取"
      : pendingActive
        ? "生成中"
        : failed >= 2 && total >= 2
          ? "生成失败"
          : total > 0
            ? "处理中"
            : "未提交"
  return {
    total,
    completed,
    failed,
    selectedKey,
    claimable,
    pendingActive,
    statusLabel,
    progressText: `${buildWishProgressBar(completed, Math.max(total, 2))} ${completed}/${Math.max(total, 2)}`,
  }
}

function chooseHomeWishPortraitCandidate(speciesId, selectedKey, selectedSrc) {
  if (!state.pokedex || typeof state.pokedex !== "object") {
    state.pokedex = { seen: {}, caught: {}, portraits: {}, candidates: {} }
  }
  if (!state.pokedex.portraits || typeof state.pokedex.portraits !== "object") {
    state.pokedex.portraits = {}
  }
  if (!state.pokedex.candidates || typeof state.pokedex.candidates !== "object") {
    state.pokedex.candidates = {}
  }

  state.pokedex.portraits[speciesId] = selectedKey
  const savedCandidates = Array.isArray(state.pokedex.candidates[speciesId]) ? state.pokedex.candidates[speciesId] : []
  state.pokedex.candidates[speciesId] = savedCandidates.map((candidate) => ({
    ...candidate,
    selected: candidate?.key === selectedKey,
  }))

  if (selectedSrc && typeof registerRuntimeArtAsset === "function") {
    registerRuntimeArtAsset("monsters", selectedKey, selectedSrc)
  }

  if (pokedexPortraitState?.pendingBySpecies?.[speciesId]) {
    delete pokedexPortraitState.pendingBySpecies[speciesId]
  }
}

function openHomeWishClaimChoice(speciesId) {
  const candidates = getWishCandidateSnapshot(speciesId)
    .filter((candidate) => candidate?.status === "completed" && candidate?.src)
    .slice(0, 2)

  if (candidates.length < 2) {
    closeChoice()
    addDialogue("许愿台守望者: 该精灵的候选立绘尚未全部完成，请稍后在许愿列表刷新。")
    syncUi()
    return
  }

  const speciesName = speciesData[speciesId]?.name || speciesId
  const options = candidates.map((candidate, index) => ({
    label: candidate.label || `候选 ${index === 0 ? "A" : "B"}`,
    description: `将该候选设为 ${speciesName} 的图鉴立绘。`,
    imageSrc: candidate.src,
    buttonLabel: "领取并使用",
    onSelect: () => {
      chooseHomeWishPortraitCandidate(speciesId, candidate.key, candidate.src)
      closeChoice()
      addDialogue(`${speciesName} 的图鉴立绘已定稿。`)
      syncUi()
      queueSave()
    },
  }))

  options.push({
    label: "暂不选择",
    description: "先保留候选，稍后再领取。",
    buttonLabel: "稍后再选",
    onSelect: () => {
      closeChoice()
      addDialogue("许愿台守望者: 候选立绘已保留，你可随时回来领取。")
      syncUi()
      queueSave()
    },
  })

  openChoice(`${speciesName} · 许愿立绘二选一`, options)
}

async function submitHomeWishRequest(speciesId, mode = "missing") {
  const speciesName = speciesData[speciesId]?.name || speciesId
  const forceRegenerate = mode === "replace"
  const result =
    typeof requestFirstEncounterPokedexPortraitChoices === "function"
      ? await requestFirstEncounterPokedexPortraitChoices(speciesId, { force: forceRegenerate })
      : { ok: false, status: "unsupported", message: "当前环境不支持立绘许愿。" }

  if (result?.ok || result?.status === "already-pending") {
    recordHomeWishRequest(speciesId, mode)
  }

  if (result?.status === "provider-unavailable") {
    addDialogue(`许愿台守望者: 立绘服务暂不可用（${result.message || "请稍后再试"}）。`)
  } else if (result?.status === "already-has-portrait" && mode !== "replace") {
    addDialogue(`许愿台守望者: ${speciesName} 已有立绘。若要重绘，请使用“更换立绘”。`)
  } else if (result?.status === "all-failed") {
    addDialogue(`许愿台守望者: ${speciesName} 的许愿提交失败，请稍后重试。`)
  } else if (result?.status === "already-pending") {
    addDialogue(`许愿台守望者: ${speciesName} 的许愿已在进行中，可在“许愿列表”查看进度。`)
  } else {
    addDialogue(`许愿台守望者: 已为 ${speciesName} 提交立绘许愿，可在“许愿列表”查看进度并领取。`)
  }

  syncUi()
  queueSave()
}

function buildHomeWishLedgerRecords() {
  const records = ensureHomeWishRecords()
  const merged = []
  const seen = new Set()

  for (const record of records) {
    if (!record || !record.speciesId || seen.has(record.speciesId)) {
      continue
    }
    seen.add(record.speciesId)
    merged.push({
      speciesId: record.speciesId,
      mode: record.mode === "replace" ? "replace" : "missing",
      requestedAt: record.requestedAt || "",
    })
  }

  for (const speciesId of Object.keys(state.pokedex?.candidates || {})) {
    if (seen.has(speciesId)) {
      continue
    }
    seen.add(speciesId)
    merged.push({
      speciesId,
      mode: state.pokedex?.portraits?.[speciesId] ? "replace" : "missing",
      requestedAt: "",
    })
  }

  return merged.filter((entry) => speciesData[entry.speciesId])
}

function openHomeWishLedger(pageIndex = 0) {
  const records = buildHomeWishLedgerRecords()
  if (records.length === 0) {
    closeChoice()
    addDialogue("许愿台守望者: 当前没有许愿记录。")
    syncUi()
    return
  }

  const pageSize = 8
  const totalPages = Math.max(1, Math.ceil(records.length / pageSize))
  const page = clamp(pageIndex, 0, totalPages - 1)
  const visible = records.slice(page * pageSize, page * pageSize + pageSize)

  const options = visible.map((record) => {
    const speciesName = speciesData[record.speciesId].name
    const progress = getHomeWishProgress(record.speciesId)
    return {
      label: `${speciesName} · ${progress.statusLabel}`,
      description: `${progress.progressText}${record.mode === "replace" ? " · 重绘" : " · 补全"}`,
      onSelect: () => openHomeWishRecordActions(record.speciesId, page),
    }
  })

  if (totalPages > 1 && page > 0) {
    options.push({
      label: "上一页",
      description: "查看上一页记录。",
      onSelect: () => openHomeWishLedger(page - 1),
    })
  }

  if (totalPages > 1 && page < totalPages - 1) {
    options.push({
      label: "下一页",
      description: "查看下一页记录。",
      onSelect: () => openHomeWishLedger(page + 1),
    })
  }

  options.push({
    label: "返回许愿台菜单",
    description: "返回上一级。",
    onSelect: () => interactHomeWish(),
  })

  openChoice(`许愿列表（第 ${page + 1} / ${totalPages} 页）`, options)
}

function openHomeWishRecordActions(speciesId, returnPage = 0) {
  const speciesName = speciesData[speciesId]?.name || speciesId
  const progress = getHomeWishProgress(speciesId)
  const defaultMode = state.pokedex?.portraits?.[speciesId] ? "replace" : "missing"
  const record = ensureHomeWishRecords().find((entry) => entry?.speciesId === speciesId)
  const mode = record?.mode === "replace" ? "replace" : defaultMode

  const options = []

  if (progress.claimable) {
    options.push({
      label: "领取立绘",
      description: "打开候选 A/B，或暂不选择。",
      onSelect: () => openHomeWishClaimChoice(speciesId),
    })
  }

  options.push({
    label: "重新提交许愿",
    description: mode === "replace" ? "重新生成并替换已有立绘。" : "重新生成该精灵图鉴立绘。",
    onSelect: async () => {
      closeChoice()
      await submitHomeWishRequest(speciesId, mode)
    },
  })

  options.push({
    label: "刷新进度",
    description: `当前进度：${progress.progressText}（${progress.statusLabel}）`,
    onSelect: () => openHomeWishRecordActions(speciesId, returnPage),
  })

  options.push({
    label: "返回许愿列表",
    description: "回到记录列表。",
    onSelect: () => openHomeWishLedger(returnPage),
  })

  openChoice(`${speciesName} · 许愿详情`, options)
}

function openHomeWishSpeciesPicker(mode = "missing", pageIndex = 0) {
  const list = buildHomeWishSpeciesList(mode)
  if (list.length === 0) {
    closeChoice()
    if (mode === "replace") {
      addDialogue("许愿台守望者: 你还没有可替换立绘的已捕获精灵。")
    } else {
      addDialogue("许愿台守望者: 当前已捕获精灵都有立绘，无需补全。")
    }
    return
  }

  const pageSize = 8
  const totalPages = Math.max(1, Math.ceil(list.length / pageSize))
  const page = clamp(pageIndex, 0, totalPages - 1)
  const visible = list.slice(page * pageSize, page * pageSize + pageSize)
  const forceRegenerate = mode === "replace"

  const options = visible.map((speciesId) => ({
    label: speciesData[speciesId].name,
    description: forceRegenerate ? "重生成该精灵图鉴立绘（会覆盖旧定稿）。" : "为该精灵生成图鉴立绘候选。",
    onSelect: async () => {
      closeChoice()
      await submitHomeWishRequest(speciesId, mode)
    },
  }))

  if (totalPages > 1 && page > 0) {
    options.push({
      label: "上一页",
      description: "查看上一页可选精灵。",
      onSelect: () => openHomeWishSpeciesPicker(mode, page - 1),
    })
  }
  if (totalPages > 1 && page < totalPages - 1) {
    options.push({
      label: "下一页",
      description: "查看下一页可选精灵。",
      onSelect: () => openHomeWishSpeciesPicker(mode, page + 1),
    })
  }
  options.push({
    label: "返回许愿台菜单",
    description: "返回许愿台主菜单。",
    onSelect: () => interactHomeWish(),
  })

  openChoice(
    `许愿台 · ${mode === "replace" ? "更换立绘" : "补全立绘"}（第 ${page + 1} / ${totalPages} 页）`,
    options
  )
}

function interactHomeWish() {
  openChoice("许愿台", [
    {
      label: "生成立绘",
      description: "从已捕获且暂无图鉴立绘的精灵中选择目标。",
      onSelect: () => openHomeWishSpeciesPicker("missing", 0),
    },
    {
      label: "更换立绘",
      description: "重新生成并替换已有图鉴立绘。",
      onSelect: () => openHomeWishSpeciesPicker("replace", 0),
    },
    {
      label: "许愿列表",
      description: "查看许愿记录、进度与可领取状态。",
      onSelect: () => openHomeWishLedger(0),
    },
    {
      label: "结束互动",
      description: "离开许愿台。",
      onSelect: () => {
        closeChoice()
        addDialogue("许愿台守望者: 愿光会在你需要时再次回应。")
      },
    },
  ])
}

function ensureHomeAlchemyPanelReady() {
  if (!inGameMenuState.open || inGameMenuState.activePanelId !== "alchemyPanelCard") {
    openUtilityPanel("alchemyPanelCard", { fromInGame: true, toggle: false })
  }
  renderAlchemyPanel()
}

function openDevourTargetPicker() {
  ensureHomeAlchemyPanelReady()
  const options = state.player.party.map((monster) => ({
    label: formatMonsterDisplayName(monster),
    description: `Lv.${monster.level} · 设为渊噬受体`,
    onSelect: () => {
      if (ui.devourTargetSelect) {
        ui.devourTargetSelect.value = monster.uid
      }
      openDevourElementPicker()
    },
  }))

  if (options.length === 0) {
    closeChoice()
    addDialogue("渊噬祭台: 你的队伍为空，无法选择渊噬受体。")
    syncUi()
    return
  }
  options.push({
    label: "返回渊噬祭台",
    description: "返回上一级。",
    onSelect: () => interactHomeDevourAltar(),
  })
  openChoice("渊噬祭台 · 选择受体", options)
}

function openDevourElementPicker() {
  ensureHomeAlchemyPanelReady()
  const options = fusionSelectableElements.map((element) => ({
    label: getFusionDisplayName(element),
    description: "设为渊噬元素",
    onSelect: () => {
      if (ui.devourElementSelect) {
        ui.devourElementSelect.value = element
      }
      openDevourConfirmChoice()
    },
  }))

  options.push({
    label: "返回受体选择",
    description: "重新选择渊噬受体。",
    onSelect: () => openDevourTargetPicker(),
  })
  openChoice("渊噬祭台 · 选择元素", options)
}

function openDevourConfirmChoice() {
  ensureHomeAlchemyPanelReady()
  const target = state.player.party.find((monster) => monster.uid === ui.devourTargetSelect?.value)
  const element = ui.devourElementSelect?.value || ""
  if (!target || !element) {
    closeChoice()
    addDialogue("渊噬祭台: 受体或元素无效，请重新选择。")
    syncUi()
    return
  }

  openChoice("渊噬祭台 · 二次确认", [
    {
      label: "确认执行渊噬",
      description: `${formatMonsterDisplayName(target)} 将吞噬 ${getFusionDisplayName(element)} 元素残响。`,
      onSelect: async () => {
        closeChoice()
        addDialogue("渊噬祭台: 仪式启动，正在执行渊噬同化。")
        await performDevourEvolution()
      },
    },
    {
      label: "重选元素",
      description: "返回元素列表重新选择。",
      onSelect: () => openDevourElementPicker(),
    },
    {
      label: "取消",
      description: "中止本次渊噬。",
      onSelect: () => {
        closeChoice()
        addDialogue("渊噬祭台: 你中止了本次渊噬。")
      },
    },
  ])
}

async function interactHomeDevourAltar() {
  const options = [
    {
      label: "选择受体与元素并执行渊噬",
      description: "按“受体->元素->二次确认”流程执行。",
      onSelect: () => openDevourTargetPicker(),
    },
    {
      label: "仅打开进化工坊",
      description: "在面板中手动配置渊噬参数。",
      onSelect: () => {
        closeChoice()
        ensureHomeAlchemyPanelReady()
        addDialogue("渊噬祭台: 已为你打开进化工坊。")
        syncUi()
      },
    },
  ]

  if (typeof hasAlchemyRollbackHistory === "function" && hasAlchemyRollbackHistory()) {
    options.push({
      label: "回退上一次吞噬/融合",
      description: "撤销最近一次渊噬或融合操作。",
      onSelect: () => {
        closeChoice()
        if (typeof rollbackLastAlchemyOperation === "function") {
          rollbackLastAlchemyOperation()
        }
      },
    })
  }

  options.push({
    label: "离开渊噬祭台",
    description: "暂不执行渊噬。",
    onSelect: () => {
      closeChoice()
      addDialogue("渊噬祭台: 你暂时中止了仪式。")
    },
  })

  openChoice("渊噬祭台", options)
}

function openFusionTargetPicker() {
  ensureHomeAlchemyPanelReady()
  const options = state.player.party.map((monster) => ({
    label: formatMonsterDisplayName(monster),
    description: `Lv.${monster.level} · 设为共鸣主体`,
    onSelect: () => {
      if (ui.fusionTargetSelect) {
        ui.fusionTargetSelect.value = monster.uid
      }
      openFusionPartnerPicker()
    },
  }))
  if (options.length === 0) {
    closeChoice()
    addDialogue("共鸣融合台: 你的队伍为空，无法执行融合共鸣。")
    syncUi()
    return
  }
  options.push({
    label: "返回共鸣融合台",
    description: "返回上一级。",
    onSelect: () => interactHomeFusionAltar(),
  })
  openChoice("共鸣融合台 · 选择主体", options)
}

function openFusionPartnerPicker() {
  ensureHomeAlchemyPanelReady()
  const options = state.player.reserve.map((monster) => ({
    label: formatMonsterDisplayName(monster),
    description: `Lv.${monster.level} · 设为共鸣素材`,
    onSelect: () => {
      if (ui.fusionPartnerSelect) {
        ui.fusionPartnerSelect.value = monster.uid
      }
      openFusionConfirmChoice()
    },
  }))
  if (options.length === 0) {
    closeChoice()
    addDialogue("共鸣融合台: 后备区没有可融合素材，请先准备素材精灵。")
    syncUi()
    return
  }
  options.push({
    label: "返回主体选择",
    description: "重新选择共鸣主体。",
    onSelect: () => openFusionTargetPicker(),
  })
  openChoice("共鸣融合台 · 选择素材", options)
}

function openFusionConfirmChoice() {
  ensureHomeAlchemyPanelReady()
  const target = state.player.party.find((monster) => monster.uid === ui.fusionTargetSelect?.value)
  const partner = state.player.reserve.find((monster) => monster.uid === ui.fusionPartnerSelect?.value)
  if (!target || !partner) {
    closeChoice()
    addDialogue("共鸣融合台: 融合主体或素材无效，请重新选择。")
    syncUi()
    return
  }

  openChoice("共鸣融合台 · 二次确认", [
    {
      label: "确认执行融合",
      description: `${formatMonsterDisplayName(target)} 将与 ${formatMonsterDisplayName(partner)} 建立共鸣。`,
      onSelect: async () => {
        closeChoice()
        addDialogue("共鸣融合台: 同调阵列启动，正在执行融合共鸣。")
        await performFusionEvolution()
      },
    },
    {
      label: "重选素材",
      description: "返回素材列表重新选择。",
      onSelect: () => openFusionPartnerPicker(),
    },
    {
      label: "取消",
      description: "中止本次融合。",
      onSelect: () => {
        closeChoice()
        addDialogue("共鸣融合台: 你中止了本次融合。")
      },
    },
  ])
}

async function interactHomeFusionAltar() {
  const options = [
    {
      label: "选择主体与素材并执行融合",
      description: "按“主体->素材->二次确认”流程执行。",
      onSelect: () => openFusionTargetPicker(),
    },
    {
      label: "仅打开进化工坊",
      description: "在面板中手动配置融合参数。",
      onSelect: () => {
        closeChoice()
        ensureHomeAlchemyPanelReady()
        addDialogue("共鸣融合台: 已为你打开进化工坊。")
        syncUi()
      },
    },
  ]

  if (typeof hasAlchemyRollbackHistory === "function" && hasAlchemyRollbackHistory()) {
    options.push({
      label: "回退上一次吞噬/融合",
      description: "撤销最近一次渊噬或融合操作。",
      onSelect: () => {
        closeChoice()
        if (typeof rollbackLastAlchemyOperation === "function") {
          rollbackLastAlchemyOperation()
        }
      },
    })
  }

  options.push({
    label: "离开共鸣融合台",
    description: "暂不执行融合。",
    onSelect: () => {
      closeChoice()
      addDialogue("共鸣融合台: 你离开了融合台。")
    },
  })

  openChoice("共鸣融合台", options)
}

function interactHomeSupply() {
  if (state.flags.homeSupplyClaimed) {
    addDialogue("补给台管理员: 今日家园补给已领取，祝你冒险顺利。")
    syncUi()
    return
  }

  state.flags.homeSupplyClaimed = true
  state.player.balls += 10
  addInventoryItem("potion", 10)
  addInventoryItem("repel_orb", 10)
  addDialogue("补给台管理员: 已免费发放家园补给：精灵球 +10，恢复药 x10，避怪丹 x10。")
  syncUi()
  queueSave()
}

function showFirstGymSprintGuide() {
  const stage = Number(state.storyStage) || 0
  if (stage <= 0 || state.player.party.length === 0) {
    addDialogue("冲刺路线: 第一步先找教授雪松领取初始伙伴。")
    addDialogue("冲刺路线: 拿到伙伴后直接走花冠大道，不要在支线逗留太久。")
    return
  }

  if (stage === 1) {
    addDialogue(`冲刺路线: 你当前捕捉进度 ${state.progress.wildCaptures} / 2。先在花冠大道草丛补满。`)
    addDialogue("冲刺路线: 完成后先击败蚀星先遣洛克，再去草原后段处理执旗官维萝。")
    return
  }

  if (stage === 2) {
    if (!state.flags.scoutDefeated) {
      addDialogue("冲刺路线: 下一步先击败蚀星先遣洛克。")
    } else {
      addDialogue("冲刺路线: 继续前往蒙德草原后段，击败蚀星执旗维萝。")
    }
    addDialogue("冲刺路线: 开打前建议带 2 枚以上回复道具，避免来回跑图。")
    return
  }

  if (stage === 3) {
    addDialogue("冲刺路线: 你已经完成路考，回城找教授领取道馆通行证。")
    addDialogue("冲刺路线: 领证后会恢复队伍并补给，可直接去道馆门口。")
    return
  }

  if (stage === 4 && !state.flags.gymWon) {
    addDialogue("冲刺路线: 目标已锁定为星辉道馆馆主阿斯特拉。")
    addDialogue("冲刺路线: 如果首战失利，先补给并调整换宠节奏再挑战。")
    return
  }

  addDialogue("冲刺路线: 首个道馆闭环已完成，接下来按目标栏推进后续区域。")
}

function deliverQuartermasterSupplies() {
  let grantedAnySupply = false

  if (!state.flags.bonusBallsClaimed) {
    state.flags.bonusBallsClaimed = true
    state.player.balls += 10
    addInventoryItem("ball_crate", 1)
    addDialogue("补给员 诺亚: 新人补给到位，免费送你 10 个精灵球和 1 份球类补给箱。")
    grantedAnySupply = true
  }

  if (!state.flags.oldRodClaimed || (state.player.inventory.old_rod || 0) <= 0) {
    addInventoryItem("old_rod", 1)
    state.flags.oldRodClaimed = true
    addDialogue("补给员 诺亚: 另外这根旧钓竿给你，11 号水路的水纹点就靠它调查。")
    grantedAnySupply = true
  }

  if (!grantedAnySupply) {
    addDialogue("补给员 诺亚: 记得把多余伙伴送回家园仓库，后备区最多只放 9 只。")
    return
  }

  state.flags.oldRodHintShown = true
  syncUi()
  queueSave()
}

function interactAlchemist() {
  openChoice("炼金师 芙拉", [
    {
      label: "共鸣融合教范",
      description: "查看融合路径与双体共鸣原则。",
      onSelect: () => {
        closeChoice()
        addDialogue("炼金师 芙拉: 融合之道是“连接”而非“吞并”，主流稳定形态是双体共鸣。")
        addDialogue("炼金师 芙拉: 地图上的 A/S/W 纹章点分别对应奥术、太阳、武器三类配方指引。")
        addDialogue("炼金师 芙拉: 徽章证明你的训练实力，但不等于直接继承古神权柄。")
      },
    },
    {
      label: "渊噬仪式教范",
      description: "了解渊噬路线与 Void 资源获取方式。",
      onSelect: () => {
        closeChoice()
        addDialogue("炼金师 芙拉: 渊噬是“夺取与同化”的危险路径，不应变成无脑强度通道。")
        addDialogue("炼金师 芙拉: 摇动草丛与洞窟卷尘地面是最稳定的 Void 来源。")
        addDialogue("炼金师 芙拉: 三条进化路线应长期共存，策略优先于数值膨胀。")
      },
    },
    {
      label: "结束对话",
      description: "关闭教学菜单。",
      onSelect: () => {
        closeChoice()
        addDialogue("炼金师 芙拉: 需要复盘配方时再来找我。")
      },
    },
  ])
}

function interactRanger() {
  addDialogue("洞窟向导 雷奥: 卷尘地面会喷出资源，也可能冒出高等级野生怪兽。")
  addDialogue("洞窟向导 雷奥: 记得把探索到的纹章交给遗迹门，你离神兽越来越近了。")
}

function interactFisher() {
  openChoice("水路调查员 柚", [
    {
      label: "水纹遭遇说明",
      description: "查看 11 号水路的核心遭遇机制。",
      onSelect: () => {
        closeChoice()
        addDialogue("水路调查员 柚: 水纹水面在 11 号水路最常见，垂钓与水面巡游会触发不同遭遇。")
        addDialogue("水路调查员 柚: 看到连续波纹时大胆靠近，常常会有稀有掉落。")
      },
    },
    {
      label: "旧钓竿获取方式",
      description: "补给员、水系伙伴、野外宝箱三种路线。",
      onSelect: () => {
        closeChoice()
        addDialogue("水路调查员 柚: 旧钓竿可在星辉城找补给员诺亚领取。")
        addDialogue("水路调查员 柚: 你也可能从水系伙伴线索或野外宝箱里拿到，不会卡过图。")
      },
    },
    {
      label: "水路配队建议",
      description: "查看水路探索与战斗的实用建议。",
      onSelect: () => {
        closeChoice()
        addDialogue("水路调查员 柚: 带一只水系或电系伙伴会更稳，水面遭遇通常速度更高。")
        addDialogue("水路调查员 柚: 背包里备好回复道具和球类补给，连续遭遇时更省回城时间。")
      },
    },
  ])
}

function interactBreeder() {
  if (!state.flags.gymWon) {
    addDialogue("果园育成师 玛芙: 先拿下道馆徽章，再来谈更高阶的属性轮换。")
    return
  }
  if (!state.flags.breederDefeated) {
    startTrainerBattle("breeder")
    return
  }
  addDialogue("果园育成师 玛芙: 你已经能在双属性配队里保持节奏了，去海湾继续提升吧。")
}

function interactCaptain() {
  if (!state.flags.breederDefeated) {
    addDialogue("海湾队长 赛伦: 先在果园完成育成考核，我再给你开海湾实战权限。")
    return
  }
  if (!state.flags.captainDefeated) {
    startTrainerBattle("captain")
    return
  }
  addDialogue("海湾队长 赛伦: 不错，接下来去流星高岭，那里更考验换宠与抗性。")
}

function interactAce() {
  if (!state.flags.captainDefeated) {
    addDialogue("高岭王牌 维迦: 先完成海湾赛程，再来挑战高岭节奏对抗。")
    return
  }
  if (!state.flags.aceDefeated) {
    startTrainerBattle("ace")
    return
  }
  addDialogue("高岭王牌 维迦: 你已经具备群岛级别的对战调度能力，去找守望者伊诺。")
}

function interactWarden() {
  if (!state.flags.aceDefeated) {
    addDialogue("群岛守望者 伊诺: 高岭考核还没结束，先证明你的稳定性。")
    return
  }
  if (!state.flags.wardenDefeated) {
    startTrainerBattle("warden")
    return
  }
  addDialogue("群岛守望者 伊诺: 传送潮门已对你开放。你可直达遗迹或继续扩充图鉴。")
}

function sanitizePlayerName(input) {
  const normalized = String(input || "").replace(/\s+/g, " ").trim()
  if (!normalized) {
    return "旅行者"
  }
  return normalized.slice(0, 12)
}

function buildOpeningPortraitPrompt(playerName, styleHint = "") {
  const base = [
    `${playerName}, single JRPG trainer portrait, full body front view`,
    "anime style, clean line art, bright adventure tone",
    "solid white background, no text, no watermark",
  ]
  const hint = String(styleHint || "").trim()
  if (hint) {
    base.push(hint)
  }
  return base.join(", ")
}

const GOLDEN_PROLOGUE_PATH_CONFIG = Object.freeze({
  fusion: {
    label: "融合",
    legendarySpeciesId: "solaraith",
    legendaryCubSpeciesId: "solaraith_cub",
    demoTitle: "融合试炼：地脉与翼风",
  },
  devour: {
    label: "吞噬",
    legendarySpeciesId: "abyssalor",
    legendaryCubSpeciesId: "abyssalor_cub",
    demoTitle: "吞噬试炼：古龙与神剑",
  },
})

const GOLDEN_PROLOGUE_CINEMATIC_TIMELINE = Object.freeze([
  {
    speaker: "旁白",
    line: "太初纪元之后，星辉大陆由两种神性共同维系：融合与吞噬。",
    hint: "神兽序章 · 第一幕",
    leftKeys: ["solaraith_full", "solaraith"],
    rightKeys: ["abyssalor_full", "abyssalor"],
    focus: "split",
    state: "opening",
    durationMs: 2400,
  },
  {
    speaker: "旁白",
    line: "今夜，曜辉圣兽与渊海古龙在云海裂隙再度开战，决定世界下一段秩序。",
    hint: "世界观导入",
    leftKeys: ["solaraith_full", "solaraith"],
    rightKeys: ["abyssalor_full", "abyssalor"],
    focus: "split",
    state: "opening",
    durationMs: 2400,
  },
  {
    speaker: "曜辉圣兽",
    line: "融合守序，万象同频。让分裂的大陆重新连成一体！",
    hint: "融合阵营宣言",
    leftKeys: ["solaraith_full", "solaraith"],
    rightKeys: ["abyssalor_full", "abyssalor"],
    focus: "left",
    state: "clash",
    durationMs: 2600,
  },
  {
    speaker: "渊海古龙",
    line: "吞噬即进化。陈旧秩序必须被卷走，只留下真正强者的意志。",
    hint: "吞噬阵营宣言",
    leftKeys: ["solaraith_full", "solaraith"],
    rightKeys: ["abyssalor_full", "abyssalor"],
    focus: "right",
    state: "clash",
    durationMs: 2600,
  },
  {
    speaker: "旁白",
    line: "两股神性能量在你眼前冲撞，白金色与深海紫交织成一道裂隙。",
    hint: "神战升温",
    leftKeys: ["solaraith_full", "solaraith"],
    rightKeys: ["abyssalor_full", "abyssalor"],
    focus: "split",
    state: "clash",
    durationMs: 2500,
  },
  {
    speaker: "旁白",
    line: "你看见两条命运分岔：一条通向共鸣与协同，一条通向掠夺与极限。",
    hint: "阵营抉择前夜",
    leftKeys: ["solaraith_full", "solaraith"],
    rightKeys: ["abyssalor_full", "abyssalor"],
    focus: "split",
    state: "clash",
    durationMs: 2200,
  },
  {
    speaker: "旁白",
    line: "你的意志被卷入神战核心。现在，选择你要追随的流派。",
    hint: "即将进入流派选择",
    leftKeys: ["solaraith_full", "solaraith"],
    rightKeys: ["abyssalor_full", "abyssalor"],
    focus: "split",
    state: "choice",
    durationMs: 2200,
  },
])

function sanitizeGoldenPath(path) {
  return path === "fusion" || path === "devour" ? path : ""
}

function getGoldenPathConfig(path) {
  const normalized = sanitizeGoldenPath(path)
  return normalized ? GOLDEN_PROLOGUE_PATH_CONFIG[normalized] : null
}

const GOLDEN_MIRROR_NAME_PRESETS = Object.freeze([
  "旅行者",
  "星火",
  "青岚",
  "白露",
  "辰星",
  "岚影",
])

let goldenMirrorIdentityImageCache = ""

function getGoldenMirrorIdentityImageSrc() {
  if (goldenMirrorIdentityImageCache) {
    return goldenMirrorIdentityImageCache
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 900">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#edf5ff"/>
        <stop offset="100%" stop-color="#d8e8fb"/>
      </linearGradient>
      <linearGradient id="mirror" x1="0" y1="0" x2="0.9" y2="1">
        <stop offset="0%" stop-color="#f7fbff"/>
        <stop offset="100%" stop-color="#bdd7f4"/>
      </linearGradient>
      <linearGradient id="coat" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#6ea2e0"/>
        <stop offset="100%" stop-color="#466fa8"/>
      </linearGradient>
    </defs>
    <rect width="720" height="900" fill="url(#bg)"/>
    <rect x="82" y="76" width="556" height="748" rx="42" fill="#a8c0de"/>
    <rect x="118" y="112" width="484" height="676" rx="30" fill="url(#mirror)"/>
    <ellipse cx="360" cy="778" rx="192" ry="28" fill="#9fb9da" opacity="0.32"/>
    <circle cx="300" cy="404" r="66" fill="#ffd8bf"/>
    <circle cx="420" cy="404" r="66" fill="#ffe1ca" opacity="0.82"/>
    <path d="M246 540c18-66 78-104 126-104s108 38 126 104v164H246z" fill="url(#coat)"/>
    <path d="M272 566c16-40 48-66 88-66s72 26 88 66" stroke="#d8ebff" stroke-width="18" stroke-linecap="round" fill="none"/>
    <path d="M288 384c16-32 42-48 74-48s58 16 74 48" stroke="#7c5a4f" stroke-width="20" stroke-linecap="round" fill="none"/>
    <path d="M304 380c12-24 30-36 58-36s46 12 58 36" stroke="#9f7566" stroke-width="12" stroke-linecap="round" fill="none"/>
    <path d="M470 270c-22 14-48 18-74 18s-52-4-74-18" stroke="#f4fbff" stroke-width="8" fill="none" opacity="0.75"/>
    <path d="M470 300c-22 14-48 18-74 18s-52-4-74-18" stroke="#f4fbff" stroke-width="8" fill="none" opacity="0.6"/>
  </svg>`
  goldenMirrorIdentityImageCache = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
  return goldenMirrorIdentityImageCache
}

function getGoldenCinematicMonsterSrc(keys = []) {
  const candidates = Array.isArray(keys) ? keys : [keys]
  for (const key of candidates) {
    if (!key) {
      continue
    }
    const image = getArtImage("monsters", key)
    if (image?.src) {
      return image.src
    }
  }
  return ""
}

function setGoldenCinematicPortrait(element, src) {
  if (!element) {
    return
  }
  if (!src) {
    element.removeAttribute("src")
    element.classList.add("hidden")
    return
  }
  element.src = src
  element.classList.remove("hidden")
}

function setGoldenCinematicOverlayVisible(visible, frame = {}, mode = "fusion") {
  if (!ui.prologueCinematicOverlay) {
    if (!ui.evolutionOverlay) {
      return
    }
    if (visible) {
      ui.evolutionOverlay.dataset.mode = mode
      ui.evolutionOverlay.classList.remove("hidden")
      if (ui.evolutionOverlayText) {
        ui.evolutionOverlayText.textContent = String(frame?.line || frame?.text || "神兽序章 · 演出中...")
      }
      return
    }
    ui.evolutionOverlay.classList.add("hidden")
    delete ui.evolutionOverlay.dataset.mode
    return
  }

  if (visible) {
    const speaker = String(frame?.speaker || "旁白").trim()
    const line = String(frame?.line || frame?.text || "神兽序章仍在继续……").trim()
    const hint = String(frame?.hint || "序章演出中").trim()
    const focus = String(frame?.focus || "split").trim()
    const stateKey = String(frame?.state || "opening").trim()
    const leftImageSrc = String(frame?.leftImageSrc || "").trim() || getGoldenCinematicMonsterSrc(frame?.leftKeys)
    const rightImageSrc = String(frame?.rightImageSrc || "").trim() || getGoldenCinematicMonsterSrc(frame?.rightKeys)

    ui.prologueCinematicOverlay.dataset.mode = mode
    ui.prologueCinematicOverlay.dataset.focus = focus
    ui.prologueCinematicOverlay.dataset.state = stateKey
    ui.prologueCinematicOverlay.classList.remove("hidden")

    if (ui.prologueCinematicSpeaker) {
      ui.prologueCinematicSpeaker.textContent = speaker
    }
    if (ui.prologueCinematicLine) {
      ui.prologueCinematicLine.textContent = line
    }
    if (ui.prologueCinematicHint) {
      ui.prologueCinematicHint.textContent = hint
    }
    setGoldenCinematicPortrait(ui.prologueCinematicLeft, leftImageSrc)
    setGoldenCinematicPortrait(ui.prologueCinematicRight, rightImageSrc)
    return
  }

  ui.prologueCinematicOverlay.classList.add("hidden")
  delete ui.prologueCinematicOverlay.dataset.mode
  delete ui.prologueCinematicOverlay.dataset.focus
  delete ui.prologueCinematicOverlay.dataset.state
  setGoldenCinematicPortrait(ui.prologueCinematicLeft, "")
  setGoldenCinematicPortrait(ui.prologueCinematicRight, "")
}

let _cinematicSkipRequested = false

async function playGoldenCinematicFrames(frames, mode = "fusion") {
  const normalizedFrames = Array.isArray(frames) ? frames : []
  if (normalizedFrames.length === 0) {
    return
  }
  _cinematicSkipRequested = false

  // 创建跳过按钮
  let skipBtn = document.getElementById("cinematic-skip-btn")
  if (!skipBtn) {
    skipBtn = document.createElement("button")
    skipBtn.id = "cinematic-skip-btn"
    skipBtn.textContent = "跳过 ▶▶"
    skipBtn.style.cssText = "position:fixed;top:20px;right:20px;z-index:99999;padding:8px 20px;background:rgba(0,0,0,0.7);color:#ffcc00;border:1px solid rgba(255,204,0,0.4);font-size:14px;cursor:pointer;border-radius:4px;font-family:inherit;transition:background 0.2s;"
    skipBtn.onmouseenter = () => { skipBtn.style.background = "rgba(255,204,0,0.2)" }
    skipBtn.onmouseleave = () => { skipBtn.style.background = "rgba(0,0,0,0.7)" }
    document.body.appendChild(skipBtn)
  }
  skipBtn.style.display = "block"
  skipBtn.onclick = () => { _cinematicSkipRequested = true }

  // ESC 也可跳过
  const skipOnEsc = (e) => { if (e.key === "Escape") _cinematicSkipRequested = true }
  window.addEventListener("keydown", skipOnEsc)

  setGoldenCinematicOverlayVisible(true, normalizedFrames[0], mode)
  for (const frame of normalizedFrames) {
    if (_cinematicSkipRequested) break
    setGoldenCinematicOverlayVisible(true, frame, mode)
    // 被跳过时不等待
    const dur = Math.max(280, Number(frame?.durationMs) || 1000)
    const step = 50
    for (let waited = 0; waited < dur && !_cinematicSkipRequested; waited += step) {
      await sleep(step)
    }
  }

  skipBtn.style.display = "none"
  window.removeEventListener("keydown", skipOnEsc)
  setGoldenCinematicOverlayVisible(false)
}

async function playGoldenPrologueCinematic() {
  addDialogue("系统: 序章开始。两大神兽的神性战争正在你眼前重演。")
  await playGoldenCinematicFrames(GOLDEN_PROLOGUE_CINEMATIC_TIMELINE, "fusion")
  addDialogue("系统: 序章结束。你即将决定自己的进化流派。")
}

function applyGoldenPathSelection(path) {
  const config = getGoldenPathConfig(path)
  if (!config) {
    return false
  }
  state.progress.chosenPath = path
  state.progress.chosenLegendarySpeciesId = config.legendarySpeciesId
  state.progress.chosenLegendaryCubSpeciesId = config.legendaryCubSpeciesId
  state.flags.goldenPathChosen = true
  addDialogue(
    `你在梦境中选择了「${config.label}」之道，${speciesData[config.legendarySpeciesId].name}回应了你的意志。`
  )
  queueSave()
  return true
}

function createGoldenSingleStepChoice({
  title,
  label,
  description,
  buttonLabel = "继续",
  imageKeys = [],
  imageAlt = "",
}) {
  return new Promise((resolve) => {
    openChoice(title, [
      {
        label,
        description,
        buttonLabel,
        imageSrc: getGoldenCinematicMonsterSrc(imageKeys),
        imageAlt,
        onSelect: () => {
          closeChoice()
          resolve()
        },
      },
    ])
  })
}

async function playGoldenNearVictoryTransition(path) {
  const mode = sanitizeGoldenPath(path) || "fusion"
  const leftKeys = mode === "fusion" ? ["solaraith_full", "solaraith"] : ["abyssalor_full", "abyssalor"]
  const rightKeys = mode === "fusion" ? ["abyssalor_full", "abyssalor"] : ["solaraith_full", "solaraith"]
  const focusedSpeaker = mode === "fusion" ? "曜辉圣兽" : "渊海古龙"
  const transitionFrames = [
    {
      speaker: focusedSpeaker,
      line: "神战天平正在倾斜。再一击，就能击溃对面核心！",
      hint: "梦境终盘 · 胜负将分",
      leftKeys,
      rightKeys,
      focus: mode === "fusion" ? "left" : "right",
      state: "clash",
      durationMs: 1900,
    },
    {
      speaker: "旁白",
      line: "就在你准备下达最后指令时，整片战场像玻璃一样出现裂纹。",
      hint: "空间碎裂",
      leftKeys,
      rightKeys,
      focus: "split",
      state: "fracture",
      durationMs: 1700,
    },
    {
      speaker: "旁白",
      line: "白光吞没了神兽与战场，只剩下心跳与镜面上的冷雾。",
      hint: "梦境坍缩",
      leftKeys: [],
      rightKeys: [],
      focus: "split",
      state: "fracture",
      durationMs: 1700,
    },
    {
      speaker: "旁白",
      line: "你猛然惊醒，发现自己正站在镜前。",
      hint: "镜前登记即将开始",
      leftKeys: ["solaraith_cub"],
      rightKeys: ["abyssalor_cub"],
      focus: "split",
      state: "choice",
      durationMs: 1500,
    },
  ]
  await playGoldenCinematicFrames(transitionFrames, mode)
}

async function runGoldenPathDemo(path) {
  const config = getGoldenPathConfig(path)
  if (!config) {
    return
  }

  addDialogue(`系统: ${config.demoTitle}`)
  if (path === "fusion") {
    await createGoldenSingleStepChoice({
      title: "融合试炼 · 步骤 1/3：锁定主体",
      label: "主体：震铠龙鼹",
      description: "地面系主体负责承载融合后体态与基础耐久。",
      buttonLabel: "确认主体",
      imageKeys: ["quakeburrow_tutorial", "quakeburrow"],
      imageAlt: "融合主体",
    })
    await createGoldenSingleStepChoice({
      title: "融合试炼 · 步骤 2/3：选择素材",
      label: "素材：风棘隼",
      description: "有翼系素材提供机动与风压特征。",
      buttonLabel: "确认素材",
      imageKeys: ["windthorn_tutorial", "windthorn"],
      imageAlt: "融合素材",
    })
    await playEvolutionAnimation({
      mode: "fusion",
      element: "ground",
      monsterName: "震铠龙鼹",
    })
    await createGoldenSingleStepChoice({
      title: "融合试炼 · 步骤 3/3：确认结果",
      label: "新立绘已解锁：曜辉共鸣形态（演示）",
      description: "你亲眼看到融合后的新形态立绘，后续可在主线继续强化。",
      buttonLabel: "继续剧情",
      imageKeys: ["evo_solaraith_grass_resonance_t1", "solaraith_full"],
      imageAlt: "融合结果立绘",
    })
    addDialogue("你完成了第一次融合共鸣，地脉与翼风在你体内留下了稳定印记。")
  } else {
    await createGoldenSingleStepChoice({
      title: "吞噬试炼 · 步骤 1/3：锁定受体",
      label: "受体：渊海古龙",
      description: "吞噬流派先指定主导意志，再注入外部权能。",
      buttonLabel: "确认受体",
      imageKeys: ["abyssalor_full", "abyssalor"],
      imageAlt: "吞噬受体",
    })
    await createGoldenSingleStepChoice({
      title: "吞噬试炼 · 步骤 2/3：注入权能",
      label: "素材：神剑权能",
      description: "将神剑权能作为吞噬素材投入祭仪核心。",
      buttonLabel: "注入权能",
      imageKeys: ["abyssalor_cub", "abyssalor"],
      imageAlt: "吞噬素材",
    })
    await playEvolutionAnimation({
      mode: "devour",
      element: "weapon",
      monsterName: "渊海古龙",
    })
    await createGoldenSingleStepChoice({
      title: "吞噬试炼 · 步骤 3/3：确认结果",
      label: "新立绘已解锁：渊海古龙·神剑同化形态",
      description: "吞噬完成后，古龙获得神剑锋芒回响并显现新立绘。",
      buttonLabel: "继续剧情",
      imageKeys: ["abyssalor_devour_sword", "abyssalor_full"],
      imageAlt: "吞噬结果立绘",
    })
    addDialogue("吞噬仪式完成，古龙获得了神剑权能的锋芒回响。")
  }

  await playGoldenNearVictoryTransition(path)
  addDialogue("系统: 你从神战梦境中苏醒，镜前登记流程已解锁。")
  openMirrorIdentityChoice()
}

function openGoldenPathChoice() {
  openChoice("古神试炼：你支持哪一方？", [
    {
      label: "融合神兽阵营",
      description: "强调连接与共鸣。你将手把手体验“主体 + 素材”融合，并看到新立绘。",
      buttonLabel: "选择融合流派",
      imageSrc: getGoldenCinematicMonsterSrc(["solaraith_full", "solaraith"]),
      onSelect: () => {
        closeChoice()
        applyGoldenPathSelection("fusion")
        void runGoldenPathDemo("fusion")
      },
    },
    {
      label: "吞噬神兽阵营",
      description: "强调夺取与同化。你将手把手体验“受体 + 权能”吞噬，并看到新立绘。",
      buttonLabel: "选择吞噬流派",
      imageSrc: getGoldenCinematicMonsterSrc(["abyssalor_full", "abyssalor"]),
      onSelect: () => {
        closeChoice()
        applyGoldenPathSelection("devour")
        void runGoldenPathDemo("devour")
      },
    },
  ])
}

function openGoldenPrologueEntryChoice() {
  if (state.flags?.goldenPrologueCompleted || state.choice) {
    return
  }

  openChoice("神兽序章（黄金10分钟开场）", [
    {
      label: "进入神兽对战序章",
      description: "先观看两大神兽对战与世界观导入，再进行流派选择。",
      buttonLabel: "开始过场",
      imageSrc: getGoldenCinematicMonsterSrc(["solaraith_full", "abyssalor_full"]),
      onSelect: () => {
        closeChoice()
        void (async () => {
          await playGoldenPrologueCinematic()
          openGoldenPathChoice()
        })()
      },
    },
  ])
}

function submitProloguePortraitPrompt(prompt, sourceLabel) {
  const normalizedPrompt = String(prompt || "").trim()
  if (!normalizedPrompt) {
    addDialogue("系统: 提示词为空，请补充后再提交。")
    return false
  }
  if (ui.playerArtPrompt) {
    ui.playerArtPrompt.value = normalizedPrompt
  }
  playerArtState.prompt = normalizedPrompt
  if (typeof submitPlayerPortrait === "function") {
    void submitPlayerPortrait()
  }
  state.flags.playerPortraitPromptOffered = true
  addDialogue(sourceLabel)
  return true
}

function finalizeGoldenPrologue() {
  state.flags.goldenPrologueCompleted = true
  state.flags.onboardingHintShown = true
  state.flags.playerIdentityReady = true
  addDialogue("系统: 预示之梦已记录。前往研究站找教授雪松，领取你的第一位伙伴。")
  syncUi()
  queueSave()
}

function openProloguePortraitChoice() {
  openChoice("镜前立绘选择", [
    {
      label: "系统默认精美立绘",
      description: "从预设高质量立绘池中随机挑选并立即应用。",
      buttonLabel: "直接应用",
      onSelect: () => {
        closeChoice()
        applySystemDefaultPlayerPortrait()
        finalizeGoldenPrologue()
      },
    },
    {
      label: "自定义提示词生成",
      description: "输入你想要的主角形象提示词，后台生成后自动通知。",
      buttonLabel: "提交生成",
      formFields: [
        {
          key: "prompt",
          label: "提示词（中文可用）",
          type: "textarea",
          rows: 4,
          maxLength: 360,
          placeholder: "例如：少年训练家，机能风短外套，明亮动漫立绘，纯白背景",
          value: buildOpeningPortraitPrompt(
            state.playerName,
            getRandomPlayerPromptTemplate(state.playerProfile?.gender || "unknown")
          ),
        },
      ],
      onSelect: (payload = {}) => {
        if (!submitProloguePortraitPrompt(payload.prompt, "系统: 已提交你的镜前立绘生成请求。")) {
          return
        }
        closeChoice()
        finalizeGoldenPrologue()
      },
    },
    {
      label: "随机模板自动生成",
      description: "根据性别偏好随机一套模板并自动提交。",
      buttonLabel: "随机生成",
      onSelect: () => {
        const randomStyle = getRandomPlayerPromptTemplate(state.playerProfile?.gender || "unknown")
        const prompt = buildOpeningPortraitPrompt(state.playerName, randomStyle)
        if (!submitProloguePortraitPrompt(prompt, "系统: 已使用随机模板提交镜前立绘。")) {
          return
        }
        closeChoice()
        finalizeGoldenPrologue()
      },
    },
  ])
}

function openMirrorIdentityChoice() {
  const settings = typeof getGameStartSettings === "function" ? getGameStartSettings() : {}
  const fallbackName = sanitizePlayerName(state.playerName || settings.playerName || "旅行者")
  const genderDefault =
    state.playerProfile?.gender === "female"
      ? "female"
      : state.playerProfile?.gender === "male"
        ? "male"
        : "unknown"

  openChoice("梦醒镜前：登记你的训练家身份", [
    {
      label: "镜前登记（推荐）",
      description: "名字可从推荐列表选择，也可手动填写；性别使用下拉选择。",
      buttonLabel: "确认并继续",
      imageSrc: getGoldenMirrorIdentityImageSrc(),
      imageAlt: "镜前身份登记",
      formFields: [
        {
          key: "namePreset",
          label: "推荐名字（可选）",
          type: "select",
          options: [
            { value: "", label: "不选择，使用自填名字" },
            ...GOLDEN_MIRROR_NAME_PRESETS.map((name) => ({ value: name, label: name })),
          ],
          value: "",
        },
        {
          key: "playerName",
          label: "自定义名字（最多12字）",
          type: "text",
          maxLength: 12,
          value: "",
          placeholder: `例如：${fallbackName}`,
        },
        {
          key: "gender",
          label: "性别",
          type: "select",
          options: [
            { value: "male", label: "男" },
            { value: "female", label: "女" },
            { value: "unknown", label: "其他" },
          ],
          value: genderDefault,
        },
      ],
      onSelect: (payload = {}) => {
        const rawPresetName = String(payload.namePreset || "").trim()
        const rawCustomName = String(payload.playerName || "").trim()
        const playerName = sanitizePlayerName(rawCustomName || rawPresetName || fallbackName)
        const gender = normalizePlayerGender(payload.gender || genderDefault)
        if (!state.playerProfile || typeof state.playerProfile !== "object") {
          state.playerProfile = {}
        }
        state.playerName = playerName
        state.playerProfile.gender = gender
        state.playerProfile.title = sanitizePlayerTitle(state.playerProfile.title, "见习训练家")
        state.playerProfile.motto = sanitizePlayerMotto(state.playerProfile.motto, "")
        state.flags.playerIdentityReady = true
        closeChoice()
        addDialogue(`你在镜前确认了身份：${state.playerProfile.title}${playerName}（${getPlayerGenderLabel(gender)}）。`)
        openProloguePortraitChoice()
      },
    },
    {
      label: "沿用默认身份",
      description: "使用当前默认名字继续，并直接进入立绘选择。",
      buttonLabel: "继续",
      imageSrc: getGoldenMirrorIdentityImageSrc(),
      imageAlt: "沿用默认身份",
      onSelect: () => {
        closeChoice()
        state.playerName = fallbackName
        if (!state.playerProfile || typeof state.playerProfile !== "object") {
          state.playerProfile = {}
        }
        state.playerProfile.gender = normalizePlayerGender(genderDefault)
        state.playerProfile.title = sanitizePlayerTitle(state.playerProfile.title, "见习训练家")
        state.playerProfile.motto = sanitizePlayerMotto(state.playerProfile.motto, "")
        state.flags.playerIdentityReady = true
        addDialogue(`你选择以「${state.playerProfile.title}${state.playerName}」的身份开始旅程。`)
        openProloguePortraitChoice()
      },
    },
  ])
}

function startNewPlayerOnboarding() {
  if (state.storyStage !== 0) {
    return
  }

  const settings =
    typeof getGameStartSettings === "function"
      ? getGameStartSettings()
      : { playerName: state.playerName || "旅行者" }
  state.playerName = sanitizePlayerName(state.playerName || settings.playerName || "旅行者")
  if (!state.playerProfile || typeof state.playerProfile !== "object") {
    state.playerProfile = {}
  }
  if (!state.playerProfile.title) {
    state.playerProfile.title = typeof settings.defaultTitle === "string" ? settings.defaultTitle : "见习训练家"
  }
  state.playerProfile.motto = sanitizePlayerMotto(
    state.playerProfile.motto,
    typeof settings.defaultMotto === "string" ? settings.defaultMotto : ""
  )
  if (!["male", "female", "unknown"].includes(state.playerProfile.gender)) {
    state.playerProfile.gender = "unknown"
  }
  if (!state.playerProfile.nameTagMode && typeof settings.playerNameTagMode === "string") {
    state.playerProfile.nameTagMode = settings.playerNameTagMode
  }
  if (typeof state.playerProfile.dialogueNameHighlight !== "boolean") {
    state.playerProfile.dialogueNameHighlight = settings.dialogueNameHighlight !== false
  }

  if (!state.flags.goldenPrologueCompleted) {
    openGoldenPrologueEntryChoice()
    syncUi()
    queueSave()
    return
  }

  if (!state.flags.onboardingHintShown) {
    state.flags.onboardingHintShown = true
    addDialogue("系统: 你从预示之梦中醒来。去研究站找教授雪松，领取初始精灵。")
    addDialogue("系统: 出村后会触发与你流派对应的神兽幼体遭遇教学。")
  }

  syncUi()
  queueSave()
}

const PLAYER_DEFAULT_PORTRAIT_POOL = Object.freeze({
  male: ["player", "player_653f3455", "player_9dc5d6c1", "player_53ddf5e8"],
  female: ["player_9dc5d6c1", "player_53ddf5e8", "player_653f3455", "player"],
})

const PLAYER_RANDOM_PROMPT_TEMPLATES = Object.freeze({
  male: [
    "少年训练家，短发，蓝白旅行外套，运动背包，清爽二次元立绘，纯白背景",
    "冷静少年训练家，深色机能夹克，手套，站姿利落，动漫立绘，纯白背景",
    "元气少年训练家，橙色连帽外套，笑容阳光，青春冒险风，纯白背景",
    "学院风少年训练家，校服改造外套，斜挎包，目光坚定，纯白背景",
    "山野系少年训练家，登山短斗篷，护腕，朴素硬朗，纯白背景",
    "街头系少年训练家，宽松外套，棒球帽，潮流动漫风，纯白背景",
    "海滨系少年训练家，短袖机能衫，防水腰包，轻快配色，纯白背景",
    "机械控少年训练家，工具腰带，护目镜，科技感动漫立绘，纯白背景",
    "对战系少年训练家，紧身训练服，护膝，冲刺姿态，纯白背景",
    "侦探系少年训练家，短风衣，记事本，冷静推理气质，纯白背景",
    "古典系少年训练家，旅行马甲，皮靴，沉稳表情，纯白背景",
    "冠军候补少年训练家，披肩短外套，徽章挂饰，自信姿态，纯白背景",
  ],
  female: [
    "少女训练家，双马尾，轻便短外套，百褶短裙，青春冒险风，纯白背景",
    "冷静少女训练家，长发侧编，机能风长外套，干练站姿，纯白背景",
    "元气少女训练家，连帽运动服，拳套配件，笑容明亮，纯白背景",
    "学院风少女训练家，校服改良斗篷，手提书包，知性气质，纯白背景",
    "山野系少女训练家，短披风，护臂，结实靴子，自然风，纯白背景",
    "街头系少女训练家，棒球外套，耳机配饰，潮流动漫风，纯白背景",
    "海滨系少女训练家，轻薄防风外套，短靴，清新配色，纯白背景",
    "机械控少女训练家，护目镜，工具包，科技感动漫立绘，纯白背景",
    "对战系少女训练家，训练紧身装，护膝，敏捷站姿，纯白背景",
    "侦探系少女训练家，短风衣，记录本，专注表情，纯白背景",
    "古典系少女训练家，旅行长裙+短斗篷，优雅气质，纯白背景",
    "冠军候补少女训练家，披肩外套，徽章挂饰，自信站姿，纯白背景",
  ],
  unisex: [
    "主角训练家，现代旅行装，清晰线稿，明亮动漫风，纯白背景",
    "主角训练家，城市冒险服装，动态站姿，二次元立绘，纯白背景",
    "主角训练家，野外调查服，功能背包，清爽配色，纯白背景",
    "主角训练家，学院研究员风，胸前徽章，干净线条，纯白背景",
    "主角训练家，勇者旅行风，短披风，利落构图，纯白背景",
    "主角训练家，未来科技风，发光配件，动漫插画感，纯白背景",
    "主角训练家，复古冒险风，皮质腰带，坚定眼神，纯白背景",
    "主角训练家，雪地探索服，毛领外套，冷色光效，纯白背景",
    "主角训练家，雨林探险服，轻甲元素，活力配色，纯白背景",
    "主角训练家，海港旅行风，防风短外套，晴朗光感，纯白背景",
    "主角训练家，竞技联赛风，编号夹克，战斗准备姿态，纯白背景",
    "主角训练家，庆典风服饰，丝带徽饰，明亮节日氛围，纯白背景",
  ],
})

function getRandomPlayerPromptTemplate(gender = "unknown") {
  const key = gender === "male" || gender === "female" ? gender : "unknown"
  const genderPool =
    key === "male"
      ? PLAYER_RANDOM_PROMPT_TEMPLATES.male
      : key === "female"
        ? PLAYER_RANDOM_PROMPT_TEMPLATES.female
        : [
            ...PLAYER_RANDOM_PROMPT_TEMPLATES.male,
            ...PLAYER_RANDOM_PROMPT_TEMPLATES.female,
          ]
  const merged = [...genderPool, ...PLAYER_RANDOM_PROMPT_TEMPLATES.unisex]
  return merged[randomInt(0, merged.length - 1)]
}

function getSystemDefaultPlayerPortraitKeys(gender = "unknown") {
  const pool =
    gender === "male"
      ? PLAYER_DEFAULT_PORTRAIT_POOL.male
      : gender === "female"
        ? PLAYER_DEFAULT_PORTRAIT_POOL.female
        : [...PLAYER_DEFAULT_PORTRAIT_POOL.male, ...PLAYER_DEFAULT_PORTRAIT_POOL.female]
  return [...new Set(pool)].filter((key) => Boolean(ART_MANIFEST?.characters?.[key]))
}

function applySystemDefaultPlayerPortraitByKey(key, options = {}) {
  const normalizedKey = String(key || "").trim()
  const src = ART_MANIFEST?.characters?.[normalizedKey] || ART_MANIFEST?.characters?.player || ""
  if (!src) {
    addDialogue("系统: 未找到该立绘资源，请改用其他模板。")
    return false
  }

  const profile = typeof ensurePlayerPortraitProfile === "function" ? ensurePlayerPortraitProfile() : null
  if (!profile) {
    addDialogue("系统: 立绘档案初始化失败。")
    return false
  }

  const entry = {
    key: normalizedKey,
    src,
    prompt: "系统默认精美立绘",
    createdAt: new Date().toISOString(),
  }
  profile.generated = upsertPlayerPortraitEntry(profile.generated, entry, {
    limit: PLAYER_PORTRAIT_HISTORY_LIMIT,
  })
  profile.activeKey = normalizedKey
  profile.activeSrc = src
  registerRuntimeArtAsset("characters", normalizedKey, src)
  registerRuntimeArtAsset("characters", "player", src)
  state.flags.playerPortraitPromptOffered = true
  if (options.silent !== true) {
    addDialogue(`系统: 已应用系统精美立绘模板（${normalizedKey}）。`)
  }
  syncUi()
  queueSave()
  return true
}

function applySystemDefaultPlayerPortrait() {
  const gender = state.playerProfile?.gender || "unknown"
  const keys = getSystemDefaultPlayerPortraitKeys(gender)
  if (keys.length <= 0) {
    addDialogue("系统: 未找到默认立绘资源，请改用自定义立绘。")
    return false
  }
  const key = keys[randomInt(0, keys.length - 1)]
  return applySystemDefaultPlayerPortraitByKey(key, { silent: false })
}

function openSystemDefaultPlayerPortraitChoice(source = "tutorial") {
  const gender = state.playerProfile?.gender || "unknown"
  const keys = getSystemDefaultPlayerPortraitKeys(gender)
  if (keys.length <= 0) {
    addDialogue("系统: 当前没有可用的系统立绘模板，请改用自定义生成。")
    return
  }

  openChoice("系统精美立绘：选择并应用", keys.map((key) => ({
    label: key === "player" ? "默认主角立绘" : `模板 ${key}`,
    description: `来源：系统预置 · 性别偏好：${getPlayerGenderLabel(gender)}`,
    buttonLabel: "使用这张立绘",
    imageSrc: ART_MANIFEST?.characters?.[key] || "",
    imageAlt: key,
    onSelect: () => {
      closeChoice()
      applySystemDefaultPlayerPortraitByKey(key, { silent: true })
      if (source === "panel") {
        addDialogue(`系统: 已从功能面板应用系统立绘（${key}）。`)
      } else {
        addDialogue(`系统: 已为你应用系统默认精美立绘（${getPlayerGenderLabel(gender)}池）。`)
      }
    },
  })))
}

function openCustomPlayerPortraitChoice() {
  openChoice("自定义主角立绘", [
    {
      label: "手动填写提示词",
      description: "直接在卡片内填写提示词，提交后后台生成并自动通知。",
      buttonLabel: "提交生成",
      formFields: [
        {
          key: "prompt",
          label: "提示词（中文可用）",
          type: "textarea",
          rows: 5,
          maxLength: 360,
          placeholder: "例如：少年训练家，机能风外套，明亮二次元立绘，纯白背景",
          value: buildOpeningPortraitPrompt(
            state.playerName,
            getRandomPlayerPromptTemplate(state.playerProfile?.gender || "unknown")
          ),
        },
      ],
      onSelect: (payload = {}) => {
        const customPrompt = String(payload.prompt || "").trim()
        if (!customPrompt) {
          addDialogue("系统: 提示词为空，请填写后再提交。")
          return
        }
        closeChoice()
        if (ui.playerArtPrompt) {
          ui.playerArtPrompt.value = customPrompt
        }
        playerArtState.prompt = customPrompt
        if (typeof submitPlayerPortrait === "function") {
          void submitPlayerPortrait()
        }
        state.flags.playerPortraitPromptOffered = true
        addDialogue("系统: 已提交你的自定义立绘请求。生成完成后会自动提醒你。")
        queueSave()
      },
    },
    {
      label: "系统随机提示词（30+）",
      description: "按你的性别偏好随机模板，再自动生成主角立绘。",
      buttonLabel: "随机并生成",
      onSelect: () => {
        closeChoice()
        const randomStyle = getRandomPlayerPromptTemplate(state.playerProfile?.gender || "unknown")
        const prompt = buildOpeningPortraitPrompt(state.playerName, randomStyle)
        if (ui.playerArtPrompt) {
          ui.playerArtPrompt.value = prompt
        }
        playerArtState.prompt = prompt
        if (typeof submitPlayerPortrait === "function") {
          void submitPlayerPortrait()
        }
        state.flags.playerPortraitPromptOffered = true
        addDialogue("系统: 已使用随机模板提交主角立绘。生成完成后会自动提醒你。")
        queueSave()
      },
    },
  ])
}

function offerPostTutorialPlayerPortraitChoice() {
  if (state.flags.playerPortraitPromptOffered) {
    return
  }

  openChoice("教学战完成：选择主角立绘", [
    {
      label: "系统默认精美立绘",
      description: "男生 4 套 / 女生 4 套，支持先预览再选择。",
      buttonLabel: "选择现成模板",
      onSelect: () => {
        closeChoice()
        openSystemDefaultPlayerPortraitChoice("tutorial")
      },
    },
    {
      label: "自定义立绘",
      description: "可手动输入提示词，或使用系统随机提示词（30+ 模板）生成。",
      buttonLabel: "进入自定义",
      onSelect: () => {
        closeChoice()
        openCustomPlayerPortraitChoice()
      },
    },
  ])
}

function recruitStarter(speciesId) {
  closeChoice()

  const starter = createMonster(speciesId, 6)
  state.player.party = [starter]
  state.player.reserve = []
  state.player.home = []
  state.player.activeIndex = 0
  state.storyStage = 1
  state.progress.starterSpeciesId = speciesId
  state.player.balls = 5

  markSeen(speciesId)
  markCaught(speciesId)

  addDialogue(`${speciesData[speciesId].name} 成为了你的第一位伙伴。`)
  addDialogue("教授雪松: 先打一场教学战，熟悉技能与属性克制。")
  addDialogue("教授雪松送给你 5 枚捕捉球，并提醒你去花冠大道完成最初的图鉴记录。")
  if (typeof requestFirstEncounterPokedexPortraitChoices === "function") {
    void requestFirstEncounterPokedexPortraitChoices(speciesId, { force: true })
  }
  syncUi()
  queueSave()
  startTrainerBattle("tutorial_aide")
}

function startWildBattle(options = {}) {
  const pool =
    options.pool ||
    maps[state.currentMap].encounters ||
    maps[state.currentMap].waterEncounters ||
    []
  const encounter = rollEncounter(pool)
  if (!encounter) {
    addDialogue("这片区域暂时没有可遭遇的怪兽。")
    return
  }

  const failStreak = Number(state.progress?.failStreak) || 0
  const assistDelta =
    !options.legendary &&
    !options.apex &&
    ["route", "meadow", "lake"].includes(state.currentMap) &&
    failStreak > 0
      ? Math.min(2, failStreak)
      : 0

  const rawEnemyLevel =
    Number.isFinite(options.forceLevel)
      ? Number(options.forceLevel)
      : randomInt(encounter.minLevel, encounter.maxLevel)
  const mapLevelOffset =
    typeof getWildLevelOffsetForMap === "function" ? getWildLevelOffsetForMap(state.currentMap) : 0
  const enemyLevel = Math.max(1, rawEnemyLevel + mapLevelOffset - assistDelta)
  const enemy = createMonster(encounter.speciesId, enemyLevel)
  enemy.isLegendary = Boolean(options.legendary || speciesData[enemy.speciesId]?.isLegendary)
  enemy.isApex = Boolean(options.apex || speciesData[enemy.speciesId]?.isApex)

  const firstEncounter = !Boolean(state.pokedex?.seen?.[enemy.speciesId])
  markSeen(enemy.speciesId)
  if (
    typeof requestFirstEncounterPokedexPortraitChoices === "function" &&
    (firstEncounter || !state.pokedex?.portraits?.[enemy.speciesId])
  ) {
    void requestFirstEncounterPokedexPortraitChoices(enemy.speciesId)
  }

  state.scene = "battle"
  state.battle = {
    kind: "wild",
    enemyName: enemy.isLegendary
      ? `传说 ${speciesData[enemy.speciesId].name}`
      : enemy.isApex
        ? `地区霸主 ${speciesData[enemy.speciesId].name}`
      : `野生 ${speciesData[enemy.speciesId].name}`,
    enemyParty: [enemy],
    enemyIndex: 0,
    log: [
      options.openingLine ||
        (enemy.isApex
          ? `地区霸主 ${speciesData[enemy.speciesId].name} 带着强烈压迫感现身了。`
          : `一只野生 ${speciesData[enemy.speciesId].name} 从草丛中跳了出来。`),
      ...(assistDelta > 0 ? [`连败保护生效：本场野生等级 -${assistDelta}。`] : []),
    ],
    locked: false,
    playerBuff: {
      attack: 0,
      defense: 0,
      speed: 0,
    },
    enemyBuff: {
      attack: 0,
      defense: 0,
      speed: 0,
    },
    statusByUid: {},
    showSwitchPanel: false,
    forceCaptureSuccess: Boolean(options.forceCaptureSuccess),
    captureTutorial: Boolean(options.captureTutorial),
    disableRun: Boolean(options.disableRun),
    captureTag: String(options.captureTag || ""),
  }

  renderBattlePanel()
}

function startTrainerBattle(trainerId) {
  const trainer = trainerData[trainerId]
  const failStreak = Number(state.progress?.failStreak) || 0
  const assistDelta =
    trainerId !== "leader" && trainerId !== "vanguard" && failStreak > 0 ? Math.min(1, failStreak) : 0
  const trainerLevelOffset =
    typeof getTrainerLevelOffset === "function" ? getTrainerLevelOffset(trainerId) : 0
  const enemyParty = trainer.team.map(([speciesId, level]) =>
    createMonster(speciesId, Math.max(1, level + trainerLevelOffset - assistDelta))
  )

  markSeen(enemyParty[0].speciesId)

  state.scene = "battle"
  state.battle = {
    kind: "trainer",
    trainerId,
    enemyName: trainer.name,
    enemyParty,
    enemyIndex: 0,
    log: [
      trainer.intro,
      ...(trainerId === "tutorial_aide"
        ? ["教学保护已启用：本场你造成更高伤害，且可触发一次濒死救援。"]
        : []),
      ...(assistDelta > 0 ? [`连败保护生效：本场训练师等级 -${assistDelta}。`] : []),
      `${trainer.name} 派出了 ${speciesData[enemyParty[0].speciesId].name}。`,
    ],
    locked: false,
    playerBuff: {
      attack: 0,
      defense: 0,
      speed: 0,
    },
    enemyBuff: {
      attack: 0,
      defense: 0,
      speed: 0,
    },
    statusByUid: {},
    showSwitchPanel: false,
    tutorialAssist:
      trainerId === "tutorial_aide"
        ? {
            enabled: true,
            playerDamageMultiplier: 1.38,
            enemyDamageMultiplier: 0.42,
            oneTimeRescueUsed: false,
          }
        : null,
  }

  renderBattlePanel()
}

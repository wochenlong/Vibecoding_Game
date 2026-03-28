async function handleBattleAction(action) {
  if (!state.battle || state.battle.locked) {
    return
  }

  const playerMonster = getActiveMonster()
  if (!playerMonster) {
    return
  }

  if (action.type === "capture" && state.battle.kind !== "wild") {
    addBattleLog("训练家对战中不能直接捕捉对手的怪兽。")
    return
  }

  if (action.type === "capture" && state.player.balls <= 0) {
    addBattleLog("你的捕捉球已经用完了。")
    return
  }

  if (action.type === "run" && state.battle.kind !== "wild") {
    addBattleLog("馆主和训练家不会让你轻易逃离对战。")
    return
  }

  if (action.type === "run" && state.battle.disableRun) {
    addBattleLog("这次遭遇不允许逃跑。")
    return
  }

  if (state.battle.captureTutorial && action.type !== "capture") {
    addBattleLog("这是缔约捕捉教学，请直接投掷精灵球。")
    return
  }

  if (action.type === "switch") {
    if (!Number.isInteger(action.index)) {
      addBattleLog("切换目标无效。")
      return
    }
    if (action.index === state.player.activeIndex) {
      addBattleLog("该宠物已经在场上。")
      return
    }
    const target = state.player.party[action.index]
    if (!target || target.currentHp <= 0) {
      addBattleLog("该宠物当前无法出战。")
      return
    }
  }

  if (action.type === "skill" && !Number.isInteger(action.slot)) {
    addBattleLog("招式栏位无效。")
    return
  }

  if (action.type === "item") {
    const validation = validateBattleItemUse(action.itemId)
    if (!validation.ok) {
      addBattleLog(validation.message)
      return
    }
  }

  if (state.battle.showSwitchPanel && action.type !== "switch") {
    state.battle.showSwitchPanel = false
  }

  state.battle.locked = true
  renderBattlePanel()

  if (action.type === "skill") {
    await resolveSkillTurn(action.slot)
  }

  if (action.type === "capture") {
    await resolveCaptureTurn()
  }

  if (action.type === "run") {
    await resolveRunTurn()
  }

  if (action.type === "switch") {
    await resolveSwitchTurn(action.index)
  }

  if (action.type === "item") {
    await resolveItemTurn(action.itemId)
  }

  if (state.battle) {
    state.battle.locked = false
  }

  syncUi()
}

function validateBattleItemUse(itemId) {
  const item = itemCatalog[itemId]
  if (!item) {
    return { ok: false, message: "该道具不存在。" }
  }
  if (!state.player.inventory[itemId]) {
    return { ok: false, message: `${item.name} 数量不足。` }
  }
  if (!["heal", "battle_buff"].includes(item.kind)) {
    return { ok: false, message: `${item.name} 不能在战斗中使用。` }
  }
  const activeMonster = getActiveMonster()
  if (!activeMonster || activeMonster.currentHp <= 0) {
    return { ok: false, message: "当前没有可用道具的出战宠物。" }
  }
  if (item.kind === "heal" && activeMonster.currentHp >= activeMonster.maxHp) {
    return { ok: false, message: "出战宠物状态良好，暂时不需要用药。" }
  }
  return { ok: true, message: "" }
}

function getAvailableBattleItemIds() {
  return Object.entries(state.player.inventory || {})
    .filter(([, count]) => Number(count) > 0)
    .map(([itemId]) => itemId)
    .filter((itemId) => validateBattleItemUse(itemId).ok)
    .sort((leftId, rightId) => {
      const leftItem = itemCatalog[leftId]
      const rightItem = itemCatalog[rightId]
      if (!leftItem || !rightItem) {
        return 0
      }
      if (leftItem.kind !== rightItem.kind) {
        return leftItem.kind === "heal" ? -1 : 1
      }
      return leftItem.name.localeCompare(rightItem.name, "zh-CN")
    })
}

function getAvailableBattleItemStacks() {
  return getAvailableBattleItemIds().map((itemId) => ({
    itemId,
    item: itemCatalog[itemId],
    count: Number(state.player.inventory?.[itemId]) || 0,
  }))
}

function grantBattleCoins(baseCoins) {
  const coins =
    typeof getBalancedCoinReward === "function" ? getBalancedCoinReward(baseCoins) : Number(baseCoins) || 0
  state.player.coins += coins
  return coins
}

async function resolveSkillTurn(slot) {
  const playerMonster = getActiveMonster()
  const enemyMonster = getEnemyMonster()

  if (!playerMonster || !enemyMonster) {
    return
  }

  const playerSpeed = playerMonster.speed + (state.battle.playerBuff?.speed || 0)
  const enemySpeed = enemyMonster.speed + (state.battle.enemyBuff?.speed || 0)
  const playerFirst = playerSpeed >= enemySpeed
  const turnOrder = playerFirst ? ["player", "enemy"] : ["enemy", "player"]

  for (const actor of turnOrder) {
    if (!state.battle) {
      return
    }

    if (actor === "player") {
      const result = await executePlayerSkill(slot)
      if (result === "battle_end" || result === "stop_turn") {
        return
      }
    } else {
      const result = await executeEnemyTurn()
      if (result === "battle_end" || result === "stop_turn") {
        return
      }
    }
  }
}

async function resolveCaptureTurn() {
  const enemy = getEnemyMonster()
  if (!enemy) {
    return
  }

  state.player.balls -= 1
  addBattleLog("你投出了捕捉球。")
  await sleep(450)

  let catchSuccess = false
  if (state.battle.forceCaptureSuccess) {
    catchSuccess = true
    if (state.battle.captureTutorial) {
      addBattleLog("缔约共鸣生效：这次捕捉必定成功。")
      await sleep(300)
    }
  } else {
    const ratioMissing = 1 - enemy.currentHp / enemy.maxHp
    let catchChance =
      0.24 + ratioMissing * 0.52 + (enemy.currentHp <= enemy.maxHp * 0.25 ? 0.12 : 0)
    if (enemy.isLegendary || speciesData[enemy.speciesId]?.isLegendary) {
      const enemyStatus = getBattleStatusEntry(enemy)
      const hasControlAilment = ["sleep", "paralysis", "confusion"].includes(enemyStatus?.ailment || "")
      const isVerdion = enemy.speciesId === "verdion"
      const verdionBoost = isVerdion && (state.flags.gymWon || state.flags.sanctumOpen)
      const legendaryBase = verdionBoost ? 0.04 : 0.008
      const ratioBonus = ratioMissing * (verdionBoost ? 0.03 : 0.012)
      const controlBonus = hasControlAilment ? (verdionBoost ? 0.02 : 0.006) : 0
      const upperCap = verdionBoost ? 0.1 : 0.03
      catchChance = Math.min(upperCap, legendaryBase + ratioBonus + controlBonus)
    } else {
      catchChance = Math.min(0.92, catchChance)
    }
    catchSuccess = Math.random() <= catchChance
  }

  if (catchSuccess) {
    addBattleLog(`成功捕捉到 ${speciesData[enemy.speciesId].name}。`)
    recruitCapturedMonster(enemy)
    state.progress.wildCaptures += 1
    grantEssenceFromSpecies(enemy.speciesId, { amount: 1, arcane: 1, source: "capture", notify: true })
    addDialogue(`你捕捉了 ${speciesData[enemy.speciesId].name}。`)

    if (state.storyStage === 1 && state.progress.wildCaptures >= 2) {
      state.storyStage = 2
      addDialogue("你已经完成了基础图鉴采样。蚀星先遣洛克正在前方封锁道路。")
    }

    if (enemy.isLegendary || speciesData[enemy.speciesId]?.isLegendary) {
      state.flags.legendaryCaptured = true
      state.progress.legendaryCleared = true
      addDialogue(`你与传说宝可梦 ${speciesData[enemy.speciesId].name} 建立了契约。`)
    }
    if (state.battle.captureTag === "golden_chosen_cub") {
      state.flags.goldenLegendCubCaptured = true
      addDialogue(`契约完成：${speciesData[enemy.speciesId].name} 认可了你的流派，加入了你的旅队。`)
    }

    const activeMonster = getActiveMonster()
    if (activeMonster) {
      const captureBaseExp = speciesData[enemy.speciesId]?.baseExp || 40
      const messages = await grantExperience(activeMonster, Math.max(1, Math.floor(captureBaseExp * enemy.level / 14)))
      for (const message of messages) {
        addBattleLog(message)
        await sleep(450)
      }
    }

    finishBattle("captured")
    return
  }

  addBattleLog("捕捉球摇晃了几下后弹开了。")
  await sleep(500)
  await executeEnemyTurn()
}

async function resolveRunTurn() {
  const playerMonster = getActiveMonster()
  const enemyMonster = getEnemyMonster()

  if (!playerMonster || !enemyMonster) {
    return
  }

  if (state.battle?.disableRun) {
    addBattleLog("这次遭遇不允许逃跑。")
    await sleep(350)
    await executeEnemyTurn()
    return
  }

  const speedEdge = playerMonster.speed / Math.max(enemyMonster.speed, 1)
  const runChance = Math.min(0.95, 0.45 + speedEdge * 0.25)

  if (Math.random() <= runChance) {
    addBattleLog("你带着队伍顺利脱离了战斗。")
    await sleep(450)
    finishBattle("run")
    return
  }

  addBattleLog("你试图撤退，但被对手缠住了。")
  await sleep(500)
  await executeEnemyTurn()
}

async function resolveSwitchTurn(index) {
  const target = state.player.party[index]
  if (!target || target.currentHp <= 0 || !state.battle) {
    return
  }

  state.player.activeIndex = index
  state.battle.showSwitchPanel = false
  addBattleLog(`你切换到了 ${speciesData[target.speciesId].name}。`)
  await sleep(260)

  if (!state.battle) {
    return
  }

  await executeEnemyTurn()
}

async function resolveItemTurn(itemId) {
  const item = itemCatalog[itemId]
  const activeMonster = getActiveMonster()
  if (!item || !activeMonster || !state.battle) {
    return
  }

  if (!consumeInventoryItem(itemId, 1)) {
    addBattleLog(`${item.name} 数量不足。`)
    return
  }

  if (item.kind === "heal") {
    const healed = Math.min(item.heal || 0, activeMonster.maxHp - activeMonster.currentHp)
    activeMonster.currentHp += healed
    addBattleLog(`你使用了 ${item.name}，恢复了 ${healed} HP。`)
  } else if (item.kind === "battle_buff") {
    if (!state.battle.playerBuff) {
      state.battle.playerBuff = { attack: 0, defense: 0, speed: 0 }
    }
    const statKey = item.buffStat || "attack"
    const buffValue = Number(item.buffValue) || 0
    state.battle.playerBuff[statKey] = clamp((state.battle.playerBuff[statKey] || 0) + buffValue, -6, 6)
    addBattleLog(`你使用了 ${item.name}，本场战斗${statKey}提升 ${buffValue}。`)
  } else {
    addBattleLog(`${item.name} 在当前战斗中没有生效。`)
  }

  await sleep(260)

  if (!state.battle) {
    return
  }

  await executeEnemyTurn()
}

async function executePlayerSkill(slot) {
  const attacker = getActiveMonster()
  const defender = getEnemyMonster()

  if (!attacker || !defender || attacker.currentHp <= 0) {
    return "stop_turn"
  }

  const startStatus = resolveTurnStartStatusEffects(attacker)
  for (const message of startStatus.messages) {
    addBattleLog(message)
    await sleep(380)
  }
  if (attacker.currentHp <= 0) {
    return handlePlayerFaint()
  }
  if (!startStatus.canAct) {
    return "continue"
  }

  const skillId = attacker.skills[slot]
  if (!skillId) {
    addBattleLog("这个技能暂时不可用。")
    return "stop_turn"
  }

  const result = performAttack(attacker, defender, skillId)
  for (const message of result.messages) {
    addBattleLog(message)
    await sleep(460)
  }

  if (defender.currentHp <= 0) {
    return handleEnemyFaint()
  }

  const endStatus = resolveTurnEndStatusEffects(attacker)
  for (const message of endStatus.messages) {
    addBattleLog(message)
    await sleep(380)
  }
  if (attacker.currentHp <= 0) {
    return handlePlayerFaint()
  }

  return "continue"
}

async function executeEnemyTurn() {
  const attacker = getEnemyMonster()
  const defender = getActiveMonster()

  if (!attacker || !defender || attacker.currentHp <= 0) {
    return "stop_turn"
  }
  if (!Array.isArray(attacker.skills) || attacker.skills.length === 0) {
    addBattleLog(`${speciesData[attacker.speciesId].name} 没有可用招式。`)
    return "stop_turn"
  }

  const startStatus = resolveTurnStartStatusEffects(attacker)
  for (const message of startStatus.messages) {
    addBattleLog(message)
    await sleep(380)
  }
  if (attacker.currentHp <= 0) {
    return handleEnemyFaint()
  }
  if (!startStatus.canAct) {
    return "continue"
  }

  const skillId = attacker.skills[randomInt(0, attacker.skills.length - 1)]
  const result = performAttack(attacker, defender, skillId)

  for (const message of result.messages) {
    addBattleLog(message)
    await sleep(460)
  }

  if (defender.currentHp <= 0) {
    return handlePlayerFaint()
  }

  const endStatus = resolveTurnEndStatusEffects(attacker)
  for (const message of endStatus.messages) {
    addBattleLog(message)
    await sleep(380)
  }
  if (attacker.currentHp <= 0) {
    return handleEnemyFaint()
  }

  return "continue"
}

function performAttack(attacker, defender, skillId) {
  const skill = moveData[skillId]
  if (!skill) {
    return {
      messages: ["招式数据异常，行动失败。"],
    }
  }

  const attackerSpecies = speciesData[attacker.speciesId]
  const defenderSpecies = speciesData[defender.speciesId]
  const category = skill.category || "physical"
  const messages = [`${attackerSpecies.name} 使用了 ${skill.name}。`]

  if (Math.random() > skill.accuracy) {
    messages.push("招式偏了，攻击没有命中。")
    return { messages }
  }

  if (category === "status") {
    const applied = resolveSkillEffectEntries(attacker, defender, skill.effects, messages)
    if (!applied) {
      messages.push("但是没有产生明显效果。")
    }
    return { messages }
  }

  const attackerTypes = getSpeciesTypes(attacker)
  const defenderTypes = getSpeciesTypes(defender)
  const sameTypeBonus = attackerTypes.includes(skill.type) ? STAB_MULTIPLIER : 1
  const effectiveness = getTypeEffectiveness(skill.type, defenderTypes)
  const variance = 0.9 + Math.random() * 0.22
  const attackerBuff = getBattleBuffBucket(attacker)
  const defenderBuff = getBattleBuffBucket(defender)
  const stageMult = s => Math.max(2, 2 + s) / Math.max(2, 2 - s)
  const atkMult = stageMult(attackerBuff?.attack || 0)
  const defMult = stageMult(defenderBuff?.defense || 0)
  const atkSpdMult = stageMult(attackerBuff?.speed || 0)
  const defSpdMult = stageMult(defenderBuff?.speed || 0)
  const offenseBase =
    category === "special"
      ? attacker.attack * 0.56 * atkMult + attacker.speed * 0.68 * atkSpdMult
      : attacker.attack * atkMult
  const defenseBase =
    category === "special"
      ? defender.defense * 0.58 * defMult + defender.speed * 0.62 * defSpdMult
      : defender.defense * defMult
  const attackerStatus = getBattleStatusEntry(attacker)
  const burnPenalty =
    attackerStatus?.ailment === "burn" && category === "physical" ? 0.78 : 1
  const isCrit = Math.random() < 0.0625
  const critMult = isCrit ? 1.5 : 1.0
  const attackFactor = skill.power + offenseBase * 0.56 * burnPenalty + attacker.level * 1.9
  const defenseFactor = defenseBase * 0.52 + defender.level * 1.9

  if (effectiveness <= 0) {
    messages.push("对方属性完全免疫，攻击无效。")
    return { messages }
  }

  const rawDamage = Math.floor((attackFactor - defenseFactor) * sameTypeBonus * effectiveness * variance * critMult)
  let damage = clamp(
    isCrit ? rawDamage : Math.min(rawDamage, Math.floor(defender.maxHp * 0.70)),
    1,
    999
  )
  if (isCrit) {
    messages.push("会心一击！")
  }

  if (state.battle?.trainerId === "tutorial_aide" && state.battle?.tutorialAssist?.enabled) {
    const activeMonster = getActiveMonster()
    const isPlayerAttacker = Boolean(activeMonster && attacker?.uid === activeMonster.uid)
    const assist = state.battle.tutorialAssist
    if (isPlayerAttacker) {
      damage = clamp(
        Math.floor(damage * (Number(assist.playerDamageMultiplier) || 1)),
        1,
        999
      )
    } else {
      damage = clamp(
        Math.floor(damage * (Number(assist.enemyDamageMultiplier) || 1)),
        1,
        999
      )
    }
  }

  defender.currentHp = clamp(defender.currentHp - damage, 0, defender.maxHp)
  messages.push(`${defenderSpecies.name} 受到了 ${damage} 点伤害。`)
  if (Number(skill.drainRatio) > 0 && attacker.currentHp > 0) {
    const recovered = clamp(Math.floor(damage * Number(skill.drainRatio)), 1, attacker.maxHp)
    const beforeHp = attacker.currentHp
    attacker.currentHp = clamp(attacker.currentHp + recovered, 0, attacker.maxHp)
    const realRecovered = Math.max(0, attacker.currentHp - beforeHp)
    if (realRecovered > 0) {
      messages.push(`${attackerSpecies.name} 吸收了 ${realRecovered} 点体力。`)
    }
  }
  if (burnPenalty < 1) {
    messages.push(`${attackerSpecies.name} 受灼伤影响，物理伤害下降。`)
  }

  if (sameTypeBonus > 1) {
    messages.push("同属性招式加成生效。")
  }

  if (effectiveness >= 1.8) {
    messages.push("效果绝佳。")
  } else if (effectiveness > 1) {
    messages.push("克制生效。")
  } else if (effectiveness < 1) {
    messages.push("效果不理想。")
  }

  if (defender.currentHp > 0 && skill.secondary && Math.random() <= (skill.secondary.chance || 0)) {
    resolveSkillEffectEntries(attacker, defender, skill.secondary.effects, messages)
  }

  if (defender.currentHp <= 0) {
    messages.push(`${defenderSpecies.name} 倒下了。`)
  }

  return { messages }
}

function resolveTurnStartStatusEffects(monster) {
  const status = getBattleStatusEntry(monster)
  const messages = []
  if (!status) {
    return {
      canAct: true,
      messages,
    }
  }

  if (status.confusionTurns > 0) {
    messages.push(`${speciesData[monster.speciesId].name} 处于混乱状态。`)
    status.confusionTurns -= 1

    if (Math.random() < 0.42) {
      const selfDamage = clamp(Math.floor(monster.maxHp * 0.09 + monster.level * 0.35), 1, 120)
      monster.currentHp = clamp(monster.currentHp - selfDamage, 0, monster.maxHp)
      messages.push(`${speciesData[monster.speciesId].name} 因混乱攻击了自己，损失 ${selfDamage} HP。`)
      if (monster.currentHp <= 0) {
        messages.push(`${speciesData[monster.speciesId].name} 倒下了。`)
      }
      if (status.confusionTurns <= 0) {
        messages.push(`${speciesData[monster.speciesId].name} 摆脱了混乱。`)
      }
      return {
        canAct: false,
        messages,
      }
    }

    messages.push(`${speciesData[monster.speciesId].name} 稳住了自己。`)
    if (status.confusionTurns <= 0) {
      messages.push(`${speciesData[monster.speciesId].name} 摆脱了混乱。`)
    }
  }

  if (status.sleepTurns > 0) {
    status.sleepTurns -= 1
    messages.push(`${speciesData[monster.speciesId].name} 正在沉睡。`)
    if (status.sleepTurns <= 0) {
      status.sleepTurns = 0
      status.ailment = null
      messages.push(`${speciesData[monster.speciesId].name} 醒来了。`)
      return {
        canAct: true,
        messages,
      }
    }
    return {
      canAct: false,
      messages,
    }
  }

  if (status.ailment === "paralysis" && Math.random() < 0.24) {
    messages.push(`${speciesData[monster.speciesId].name} 因麻痹而动弹不得。`)
    return {
      canAct: false,
      messages,
    }
  }

  return {
    canAct: true,
    messages,
  }
}

function resolveTurnEndStatusEffects(monster) {
  const status = getBattleStatusEntry(monster)
  const messages = []
  if (!status || monster.currentHp <= 0) {
    return {
      messages,
    }
  }

  if (status.ailment === "poison") {
    const damage = clamp(Math.floor(monster.maxHp * 0.08), 1, 120)
    monster.currentHp = clamp(monster.currentHp - damage, 0, monster.maxHp)
    messages.push(`${speciesData[monster.speciesId].name} 受到中毒伤害 ${damage}。`)
  } else if (status.ailment === "burn") {
    const damage = clamp(Math.floor(monster.maxHp * 0.06), 1, 120)
    monster.currentHp = clamp(monster.currentHp - damage, 0, monster.maxHp)
    messages.push(`${speciesData[monster.speciesId].name} 因灼伤损失 ${damage} HP。`)
  } else if (status.ailment === "leech") {
    const damage = clamp(Math.floor(monster.maxHp * 0.07), 1, 120)
    monster.currentHp = clamp(monster.currentHp - damage, 0, monster.maxHp)
    messages.push(`${speciesData[monster.speciesId].name} 被寄生种子持续吸取了 ${damage} HP。`)
  }

  if (monster.currentHp <= 0) {
    messages.push(`${speciesData[monster.speciesId].name} 倒下了。`)
  }

  return {
    messages,
  }
}

function getBattleStatusEntry(monster) {
  if (!state.battle || !monster) {
    return null
  }
  if (!state.battle.statusByUid || typeof state.battle.statusByUid !== "object") {
    state.battle.statusByUid = {}
  }
  if (!state.battle.statusByUid[monster.uid]) {
    state.battle.statusByUid[monster.uid] = {
      ailment: null,
      confusionTurns: 0,
      sleepTurns: 0,
    }
  }
  return state.battle.statusByUid[monster.uid]
}

function resolveSkillEffectEntries(attacker, defender, effects, messages) {
  if (!Array.isArray(effects) || effects.length === 0) {
    return false
  }

  let appliedAny = false
  for (const effect of effects) {
    if (!effect || typeof effect !== "object") {
      continue
    }

    const target =
      effect.target === "self" || effect.target === "attacker" ? attacker : defender
    if (!target) {
      continue
    }

    if (effect.kind === "status") {
      const applied = applyStatusAilment(target, effect.status, messages)
      appliedAny = appliedAny || applied
      continue
    }

    if (effect.kind === "buff") {
      const statKey = effect.stat
      const amount = Number(effect.amount) || 0
      if (!["attack", "defense", "speed"].includes(statKey) || amount === 0) {
        continue
      }

      const bucket = getBattleBuffBucket(target)
      if (!bucket) {
        continue
      }
      const previous = Number(bucket[statKey]) || 0
      bucket[statKey] = clamp(previous + amount, -6, 6)
      const delta = bucket[statKey] - previous
      if (delta === 0) {
        continue
      }

      const targetName = speciesData[target.speciesId].name
      const statName = { attack: "攻击", defense: "防御", speed: "速度" }[statKey] || statKey
      const trend = delta > 0 ? "提升" : "下降"
      messages.push(`${targetName} 的${statName}${trend}了 ${Math.abs(delta)} 级。`)
      appliedAny = true
    }
  }

  return appliedAny
}

function applyStatusAilment(target, statusName, messages) {
  const status = getBattleStatusEntry(target)
  if (!status || !statusName) {
    return false
  }

  const targetName = speciesData[target.speciesId].name
  const statusLabel = {
    poison: "中毒",
    burn: "灼伤",
    confusion: "混乱",
    sleep: "睡眠",
    paralysis: "麻痹",
    leech: "寄生",
  }[statusName] || statusName

  if (statusName === "confusion") {
    if (status.confusionTurns > 0) {
      return false
    }
    status.confusionTurns = randomInt(2, 3)
    messages.push(`${targetName} 陷入了${statusLabel}。`)
    return true
  }

  if (statusName === "sleep") {
    if (status.sleepTurns > 0 || status.ailment) {
      return false
    }
    status.sleepTurns = randomInt(2, 3)
    status.ailment = "sleep"
    messages.push(`${targetName} 陷入了${statusLabel}。`)
    return true
  }

  if (status.ailment) {
    return false
  }

  status.ailment = statusName
  messages.push(`${targetName} 陷入了${statusLabel}。`)
  return true
}

function getBattleBuffBucket(monster) {
  if (!state.battle || !monster) {
    return null
  }

  const playerMonster = getActiveMonster()
  const isPlayerSide = Boolean(playerMonster && playerMonster.uid === monster.uid)
  const bucketKey = isPlayerSide ? "playerBuff" : "enemyBuff"
  if (!state.battle[bucketKey]) {
    state.battle[bucketKey] = {
      attack: 0,
      defense: 0,
      speed: 0,
    }
  }
  return state.battle[bucketKey]
}

async function handleEnemyFaint() {
  const battle = state.battle
  const activeMonster = getActiveMonster()
  const enemy = getEnemyMonster()

  if (enemy) {
    grantEssenceFromSpecies(enemy.speciesId, {
      amount: 1,
      arcane: enemy.level >= 6 ? 1 : 0,
      source: "faint",
      notify: false,
    })
    if (enemy.isLegendary || speciesData[enemy.speciesId]?.isLegendary) {
      state.progress.legendaryCleared = true
      addDialogue(`你击退了传说宝可梦 ${speciesData[enemy.speciesId].name}。祭坛暂时归于沉寂。`)
    }
  }

  if (activeMonster && enemy) {
    const baseExp = speciesData[enemy.speciesId]?.baseExp || 40
    const experience = Math.max(1, Math.floor(baseExp * enemy.level / 7))
    const messages = await grantExperience(activeMonster, experience)
    for (const message of messages) {
      addBattleLog(message)
      await sleep(420)
    }
  }

  if (!battle) {
    return "battle_end"
  }

  if (battle.kind === "trainer" && battle.enemyIndex < battle.enemyParty.length - 1) {
    battle.enemyIndex += 1
    const nextEnemy = getEnemyMonster()
    markSeen(nextEnemy.speciesId)
    addBattleLog(`${battle.enemyName} 派出了 ${speciesData[nextEnemy.speciesId].name}。`)
    await sleep(500)
    return "stop_turn"
  }

  finishBattle("win")
  return "battle_end"
}

async function handlePlayerFaint() {
  if (
    state.battle?.trainerId === "tutorial_aide" &&
    state.battle?.tutorialAssist?.enabled &&
    state.battle.tutorialAssist.oneTimeRescueUsed !== true
  ) {
    const activeMonster = getActiveMonster()
    if (activeMonster) {
      state.battle.tutorialAssist.oneTimeRescueUsed = true
      activeMonster.currentHp = Math.max(1, Math.floor(activeMonster.maxHp * 0.55))
      if (state.battle.statusByUid?.[activeMonster.uid]) {
        state.battle.statusByUid[activeMonster.uid] = {
          ailment: null,
          confusionTurns: 0,
          sleepTurns: 0,
        }
      }
      addBattleLog("教学保护触发：你的伙伴稳住了阵脚，恢复了一部分体力。")
      await sleep(480)
      return "stop_turn"
    }
  }

  const nextIndex = findNextLivingIndex()
  if (nextIndex === -1) {
    addBattleLog("你的队伍失去了战斗能力，系统将把你送往最近的传送石像。")
    await sleep(500)
    finishBattle("lose")
    return "battle_end"
  }

  state.player.activeIndex = nextIndex
  addBattleLog(`${speciesData[state.player.party[nextIndex].speciesId].name} 顶上了战斗位置。`)
  await sleep(500)
  return "stop_turn"
}

function finishBattle(result) {
  const battle = state.battle

  if (!battle) {
    return
  }

  if (result === "captured") {
    addDialogue("捕捉完成，队伍的阵容又丰富了一些。")
  }

  if (result === "win" && battle.kind === "wild") {
    addDialogue("你赢下了一场野外战斗。")
    const gainedCoins = grantBattleCoins(36)
    addDialogue(`你获得了 ${gainedCoins} 金币。`)
  }

  if (result === "run") {
    addDialogue("你从战斗中安全撤离。")
  }

  const bossEnemy = battle.enemyParty?.[0]
  if (bossEnemy && isApexEnemy(bossEnemy) && result === "win") {
    grantApexVictoryRewards(bossEnemy)
  }
  if (
    bossEnemy &&
    (bossEnemy.isLegendary || speciesData[bossEnemy.speciesId]?.isLegendary) &&
    result === "win"
  ) {
    addDialogue("传说遭遇已记录到图鉴档案。你可以继续挑战它们或尝试捕捉。")
  }

  if (result === "win" && battle.kind === "trainer") {
    handleTrainerVictory(battle.trainerId)
  }

  if (!state.progress || typeof state.progress !== "object") {
    state.progress = {}
  }
  if (!Number.isFinite(state.progress.failStreak)) {
    state.progress.failStreak = 0
  }

  if (result === "win" || result === "captured") {
    state.progress.failStreak = 0
  }

  if (result === "lose") {
    state.progress.failStreak = Math.min(6, (Number(state.progress.failStreak) || 0) + 1)
    healParty()
    if (typeof healReserveMonsters === "function") {
      healReserveMonsters()
    }
    const aidBalls = state.progress.failStreak >= 3 ? 3 : 2
    const aidPotions = state.progress.failStreak >= 3 ? 2 : 1
    state.player.balls += aidBalls
    addInventoryItem("potion", aidPotions)
    state.player.repelSteps = Math.max(Number(state.player.repelSteps) || 0, 40)
    const revivePoint = resolveRevivePoint()
    state.currentMap = revivePoint.mapId
    state.player.x = revivePoint.x
    state.player.y = revivePoint.y
    // 传送到复活点后同步渲染坐标
    state.player.renderX = revivePoint.x * TILE_SIZE
    state.player.renderY = revivePoint.y * TILE_SIZE
    state.player.moving = false
    state.player.inputDirection = null
    if (revivePoint.fromStatue) {
      addDialogue(`你在失利后被石像网络送回了 ${maps[revivePoint.mapId].name}，队伍已经恢复。`)
    } else {
      addDialogue("你在失利后被送回星辉城，队伍已经恢复。")
    }
    addDialogue(`系统补给：精灵球 +${aidBalls}、恢复药 x${aidPotions}、避怪保护 40 步。`)
    addDialogue("连败保护已启用：前几场遭遇会降低敌方等级，先稳住节奏再推进。")
  }

  state.scene = "overworld"
  state.battle = null
  if (typeof flushPendingPokedexPortraitChoices === "function") {
    flushPendingPokedexPortraitChoices()
  }
  syncUi()
  queueSave()
}

function isApexEnemy(monster) {
  if (!monster) {
    return false
  }
  return Boolean(monster.isApex || speciesData[monster.speciesId]?.isApex)
}

function ensureApexDefeatRegistry() {
  if (!state.progress || typeof state.progress !== "object") {
    state.progress = {}
  }
  if (!state.progress.apexDefeated || typeof state.progress.apexDefeated !== "object") {
    state.progress.apexDefeated = {}
  }
  return state.progress.apexDefeated
}

function grantApexVictoryRewards(monster) {
  const speciesId = monster?.speciesId
  const species = speciesData[speciesId]
  if (!speciesId || !species) {
    return
  }

  const registry = ensureApexDefeatRegistry()
  const defeatedCount = Number.isFinite(registry[speciesId]) ? Number(registry[speciesId]) : 0
  const firstClear = defeatedCount <= 0
  registry[speciesId] = defeatedCount + 1

  if (firstClear) {
    const gainedCoins = grantBattleCoins(220)
    addInventoryItem("moon_core", 1)
    addInventoryItem("weapon_core", 1)
    grantEssenceFromSpecies(speciesId, {
      amount: 3,
      arcane: 2,
      sun: 1,
      weapon: 1,
      source: `apex_${speciesId}_first`,
      notify: true,
    })
    addDialogue(`你首次击败了地区霸主 ${species.name}。`)
    addDialogue(`你获得了霸主首胜奖励：${gainedCoins} 金币、月辉之核 x1、武装之核 x1。`)
    return
  }

  const gainedCoins = grantBattleCoins(90)
  addInventoryItem("field_ration", 1)
  grantEssenceFromSpecies(speciesId, {
    amount: 1,
    arcane: 1,
    source: `apex_${speciesId}_repeat`,
    notify: false,
  })
  addDialogue(`你再次击败了地区霸主 ${species.name}。`)
  addDialogue(`你获得了追猎奖励：${gainedCoins} 金币、野外口粮 x1。`)
}

function handleTrainerVictory(trainerId) {
  if (trainerId === "tutorial_aide") {
    addInventoryItem("name_card", 1)
    addDialogue("助教 艾可: 教学战完成。你现在可以选择主角立绘模板并生成。")
    addDialogue("教授雪松通过终端发来「命名卡」x1。可在背包中随时重命名。")
    if (typeof offerPostTutorialPlayerPortraitChoice === "function") {
      offerPostTutorialPlayerPortraitChoice()
    }
    return
  }

  if (trainerId === "gym_aide") {
    state.flags.gymAideDefeated = true
    const gainedCoins = grantBattleCoins(80)
    addInventoryItem("super_potion", 1)
    grantEssenceFromSpecies(null, {
      arcane: 1,
      source: "trainer_gym_aide",
      notify: true,
    })
    addDialogue(`你击败了试炼官赛弥。她送你 1 份高级恢复药和 ${gainedCoins} 金币作为热身奖励。`)
    addDialogue("试炼官 赛弥: 节奏已经稳住了，去挑战馆主阿斯特拉吧。")
    return
  }

  if (trainerId === "scout") {
    state.flags.scoutDefeated = true
    state.storyStage = 2
    state.player.balls += 2
    const gainedCoins = grantBattleCoins(90)
    grantEssenceFromSpecies(null, {
      arcane: 1,
      void: 1,
      source: "trainer_scout",
      notify: true,
    })
    addDialogue(`你击败了蚀星先遣洛克（奖励 ${gainedCoins} 金币），并从他身上夺回了草原情报。`)
    addDialogue("系统提示: 草原后段封锁已解除，蚀星执旗官正在等待下一场对决。")
    return
  }

  if (trainerId === "vanguard") {
    state.flags.vanguardDefeated = true
    state.storyStage = 3
    state.player.balls += 3
    const gainedCoins = grantBattleCoins(140)
    grantEssenceFromSpecies(null, {
      arcane: 2,
      void: 1,
      sun: 1,
      source: "trainer_vanguard",
      notify: true,
    })
    addDialogue(`你击败了蚀星执旗维萝（奖励 ${gainedCoins} 金币），草原通往道馆的封锁被彻底解除。`)
    addDialogue("现在回去找教授雪松，他会为你打开星辉道馆的大门。")
    return
  }

  if (trainerId === "leader") {
    state.flags.gymWon = true
    state.storyStage = 5
    state.player.badges = 1
    state.flags.firstGymRewardPending = true
    const gainedCoins = grantBattleCoins(260)
    grantEssenceFromSpecies(null, {
      arcane: 3,
      void: 2,
      sun: 1,
      weapon: 1,
      source: "trainer_leader",
      notify: true,
    })
    addDialogue(`你击败了馆主阿斯特拉，拿下了第一枚徽章（奖励 ${gainedCoins} 金币）。`)
    addDialogue("主线目标已经完成，这片地区还有更多怪兽等你继续扩充图鉴。")
    addDialogue("新增路线已开放：摇叶草原的 O 门可进入晨露果园。")
    addDialogue("教授雪松为你准备了一份首个道馆奖励，你可以立即选择或稍后回城领取。")
    if (typeof triggerFirstGymRewardChoice === "function") {
      triggerFirstGymRewardChoice("leader_victory")
    }
    return
  }

  if (trainerId === "breeder") {
    state.flags.breederDefeated = true
    const gainedCoins = grantBattleCoins(180)
    addInventoryItem("repel_orb", 1)
    addInventoryItem("moon_core", 1)
    grantEssenceFromSpecies(null, {
      arcane: 2,
      void: 1,
      source: "trainer_breeder",
      notify: true,
    })
    addDialogue(`你击败了果园育成师玛芙（奖励 ${gainedCoins} 金币）。她赠送了避怪丹与月辉之核。`)
    addDialogue("11 号水路的 K 门已开放，你现在可以进入镜潮海湾。")
    return
  }

  if (trainerId === "captain") {
    state.flags.captainDefeated = true
    const gainedCoins = grantBattleCoins(240)
    addInventoryItem("tidal_tm", 1)
    addInventoryItem("repel_orb", 1)
    grantEssenceFromSpecies(null, {
      arcane: 2,
      sun: 1,
      weapon: 1,
      source: "trainer_captain",
      notify: true,
    })
    addDialogue(`你击败了海湾队长赛伦（奖励 ${gainedCoins} 金币）。`)
    addDialogue("深层断崖的 P 门与镜潮海湾外航线已开放。")
    return
  }

  if (trainerId === "ace") {
    state.flags.aceDefeated = true
    const gainedCoins = grantBattleCoins(320)
    addInventoryItem("hyper_potion", 1)
    addInventoryItem("moon_core", 1)
    grantEssenceFromSpecies(null, {
      arcane: 3,
      void: 2,
      source: "trainer_ace",
      notify: true,
    })
    addDialogue(`你击败了高岭王牌维迦（奖励 ${gainedCoins} 金币）。`)
    addDialogue("流星高岭通往曜风群岛的主航路已对你开放。")
    return
  }

  if (trainerId === "warden") {
    state.flags.wardenDefeated = true
    const gainedCoins = grantBattleCoins(420)
    state.flags.sanctumOpen = true
    addInventoryItem("sanctum_key", 1)
    addInventoryItem("moon_core", 2)
    grantEssenceFromSpecies(null, {
      arcane: 4,
      sun: 1,
      weapon: 1,
      void: 2,
      source: "trainer_warden",
      notify: true,
    })
    addDialogue(`你击败了群岛守望者伊诺（奖励 ${gainedCoins} 金币），遗迹潮门权限已授予。`)
    addDialogue("你可通过群岛 U 门直接进入天穹遗迹。")
  }
}

function resolveRevivePoint() {
  const fallback = {
    mapId: "town",
    x: 2,
    y: 9,
    fromStatue: false,
  }
  const key = state.progress?.lastStatue
  const registry = state.progress?.unlockedStatues
  if (!key || !registry || typeof registry !== "object") {
    return fallback
  }
  const checkpoint = registry[key]
  if (!checkpoint || !maps[checkpoint.mapId]) {
    return fallback
  }
  if (!isPassable(checkpoint.mapId, checkpoint.x, checkpoint.y)) {
    return fallback
  }
  return {
    mapId: checkpoint.mapId,
    x: checkpoint.x,
    y: checkpoint.y,
    fromStatue: true,
  }
}

function recruitCapturedMonster(monster) {
  const recruit = normalizeMonster(monster)
  markSeen(recruit.speciesId)
  markCaught(recruit.speciesId)

  if (!state.flags.oldRodClaimed && (state.player.inventory.old_rod || 0) <= 0) {
    const recruitTypes = getSpeciesTypes(recruit)
    if (recruitTypes.includes("water")) {
      addInventoryItem("old_rod", 1)
      state.flags.oldRodClaimed = true
      state.flags.oldRodHintShown = true
      addDialogue("你与新加入的水系伙伴产生共鸣，顺着线索找到了「旧钓竿」。")
    }
  }

  if (state.player.party.length < MAX_PARTY_SIZE) {
    state.player.party.push(recruit)
    addDialogue(`${speciesData[recruit.speciesId].name} 加入了当前队伍。`)
    return
  }

  if (state.player.reserve.length < MAX_RESERVE_SIZE) {
    state.player.reserve.push(recruit)
    addDialogue(`${speciesData[recruit.speciesId].name} 被送往后备区，等待之后编入队伍。`)
    return
  }

  if (!Array.isArray(state.player.home)) {
    state.player.home = []
  }

  if (state.player.home.length < MAX_HOME_STORAGE_SIZE) {
    state.player.home.push(recruit)
    addDialogue(
      `${speciesData[recruit.speciesId].name} 已送往家园仓库（后备区已满 ${MAX_RESERVE_SIZE} 只）。`
    )
    return
  }

  addDialogue("家园仓库已满，无法收纳更多怪兽。请先整理队伍后再捕捉。")
}

function grantEssenceFromSpecies(speciesId, options = {}) {
  const essence = getPlayerEssence()
  const amount = Math.max(0, Number(options.amount) || 0)
  const arcane = Math.max(0, Number(options.arcane) || 0)
  const voidEnergy = Math.max(0, Number(options.void) || 0)
  const sun = Math.max(0, Number(options.sun) || 0)
  const weapon = Math.max(0, Number(options.weapon) || 0)
  const notify = options.notify === true
  const source = options.source || "battle"

  const types = speciesId ? getSpeciesTypes(speciesId) : []
  for (const type of types) {
    if (alchemyElementTypes.includes(type) && amount > 0) {
      essence[type] += amount
    }
  }
  if (amount > 0) {
    essence.normal += 1
  }

  if (arcane > 0) {
    essence.arcane += arcane
  }
  if (voidEnergy > 0) {
    essence.void += voidEnergy
  }
  if (sun > 0) {
    essence.sun += sun
  }
  if (weapon > 0) {
    essence.weapon += weapon
  }

  if (!notify) {
    return
  }

  const gains = []
  for (const type of types) {
    if (alchemyElementTypes.includes(type) && amount > 0) {
      gains.push(`${typeNames[type] || type}+${amount}`)
    }
  }
  if (amount > 0) {
    gains.push("normal+1")
  }
  if (arcane > 0) {
    gains.push(`Arcane+${arcane}`)
  }
  if (voidEnergy > 0) {
    gains.push(`Void+${voidEnergy}`)
  }
  if (sun > 0) {
    gains.push(`Sun+${sun}`)
  }
  if (weapon > 0) {
    gains.push(`Weapon+${weapon}`)
  }

  if (gains.length > 0) {
    pushAlchemyLog(`Resource gain [${source}]: ${gains.join(", ")}`)
  }
}

async function grantExperience(monster, amount) {
  const messages = []

  if (!monster) {
    return messages
  }

  monster.exp += amount
  messages.push(`${speciesData[monster.speciesId].name} 获得了 ${amount} 点经验。`)

  while (monster.exp >= experienceToLevel(monster.level)) {
    const previousLevel = monster.level
    monster.exp -= experienceToLevel(monster.level)
    monster.level += 1
    refreshMonsterStats(monster, { restoreToFull: true })
    messages.push(`${speciesData[monster.speciesId].name} 升到了 Lv.${monster.level}。`)
    messages.push(...tryLearnSkills(monster, previousLevel, monster.level))
    const evolutionResult = tryEvolution(monster)
    messages.push(...evolutionResult.messages)
    if (evolutionResult.evolved) {
      await presentLevelEvolution(monster, evolutionResult)
    }
  }

  return messages
}

async function presentLevelEvolution(monster, evolutionResult) {
  if (!monster || !evolutionResult?.evolved) {
    return
  }

  if (!state.progress || typeof state.progress !== "object") {
    state.progress = {}
  }
  state.progress.lastEvolutionFeedback = {
    monsterUid: monster.uid,
    speciesId: monster.speciesId,
    startedAt: Date.now(),
  }

  if (state.battle?.statusByUid && monster.uid && state.battle.statusByUid[monster.uid]) {
    delete state.battle.statusByUid[monster.uid]
  }

  if (typeof playEvolutionAnimation === "function") {
    const primaryType = getSpeciesTypes(monster)?.[0] || "normal"
    await playEvolutionAnimation({
      mode: "level",
      element: primaryType,
      monsterName: speciesData[monster.speciesId]?.name || "伙伴",
    })
  }

  syncUi()

  if (typeof requestFirstEncounterPokedexPortraitChoices === "function") {
    const evolvedName = speciesData[monster.speciesId]?.name || "进化体"
    void requestFirstEncounterPokedexPortraitChoices(monster.speciesId).then((result) => {
      if (result?.ok) {
        addDialogue(`${evolvedName} 的进化立绘任务已提交，名称和能力值已生效，可稍后定稿立绘。`)
        syncUi()
        queueSave()
      }
    })
  }
}

function tryLearnSkills(monster, fromLevel, toLevel) {
  const species = speciesData[monster.speciesId]
  const learnset =
    speciesBattleProfiles[monster.speciesId]?.learnset || species.learnset || []
  const messages = []

  monster.skills = normalizeSkillSlots(monster.skills)

  for (const entry of learnset) {
    if (!entry || entry.level <= fromLevel || entry.level > toLevel) {
      continue
    }
    if (!moveData[entry.skillId] || monster.skills.includes(entry.skillId)) {
      continue
    }

    const learned = learnSkillWithLimit(monster.skills, entry.skillId, {
      limit: MAX_SKILL_SLOTS,
    })
    if (!learned.learned) {
      continue
    }
    if (learned.replacedSkillId) {
      messages.push(
        `${species.name} 学会了 ${moveData[entry.skillId].name}，并遗忘了 ${moveData[learned.replacedSkillId].name}。`
      )
      continue
    }
    messages.push(`${species.name} 学会了 ${moveData[entry.skillId].name}。`)
  }

  return messages
}

function tryEvolution(monster) {
  const species = speciesData[monster.speciesId]
  if (!species.evolvesTo || monster.level < species.evolveLevel) {
    return {
      evolved: false,
      messages: [],
    }
  }

  const previousName = species.name
  const carriedSkills = normalizeSkillSlots(monster.skills)
  monster.speciesId = species.evolvesTo
  monster.skills = normalizeSkillSlots([...carriedSkills, ...speciesData[monster.speciesId].skills])

  refreshMonsterStats(monster, { restoreToFull: true })

  markSeen(monster.speciesId)
  markCaught(monster.speciesId)

  const evolvedName = speciesData[monster.speciesId].name
  return {
    evolved: true,
    messages: [
      `${previousName} 进化成了 ${evolvedName}。`,
      `${evolvedName} 在进化后已恢复到满状态。`,
    ],
  }
}

function healParty() {
  for (const monster of state.player.party) {
    monster.currentHp = monster.maxHp
  }
}


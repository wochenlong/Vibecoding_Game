function renderWorld(time) {
  // 每帧推进玩家平滑移动（补间层）
  if (typeof updatePlayerMovement === "function") {
    updatePlayerMovement()
  }
  drawMap(time)
  drawAmbientEffects(time)
  drawNpcSprites(time)
  drawPlayerSprite(time)
  drawSceneFinish(time)
  drawNpcSpeechBubble(time)
  requestAnimationFrame(renderWorld)
}

const MARKER_TILES = new Set([
  specialTileIds.guideArcane,
  specialTileIds.guideSun,
  specialTileIds.guideWeapon,
  specialTileIds.shrineGate,
  specialTileIds.legendAltar,
  specialTileIds.orchardGate,
  specialTileIds.reefGate,
  specialTileIds.ridgeGate,
  specialTileIds.isletGate,
  specialTileIds.statue,
  "c",
])


function drawMap(time) {
  ctx.clearRect(0, 0, ui.canvas.width, ui.canvas.height)
  drawSceneBackdrop(time)

  const tiles = maps[state.currentMap].tiles
  for (let y = 0; y < MAP_HEIGHT; y += 1) {
    for (let x = 0; x < MAP_WIDTH; x += 1) {
      drawTile(tiles[y][x], x, y, time)
    }
  }
}

function drawTile(tile, gridX, gridY, time) {
  const x = gridX * TILE_SIZE
  const y = gridY * TILE_SIZE

  if (tile === "#") {
    if (
      drawArtImage("tiles", [`${state.currentMap}_wall`, "wall"], x, y, TILE_SIZE, TILE_SIZE)
    ) {
      return
    }
    drawWallTile(x, y, gridX, gridY)
    return
  }

  if (tile === "g") {
    if (
      drawArtImage(
        "tiles",
        [`${state.currentMap}_grass`, `${state.currentMap}_ground`, "grass"],
        x,
        y,
        TILE_SIZE,
        TILE_SIZE
      )
    ) {
      return
    }
    drawGrassTile(x, y, gridX, gridY, time)
    return
  }

  if (tile === specialTileIds.shaking) {
    drawShakingGrassTile(x, y, gridX, gridY, time)
    return
  }

  if (tile === "w") {
    drawWaterTile(x, y, gridX, gridY, time)
    return
  }

  if (tile === specialTileIds.ripple) {
    drawWaterTile(x, y, gridX, gridY, time)
    drawRippleTile(x, y, time)
    return
  }

  if (tile === specialTileIds.dust) {
    drawFloorTile(x, y, gridX, gridY)
    drawDustTile(x, y, time)
    return
  }

  if (tile === "F") {
    if (drawArtImage("tiles", ["fountain"], x, y, TILE_SIZE, TILE_SIZE)) {
      return
    }
    drawFloorTile(x, y, gridX, gridY)
    drawFountainTile(x, y, time)
    return
  }

  if (tile === "L") {
    if (drawArtImage("tiles", ["lab"], x, y, TILE_SIZE, TILE_SIZE)) {
      return
    }
    drawFloorTile(x, y, gridX, gridY)
    drawLabTile(x, y)
    return
  }

  if (tile === "D") {
    if (drawArtImage("tiles", ["gym_door"], x, y, TILE_SIZE, TILE_SIZE)) {
      return
    }
    drawFloorTile(x, y, gridX, gridY)
    drawDoorTile(x, y)
    return
  }

  if (tile === specialTileIds.fieldChest) {
    drawFloorTile(x, y, gridX, gridY)
    drawFieldChestTile(x, y, time)
    return
  }

  if (state.currentMap === "home" && ["C", "G", "X", "Y", "B"].includes(tile)) {
    drawFloorTile(x, y, gridX, gridY)
    drawHomeFacilityTile(tile, x, y, time)
    return
  }

  if (MARKER_TILES.has(tile)) {
    drawFloorTile(x, y, gridX, gridY)
    drawGuideTile(tile, x, y, time)
    return
  }

  if (tile === ">" || tile === "<" || tile === "v") {
    const artKey = tile === ">" ? "exit_right" : tile === "<" ? "exit_left" : "exit_down"
    if (drawArtImage("tiles", [artKey], x, y, TILE_SIZE, TILE_SIZE)) {
      return
    }
    drawFloorTile(x, y, gridX, gridY)
    drawExitTile(x, y, tile, time)
    return
  }

  if (
    drawArtImage("tiles", [`${state.currentMap}_ground`, "ground"], x, y, TILE_SIZE, TILE_SIZE)
  ) {
    return
  }
  drawFloorTile(x, y, gridX, gridY)
}

function drawSceneBackdrop(time) {
  const theme = sceneThemes[state.currentMap]

  if (drawArtImage("scene", [state.currentMap], 0, 0, ui.canvas.width, ui.canvas.height)) {
    return
  }

  const sky = ctx.createLinearGradient(0, 0, 0, ui.canvas.height)
  sky.addColorStop(0, theme.backdropTop)
  sky.addColorStop(0.56, theme.backdropBottom)
  sky.addColorStop(1, state.currentMap === "gym" ? "#4b4643" : "#5f7058")
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, ui.canvas.width, ui.canvas.height)

  ctx.fillStyle = theme.haze
  ctx.beginPath()
  ctx.ellipse(126, 98, 102, 80, -0.18, 0, Math.PI * 2)
  ctx.fill()

  if (state.currentMap === "town") {
    const glow = ctx.createRadialGradient(580, 96, 14, 580, 96, 150)
    glow.addColorStop(0, "rgba(255, 252, 233, 0.88)")
    glow.addColorStop(0.4, "rgba(255, 228, 165, 0.42)")
    glow.addColorStop(1, "rgba(255, 228, 165, 0)")
    ctx.fillStyle = glow
    ctx.fillRect(420, 0, 300, 220)

    for (let layer = 0; layer < 3; layer += 1) {
      const baseY = 186 + layer * 22
      const alpha = 0.22 - layer * 0.05
      ctx.fillStyle = `rgba(98, 130, 157, ${alpha})`
      ctx.beginPath()
      ctx.moveTo(0, baseY + 28)
      for (let tower = 0; tower <= 9; tower += 1) {
        const px = tower * 86
        const height = 38 + ((tower + layer) % 3) * 24
        ctx.lineTo(px, baseY - height + Math.sin(time / 1800 + tower + layer) * 3)
        ctx.lineTo(px + 34, baseY - height + 8)
        ctx.lineTo(px + 60, baseY + 18)
      }
      ctx.lineTo(ui.canvas.width, ui.canvas.height)
      ctx.lineTo(0, ui.canvas.height)
      ctx.closePath()
      ctx.fill()
    }

    ctx.strokeStyle = "rgba(255, 255, 255, 0.28)"
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.ellipse(384, 282, 260, 72, 0, Math.PI, 0, true)
    ctx.stroke()

    ctx.strokeStyle = "rgba(221, 176, 98, 0.34)"
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.ellipse(384, 286, 220, 48, 0, Math.PI, 0, true)
    ctx.stroke()
  } else if (state.currentMap === "route" || state.currentMap === "meadow") {
    for (let layer = 0; layer < 4; layer += 1) {
      const y = 156 + layer * 34
      const alpha = 0.16 - layer * 0.025
      ctx.fillStyle = `rgba(88, 136, 102, ${alpha})`
      ctx.beginPath()
      ctx.moveTo(0, y + 34)
      for (let step = 0; step <= 9; step += 1) {
        const px = step * 88
        const py = y + Math.sin(time / 1500 + step + layer * 0.7) * 14 - (step % 2 === 0 ? 16 : 4)
        ctx.lineTo(px, py)
      }
      ctx.lineTo(ui.canvas.width, ui.canvas.height)
      ctx.lineTo(0, ui.canvas.height)
      ctx.closePath()
      ctx.fill()
    }

    ctx.fillStyle = "rgba(255, 203, 165, 0.2)"
    ctx.fillRect(0, 238, ui.canvas.width, 18)
  } else if (state.currentMap === "lake") {
    for (let band = 0; band < 6; band += 1) {
      const y = 126 + band * 46
      const alpha = 0.1 - band * 0.01
      ctx.fillStyle = `rgba(188, 225, 248, ${Math.max(alpha, 0.04)})`
      ctx.fillRect(0, y, ui.canvas.width, 16)
    }
    ctx.fillStyle = "rgba(255, 247, 220, 0.16)"
    ctx.fillRect(0, 228, ui.canvas.width, 20)
  } else if (state.currentMap === "cave" || state.currentMap === "deep_cave") {
    ctx.fillStyle = "rgba(10, 14, 24, 0.18)"
    ctx.fillRect(0, 0, ui.canvas.width, ui.canvas.height)
    for (let arch = 0; arch < 6; arch += 1) {
      const baseX = 40 + arch * 124
      const archTop = 96 + (arch % 2) * 24
      ctx.fillStyle = "rgba(184, 190, 208, 0.08)"
      ctx.beginPath()
      ctx.moveTo(baseX, ui.canvas.height)
      ctx.lineTo(baseX + 16, archTop)
      ctx.lineTo(baseX + 62, archTop - 12)
      ctx.lineTo(baseX + 108, archTop + 8)
      ctx.lineTo(baseX + 124, ui.canvas.height)
      ctx.closePath()
      ctx.fill()
    }
  } else {
    ctx.fillStyle = "rgba(255, 255, 255, 0.08)"
    for (let column = 0; column < 6; column += 1) {
      const x = 64 + column * 118
      ctx.fillRect(x, 96, 18, 220)
      ctx.fillRect(x + 26, 96, 10, 220)
    }

    ctx.strokeStyle = "rgba(229, 195, 124, 0.28)"
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(64, 156)
    ctx.lineTo(704, 156)
    ctx.moveTo(64, 236)
    ctx.lineTo(704, 236)
    ctx.stroke()

    ctx.fillStyle = "rgba(255, 244, 219, 0.12)"
    ctx.beginPath()
    ctx.ellipse(384, 106, 88, 26, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  const cloudCount =
    state.currentMap === "gym" ||
    state.currentMap === "cave" ||
    state.currentMap === "deep_cave" ||
    state.currentMap === "sanctum"
      ? 0
      : 5
  for (let cloud = 0; cloud < cloudCount; cloud += 1) {
    const baseX = ((time / 22) + cloud * 174) % (ui.canvas.width + 180) - 140
    const baseY = state.currentMap === "town" ? 52 + cloud * 24 : 58 + cloud * 18
    ctx.fillStyle = state.currentMap === "town" ? "rgba(255, 255, 255, 0.24)" : "rgba(255, 252, 243, 0.18)"
    ctx.beginPath()
    ctx.ellipse(baseX, baseY, 56, 18, 0, 0, Math.PI * 2)
    ctx.ellipse(baseX + 34, baseY - 6, 44, 15, 0, 0, Math.PI * 2)
    ctx.ellipse(baseX - 28, baseY + 2, 36, 12, 0, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawFloorTile(x, y, gridX, gridY) {
  const theme = sceneThemes[state.currentMap]
  const gradient = ctx.createLinearGradient(x, y, x, y + TILE_SIZE)
  gradient.addColorStop(0, theme.floorLight)
  gradient.addColorStop(1, theme.floorDark)
  ctx.fillStyle = gradient
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE)

  ctx.fillStyle = "rgba(255, 255, 255, 0.18)"
  ctx.fillRect(x + 2, y + 2, TILE_SIZE - 4, 7)
  ctx.fillStyle = "rgba(63, 42, 26, 0.06)"
  ctx.fillRect(x, y + TILE_SIZE - 8, TILE_SIZE, 8)

  const primaryNoise = hashNoise(gridX, gridY, 1)
  const secondaryNoise = hashNoise(gridX, gridY, 2)

  if (state.currentMap === "town") {
    const anchor = sceneAnchors.town
    const dx = gridX + 0.5 - anchor.plazaX
    const dy = gridY + 0.5 - anchor.plazaY
    const distance = Math.hypot(dx, dy * 1.12)

    if (gridX >= 3 && gridX <= 12 && gridY >= 2 && gridY <= 5) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.3)"
      ctx.lineWidth = 1
      ctx.strokeRect(x + 4, y + 4, TILE_SIZE - 8, TILE_SIZE - 8)
    }

    if (distance < 3.6) {
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0.06, 0.22 - distance * 0.04)})`
      ctx.fillRect(x + 5, y + 5, TILE_SIZE - 10, TILE_SIZE - 10)
      ctx.strokeStyle = `rgba(221, 176, 98, ${Math.max(0.14, 0.34 - distance * 0.05)})`
      ctx.strokeRect(x + 9, y + 9, TILE_SIZE - 18, TILE_SIZE - 18)
    }

    if (gridY === 6) {
      ctx.fillStyle = "rgba(129, 190, 232, 0.18)"
      ctx.fillRect(x, y + 14, TILE_SIZE, 20)
      ctx.strokeStyle = "rgba(221, 176, 98, 0.46)"
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(x + 6, y + 24)
      ctx.lineTo(x + TILE_SIZE - 6, y + 24)
      ctx.stroke()
    }

    if (gridX === 7 || gridX === 8) {
      ctx.fillStyle = "rgba(129, 190, 232, 0.14)"
      ctx.fillRect(x + 15, y, 18, TILE_SIZE)
      ctx.strokeStyle = "rgba(221, 176, 98, 0.28)"
      ctx.strokeRect(x + 15, y + 4, 18, TILE_SIZE - 8)
    }

    if ((gridX === 5 || gridX === 10) && gridY >= 2 && gridY <= 6 && secondaryNoise > 0.3) {
      ctx.fillStyle = theme.foliage
      ctx.beginPath()
      ctx.arc(x + 18, y + 30, 4.2, 0, Math.PI * 2)
      ctx.arc(x + 26, y + 26, 3.8, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = secondaryNoise > 0.62 ? "#ffe0ae" : "#f8f4d8"
      ctx.beginPath()
      ctx.arc(x + 22, y + 28, 2.8, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  if (state.currentMap === "route" || state.currentMap === "meadow") {
    ctx.fillStyle = "rgba(255, 248, 223, 0.22)"
    ctx.beginPath()
    ctx.ellipse(x + 22, y + 14, 14, 5, 0.25, 0, Math.PI * 2)
    ctx.fill()

    if (secondaryNoise > 0.5) {
      ctx.fillStyle = "rgba(121, 101, 72, 0.2)"
      ctx.beginPath()
      ctx.arc(x + 18, y + 34, 2 + primaryNoise * 1.6, 0, Math.PI * 2)
      ctx.arc(x + 28, y + 28, 1.8 + secondaryNoise * 1.5, 0, Math.PI * 2)
      ctx.fill()
    }

    if (primaryNoise > 0.7) {
      ctx.fillStyle = secondaryNoise > 0.86 ? "#f7c7cf" : "#fff3bf"
      ctx.beginPath()
      ctx.arc(x + 14, y + 26, 2.2, 0, Math.PI * 2)
      ctx.arc(x + 21, y + 23, 1.8, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  if (state.currentMap === "gym" || state.currentMap === "sanctum") {
    ctx.strokeStyle = "rgba(255, 250, 238, 0.18)"
    ctx.lineWidth = 1
    ctx.strokeRect(x + 4, y + 4, TILE_SIZE - 8, TILE_SIZE - 8)

    ctx.strokeStyle = "rgba(229, 195, 124, 0.22)"
    ctx.beginPath()
    ctx.moveTo(x + TILE_SIZE / 2, y + 10)
    ctx.lineTo(x + TILE_SIZE - 10, y + TILE_SIZE / 2)
    ctx.lineTo(x + TILE_SIZE / 2, y + TILE_SIZE - 10)
    ctx.lineTo(x + 10, y + TILE_SIZE / 2)
    ctx.closePath()
    ctx.stroke()

    if (primaryNoise > 0.64) {
      ctx.strokeStyle = "rgba(229, 195, 124, 0.36)"
      ctx.beginPath()
      ctx.moveTo(x + 12, y + 12)
      ctx.lineTo(x + TILE_SIZE - 12, y + TILE_SIZE - 12)
      ctx.moveTo(x + TILE_SIZE - 12, y + 12)
      ctx.lineTo(x + 12, y + TILE_SIZE - 12)
      ctx.stroke()
    }
  }
}

function drawGrassTile(x, y, gridX, gridY, time) {
  const theme = sceneThemes[state.currentMap] || sceneThemes.route
  const base = ctx.createLinearGradient(x, y, x, y + TILE_SIZE)
  base.addColorStop(0, "#8edb64")
  base.addColorStop(1, "#5f9f40")
  ctx.fillStyle = base
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE)

  ctx.fillStyle = "rgba(236, 255, 205, 0.18)"
  ctx.fillRect(x + 2, y + 2, TILE_SIZE - 4, 8)

  for (let blade = 0; blade < 8; blade += 1) {
    const offset = blade * 5 + 5
    const sway = Math.sin(time / 240 + blade + gridX * 0.7 + gridY * 1.3) * 3.4
    ctx.strokeStyle =
      blade % 2 === 0 ? "rgba(229, 255, 182, 0.54)" : "rgba(67, 130, 54, 0.72)"
    ctx.lineWidth = blade % 2 === 0 ? 1.1 : 1.8
    ctx.beginPath()
    ctx.moveTo(x + offset, y + TILE_SIZE)
    ctx.lineTo(x + offset + sway, y + 11 + (blade % 3) * 3)
    ctx.stroke()
  }

  if (hashNoise(gridX, gridY, 9) > 0.52) {
    ctx.fillStyle = hashNoise(gridX, gridY, 13) > 0.62 ? "#fff4c9" : "#f6c4cf"
    ctx.beginPath()
    ctx.arc(x + 15, y + 18, 2.2, 0, Math.PI * 2)
    ctx.arc(x + 20, y + 21, 1.8, 0, Math.PI * 2)
    ctx.fill()
  }

  if (hashNoise(gridX, gridY, 17) > 0.7) {
    ctx.fillStyle = `${theme.trim}55`
    ctx.fillRect(x + 6, y + 34, TILE_SIZE - 12, 2)
  }
}

function drawShakingGrassTile(x, y, gridX, gridY, time) {
  drawGrassTile(x, y, gridX, gridY, time)
  const pulse = 0.3 + Math.sin(time / 140 + gridX * 0.7 + gridY) * 0.22
  ctx.strokeStyle = `rgba(255, 243, 184, ${Math.max(0.16, pulse)})`
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(x + TILE_SIZE / 2, y + TILE_SIZE / 2, 18 + Math.sin(time / 180) * 2, 0, Math.PI * 2)
  ctx.stroke()
}

function drawWaterTile(x, y, gridX, gridY, time) {
  const theme = sceneThemes[state.currentMap] || sceneThemes.lake
  const base = ctx.createLinearGradient(x, y, x, y + TILE_SIZE)
  base.addColorStop(0, `${theme.water}dd`)
  base.addColorStop(1, "#4678a8")
  ctx.fillStyle = base
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE)

  ctx.strokeStyle = "rgba(218, 242, 255, 0.42)"
  ctx.lineWidth = 1.2
  for (let i = 0; i < 3; i += 1) {
    const waveY = y + 14 + i * 14 + Math.sin(time / 220 + gridX * 0.6 + i) * 2
    ctx.beginPath()
    ctx.moveTo(x + 6, waveY)
    ctx.quadraticCurveTo(x + 18, waveY - 3, x + 30, waveY)
    ctx.quadraticCurveTo(x + 42, waveY + 3, x + TILE_SIZE - 6, waveY)
    ctx.stroke()
  }
}

function drawRippleTile(x, y, time) {
  ctx.strokeStyle = "rgba(234, 248, 255, 0.76)"
  ctx.lineWidth = 2
  for (let ring = 0; ring < 3; ring += 1) {
    const radius = 8 + ring * 5 + Math.sin(time / 180 + ring) * 1.5
    ctx.beginPath()
    ctx.arc(x + TILE_SIZE / 2, y + TILE_SIZE / 2, radius, 0, Math.PI * 2)
    ctx.stroke()
  }
}

function drawDustTile(x, y, time) {
  ctx.fillStyle = "rgba(93, 79, 63, 0.2)"
  ctx.fillRect(x + 7, y + 8, TILE_SIZE - 14, TILE_SIZE - 16)
  for (let i = 0; i < 6; i += 1) {
    const px = x + 12 + i * 6
    const py = y + 20 + ((i % 2) * 8) + Math.sin(time / 180 + i) * 2
    ctx.fillStyle = `rgba(195, 182, 156, ${0.26 + (i % 3) * 0.08})`
    ctx.beginPath()
    ctx.arc(px, py, 2 + (i % 2), 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawGuideTile(tile, x, y, time) {
  const guideStyleByTile = {
    [specialTileIds.guideArcane]: { label: "A", color: "#9f84df", glow: "rgba(180, 150, 255, 0.28)" },
    [specialTileIds.guideSun]: { label: "S", color: "#e6b95f", glow: "rgba(255, 219, 140, 0.28)" },
    [specialTileIds.guideWeapon]: { label: "W", color: "#b68f65", glow: "rgba(224, 194, 162, 0.26)" },
    [specialTileIds.shrineGate]: { label: "T", color: "#87a4cf", glow: "rgba(163, 189, 226, 0.24)" },
    [specialTileIds.legendAltar]: { label: "Z", color: "#f0d08a", glow: "rgba(255, 230, 172, 0.28)" },
    [specialTileIds.orchardGate]: { label: "O", color: "#9bcf66", glow: "rgba(184, 231, 144, 0.26)" },
    [specialTileIds.reefGate]: { label: "K", color: "#6cb4dc", glow: "rgba(153, 219, 248, 0.26)" },
    [specialTileIds.ridgeGate]: { label: "P", color: "#a3abcb", glow: "rgba(194, 202, 232, 0.24)" },
    [specialTileIds.isletGate]: { label: "U", color: "#7ec0a5", glow: "rgba(173, 230, 207, 0.24)" },
    [specialTileIds.statue]: { label: "M", color: "#e6d39d", glow: "rgba(245, 228, 177, 0.3)" },
    c: { label: "洞", color: "#8ea3bc", glow: "rgba(172, 192, 218, 0.2)" },
  }

  const style = guideStyleByTile[tile] || { label: "?", color: "#9aa4b8", glow: "rgba(200,210,230,0.18)" }
  const pulse = 0.2 + Math.sin(time / 220) * 0.08
  ctx.fillStyle = style.glow
  ctx.beginPath()
  ctx.roundRect(x + 6, y + 6, TILE_SIZE - 12, TILE_SIZE - 12, 12)
  ctx.fill()

  ctx.strokeStyle = `rgba(255,255,255,${0.25 + pulse})`
  ctx.lineWidth = 1.4
  ctx.stroke()

  ctx.fillStyle = style.color
  ctx.font = "700 20px 'Inter', 'Microsoft YaHei', sans-serif"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText(style.label, x + TILE_SIZE / 2, y + TILE_SIZE / 2 + 1)
}

function drawWallTile(x, y, gridX, gridY) {
  const theme = sceneThemes[state.currentMap]
  const wallGradient = ctx.createLinearGradient(x, y, x, y + TILE_SIZE)
  wallGradient.addColorStop(0, theme.wallLight)
  wallGradient.addColorStop(1, theme.wallDark)
  ctx.fillStyle = wallGradient
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE)

  ctx.fillStyle = "rgba(255, 255, 255, 0.18)"
  ctx.fillRect(x + 3, y + 3, TILE_SIZE - 6, 6)
  ctx.fillStyle = "rgba(0, 0, 0, 0.12)"
  ctx.fillRect(x, y + TILE_SIZE - 10, TILE_SIZE, 10)

  if (state.currentMap === "town") {
    ctx.fillStyle = `${theme.glass}aa`
    ctx.fillRect(x + 10, y + 9, TILE_SIZE - 20, 10)
    ctx.fillStyle = `${theme.trim}aa`
    ctx.fillRect(x + 6, y + 22, TILE_SIZE - 12, 4)
    ctx.strokeStyle = "rgba(124, 93, 65, 0.14)"
    ctx.beginPath()
    ctx.moveTo(x + 12, y + 8)
    ctx.lineTo(x + 12, y + TILE_SIZE - 8)
    ctx.moveTo(x + TILE_SIZE - 12, y + 8)
    ctx.lineTo(x + TILE_SIZE - 12, y + TILE_SIZE - 8)
    ctx.stroke()
    if ((gridX + gridY) % 2 === 0) {
      ctx.fillStyle = "rgba(255, 248, 234, 0.72)"
      ctx.fillRect(x + 16, y + 28, TILE_SIZE - 32, 10)
    }
    return
  }

  if (state.currentMap === "route" || state.currentMap === "meadow") {
    ctx.fillStyle = `${theme.foliage}dd`
    ctx.fillRect(x, y, TILE_SIZE, 8)
    ctx.strokeStyle = "rgba(94, 80, 61, 0.18)"
    for (let row = 0; row < 3; row += 1) {
      const brickY = y + 12 + row * 11
      ctx.beginPath()
      ctx.moveTo(x + 4, brickY)
      ctx.lineTo(x + TILE_SIZE - 4, brickY)
      ctx.stroke()
    }
    return
  }

  ctx.strokeStyle = "rgba(84, 71, 60, 0.18)"
  ctx.strokeRect(x + 4, y + 4, TILE_SIZE - 8, TILE_SIZE - 8)
  ctx.strokeStyle = "rgba(229, 195, 124, 0.24)"
  ctx.beginPath()
  ctx.moveTo(x + TILE_SIZE / 2, y + 8)
  ctx.lineTo(x + TILE_SIZE - 10, y + TILE_SIZE / 2)
  ctx.lineTo(x + TILE_SIZE / 2, y + TILE_SIZE - 8)
  ctx.lineTo(x + 10, y + TILE_SIZE / 2)
  ctx.closePath()
  ctx.stroke()

  if (hashNoise(gridX, gridY, 15) > 0.66) {
    ctx.fillStyle = "rgba(235, 199, 111, 0.16)"
    ctx.fillRect(x + 8, y + 12, TILE_SIZE - 16, 5)
  }
}

function drawFountainTile(x, y, time) {
  const theme = sceneThemes.town
  ctx.fillStyle = "rgba(255, 250, 241, 0.72)"
  ctx.fillRect(x + 4, y + 11, TILE_SIZE - 8, TILE_SIZE - 22)
  ctx.fillStyle = `${theme.water}aa`
  ctx.fillRect(x + 7, y + 14, TILE_SIZE - 14, TILE_SIZE - 28)
  ctx.fillStyle = theme.water
  ctx.beginPath()
  ctx.arc(x + TILE_SIZE / 2, y + TILE_SIZE / 2, 12, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = "rgba(255,255,255,0.56)"
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(x + TILE_SIZE / 2, y + TILE_SIZE / 2, 7 + Math.sin(time / 240) * 1.5, 0, Math.PI * 2)
  ctx.stroke()

  ctx.fillStyle = `${theme.trim}cc`
  ctx.fillRect(x + 4, y + 10, TILE_SIZE - 8, 3)

  ctx.fillStyle = "rgba(255,255,255,0.72)"
  ctx.beginPath()
  ctx.arc(x + 17, y + 17, 2.4, 0, Math.PI * 2)
  ctx.arc(x + 29, y + 24, 1.8, 0, Math.PI * 2)
  ctx.fill()
}

function drawLabTile(x, y) {
  const theme = sceneThemes.town
  ctx.fillStyle = "rgba(255, 248, 235, 0.96)"
  ctx.fillRect(x + 8, y + 12, TILE_SIZE - 16, TILE_SIZE - 20)
  ctx.fillStyle = theme.glass
  ctx.fillRect(x + 12, y + 9, TILE_SIZE - 24, 9)
  ctx.fillStyle = theme.trim
  ctx.fillRect(x + 10, y + 20, TILE_SIZE - 20, 4)
  ctx.fillStyle = "rgba(255, 255, 255, 0.8)"
  ctx.fillRect(x + 16, y + 24, TILE_SIZE - 32, 9)
  ctx.fillStyle = "#836149"
  ctx.fillRect(x + 21, y + 31, 6, 9)
}

function drawDoorTile(x, y) {
  const theme = sceneThemes.gym
  ctx.fillStyle = "rgba(255, 248, 236, 0.92)"
  ctx.fillRect(x + 8, y + 8, TILE_SIZE - 16, 34)
  ctx.fillStyle = theme.glass
  ctx.fillRect(x + 12, y + 10, TILE_SIZE - 24, 8)
  ctx.fillStyle = theme.trim
  ctx.fillRect(x + 10, y + 20, TILE_SIZE - 20, 4)
  ctx.fillStyle = "#8f6543"
  ctx.fillRect(x + 20, y + 23, 8, 15)
  ctx.fillStyle = "rgba(255, 247, 228, 0.42)"
  ctx.fillRect(x + 14, y + 13, 20, 4)
}

function drawFieldChestTile(x, y, time) {
  const glow = 0.5 + Math.sin(time / 260) * 0.18
  ctx.fillStyle = "rgba(82, 62, 42, 0.94)"
  ctx.fillRect(x + 8, y + 18, TILE_SIZE - 16, 20)
  ctx.fillStyle = "rgba(169, 118, 62, 0.96)"
  ctx.fillRect(x + 7, y + 11, TILE_SIZE - 14, 11)
  ctx.fillStyle = "rgba(236, 197, 122, 0.94)"
  ctx.fillRect(x + 18, y + 15, TILE_SIZE - 36, 12)
  ctx.fillStyle = `rgba(255, 224, 146, ${glow.toFixed(3)})`
  ctx.fillRect(x + 14, y + 9, TILE_SIZE - 28, 3)
}

function drawExitTile(x, y, tile, time) {
  const theme = sceneThemes[state.currentMap]
  const bob = Math.sin(time / 260) * 1.4

  ctx.fillStyle = "rgba(255, 255, 255, 0.18)"
  ctx.fillRect(x + 4, y + 4, TILE_SIZE - 8, TILE_SIZE - 8)
  ctx.strokeStyle = "rgba(221, 176, 98, 0.3)"
  ctx.strokeRect(x + 6, y + 6, TILE_SIZE - 12, TILE_SIZE - 12)

  ctx.save()
  ctx.translate(x + TILE_SIZE / 2, y + TILE_SIZE / 2 + bob)
  ctx.fillStyle = theme.accent
  ctx.beginPath()
  if (tile === ">") {
    ctx.moveTo(-10, -10)
    ctx.lineTo(10, 0)
    ctx.lineTo(-10, 10)
  } else if (tile === "<") {
    ctx.moveTo(10, -10)
    ctx.lineTo(-10, 0)
    ctx.lineTo(10, 10)
  } else {
    ctx.moveTo(-10, -6)
    ctx.lineTo(0, 10)
    ctx.lineTo(10, -6)
  }
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

function drawHomeFacilityTile(tile, x, y, time) {
  if (tile === "B") {
    drawFieldChestTile(x, y, time)
    return
  }

  if (tile === "C") {
    ctx.fillStyle = "rgba(130, 95, 58, 0.95)"
    ctx.fillRect(x + 9, y + 15, TILE_SIZE - 18, TILE_SIZE - 20)
    ctx.fillStyle = "rgba(201, 161, 103, 0.9)"
    ctx.fillRect(x + 8, y + 11, TILE_SIZE - 16, 8)
    ctx.fillStyle = "rgba(248, 226, 178, 0.75)"
    ctx.fillRect(x + 18, y + 22, TILE_SIZE - 36, 9)
    drawHomeFacilityLabel("仓", "#d9b372", x, y)
    return
  }

  if (tile === "Y") {
    ctx.fillStyle = "rgba(223, 199, 236, 0.88)"
    ctx.beginPath()
    ctx.roundRect(x + 13, y + 12, TILE_SIZE - 26, TILE_SIZE - 20, 8)
    ctx.fill()
    ctx.fillStyle = "rgba(180, 140, 210, 0.95)"
    ctx.beginPath()
    ctx.moveTo(x + TILE_SIZE / 2, y + 10)
    ctx.lineTo(x + TILE_SIZE - 16, y + 24)
    ctx.lineTo(x + TILE_SIZE / 2, y + TILE_SIZE - 9)
    ctx.lineTo(x + 16, y + 24)
    ctx.closePath()
    ctx.fill()
    drawHomeFacilityLabel("愿", "#c98ae8", x, y)
    return
  }

  if (tile === "G") {
    ctx.fillStyle = "rgba(135, 116, 90, 0.95)"
    ctx.fillRect(x + 8, y + 22, TILE_SIZE - 16, 8)
    ctx.fillRect(x + 12, y + 15, 6, 20)
    ctx.fillRect(x + TILE_SIZE - 18, y + 15, 6, 20)
    ctx.fillStyle = "rgba(151, 206, 121, 0.28)"
    ctx.beginPath()
    ctx.roundRect(x + 9, y + 10, TILE_SIZE - 18, 10, 5)
    ctx.fill()
    drawHomeFacilityLabel("融", "#8ccf64", x, y)
    return
  }

  if (tile === "X") {
    const pulse = 0.18 + Math.sin(time / 180) * 0.08
    ctx.fillStyle = "rgba(98, 64, 72, 0.96)"
    ctx.beginPath()
    ctx.roundRect(x + 10, y + 10, TILE_SIZE - 20, TILE_SIZE - 20, 10)
    ctx.fill()
    ctx.strokeStyle = `rgba(224, 118, 134, ${Math.max(0.15, pulse)})`
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(x + 16, y + 16)
    ctx.lineTo(x + TILE_SIZE - 16, y + TILE_SIZE - 16)
    ctx.moveTo(x + TILE_SIZE - 16, y + 16)
    ctx.lineTo(x + 16, y + TILE_SIZE - 16)
    ctx.stroke()
    drawHomeFacilityLabel("噬", "#da7f90", x, y)
  }
}

function drawHomeFacilityLabel(label, color, x, y) {
  ctx.fillStyle = "rgba(255, 255, 255, 0.18)"
  ctx.beginPath()
  ctx.roundRect(x + 16, y + 3, TILE_SIZE - 32, 12, 6)
  ctx.fill()
  ctx.fillStyle = color
  ctx.font = "700 14px 'Inter', 'Microsoft YaHei', sans-serif"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText(label, x + TILE_SIZE / 2, y + 9)
}

function drawAmbientEffects(time) {
  const theme = sceneThemes[state.currentMap]

  ctx.save()
  for (let particle = 0; particle < 18; particle += 1) {
    const size = 1.2 + (particle % 3) * 0.7
    let x
    let y
    let alpha

    if (state.currentMap === "town") {
      x = (particle * 46 + time * 0.03) % (ui.canvas.width + 36)
      y = 120 + ((particle * 54 + time * 0.012) % (ui.canvas.height - 160))
      alpha = 0.24
    } else if (state.currentMap === "route") {
      x = (particle * 41 + time * 0.024) % (ui.canvas.width + 32)
      y = ((particle * 58 + time * 0.017) % (ui.canvas.height + 40)) - 20
      alpha = 0.22
    } else {
      x = 84 + ((particle * 34 + time * 0.012) % (ui.canvas.width - 168))
      y = ((particle * 70 + time * 0.014) % (ui.canvas.height + 24)) - 12
      alpha = 0.18
    }

    ctx.fillStyle = theme.particle.replace(/[\d.]+\)$/u, `${alpha})`)
    ctx.beginPath()
    if (state.currentMap === "route" && particle % 3 === 0) {
      ctx.ellipse(x, y, size * 1.4, size * 0.8, particle, 0, Math.PI * 2)
    } else {
      ctx.arc(x, y, size, 0, Math.PI * 2)
    }
    ctx.fill()
  }
  ctx.restore()
}

function getOverworldSpritePalette(id, fallbackColor = "#6c8fd2") {
  const paletteMap = {
    player: { hair: "#5b432f", skin: "#f1d6b9", top: "#5c86cf", accent: "#e1b35e", lower: "#3d5177" },
    professor: { hair: "#c5ced8", skin: "#eed2bb", top: "#e8edf2", accent: "#7cb5a8", lower: "#8d9cad" },
    caretaker: { hair: "#7d5840", skin: "#f0ceb2", top: "#7cc2b6", accent: "#f4f0df", lower: "#8ea27d" },
    scout: { hair: "#8a5e3e", skin: "#eecdaf", top: "#d98568", accent: "#f2d8a5", lower: "#887861" },
    leader: { hair: "#6f6cb2", skin: "#efd0b1", top: "#f1eee7", accent: "#d8b45e", lower: "#676b92" },
    merchant: { hair: "#684a34", skin: "#edcdb1", top: "#76aa86", accent: "#f0c77a", lower: "#4e6f57" },
    quartermaster: { hair: "#4f4f55", skin: "#efcfb6", top: "#9eb5c7", accent: "#f1d79c", lower: "#55697a" },
    alchemist: { hair: "#6f5aa8", skin: "#efd0b8", top: "#9279cc", accent: "#f3d69d", lower: "#4f4a79" },
    ranger: { hair: "#5c6578", skin: "#eacbad", top: "#8da0be", accent: "#cfbc94", lower: "#4b566a" },
    fisher: { hair: "#49729a", skin: "#ecd1b8", top: "#66a6cb", accent: "#f0d8a8", lower: "#3f617d" },
    breeder: { hair: "#7b5a3f", skin: "#f0cfb2", top: "#cf9f63", accent: "#f3deaf", lower: "#7d6349" },
    captain: { hair: "#4a6d9a", skin: "#ecd0b6", top: "#5da6d4", accent: "#d8ebf7", lower: "#35577a" },
    ace: { hair: "#5a5e7f", skin: "#efd2b8", top: "#a4acc7", accent: "#f2dfa6", lower: "#515873" },
    warden: { hair: "#56735f", skin: "#edcfb6", top: "#82b49a", accent: "#e6ddb1", lower: "#4a6151" },
  }

  const fromMap = paletteMap[id]
  if (fromMap) {
    return fromMap
  }

  return {
    hair: "#4f3d32",
    skin: "#efd3bc",
    top: fallbackColor,
    accent: "#f0d18f",
    lower: "#4d5f7a",
  }
}

function drawPixelCharacterSprite(x, y, palette) {
  const px = 2
  const ox = Math.round(x - 8 * px)
  const oy = Math.round(y - 14 * px)

  ctx.fillStyle = "rgba(0,0,0,0.2)"
  ctx.beginPath()
  ctx.ellipse(x, y + 18, 13, 6, 0, 0, Math.PI * 2)
  ctx.fill()

  const fill = (rx, ry, rw, rh, color) => {
    ctx.fillStyle = color
    ctx.fillRect(ox + rx * px, oy + ry * px, rw * px, rh * px)
  }

  fill(4, 0, 8, 3, palette.hair)
  fill(3, 3, 10, 4, palette.skin)
  fill(4, 7, 8, 6, palette.top)
  fill(2, 7, 2, 4, palette.top)
  fill(12, 7, 2, 4, palette.top)
  fill(5, 10, 6, 1, palette.accent)
  fill(5, 13, 3, 4, palette.lower)
  fill(8, 13, 3, 4, palette.lower)
  fill(4, 16, 3, 1, "#4b4039")
  fill(9, 16, 3, 1, "#4b4039")
}

function drawNpcSprites(time) {
  const visibleNpcs = getVisibleNpcs().filter((npc) => npc.map === state.currentMap)

  for (const npc of visibleNpcs) {
    const bob = Math.sin(time / 220 + npc.x) * 2
    const x = npc.x * TILE_SIZE + TILE_SIZE / 2
    const y = npc.y * TILE_SIZE + TILE_SIZE / 2 + bob
    drawPixelCharacterSprite(x, y, getOverworldSpritePalette(npc.id, npc.color))
    const roleMeta = getNpcRoleMeta(npc.id)
    drawCharacterNameTag(x, y + 22, npc.name, {
      roleColor: roleMeta.color,
    })
  }
}

function drawPlayerSprite(time) {
  // 用渲染坐标（浮点像素）而非逻辑网格坐标，实现平滑补间
  const baseX = Number.isFinite(state.player.renderX) ? state.player.renderX : state.player.x * TILE_SIZE
  const baseY = Number.isFinite(state.player.renderY) ? state.player.renderY : state.player.y * TILE_SIZE
  const x = baseX + TILE_SIZE / 2
  const y = baseY + TILE_SIZE / 2 + Math.sin(time / 160) * 1.5
  drawPixelCharacterSprite(x, y, getOverworldSpritePalette("player"))
  if (shouldRenderPlayerNameTag()) {
    drawCharacterNameTag(x, y + 22, state.playerName || "旅行者", {
      background: "rgba(39, 67, 113, 0.74)",
      border: "rgba(156, 198, 255, 0.7)",
      color: "#eff6ff",
      roleColor: "#8fc2ff",
    })
  }
}

function drawCharacterNameTag(x, y, name, options = {}) {
  const safeName = String(name || "").trim()
  if (!safeName) {
    return
  }

  const label = safeName.length > 10 ? `${safeName.slice(0, 10)}…` : safeName
  const background = options.background || "rgba(19, 25, 38, 0.68)"
  const border = options.border || "rgba(255, 255, 255, 0.35)"
  const color = options.color || "#f6f4ea"

  ctx.save()
  ctx.font = "700 12px 'Inter', 'Microsoft YaHei', sans-serif"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"

  const textWidth = Math.ceil(ctx.measureText(label).width)
  const pillWidth = Math.max(52, textWidth + 14)
  const pillHeight = 18
  const drawX = clamp(x - pillWidth / 2, 4, ui.canvas.width - pillWidth - 4)
  const drawY = clamp(y, 4, ui.canvas.height - pillHeight - 4)

  ctx.fillStyle = background
  ctx.strokeStyle = border
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.roundRect(drawX, drawY, pillWidth, pillHeight, 8)
  ctx.fill()
  ctx.stroke()

  if (options.roleColor) {
    ctx.fillStyle = options.roleColor
    ctx.beginPath()
    ctx.roundRect(drawX + 1, drawY + 1, pillWidth - 2, 3, 2)
    ctx.fill()
  }

  ctx.fillStyle = color
  ctx.fillText(label, drawX + pillWidth / 2, drawY + pillHeight / 2 + 0.5)
  ctx.restore()
}

function shouldRenderPlayerNameTag() {
  const mode = state.playerProfile?.nameTagMode || "always"
  if (mode === "always") {
    return true
  }
  const nearbyNpc = findNearbyNpc()
  if (mode === "nearby") {
    return Boolean(nearbyNpc || getVisibleNpcs().some((npc) => {
      if (npc.map !== state.currentMap) {
        return false
      }
      const distance = Math.abs(npc.x - state.player.x) + Math.abs(npc.y - state.player.y)
      return distance <= 3
    }))
  }
  if (mode === "interaction") {
    return Boolean(nearbyNpc || state.choice)
  }
  return true
}

function getNpcRoleMeta(npcId) {
  const roleMap = {
    professor: { role: "导师", color: "#f0c36d" },
    caretaker: { role: "后勤", color: "#7bc6df" },
    merchant: { role: "商店", color: "#7fcf8f" },
    quartermaster: { role: "补给", color: "#d9b06f" },
    leader: { role: "道馆", color: "#ffcc66" },
    gym_aide: { role: "道馆", color: "#d4c870" },
    scout: { role: "反派", color: "#d16d6d" },
    vanguard: { role: "反派", color: "#cc6377" },
  }
  return roleMap[npcId] || { role: "角色", color: "#9eb8d5" }
}

function drawSceneFinish(time) {
  const theme = sceneThemes[state.currentMap]
  const light = ctx.createLinearGradient(0, 0, ui.canvas.width, ui.canvas.height)
  light.addColorStop(0, theme.ambient)
  light.addColorStop(0.52, "rgba(255,255,255,0)")
  light.addColorStop(1, "rgba(0,0,0,0.11)")
  ctx.fillStyle = light
  ctx.fillRect(0, 0, ui.canvas.width, ui.canvas.height)

  ctx.strokeStyle = "rgba(255,255,255,0.12)"
  ctx.lineWidth = 2
  ctx.strokeRect(1, 1, ui.canvas.width - 2, ui.canvas.height - 2)

  ctx.fillStyle = "rgba(17, 18, 23, 0.08)"
  ctx.fillRect(0, ui.canvas.height - 48, ui.canvas.width, 48)

  const edgeShadeTop = ctx.createLinearGradient(0, 0, 0, 96)
  edgeShadeTop.addColorStop(0, "rgba(8, 12, 18, 0.2)")
  edgeShadeTop.addColorStop(1, "rgba(8, 12, 18, 0)")
  ctx.fillStyle = edgeShadeTop
  ctx.fillRect(0, 0, ui.canvas.width, 96)

  const edgeShadeSides = ctx.createLinearGradient(0, 0, 58, 0)
  edgeShadeSides.addColorStop(0, "rgba(7, 11, 16, 0.18)")
  edgeShadeSides.addColorStop(1, "rgba(7, 11, 16, 0)")
  ctx.fillStyle = edgeShadeSides
  ctx.fillRect(0, 0, 58, ui.canvas.height)
  ctx.save()
  ctx.translate(ui.canvas.width, 0)
  ctx.scale(-1, 1)
  ctx.fillRect(0, 0, 58, ui.canvas.height)
  ctx.restore()

  if (state.currentMap === "town") {
    ctx.fillStyle = "rgba(255, 233, 188, 0.12)"
    ctx.beginPath()
    ctx.ellipse(384, 370, 250, 46, 0, 0, Math.PI * 2)
    ctx.fill()

    ctx.strokeStyle = "rgba(221, 176, 98, 0.24)"
    ctx.beginPath()
    ctx.ellipse(384, 370, 216, 30, 0, 0, Math.PI * 2)
    ctx.stroke()
  } else if (state.currentMap === "route" || state.currentMap === "meadow") {
    ctx.fillStyle = "rgba(255, 244, 210, 0.08)"
    ctx.fillRect(0, 0, ui.canvas.width, 80)
  } else if (state.currentMap === "lake") {
    ctx.fillStyle = "rgba(210, 234, 255, 0.1)"
    ctx.fillRect(0, 0, ui.canvas.width, 94)
    ctx.strokeStyle = "rgba(200, 228, 255, 0.2)"
    ctx.beginPath()
    ctx.moveTo(0, 92)
    ctx.lineTo(ui.canvas.width, 92)
    ctx.stroke()
  } else if (state.currentMap === "cave" || state.currentMap === "deep_cave") {
    ctx.fillStyle = "rgba(7, 10, 16, 0.22)"
    ctx.fillRect(0, 0, ui.canvas.width, ui.canvas.height)
  } else {
    ctx.fillStyle = "rgba(255, 244, 219, 0.06)"
    ctx.beginPath()
    ctx.moveTo(240, 0)
    ctx.lineTo(528, 0)
    ctx.lineTo(448, 240)
    ctx.lineTo(320, 240)
    ctx.closePath()
    ctx.fill()
  }
}

function drawNpcSpeechBubble(time) {
  const focus = state.storyFocus
  if (!focus?.speakerId || !focus?.line) {
    return
  }

  const npc = getVisibleNpcs().find(
    (entry) => entry.id === focus.speakerId && entry.map === state.currentMap
  )
  if (!npc) {
    return
  }

  const bob = Math.sin(time / 220 + npc.x) * 2
  const x = npc.x * TILE_SIZE + TILE_SIZE / 2
  const y = npc.y * TILE_SIZE + TILE_SIZE / 2 + bob
  const rawText = String(focus.line).replace(/\s+/g, " ").trim()
  const maxBubbleWidth = 300
  const minBubbleWidth = 120
  const bubbleHeight = 34

  ctx.save()
  ctx.font = "700 16px 'Inter', 'Microsoft YaHei', sans-serif"
  const text = fitSingleLineText(rawText, maxBubbleWidth - 24) || "..."
  const measured = ctx.measureText(text).width
  const bubbleWidth = Math.min(maxBubbleWidth, Math.max(minBubbleWidth, measured + 26))
  const bx = clamp(x - bubbleWidth / 2, 12, ui.canvas.width - bubbleWidth - 12)
  const by = y - 74

  ctx.fillStyle = "rgba(255,255,255,0.96)"
  ctx.strokeStyle = "rgba(42,50,66,0.78)"
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.roundRect(bx, by, bubbleWidth, bubbleHeight, 10)
  ctx.fill()
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(x - 8, by + bubbleHeight)
  ctx.lineTo(x + 8, by + bubbleHeight)
  ctx.lineTo(x, by + bubbleHeight + 10)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = "#233047"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText(text, bx + bubbleWidth / 2, by + bubbleHeight / 2 + 1)
  ctx.restore()
}

function fitSingleLineText(text, maxWidth) {
  const normalized = String(text || "").trim()
  if (!normalized) {
    return ""
  }

  if (ctx.measureText(normalized).width <= maxWidth) {
    return normalized
  }

  const ellipsis = "..."
  let output = normalized
  while (output.length > 0) {
    const candidate = `${output}${ellipsis}`
    if (ctx.measureText(candidate).width <= maxWidth) {
      return candidate
    }
    output = output.slice(0, -1)
  }

  return ellipsis
}

function hashNoise(x, y, seed) {
  const value = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453123
  return value - Math.floor(value)
}

function addDialogue(message, options = {}) {
  state.dialogue.push(message)
  state.dialogue = state.dialogue.slice(-20)

  if (options.updateStoryFocus === false) {
    return
  }

  state.storyFocus = deriveDialogueFocus(message, options)
  renderStoryPortraitPanel()
}

function addBattleLog(message) {
  if (!state.battle) {
    return
  }
  state.battle.log.push(message)
  state.battle.log = state.battle.log.slice(-16)
  renderBattlePanel()
}

function findNearbyNpc() {
  const visibleNpcs = getVisibleNpcs().filter((npc) => npc.map === state.currentMap)
  visibleNpcs.sort(
    (left, right) =>
      Math.abs(left.x - state.player.x) +
      Math.abs(left.y - state.player.y) -
      (Math.abs(right.x - state.player.x) + Math.abs(right.y - state.player.y))
  )

  return visibleNpcs.find(
    (npc) => Math.abs(npc.x - state.player.x) + Math.abs(npc.y - state.player.y) === 1
  )
}

function getVisibleNpcs() {
  return npcDefinitions.filter((npc) => npc.visible())
}

function isNpcBlocking(mapId, x, y) {
  return getVisibleNpcs().some((npc) => npc.map === mapId && npc.x === x && npc.y === y)
}

function isPassable(mapId, x, y) {
  if (x < 0 || y < 0 || x >= MAP_WIDTH || y >= MAP_HEIGHT) {
    return false
  }

  return getTile(mapId, x, y) !== "#"
}

function getTile(mapId, x, y) {
  return maps[mapId].tiles[y][x]
}

function getEnemyMonster() {
  if (!state.battle) {
    return null
  }

  return state.battle.enemyParty[state.battle.enemyIndex] || null
}

function getActiveMonster() {
  if (state.player.party.length === 0) {
    return null
  }

  const current = state.player.party[state.player.activeIndex]
  if (current && current.currentHp > 0) {
    return current
  }

  const nextIndex = findNextLivingIndex()
  if (nextIndex === -1) {
    return null
  }

  state.player.activeIndex = nextIndex
  return state.player.party[nextIndex]
}

function findNextLivingIndex() {
  return state.player.party.findIndex((monster) => monster.currentHp > 0)
}

async function switchActiveMonster(index) {
  if (!Number.isInteger(index) || index < 0 || index >= state.player.party.length) {
    return
  }

  if (state.scene === "battle") {
    await handleBattleAction({ type: "switch", index })
    return
  }

  if (index === state.player.activeIndex) {
    return
  }

  const target = state.player.party[index]
  if (!target || target.currentHp <= 0) {
    addDialogue("该宠物当前无法出战。")
    syncUi()
    return
  }

  state.player.activeIndex = index
  addDialogue(`${speciesData[target.speciesId].name} 现在是你的出战宠物。`)
  syncUi()
  queueSave()
}

function moveReserveMonsterToHome(index) {
  if (!Number.isInteger(index) || index < 0 || index >= state.player.reserve.length) {
    return
  }
  if (!Array.isArray(state.player.home)) {
    state.player.home = []
  }
  if (state.player.home.length >= MAX_HOME_STORAGE_SIZE) {
    addDialogue("家园仓库已满，无法继续转移。")
    return
  }

  const [monster] = state.player.reserve.splice(index, 1)
  if (!monster) {
    return
  }
  monster.currentHp = monster.maxHp
  state.player.home.push(monster)
  addDialogue(`${formatMonsterDisplayName(monster)} 已送回家园仓库。`)
}

function movePartyMonsterToHome(index) {
  if (!Number.isInteger(index) || index < 0 || index >= state.player.party.length) {
    return
  }
  if (!Array.isArray(state.player.home)) {
    state.player.home = []
  }
  if (state.player.party.length <= 1) {
    addDialogue("队伍至少需要保留 1 只精灵，无法全部转入家园仓库。")
    return
  }
  if (state.player.home.length >= MAX_HOME_STORAGE_SIZE) {
    addDialogue("家园仓库已满，无法继续转移。")
    return
  }

  const [monster] = state.player.party.splice(index, 1)
  if (!monster) {
    return
  }

  monster.currentHp = monster.maxHp
  state.player.home.push(monster)

  if (index < state.player.activeIndex) {
    state.player.activeIndex -= 1
  } else if (index === state.player.activeIndex) {
    const nextIndex = findNextLivingIndex()
    state.player.activeIndex = nextIndex >= 0 ? nextIndex : 0
  }

  addDialogue(`${formatMonsterDisplayName(monster)} 已从队伍送入家园仓库。`)
}

function moveHomeMonsterToReserve(index) {
  if (!Number.isInteger(index) || index < 0 || index >= state.player.home.length) {
    return
  }
  if (state.player.reserve.length >= MAX_RESERVE_SIZE) {
    addDialogue(`后备区已满（${MAX_RESERVE_SIZE}）。请先整理后备成员。`)
    return
  }

  const [monster] = state.player.home.splice(index, 1)
  if (!monster) {
    return
  }
  state.player.reserve.push(monster)
  addDialogue(`${formatMonsterDisplayName(monster)} 已调入后备区。`)
}

function moveHomeMonsterToParty(index) {
  if (!Number.isInteger(index) || index < 0 || index >= state.player.home.length) {
    return
  }
  if (state.player.party.length >= MAX_PARTY_SIZE) {
    addDialogue(`当前队伍已满（${MAX_PARTY_SIZE}），请先腾出位置。`)
    return
  }

  const [monster] = state.player.home.splice(index, 1)
  if (!monster) {
    return
  }
  state.player.party.push(monster)
  addDialogue(`${formatMonsterDisplayName(monster)} 已从家园仓库调入当前队伍。`)
}

function moveReserveMonsterToParty(index) {
  if (!Number.isInteger(index) || index < 0 || index >= state.player.reserve.length) {
    return
  }
  if (state.player.party.length >= MAX_PARTY_SIZE) {
    addDialogue("当前队伍已满，无法调入。")
    return
  }
  const [monster] = state.player.reserve.splice(index, 1)
  if (!monster) {
    return
  }
  state.player.party.push(monster)
  addDialogue(`${formatMonsterDisplayName(monster)} 已调入当前队伍。`)
}

function addInventoryItem(itemId, quantity) {
  if (!itemCatalog[itemId] || quantity <= 0) {
    return
  }

  if (itemCatalog[itemId].unique && (state.player.inventory[itemId] || 0) > 0) {
    return
  }

  state.player.inventory[itemId] = (state.player.inventory[itemId] || 0) + quantity
}

function consumeInventoryItem(itemId, quantity) {
  const count = state.player.inventory[itemId] || 0
  if (count < quantity) {
    return false
  }

  state.player.inventory[itemId] = count - quantity
  return true
}

async function useBagItem(itemId) {
  const item = itemCatalog[itemId]
  if (!item) {
    return
  }

  if (state.scene === "battle") {
    await handleBattleAction({ type: "item", itemId })
    return
  }

  if (item.kind === "key") {
    addDialogue(`${item.name} 是关键道具，无法直接使用。`)
    syncUi()
    return
  }

  if (!consumeInventoryItem(itemId, 1)) {
    addDialogue(`${item.name} 数量不足。`)
    syncUi()
    return
  }

  const activeMonster = getActiveMonster()

  if (item.kind === "heal") {
    if (!activeMonster || activeMonster.currentHp <= 0) {
      addDialogue("当前没有可用药品的出战宠物。")
      addInventoryItem(itemId, 1)
      syncUi()
      return
    }
    if (activeMonster.currentHp >= activeMonster.maxHp) {
      addDialogue("出战宠物状态良好，暂时不需要用药。")
      addInventoryItem(itemId, 1)
      syncUi()
      return
    }
    const healed = Math.min(item.heal || 0, activeMonster.maxHp - activeMonster.currentHp)
    activeMonster.currentHp += healed
    addDialogue(`你使用了 ${item.name}，恢复了 ${healed} HP。`)
    syncUi()
    queueSave()
    return
  }

  if (item.kind === "balls") {
    const gain = Math.max(1, Number(item.balls) || 0)
    state.player.balls += gain
    addDialogue(`你使用了 ${item.name}，获得 ${gain} 枚捕捉球。`)
    syncUi()
    queueSave()
    return
  }

  if (item.kind === "essence") {
    const essence = getPlayerEssence()
    const gains = []
    for (const [key, value] of Object.entries(item.essence || {})) {
      if (!Number.isFinite(value) || value <= 0) {
        continue
      }
      essence[key] = (essence[key] || 0) + value
      gains.push(`${key}+${value}`)
    }
    addDialogue(`你吸收了 ${item.name}，获得资源：${gains.join("、")}。`)
    syncUi()
    queueSave()
    return
  }

  if (item.kind === "teach_skill") {
    if (!activeMonster) {
      addDialogue("当前没有可学习技能的出战宠物。")
      addInventoryItem(itemId, 1)
      syncUi()
      return
    }
    const message = teachSkillWithReplacement(activeMonster, item.skillId, "Learning Machine")
    if (!message) {
      addDialogue(`${activeMonster ? speciesData[activeMonster.speciesId].name : "该宠物"} 无法从 ${item.name} 学到新技能。`)
      addInventoryItem(itemId, 1)
      syncUi()
      return
    }
    addDialogue(message)
    syncUi()
    queueSave()
    return
  }

  if (item.kind === "repel") {
    const steps = Math.max(1, Number(item.steps) || 0)
    state.player.repelSteps = Math.max(0, Number(state.player.repelSteps) || 0) + steps
    addDialogue(`你使用了 ${item.name}，接下来 ${steps} 步内普通野怪将回避你。`)
    syncUi()
    queueSave()
    return
  }

  if (item.kind === "rename_profile") {
    const renamed = promptRenameProfileByCard()
    if (!renamed) {
      addDialogue("你暂时收起了命名卡。")
      addInventoryItem(itemId, 1)
      syncUi()
      return
    }
    state.playerName = renamed.playerName
    if (!state.playerProfile || typeof state.playerProfile !== "object") {
      state.playerProfile = {}
    }
    state.playerProfile.title = renamed.title
    state.playerProfile.motto = renamed.motto
    gameStartSettings = sanitizeGameStartSettings({
      ...getGameStartSettings(),
      playerName: renamed.playerName,
    })
    writeGameStartSettings()
    addDialogue(`你使用了命名卡。新的身份是「${renamed.title} ${renamed.playerName}」。`)
    if (renamed.motto) {
      addDialogue(`你的口头禅更新为：「${renamed.motto}」。`)
    } else {
      addDialogue("你的口头禅已清空。")
    }
    syncUi()
    queueSave()
    return
  }

  if (item.kind === "treasure") {
    const baseSellPrice = Number(item.sellPrice) || 0
    const sellPrice =
      typeof getBalancedSellPrice === "function" ? getBalancedSellPrice(baseSellPrice) : baseSellPrice
    state.player.coins += sellPrice
    addDialogue(`你出售了 ${item.name}，获得 ${sellPrice} 金币。`)
    syncUi()
    queueSave()
    return
  }

  if (item.kind === "battle_buff") {
    addDialogue(`${item.name} 仅能在战斗中使用。`)
    addInventoryItem(itemId, 1)
    syncUi()
    return
  }

  addDialogue(`${item.name} 当前没有可执行效果。`)
  addInventoryItem(itemId, 1)
  syncUi()
}

function purchaseFromShop({ price, success }) {
  if (state.player.coins < price) {
    addDialogue("金币不足，先去战斗或推进剧情再来。")
    syncUi()
    return
  }

  state.player.coins -= price
  success()
  syncUi()
  queueSave()
}

function markSeen(speciesId) {
  state.pokedex.seen[speciesId] = true
}

function markCaught(speciesId) {
  state.pokedex.caught[speciesId] = true
}

function generateIvs() {
  return {
    hp: Math.floor(Math.random() * 16),
    attack: Math.floor(Math.random() * 16),
    defense: Math.floor(Math.random() * 16),
    speed: Math.floor(Math.random() * 16),
  }
}

function normalizeIvs(raw) {
  const r = raw && typeof raw === "object" ? raw : {}
  const clampIv = v => clamp(Math.floor(Number.isFinite(v) ? v : 0), 0, 15)
  return {
    hp: clampIv(r.hp),
    attack: clampIv(r.attack),
    defense: clampIv(r.defense),
    speed: clampIv(r.speed),
  }
}

function createMonster(speciesId, level) {
  const monster = {
    uid: makeUid(),
    speciesId,
    level,
    exp: 0,
    currentHp: 1,
    maxHp: 1,
    attack: 1,
    defense: 1,
    speed: 1,
    skills: normalizeSkillSlots(speciesData[speciesId].skills),
    mutation: normalizeMutation(),
    ivs: generateIvs(),
  }

  refreshMonsterStats(monster, { restoreToFull: true })
  return monster
}

function normalizeMonster(rawMonster) {
  const fallback = createMonster(rawMonster.speciesId, rawMonster.level || 1)
  const normalized = {
    uid: rawMonster.uid || fallback.uid,
    speciesId: rawMonster.speciesId,
    level: rawMonster.level || 1,
    exp: rawMonster.exp || 0,
    currentHp: rawMonster.currentHp == null ? fallback.maxHp : rawMonster.currentHp,
    maxHp: fallback.maxHp,
    attack: fallback.attack,
    defense: fallback.defense,
    speed: fallback.speed,
    skills: normalizeSkillSlots(
      rawMonster.skills && rawMonster.skills.length ? rawMonster.skills : fallback.skills
    ),
    mutation: normalizeMutation(rawMonster.mutation),
    ivs: normalizeIvs(rawMonster.ivs),
  }

  refreshMonsterStats(normalized, { preserveHpRatio: false })
  normalized.currentHp = clamp(normalized.currentHp, 0, normalized.maxHp)
  return normalized
}

function normalizeMutation(rawMutation = null) {
  const mutation = rawMutation && typeof rawMutation === "object" ? rawMutation : {}
  const tier = Number.isFinite(mutation.tier) ? mutation.tier : 0
  const fusedElement = alchemyElementTypes.includes(mutation.fusedElement)
    ? mutation.fusedElement
    : null
  const devourType = alchemyElementTypes.includes(mutation.devourType)
    ? mutation.devourType
    : null
  const mode = mutation.mode === "fusion" || mutation.mode === "devour" ? mutation.mode : "none"
  const archetype =
    typeof mutation.archetype === "string" && mutation.archetype
      ? mutation.archetype
      : "none"
  const lastRecipe =
    typeof mutation.lastRecipe === "string" && mutation.lastRecipe
      ? mutation.lastRecipe
      : null
  const portraitKey =
    typeof mutation.portraitKey === "string" && mutation.portraitKey
      ? mutation.portraitKey
      : null
  const trait =
    typeof mutation.trait === "string" && mutation.trait.trim()
      ? mutation.trait.trim()
      : null

  return {
    tier: clamp(Math.floor(tier), 0, 8),
    mode,
    fusedElement,
    devourType,
    archetype,
    lastRecipe,
    portraitKey,
    trait,
  }
}

function getPlayerEssence() {
  if (!state.player.essence || typeof state.player.essence !== "object") {
    state.player.essence = {}
  }

  const defaults = {
    arcane: 0,
    void: 0,
    normal: 0,
    grass: 0,
    fire: 0,
    water: 0,
    bug: 0,
    electric: 0,
    rock: 0,
    fairy: 0,
    sun: 0,
    weapon: 0,
  }

  for (const [key, value] of Object.entries(defaults)) {
    if (!Number.isFinite(state.player.essence[key])) {
      state.player.essence[key] = value
    }
  }

  return state.player.essence
}

function applyMutationBonuses(monster, baseStats) {
  const mutation = normalizeMutation(monster?.mutation)
  const tier = mutation.tier
  const bonus = {
    maxHp: tier * 6,
    attack: tier * 2,
    defense: tier * 2,
    speed: tier,
  }

  if (mutation.mode === "fusion") {
    bonus.maxHp += tier
    bonus.defense += tier
  }

  if (mutation.mode === "devour") {
    bonus.attack += tier
    bonus.speed += Math.floor(tier / 2)
  }

  if (mutation.archetype === "shiny") {
    bonus.speed += 4 + tier
  }

  if (mutation.archetype === "warrior") {
    bonus.attack += 5 + tier
    bonus.defense += 2
  }

  if (mutation.archetype === "resonance") {
    bonus.maxHp += 4 + tier
    bonus.defense += 2 + Math.floor(tier / 2)
  }

  return {
    maxHp: Math.max(1, baseStats.maxHp + bonus.maxHp),
    attack: Math.max(1, baseStats.attack + bonus.attack),
    defense: Math.max(1, baseStats.defense + bonus.defense),
    speed: Math.max(1, baseStats.speed + bonus.speed),
  }
}

function refreshMonsterStats(monster, options = {}) {
  if (!monster || !speciesData[monster.speciesId]) {
    return
  }

  const preserveHpRatio = options.preserveHpRatio !== false
  const restoreToFull = options.restoreToFull === true
  const oldMaxHp = Math.max(monster.maxHp || 1, 1)
  const oldRatio = clamp((monster.currentHp || 0) / oldMaxHp, 0, 1)
  const baseStats = computeStats(monster.speciesId, monster.level || 1, monster.ivs || {})
  const finalStats = applyMutationBonuses(monster, baseStats)

  monster.maxHp = finalStats.maxHp
  monster.attack = finalStats.attack
  monster.defense = finalStats.defense
  monster.speed = finalStats.speed

  if (restoreToFull) {
    monster.currentHp = monster.maxHp
    return
  }

  if (preserveHpRatio) {
    monster.currentHp = clamp(Math.round(monster.maxHp * oldRatio), 0, monster.maxHp)
    return
  }

  monster.currentHp = clamp(monster.currentHp || 0, 0, monster.maxHp)
}

function computeStats(speciesId, level, ivs = {}) {
  const species = speciesData[speciesId]
  const growthProfile = speciesBattleProfiles[speciesId]?.growthProfile || "balanced"
  const growthRates = {
    balanced: { hp: 6, attack: 2, defense: 2, speed: 1 },
    striker: { hp: 5, attack: 3, defense: 1.4, speed: 1.1 },
    tank: { hp: 7.2, attack: 1.8, defense: 2.8, speed: 0.8 },
    swift: { hp: 5.4, attack: 2.2, defense: 1.6, speed: 1.8 },
  }
  const growth = growthRates[growthProfile] || growthRates.balanced

  return {
    maxHp: Math.floor(species.baseHp + level * growth.hp) + (ivs.hp || 0),
    attack: Math.floor(species.baseAttack + level * growth.attack) + (ivs.attack || 0),
    defense: Math.floor(species.baseDefense + level * growth.defense) + (ivs.defense || 0),
    speed: Math.floor(species.baseSpeed + level * growth.speed) + (ivs.speed || 0),
  }
}

function experienceToLevel(level) {
  return 14 + level * 8
}

function rollEncounter(encounters) {
  if (!Array.isArray(encounters) || encounters.length === 0) {
    return null
  }

  const totalWeight = encounters.reduce((sum, item) => sum + item.weight, 0)
  if (totalWeight <= 0) {
    return encounters[0] || null
  }
  let roll = Math.random() * totalWeight

  for (const encounter of encounters) {
    roll -= encounter.weight
    if (roll <= 0) {
      return encounter
    }
  }

  return encounters[0]
}

function getSpeciesTypes(speciesOrId) {
  const isMonsterObject =
    speciesOrId && typeof speciesOrId === "object" && typeof speciesOrId.speciesId === "string"
  const speciesId =
    typeof speciesOrId === "string" ? speciesOrId : speciesOrId?.id || speciesOrId?.speciesId
  if (!speciesId || !speciesData[speciesId]) {
    return ["normal"]
  }

  let types = []
  const profileTypes = speciesBattleProfiles[speciesId]?.types
  if (Array.isArray(profileTypes) && profileTypes.length > 0) {
    types = [...profileTypes]
  } else {
    const speciesTypes = speciesData[speciesId].types
    if (Array.isArray(speciesTypes) && speciesTypes.length > 0) {
      types = [...speciesTypes]
    } else {
      types = [speciesData[speciesId].type || "normal"]
    }
  }

  if (isMonsterObject) {
    const mutation = normalizeMutation(speciesOrId.mutation)
    const extraTypes = [mutation.fusedElement, mutation.devourType]
      .filter(Boolean)
      .filter((type) => alchemyElementTypes.includes(type))
    if (mutation.archetype === "warrior") {
      extraTypes.push("rock")
    }
    for (const extraType of extraTypes) {
      if (!types.includes(extraType)) {
        types.push(extraType)
      }
    }
  }

  return types.slice(0, 2)
}

function formatTypeLabel(types) {
  return types.map((type) => `${typeNames[type] || typeNames.normal}系`).join(" / ")
}

function buildTypeBadgeBackground(types) {
  if (!Array.isArray(types) || types.length === 0) {
    return `${typeColors.normal}33`
  }
  if (types.length === 1) {
    return `${typeColors[types[0]] || typeColors.normal}33`
  }

  const first = typeColors[types[0]] || typeColors.normal
  const second = typeColors[types[1]] || typeColors.normal
  return `linear-gradient(90deg, ${first}55, ${second}55)`
}

function getTypeEffectiveness(attackType, defendTarget) {
  const defendTypes = Array.isArray(defendTarget)
    ? defendTarget
    : typeof defendTarget === "string"
      ? [defendTarget]
      : getSpeciesTypes(defendTarget)

  return defendTypes.reduce((multiplier, defendType) => {
    const single = typeEffectiveness[attackType]?.[defendType]
    return multiplier * (single == null ? 1 : single)
  }, 1)
}

function setHpBar(element, ratio) {
  const safeRatio = clamp(ratio, 0, 1)
  element.style.width = `${safeRatio * 100}%`

  if (safeRatio <= 0.25) {
    element.style.background = "linear-gradient(90deg, #d34f43, #ea8b6c)"
    return
  }

  if (safeRatio <= 0.55) {
    element.style.background = "linear-gradient(90deg, #dd9a44, #f0c85b)"
    return
  }

  element.style.background = "linear-gradient(90deg, #5ab86a, #8fdf78)"
}

let saveProfile = null
let activeSaveSlotId = null
let saveMenuMode = "root"
let saveMenuBound = false
let gameStartSettings = null

function buildEmptySaveProfile() {
  return {
    activeSlot: null,
    lastSlot: null,
    slots: {},
  }
}

function buildDefaultGameStartSettings() {
  return {
    playerName: "旅行者",
    defaultTitle: "见习训练家",
    defaultMotto: "",
    playerNameTagMode: "always",
    dialogueNameHighlight: true,
  }
}

function sanitizeGameStartSettings(raw) {
  const fallback = buildDefaultGameStartSettings()
  if (!raw || typeof raw !== "object") {
    return fallback
  }
  const safeMode = ["always", "nearby", "interaction"].includes(raw.playerNameTagMode)
    ? raw.playerNameTagMode
    : fallback.playerNameTagMode
  return {
    playerName:
      typeof raw.playerName === "string" && raw.playerName.trim()
        ? raw.playerName.trim().slice(0, 12)
        : fallback.playerName,
    defaultTitle:
      typeof raw.defaultTitle === "string" && raw.defaultTitle.trim()
        ? raw.defaultTitle.trim().slice(0, 12)
        : fallback.defaultTitle,
    defaultMotto:
      typeof raw.defaultMotto === "string" ? raw.defaultMotto.trim().slice(0, 24) : fallback.defaultMotto,
    playerNameTagMode: safeMode,
    dialogueNameHighlight: raw.dialogueNameHighlight !== false,
  }
}

function readGameStartSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_SETTINGS_KEY)
    if (!raw) {
      return buildDefaultGameStartSettings()
    }
    return sanitizeGameStartSettings(JSON.parse(raw))
  } catch (error) {
    return buildDefaultGameStartSettings()
  }
}

function writeGameStartSettings() {
  if (!gameStartSettings) {
    return
  }
  try {
    localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(gameStartSettings))
  } catch (error) {
    console.error("Game settings write failed", error)
  }
}

function getGameStartSettings() {
  if (!gameStartSettings) {
    gameStartSettings = readGameStartSettings()
  }
  return { ...gameStartSettings }
}

function sanitizeNewGamePlayerName(input, fallback = "旅行者") {
  const normalized = String(input || "").replace(/\s+/g, " ").trim()
  if (!normalized) {
    return String(fallback || "旅行者").slice(0, 12) || "旅行者"
  }
  return normalized.slice(0, 12)
}

function sanitizePlayerTitle(input, fallback = "见习训练家") {
  const normalized = String(input || "").replace(/\s+/g, " ").trim()
  if (!normalized) {
    return String(fallback || "见习训练家").slice(0, 12) || "见习训练家"
  }
  return normalized.slice(0, 12)
}

function sanitizePlayerMotto(input, fallback = "") {
  const normalized = String(input || "").replace(/\s+/g, " ").trim()
  if (!normalized) {
    return String(fallback || "").slice(0, 24)
  }
  return normalized.slice(0, 24)
}

function promptNewGamePlayerName(defaultName = "旅行者") {
  const safeDefault = sanitizeNewGamePlayerName(defaultName, "旅行者")
  const input = window.prompt("请输入训练家名称（最多12字）", safeDefault)
  if (input === null) {
    return null
  }
  return sanitizeNewGamePlayerName(input, safeDefault)
}

function promptNewGamePlayerProfile(settings = {}) {
  const safeName = promptNewGamePlayerName(settings.playerName || "旅行者")
  if (!safeName) {
    return null
  }

  const baseTitle = sanitizePlayerTitle(settings.defaultTitle || "见习训练家")
  const titleInput = window.prompt("请输入你的称号（最多12字）", baseTitle)
  const safeTitle = titleInput === null ? baseTitle : sanitizePlayerTitle(titleInput, baseTitle)

  const baseMotto = sanitizePlayerMotto(settings.defaultMotto || "")
  const mottoInput = window.prompt("请输入你的口头禅（最多24字）", baseMotto)
  const safeMotto = mottoInput === null ? baseMotto : sanitizePlayerMotto(mottoInput, baseMotto)

  return {
    playerName: safeName,
    title: safeTitle,
    motto: safeMotto,
  }
}

function promptRenameProfileByCard() {
  const currentName = sanitizeNewGamePlayerName(state.playerName || "旅行者", "旅行者")
  const nextNameInput = window.prompt("命名卡：请输入新的训练家名称（最多12字）", currentName)
  if (nextNameInput === null) {
    return null
  }
  const nextName = sanitizeNewGamePlayerName(nextNameInput, currentName)

  const currentTitle = sanitizePlayerTitle(state.playerProfile?.title || "见习训练家", "见习训练家")
  const nextTitleInput = window.prompt("命名卡：请输入新的称号（最多12字）", currentTitle)
  const nextTitle = nextTitleInput === null ? currentTitle : sanitizePlayerTitle(nextTitleInput, currentTitle)

  const currentMotto = sanitizePlayerMotto(
    state.playerProfile?.motto || "",
    ""
  )
  const nextMottoInput = window.prompt("命名卡：请输入新的口头禅（最多24字）", currentMotto)
  const nextMotto = nextMottoInput === null ? currentMotto : sanitizePlayerMotto(nextMottoInput, currentMotto)

  return {
    playerName: nextName,
    title: nextTitle,
    motto: nextMotto,
  }
}

function getSaveSlotStorageKey(slotId) {
  return `${STORAGE_SLOT_PREFIX}${slotId}`
}

function getSaveSlotBackupStorageKey(slotId) {
  return `${STORAGE_SLOT_BACKUP_PREFIX}${slotId}`
}

function sanitizeSaveSlotId(slotId) {
  if (SAVE_SLOT_IDS.includes(slotId)) {
    return slotId
  }
  return null
}

function readSaveSlotBackups(slotId) {
  const safeSlotId = sanitizeSaveSlotId(slotId)
  if (!safeSlotId) {
    return []
  }
  try {
    const raw = localStorage.getItem(getSaveSlotBackupStorageKey(safeSlotId))
    if (!raw) {
      return []
    }
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed.filter((entry) => entry && typeof entry === "object" && entry.snapshot)
  } catch (error) {
    return []
  }
}

function writeSaveSlotBackups(slotId, backups) {
  const safeSlotId = sanitizeSaveSlotId(slotId)
  if (!safeSlotId) {
    return
  }
  const normalized = Array.isArray(backups)
    ? backups
        .filter((entry) => entry && typeof entry === "object" && entry.snapshot)
        .slice(0, SAVE_SLOT_BACKUP_LIMIT)
    : []
  try {
    localStorage.setItem(getSaveSlotBackupStorageKey(safeSlotId), JSON.stringify(normalized))
  } catch (error) {
    console.error("Save backup write failed", error)
  }
}

function appendSaveSlotBackup(slotId, snapshot, reason = "auto-backup") {
  const safeSlotId = sanitizeSaveSlotId(slotId)
  if (!safeSlotId || !snapshot || typeof snapshot !== "object") {
    return
  }
  const history = readSaveSlotBackups(safeSlotId)
  const next = [
    {
      createdAt: new Date().toISOString(),
      reason: String(reason || "auto-backup"),
      snapshot,
    },
    ...history,
  ]
  writeSaveSlotBackups(safeSlotId, next)
}

function restoreLatestSaveSlotBackup(slotId) {
  const safeSlotId = sanitizeSaveSlotId(slotId)
  if (!safeSlotId) {
    return false
  }
  const history = readSaveSlotBackups(safeSlotId)
  if (!history.length) {
    return false
  }
  const latest = history[0]
  if (!latest || !latest.snapshot) {
    return false
  }
  try {
    localStorage.setItem(getSaveSlotStorageKey(safeSlotId), JSON.stringify(latest.snapshot))
    refreshSlotMeta(safeSlotId, latest.snapshot)
    if (!saveProfile) {
      saveProfile = readSaveProfile()
    }
    saveProfile.lastSlot = safeSlotId
    saveProfile.activeSlot = safeSlotId
    writeSaveProfile()
    return true
  } catch (error) {
    console.error("Restore backup failed", error)
    return false
  }
}

function readSaveProfile() {
  try {
    const raw = localStorage.getItem(STORAGE_PROFILE_KEY)
    if (!raw) {
      return buildEmptySaveProfile()
    }
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object") {
      return buildEmptySaveProfile()
    }
    const slots = {}
    const rawSlots = parsed.slots && typeof parsed.slots === "object" ? parsed.slots : {}
    for (const slotId of SAVE_SLOT_IDS) {
      const meta = rawSlots[slotId]
      if (!meta || typeof meta !== "object") {
        continue
      }
      slots[slotId] = {
        updatedAt: typeof meta.updatedAt === "string" ? meta.updatedAt : "",
        storyStage: Number.isFinite(meta.storyStage) ? meta.storyStage : 0,
        badges: Number.isFinite(meta.badges) ? meta.badges : 0,
        map: typeof meta.map === "string" ? meta.map : "",
        partySize: Number.isFinite(meta.partySize) ? meta.partySize : 0,
      }
    }
    return {
      activeSlot: sanitizeSaveSlotId(parsed.activeSlot),
      lastSlot: sanitizeSaveSlotId(parsed.lastSlot),
      slots,
    }
  } catch (error) {
    return buildEmptySaveProfile()
  }
}

function writeSaveProfile() {
  if (!saveProfile) {
    return
  }
  try {
    localStorage.setItem(STORAGE_PROFILE_KEY, JSON.stringify(saveProfile))
  } catch (error) {
    console.error("Save profile write failed", error)
  }
}

function getExistingSaveSnapshot(slotId) {
  const safeSlotId = sanitizeSaveSlotId(slotId)
  if (!safeSlotId) {
    return null
  }
  try {
    const raw = localStorage.getItem(getSaveSlotStorageKey(safeSlotId))
    if (!raw) {
      return null
    }
    return JSON.parse(raw)
  } catch (error) {
    return null
  }
}

function hasSaveInSlot(slotId) {
  return Boolean(getExistingSaveSnapshot(slotId))
}

function firstOccupiedSlotId() {
  return SAVE_SLOT_IDS.find((slotId) => hasSaveInSlot(slotId)) || null
}

function firstEmptySlotId() {
  return SAVE_SLOT_IDS.find((slotId) => !hasSaveInSlot(slotId)) || null
}

function getPreferredNewGameSlotId() {
  return firstEmptySlotId() || activeSaveSlotId || firstOccupiedSlotId() || DEFAULT_SAVE_SLOT_ID
}

function setActiveSaveSlot(slotId, options = {}) {
  const safeSlotId = sanitizeSaveSlotId(slotId) || DEFAULT_SAVE_SLOT_ID
  activeSaveSlotId = safeSlotId
  if (!saveProfile) {
    saveProfile = readSaveProfile()
  }
  saveProfile.activeSlot = safeSlotId
  if (options.keepLastSlot !== true) {
    saveProfile.lastSlot = safeSlotId
  }
  writeSaveProfile()
}

function getActiveSaveSlotId() {
  return activeSaveSlotId || DEFAULT_SAVE_SLOT_ID
}

function exportSaveSlotSnapshot(slotId) {
  const safeSlotId = sanitizeSaveSlotId(slotId) || getActiveSaveSlotId()
  const snapshot = getExistingSaveSnapshot(safeSlotId)
  if (!snapshot) {
    return false
  }
  const payload = {
    exportedAt: new Date().toISOString(),
    slotId: safeSlotId,
    version: window.GBIT_VERSION?.version || "unknown",
    snapshot,
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  const stamp = payload.exportedAt.replace(/[:]/g, "-").replace(/\..+$/, "")
  link.href = url
  link.download = `gbit-save-${safeSlotId}-${stamp}.json`
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
  return true
}

function normalizeImportedSavePayload(parsed) {
  if (!parsed || typeof parsed !== "object") {
    return null
  }
  if (parsed.snapshot && typeof parsed.snapshot === "object") {
    return parsed.snapshot
  }
  if (parsed.player && typeof parsed.player === "object") {
    return parsed
  }
  return null
}

function formatSaveTimeLabel(value) {
  if (!value) {
    return "未保存"
  }
  try {
    const date = new Date(value)
    if (!Number.isFinite(date.getTime())) {
      return "未保存"
    }
    return date.toLocaleString("zh-CN", { hour12: false })
  } catch (error) {
    return "未保存"
  }
}

function getSlotMeta(slotId) {
  if (!saveProfile || !saveProfile.slots) {
    return null
  }
  return saveProfile.slots[slotId] || null
}

function refreshSlotMeta(slotId, snapshot) {
  const safeSlotId = sanitizeSaveSlotId(slotId)
  if (!safeSlotId || !snapshot || typeof snapshot !== "object") {
    return
  }
  if (!saveProfile) {
    saveProfile = readSaveProfile()
  }
  const mapName = maps[snapshot.currentMap]?.name || snapshot.currentMap || "未知区域"
  saveProfile.slots[safeSlotId] = {
    updatedAt: new Date().toISOString(),
    storyStage: Number.isFinite(snapshot.storyStage) ? snapshot.storyStage : 0,
    badges: Number.isFinite(snapshot.player?.badges) ? snapshot.player.badges : 0,
    map: mapName,
    partySize: Array.isArray(snapshot.player?.party) ? snapshot.player.party.length : 0,
  }
}

function migrateLegacySingleSave() {
  const hasSlotSave = SAVE_SLOT_IDS.some((slotId) => localStorage.getItem(getSaveSlotStorageKey(slotId)))
  if (hasSlotSave) {
    return
  }
  const legacyRaw = localStorage.getItem(STORAGE_KEY)
  if (!legacyRaw) {
    return
  }

  const targetSlot = DEFAULT_SAVE_SLOT_ID
  localStorage.setItem(getSaveSlotStorageKey(targetSlot), legacyRaw)
  localStorage.removeItem(STORAGE_KEY)

  const snapshot = getExistingSaveSnapshot(targetSlot)
  if (!snapshot) {
    return
  }

  if (!saveProfile) {
    saveProfile = readSaveProfile()
  }
  refreshSlotMeta(targetSlot, snapshot)
  saveProfile.activeSlot = targetSlot
  saveProfile.lastSlot = targetSlot
  writeSaveProfile()
}

async function importSaveSlotFromFile(file, slotId) {
  const safeSlotId = sanitizeSaveSlotId(slotId) || getActiveSaveSlotId()
  if (!file) {
    return { ok: false, message: "未选择文件。" }
  }
  let raw = ""
  try {
    raw = await file.text()
  } catch (error) {
    return { ok: false, message: "读取文件失败，请重试。" }
  }

  let parsed = null
  try {
    parsed = JSON.parse(raw)
  } catch (error) {
    return { ok: false, message: "文件不是有效 JSON。" }
  }

  const snapshot = normalizeImportedSavePayload(parsed)
  if (!snapshot) {
    return { ok: false, message: "存档格式不兼容：缺少 snapshot/player 字段。" }
  }

  if (!snapshot.player || typeof snapshot.player !== "object") {
    return { ok: false, message: "存档内容不完整：缺少 player 数据。" }
  }

  const existingSnapshot = getExistingSaveSnapshot(safeSlotId)
  if (existingSnapshot) {
    appendSaveSlotBackup(safeSlotId, existingSnapshot, "before-import")
  }

  try {
    localStorage.setItem(getSaveSlotStorageKey(safeSlotId), JSON.stringify(snapshot))
    refreshSlotMeta(safeSlotId, snapshot)
    if (!saveProfile) {
      saveProfile = readSaveProfile()
    }
    saveProfile.lastSlot = safeSlotId
    saveProfile.activeSlot = safeSlotId
    writeSaveProfile()
  } catch (error) {
    return { ok: false, message: "写入存档失败，请检查浏览器存储空间。" }
  }

  return { ok: true, message: `${safeSlotId.toUpperCase()} 导入成功，可直接继续游戏。` }
}

function openOperationHelpChoice() {
  if (typeof openChoice !== "function") {
    return
  }
  openChoice("操作说明", [
    {
      label: "基础操作",
      description:
        "移动：方向键↑↓←→（或WASD）；交互：空格/E/Enter；回城：H；战斗中可点击技能、投球、切换精灵。",
      buttonLabel: "我知道了",
      onSelect: () => {
        closeChoice()
      },
    },
    {
      label: "系统提示",
      description:
        "开始菜单内置存档工具：支持自动备份、恢复最近备份、导出/导入当前槽位。",
      buttonLabel: "继续冒险",
      onSelect: () => {
        closeChoice()
      },
    },
  ])
}

function bindSaveMenuEvents() {
  if (saveMenuBound || !ui.saveMenuOverlay) {
    return
  }
  saveMenuBound = true

  ui.saveMenuContinueButton?.addEventListener("click", () => {
    const continueSlot =
      (saveProfile && sanitizeSaveSlotId(saveProfile.lastSlot) && hasSaveInSlot(saveProfile.lastSlot)
        ? saveProfile.lastSlot
        : firstOccupiedSlotId()) || null
    if (!continueSlot) {
      renderSaveMenu()
      return
    }
    continueGameFromSlot(continueSlot)
  })

  ui.saveMenuNewButton?.addEventListener("click", () => {
    startNewGameInSlot(getPreferredNewGameSlotId(), { confirmOverwrite: true })
  })

  ui.saveMenuSelectButton?.addEventListener("click", () => {
    saveMenuMode = "select"
    renderSaveMenu()
  })

  ui.saveMenuSettingsButton?.addEventListener("click", () => {
    saveMenuMode = "settings"
    renderSaveMenu()
  })

  ui.saveMenuHelpButton?.addEventListener("click", () => {
    openOperationHelpChoice()
  })

  ui.saveMenuSelectBackButton?.addEventListener("click", () => {
    saveMenuMode = "root"
    renderSaveMenu()
  })

  ui.saveMenuSettingsBackButton?.addEventListener("click", () => {
    saveMenuMode = "root"
    renderSaveMenu()
  })

  ui.saveMenuExportButton?.addEventListener("click", () => {
    const slotId = getActiveSaveSlotId()
    const exported = exportSaveSlotSnapshot(slotId)
    if (ui.saveMenuSlotHint) {
      ui.saveMenuSlotHint.textContent = exported
        ? `已导出 ${slotId.toUpperCase()} 存档文件。`
        : `${slotId.toUpperCase()} 当前无存档可导出。`
    }
  })

  ui.saveMenuImportButton?.addEventListener("click", () => {
    ui.saveMenuImportInput?.click()
  })

  ui.saveMenuImportInput?.addEventListener("change", async () => {
    const file = ui.saveMenuImportInput?.files?.[0] || null
    const slotId = getActiveSaveSlotId()
    const result = await importSaveSlotFromFile(file, slotId)
    if (ui.saveMenuSlotHint) {
      ui.saveMenuSlotHint.textContent = result.message
    }
    if (ui.saveMenuImportInput) {
      ui.saveMenuImportInput.value = ""
    }
    renderSaveMenu()
  })

  ui.saveMenuSlotList?.addEventListener("click", (event) => {
    const target = event.target.closest("[data-save-action]")
    if (!target) {
      return
    }

    const action = target.dataset.saveAction
    const slotId = sanitizeSaveSlotId(target.dataset.slotId)
    if (!slotId) {
      return
    }

    if (action === "continue") {
      continueGameFromSlot(slotId)
      return
    }
    if (action === "new") {
      startNewGameInSlot(slotId, { confirmOverwrite: true })
      return
    }
    if (action === "restore-latest") {
      const restored = restoreLatestSaveSlotBackup(slotId)
      if (restored) {
        renderSaveMenu()
        const meta = getSlotMeta(slotId)
        if (ui.saveMenuSlotHint) {
          ui.saveMenuSlotHint.textContent = `已从最近备份恢复 ${slotId.toUpperCase()} · ${meta?.map || "未知区域"}`
        }
      } else if (ui.saveMenuSlotHint) {
        ui.saveMenuSlotHint.textContent = `${slotId.toUpperCase()} 暂无可恢复备份。`
      }
    }
  })
}

function renderSaveMenu() {
  if (!ui.saveMenuOverlay) {
    return
  }
  if (!saveProfile) {
    saveProfile = readSaveProfile()
  }

  const continueSlot =
    (saveProfile && sanitizeSaveSlotId(saveProfile.lastSlot) && hasSaveInSlot(saveProfile.lastSlot)
      ? saveProfile.lastSlot
      : firstOccupiedSlotId()) || null
  const continueMeta = continueSlot ? getSlotMeta(continueSlot) : null

  if (ui.saveMenuContinueButton) {
    if (continueSlot) {
      ui.saveMenuContinueButton.disabled = false
      ui.saveMenuContinueButton.textContent = `继续游戏（${continueSlot.toUpperCase()}）`
    } else {
      ui.saveMenuContinueButton.disabled = true
      ui.saveMenuContinueButton.textContent = "继续游戏（暂无存档）"
    }
  }

  if (ui.saveMenuSlotHint) {
    if (!continueSlot) {
      ui.saveMenuSlotHint.textContent = "当前没有可继续的存档，建议先开始一个新档。快捷键：↑↓←→/WASD 移动，空格/E 交互，H 回家。"
    } else {
      const mapName = continueMeta?.map || "未知区域"
      ui.saveMenuSlotHint.textContent = `上次进度：${continueSlot.toUpperCase()} · ${mapName} · ${formatSaveTimeLabel(continueMeta?.updatedAt)} · 快捷键：空格/E 交互，H 回家`
    }
  }

  const showSelect = saveMenuMode === "select"
  const showSettings = saveMenuMode === "settings"
  ui.saveMenuRootActions?.classList.toggle("hidden", showSelect || showSettings)
  ui.saveMenuSelectActions?.classList.toggle("hidden", !showSelect)
  ui.saveMenuSettingsActions?.classList.toggle("hidden", !showSettings)

  if (showSettings) {
    if (ui.saveMenuSlotHint) {
      ui.saveMenuSlotHint.textContent = "存档工具：可导出当前存档，或把 JSON 导入到当前槽位。"
    }
    return
  }

  if (!showSelect || !ui.saveMenuSlotList) {
    return
  }

  ui.saveMenuSlotList.innerHTML = SAVE_SLOT_IDS.map((slotId) => {
    const snapshot = getExistingSaveSnapshot(slotId)
    const meta = getSlotMeta(slotId)
    const backupCount = readSaveSlotBackups(slotId).length
    const occupied = Boolean(snapshot)
    const activeBadge = slotId === activeSaveSlotId ? " · 当前槽位" : ""
    const infoLine = occupied
      ? `地点：${meta?.map || maps[snapshot.currentMap]?.name || "未知区域"} · 徽章 ${meta?.badges ?? snapshot.player?.badges ?? 0} · 队伍 ${meta?.partySize ?? snapshot.player?.party?.length ?? 0}`
      : "空存档，可直接开始全新流程"
    const timeLine = occupied ? `更新时间：${formatSaveTimeLabel(meta?.updatedAt)}` : "更新时间：从未保存"
    const backupLine = `备份：${backupCount} 份（自动防丢档）`
    return `
      <article class="save-slot-card">
        <div class="save-slot-head">
          <strong>${slotId.toUpperCase()}${activeBadge}</strong>
          <span>${occupied ? "已有进度" : "空槽位"}</span>
        </div>
        <p class="save-slot-meta">${infoLine}</p>
        <p class="save-slot-meta">${timeLine}</p>
        <p class="save-slot-meta">${backupLine}</p>
        <div class="save-slot-actions">
          <button class="mini-button" type="button" data-save-action="continue" data-slot-id="${slotId}" ${
            occupied ? "" : "disabled"
          }>继续此存档</button>
          <button class="mini-button" type="button" data-save-action="new" data-slot-id="${slotId}">
            ${occupied ? "新游戏（覆盖）" : "新游戏"}
          </button>
          <button class="mini-button" type="button" data-save-action="restore-latest" data-slot-id="${slotId}" ${
            backupCount > 0 ? "" : "disabled"
          }>恢复最近备份</button>
        </div>
      </article>
    `
  }).join("")
}

function openSaveMenu() {
  if (!ui.saveMenuOverlay) {
    return
  }
  saveMenuMode = "root"
  ui.saveMenuOverlay.classList.remove("hidden")
  state.scene = "menu"
  renderSaveMenu()
}

function closeSaveMenu() {
  if (!ui.saveMenuOverlay) {
    return
  }
  ui.saveMenuOverlay.classList.add("hidden")
  if (state.scene !== "battle") {
    state.scene = "overworld"
  }
}

function isSaveMenuVisible() {
  return Boolean(ui.saveMenuOverlay && !ui.saveMenuOverlay.classList.contains("hidden"))
}

function initializeSaveSystem() {
  saveProfile = readSaveProfile()
  gameStartSettings = readGameStartSettings()
  migrateLegacySingleSave()
  saveProfile = readSaveProfile()
  activeSaveSlotId =
    sanitizeSaveSlotId(saveProfile.activeSlot) ||
    sanitizeSaveSlotId(saveProfile.lastSlot) ||
    firstOccupiedSlotId() ||
    DEFAULT_SAVE_SLOT_ID
  bindSaveMenuEvents()
  renderSaveMenu()
}

function buildSerializableSnapshot() {
  return {
    ...state,
    scene: "overworld",
    battle: null,
    choice: null,
  }
}

function queueSave() {
  if (isSaveMenuVisible()) {
    return
  }
  clearTimeout(saveTimer)
  saveTimer = window.setTimeout(saveGame, 120)
}

function saveGame() {
  const slotId = getActiveSaveSlotId()
  const snapshot = buildSerializableSnapshot()
  refreshSlotMeta(slotId, snapshot)
  saveProfile.activeSlot = slotId
  saveProfile.lastSlot = slotId

  try {
    localStorage.setItem(getSaveSlotStorageKey(slotId), JSON.stringify(snapshot))
    writeSaveProfile()
  } catch (error) {
    console.error("Save failed", error)
  }
}

function hydrateStateFromSnapshot(parsed) {
  const fresh = createInitialState()

  state = {
    ...fresh,
    ...parsed,
    scene: "overworld",
    battle: null,
    choice: null,
    vnActive: false,
    player: {
      ...fresh.player,
      ...(parsed.player || {}),
    },
    progress: {
      ...fresh.progress,
      ...(parsed.progress || {}),
    },
    flags: {
      ...fresh.flags,
      ...(parsed.flags || {}),
    },
    pokedex: {
      seen: { ...(parsed.pokedex?.seen || {}) },
      caught: { ...(parsed.pokedex?.caught || {}) },
      portraits: { ...(parsed.pokedex?.portraits || {}) },
      candidates: { ...(parsed.pokedex?.candidates || {}) },
    },
    dialogue: Array.isArray(parsed.dialogue) ? parsed.dialogue.slice(-20) : fresh.dialogue,
  }

  state.playerPortrait = {
    ...(fresh.playerPortrait || {}),
    ...(parsed.playerPortrait || {}),
    generated: Array.isArray(parsed.playerPortrait?.generated)
      ? parsed.playerPortrait.generated
      : [...(fresh.playerPortrait?.generated || [])],
    favorites: Array.isArray(parsed.playerPortrait?.favorites)
      ? parsed.playerPortrait.favorites
      : [...(fresh.playerPortrait?.favorites || [])],
  }

  state.player.coins = Number.isFinite(state.player.coins) ? state.player.coins : fresh.player.coins
  state.player.repelSteps = Number.isFinite(state.player.repelSteps)
    ? Math.max(0, Math.floor(state.player.repelSteps))
    : 0
  state.player.inventory = {
    ...fresh.player.inventory,
    ...(parsed.player?.inventory || {}),
  }
  state.player.essence = {
    ...fresh.player.essence,
    ...(parsed.player?.essence || {}),
  }
  const currentSettings = getGameStartSettings()
  const rawProfile = parsed.playerProfile && typeof parsed.playerProfile === "object" ? parsed.playerProfile : {}
  state.playerProfile = {
    ...(fresh.playerProfile || {}),
    ...rawProfile,
    title: sanitizePlayerTitle(rawProfile.title, fresh.playerProfile?.title || currentSettings.defaultTitle),
    motto: sanitizePlayerMotto(rawProfile.motto, fresh.playerProfile?.motto || currentSettings.defaultMotto),
    gender: ["male", "female", "unknown"].includes(rawProfile.gender) ? rawProfile.gender : "unknown",
    nameTagMode: ["always", "nearby", "interaction"].includes(rawProfile.nameTagMode)
      ? rawProfile.nameTagMode
      : currentSettings.playerNameTagMode || fresh.playerProfile?.nameTagMode || "always",
    dialogueNameHighlight:
      typeof rawProfile.dialogueNameHighlight === "boolean"
        ? rawProfile.dialogueNameHighlight
        : currentSettings.dialogueNameHighlight !== false,
  }
  state.progress.specialZones = {
    ...fresh.progress.specialZones,
    ...(parsed.progress?.specialZones || {}),
  }
  state.progress.apexDefeated =
    parsed.progress?.apexDefeated && typeof parsed.progress.apexDefeated === "object"
      ? { ...parsed.progress.apexDefeated }
      : { ...fresh.progress.apexDefeated }
  state.progress.preGymLegendSeen =
    parsed.progress?.preGymLegendSeen && typeof parsed.progress.preGymLegendSeen === "object"
      ? { ...parsed.progress.preGymLegendSeen }
      : { ...fresh.progress.preGymLegendSeen }
  state.flags.bonusBallsClaimed = Boolean(parsed.flags?.bonusBallsClaimed)
  state.flags.homeSupplyClaimed = Boolean(parsed.flags?.homeSupplyClaimed)
  state.flags.vanguardDefeated = Boolean(parsed.flags?.vanguardDefeated)
  state.flags.alchemyTutorialIntroShown = Boolean(parsed.flags?.alchemyTutorialIntroShown)
  state.flags.alchemyPracticeDone = Boolean(parsed.flags?.alchemyPracticeDone)

  state.player.party = (parsed.player?.party || []).map(normalizeMonster)
  state.player.reserve = (parsed.player?.reserve || []).map(normalizeMonster)
  state.player.home = (parsed.player?.home || []).map(normalizeMonster)
  state.storyFocus = normalizeLoadedStoryFocus(parsed.storyFocus, state.dialogue[state.dialogue.length - 1])
  state.alchemyLog = Array.isArray(parsed.alchemyLog) ? parsed.alchemyLog.slice(-16) : fresh.alchemyLog

  if (state.player.party.length === 0 && state.storyStage > 0) {
    state = createInitialState()
  }

  if (!maps[state.currentMap]) {
    state.currentMap = "town"
    state.player.x = 3
    state.player.y = 9
  }

  // 存档加载后立即同步渲染坐标，防止玩家从 (0,0) 滑行到正确位置
  state.player.renderX = state.player.x * TILE_SIZE
  state.player.renderY = state.player.y * TILE_SIZE
  state.player.moving = false
  state.player.inputDirection = null

  if (state.player.reserve.length > MAX_RESERVE_SIZE) {
    const overflow = state.player.reserve.splice(MAX_RESERVE_SIZE)
    state.player.home.push(...overflow)
  }

  getActiveMonster()
}

function loadGame(slotId = null) {
  const targetSlotId = sanitizeSaveSlotId(slotId) || getActiveSaveSlotId()
  try {
    const raw = localStorage.getItem(getSaveSlotStorageKey(targetSlotId))
    if (!raw) {
      return false
    }
    const parsed = JSON.parse(raw)
    hydrateStateFromSnapshot(parsed)
    refreshSlotMeta(targetSlotId, parsed)
    saveProfile.lastSlot = targetSlotId
    saveProfile.activeSlot = targetSlotId
    writeSaveProfile()
    return true
  } catch (error) {
    console.error("Load failed", error)
    state = createInitialState()
    return false
  }
}

function clearSaveSlot(slotId) {
  const safeSlotId = sanitizeSaveSlotId(slotId)
  if (!safeSlotId) {
    return
  }
  localStorage.removeItem(getSaveSlotStorageKey(safeSlotId))
  if (!saveProfile) {
    saveProfile = readSaveProfile()
  }
  delete saveProfile.slots[safeSlotId]
  if (saveProfile.lastSlot === safeSlotId) {
    saveProfile.lastSlot = firstOccupiedSlotId()
  }
  if (saveProfile.activeSlot === safeSlotId) {
    saveProfile.activeSlot = firstOccupiedSlotId()
  }
  writeSaveProfile()
}

function clearActiveSaveSlot() {
  clearSaveSlot(getActiveSaveSlotId())
}

function afterSaveSlotLoaded() {
  hydratePlayerPortraitRuntimeAssets()
  syncUi()
  if (typeof renderPlayerArtPanel === "function") {
    renderPlayerArtPanel()
  }
  if (typeof renderNpcArtPanel === "function") {
    renderNpcArtPanel()
  }
}

function continueGameFromSlot(slotId) {
  const safeSlotId = sanitizeSaveSlotId(slotId)
  if (!safeSlotId) {
    return false
  }
  setActiveSaveSlot(safeSlotId)
  if (!loadGame(safeSlotId)) {
    return false
  }
  closeSaveMenu()
  afterSaveSlotLoaded()
  if (typeof startNewPlayerOnboarding === "function") {
    startNewPlayerOnboarding()
  }
  return true
}

function applyQaStarterKitOnNewGame() {
  if (typeof getQaConfig !== "function") {
    return
  }
  const qa = getQaConfig()
  if (!qa.enabled || !qa.starterKitOnNewGame) {
    return
  }

  state.player.balls += 20
  state.player.inventory = {
    ...(state.player.inventory || {}),
    potion: (Number(state.player.inventory?.potion) || 0) + 8,
    super_potion: (Number(state.player.inventory?.super_potion) || 0) + 4,
    battle_tonic: (Number(state.player.inventory?.battle_tonic) || 0) + 2,
    guard_tonic: (Number(state.player.inventory?.guard_tonic) || 0) + 2,
    repel_orb: (Number(state.player.inventory?.repel_orb) || 0) + 2,
  }
  addDialogue("QA 测试包已发放：精灵球+20、药品补给、避怪补给。")
}

function startNewGameInSlot(slotId, options = {}) {
  const safeSlotId = sanitizeSaveSlotId(slotId) || DEFAULT_SAVE_SLOT_ID
  const settings = getGameStartSettings()
  const defaultProfile = {
    playerName: options.playerName || settings.playerName || "旅行者",
    title: settings.defaultTitle || "见习训练家",
    motto: settings.defaultMotto || "",
  }
  const selectedProfile = {
    playerName: sanitizeNewGamePlayerName(defaultProfile.playerName, "旅行者"),
    title: sanitizePlayerTitle(defaultProfile.title, "见习训练家"),
    motto: sanitizePlayerMotto(defaultProfile.motto, ""),
  }

  const hasExisting = hasSaveInSlot(safeSlotId)
  if (hasExisting && options.confirmOverwrite !== false) {
    const approved = window.confirm(`${safeSlotId.toUpperCase()} 已有进度，确定覆盖并开始新游戏吗？`)
    if (!approved) {
      return false
    }
    const secondApproved = window.confirm(
      `二次确认：覆盖后将从全新流程开始（系统会先做自动备份），继续覆盖 ${safeSlotId.toUpperCase()} 吗？`
    )
    if (!secondApproved) {
      return false
    }
  }
  if (hasExisting) {
    const existingSnapshot = getExistingSaveSnapshot(safeSlotId)
    if (existingSnapshot) {
      appendSaveSlotBackup(safeSlotId, existingSnapshot, "before-overwrite-new-game")
    }
  }

  clearSaveSlot(safeSlotId)
  setActiveSaveSlot(safeSlotId)
  state = createInitialState()
  state.playerName = selectedProfile.playerName
  state.playerProfile = {
    ...(state.playerProfile || {}),
    title: selectedProfile.title,
    motto: selectedProfile.motto,
    gender: "unknown",
    nameTagMode: settings.playerNameTagMode || "always",
    dialogueNameHighlight: settings.dialogueNameHighlight !== false,
  }
  state.scene = "overworld"
  state.battle = null
  state.choice = null
  applyQaStarterKitOnNewGame()
  gameStartSettings = sanitizeGameStartSettings({
    ...settings,
    playerName: selectedProfile.playerName,
  })
  writeGameStartSettings()
  saveGame()
  closeSaveMenu()
  afterSaveSlotLoaded()
  if (typeof startNewPlayerOnboarding === "function") {
    startNewPlayerOnboarding()
  }
  return true
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function sleep(ms) {
  const qaConfig = typeof getQaConfig === "function" ? getQaConfig() : null
  const multiplier =
    qaConfig && qaConfig.enabled
      ? Math.max(0.1, Number(qaConfig.battleAnimationMultiplier) || 1)
      : 1
  const duration = Math.max(0, Math.round((Number(ms) || 0) * multiplier))
  return new Promise((resolve) => {
    window.setTimeout(resolve, duration)
  })
}

function makeUid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `monster-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

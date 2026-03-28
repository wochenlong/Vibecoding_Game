// VN Dialogue Engine — 明日方舟风格双立绘视觉小说对话系统
// 纯 DOM overlay，不改 Canvas 渲染，不引入外部依赖

;(function () {
  // ─── 常量 ────────────────────────────────────────────────────────────────────
  const TYPEWRITER_INTERVAL_MS = 40
  const VN_LAYER_ID = "vn-dialogue-layer"

  // ─── 运行时状态 ──────────────────────────────────────────────────────────────
  let _script = []
  let _cursor = 0
  let _typewriterTimer = null
  let _charIndex = 0
  let _fullText = ""
  let _typing = false
  let _onComplete = null

  // ─── DOM 引用（延迟初始化）────────────────────────────────────────────────────
  let _layer = null
  let _leftSlot = null
  let _rightSlot = null
  let _nameEl = null
  let _textEl = null
  let _hintEl = null
  let _choicesEl = null

  // ─── DOM 构建 ────────────────────────────────────────────────────────────────
  function _buildDOM() {
    if (_layer) return

    _layer = document.createElement("div")
    _layer.id = VN_LAYER_ID
    _layer.className = "vn-dialogue-layer hidden"
    _layer.setAttribute("aria-hidden", "true")

    _layer.innerHTML = `
      <div class="vn-stage">
        <div class="vn-char-left">
          <div class="vn-portrait-inner" data-side="left"></div>
        </div>
        <div class="vn-char-right">
          <div class="vn-portrait-inner" data-side="right"></div>
        </div>
      </div>
      <div class="vn-dialogue-box">
        <div class="vn-name-bar">
          <span class="vn-name-text"></span>
        </div>
        <p class="vn-text-line"></p>
        <span class="vn-next-hint hidden">▼</span>
        <div class="vn-choices hidden"></div>
      </div>
    `

    // 注入到 canvas-frame 内（和其他 overlay 同级）
    const canvasFrame = document.querySelector(".canvas-frame")
    if (canvasFrame) {
      canvasFrame.appendChild(_layer)
    } else {
      document.body.appendChild(_layer)
    }

    _leftSlot = _layer.querySelector(".vn-char-left .vn-portrait-inner")
    _rightSlot = _layer.querySelector(".vn-char-right .vn-portrait-inner")
    _nameEl = _layer.querySelector(".vn-name-text")
    _textEl = _layer.querySelector(".vn-text-line")
    _hintEl = _layer.querySelector(".vn-next-hint")
    _choicesEl = _layer.querySelector(".vn-choices")

    // 点击对话框：跳过打字机 / 翻页
    _layer.querySelector(".vn-dialogue-box").addEventListener("click", _onDialogueClick)
  }

  // ─── 立绘加载 ────────────────────────────────────────────────────────────────
  function _getPortraitSrc(portraitId) {
    if (!portraitId) return null

    // 优先从 artState.images（AI 生成立绘）查找
    if (typeof artState !== "undefined" && artState.images) {
      const keys = [`npc_${portraitId}`, portraitId]
      for (const k of keys) {
        const src = artState.images[k]
        if (src && typeof src === "string" && src.startsWith("data:")) {
          return { type: "img", src }
        }
      }
    }

    // 尝试 ART_MANIFEST（assets.generated.js）
    if (typeof ART_MANIFEST !== "undefined" && ART_MANIFEST) {
      const keys = [`npc_${portraitId}`, portraitId]
      for (const k of keys) {
        const entry = ART_MANIFEST[k]
        if (entry) {
          const src = typeof entry === "string" ? entry : entry.src || entry.url
          if (src) return { type: "img", src }
        }
      }
    }

    return null
  }

  function _getPortraitFallbackLabel(portraitId) {
    // 从 npcDefinitions 取 symbol + color
    if (typeof npcDefinitions !== "undefined" && Array.isArray(npcDefinitions)) {
      const npc = npcDefinitions.find((n) => n.id === portraitId)
      if (npc) return { symbol: npc.symbol || npc.name?.[0] || "?", color: npc.color || "#aaa" }
    }
    // speciesData fallback
    if (typeof speciesData !== "undefined" && speciesData[portraitId]) {
      const s = speciesData[portraitId]
      return { symbol: s.symbol || s.name?.[0] || "?", color: "#4fa" }
    }
    return { symbol: portraitId?.[0]?.toUpperCase() || "?", color: "#888" }
  }

  function _renderPortrait(slot, portraitId) {
    slot.innerHTML = ""
    if (!portraitId) return

    const result = _getPortraitSrc(portraitId)
    if (result && result.type === "img") {
      const img = document.createElement("img")
      img.src = result.src
      img.className = "vn-portrait-img"
      img.alt = portraitId
      slot.appendChild(img)
      return
    }

    // fallback：色块 + 文字占位
    const fb = _getPortraitFallbackLabel(portraitId)
    const div = document.createElement("div")
    div.className = "vn-portrait-fallback"
    div.style.setProperty("--vn-fb-color", fb.color)
    div.textContent = fb.symbol
    slot.appendChild(div)
  }

  // ─── 说话方高亮切换 ──────────────────────────────────────────────────────────
  function _setActiveSide(side) {
    _layer.querySelector(".vn-char-left").classList.toggle("vn-active", side === "left")
    _layer.querySelector(".vn-char-right").classList.toggle("vn-active", side === "right")
    _layer.querySelector(".vn-char-left").classList.toggle("vn-silent", side === "right")
    _layer.querySelector(".vn-char-right").classList.toggle("vn-silent", side === "left")
  }

  // ─── 打字机 ──────────────────────────────────────────────────────────────────
  function _startTypewriter(text) {
    _fullText = text
    _charIndex = 0
    _typing = true
    _textEl.textContent = ""
    _hintEl.classList.add("hidden")

    _typewriterTimer = setInterval(() => {
      _charIndex++
      _textEl.textContent = _fullText.slice(0, _charIndex)
      if (_charIndex >= _fullText.length) {
        _finishTypewriter()
      }
    }, TYPEWRITER_INTERVAL_MS)
  }

  function _finishTypewriter() {
    clearInterval(_typewriterTimer)
    _typewriterTimer = null
    _typing = false
    _textEl.textContent = _fullText

    const line = _script[_cursor]
    if (line && line.choices && line.choices.length > 0) {
      _showChoices(line.choices)
    } else {
      _hintEl.classList.remove("hidden")
    }
  }

  function _skipTypewriter() {
    if (!_typing) return
    clearInterval(_typewriterTimer)
    _typewriterTimer = null
    _typing = false
    _textEl.textContent = _fullText

    const line = _script[_cursor]
    if (line && line.choices && line.choices.length > 0) {
      _showChoices(line.choices)
    } else {
      _hintEl.classList.remove("hidden")
    }
  }

  // ─── 选项分支 ────────────────────────────────────────────────────────────────
  function _showChoices(choices) {
    _hintEl.classList.add("hidden")
    _choicesEl.innerHTML = ""
    _choicesEl.classList.remove("hidden")

    choices.forEach((choice) => {
      const btn = document.createElement("button")
      btn.className = "vn-choice-btn"
      btn.textContent = choice.label
      btn.addEventListener("click", () => {
        _choicesEl.classList.add("hidden")
        _choicesEl.innerHTML = ""
        if (choice.branch && choice.branch.length > 0) {
          // 插入分支脚本到当前位置之后
          const before = _script.slice(0, _cursor + 1)
          const after = _script.slice(_cursor + 1)
          _script = [...before, ...choice.branch, ...after]
        }
        _advance()
      })
      _choicesEl.appendChild(btn)
    })
  }

  // ─── 逐行推进 ────────────────────────────────────────────────────────────────
  function _playLine(line) {
    // 更新立绘
    if (line.portrait !== undefined) {
      const slot = line.position === "right" ? _rightSlot : _leftSlot
      _renderPortrait(slot, line.portrait)
    }

    // 高亮说话方
    _setActiveSide(line.position || "left")

    // 更新角色名
    _nameEl.textContent = line.name || ""

    // 清空选项
    _choicesEl.classList.add("hidden")
    _choicesEl.innerHTML = ""
    _hintEl.classList.add("hidden")

    // 打字机
    _startTypewriter(line.text || "")
  }

  function _advance() {
    _cursor++
    if (_cursor >= _script.length) {
      _close()
      return
    }
    _playLine(_script[_cursor])
  }

  function _onDialogueClick() {
    if (_typing) {
      _skipTypewriter()
      return
    }
    // 如果选项正在显示，点击无效（让用户点按钮）
    if (!_choicesEl.classList.contains("hidden")) return
    _advance()
  }

  // ─── 键盘事件（由 world-events.js handleKeyDown 转发） ──────────────────────
  function handleVNKeyDown(event) {
    const key = (event.key || "").toLowerCase()
    if (key === " " || key === "enter" || key === "e") {
      if (_typing) {
        _skipTypewriter()
      } else if (_choicesEl.classList.contains("hidden")) {
        _advance()
      }
    }
  }

  // ─── 打开 / 关闭 ─────────────────────────────────────────────────────────────
  function _open() {
    _buildDOM()
    _layer.classList.remove("hidden")
    _layer.setAttribute("aria-hidden", "false")
    if (typeof state !== "undefined") {
      state.vnActive = true
    }
  }

  function _close() {
    if (!_layer) return
    _layer.classList.add("hidden")
    _layer.setAttribute("aria-hidden", "true")

    // 清空立绘
    if (_leftSlot) _leftSlot.innerHTML = ""
    if (_rightSlot) _rightSlot.innerHTML = ""

    if (typeof state !== "undefined") {
      state.vnActive = false
    }

    const cb = _onComplete
    _onComplete = null
    if (typeof cb === "function") {
      cb()
    }
  }

  // ─── 公开 API ────────────────────────────────────────────────────────────────
  /**
   * showVNDialogue(script, options)
   *
   * script: Array of lines:
   *   {
   *     position: "left" | "right",
   *     name: string,
   *     text: string,
   *     portrait: string,          // NPC id 或 species id，可省略（沿用上一帧）
   *     choices: [                 // 可选分支
   *       { label: string, branch: [...lines] }
   *     ]
   *   }
   *
   * options:
   *   { onComplete: Function }
   */
  function showVNDialogue(script, options) {
    if (!Array.isArray(script) || script.length === 0) return

    _buildDOM()
    _script = script
    _cursor = 0
    _onComplete = (options && options.onComplete) || null

    // 预加载全部立绘
    const seen = new Set()
    for (const line of script) {
      if (line.portrait && !seen.has(line.portrait)) {
        seen.add(line.portrait)
        const slot = line.position === "right" ? _rightSlot : _leftSlot
        _renderPortrait(slot, line.portrait)
      }
    }

    _open()
    _playLine(_script[0])
  }

  // 挂载到全局
  window.showVNDialogue = showVNDialogue
  window.handleVNKeyDown = handleVNKeyDown

  // Console 测试用 demo 脚本（在浏览器执行 showVNDialogue(demoScript) 即可验证）
  window.demoScript = [
    {
      position: "left",
      name: "教授 雪松",
      portrait: "professor",
      text: "欢迎来到星辉城。你是新到来的训练家吧？",
    },
    {
      position: "right",
      name: "馆主 阿斯特拉",
      portrait: "leader",
      text: "我早就听说了你的名字。准备好了吗？真正的试炼才刚刚开始。",
    },
    {
      position: "left",
      name: "教授 雪松",
      portrait: "professor",
      text: "先选一位伙伴，再去面对她的挑战。",
      choices: [
        { label: "我准备好了", branch: [] },
        {
          label: "再等等我",
          branch: [
            {
              position: "right",
              name: "馆主 阿斯特拉",
              portrait: "leader",
              text: "随时等你。但别让我等太久。",
            },
          ],
        },
      ],
    },
  ]
})()

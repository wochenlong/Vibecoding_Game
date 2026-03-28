/**
 * title-screen.js — GBIT Monster Quest 开屏标题画面
 * PixiJS v8 + GSAP 实现，全自包含 IIFE
 *
 * 动画序列（约 3.5 秒）：
 *   0.0s  深蓝背景 + 浮游粒子启动
 *   0.3s  能量球从上方落下，弹跳
 *   1.2s  能量球爆炸白光 → 三只精灵剪影飞出
 *   2.0s  标题 "GBIT Monster Quest" 从上方弹入
 *   2.6s  副标题淡入
 *   3.0s  "开始冒险" 按钮弹出 + 持续 pulse
 */
(function TitleScreen(global) {
  'use strict';

  // ─────────────────────────────────────────────
  // 0. 公共状态 flag（挂到 window 供 game.js 读取）
  // ─────────────────────────────────────────────
  global.titleScreenState = { dismissed: false };

  // ─────────────────────────────────────────────
  // 1. 等待 DOM + 依赖就绪
  // ─────────────────────────────────────────────
  function waitReady(cb) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', cb);
    } else {
      cb();
    }
  }

  waitReady(function () {
    if (typeof PIXI === 'undefined' || typeof gsap === 'undefined') {
      console.warn('[TitleScreen] PixiJS or GSAP not loaded, skipping title screen.');
      return;
    }
    init();
  });

  // ─────────────────────────────────────────────
  // 2. 主初始化
  // ─────────────────────────────────────────────
  async function init() {
    // 像素完美
    if (PIXI.TextureSource && PIXI.TextureSource.defaultOptions) {
      PIXI.TextureSource.defaultOptions.scaleMode = 'nearest';
    }

    // 创建容器 div
    const wrapper = document.createElement('div');
    wrapper.id = 'title-screen';
    wrapper.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:9999',
      'display:flex', 'align-items:center', 'justify-content:center',
      'overflow:hidden', 'background:#040d1a',
    ].join(';');
    document.body.appendChild(wrapper);
    document.body.classList.add('title-screen-active');

    // PixiJS Application
    const app = new PIXI.Application();
    await app.init({
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundAlpha: 0,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });
    wrapper.appendChild(app.canvas);

    // 响应窗口缩放
    function onResize() {
      app.renderer.resize(window.innerWidth, window.innerHeight);
      layoutAll();
    }
    window.addEventListener('resize', onResize);

    // ─────────────────────────────────────────────
    // 3. 图层结构
    // ─────────────────────────────────────────────
    const bgLayer         = new PIXI.Container(); // 背景渐变 + 粒子
    const silhouetteLayer = new PIXI.Container(); // 三只精灵剪影
    const fxLayer         = new PIXI.Container(); // 爆炸光效
    const ballLayer       = new PIXI.Container(); // 能量球
    const uiLayer         = new PIXI.Container(); // 标题 + 按钮

    app.stage.addChild(bgLayer, silhouetteLayer, fxLayer, ballLayer, uiLayer);

    // ─────────────────────────────────────────────
    // 4. 背景渐变
    // ─────────────────────────────────────────────
    const bgGfx = new PIXI.Graphics();
    bgLayer.addChild(bgGfx);

    function drawBg() {
      const W = app.screen.width;
      const H = app.screen.height;
      bgGfx.clear();
      // 深蓝渐变：顶部 #040d1a → 底部 #0a1e3d
      bgGfx
        .rect(0, 0, W, H)
        .fill({ color: 0x040d1a });
      // 用多层半透明矩形模拟渐变
      for (let i = 0; i < 12; i++) {
        const y = (i / 12) * H;
        const alpha = (i / 12) * 0.18;
        bgGfx
          .rect(0, y, W, H / 12 + 1)
          .fill({ color: 0x0a4080, alpha });
      }
      // 底部暗晕
      bgGfx
        .rect(0, H * 0.6, W, H * 0.4)
        .fill({ color: 0x020810, alpha: 0.45 });
    }
    drawBg();

    // ─────────────────────────────────────────────
    // 5. 浮游粒子（50 个萤火虫）
    // ─────────────────────────────────────────────
    const PARTICLE_COUNT = 50;
    const particles = [];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = new PIXI.Graphics();
      const r = Math.random() * 2.5 + 0.8;
      p.circle(0, 0, r).fill({ color: 0x6ad4ff, alpha: 0.7 });

      // 发光光晕
      const glow = new PIXI.Graphics();
      glow.circle(0, 0, r * 3).fill({ color: 0x3fa9f5, alpha: 0.18 });
      p.addChild(glow);

      const W = app.screen.width;
      const H = app.screen.height;
      p.x = Math.random() * W;
      p.y = Math.random() * H;

      const data = {
        gfx: p,
        speedY: -(Math.random() * 0.4 + 0.15),
        speedX: (Math.random() - 0.5) * 0.25,
        phase: Math.random() * Math.PI * 2,
        amp: Math.random() * 18 + 6,
        baseAlpha: Math.random() * 0.5 + 0.3,
      };
      particles.push(data);
      bgLayer.addChild(p);
    }

    // 粒子 tick
    let particleTick = 0;
    app.ticker.add(function () {
      particleTick += 0.016;
      const W = app.screen.width;
      const H = app.screen.height;
      for (const d of particles) {
        d.gfx.y += d.speedY;
        d.gfx.x += Math.sin(particleTick + d.phase) * 0.3 + d.speedX;
        // 呼吸
        d.gfx.alpha = d.baseAlpha * (0.6 + 0.4 * Math.sin(particleTick * 1.2 + d.phase));
        if (d.gfx.y < -10) {
          d.gfx.y = H + 5;
          d.gfx.x = Math.random() * W;
        }
        if (d.gfx.x < -10) d.gfx.x = W + 5;
        if (d.gfx.x > W + 10) d.gfx.x = -5;
      }
    });

    // ─────────────────────────────────────────────
    // 6. 能量球（原创蓝白配色，菱形 + 圆形组合）
    // ─────────────────────────────────────────────
    const BALL_R = 38;
    const ballContainer = new PIXI.Container();
    ballLayer.addChild(ballContainer);

    // 外发光环
    const outerGlow = new PIXI.Graphics();
    outerGlow.circle(0, 0, BALL_R * 1.9).fill({ color: 0x3fa9f5, alpha: 0.15 });
    outerGlow.circle(0, 0, BALL_R * 1.5).fill({ color: 0x6ad4ff, alpha: 0.2 });
    ballContainer.addChild(outerGlow);

    // 旋转光环（两条能量线）
    const energyRing = new PIXI.Graphics();
    // 用多段弧线模拟虚线圆环
    for (let seg = 0; seg < 8; seg++) {
      const a0 = (seg / 8) * Math.PI * 2;
      const a1 = a0 + Math.PI * 0.18;
      energyRing.arc(0, 0, BALL_R * 1.3, a0, a1);
    }
    energyRing.stroke({ color: 0xffffff, alpha: 0.6, width: 2 });
    ballContainer.addChild(energyRing);

    // 球体：底层
    const ballBody = new PIXI.Graphics();
    // 主球：深蓝到亮蓝渐变（用两层模拟）
    ballBody.circle(0, 0, BALL_R).fill({ color: 0x0a2a5e });
    ballBody.circle(0, 0, BALL_R - 4).fill({ color: 0x0d3d7a });
    // 高光
    ballBody.circle(-BALL_R * 0.25, -BALL_R * 0.28, BALL_R * 0.22).fill({ color: 0x8ad5ff, alpha: 0.45 });
    // 上半球颜色区分
    ballBody.rect(-BALL_R, -BALL_R, BALL_R * 2, 3).fill({ color: 0x1a5fa0, alpha: 0.8 });
    // 分割线
    ballBody.rect(-BALL_R, -2, BALL_R * 2, 4).fill({ color: 0x2a7fcf });
    ballContainer.addChild(ballBody);

    // 菱形中心按钮
    const diamondBtn = new PIXI.Graphics();
    const d = 10;
    diamondBtn
      .moveTo(0, -d)
      .lineTo(d, 0)
      .lineTo(0, d)
      .lineTo(-d, 0)
      .closePath()
      .fill({ color: 0xffffff })
      .stroke({ color: 0x6ad4ff, width: 2 });
    // 内部小菱形
    const di = 5;
    diamondBtn
      .moveTo(0, -di)
      .lineTo(di, 0)
      .lineTo(0, di)
      .lineTo(-di, 0)
      .closePath()
      .fill({ color: 0x3fa9f5 });
    ballContainer.addChild(diamondBtn);

    // 能量线（球体上的白色纹路）
    const energyLines = new PIXI.Graphics();
    for (let ang = 0; ang < 360; ang += 45) {
      const rad = (ang * Math.PI) / 180;
      const x1 = Math.cos(rad) * (BALL_R * 0.3);
      const y1 = Math.sin(rad) * (BALL_R * 0.3);
      const x2 = Math.cos(rad) * (BALL_R * 0.85);
      const y2 = Math.sin(rad) * (BALL_R * 0.85);
      energyLines
        .moveTo(x1, y1)
        .lineTo(x2, y2);
    }
    energyLines.stroke({ color: 0xffffff, alpha: 0.22, width: 1.5 });
    ballContainer.addChild(energyLines);

    // 旋转动画（每帧）
    app.ticker.add(function (ticker) {
      energyRing.rotation += 0.022;
      outerGlow.scale.x = 1 + 0.06 * Math.sin(Date.now() * 0.003);
      outerGlow.scale.y = outerGlow.scale.x;
    });

    // ─────────────────────────────────────────────
    // 7. 白光爆炸特效
    // ─────────────────────────────────────────────
    const flashGfx = new PIXI.Graphics();
    flashGfx.alpha = 0;
    fxLayer.addChild(flashGfx);

    function drawFlash() {
      const W = app.screen.width;
      const H = app.screen.height;
      flashGfx.clear();
      flashGfx.rect(0, 0, W, H).fill({ color: 0xffffff });
    }
    drawFlash();

    // 爆炸光晕（圆形扩散）
    const burstGfx = new PIXI.Graphics();
    burstGfx.alpha = 0;
    fxLayer.addChild(burstGfx);

    function drawBurst(r) {
      burstGfx.clear();
      burstGfx
        .circle(0, 0, r * 1.4).fill({ color: 0x8ad5ff, alpha: 0.25 })
        .circle(0, 0, r * 1.0).fill({ color: 0xffffff, alpha: 0.55 })
        .circle(0, 0, r * 0.5).fill({ color: 0xffffff, alpha: 0.9 });
    }

    // ─────────────────────────────────────────────
    // 8. 精灵剪影（Canvas 绘制 → PixiJS Texture）
    // ─────────────────────────────────────────────
    function makeMonsterTexture(type, size) {
      const offCanvas = document.createElement('canvas');
      offCanvas.width = size;
      offCanvas.height = size;
      const ctx = offCanvas.getContext('2d');
      const cx = size / 2;
      const cy = size / 2;
      const s = size / 80; // 缩放因子（基准 80px）

      ctx.shadowBlur = 18 * s;

      if (type === 'grass') {
        // 芽团兽：绿色系，圆body + 叶子耳
        ctx.shadowColor = '#4dff88';
        // 身体
        ctx.fillStyle = '#2e7d4f';
        ctx.beginPath();
        ctx.ellipse(cx, cy + 6 * s, 24 * s, 22 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        // 头部
        ctx.fillStyle = '#3da862';
        ctx.beginPath();
        ctx.ellipse(cx, cy - 8 * s, 20 * s, 18 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        // 左叶耳
        ctx.fillStyle = '#4ecf78';
        ctx.beginPath();
        ctx.ellipse(cx - 18 * s, cy - 20 * s, 8 * s, 14 * s, -0.6, 0, Math.PI * 2);
        ctx.fill();
        // 右叶耳
        ctx.beginPath();
        ctx.ellipse(cx + 18 * s, cy - 20 * s, 8 * s, 14 * s, 0.6, 0, Math.PI * 2);
        ctx.fill();
        // 叶芽顶
        ctx.fillStyle = '#6dff9a';
        ctx.beginPath();
        ctx.ellipse(cx, cy - 26 * s, 5 * s, 10 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        // 眼睛高光（像素风）
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx - 8 * s, cy - 12 * s, 4 * s, 4 * s);
        ctx.fillRect(cx + 4 * s, cy - 12 * s, 4 * s, 4 * s);

      } else if (type === 'fire') {
        // 炽团犬：橙红色，圆body + 尖耳 + 火焰尾
        ctx.shadowColor = '#ff6622';
        // 身体
        ctx.fillStyle = '#8b2500';
        ctx.beginPath();
        ctx.ellipse(cx, cy + 6 * s, 22 * s, 20 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        // 头
        ctx.fillStyle = '#c03000';
        ctx.beginPath();
        ctx.ellipse(cx, cy - 7 * s, 20 * s, 17 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        // 左尖耳
        ctx.fillStyle = '#e04010';
        ctx.beginPath();
        ctx.moveTo(cx - 22 * s, cy - 14 * s);
        ctx.lineTo(cx - 14 * s, cy - 30 * s);
        ctx.lineTo(cx - 6 * s, cy - 16 * s);
        ctx.closePath();
        ctx.fill();
        // 右尖耳
        ctx.beginPath();
        ctx.moveTo(cx + 22 * s, cy - 14 * s);
        ctx.lineTo(cx + 14 * s, cy - 30 * s);
        ctx.lineTo(cx + 6 * s, cy - 16 * s);
        ctx.closePath();
        ctx.fill();
        // 火焰尾（右侧弯曲）
        ctx.fillStyle = '#ff8c00';
        ctx.beginPath();
        ctx.ellipse(cx + 28 * s, cy + 8 * s, 6 * s, 14 * s, 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffcc00';
        ctx.beginPath();
        ctx.ellipse(cx + 30 * s, cy + 2 * s, 3.5 * s, 8 * s, 0.3, 0, Math.PI * 2);
        ctx.fill();
        // 眼睛
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx - 8 * s, cy - 11 * s, 4 * s, 4 * s);
        ctx.fillRect(cx + 4 * s, cy - 11 * s, 4 * s, 4 * s);

      } else if (type === 'water') {
        // 泡鳍兽：蓝色系，圆body + 鳍翅
        ctx.shadowColor = '#44aaff';
        // 身体
        ctx.fillStyle = '#0a3d6b';
        ctx.beginPath();
        ctx.ellipse(cx, cy + 5 * s, 23 * s, 21 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        // 头
        ctx.fillStyle = '#1260a8';
        ctx.beginPath();
        ctx.ellipse(cx, cy - 8 * s, 19 * s, 17 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        // 左鳍
        ctx.fillStyle = '#1e8fff';
        ctx.beginPath();
        ctx.ellipse(cx - 28 * s, cy + 4 * s, 7 * s, 16 * s, -0.3, 0, Math.PI * 2);
        ctx.fill();
        // 右鳍
        ctx.beginPath();
        ctx.ellipse(cx + 28 * s, cy + 4 * s, 7 * s, 16 * s, 0.3, 0, Math.PI * 2);
        ctx.fill();
        // 顶鳍
        ctx.fillStyle = '#44ccff';
        ctx.beginPath();
        ctx.moveTo(cx, cy - 22 * s);
        ctx.lineTo(cx - 8 * s, cy - 14 * s);
        ctx.lineTo(cx + 8 * s, cy - 14 * s);
        ctx.closePath();
        ctx.fill();
        // 气泡
        ctx.strokeStyle = '#88ddff';
        ctx.lineWidth = 1.5 * s;
        ctx.beginPath();
        ctx.arc(cx + 14 * s, cy - 18 * s, 3 * s, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx + 20 * s, cy - 24 * s, 2 * s, 0, Math.PI * 2);
        ctx.stroke();
        // 眼睛
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx - 7 * s, cy - 12 * s, 4 * s, 4 * s);
        ctx.fillRect(cx + 3 * s, cy - 12 * s, 4 * s, 4 * s);
      }

      return PIXI.Texture.from(offCanvas);
    }

    const MONSTER_SIZE = 120;
    const monsterDefs = [
      { type: 'grass', label: '芽团兽', color: 0x2e7d4f },
      { type: 'fire',  label: '炽团犬', color: 0xc03000 },
      { type: 'water', label: '泡鳍兽', color: 0x1260a8 },
    ];

    const silhouettes = monsterDefs.map((def, i) => {
      const tex = makeMonsterTexture(def.type, MONSTER_SIZE);
      const sprite = new PIXI.Sprite(tex);
      sprite.anchor.set(0.5);
      sprite.alpha = 0;
      sprite.scale.set(0.1);
      silhouetteLayer.addChild(sprite);

      // 浮动 glow
      const glowGfx = new PIXI.Graphics();
      glowGfx.circle(0, 0, 40).fill({ color: def.color, alpha: 0.25 });
      glowGfx.alpha = 0;
      silhouetteLayer.addChildAt(glowGfx, silhouetteLayer.children.indexOf(sprite));

      return { sprite, glowGfx, index: i };
    });

    // ─────────────────────────────────────────────
    // 9. UI 元素（标题 + 副标题 + 按钮）
    // ─────────────────────────────────────────────

    // 标题文字
    const titleStyle = new PIXI.TextStyle({
      fontFamily: '"Press Start 2P", "Courier New", monospace',
      fontSize: 36,
      fontWeight: 'bold',
      fill: 0xffffff,
      stroke: { color: 0x1a5fa0, width: 6 },
      dropShadow: {
        color: 0x001a40,
        blur: 12,
        angle: Math.PI / 4,
        distance: 5,
        alpha: 0.9,
      },
      align: 'center',
      letterSpacing: 2,
    });

    const titleText = new PIXI.Text({ text: 'GBIT Monster Quest', style: titleStyle });
    titleText.anchor.set(0.5);
    titleText.alpha = 0;
    uiLayer.addChild(titleText);

    // ── pixi-filters 特效（如果可用）──
    if (typeof PIXI.GlowFilter !== 'undefined') {
      titleText.filters = [
        new PIXI.GlowFilter({ distance: 15, outerStrength: 2.5, innerStrength: 0.5, color: 0x4488ff }),
      ];
      silhouetteLayer.filters = [
        new PIXI.GlowFilter({ distance: 12, outerStrength: 2, innerStrength: 0, color: 0x66ccff }),
      ];
    }
    if (typeof PIXI.AdvancedBloomFilter !== 'undefined') {
      fxLayer.filters = [
        new PIXI.AdvancedBloomFilter({ threshold: 0.3, bloomScale: 1.5, brightness: 1.2, blur: 8, quality: 6 }),
      ];
    }

    // 副标题
    const subtitleStyle = new PIXI.TextStyle({
      fontFamily: '"Press Start 2P", "Microsoft YaHei", "PingFang SC", sans-serif',
      fontSize: 13,
      fill: 0x8ad5ff,
      stroke: { color: 0x020810, width: 3 },
      letterSpacing: 3,
      align: 'center',
    });

    const subtitleText = new PIXI.Text({ text: 'AI 驱动的精灵冒险', style: subtitleStyle });
    subtitleText.anchor.set(0.5);
    subtitleText.alpha = 0;
    uiLayer.addChild(subtitleText);

    // 按钮（用 PIXI.Graphics + Text 组合）
    const btnContainer = new PIXI.Container();
    btnContainer.alpha = 0;
    btnContainer.scale.set(0.1);
    uiLayer.addChild(btnContainer);

    const btnGfx = new PIXI.Graphics();
    const btnW = 220, btnH = 52;

    function drawBtn(highlighted) {
      btnGfx.clear();
      // 外发光
      btnGfx.roundRect(-btnW / 2 - 4, -btnH / 2 - 4, btnW + 8, btnH + 8, 14)
        .fill({ color: 0x3fa9f5, alpha: highlighted ? 0.45 : 0.25 });
      // 主体
      btnGfx.roundRect(-btnW / 2, -btnH / 2, btnW, btnH, 10)
        .fill({ color: highlighted ? 0x1a6dbf : 0x0d3d7a });
      // 边框
      btnGfx.roundRect(-btnW / 2, -btnH / 2, btnW, btnH, 10)
        .stroke({ color: 0x6ad4ff, width: 2 });
      // 内部高光线
      btnGfx.roundRect(-btnW / 2 + 4, -btnH / 2 + 4, btnW - 8, 6, 4)
        .fill({ color: 0xffffff, alpha: 0.12 });
    }
    drawBtn(false);
    btnContainer.addChild(btnGfx);

    const btnStyle = new PIXI.TextStyle({
      fontFamily: '"Press Start 2P", "Microsoft YaHei", monospace',
      fontSize: 14,
      fill: 0xffffff,
      stroke: { color: 0x020810, width: 3 },
      letterSpacing: 1,
    });
    const btnText = new PIXI.Text({ text: '▶  开始冒险', style: btnStyle });
    btnText.anchor.set(0.5);
    btnContainer.addChild(btnText);

    // 交互
    btnContainer.eventMode = 'static';
    btnContainer.cursor = 'pointer';
    btnContainer.on('pointerover', () => {
      drawBtn(true);
      if (typeof PIXI.GlowFilter !== 'undefined') {
        btnContainer.filters = [new PIXI.GlowFilter({ distance: 10, outerStrength: 3, color: 0x44aaff })];
      }
    });
    btnContainer.on('pointerout', () => {
      drawBtn(false);
      btnContainer.filters = [];
    });
    btnContainer.on('pointerdown', () => { dismissTitleScreen(); });

    // ─────────────────────────────────────────────
    // 10. 布局函数（居中所有元素）
    // ─────────────────────────────────────────────
    function layoutAll() {
      const W = app.screen.width;
      const H = app.screen.height;

      drawBg();
      drawFlash();

      // 能量球初始位置（中上方）
      ballContainer.x = W / 2;

      // 爆炸光晕中心
      burstGfx.x = W / 2;

      // 精灵剪影位置（左中右，稍低于中心）
      const slotX = [W * 0.22, W * 0.5, W * 0.78];
      const slotY = H * 0.52;
      silhouettes.forEach((m, i) => {
        m.sprite.x = slotX[i];
        m.sprite.y = slotY;
        m.glowGfx.x = slotX[i];
        m.glowGfx.y = slotY;
      });

      // 标题（屏幕上方 30%）
      titleText.x = W / 2;
      titleText.y = H * 0.3;

      // 副标题
      subtitleText.x = W / 2;
      subtitleText.y = H * 0.3 + 60;

      // 按钮
      btnContainer.x = W / 2;
      btnContainer.y = H * 0.82;
    }

    layoutAll();

    // ─────────────────────────────────────────────
    // 11. 动画序列
    // ─────────────────────────────────────────────
    const W = () => app.screen.width;
    const H = () => app.screen.height;

    // 能量球初始状态（屏幕顶部之外）
    ballContainer.y = -100;
    ballContainer.alpha = 1;

    // 主时间线
    const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });

    // ── 阶段 1：能量球落入 + 弹跳 (0.0s ~ 1.1s) ──
    tl.to(ballContainer, {
      y: () => H() * 0.42,
      duration: 0.55,
      ease: 'bounce.out',
    })
    // 球压扁弹起感
    .to(ballContainer.scale, {
      x: 1.15, y: 0.85,
      duration: 0.08,
      yoyo: true, repeat: 1,
      ease: 'power2.inOut',
    }, '<+0.5')
    // 小颤动
    .to(ballContainer, {
      y: () => H() * 0.42 - 18,
      duration: 0.18,
      ease: 'power1.out',
    })
    .to(ballContainer, {
      y: () => H() * 0.42,
      duration: 0.14,
      ease: 'power2.in',
    })
    .to(ballContainer, {
      y: () => H() * 0.42 - 8,
      duration: 0.1,
    })
    .to(ballContainer, {
      y: () => H() * 0.42,
      duration: 0.09,
      ease: 'power2.in',
    })

    // ── 阶段 2：爆炸 + 白光 (1.1s ~ 1.6s) ──
    .call(function () {
      burstGfx.y = H() * 0.42;
      drawBurst(BALL_R);
    })
    .to(ballContainer, { alpha: 0, duration: 0.08, ease: 'power4.in' }, '+=0.05')
    .to(flashGfx, { alpha: 1, duration: 0.07 })
    .call(function () {
      // 扩散光晕
      gsap.to(burstGfx, { alpha: 1, duration: 0.05 });
      gsap.to({}, {
        duration: 0.4,
        onUpdate: function () {
          const progress = this.progress();
          drawBurst(BALL_R + progress * 180);
          burstGfx.alpha = 1 - progress * 0.85;
        },
      });
    })
    .to(flashGfx, { alpha: 0, duration: 0.35, ease: 'power2.out' })

    // ── 阶段 3：精灵剪影飞出 (1.3s ~ 2.0s) ──
    .call(function () {
      const slotX = [W() * 0.22, W() * 0.5, W() * 0.78];
      const slotY = H() * 0.52;

      silhouettes.forEach((m, i) => {
        // 初始位置：爆炸中心
        m.sprite.x = W() / 2;
        m.sprite.y = H() * 0.42;
        m.glowGfx.x = W() / 2;
        m.glowGfx.y = H() * 0.42;
        m.sprite.alpha = 1;
        m.sprite.scale.set(0.3);
        m.glowGfx.alpha = 0;

        const delay = i * 0.07;

        gsap.to(m.sprite, {
          x: slotX[i],
          y: slotY,
          alpha: 1,
          duration: 0.55,
          delay,
          ease: 'back.out(1.7)',
        });
        gsap.to(m.sprite.scale, {
          x: 1, y: 1,
          duration: 0.55,
          delay,
          ease: 'back.out(1.6)',
        });
        gsap.to(m.glowGfx, {
          x: slotX[i],
          y: slotY,
          alpha: 1,
          duration: 0.55,
          delay: delay + 0.1,
        });
      });
    }, null, '-=0.15')

    // ── 阶段 4：标题飞入 (2.0s ~ 2.5s) ──
    .call(function () {
      titleText.y = H() * 0.1;
      titleText.alpha = 0;
    }, null, '+=0.55')
    .to(titleText, {
      y: () => H() * 0.3,
      alpha: 1,
      duration: 0.5,
      ease: 'back.out(2.2)',
    })

    // ── 阶段 5：副标题淡入 (2.5s ~ 2.9s) ──
    .to(subtitleText, {
      alpha: 1,
      duration: 0.4,
      ease: 'power2.out',
    }, '+=0.05')

    // ── 阶段 6：按钮弹出 (2.9s ~ 3.2s) ──
    .to(btnContainer, {
      alpha: 1,
      duration: 0.3,
      ease: 'power2.out',
    }, '+=0.1')
    .to(btnContainer.scale, {
      x: 1, y: 1,
      duration: 0.38,
      ease: 'back.out(2.5)',
    }, '<')

    // ── 阶段 7：按钮持续 pulse + 精灵浮动 ──
    .call(function () {
      startIdleAnimations();
    });

    // ─────────────────────────────────────────────
    // 12. 闲置动画（精灵浮动 + 按钮 pulse）
    // ─────────────────────────────────────────────
    function startIdleAnimations() {
      // 精灵上下浮动（错开节奏）
      silhouettes.forEach((m, i) => {
        const baseY = m.sprite.y;
        gsap.to(m.sprite, {
          y: baseY - 8,
          duration: 1.4 + i * 0.2,
          yoyo: true,
          repeat: -1,
          ease: 'sine.inOut',
          delay: i * 0.35,
        });
        // glow 跟随
        gsap.to(m.glowGfx, {
          y: m.glowGfx.y - 8,
          duration: 1.4 + i * 0.2,
          yoyo: true,
          repeat: -1,
          ease: 'sine.inOut',
          delay: i * 0.35,
        });
        // 轻微旋转
        gsap.to(m.sprite, {
          rotation: (i % 2 === 0 ? 1 : -1) * 0.04,
          duration: 2.2 + i * 0.3,
          yoyo: true,
          repeat: -1,
          ease: 'sine.inOut',
          delay: i * 0.5,
        });
      });

      // 按钮 pulse
      gsap.to(btnContainer.scale, {
        x: 1.06, y: 1.06,
        duration: 0.85,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
      });

      // 标题轻微发光闪烁
      gsap.to(titleText, {
        alpha: 0.88,
        duration: 1.8,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
      });
    }

    // ─────────────────────────────────────────────
    // 13. 退出逻辑
    // ─────────────────────────────────────────────
    function dismissTitleScreen() {
      if (global.titleScreenState.dismissed) return;
      global.titleScreenState.dismissed = true;

      gsap.killTweensOf(btnContainer.scale);

      gsap.to(wrapper, {
        opacity: 0,
        duration: 0.6,
        ease: 'power2.inOut',
        onComplete: function () {
          // 销毁 PixiJS app
          app.destroy(true, { children: true, texture: true });
          window.removeEventListener('resize', onResize);
          wrapper.remove();

          document.body.classList.remove('title-screen-active');
          // 触发自定义事件，通知游戏主逻辑
          document.dispatchEvent(new CustomEvent('titleScreenDismissed'));
        },
      });
    }

    // ESC 键跳过
    function onKeyDown(e) {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        document.removeEventListener('keydown', onKeyDown);
        dismissTitleScreen();
      }
    }
    document.addEventListener('keydown', onKeyDown);

    // ─────────────────────────────────────────────
    // 14. 字体加载后补偿文字宽度
    // ─────────────────────────────────────────────
    if (document.fonts) {
      document.fonts.ready.then(function () {
        if (!global.titleScreenState.dismissed) {
          layoutAll();
        }
      });
    }
  }

})(window);

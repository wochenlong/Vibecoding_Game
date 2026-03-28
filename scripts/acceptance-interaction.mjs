import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const baseUrl = "http://127.0.0.1:4310";
const executableCandidates = [
  process.env.BROWSER_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Mozilla Firefox/firefox.exe",
].filter(Boolean);

const executablePath = executableCandidates.find((p) => fs.existsSync(p));
if (!executablePath) {
  console.error("NO_BROWSER_EXECUTABLE");
  process.exit(2);
}

const browser = await puppeteer.launch({
  headless: true,
  executablePath,
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
});

const page = await browser.newPage();
page.setDefaultTimeout(30000);
page.setViewport({ width: 1440, height: 900 });
page.on("dialog", async (dialog) => {
  const type = dialog.type();
  if (type === "prompt") {
    await dialog.accept("验收训练家");
    return;
  }
  await dialog.accept();
});

const results = [];
const pushResult = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"} | ${name} | ${detail}`);
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function dismissTitleScreenIfNeeded() {
  const titleExists = await page.evaluate(() => Boolean(document.getElementById("title-screen")));
  if (!titleExists) {
    return;
  }

  await page.keyboard.press("Enter");
  await page
    .waitForFunction(
      () => !document.getElementById("title-screen") || Boolean(window.titleScreenState?.dismissed),
      { timeout: 8000 }
    )
    .catch(() => null);
  await sleep(800);
}

try {
  await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    localStorage.removeItem("gbit_monster_quest_save_v1");
    localStorage.removeItem("gbit_monster_quest_save_profile_v2");
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith("gbit_monster_quest_save_slot_v2_")) {
        localStorage.removeItem(key);
      }
    }
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await dismissTitleScreenIfNeeded();
  await page.waitForSelector("#gameCanvas");
  await page.waitForSelector("#saveMenuNewButton");
  await page.click("#saveMenuNewButton");
  await page.waitForSelector("#saveMenuOverlay.hidden");

  const stateType = await page.evaluate(() => typeof state);
  if (stateType !== "object") {
    throw new Error(`state is not accessible in page context: ${stateType}`);
  }

  // Test 1: NPC auto portrait trigger on Enter interaction.
  await page.evaluate(() => {
    state.storyStage = 1;
    state.scene = "overworld";
    state.choice = null;
    state.vnActive = false;
    if (!Array.isArray(state.player.party) || state.player.party.length === 0) {
      state.player.party = [createMonster("sprigoon", 5)];
      state.player.activeIndex = 0;
    }
    state.currentMap = "town";
    state.player.x = 11;
    state.player.y = 4;
    if (ART_MANIFEST.characters) {
      delete ART_MANIFEST.characters.caretaker;
      delete ART_MANIFEST.characters["npc_caretaker"];
    }
    if (npcArtState.autoRequestedAt && npcArtState.autoRequestedAt.caretaker) {
      delete npcArtState.autoRequestedAt.caretaker;
    }
    npcArtState.currentTaskId = null;
    syncUi();
  });

  await page.keyboard.press("Enter");
  await sleep(3000);

  const npcCheck = await page.evaluate(() => {
    const status = ui.npcArtTaskStatus?.textContent || "";
    const logs = ui.npcArtTaskLog?.innerText || "";
    const target = ui.npcArtTarget?.value || "";
    const autoStamp = Number(npcArtState.autoRequestedAt?.caretaker || 0);
    return { status, logs, target, autoStamp };
  });

  const npcPass =
    npcCheck.target === "caretaker" &&
    npcCheck.autoStamp > 0 &&
    /生成|提交|queued|task|portrait/i.test(`${npcCheck.status} ${npcCheck.logs}`);
  pushResult(
    "NPC interaction auto-portrait",
    npcPass,
    `target=${npcCheck.target}, autoStamp=${npcCheck.autoStamp > 0}, status=${npcCheck.status}`
  );

  // Test 2: Shop category + pagination.
  const shopCheck = await page.evaluate(() => {
    const oldGetMerchantStock = getMerchantStock;
    getMerchantStock = () => [
      { itemId: "potion", quantity: 1 },
      { itemId: "super_potion", quantity: 1 },
      { itemId: "hyper_potion", quantity: 1 },
      { itemId: "potion", quantity: 1 },
      { itemId: "super_potion", quantity: 1 },
      { itemId: "hyper_potion", quantity: 1 },
      { itemId: "potion", quantity: 1 },
      { itemId: "super_potion", quantity: 1 },
    ];

    openMerchantMainMenu();
    const mainTitle = state.choice?.title || "";
    const hasCategoryLabel = (state.choice?.options || []).some((opt) =>
      String(opt.label || "").includes("回复道具")
    );

    openMerchantCategoryPage("heal", 0);
    const page1Title = state.choice?.title || "";
    const nextOption = (state.choice?.options || []).find((opt) =>
      String(opt.label || "").includes("下一页")
    );
    const hasNext = Boolean(nextOption);
    if (nextOption) {
      nextOption.onSelect();
    }
    const page2Title = state.choice?.title || "";

    getMerchantStock = oldGetMerchantStock;
    closeChoice();

    return {
      mainTitle,
      hasCategoryLabel,
      page1Title,
      hasNext,
      page2Title,
    };
  });

  const shopPass =
    /分类货架/.test(shopCheck.mainTitle) &&
    shopCheck.hasCategoryLabel &&
    shopCheck.hasNext &&
    /2 \/ 2/.test(shopCheck.page2Title);
  pushResult(
    "Shop category + pagination",
    shopPass,
    `main=${shopCheck.mainTitle}, next=${shopCheck.hasNext}, page2=${shopCheck.page2Title}`
  );

  // Test 3: Fusion evolution applies type/trait/skills and opens portrait choice flow.
  const fusionCheck = await page.evaluate(async () => {
    const originalRequestEvolutionMonsterPortrait = requestEvolutionMonsterPortrait;
    requestEvolutionMonsterPortrait = async ({ variant = "live" } = {}) => {
      if (variant === "fusion_choice_a") {
        return {
          ok: true,
          artKey: "fusion_choice_a_test",
          src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9fM/8AAAAASUVORK5CYII=",
        };
      }
      if (variant === "fusion_choice_b") {
        return {
          ok: true,
          artKey: "fusion_choice_b_test",
          src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9fM/8AAAAASUVORK5CYII=",
        };
      }
      return { ok: false, reason: "not-needed", artKey: "", src: "" };
    };

    state.scene = "overworld";
    state.choice = null;
    state.progress = state.progress || {};
    state.progress.alchemyHistory = [];
    pokedexPortraitState.pendingBySpecies = {};
    pokedexPortraitState.deferredQueue = [];
    state.player.party = [createMonster("sprigoon", 10)];
    state.player.reserve = [createMonster("embercub", 8)];
    state.player.activeIndex = 0;

    state.player.essence = {
      ...(state.player.essence || {}),
      arcane: 10,
      void: 10,
      normal: 10,
      grass: 10,
      fire: 10,
      water: 10,
      bug: 10,
      electric: 10,
      rock: 10,
      fairy: 10,
      sun: 10,
      weapon: 10,
    };

    syncUi();
    ui.fusionTargetSelect.value = state.player.party[0].uid;
    ui.fusionPartnerSelect.value = state.player.reserve[0].uid;

    await performFusionEvolution();
    await new Promise((resolve) => setTimeout(resolve, 30));

    const choiceTitle = state.choice?.title || "";
    const optionCount = state.choice?.options?.length || 0;
    const hasPortraitChoice = /融合立绘二选一/.test(choiceTitle) && optionCount >= 3;
    if (hasPortraitChoice && state.choice?.options?.[1]) {
      state.choice.options[1].onSelect();
    }

    const monster = state.player.party[0];
    const data = {
      tier: monster.mutation?.tier || 0,
      trait: monster.mutation?.trait || "",
      types: getSpeciesTypes(monster),
      skillCount: Array.isArray(monster.skills) ? monster.skills.length : -1,
      portraitKey: monster.mutation?.portraitKey || "",
      hasPortraitChoice,
      status: ui.alchemyTaskStatus?.textContent || "",
    };

    requestEvolutionMonsterPortrait = originalRequestEvolutionMonsterPortrait;
    return data;
  });

  const fusionPass =
    fusionCheck.tier >= 1 &&
    Boolean(fusionCheck.trait) &&
    Array.isArray(fusionCheck.types) &&
    fusionCheck.types.includes("fire") &&
    fusionCheck.skillCount > 0 &&
    fusionCheck.hasPortraitChoice &&
    fusionCheck.portraitKey === "fusion_choice_b_test" &&
    fusionCheck.skillCount <= 4;
  pushResult(
    "Fusion evolution + portrait choice",
    fusionPass,
    `tier=${fusionCheck.tier}, trait=${fusionCheck.trait}, types=${fusionCheck.types.join("/")}, skills=${fusionCheck.skillCount}, portrait=${fusionCheck.portraitKey || "<none>"}`
  );

  // Test 4: Devour consumes element+void and rollback restores snapshot.
  const devourRollbackCheck = await page.evaluate(async () => {
    const originalRequestEvolutionMonsterPortrait = requestEvolutionMonsterPortrait;
    requestEvolutionMonsterPortrait = async () => ({
      ok: true,
      artKey: "devour_live_stub",
      src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9fM/8AAAAASUVORK5CYII=",
    });

    state.scene = "overworld";
    state.choice = null;
    state.progress = state.progress || {};
    state.progress.alchemyHistory = [];
    state.player.party = [createMonster("sprigoon", 10)];
    state.player.reserve = [createMonster("embercub", 8)];
    state.player.activeIndex = 0;
    state.player.essence = {
      ...(state.player.essence || {}),
      grass: 4,
      void: 2,
      arcane: 0,
    };

    const before = {
      tier: state.player.party[0].mutation?.tier || 0,
      grass: Number(state.player.essence.grass) || 0,
      void: Number(state.player.essence.void) || 0,
    };

    syncUi();
    ui.devourTargetSelect.value = state.player.party[0].uid;
    ui.devourElementSelect.value = "grass";
    await performDevourEvolution();

    const afterDevour = {
      mode: state.player.party[0].mutation?.mode || "",
      tier: state.player.party[0].mutation?.tier || 0,
      grass: Number(state.player.essence.grass) || 0,
      void: Number(state.player.essence.void) || 0,
    };

    const rollbackOk = rollbackLastAlchemyOperation();
    const afterRollback = {
      mode: state.player.party[0].mutation?.mode || "",
      tier: state.player.party[0].mutation?.tier || 0,
      grass: Number(state.player.essence.grass) || 0,
      void: Number(state.player.essence.void) || 0,
      historyCount: Array.isArray(state.progress?.alchemyHistory) ? state.progress.alchemyHistory.length : -1,
      rollbackOk,
    };

    requestEvolutionMonsterPortrait = originalRequestEvolutionMonsterPortrait;
    return { before, afterDevour, afterRollback };
  });

  const devourRollbackPass =
    devourRollbackCheck.afterDevour.mode === "devour" &&
    devourRollbackCheck.afterDevour.tier >= devourRollbackCheck.before.tier + 1 &&
    devourRollbackCheck.afterDevour.grass === devourRollbackCheck.before.grass - 2 &&
    devourRollbackCheck.afterDevour.void === devourRollbackCheck.before.void - 1 &&
    devourRollbackCheck.afterRollback.rollbackOk === true &&
    devourRollbackCheck.afterRollback.mode === "none" &&
    devourRollbackCheck.afterRollback.tier === devourRollbackCheck.before.tier &&
    devourRollbackCheck.afterRollback.grass === devourRollbackCheck.before.grass &&
    devourRollbackCheck.afterRollback.void === devourRollbackCheck.before.void;
  pushResult(
    "Devour + rollback snapshot restore",
    devourRollbackPass,
    `devour(mode=${devourRollbackCheck.afterDevour.mode}, tier=${devourRollbackCheck.afterDevour.tier}, grass=${devourRollbackCheck.afterDevour.grass}, void=${devourRollbackCheck.afterDevour.void}) rollback(mode=${devourRollbackCheck.afterRollback.mode}, tier=${devourRollbackCheck.afterRollback.tier}, grass=${devourRollbackCheck.afterRollback.grass}, void=${devourRollbackCheck.afterRollback.void})`
  );

  // Test 5: Fusion portrait chooser supports A/B/skip.
  const fusionPortraitChoiceFlow = await page.evaluate(async () => {
    const originalRequestEvolutionMonsterPortrait = requestEvolutionMonsterPortrait;
    requestEvolutionMonsterPortrait = async ({ variant = "live" } = {}) => {
      if (variant === "fusion_choice_a") {
        return {
          ok: true,
          artKey: "fusion_choice_flow_a",
          src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9fM/8AAAAASUVORK5CYII=",
        };
      }
      if (variant === "fusion_choice_b") {
        return {
          ok: true,
          artKey: "fusion_choice_flow_b",
          src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9fM/8AAAAASUVORK5CYII=",
        };
      }
      return { ok: false, reason: "not-needed", artKey: "", src: "" };
    };

    state.scene = "overworld";
    state.choice = null;
    state.player.party = [createMonster("sprigoon", 10)];
    state.player.reserve = [createMonster("embercub", 8)];
    syncUi();

    const target = state.player.party[0];
    const partner = createMonster("embercub", 8);

    await queueFusionPortraitChoices({ monster: target, partner, recipe: "fire" });
    const firstChoice = {
      title: state.choice?.title || "",
      optionCount: state.choice?.options?.length || 0,
    };
    if (state.choice?.options?.[0]) {
      state.choice.options[0].onSelect();
    }
    const selectedA = target.mutation?.portraitKey || "";

    await queueFusionPortraitChoices({ monster: target, partner, recipe: "fire" });
    if (state.choice?.options?.[1]) {
      state.choice.options[1].onSelect();
    }
    const selectedB = target.mutation?.portraitKey || "";

    await queueFusionPortraitChoices({ monster: target, partner, recipe: "fire" });
    if (state.choice?.options?.[2]) {
      state.choice.options[2].onSelect();
    }
    const selectedAfterSkip = target.mutation?.portraitKey || "";
    const choiceClosedAfterSkip = Boolean(state.choice);

    requestEvolutionMonsterPortrait = originalRequestEvolutionMonsterPortrait;
    return {
      firstChoice,
      selectedA,
      selectedB,
      selectedAfterSkip,
      choiceClosedAfterSkip,
    };
  });

  const fusionPortraitChoicePass =
    /融合立绘二选一/.test(fusionPortraitChoiceFlow.firstChoice.title) &&
    fusionPortraitChoiceFlow.firstChoice.optionCount === 3 &&
    fusionPortraitChoiceFlow.selectedA === "fusion_choice_flow_a" &&
    fusionPortraitChoiceFlow.selectedB === "fusion_choice_flow_b" &&
    fusionPortraitChoiceFlow.selectedAfterSkip === "fusion_choice_flow_b" &&
    fusionPortraitChoiceFlow.choiceClosedAfterSkip === false;
  pushResult(
    "Fusion portrait A/B/skip flow",
    fusionPortraitChoicePass,
    `title=${fusionPortraitChoiceFlow.firstChoice.title}, options=${fusionPortraitChoiceFlow.firstChoice.optionCount}, A=${fusionPortraitChoiceFlow.selectedA}, B=${fusionPortraitChoiceFlow.selectedB}, afterSkip=${fusionPortraitChoiceFlow.selectedAfterSkip}`
  );

  // Test 6: First encounter triggers two candidate portraits and selection flow.
  const speciesId = "voltkit";
  await page.evaluate((sid) => {
    state.scene = "overworld";
    state.choice = null;
    if (!Array.isArray(state.player.party) || state.player.party.length === 0) {
      state.player.party = [createMonster("sprigoon", 8)];
      state.player.activeIndex = 0;
    }

    if (state.pokedex?.seen) {
      delete state.pokedex.seen[sid];
    }
    if (state.pokedex?.caught) {
      delete state.pokedex.caught[sid];
    }
    if (state.pokedex?.portraits) {
      delete state.pokedex.portraits[sid];
    }
    if (state.pokedex?.candidates) {
      delete state.pokedex.candidates[sid];
    }
    if (pokedexPortraitState.pendingBySpecies?.[sid]) {
      delete pokedexPortraitState.pendingBySpecies[sid];
    }

    syncUi();
    startWildBattle({
      pool: [{ speciesId: sid, minLevel: 5, maxLevel: 5, weight: 1 }],
      openingLine: "验收用遭遇。",
    });
    finishBattle("run");
  }, speciesId);

  let portraitChoiceReady = false;
  let portraitFailure = false;
  let portraitSnapshot = null;
  for (let i = 0; i < 120; i += 1) {
    await sleep(2000);
    portraitSnapshot = await page.evaluate((sid) => {
      const choiceTitle = state.choice?.title || "";
      const optionCount = state.choice?.options?.length || 0;
      const imageCount = document.querySelectorAll(".choice-option-image").length;
      const candidates = state.pokedex?.candidates?.[sid] || [];
      const statuses = candidates.map((c) => c.status);
      const readyCount = candidates.filter((c) => c && c.src).length;
      return { choiceTitle, optionCount, imageCount, statuses, readyCount };
    }, speciesId);

    if (/图鉴立绘二选一/.test(portraitSnapshot.choiceTitle) && portraitSnapshot.imageCount >= 2) {
      portraitChoiceReady = true;
      break;
    }

    if (
      portraitSnapshot.statuses.length === 2 &&
      portraitSnapshot.statuses.every((status) => status === "failed")
    ) {
      portraitFailure = true;
      break;
    }
  }

  if (portraitChoiceReady) {
    const selection = await page.evaluate((sid) => {
      if (state.choice?.options?.[0]) {
        state.choice.options[0].onSelect();
      }
      return {
        selectedKey: state.pokedex?.portraits?.[sid] || "",
        choiceOpen: Boolean(state.choice),
      };
    }, speciesId);

    const portraitPass = Boolean(selection.selectedKey);
    pushResult(
      "First encounter dual portrait selection",
      portraitPass,
      `selected=${selection.selectedKey || "<none>"}, choiceStillOpen=${selection.choiceOpen}`
    );
  } else {
    pushResult(
      "First encounter dual portrait selection",
      false,
      portraitFailure
        ? `candidate tasks failed: ${JSON.stringify(portraitSnapshot)}`
        : `timeout waiting candidate choice: ${JSON.stringify(portraitSnapshot)}`
    );
  }

  const passed = results.filter((item) => item.pass).length;
  const failed = results.length - passed;
  console.log(`SUMMARY | passed=${passed} failed=${failed}`);
} catch (error) {
  console.error("ACCEPTANCE_SCRIPT_ERROR", error?.stack || error?.message || String(error));
  process.exitCode = 1;
} finally {
  await browser.close();
}

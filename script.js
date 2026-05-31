const DEFAULT_LANG = "de";
const SUPPORTED_LANGS = ["de", "en"];

const orgDetailKicker = document.querySelector("#orgDetailKicker");
const orgDetailTitle = document.querySelector("#orgDetailTitle");
const orgDetailText = document.querySelector("#orgDetailText");
const orgChart = document.querySelector("#orgChart");

const localeCache = new Map();
let currentLang = DEFAULT_LANG;
let currentLocale = null;
let orgDetails = {};
let orgLabelToId = {};
let orgPrimaryLabels = new Set();
let mermaidIsReady = false;

const ORG_NODE_BASE_SIZES = {
  Studierende: { width: 190, height: 54 },
  Fachschaften: { width: 200, height: 54 },
  FSVV: { width: 360, height: 78 },
  StuRa: { width: 200, height: 54 },
  Senat: { width: 230, height: 54 },
};

const ORG_LAYOUT_LABELS = {
  Studierende: "Alle Studierende",
  Fachschaften: "Fachschaften",
  FSVV: "Fachschaftenvollversammlung",
  StuRa: "Studierendenrat",
  Senat: "Senat der Universität",
};

const getPreferredLanguage = () => {
  const savedLanguage = localStorage.getItem("fsvv-language");

  if (SUPPORTED_LANGS.includes(savedLanguage)) {
    return savedLanguage;
  }

  const browserLanguage = navigator.language?.slice(0, 2);
  return SUPPORTED_LANGS.includes(browserLanguage) ? browserLanguage : DEFAULT_LANG;
};

const loadLocale = async (lang) => {
  if (localeCache.has(lang)) {
    return localeCache.get(lang);
  }

  const response = await fetch(`locales/${lang}.json`);

  if (!response.ok) {
    throw new Error(`Could not load locale: ${lang}`);
  }

  const locale = await response.json();
  localeCache.set(lang, locale);
  return locale;
};

const stripTags = (value) => value.replace(/<[^>]*>/g, "");

const normalizeLabel = (label) => label.trim().replace(/\s+/g, " ");

const compactLabel = (label) => normalizeLabel(label).replace(/\s/g, "");

const addOrgLabel = (map, label, nodeId) => {
  const cleanLabel = stripTags(label);
  map[normalizeLabel(cleanLabel)] = nodeId;
  map[compactLabel(cleanLabel)] = nodeId;
};

const rebuildOrgLabelMap = (locale) => {
  const nextMap = {};

  Object.entries(locale.org.labels).forEach(([nodeId, label]) => {
    addOrgLabel(nextMap, label, nodeId);
  });

  Object.entries(locale.org.details).forEach(([nodeId, detail]) => {
    addOrgLabel(nextMap, detail.title, nodeId);
  });

  ["FSVV", "Fachschaftenvollversammlung", "Fachschaften-vollversammlung", "Fachschaftenvollversammlung(FSVV)"].forEach((label) => {
    addOrgLabel(nextMap, label, "FSVV");
  });

  orgLabelToId = nextMap;
  orgPrimaryLabels = new Set((locale.org.primaryLabels || []).flatMap((label) => [
    normalizeLabel(label),
    compactLabel(label),
  ]));
};

const getNodeIdFromLabel = (label) => {
  const normalizedLabel = normalizeLabel(label);
  return orgLabelToId[normalizedLabel] || orgLabelToId[compactLabel(normalizedLabel)];
};

const getOrgNodeId = (node) => {
  const mermaidId = node.id?.match(/flowchart-(.+?)-\d+$/)?.[1];

  if (mermaidId && ORG_NODE_BASE_SIZES[mermaidId]) {
    return mermaidId;
  }

  return getNodeIdFromLabel(node.textContent);
};

const setText = (selector, value) => {
  const element = document.querySelector(selector);

  if (element && value !== undefined) {
    element.textContent = value;
  }
};

const setHtml = (selector, value) => {
  const element = document.querySelector(selector);

  if (element && value !== undefined) {
    element.innerHTML = value;
  }
};

const setAttribute = (selector, attr, value) => {
  const element = document.querySelector(selector);

  if (element && value !== undefined) {
    element.setAttribute(attr, value);
  }
};

const setListHtml = (selector, values) => {
  document.querySelectorAll(selector).forEach((element, index) => {
    if (values[index] !== undefined) {
      element.innerHTML = values[index];
    }
  });
};

const setListText = (selector, values) => {
  document.querySelectorAll(selector).forEach((element, index) => {
    if (values[index] !== undefined) {
      element.textContent = values[index];
    }
  });
};

const renderList = (selector, values) => {
  const list = document.querySelector(selector);

  if (!list || !values) {
    return;
  }

  list.innerHTML = values.map((item) => `<li>${item}</li>`).join("");
};

const showDefaultOrgInfo = () => {
  if (!currentLocale || !orgDetailKicker || !orgDetailTitle || !orgDetailText) {
    return;
  }

  orgDetailKicker.textContent = currentLocale.org.defaultDetail.kicker;
  orgDetailTitle.textContent = currentLocale.org.defaultDetail.title;
  orgDetailText.textContent = currentLocale.org.defaultDetail.text;
};

window.showOrgInfo = (nodeId) => {
  const detail = orgDetails[nodeId];

  if (!detail || !orgDetailKicker || !orgDetailTitle || !orgDetailText) {
    return;
  }

  orgDetailKicker.textContent = detail.kicker;
  orgDetailTitle.textContent = detail.title;
  orgDetailText.textContent = detail.text;
};

const applyLocale = (locale, lang) => {
  currentLocale = locale;
  currentLang = lang;
  orgDetails = locale.org.details;
  rebuildOrgLabelMap(locale);

  document.documentElement.lang = lang;
  document.title = locale.meta.title;
  document.querySelector(".topbar")?.setAttribute("aria-label", locale.nav.aria);
  document.querySelector(".language-switch")?.setAttribute("aria-label", locale.nav.languageAria);

  setAttribute(".brand", "aria-label", locale.nav.brandAria);
  setAttribute(".hero-beaver", "alt", locale.hero.beaverAlt);
  setText(".brand-lockup p", locale.nav.date);
  setListText(".nav-links a", locale.nav.links);

  setText(".kicker", locale.hero.kicker);
  setListHtml(".reasons-list li", locale.hero.reasons);

  setText(".election-copy .stamp", locale.electionCall.stamp);
  setText(".election-lede", locale.electionCall.lede);
  document.querySelector(".tag-cloud")?.setAttribute("aria-label", locale.electionCall.tagAria);
  setListText(".tag-cloud span", locale.electionCall.tags);
  setText("#election-call-title", locale.electionCall.title);

  setText("#programm .section-heading > p", locale.program.eyebrow);
  setText("#programm-title", locale.program.title);
  document.querySelectorAll(".issue").forEach((issue, index) => {
    const content = locale.program.issues[index];

    if (!content) {
      return;
    }

    issue.querySelector("h3").textContent = content.title;
    issue.querySelector("p").textContent = content.text;
  });

  setText("#wahl .section-heading > p", locale.timeline.eyebrow);
  setText("#timeline-title", locale.timeline.title);
  document.querySelectorAll(".timeline article").forEach((item, index) => {
    const content = locale.timeline.items[index];

    if (!content) {
      return;
    }

    item.querySelector("time").textContent = content.time;
    item.querySelector("h3").textContent = content.title;
    item.querySelector("p").innerHTML = content.text;
  });

  setText("#organigramm .section-heading > p", locale.org.eyebrow);
  setText("#org-title", locale.org.title);
  setListText(".org-copy > p", locale.org.paragraphs);
  showDefaultOrgInfo();

  setText("#process-title", locale.process.title);
  setText(".process-section .section-heading > p", locale.process.eyebrow);
  document.querySelector(".system-steps")?.setAttribute("aria-label", locale.process.stepsAria);
  setListText(".system-steps li", locale.process.steps);

  setText(".join-copy .stamp", locale.faculty.stamp);
  setText("#join-title", locale.faculty.title);
  setListText(".join-copy > p:not(.stamp)", locale.faculty.paragraphs);

  setText("#faq-title", locale.faq.title);
  const faqDetails = document.querySelectorAll(".faq-list > details");
  const faq = locale.faq.items;

  if (faqDetails[0]) {
    faqDetails[0].querySelector("summary").textContent = faq.vote.summary;
    faqDetails[0].querySelector("p").textContent = faq.vote.text;
  }

  if (faqDetails[1]) {
    faqDetails[1].querySelector("summary").textContent = faq.mail.summary;
    faqDetails[1].querySelector("p").textContent = faq.mail.text;
    faqDetails[1].querySelector(".faq-button").textContent = faq.mail.button;
  }

  if (faqDetails[2]) {
    faqDetails[2].querySelector("summary").textContent = faq.location.summary;
    faqDetails[2].querySelector("p").textContent = faq.location.intro;
    renderList("#faq-wahllokal .faq-compact-list", faq.location.locations);
    faqDetails[2].querySelectorAll("p")[1].textContent = faq.location.note;
    faqDetails[2].querySelector(".faq-button").textContent = faq.location.button;
  }

  if (faqDetails[3]) {
    faqDetails[3].querySelector("summary").textContent = faq.work.summary;
    faqDetails[3].querySelector("p").textContent = faq.work.text;
  }

  if (faqDetails[4]) {
    faqDetails[4].querySelector("summary").textContent = faq.beaver.summary;
    faqDetails[4].querySelector("p").textContent = faq.beaver.text;
  }

  if (faqDetails[5]) {
    faqDetails[5].querySelector("summary").textContent = faq.candidates.summary;
    faqDetails[5].querySelectorAll("p")[0].textContent = faq.candidates.intro;
    faqDetails[5].querySelectorAll("p")[1].textContent = faq.candidates.hint;
    faqDetails[5].querySelectorAll(".faq-candidates h3")[0].textContent = faq.candidates.sturaTitle;
    faqDetails[5].querySelectorAll(".faq-candidates h3")[1].textContent = faq.candidates.senateTitle;
    renderList(".faq-candidates ol:first-of-type", faq.candidates.stura);
    renderList(".faq-candidates div:nth-child(2) ol", faq.candidates.senate);
  }

  document.querySelectorAll(".language-switch button").forEach((button) => {
    const isActive = button.dataset.lang === lang;
    button.setAttribute("aria-pressed", String(isActive));
  });
};

const buildMermaidSource = () => {
  const labels = ORG_LAYOUT_LABELS;

  return `flowchart TB
  Studierende["${labels.Studierende}"]
  Fachschaften["${labels.Fachschaften}"]
  FSVV["${labels.FSVV}<br><br>"]
  StuRa["${labels.StuRa}"]
  Senat["${labels.Senat}"]

  Studierende --> Fachschaften
  Fachschaften --> FSVV
  FSVV --> StuRa
  FSVV --> Senat`;
};

const localizeOrgChartLabels = (chart) => {
  if (!currentLocale?.org?.labels) {
    return;
  }

  chart.querySelectorAll(".node").forEach((node) => {
    const nodeId = getOrgNodeId(node);
    const label = currentLocale.org.labels[nodeId];
    const labelBody = node.querySelector("foreignObject div");

    if (!nodeId || !label || !labelBody) {
      return;
    }

    labelBody.innerHTML = nodeId === "FSVV" ? `${label}<br><br>` : label;
  });
};

const hideMermaidTooltips = () => {
  document.querySelectorAll(".mermaidTooltip").forEach((tooltip) => {
    tooltip.style.setProperty("display", "none", "important");
  });
};

const attachOrgChartEvents = () => {
  if (!orgChart || orgChart.dataset.clickable === "true") {
    return;
  }

  orgChart.dataset.clickable = "true";

  const activateNode = (node) => {
    const nodeId = getOrgNodeId(node);

    if (nodeId) {
      markSelectedOrgNode(orgChart, node);
      window.showOrgInfo(nodeId);
    }
  };

  orgChart.addEventListener("click", (event) => {
    const node = event.target.closest(".node");

    if (node) {
      activateNode(node);
    }
  });

  orgChart.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    const node = event.target.closest(".node");

    if (node) {
      event.preventDefault();
      activateNode(node);
    }
  });
};

const hydrateOrgChart = () => {
  if (!orgChart) {
    return;
  }

  attachOrgChartEvents();
  orgChart.querySelectorAll(".node").forEach((node) => {
    node.setAttribute("tabindex", "0");
    node.setAttribute("role", "button");
  });
  localizeOrgChartLabels(orgChart);
  fitOrgNodesToGermanBaseline(orgChart);
  widenPrimaryOrgNodes(orgChart);
  hideMermaidTooltips();
  addFsvvLogoToOrgNode(orgChart);
  shortenArrowEnds(orgChart);
  fitOrgSvgBounds(orgChart);
  orgChart.classList.add("is-ready");
};

const renderOrgChart = async () => {
  if (!orgChart || !currentLocale) {
    return;
  }

  const source = buildMermaidSource();
  orgChart.classList.remove("is-ready");
  orgChart.innerHTML = "";
  showDefaultOrgInfo();

  if (!window.mermaid || !mermaidIsReady) {
    orgChart.textContent = source;
    orgChart.classList.add("is-ready");
    return;
  }

  try {
    const renderId = `org-chart-${currentLang}-${Date.now()}`;
    const { svg } = await window.mermaid.render(renderId, source);
    orgChart.innerHTML = svg;
    hydrateOrgChart();
  } catch {
    orgChart.textContent = source;
    orgChart.classList.add("is-ready");
  }
};

const removeSelectedOrgBeavers = (chart) => {
  chart.querySelectorAll(".org-selected-beaver").forEach((beaver) => {
    beaver.remove();
  });
};

const positionSelectedOrgBeaver = (node) => {
  if (!node) {
    return;
  }

  const svg = node.closest("svg");
  const rootLayer = svg?.querySelector("g.root");
  const rect = node.querySelector("rect");

  if (!svg || !rootLayer || !rect) {
    return;
  }

  const x = Number(rect.getAttribute("x"));
  const y = Number(rect.getAttribute("y"));
  const width = Number(rect.getAttribute("width"));
  const matrix = node.transform?.baseVal?.consolidate()?.matrix;
  const offsetX = matrix?.e || 0;
  const offsetY = matrix?.f || 0;

  if (![x, y, width].every(Number.isFinite)) {
    return;
  }

  svg.querySelector(".org-selected-beaver")?.remove();

  const beaverWidth = Math.min(150, Math.max(118, width * 0.82));
  const beaverHeight = beaverWidth * (459 / 768);
  const beaver = document.createElementNS("http://www.w3.org/2000/svg", "image");

  beaver.setAttribute("href", "assets/beaver-top.png");
  beaver.setAttribute("x", (offsetX + x - 28).toFixed(3));
  beaver.setAttribute("y", (offsetY + y - beaverHeight + 16).toFixed(3));
  beaver.setAttribute("width", beaverWidth.toFixed(3));
  beaver.setAttribute("height", beaverHeight.toFixed(3));
  beaver.setAttribute("preserveAspectRatio", "xMinYMin meet");
  beaver.classList.add("org-selected-beaver");
  rootLayer.insertBefore(beaver, rootLayer.firstChild);
};

const markSelectedOrgNode = (chart, node) => {
  chart.querySelectorAll(".node.is-selected").forEach((selectedNode) => {
    selectedNode.classList.remove("is-selected");
  });

  removeSelectedOrgBeavers(chart);
  node.classList.add("is-selected");
  positionSelectedOrgBeaver(node);
};

const shortenArrowEnds = (chart) => {
  chart.querySelectorAll("path.flowchart-link").forEach((path) => {
    const commands = path.getAttribute("d")?.match(/[ML][^ML]+/g);

    if (!commands || commands.length < 2 || path.dataset.shortened === "true") {
      return;
    }

    const parsePoint = (command) => {
      const coords = command.slice(1).split(",").map(Number);
      return { command: command[0], x: coords[0], y: coords[1] };
    };

    const points = commands.map(parsePoint);
    const end = points.at(-1);
    const previous = points.at(-2);
    const dx = end.x - previous.x;
    const dy = end.y - previous.y;
    const length = Math.hypot(dx, dy);

    if (!length) {
      return;
    }

    const gap = 11;
    end.x -= (dx / length) * gap;
    end.y -= (dy / length) * gap;

    path.setAttribute(
      "d",
      points.map((point) => `${point.command}${point.x.toFixed(3)},${point.y.toFixed(3)}`).join(""),
    );
    path.dataset.shortened = "true";
  });
};

const fitOrgNodesToGermanBaseline = (chart) => {
  chart.querySelectorAll(".node").forEach((node) => {
    const nodeId = getOrgNodeId(node);
    const size = ORG_NODE_BASE_SIZES[nodeId];
    const rect = node.querySelector("rect");

    if (!size || !rect || rect.dataset.baselineFitted === "true") {
      return;
    }

    const currentWidth = Number(rect.getAttribute("width"));
    const currentHeight = Number(rect.getAttribute("height"));
    const currentX = Number(rect.getAttribute("x"));
    const currentY = Number(rect.getAttribute("y"));

    if (![currentWidth, currentHeight, currentX, currentY].every(Number.isFinite)) {
      return;
    }

    const nextWidth = Math.max(currentWidth, size.width);
    const nextHeight = Math.max(currentHeight, size.height);

    rect.setAttribute("width", nextWidth.toFixed(3));
    rect.setAttribute("height", nextHeight.toFixed(3));
    rect.setAttribute("x", (currentX - (nextWidth - currentWidth) / 2).toFixed(3));
    rect.setAttribute("y", (currentY - (nextHeight - currentHeight) / 2).toFixed(3));
    rect.dataset.baselineFitted = "true";

    const label = node.querySelector("g.label");
    const foreignObject = label?.querySelector("foreignObject");
    const labelBody = foreignObject?.querySelector("div");

    if (label && foreignObject) {
      const labelWidth = Math.max(Number(foreignObject.getAttribute("width")) || 0, nextWidth - 18);
      const labelHeight = Number(foreignObject.getAttribute("height")) || nextHeight - 24;
      foreignObject.setAttribute("width", labelWidth.toFixed(3));
      label.setAttribute("transform", `translate(${(-labelWidth / 2).toFixed(3)}, ${(-labelHeight / 2).toFixed(3)})`);

      if (labelBody) {
        labelBody.style.width = `${labelWidth}px`;
        labelBody.style.height = `${labelHeight}px`;
        labelBody.style.maxWidth = "none";
        labelBody.style.verticalAlign = "middle";
      }
    }
  });
};

const fitOrgSvgBounds = (chart) => {
  const svg = chart.querySelector("svg");
  const root = svg?.querySelector("g.root");

  if (!svg || !root || typeof root.getBBox !== "function") {
    return;
  }

  try {
    const box = root.getBBox();
    const padding = 18;

    svg.setAttribute(
      "viewBox",
      [
        box.x - padding,
        box.y - padding,
        box.width + padding * 2,
        box.height + padding * 2,
      ].map((value) => value.toFixed(3)).join(" "),
    );
  } catch {
    // Some browsers can throw while SVG fonts/images are still settling.
  }
};

const widenPrimaryOrgNodes = (chart) => {
  const shouldWiden = window.matchMedia("(max-width: 560px)").matches;

  chart.querySelectorAll(".node").forEach((node) => {
    const label = normalizeLabel(node.textContent);
    const rect = node.querySelector("rect");

    if (!rect || (!orgPrimaryLabels.has(label) && !orgPrimaryLabels.has(compactLabel(label)))) {
      return;
    }

    if (!rect.dataset.baseWidth || !rect.dataset.baseX) {
      rect.dataset.baseWidth = rect.getAttribute("width");
      rect.dataset.baseX = rect.getAttribute("x");
    }

    const baseWidth = Number(rect.dataset.baseWidth);
    const baseX = Number(rect.dataset.baseX);

    if (!Number.isFinite(baseWidth) || !Number.isFinite(baseX)) {
      return;
    }

    const extraWidth = shouldWiden ? Math.min(44, baseWidth * 0.2) : 0;
    rect.setAttribute("width", (baseWidth + extraWidth).toFixed(3));
    rect.setAttribute("x", (baseX - extraWidth / 2).toFixed(3));
  });
};

const addFsvvLogoToOrgNode = (chart) => {
  const fsvvNode = [...chart.querySelectorAll(".node")].find((node) =>
    getOrgNodeId(node) === "FSVV",
  );

  if (!fsvvNode || fsvvNode.dataset.logoAdded === "true") {
    return;
  }

  const rect = fsvvNode.querySelector("rect");

  if (!rect) {
    return;
  }

  const x = Number(rect.getAttribute("x"));
  const y = Number(rect.getAttribute("y"));
  const width = Number(rect.getAttribute("width"));
  const height = Number(rect.getAttribute("height"));

  if (![x, y, width, height].every(Number.isFinite)) {
    return;
  }

  const logoWidth = Math.min(74, width * 0.46);
  const logoHeight = logoWidth * (321 / 1065);
  const logo = document.createElementNS("http://www.w3.org/2000/svg", "image");

  logo.setAttribute("href", "assets/fsvv-logo.png");
  logo.setAttribute("x", (x + (width - logoWidth) / 2).toFixed(3));
  logo.setAttribute("y", (y + height - logoHeight - 5).toFixed(3));
  logo.setAttribute("width", logoWidth.toFixed(3));
  logo.setAttribute("height", logoHeight.toFixed(3));
  logo.setAttribute("preserveAspectRatio", "xMidYMid meet");
  logo.classList.add("org-node-logo");
  fsvvNode.appendChild(logo);
  fsvvNode.dataset.logoAdded = "true";
};

const positionStepArrows = () => {
  const flow = document.querySelector(".system-flow");
  const steps = [...document.querySelectorAll(".system-steps li")];
  const arrows = [...document.querySelectorAll(".step-arrow")];

  if (!flow || steps.length < 2 || arrows.length < 1) {
    return;
  }

  const flowTop = flow.getBoundingClientRect().top;

  arrows.forEach((arrow, index) => {
    const from = steps[index];
    const to = steps[index + 1];

    if (!from || !to) {
      return;
    }

    const fromRect = from.getBoundingClientRect();
    const toRect = to.getBoundingClientRect();
    const fromCenter = fromRect.top + fromRect.height / 2;
    const toCenter = toRect.top + toRect.height / 2;
    const top = fromCenter - flowTop - 4;
    const height = Math.max(42, toCenter - fromCenter + 8);

    arrow.style.top = `${top}px`;
    arrow.style.height = `${height}px`;
  });
};

const openFaqFromHash = (hash, shouldScroll = true) => {
  if (!hash || !hash.startsWith("#faq-")) {
    return;
  }

  const target = document.querySelector(hash);

  if (!(target instanceof HTMLDetailsElement)) {
    return;
  }

  document.querySelectorAll(".faq-list details").forEach((details) => {
    if (details !== target) {
      details.open = false;
    }
  });

  target.open = true;

  if (shouldScroll) {
    requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }
};

const setLanguage = async (lang) => {
  const nextLang = SUPPORTED_LANGS.includes(lang) ? lang : DEFAULT_LANG;
  const locale = await loadLocale(nextLang);

  localStorage.setItem("fsvv-language", nextLang);
  applyLocale(locale, nextLang);
  await renderOrgChart();
  positionStepArrows();
};

document.addEventListener("click", (event) => {
  const faqLink = event.target.closest('a[href^="#faq-"]');

  if (faqLink) {
    const hash = faqLink.getAttribute("href");

    if (hash) {
      event.preventDefault();
      history.pushState(null, "", hash);
      openFaqFromHash(hash);
    }

    return;
  }

  const languageButton = event.target.closest(".language-switch button[data-lang]");

  if (languageButton) {
    setLanguage(languageButton.dataset.lang).catch(console.error);
  }
});

window.addEventListener("resize", () => {
  positionStepArrows();

  if (orgChart) {
    widenPrimaryOrgNodes(orgChart);
    positionSelectedOrgBeaver(orgChart.querySelector(".node.is-selected"));
  }
});
window.addEventListener("load", positionStepArrows);
window.addEventListener("hashchange", () => openFaqFromHash(window.location.hash));
document.fonts?.ready.then(positionStepArrows);

const init = async () => {
  if (window.mermaid) {
    window.mermaid.initialize({
      startOnLoad: false,
      theme: "base",
      themeVariables: {
        background: "#ffffff",
        primaryColor: "#ffffff",
        primaryTextColor: "#10252b",
        primaryBorderColor: "#10252b",
        lineColor: "#10252b",
        secondaryColor: "#ffffff",
        tertiaryColor: "#ffffff",
        clusterBkg: "#ffffff",
        clusterBorder: "#10252b",
        fontFamily: "Barlow, Arial, Helvetica, sans-serif",
      },
      flowchart: {
        curve: "linear",
        nodeSpacing: 124,
        rankSpacing: 76,
      },
    });
    mermaidIsReady = true;
  }

  try {
    await setLanguage(getPreferredLanguage());
  } catch {
    const fallbackLocale = await loadLocale(DEFAULT_LANG);
    applyLocale(fallbackLocale, DEFAULT_LANG);
    await renderOrgChart();
  }

  openFaqFromHash(window.location.hash, false);
};

init().catch(console.error);

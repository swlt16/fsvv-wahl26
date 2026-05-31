const mailVote = document.querySelector("#mailVote");
const orgDetailKicker = document.querySelector("#orgDetailKicker");
const orgDetailTitle = document.querySelector("#orgDetailTitle");
const orgDetailText = document.querySelector("#orgDetailText");

const orgDetails = {
  Studierende: {
    kicker: "Basis",
    title: "Alle Studierende",
    text: "Alle Studierenden können Themen in ihre Fachschaften tragen, mitdiskutieren und so studentische Selbstverwaltung mitprägen.",
  },
  Fachschaften: {
    kicker: "Vertretung",
    title: "Fachschaften",
    text: "Bis zu zwei Delegierte pro Fachschaft kommen montags in die FSVV. Themen werden aus der FSVV zurück in die Fachschaften getragen und dort offen besprochen.",
  },
  FSVV: {
    kicker: "Zusammenhang",
    title: "FSVV",
    text: "Die FSVV ist unabhängig, basisdemokratisch und nicht parteipolitisch. Sie bündelt Perspektiven der Fachschaften und fasst gemeinsame Beschlüsse.",
  },
  StuRa: {
    kicker: "Gremium",
    title: "Studierendenrat",
    text: "Vertreter*innen im Studierendenrat sind an FSVV-Beschlüsse gebunden und stimmen dort so ab, wie es zuvor gemeinsam entschieden wurde.",
  },
  Senat: {
    kicker: "Universität",
    title: "Senat der Universität",
    text: "Auch im Senat sollen studentische Stimmen nachvollziehbar aus den Fachschaften und der FSVV kommen, statt losgelöst von der Basis zu entscheiden.",
  },
};

const orgLabelToId = {
  "Alle Studierende": "Studierende",
  AlleStudierende: "Studierende",
  Fachschaften: "Fachschaften",
  "Fachschaftenvollversammlung (FSVV)": "FSVV",
  "Fachschaftenvollversammlung(FSVV)": "FSVV",
  FSVV: "FSVV",
  Studierendenrat: "StuRa",
  "Senat der Universität": "Senat",
  SenatderUniversität: "Senat",
};

mailVote.addEventListener("click", () => {
  mailVote.classList.add("is-popped");
  window.setTimeout(() => mailVote.classList.remove("is-popped"), 220);
});

window.showOrgInfo = (nodeId) => {
  const detail = orgDetails[nodeId];

  if (!detail || !orgDetailKicker || !orgDetailTitle || !orgDetailText) {
    return;
  }

  orgDetailKicker.textContent = detail.kicker;
  orgDetailTitle.textContent = detail.title;
  orgDetailText.textContent = detail.text;
};

const hydrateOrgChart = () => {
  const orgChart = document.querySelector("#organigramm .org-chart");

  if (!orgChart || orgChart.dataset.clickable === "true") {
    hideMermaidTooltips();
    return;
  }

  orgChart.dataset.clickable = "true";

  const getNodeIdFromLabel = (label) => {
    const normalizedLabel = label.trim().replace(/\s+/g, " ");
    const compactLabel = normalizedLabel.replace(/\s/g, "");

    return orgLabelToId[normalizedLabel] || orgLabelToId[compactLabel];
  };

  const activateNode = (node) => {
    const nodeId = getNodeIdFromLabel(node.textContent);

    if (nodeId) {
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

  const makeNodesFocusable = () => {
    orgChart.querySelectorAll(".node").forEach((node) => {
      node.setAttribute("tabindex", "0");
      node.setAttribute("role", "button");
    });
  };

  makeNodesFocusable();
  hideMermaidTooltips();
  shortenArrowEnds(orgChart);
  orgChart.classList.add("is-ready");
  new MutationObserver(makeNodesFocusable).observe(orgChart, {
    childList: true,
    subtree: true,
  });
};

const hideMermaidTooltips = () => {
  document.querySelectorAll(".mermaidTooltip").forEach((tooltip) => {
    tooltip.style.setProperty("display", "none", "important");
  });
};

const shortenArrowEnds = (orgChart) => {
  orgChart.querySelectorAll("path.flowchart-link").forEach((path) => {
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

positionStepArrows();
window.addEventListener("resize", positionStepArrows);
window.addEventListener("load", positionStepArrows);
document.fonts?.ready.then(positionStepArrows);

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
      nodeSpacing: 48,
      rankSpacing: 58,
    },
  });

  window.mermaid
    .run({ querySelector: ".mermaid" })
    .then(hydrateOrgChart)
    .catch(hydrateOrgChart);
} else {
  hydrateOrgChart();
}

const mailVote = document.querySelector("#mailVote");
const orgDetailKicker = document.querySelector("#orgDetailKicker");
const orgDetailTitle = document.querySelector("#orgDetailTitle");
const orgDetailText = document.querySelector("#orgDetailText");

const orgDetails = {
  Studierende: {
    kicker: "Basis",
    title: "Alle Studierende",
    text: "Placeholder: Alle Studierenden sind die Grundlage der studentischen Selbstverwaltung und koennen sich in ihren Fachschaften einbringen.",
  },
  Fachschaften: {
    kicker: "Vertretung",
    title: "Fachschaften",
    text: "Placeholder: Die Fachschaften vertreten die Studierenden in den Studiengaengen und bringen Themen in die FSVV ein.",
  },
  FSVV: {
    kicker: "Zusammenhang",
    title: "Fachschaftenvollversammlung (FSVV)",
    text: "Placeholder: Die FSVV buendelt Perspektiven aus den Fachschaften und stimmt gemeinsame hochschulpolitische Positionen ab.",
  },
  StuRa: {
    kicker: "Gremium",
    title: "Studierendenrat",
    text: "Placeholder: Im Studierendenrat werden zentrale studentische Entscheidungen und politische Anliegen auf Universitaetsebene behandelt.",
  },
  Senat: {
    kicker: "Universitaet",
    title: "Senat der Universität",
    text: "Placeholder: Im Senat werden wichtige universitaere Fragen verhandelt; studentische Stimmen bringen dort Perspektiven aus dem Studium ein.",
  },
};

const orgLabelToId = {
  "Alle Studierende": "Studierende",
  Fachschaften: "Fachschaften",
  "Fachschaftenvollversammlung (FSVV)": "FSVV",
  FSVV: "FSVV",
  Studierendenrat: "StuRa",
  "Senat der Universität": "Senat",
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

  const activateNode = (node) => {
    const label = node.textContent.trim().replace(/\s+/g, " ");
    const nodeId = orgLabelToId[label];

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

const mailVote = document.querySelector("#mailVote");
const orgDetailKicker = document.querySelector("#orgDetailKicker");
const orgDetailTitle = document.querySelector("#orgDetailTitle");
const orgDetailText = document.querySelector("#orgDetailText");

const orgDetails = {
  Plenum: {
    kicker: "Zentrum",
    title: "FSVV-Plenum",
    text: "Placeholder: Das Plenum ist der Ort, an dem gemeinsame Positionen diskutiert und Entscheidungen basisdemokratisch getroffen werden.",
  },
  Koordination: {
    kicker: "Verbindung",
    title: "Koordination",
    text: "Placeholder: Die Koordination haelt Termine, Kommunikation und offene Aufgaben zusammen, damit Beschluesse praktisch werden.",
  },
  Fachschaften: {
    kicker: "Basis",
    title: "Fachschaften",
    text: "Placeholder: Die Fachschaften bringen Themen aus den Studiengaengen ein und tragen Informationen zurueck in ihre Faecher.",
  },
  Arbeitsgruppen: {
    kicker: "Praxis",
    title: "Arbeitsgruppen",
    text: "Placeholder: Arbeitsgruppen kuemmern sich um konkrete Themen wie Kampagnen, Veranstaltungen, Oeffentlichkeitsarbeit oder Hochschulpolitik.",
  },
  Campus: {
    kicker: "Ziel",
    title: "Campus & Studierende",
    text: "Placeholder: Am Ende soll die Arbeit auf dem Campus ankommen: sichtbar, nutzbar und offen fuer alle Studierenden.",
  },
};

const orgLabelToId = {
  "FSVV-Plenum": "Plenum",
  Koordination: "Koordination",
  Fachschaften: "Fachschaften",
  Arbeitsgruppen: "Arbeitsgruppen",
  "Campus & Studierende": "Campus",
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

document.addEventListener("DOMContentLoaded", hydrateOrgChart);
window.addEventListener("load", hydrateOrgChart);
window.setTimeout(hydrateOrgChart, 1000);
window.setTimeout(hideMermaidTooltips, 1600);

if (window.mermaid) {
  window.mermaid.initialize({
    startOnLoad: true,
    theme: "base",
    themeVariables: {
      background: "#ffffff",
      primaryColor: "#ffffff",
      primaryTextColor: "#10252b",
      primaryBorderColor: "#10252b",
      lineColor: "#10252b",
      secondaryColor: "#42a964",
      tertiaryColor: "#328eac",
      fontFamily: "Barlow, Arial, Helvetica, sans-serif",
    },
    flowchart: {
      curve: "basis",
      nodeSpacing: 48,
      rankSpacing: 58,
    },
  });
}

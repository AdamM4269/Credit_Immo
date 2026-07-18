const inputIds = [
  "prixBien",
  "apport",
  "tauxAnnuel",
  "dureeAnnees",
  "salaireMensuel",
  "charges",
  "taxeFonciere"
];

const outputs = {
  fraisNotaire: document.getElementById("fraisNotaire"),
  totalProjet: document.getElementById("totalProjet"),
  montantPret: document.getElementById("montantPret"),
  tauxMensuel: document.getElementById("tauxMensuel"),
  mensualites: document.getElementById("mensualites"),
  tauxEndettement: document.getElementById("tauxEndettement"),
  resteAVivre: document.getElementById("resteAVivre"),
  montantTotalRembourse: document.getElementById("montantTotalRembourse"),
  prixTotalPret: document.getElementById("prixTotalPret"),
  prixPretParMois: document.getElementById("prixPretParMois"),
  investissementParMois: document.getElementById("investissementParMois")
};

const debtBadge = document.getElementById("debtBadge");
const dureeInput = document.getElementById("dureeAnnees");
const tauxTooltipTrigger = document.getElementById("tauxTooltipTrigger");
const tauxTooltip = document.getElementById("tauxTooltip");
const chargesInput = document.getElementById("charges");
const openChargesModalBtn = document.getElementById("openChargesModal");
const closeChargesModalBtn = document.getElementById("closeChargesModal");
const addChargeItemBtn = document.getElementById("addChargeItem");
const chargesModal = document.getElementById("chargesModal");
const chargesItemsContainer = document.getElementById("chargesItems");
const chargesModalTotal = document.getElementById("chargesModalTotal");

const FORM_STORAGE_KEY = "creditImmoFormValues";
const CHARGES_STORAGE_KEY = "creditImmoChargesDetails";
const DEFAULT_CHARGES_TEMPLATE = [
  { label: "Electricite", amount: 70 },
  { label: "Eau", amount: 30 },
  { label: "Internet / Telephone", amount: 40 },
  { label: "Assurance habitation", amount: 25 },
  { label: "Charges de copropriete", amount: 60 },
  { label: "Abonnements divers", amount: 25 }
];

let chargesDetails = [];

const moneyFmt = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2
});

const pctFmt = new Intl.NumberFormat("fr-FR", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

function getNum(id) {
  const value = Number.parseFloat(document.getElementById(id).value);
  return Number.isFinite(value) ? value : 0;
}

function saveFormState() {
  const formValues = {};
  for (const id of inputIds) {
    formValues[id] = document.getElementById(id).value;
  }
  localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(formValues));
}

function loadFormState() {
  const raw = localStorage.getItem(FORM_STORAGE_KEY);
  if (!raw) {
    return;
  }

  try {
    const parsed = JSON.parse(raw);
    for (const id of inputIds) {
      if (Object.hasOwn(parsed, id)) {
        document.getElementById(id).value = parsed[id];
      }
    }
  } catch {
    localStorage.removeItem(FORM_STORAGE_KEY);
  }
}

function saveChargesDetails() {
  localStorage.setItem(CHARGES_STORAGE_KEY, JSON.stringify(chargesDetails));
}

function loadChargesDetails() {
  const raw = localStorage.getItem(CHARGES_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return null;
    }

    const sanitized = parsed
      .map((item) => {
        const label = typeof item?.label === "string" ? item.label : "Charge";
        const amount = Number.parseFloat(item?.amount);
        return {
          label,
          amount: Number.isFinite(amount) && amount >= 0 ? amount : 0
        };
      })
      .filter((item) => item.label.length > 0 || item.amount > 0);

    return sanitized.length > 0 ? sanitized : null;
  } catch {
    localStorage.removeItem(CHARGES_STORAGE_KEY);
    return null;
  }
}

function buildDefaultChargesDetails(totalTarget) {
  const baseTotal = DEFAULT_CHARGES_TEMPLATE.reduce((sum, item) => sum + item.amount, 0);
  if (baseTotal <= 0) {
    return [{ label: "Charge", amount: 0 }];
  }

  const normalizedTarget = Number.isFinite(totalTarget) && totalTarget > 0 ? totalTarget : baseTotal;
  const ratio = normalizedTarget / baseTotal;
  const scaled = DEFAULT_CHARGES_TEMPLATE.map((item) => ({
    label: item.label,
    amount: Number((item.amount * ratio).toFixed(2))
  }));

  const roundedTotal = scaled.reduce((sum, item) => sum + item.amount, 0);
  const diff = Number((normalizedTarget - roundedTotal).toFixed(2));
  if (scaled.length > 0 && diff !== 0) {
    scaled[scaled.length - 1].amount = Number((scaled[scaled.length - 1].amount + diff).toFixed(2));
  }

  return scaled;
}

function isLegacyChargesDetails(details) {
  if (!Array.isArray(details) || details.length !== 1) {
    return false;
  }

  const label = String(details[0].label || "").trim().toLowerCase();
  return label === "charges existantes" || label === "charge";
}

function setText(element, value) {
  element.textContent = value;
}

function getChargesDetailsSum() {
  return chargesDetails.reduce((sum, item) => sum + item.amount, 0);
}

function updateChargesFromDetails() {
  const total = getChargesDetailsSum();
  chargesInput.value = total.toFixed(2);
  chargesModalTotal.textContent = moneyFmt.format(total);
  saveChargesDetails();
  saveFormState();
  recompute();
}

function buildChargeItemRow(item, index) {
  const row = document.createElement("div");
  row.className = "charge-item";

  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.value = item.label;
  nameInput.placeholder = "Nom (eau, electricite, wifi...)";
  nameInput.addEventListener("input", (event) => {
    chargesDetails[index].label = event.target.value;
    saveChargesDetails();
  });

  const amountInput = document.createElement("input");
  amountInput.type = "number";
  amountInput.min = "0";
  amountInput.step = "0.01";
  amountInput.value = item.amount;
  amountInput.placeholder = "Montant";
  amountInput.addEventListener("input", (event) => {
    const parsed = Number.parseFloat(event.target.value);
    chargesDetails[index].amount = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
    updateChargesFromDetails();
  });

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "icon-btn";
  removeBtn.textContent = "x";
  removeBtn.setAttribute("aria-label", "Supprimer cette charge");
  removeBtn.addEventListener("click", () => {
    chargesDetails.splice(index, 1);
    if (chargesDetails.length === 0) {
      chargesDetails.push({ label: "Charge", amount: 0 });
    }
    renderChargesItems();
    updateChargesFromDetails();
  });

  row.appendChild(nameInput);
  row.appendChild(amountInput);
  row.appendChild(removeBtn);
  return row;
}

function renderChargesItems() {
  chargesItemsContainer.innerHTML = "";
  chargesDetails.forEach((item, index) => {
    const row = buildChargeItemRow(item, index);
    chargesItemsContainer.appendChild(row);
  });
}

function openChargesModal() {
  renderChargesItems();
  chargesModal.classList.add("visible");
  chargesModal.setAttribute("aria-hidden", "false");
}

function closeChargesModal() {
  chargesModal.classList.remove("visible");
  chargesModal.setAttribute("aria-hidden", "true");
  updateChargesFromDetails();
}

function initializeChargesDetails() {
  const storedDetails = loadChargesDetails();
  if (storedDetails) {
    if (isLegacyChargesDetails(storedDetails)) {
      chargesDetails = buildDefaultChargesDetails(storedDetails[0].amount);
    } else {
      chargesDetails = storedDetails;
    }
  } else {
    const currentCharges = getNum("charges");
    chargesDetails = buildDefaultChargesDetails(currentCharges);
  }
  updateChargesFromDetails();
}

function calculateMensualite(montantPret, tauxMensuel, dureeAnnees) {
  const n = 12 * dureeAnnees;
  if (n <= 0) {
    return 0;
  }
  if (tauxMensuel === 0) {
    return montantPret / n;
  }

  const factor = Math.pow(1 + tauxMensuel, n);
  return montantPret * ((tauxMensuel * factor) / (factor - 1));
}

function interpolateRate(duration, lowA, lowB, highA, highB, minDuration, maxDuration) {
  if (duration <= minDuration) {
    return { bas: lowA, haut: highA };
  }
  if (duration >= maxDuration) {
    return { bas: lowB, haut: highB };
  }

  const ratio = (duration - minDuration) / (maxDuration - minDuration);
  return {
    bas: lowA + (lowB - lowA) * ratio,
    haut: highA + (highB - highA) * ratio
  };
}

function getRatesForDuration(duration) {
  // Source exploitee: Meilleurtaux, juillet 2026.
  // 15 ans: bon 3.5 / excellent 3.0
  // 20 ans: bon 3.6 / excellent 3.1
  // 25 ans: bon 3.7 / excellent 3.2
  if (duration <= 15) {
    return interpolateRate(duration, 3.0, 3.0, 3.5, 3.5, 1, 15);
  }
  if (duration <= 20) {
    return interpolateRate(duration, 3.0, 3.1, 3.5, 3.6, 15, 20);
  }
  return interpolateRate(duration, 3.1, 3.2, 3.6, 3.7, 20, 25);
}

function updateRatesTooltip() {
  const duration = getNum("dureeAnnees");
  const rates = getRatesForDuration(duration);
  const supportedDurations = "7, 10, 15, 20 et 25 ans";
  tauxTooltip.innerHTML = `
    <div class="tooltip-title">Fourchette de taux pour ${duration || 0} ans</div>
    <div class="tooltip-rate"><span>Taux bas</span><strong>${rates.bas.toFixed(2).replace(".", ",")}%</strong></div>
    <div class="tooltip-rate"><span>Taux haut</span><strong>${rates.haut.toFixed(2).replace(".", ",")}%</strong></div>
    <small>Durees de pret prises en charge par ce tooltip: ${supportedDurations}.</small>
    <small>Reference: barometre Meilleurtaux, juillet 2026. Les autres durees sont estimees par interpolation.</small>
    <small><a href="https://www.meilleurtaux.com/credit-immobilier/barometre-des-taux.html" target="_blank" rel="noreferrer">Voir la source</a></small>
  `;
}

function recompute() {
  const prixBien = getNum("prixBien");
  const apport = getNum("apport");
  const tauxAnnuel = getNum("tauxAnnuel") / 100;
  const dureeAnnees = getNum("dureeAnnees");
  const salaireMensuel = getNum("salaireMensuel");
  const charges = getNum("charges");
  const taxeFonciereAnnuelle = getNum("taxeFonciere");
  const taxeFonciereMensuelle = taxeFonciereAnnuelle / 12;

  const fraisNotaire = 0.08 * prixBien;
  const totalProjet = prixBien + fraisNotaire;
  const montantPret = totalProjet - apport;
  const tauxMensuel = Math.pow(1 + tauxAnnuel, 1 / 12) - 1;
  const mensualites = calculateMensualite(montantPret, tauxMensuel, dureeAnnees);

  const tauxEndettement = salaireMensuel > 0 ? mensualites / salaireMensuel : 0;
  const resteAVivre = salaireMensuel - mensualites - charges - taxeFonciereMensuelle;

  const montantTotalRembourse = mensualites * 12 * dureeAnnees;

  // Respect du tableur source: prix total du pret = total rembourse - prix du bien.
  const prixTotalPret = montantTotalRembourse - prixBien;
  const prixPretParMois = dureeAnnees > 0 ? prixTotalPret / (12 * dureeAnnees) : 0;
  const investissementParMois = mensualites - prixPretParMois;

  setText(outputs.fraisNotaire, moneyFmt.format(fraisNotaire));
  setText(outputs.totalProjet, moneyFmt.format(totalProjet));
  setText(outputs.montantPret, moneyFmt.format(montantPret));
  setText(outputs.tauxMensuel, pctFmt.format(tauxMensuel));
  setText(outputs.mensualites, moneyFmt.format(mensualites));
  setText(outputs.tauxEndettement, pctFmt.format(tauxEndettement));
  setText(outputs.resteAVivre, moneyFmt.format(resteAVivre));
  setText(outputs.montantTotalRembourse, moneyFmt.format(montantTotalRembourse));
  setText(outputs.prixTotalPret, moneyFmt.format(prixTotalPret));
  setText(outputs.prixPretParMois, moneyFmt.format(prixPretParMois));
  setText(outputs.investissementParMois, moneyFmt.format(investissementParMois));

  if (tauxEndettement <= 0.35) {
    debtBadge.className = "badge ok";
    debtBadge.textContent = "Endettement OK";
  } else {
    debtBadge.className = "badge warn";
    debtBadge.textContent = "Endettement > 35%";
  }

  updateRatesTooltip();
}

for (const id of inputIds) {
  document.getElementById(id).addEventListener("input", () => {
    recompute();
    saveFormState();
  });
}

loadFormState();
recompute();
initializeChargesDetails();

function showRatesInfo() {
  updateRatesTooltip();
  tauxTooltip.classList.add("visible");
}

function hideRatesInfo() {
  tauxTooltip.classList.remove("visible");
}

tauxTooltipTrigger.addEventListener("mouseenter", showRatesInfo);
tauxTooltipTrigger.addEventListener("mouseleave", hideRatesInfo);
tauxTooltip.addEventListener("mouseenter", () => {
  tauxTooltip.classList.add("visible");
});
tauxTooltip.addEventListener("mouseleave", hideRatesInfo);
dureeInput.addEventListener("focus", updateRatesTooltip);

openChargesModalBtn.addEventListener("click", openChargesModal);
closeChargesModalBtn.addEventListener("click", closeChargesModal);
addChargeItemBtn.addEventListener("click", () => {
  chargesDetails.push({ label: "Nouvelle charge", amount: 0 });
  renderChargesItems();
});

chargesModal.addEventListener("click", (event) => {
  if (event.target === chargesModal) {
    closeChargesModal();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && chargesModal.classList.contains("visible")) {
    closeChargesModal();
  }
});
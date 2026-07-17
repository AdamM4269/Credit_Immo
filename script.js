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

function setText(element, value) {
  element.textContent = value;
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

function recompute() {
  const prixBien = getNum("prixBien");
  const apport = getNum("apport");
  const tauxAnnuel = getNum("tauxAnnuel") / 100;
  const dureeAnnees = getNum("dureeAnnees");
  const salaireMensuel = getNum("salaireMensuel");
  const charges = getNum("charges");
  const taxeFonciere = getNum("taxeFonciere");

  const fraisNotaire = 0.08 * prixBien;
  const totalProjet = prixBien + fraisNotaire;
  const montantPret = totalProjet - apport;
  const tauxMensuel = Math.pow(1 + tauxAnnuel, 1 / 12) - 1;
  const mensualites = calculateMensualite(montantPret, tauxMensuel, dureeAnnees);

  const tauxEndettement = salaireMensuel > 0 ? mensualites / salaireMensuel : 0;
  const resteAVivre = salaireMensuel - mensualites - charges - taxeFonciere;

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
}

for (const id of inputIds) {
  document.getElementById(id).addEventListener("input", recompute);
}

recompute();
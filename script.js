const rankValues = {
  A: 14,
  K: 13,
  Q: 12,
  J: 11,
  T: 10,
  9: 9,
  8: 8,
  7: 7,
  6: 6,
  5: 5,
  4: 4,
  3: 3,
  2: 2,
};

const rankDisplay = {
  A: "A",
  K: "K",
  Q: "Q",
  J: "J",
  T: "10",
  9: "9",
  8: "8",
  7: "7",
  6: "6",
  5: "5",
  4: "4",
  3: "3",
  2: "2",
};

function getHandLabel(rank1, suit1, rank2, suit2) {
  const value1 = rankValues[rank1];
  const value2 = rankValues[rank2];
  const high = value1 >= value2 ? rank1 : rank2;
  const low = value1 >= value2 ? rank2 : rank1;

  if (rank1 === rank2) return `${rankDisplay[rank1]}${rankDisplay[rank2]}`;
  return `${rankDisplay[high]}${rankDisplay[low]}${suit1 === suit2 ? "s" : "o"}`;
}

function evaluatePreflopHand(rank1, suit1, rank2, suit2) {
  const v1 = rankValues[rank1];
  const v2 = rankValues[rank2];
  const high = Math.max(v1, v2);
  const low = Math.min(v1, v2);
  const pair = rank1 === rank2;
  const suited = suit1 === suit2;
  const gap = Math.abs(v1 - v2);

  let score = 0;
  let tags = [];

  if (pair) {
    score += 38 + high * 3;
    tags.push("Pocket pair");
    if (high >= 11) tags.push("Premium pair");
  } else {
    score += high * 2.1 + low * 1.2;
    if (suited) {
      score += 8;
      tags.push("Suited");
    }
    if (gap === 1) {
      score += 7;
      tags.push("Connector");
    } else if (gap === 2) {
      score += 4;
      tags.push("One-gap connector");
    }
    if (high === 14 && low >= 10) {
      score += 12;
      tags.push("Broadway ace hand");
    }
    if (high >= 12 && low >= 10) {
      score += 8;
      tags.push("Broadway combination");
    }
  }

  score = Math.min(100, Math.round(score));

  let tier = "Weak hand";
  if (score >= 84) tier = "Premium hand";
  else if (score >= 68) tier = "Strong hand";
  else if (score >= 52) tier = "Playable hand";
  else if (score >= 38) tier = "Cautious hand";

  return { score, tier, tags };
}

function getPotOdds(pot, betSize) {
  if (!betSize || betSize <= 0) return null;
  const totalPotAfterCall = pot + betSize + betSize;
  return (betSize / totalPotAfterCall) * 100;
}

function recommendAction({ handScore, street, opponentAction, stack, pot, betSize, spr }) {
  let action = "Check";
  let risk = "Medium";
  let reason = "";
  let comment = "";

  const facingPressure = ["bet", "raise", "allin"].includes(opponentAction);
  const potOdds = getPotOdds(pot, betSize);

  if (street === "preflop") {
    if (handScore >= 84) {
      action = opponentAction === "allin" ? "Call / All-in" : "Raise";
      risk = "Low";
      reason = "This is a very strong pre-flop hand. Raising is a good way to take control of the pot.";
    } else if (handScore >= 68) {
      action = facingPressure ? "Call" : "Raise";
      risk = "Medium";
      reason = "This is a strong starting hand. If the opponent is not applying heavy pressure, an aggressive play can be reasonable.";
    } else if (handScore >= 52) {
      action = facingPressure ? "Call / Consider Fold" : "Call";
      risk = "Medium";
      reason = "This hand is playable, but it is not extremely strong. Be careful against large raises.";
    } else {
      action = facingPressure ? "Fold" : "Check / Fold";
      risk = "High";
      reason = "This is a weak pre-flop hand. It is usually better to avoid building a large pot.";
    }
  } else {
    if (handScore >= 80 && spr <= 3) {
      action = facingPressure ? "Call / All-in" : "Bet";
      risk = "Medium";
      reason = "The pot is large compared to your remaining stack. With a strong hand, committing chips can be reasonable.";
    } else if (handScore >= 68) {
      action = facingPressure ? "Call" : "Bet";
      risk = "Medium";
      reason = "Based on the entered information, an aggressive action is possible. However, since board cards are not included, you should still be careful.";
    } else if (handScore >= 52) {
      action = facingPressure ? "Fold / Consider Call" : "Check";
      risk = "Medium to High";
      reason = "This is a medium-strength hand. Against a large bet, pot control may be safer than forcing action.";
    } else {
      action = facingPressure ? "Fold" : "Check";
      risk = "High";
      reason = "Without a strong reason, building a large pot is risky. Checking or folding is usually safer.";
    }
  }

  if (opponentAction === "allin") {
    if (handScore >= 82 || spr < 2) {
      comment = "The opponent is all-in. If your hand is strong enough or you are already committed to the pot, calling can be considered.";
    } else {
      comment = "All-in is the strongest pressure action. Without a premium hand, folding is usually the safer choice.";
      action = handScore >= 70 ? action : "Fold";
      risk = "High";
    }
  } else if (potOdds !== null) {
    if (potOdds <= 25 && handScore >= 52) {
      comment = `The current pot odds are about ${potOdds.toFixed(1)}%. Since the call price is relatively low, calling can be reasonable.`;
    } else if (potOdds >= 38 && handScore < 70) {
      comment = `The current pot odds are about ${potOdds.toFixed(1)}%. This is expensive, so folding may be better with a marginal hand.`;
      if (facingPressure) action = "Fold";
    } else {
      comment = `The current pot odds are about ${potOdds.toFixed(1)}%. You should consider both hand strength and the opponent's tendency.`;
    }
  } else {
    comment = "No opponent bet size was entered, so pot odds were not calculated. In a check situation, seeing the next card for free can be valuable.";
  }

  return { action, risk, reason, comment };
}

function formatActionName(action) {
  const map = {
    check: "Check",
    call: "Call",
    bet: "Bet",
    raise: "Raise",
    allin: "All-in",
  };
  return map[action] || action;
}

function formatStreet(street) {
  const map = {
    preflop: "Pre-flop",
    flop: "Flop",
    turn: "Turn",
    river: "River",
  };
  return map[street] || street;
}

document.getElementById("pokerForm").addEventListener("submit", function (event) {
  event.preventDefault();

  const rank1 = document.getElementById("rank1").value;
  const suit1 = document.getElementById("suit1").value;
  const rank2 = document.getElementById("rank2").value;
  const suit2 = document.getElementById("suit2").value;
  const stack = Number(document.getElementById("stack").value);
  const pot = Number(document.getElementById("pot").value);
  const street = document.getElementById("street").value;
  const opponentAction = document.getElementById("opponentAction").value;
  const betSize = Number(document.getElementById("betSize").value || 0);

  if (rank1 === rank2 && suit1 === suit2) {
    alert("You cannot select the exact same card twice. Please choose a different suit.");
    return;
  }

  const hand = evaluatePreflopHand(rank1, suit1, rank2, suit2);
  const handLabel = getHandLabel(rank1, suit1, rank2, suit2);
  const spr = pot > 0 ? stack / pot : 0;
  const potOddsValue = getPotOdds(pot, betSize);

  const recommendation = recommendAction({
    handScore: hand.score,
    street,
    opponentAction,
    stack,
    pot,
    betSize,
    spr,
  });

  document.getElementById("emptyState").classList.add("hidden");
  document.getElementById("resultContent").classList.remove("hidden");

  document.getElementById("actionBadge").textContent = recommendation.action;
  document.getElementById("resultTitle").textContent = `${handLabel} → Recommended: ${recommendation.action}`;
  document.getElementById("resultReason").textContent = recommendation.reason;
  document.getElementById("handScore").textContent = `${hand.score}/100`;
  document.getElementById("sprValue").textContent = spr.toFixed(1);
  document.getElementById("potOdds").textContent = potOddsValue === null ? "-" : `${potOddsValue.toFixed(1)}%`;
  document.getElementById("riskLevel").textContent = recommendation.risk;

  const tagText = hand.tags.length ? hand.tags.join(", ") : "No special bonus factor";
  document.getElementById("commentBox").innerHTML = `
    <b>Current situation:</b> ${formatStreet(street)} / Opponent action: ${formatActionName(opponentAction)}<br />
    <b>Hand evaluation:</b> ${hand.tier} (${tagText})<br />
    <b>Extra comment:</b> ${recommendation.comment}
  `;
});

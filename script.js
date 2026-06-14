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
    tags.push("포켓 페어");
    if (high >= 11) tags.push("프리미엄 페어");
  } else {
    score += high * 2.1 + low * 1.2;
    if (suited) {
      score += 8;
      tags.push("수딧");
    }
    if (gap === 1) {
      score += 7;
      tags.push("커넥터");
    } else if (gap === 2) {
      score += 4;
      tags.push("원갭 커넥터");
    }
    if (high === 14 && low >= 10) {
      score += 12;
      tags.push("브로드웨이 A 핸드");
    }
    if (high >= 12 && low >= 10) {
      score += 8;
      tags.push("브로드웨이 조합");
    }
  }

  score = Math.min(100, Math.round(score));

  let tier = "약한 핸드";
  if (score >= 84) tier = "프리미엄 핸드";
  else if (score >= 68) tier = "강한 핸드";
  else if (score >= 52) tier = "플레이 가능한 핸드";
  else if (score >= 38) tier = "주의가 필요한 핸드";

  return { score, tier, tags };
}

function getPotOdds(pot, betSize) {
  if (!betSize || betSize <= 0) return null;
  const totalPotAfterCall = pot + betSize + betSize;
  return (betSize / totalPotAfterCall) * 100;
}

function recommendAction({ handScore, street, opponentAction, stack, pot, betSize, spr }) {
  let action = "Check";
  let risk = "중간";
  let reason = "";
  let comment = "";

  const facingPressure = ["bet", "raise", "allin"].includes(opponentAction);
  const potOdds = getPotOdds(pot, betSize);

  if (street === "preflop") {
    if (handScore >= 84) {
      action = opponentAction === "allin" ? "Call / All-in" : "Raise";
      risk = "낮음";
      reason = "프리플랍 기준 매우 강한 핸드입니다. 주도권을 잡기 위해 레이즈가 적절합니다.";
    } else if (handScore >= 68) {
      action = facingPressure ? "Call" : "Raise";
      risk = "중간";
      reason = "상위권 핸드에 속합니다. 상대가 강한 압박을 주지 않았다면 공격적으로 플레이할 수 있습니다.";
    } else if (handScore >= 52) {
      action = facingPressure ? "Call / Fold 고민" : "Call";
      risk = "중간";
      reason = "플레이는 가능하지만 절대적으로 강한 핸드는 아닙니다. 상대 레이즈가 크면 조심해야 합니다.";
    } else {
      action = facingPressure ? "Fold" : "Check / Fold";
      risk = "높음";
      reason = "프리플랍 기준 약한 핸드입니다. 큰 팟을 만들기보다 손실을 줄이는 방향이 좋습니다.";
    }
  } else {
    if (handScore >= 80 && spr <= 3) {
      action = facingPressure ? "Call / All-in" : "Bet";
      risk = "중간";
      reason = "스택 대비 팟이 큰 상황입니다. 강한 핸드라면 과감하게 승부를 볼 수 있습니다.";
    } else if (handScore >= 68) {
      action = facingPressure ? "Call" : "Bet";
      risk = "중간";
      reason = "현재 입력값만 기준으로는 공격적인 선택이 가능합니다. 다만 보드 카드 정보가 없기 때문에 신중한 판단이 필요합니다.";
    } else if (handScore >= 52) {
      action = facingPressure ? "Fold / Call 고민" : "Check";
      risk = "중간~높음";
      reason = "중간 강도의 핸드입니다. 상대의 큰 베팅에는 무리하게 따라가기보다 팟 컨트롤이 좋습니다.";
    } else {
      action = facingPressure ? "Fold" : "Check";
      risk = "높음";
      reason = "강한 근거 없이 큰 팟을 만드는 것은 위험합니다. 체크 또는 폴드가 더 안전합니다.";
    }
  }

  if (opponentAction === "allin") {
    if (handScore >= 82 || spr < 2) {
      comment = "상대가 올인한 상황입니다. 핸드가 충분히 강하거나 이미 팟에 많이 묶인 상황이라면 콜을 고려할 수 있습니다.";
    } else {
      comment = "올인은 가장 강한 압박 액션입니다. 프리미엄 핸드가 아니라면 폴드 쪽이 더 안정적입니다.";
      action = handScore >= 70 ? action : "Fold";
      risk = "높음";
    }
  } else if (potOdds !== null) {
    if (potOdds <= 25 && handScore >= 52) {
      comment = `현재 팟 오즈가 약 ${potOdds.toFixed(1)}%로 낮은 편입니다. 콜 비용이 크지 않다면 따라갈 명분이 있습니다.`;
    } else if (potOdds >= 38 && handScore < 70) {
      comment = `현재 팟 오즈가 약 ${potOdds.toFixed(1)}%로 부담이 큽니다. 애매한 핸드라면 폴드가 더 좋습니다.`;
      if (facingPressure) action = "Fold";
    } else {
      comment = `현재 팟 오즈는 약 ${potOdds.toFixed(1)}%입니다. 핸드 강도와 상대 성향을 함께 고려해야 합니다.`;
    }
  } else {
    comment = "상대 베팅 금액이 없으므로 팟 오즈는 계산하지 않았습니다. 체크 상황에서는 무료로 다음 카드를 볼 수 있는지가 중요합니다.";
  }

  return { action, risk, reason, comment };
}

function formatActionName(action) {
  const map = {
    check: "체크",
    call: "콜",
    bet: "베팅",
    raise: "레이즈",
    allin: "올인",
  };
  return map[action] || action;
}

function formatStreet(street) {
  const map = {
    preflop: "프리플랍",
    flop: "플랍",
    turn: "턴",
    river: "리버",
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
    alert("같은 카드를 두 번 선택할 수 없습니다. 무늬를 다르게 선택해주세요.");
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
  document.getElementById("resultTitle").textContent = `${handLabel} → ${recommendation.action} 추천`;
  document.getElementById("resultReason").textContent = recommendation.reason;
  document.getElementById("handScore").textContent = `${hand.score}/100`;
  document.getElementById("sprValue").textContent = spr.toFixed(1);
  document.getElementById("potOdds").textContent = potOddsValue === null ? "-" : `${potOddsValue.toFixed(1)}%`;
  document.getElementById("riskLevel").textContent = recommendation.risk;

  const tagText = hand.tags.length ? hand.tags.join(", ") : "특별한 보너스 요소 없음";
  document.getElementById("commentBox").innerHTML = `
    <b>현재 상황:</b> ${formatStreet(street)} / 상대 액션: ${formatActionName(opponentAction)}<br />
    <b>핸드 평가:</b> ${hand.tier} (${tagText})<br />
    <b>추가 코멘트:</b> ${recommendation.comment}
  `;
});

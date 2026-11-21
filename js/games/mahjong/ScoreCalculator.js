import { MahjongTile } from './MahjongTile.js';

/**
 * 麻雀の符計算・点数計算・半荘精算（オカ・ウマ）を行うクラス
 */
export class ScoreCalculator {
  static ceil100(n) {
    return Math.ceil(n / 100) * 100;
  }

  static calcFu({ decomp, allGroups, winType, isTsumo, isMenzen, seatWind, roundWind, isPinfu }) {
    if (isPinfu) {
      return isTsumo ? 20 : 30;
    }

    let fu = 20;
    if (isMenzen && !isTsumo) fu += 10;
    if (isTsumo) fu += 2;

    // Pair fu
    if (decomp.pair >= 31) fu += 2;
    if (decomp.pair === seatWind) fu += 2;
    if (decomp.pair === roundWind) fu += 2;

    // Wait fu (kanchan / penchan / tanki)
    let waitFu = 0;
    if (decomp.pair === winType) {
      waitFu = 2;
    } else {
      let hasOpenTwoSided = false;
      for (const m of decomp.melds) {
        if (m.type === 'shuntsu') {
          if (m.tile === winType && m.tile % 9 < 6) hasOpenTwoSided = true;
          if (m.tile + 2 === winType && m.tile % 9 > 0) hasOpenTwoSided = true;
        }
      }
      if (!hasOpenTwoSided) {
        for (const m of decomp.melds) {
          if (m.type === 'shuntsu') {
            if (m.tile + 1 === winType) waitFu = 2; // kanchan
            if ((m.tile === winType && m.tile % 9 === 6) || (m.tile + 2 === winType && m.tile % 9 === 0)) {
              waitFu = 2; // penchan
            }
          }
        }
      }
    }
    fu += waitFu;

    // Melds fu
    let ronTripletApplied = false;
    for (const g of allGroups) {
      if (g.type === 'shuntsu') continue;
      const isYao = MahjongTile.isYaochu(g.tile);
      let isOpenMeld = Boolean(g.open);
      if (!isOpenMeld && !isTsumo && !ronTripletApplied && g.type === 'koutsu' && g.tile === winType) {
        isOpenMeld = true;
        ronTripletApplied = true;
      }
      if (g.type === 'koutsu') {
        fu += (isOpenMeld ? 2 : 4) * (isYao ? 2 : 1);
      } else if (g.type === 'kantsu') {
        fu += (isOpenMeld ? 8 : 16) * (isYao ? 2 : 1);
      }
    }

    // Open pinfu-like 20-fu hand gets minimum 30 fu on ron
    if (!isMenzen && fu === 20) fu = 30;

    return Math.ceil(fu / 10) * 10;
  }

  static calcPayment({ han, fu, isYakuman, yakumanCount, isDealer, isTsumo, honba = 0, riichiSticks = 0 }) {
    let basicPoints;
    let rankName = '';

    if (isYakuman) {
      basicPoints = 8000 * Math.max(1, yakumanCount);
      rankName = yakumanCount >= 2 ? `${yakumanCount}倍役満` : '役満';
    } else if (han >= 13) {
      basicPoints = 8000;
      rankName = '数え役満';
    } else if (han >= 11) {
      basicPoints = 6000;
      rankName = '三倍満';
    } else if (han >= 8) {
      basicPoints = 4000;
      rankName = '倍満';
    } else if (han >= 6) {
      basicPoints = 3000;
      rankName = '跳満';
    } else if (han >= 5 || (han === 4 && fu >= 40) || (han === 3 && fu >= 70)) {
      basicPoints = 2000;
      rankName = '満貫';
    } else {
      basicPoints = fu * Math.pow(2, 2 + han);
      if (basicPoints >= 2000) {
        basicPoints = 2000;
        rankName = '満貫';
      }
    }

    const riichiBonus = riichiSticks * 1000;

    if (isTsumo) {
      if (isDealer) {
        const eachPay = ScoreCalculator.ceil100(basicPoints * 2) + honba * 100;
        return {
          rankName,
          total: eachPay * 3 + riichiBonus,
          dealerPay: eachPay,
          nonDealerPay: eachPay,
          ronPay: 0,
          label: `${eachPay}点オール`,
        };
      }
      const dealerPay = ScoreCalculator.ceil100(basicPoints * 2) + honba * 100;
      const nonDealerPay = ScoreCalculator.ceil100(basicPoints) + honba * 100;
      return {
        rankName,
        total: dealerPay + nonDealerPay * 2 + riichiBonus,
        dealerPay,
        nonDealerPay,
        ronPay: 0,
        label: `${nonDealerPay}/${dealerPay}点`,
      };
    }

    const ronPay = ScoreCalculator.ceil100(basicPoints * (isDealer ? 6 : 4)) + honba * 300;
    return {
      rankName,
      total: ronPay + riichiBonus,
      dealerPay: 0,
      nonDealerPay: 0,
      ronPay,
      label: `${ronPay}点`,
    };
  }

  /**
   * 半荘終了時の順位および精算スコア（30,000点返し・ウマ10-30）を計算
   */
  static calcFinalSettlement(players) {
    const uma = [30, 10, -10, -30];
    const sorted = [...players].sort((a, b) => b.score - a.score || a.initialSeat - b.initialSeat);
    const sumOthers = sorted
      .slice(1)
      .reduce((acc, p, idx) => acc + Math.round((p.score - 30000) / 100) / 10 + uma[idx + 1], 0);

    return sorted.map((p, idx) => {
      const pt =
        idx === 0
          ? Math.round(-sumOthers * 10) / 10
          : Math.round(((p.score - 30000) / 1000 + uma[idx]) * 10) / 10;
      return {
        rank: idx + 1,
        seat: p.seat,
        name: p.name,
        isHuman: p.isHuman,
        score: p.score,
        point: pt,
      };
    });
  }
}

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

function monthlyRateFromAnnual(annual) {
  return annual / 12;
}

function monthlyPayment(principal, monthlyRate, months) {
  if (months <= 0) throw new Error("months must be > 0");
  if (monthlyRate === 0) return round2(principal / months);
  const i = monthlyRate;
  const pow = Math.pow(1 + i, months);
  const fee = principal * (i * pow) / (pow - 1);
  return round2(fee);
}

function buildSchedule(principal, monthlyRate, months) {
  let balance = principal;
  const cuota = monthlyPayment(principal, monthlyRate, months);
  const rows = [];
  for (let m = 1; m <= months; m++) {
    const interes = monthlyRate === 0 ? 0 : balance * monthlyRate;
    let abono = cuota - interes;
    if (m === months) abono = balance; // ajuste final
    balance = balance - abono;
    rows.push({
      month: m,
      fee: round2(cuota),
      interest: round2(interes),
      capitalPayment: round2(abono),
      finalBalance: round2(Math.max(balance, 0))
    });
  }
  return rows;
}

module.exports = { round2, monthlyRateFromAnnual, monthlyPayment, buildSchedule };
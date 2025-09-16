const { monthlyRateFromAnnual, monthlyPayment, buildSchedule } = require("../src/domain/financial");

describe("financial", () => {
  it("monthly rate", () => {
    expect(monthlyRateFromAnnual(0.24)).toBeCloseTo(0.02, 5);
  });
  it("monthly payment i > 0", () => {
    const cuota = monthlyPayment(1000000, 0.02, 12);
    expect(cuota).toBeGreaterThan(0);
  });
  it("schedule length", () => {
    const s = buildSchedule(1000000, 0.02, 12);
    expect(s.length).toBe(12);
    expect(s[0]).toHaveSize(5);
  });
});

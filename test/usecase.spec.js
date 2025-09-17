const CalculateCapacityUseCase = require("../src/application/CalculateCapacityUseCase");
const { Decision } = require("../src/domain/enums/decision");
const { EventName } = require("../src/domain/enums/eventName");
const { EventVersion } = require("../src/domain/enums/eventVersion");

describe("CalculateCapacityUseCase", () => {
  it("aprueba cuando cuota <= capacidad disponible", async () => {
    const notificationPort = {
      publish: jasmine.createSpy("publish").and.resolveTo(),
    };
    const useCase = new CalculateCapacityUseCase({ notificationPort });

    const input = {
      eventName: EventName.LoanCapacityRequested,
      eventVersion: EventVersion.LoanCapacityRequestedVersion,
      loanId: "7332fc1e-456e-4916-928d-9c916313bee1",
      lockVersion: 3,
      applicant: { email: "freddy44@yopmail.com", baseSalary: 4_000_000 },
      newLoan: { amount: 10_000_000, interestRate: 0.24, termsInMonths: 24 },
      activeLoans: [],
      policies: { maximumIncomePercentage: 0.35, salaryManualReview: 5 },
    };

    const res = await useCase.execute(input);
    expect([Decision.APPROVED]).toContain(res.decision);
    expect(notificationPort.publish).toHaveBeenCalled();
  });

  it("rechaza cuando la cuota del nuevo préstamo supera la capacidad disponible", async () => {
    // Caso amount=45_000_000, term=60 baseSalary=3_500_000, rate=28.50 CONSUMER
    const notificationPort = {
      publish: jasmine.createSpy("publish").and.resolveTo(),
    };
    const useCase = new CalculateCapacityUseCase({ notificationPort });

    const input = {
      eventName: EventName.LoanCapacityRequested,
      eventVersion: EventVersion.LoanCapacityRequestedVersion,
      loanId: "b9a9c2e9-5e2f-4a3c-9d88-dc0d1d9a1111",
      lockVersion: 7,
      applicant: {
        email: "phoebe.goodwin59@yopmail.com",
        baseSalary: 3_500_000,
      },
      newLoan: { amount: 45_000_000, interestRate: 0.285, termsInMonths: 60 }, // 28.50 anual
      activeLoans: [],
      policies: { maximumIncomePercentage: 0.35, salaryManualReview: 5 },
    };

    const res = await useCase.execute(input);
    expect(res.decision).toBe(Decision.REJECTED);
    expect(notificationPort.publish).toHaveBeenCalled();
  });

  it("queda en revisión manual cuando aprueba pero el monto >= 5x salario", async () => {
    // Caso amount=45_000_000, term=60, baseSalary=6_000_000, rate=12.20 MORTGAGE
    // Capacidad max = 6_000_000 * 0.35 = 2_100_000
    // 12.20 anual a 60 meses_ la cuota estimada es < 2.1M => aprueba
    // 45_000_000 >= 5 * 6_000_000 => REVIEW_MANUAL
    const notificationPort = {
      publish: jasmine.createSpy("publish").and.resolveTo(),
    };
    const useCase = new CalculateCapacityUseCase({ notificationPort });

    const input = {
      eventName: EventName.LoanCapacityRequested,
      eventVersion: EventVersion.LoanCapacityRequestedVersion,
      loanId: "0f6d2a1b-6b78-4f67-9f1f-1a6f9f9e2222",
      lockVersion: 2,
      applicant: { email: "freddy44@yopmail.com", baseSalary: 6_000_000 },
      newLoan: { amount: 45_000_000, interestRate: 0.122, termsInMonths: 60 }, // 12.20 anual
      activeLoans: [],
      policies: { maximumIncomePercentage: 0.35, salaryManualReview: 5 }, // umbral/threshold = 5 * salario = 30M
    };

    const res = await useCase.execute(input);
    expect(res.decision).toBe(Decision.REVIEW_MANUAL);
    expect(notificationPort.publish).toHaveBeenCalled();
  });

  it("aprueba con créditos activos cuando la cuota del nuevo préstamo <= capacidad disponible", async () => {
    const notificationPort = {
      publish: jasmine.createSpy("publish").and.resolveTo(),
    };
    const useCase = new CalculateCapacityUseCase({ notificationPort });

    // Capacidad max = 6_000_000 * 0.35 = 2_100_000
    // Deuda mensual = 600k (2)
    // Capacidad = 1.5M
    // Nueva cuota = 575k -> APRUEBA y NO supera 5x salario
    const input = {
      eventName: EventName.LoanCapacityRequested,
      eventVersion: EventVersion.LoanCapacityRequestedVersion,
      loanId: "b9a9c2e9-5e2f-4a3c-9d88-dc0d1d9a1111",
      lockVersion: 5,
      applicant: { email: "user@example.com", baseSalary: 6_000_000 },
      newLoan: { amount: 20_000_000, interestRate: 0.24, termsInMonths: 60 },
      activeLoans: [
        { balance: 6_000_000, interestRate: 0.18, termsInMonths: 24 },
        { balance: 8_000_000, interestRate: 0.2, termsInMonths: 36 },
      ],
      policies: { maximumIncomePercentage: 0.35, salaryManualReview: 5 },
    };

    const res = await useCase.execute(input);
    expect(res.decision).toBe(Decision.APPROVED);
    expect(notificationPort.publish).toHaveBeenCalled();
  });

  it("rechaza cuando los créditos activos ya superan la capacidad máxima (capacidad disponible <= 0)", async () => {
    const notificationPort = {
      publish: jasmine.createSpy("publish").and.resolveTo(),
    };
    const useCase = new CalculateCapacityUseCase({ notificationPort });

    // Capacidad max = 3_500_000 * 0.35 = 1_225_000
    // Un prestamo activo 1.55M/mes
    // Capacidad disponible < 0 = RECHAZO.
    const input = {
      eventName: EventName.LoanCapacityRequested,
      eventVersion: EventVersion.LoanCapacityRequestedVersion,
      loanId: "b9a9c2e9-5e2f-4a3c-9d88-dc0d1d9a1111",
      lockVersion: 8,
      applicant: {
        email: "phoebe.goodwin59@yopmail.com",
        baseSalary: 3_500_000,
      },
      newLoan: { amount: 5_000_000, interestRate: 0.122, termsInMonths: 24 },
      activeLoans: [
        { balance: 50_000_000, interestRate: 0.285, termsInMonths: 60 },
      ],
      policies: { maximumIncomePercentage: 0.35, salaryManualReview: 5 },
    };

    const res = await useCase.execute(input);
    expect(res.decision).toBe(Decision.REJECTED);
    expect(notificationPort.publish).toHaveBeenCalled();
  });
});

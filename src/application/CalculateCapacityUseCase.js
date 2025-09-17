const { Decision } = require("../domain/enums/decision");
const { EventName } = require("../domain/enums/eventName");
const { EventVersion } = require("../domain/enums/eventVersion");
const logger = require("../infrastructure/logging/logger");

const {
  round2,
  monthlyRateFromAnnual,
  monthlyPayment,
  buildSchedule,
} = require("../domain/financial");

class CalculateCapacityUC {
  /**
   * @param {{ notificationPort: import("../ports/NotificationPort") }}
   */
  constructor({ notificationPort }) {
    this.notificationPort = notificationPort;
  }

  /**
   * Calculo y publica resultados:
   * - SNS: LoanCapacityCalculated (para result_automatic_queue)
   * - SNS: SolicitudDecision (para laon_request_queue)
   */
  async execute(input) {
    const { loanId, lockVersion, applicant, newLoan, activeLoans, policies } =
      input;
    const fields = { loanId };

    // Calculos
    const maximunCapacity = round2(
      applicant.baseSalary * policies.maximumIncomePercentage
    );

    const currentMonthlyDebt = round2(
      (activeLoans || []).reduce((acc, l) => {
        const i = monthlyRateFromAnnual(l.interestRate);
        return acc + monthlyPayment(l.balance, i, l.termsInMonths);
      }, 0)
    );

    const capacityAvailable = round2(maximunCapacity - currentMonthlyDebt);

    const monthlyRateNew = monthlyRateFromAnnual(newLoan.interestRate);
    const feeNew = monthlyPayment(
      newLoan.amount,
      monthlyRateNew,
      newLoan.termsInMonths
    );

    // Decision
    let decision = feeNew <= capacityAvailable ? Decision.APPROVED : Decision.REJECTED;
    let reason = null;
    const threshold = policies.salaryManualReview * applicant.baseSalary;
    if (decision === Decision.APPROVED && newLoan.amount >= threshold) {
      decision = Decision.REVIEW_MANUAL;
      reason = "Monto supera umbral de revisión manual";
    }

    logger.trace("calc done", {
      ...fields,
      capacidadMaxima: maximunCapacity,
      deudaMensualActual: currentMonthlyDebt,
      capacityAvailable,
      feeNew,
      decision,
    });

    // Publish result_automatic_queue -> Ms Loan Serivices
    await this.notificationPort.publish({
      eventName: EventName.LoanCapacityCalculated,
      payload: {
        eventName: EventName.LoanCapacityCalculatedEvent,
        eventVersion: EventVersion.LoanCapacityCalculatedEventVersion,
        loanId,
        lockVersion,
        capacidadMaxima: maximunCapacity,
        deudaMensualActual: currentMonthlyDebt,
        capacityAvailable,
        cuotaPrestamoNuevo: feeNew,
        decision,
        reason,
        calculatedAt: new Date().toISOString(),
      },
    });

    // Publish laon_request_queue -> Correo
    await this.notificationPort.publish({
      eventName: EventName.LoanDecision,
      payload: {
        eventName: EventName.LoanDecisionEvent,
        eventVersion: EventVersion.LoanDecisionEventVersion,
        loanId,
        email: applicant.email,
        decision,
        reason,
        createdAt: new Date().toISOString(),
        payload: {
          loanId,
          decision,
          maximunCapacity,
          currentMonthlyDebt,
          capacityAvailable,
          feeNew,
          schedule: buildSchedule(
            newLoan.amount,
            monthlyRateNew,
            newLoan.termsInMonths
          ),
        },
      },
    });

    return {
      decision,
      reason,
      maximunCapacity,
      currentMonthlyDebt,
      capacityAvailable,
      feeNew,
    };
  }
}

module.exports = CalculateCapacityUC;

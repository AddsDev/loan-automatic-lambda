const EventName = Object.freeze({
  LoanCapacityRequested: "LoanCapacityRequested",
  LoanCapacityCalculated: "LoanCapacityCalculated",
  LoanCapacityCalculatedEvent: "LoanCapacityCalculated.register",
  LoanDecision: "LoanDecision",
  LoanDecisionEvent: "LoanDecision.register"
})

module.exports = { EventName }

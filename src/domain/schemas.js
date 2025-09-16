const Ajv = require("ajv")
const ajv = new Ajv({ allErrors: true, removeAdditional: true })
const addFormats = require("ajv-formats")

addFormats(ajv)

const requestSchema = {
  type: "object",
  required: ["eventName","eventVersion","loanId","lockVersion","applicant","newLoan","activeLoans","policies"],
  additionalProperties: false,
  properties: {
    eventName: { type: "string" },
    eventVersion: { type: "integer", minimum: 1 },
    loanId: { type: "string", format: "uuid" },
    lockVersion: { type: "integer", minimum: 0 },
    applicant: {
      type: "object",
      required: ["email","baseSalary"],
      properties: {
        email: { type: "string", format: "email" },
        baseSalary: { type: "number", minimum: 0 }
      }
    },
    newLoan: {
      type: "object",
      required: ["amount","interestRate","termsInMonths"],
      properties: {
        amount: { type: "number", minimum: 1 },
        interestRate: { type: "number", minimum: 0 },
        termsInMonths: { type: "integer", minimum: 1 }
      }
    },
    activeLoans: {
      type: "array",
      items: {
        type: "object",
        required: ["balance","interestRate","termsInMonths"],
        properties: {
          balance: { type: "number", minimum: 0 },
          interestRate: { type: "number", minimum: 0 },
          termsInMonths: { type: "integer", minimum: 1 }
        }
      }
    },
    policies: {
      type: "object",
      required: ["maximumIncomePercentage","salaryManualReview"],
      properties: {
        maximumIncomePercentage: { type: "number", minimum: 0, maximum: 1 },
        salaryManualReview: { type: "number", minimum: 1 }
      }
    },
    createdAt: { type: "string" }
  }
};

const validateRequest = ajv.compile(requestSchema)
module.exports = { validateRequest }

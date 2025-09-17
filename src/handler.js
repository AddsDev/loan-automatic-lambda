const { validateRequest } = require("./domain/schemas")
const { ErrorFlag } = require("./domain/errors/errorFlag")
const CalculateCapacityUseCase = require("./application/CalculateCapacityUseCase")
const SNSAdapter = require("./infrastructure/sns/SNSAdapter")
const logger = require("./infrastructure/logging/logger")


const REGION = process.env.AWS_REGION || "us-east-1"
const SNS_TOPIC_ARN = process.env.SNS_TOPIC_ARN

const notificationPort = new SNSAdapter({ region: REGION, topicArn: SNS_TOPIC_ARN })
const useCase = new CalculateCapacityUseCase({ notificationPort })

exports.handler = async (event) => {
  const failures = []
  logger.info("lambda start", { records: event?.Records?.length || 0 })

  await Promise.all((event.Records || []).map(async (rec) => {
    const id = rec.messageId
    try {
      const payload = JSON.parse(rec.body)
      if (!validateRequest(payload)) {
        logger.warn("invalid payload", { id, errors: validateRequest.errors })
        throw new Error(ErrorFlag.INVALID_PAYLOAD);
      }
      await useCase.execute(payload)
    } catch (e) {
      logger.error("record failed", { id, err: e?.message || String(e) })
      failures.push({ itemIdentifier: id });
    }
  }))

  logger.info("lambda end", { failures: failures.length })
  return { batchItemFailures: failures }
};

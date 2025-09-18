const { SNSClient, PublishCommand } = require("@aws-sdk/client-sns")
const logger = require("../logging/logger")
const NotificationPort = require("../../ports/NotificationPort")

class SNSAdapter extends NotificationPort {
  constructor({ region, topicArn }) {
    this.client = new SNSClient({ region });
    this.topicArn = topicArn;
  }
  
  async publish({ eventName, payload }) {
    const message = JSON.stringify(payload);
    const messageAttributes = {
      eventName: { DataType: "String", StringValue: eventName },
    };
    logger.trace("sns publish", { message, eventName });
    const cmd = new PublishCommand({
      TopicArn: this.topicArn,
      Message: message,
      MessageAttributes: messageAttributes,
    });
    const res = await this.client.send(cmd);
    logger.trace("sns publish ok", { messageId: res?.MessageId, eventName });
  }
}

module.exports = SNSAdapter;

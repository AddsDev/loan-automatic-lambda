class NotificationPort {
  /**
   * @param {{eventName:string, payload:object}} message
   */
  async publish(message) {
    throw new Error("Not implemented");
  }
}
module.exports = NotificationPort;

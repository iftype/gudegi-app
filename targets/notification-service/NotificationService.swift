import UserNotifications

final class NotificationService: UNNotificationServiceExtension {
  private var contentHandler: ((UNNotificationContent) -> Void)?
  private var bestAttemptContent: UNMutableNotificationContent?

  override func didReceive(
    _ request: UNNotificationRequest,
    withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void
  ) {
    self.contentHandler = contentHandler
    bestAttemptContent = request.content.mutableCopy() as? UNMutableNotificationContent

    guard let content = bestAttemptContent,
      let body = request.content.userInfo["body"] as? [String: Any],
      let richContent = body["_richContent"] as? [String: Any],
      let imageURLString = richContent["image"] as? String,
      let imageURL = URL(string: imageURLString)
    else {
      contentHandler(bestAttemptContent ?? request.content)
      return
    }

    URLSession.shared.downloadTask(with: imageURL) { temporaryURL, response, _ in
      guard let temporaryURL,
        let suggestedFilename = response?.suggestedFilename
      else {
        contentHandler(content)
        return
      }

      let targetURL = URL(fileURLWithPath: NSTemporaryDirectory())
        .appendingPathComponent(suggestedFilename)
      try? FileManager.default.removeItem(at: targetURL)

      do {
        try FileManager.default.moveItem(at: temporaryURL, to: targetURL)
        content.attachments = [try UNNotificationAttachment(
          identifier: "streamer-profile",
          url: targetURL,
          options: nil
        )]
      } catch {
        // The original notification is still delivered if its image cannot be downloaded.
      }

      contentHandler(content)
    }.resume()
  }

  override func serviceExtensionTimeWillExpire() {
    guard let contentHandler, let bestAttemptContent else { return }
    contentHandler(bestAttemptContent)
  }
}

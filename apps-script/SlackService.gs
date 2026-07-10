function sendSlackMessage_(message) {
  const url = PropertiesService.getScriptProperties().getProperty(CONFIG.SLACK_WEBHOOK_URL_PROPERTY);
  if (!url) throw new Error('Missing Slack webhook property');

  const response = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ text: message }),
    muteHttpExceptions: true,
  });

  if (response.getResponseCode() >= 300) {
    throw new Error('Slack error: ' + response.getResponseCode() + ' ' + response.getContentText());
  }
}

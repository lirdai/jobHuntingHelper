chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

chrome.action.onClicked.addListener((tab) => {
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["content.js"],
  });
});

chrome.webRequest.onCompleted.addListener(
  (details) => {
    chrome.runtime.sendMessage(null, {
      action: "Job API Completed",
      url: details.url,
    });
  },
  {
    urls: [
      "*://ca.indeed.com/*",
      "*://www.linkedin.com/voyager/api/jobs/*",
      "*://api.monster.io/*",
    ],
  },
);

chrome.webNavigation.onHistoryStateUpdated.addListener(
  (details) => {
    chrome.runtime.sendMessage(null, {
      action: "Job API Completed",
      url: details.url,
    });
  },
  {
    url: [{ hostEquals: "www.linkedin.com", pathPrefix: "/jobs/search/" }],
  },
);

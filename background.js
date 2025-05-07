chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

chrome.action.onClicked.addListener((tab) => {
  console.log("Extension icon was clicked");

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["content.js"],
  });
});

chrome.webRequest.onCompleted.addListener(
  (details) => {
    console.log("✅ Job-related API call completed:", details.url);

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

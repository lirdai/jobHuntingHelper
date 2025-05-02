chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

chrome.action.onClicked.addListener((tab) => {
  console.log("Extension icon was clicked");

  // 向当前页面注入 content script (如果还没注入)
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["content.js"],
  });
});

chrome.webRequest.onCompleted.addListener(
  (details) => {
    console.log("✅ Job-related API call completed:", details.url);

    // 发送消息更新页面
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
    ], // 你可以匹配更具体的路径
  },
);

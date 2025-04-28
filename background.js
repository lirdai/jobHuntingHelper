chrome.action.onClicked.addListener((tab) => {
    console.log("Extension icon was clicked");

    // 向当前页面注入 content script (如果还没注入)
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
    });

    // 给 content.js 发送消息，让它打开 panel
    chrome.tabs.sendMessage(tab.id, { action: "open_panel" });
});
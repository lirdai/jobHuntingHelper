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

chrome.webRequest.onCompleted.addListener((details) => {
        console.log("✅ Job-related API call completed:", details.url);

        chrome.tabs.sendMessage(details.tabId, {
            action: "Website has been updated!",
            url: details.url,
        });
    },
    {
        urls: ["*://ca.indeed.com/*"], // 你可以匹配更具体的路径
    }
);

// chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
//     // read changeInfo data and do something with it
//     // like send the new url to contentscripts.js
//     if (changeInfo.status === 'complete') {
//         // 网页加载完了，通知 content script
//         chrome.tabs.sendMessage(tabId, {
//             message: 'Website has been updated!',
//             url: changeInfo.url
//         })
//     }
// }
// );
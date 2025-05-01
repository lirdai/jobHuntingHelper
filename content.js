function findTargetElements(key, selectors, keywords) {
    let selectorCollections = [];
    const results = {};

    for (let selector of selectors) {
        const elements = document.querySelectorAll(selector);
        selectorCollections.push(...elements); // 展开 NodeList 并加入数组
    }

    selectorCollections.forEach(selector => {
        const className = selector.className || '';
        const dataTestId = selector.getAttribute('data-testid') || '';

        for (const keyword of keywords) {
            if (className.includes(keyword) || dataTestId.includes(keyword)) {
                results[key] = {
                    element: selector,
                    className,
                    dataTestId,
                    innerText: selector.innerText
                }
                break; // 找到一个匹配关键词就跳出当前div检查
            }
        }
    });

    return results;
}


function collectInfoForPanel() {
    let matches = {};

    const keywords = {
        company: ["companyName", "job-details-jobs-unified-top-card__company-name", "header-style__JobViewHeaderCompanyName"],
        position: ['jobsearch-JobInfoHeader-title', "job-details-jobs-unified-top-card__job-title", "jobTitle"],
        companyDesc: ["jobsearch-JobComponent-description", "jobs-description__content", "DescriptionContainerOuter"],
    };

    const selectors = {
        company: ["div", "li"],
        position: ["h2", "div"],
        companyDesc: ["div"],
    };

    for (const key of Object.keys(keywords)) {
        matches = {
            ...matches,
            ...findTargetElements(key, selectors[key], keywords[key]),
        };
    }

    return matches;
};


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const isPanelClosed = localStorage.getItem("panelClosed");
    const matches = collectInfoForPanel();

    if (message.action === "open_panel") {
        console.log(message.action);
        localStorage.setItem("panelClosed", "false");
        createSidePanel(matches); // 调用创建面板的函数
    }

    if (message.action === 'Website has been updated!') {
        console.log(message.action);
        if (isPanelClosed !== "true") {
            updateSidePanel(matches);
        }
    }
});


function createSidePanel(matches) {
    if (document.getElementById("my-extension-panel")) return;

    const panel = document.createElement("div");
    panel.id = "my-extension-panel";
    panel.style.position = "fixed";
    panel.style.top = "50px";
    panel.style.right = "0";
    panel.style.width = "400px";
    panel.style.height = "100%";
    panel.style.background = "#ffffff";
    panel.style.boxShadow = "0 0 10px rgba(0,0,0,0.5)";
    panel.style.zIndex = "9999";
    panel.style.padding = "25px";
    panel.style.overflowY = "auto";
    panel.style.fontFamily = "Arial, sans-serif";
    panel.style.borderRadius = "10px 0 0 10px";

    panel.innerHTML = `
        <div id="title">
            <h3>Fill in the information</h3>
            <button id="closePanel">✘</button>
        </div>

        <label>Company</label>
        <input type="text" id="company" value="${matches?.company?.innerText || ""}" />

        <label>Position</label>
        <input type="text" id="position" value="${matches?.position?.innerText || ""}" />

        <label>Company Description</label>
        <textarea id="companyDesc" />${matches?.companyDesc?.innerText || ""}</textarea>

        <button id="createResume">✔</button>
    `;

    document.body.appendChild(panel);

    const title = document.getElementById("title");
    title.style.display = "flex";
    title.style.justifyContent = 'space-between';
    title.style.marginBottom = "30px"; // 相当于 <br/><br/>

    const closePanelButton = document.getElementById("closePanel");
    closePanelButton.style.fontSize = '30px';
    closePanelButton.style.color = 'red';
    closePanelButton.style.fontWeight = 'bold';

    const companyInput = document.getElementById("company");
    companyInput.style.width = "90%";
    companyInput.style.height = "50px";
    companyInput.style.borderRadius = "6px 6px 6px 6px";
    companyInput.style.marginBottom = "30px"; // 相当于 <br/><br/>
    companyInput.style.marginTop = "5px"; // 相当于 <br/><br/>

    const positionInput = document.getElementById("position");
    positionInput.style.width = "90%";
    positionInput.style.height = "50px";
    positionInput.style.borderRadius = "6px 6px 6px 6px";
    positionInput.style.marginBottom = "30px"; // 相当于 <br/><br/>
    positionInput.style.marginTop = "5px"; // 相当于 <br/><br/>

    const companyDescInput = document.getElementById("companyDesc");
    companyDescInput.style.width = "90%";
    companyDescInput.style.height = "250px";
    companyDescInput.style.resize = 'none';
    companyDescInput.style.borderRadius = "6px 6px 6px 6px";
    companyDescInput.style.marginBottom = "30px"; // 相当于 <br/><br/>
    companyDescInput.style.marginTop = "5px"; // 相当于 <br/><br/>

    const createResumeButton = document.getElementById("createResume");
    createResumeButton.style.display = "block";
    createResumeButton.style.marginTop = "15px"; // 相当于 <br/><br/>
    createResumeButton.style.marginBottom = "15px"; // 相当于 <br/><br/>
    createResumeButton.style.marginLeft = "auto";
    createResumeButton.style.fontSize = '30px';
    createResumeButton.style.color = 'green';
    createResumeButton.style.fontWeight = 'bold';

    document.getElementById("company").addEventListener("change", (e) => {
        console.log("Company field updated:", e.target.value);
    });

    document.getElementById("position").addEventListener("change", (e) => {
        console.log("Position field updated:", e.target.value);
    });

    document.getElementById("companyDesc").addEventListener("change", (e) => {
        console.log("Company description updated:", e.target.value);
    });

    document.getElementById("closePanel").addEventListener("click", () => {
        panel.remove();
        localStorage.setItem("panelClosed", "true");
    });
}


function updateSidePanel(matches) {
    if (!document.getElementById("my-extension-panel")) {
        createSidePanel(matches);
        return;
    }

    document.getElementById("company").value = matches.company?.innerText || "";
    document.getElementById("position").value = matches.position?.innerText || "";
    document.getElementById("companyDesc").value = matches.companyDesc?.innerText || "";
}
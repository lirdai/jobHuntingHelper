chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "open_panel") {
        console.log("Received open_panel message!");
        createSidePanel("");
    }
});

function createSidePanel() {
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
        <input type="text" id="company" />

        <label>Position</label>
        <input type="text" id="position" />

        <label>Company Description</label>
        <textarea id="companyDesc" /></textarea>

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
    });
}
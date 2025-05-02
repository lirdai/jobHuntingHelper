document.getElementById("company").addEventListener("change", (e) => {
    console.log("Company field updated:", e.target.value);
});

document.getElementById("position").addEventListener("change", (e) => {
    console.log("Position field updated:", e.target.value);
});

document.getElementById("companyDesc").addEventListener("change", (e) => {
    console.log("Company description updated:", e.target.value);
});


document.getElementById('fileInput').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    console.log(file);

    if (file.name.endsWith('.pdf')) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdfjs/pdf.worker.mjs';
        pdfjsLib.getDocument(file);

        const reader = new FileReader();
        reader.onload = async () => {
            const typedarray = new Uint8Array(reader.result);
            const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
            console.log(pdf, pdf.numPages);
            const pages = await Promise.all(
                Array.from(Array(pdf.numPages))
                    .map((_, i) => pdf.getPage(i + 1))
            )
            const texts = await Promise.all(pages.map((page) => page.getTextContent()));
            const fullText = texts.map((text) => text.items.map((t) => t.str).join("\n")).join("\n");
            console.log("fullText", fullText);
        };

        reader.readAsArrayBuffer(file); // ✅ 读取为二进制缓冲
    } else if (file.name.endsWith('.docx')) {

    }
});


function updateSidePanel(matches) {
    if (!document.getElementById("my-extension-panel")) {
        return;
    }

    document.getElementById("company").value = matches.company?.innerText || "";
    document.getElementById("position").value = matches.position?.innerText || "";
    document.getElementById("companyDesc").value = matches.companyDesc?.innerText || "";
};


chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.tabs.sendMessage(tabs[0].id, { action: "request job info" }, (matches) => {
        updateSidePanel(matches);
    });
});


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'Job API Completed') {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            chrome.tabs.sendMessage(tabs[0].id, { action: "request job info" }, (matches) => {
                updateSidePanel(matches);
            });
        });
    }
});
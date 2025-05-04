/*global pdfjsLib, mammoth, docx */
let resume;
let resumeDocx;
let fonts = {};
const { Document, Packer, Paragraph, TextRun } = docx;

function generatePDF(data) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "pt", putOnlyUsedFonts: true, compress: true });
  const pdfHeight = 842;

  data.items.forEach((item) => {
    const text = item.str;
    const x = item.transform[4];
    const y = pdfHeight - item.transform[5];
    const fontSize = item.height;

    doc.setFontSize(fontSize);
    let fontName = fonts[item.fontName].name,
      fontStyle = fonts[item.fontName].style;
    fontName = fontName.substring(fontName.indexOf("+") + 1);
    doc.setFont(fontName, fontStyle);
    doc.text(text, x, y);
  });

  doc.save("Resume.pdf");
}

const generateWord = async () => {
  // 创建一个 Word 文档
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            children: [
              new TextRun("Hello, world!"),
              new TextRun({
                text: " This is a Word document generated using docx library.",
                bold: true,
              }),
            ],
          }),
        ],
      },
    ],
  });

  // 将文档打包并触发下载
  Packer.toBlob(doc).then((blob) => {
    console.log(blob);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "resume.docx";
    a.click();
    URL.revokeObjectURL(url);
  });
};

document.getElementById("company").addEventListener("change", (e) => {
  console.log("Company field updated:", e.target.value);
});

document.getElementById("position").addEventListener("change", (e) => {
  console.log("Position field updated:", e.target.value);
});

document.getElementById("companyDesc").addEventListener("change", (e) => {
  console.log("Company description updated:", e.target.value);
});

document.getElementById("createResume").addEventListener("click", (e) => {
  console.log("createResume", e.target.value);
  // generatePDF(resume);
  generateWord(resumeDocx);
});

const getFontStyle = (name) => {
  if (!name) return "normal";
  if (name.toLowerCase().includes("bold")) return "bold";
  if (name.toLowerCase().includes("italic")) return "italic";
  return "normal";
};

document
  .getElementById("fileInput")
  .addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    console.log(file);

    if (file.name.endsWith(".pdf")) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = "libs/pdf.worker.mjs";
      pdfjsLib.getDocument(file);

      const reader = new FileReader();
      reader.onload = async () => {
        const typedarray = new Uint8Array(reader.result);
        const pdf = await pdfjsLib.getDocument({
          data: typedarray,
        }).promise;
        const pages = await Promise.all(
          Array.from(Array(pdf.numPages)).map((_, i) => pdf.getPage(i + 1)),
        );

        const texts = await Promise.all(
          pages.map((page) => page.getTextContent()),
        );

        const opList = await pages[0].getOperatorList();
        opList.argsArray.forEach((args, idx) => {
          if (opList.fnArray[idx] === pdfjsLib.OPS.setFont) {
            const [fontRef] = args;
            const fontObj = pages[0].commonObjs.get(fontRef);
            fonts[fontObj.loadedName] = {
              ...fontObj,
              style: getFontStyle(fontObj.name),
            };
          }
        });

        const fullText = texts
          .map((text) => text.items.map((t) => t.str).join("\n"))
          .join("\n");

        console.log("fullText", fullText);
        resume = texts[0];
      };

      reader.readAsArrayBuffer(file);
    } else if (file.name.endsWith(".docx")) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const arrayBuffer = event.target.result;

        const result = await mammoth.extractRawText({
          arrayBuffer: arrayBuffer,
        });
        const fullText = result.value;

        console.log("fullText", fullText);
        resumeDocx = fullText;
      };

      reader.readAsArrayBuffer(file);
    }
  });

function updateSidePanel(matches) {
  if (!document.getElementById("my-extension-panel")) {
    return;
  }

  document.getElementById("company").value = matches?.company?.innerText || "";
  document.getElementById("position").value =
    matches?.position?.innerText || "";
  document.getElementById("companyDesc").value =
    matches?.companyDesc?.innerText || "";
}

chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
  chrome.tabs.sendMessage(
    tabs[0].id,
    { action: "request job info" },
    (matches) => {
      updateSidePanel(matches);
    },
  );
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "Job API Completed") {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.tabs.sendMessage(
        tabs[0].id,
        { action: "request job info" },
        (matches) => {
          updateSidePanel(matches);
        },
      );
    });
  }
});

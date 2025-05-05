/*global pdfjsLib, mammoth, docx */
let resume;
let resumeDocx;
let fileName;
let fonts = {};
const { Document, Packer, Paragraph, TextRun, AlignmentType } = docx;

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

async function generateDocx(data) {
  const htmlString = `${data}`;

  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, "text/html");
  const body = doc.body;

  const paragraphs = [];

  function parseNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      return new TextRun(node.textContent);
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      switch (node.tagName.toLowerCase()) {
        case "p":
          return new Paragraph({
            children: [
              new TextRun({
                text: node.textContent,
                size: 26,
                font: "Arabic", // 设置字体为 Arabic
              }),
            ],
            spacing: {
              line: 260,
            },
          });
        case "li":
          return new Paragraph({
            children: [
              new TextRun({
                text: node.textContent,
                size: 26, // 设置字体大小为 26
                font: "Arabic", // 设置字体为 Arabic
              }),
            ],
            bullet: { level: 0 }, // 设置为无序列表
            spacing: {
              line: 260, // 设置行间距
            },
          });
        case "ul":
        case "ol":
          return Array.from(node.children)
            .map((child) => {
              // 确保每个列表项的字体大小都是 26
              return new Paragraph({
                children: [
                  new TextRun({
                    text: child.textContent,
                    size: 26, // 设置字体大小为 26
                    font: "Arabic", // 设置字体为 Arabic
                  }),
                ],
                bullet: { level: 0 }, // 无序列表
                numbering: { reference: "numbering", level: 0 }, // 有序列表
                spacing: {
                  line: 260, // 设置行间距
                },
              });
            })
            .flat();
        default: {
          const tag = node.tagName.toLowerCase();
          const level = parseInt(tag[1]);
          const sizeMap = {
            1: 48, // h1
            2: 40,
            3: 32,
            4: 26,
            5: 26,
            6: 18,
          };

          if (/^h[1-6]$/.test(tag)) {
            return new Paragraph({
              children: [
                new TextRun({
                  text: node.textContent,
                  bold: true,
                  size: sizeMap[level],
                  font: "Arabic", // 设置字体为 Arabic
                }),
              ],
              spacing: {
                line: 260, // 设置行间距
              },
              alignment: AlignmentType.JUSTIFIED, // <- 设置两端对齐
            });
          }
          break;
        }
      }
    }

    return null;
  }

  for (let child of body.children) {
    const parsed = parseNode(child);
    if (Array.isArray(parsed)) {
      paragraphs.push(...parsed);
    } else if (parsed) {
      paragraphs.push(parsed);
    }
  }

  const docxFile = new Document({
    sections: [
      {
        properties: {},
        children: paragraphs,
      },
    ],
  });

  const blob = await Packer.toBlob(docxFile);

  // 下载文件
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "resume.docx";
  a.click();
}

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
  if (fileName.endsWith(".pdf")) {
    generatePDF(resume);
  } else if (fileName.endsWith(".docx")) {
    generateDocx(resumeDocx);
  }
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
    fileName = file.name;

    if (fileName.endsWith(".pdf")) {
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
    } else if (fileName.endsWith(".docx")) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const arrayBuffer = event.target.result;

        const result = await mammoth.extractRawText({ arrayBuffer });
        const resultWithStyle = await mammoth.convertToHtml({ arrayBuffer });

        const fullText = result.value;
        const html = resultWithStyle.value;

        console.log("html", html);
        console.log("fullText", fullText);

        resumeDocx = html;
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

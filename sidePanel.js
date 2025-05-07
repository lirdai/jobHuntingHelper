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
    console.log(fontName, fontStyle);
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
  const sizeMap = {
    1: 48, // h1
    2: 40,
    3: 32,
    4: 26,
    5: 26,
    6: 18,
  };

  function createChildren(node) {
    return Array.from(node.childNodes)
      .filter((child) => !!child)
      .map((child) => parseNode(child));
  }
  function parseNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      return new TextRun({
        text: node.textContent,
        style: "normal",
      });
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      switch (node.tagName.toLowerCase()) {
        case "strong":
          return new TextRun({
            text: node.textContent,
            style: "strong",
          });
        case "p":
          return new Paragraph({
            children: createChildren(node),
            style: "p",
          });
        case "li":
          return new Paragraph({
            children: createChildren(node),
            style: "p",
          });
        case "ul":
        case "ol":
          return Array.from(node.children)
            .filter((child) => !!child)
            .map((child) => {
              // 确保每个列表项的字体大小都是 26
              return new Paragraph({
                children: createChildren(child),
                style: "p",
                bullet: { level: 0 }, // 无序列表
                numbering: { reference: "numbering", level: 0 }, // 有序列表
              });
            });
        default: {
          const tag = node.tagName.toLowerCase();
          if (/^h[1-6]$/.test(tag)) {
            return new Paragraph({
              children: [
                new TextRun({
                  text: node.textContent,
                }),
              ],
              style: tag,
            });
          }
          return new TextRun({
            text: node.textContent,
            style: "normal",
          });
        }
      }
    }

    return null;
  }

  let i = 0;
  for (let child of body.children) {
    if (i === 2 || i === 3 || i === 5) console.log("child", child);

    const parsed = parseNode(child);
    if (Array.isArray(parsed)) {
      paragraphs.push(...parsed);
    } else if (parsed) {
      paragraphs.push(parsed);
    }
    i++;
  }
  console.log("paragraphs", paragraphs);

  // const fontUrl = chrome.runtime.getURL("fonts/Arial.ttf");
  // const response = await fetch(fontUrl);
  // const font = new Uint8Array(await response.arrayBuffer());
  const docxFile = new Document({
    compatabilityModeVersion: 17,
    sections: [
      {
        properties: {},
        children: paragraphs,
      },
    ],
    styles: {
      default: {
        document: {
          run: {
            // font: "Times New Roman",
          },
        },
      },
      characterStyles: [
        {
          id: "normal",
          run: {
            size: 24,
          },
        },
        {
          id: "strong",
          run: {
            size: 24,
            bold: true,
          },
        },
      ],
      paragraphStyles: [
        {
          id: "p",
          paragraph: {
            spacing: {
              before: 0,
              after: 0,
            },
          },
        },
        {
          id: "h1",
          paragraph: {
            alignment: AlignmentType.CENTER,
            spacing: {
              before: 200,
              after: 100,
            },
          },
          run: {
            size: sizeMap[1],
            bold: true,
          },
        },
        {
          id: "h2",
          paragraph: {
            alignment: AlignmentType.CENTER,
            spacing: {
              before: 200,
              after: 100,
            },
          },
          run: {
            size: sizeMap[2],
            bold: true,
          },
        },
        {
          id: "h3",
          paragraph: {
            spacing: {
              before: 200,
              after: 100,
            },
          },
          run: {
            size: sizeMap[3],
            bold: true,
            font: "Arial",
          },
        },
      ],
    },
    // fonts: [{ name: "Pacifico", data: font, characterSet: CharacterSet.ANSI }],
  });

  console.log("Packer", docxFile);

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

const pdfRenderPage = (url) => {
  var pdfDoc = null,
    pageNum = 1,
    pageRendering = false,
    pageNumPending = null,
    scale = 0.8,
    canvas = document.getElementById("the-canvas"),
    ctx = canvas.getContext("2d");

  function renderPage(num) {
    pageRendering = true;
    pdfDoc.getPage(num).then(function (page) {
      var viewport = page.getViewport({ scale: scale });
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      var renderContext = {
        canvasContext: ctx,
        viewport: viewport,
      };
      var renderTask = page.render(renderContext);

      renderTask.promise.then(function () {
        pageRendering = false;
        if (pageNumPending !== null) {
          renderPage(pageNumPending);
          pageNumPending = null;
        }
      });
    });

    document.getElementById("page_num").textContent = num;
  }

  function queueRenderPage(num) {
    if (pageRendering) {
      pageNumPending = num;
    } else {
      renderPage(num);
    }
  }

  function onPrevPage() {
    if (pageNum <= 1) {
      return;
    }
    pageNum--;
    queueRenderPage(pageNum);
  }
  document.getElementById("prev").addEventListener("click", onPrevPage);

  function onNextPage() {
    if (pageNum >= pdfDoc.numPages) {
      return;
    }
    pageNum++;
    queueRenderPage(pageNum);
  }
  document.getElementById("next").addEventListener("click", onNextPage);

  pdfjsLib.getDocument(url).promise.then(function (pdfDoc_) {
    pdfDoc = pdfDoc_;
    document.getElementById("page_count").textContent = pdfDoc.numPages;

    renderPage(pageNum);
  });
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
      pdfRenderPage(URL.createObjectURL(file));

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

document.addEventListener("DOMContentLoaded", () => {
  const tabs = document.querySelectorAll(".tab");
  const contents = document.querySelectorAll(".tab-content");
  const forwardButtons = document.querySelectorAll(".icon_button");

  function activateTab(index) {
    tabs.forEach((t) => t.classList.remove("active"));
    contents.forEach((c) => c.classList.remove("active"));

    tabs[index].classList.add("active");
    contents[index].classList.add("active");
  }

  tabs.forEach((tab, idx) => {
    tab.addEventListener("click", () => activateTab(idx));
  });

  forwardButtons.forEach((forwardButton) => {
    forwardButton.addEventListener("click", () => {
      const currentIndex = [...tabs].findIndex((tab) =>
        tab.classList.contains("active"),
      );

      const nextIndex = (currentIndex + 1) % tabs.length;
      activateTab(nextIndex);
    });
  });
});

document.getElementById("fileInput").addEventListener("change", function () {
  const reader = new FileReader();
  reader.onload = function (event) {
    const arrayBuffer = event.target.result;

    mammoth
      .convertToHtml({ arrayBuffer: arrayBuffer })
      .then(function (result) {
        document.getElementById("output").innerHTML = result.value;
      })
      .catch(function (err) {
        console.error("Mammoth conversion error:", err);
      });
  };
  reader.readAsArrayBuffer(this.files[0]);
});

/*global pdfjsLib, mammoth, docx */
let resume;
let resumeDocx;
let resumeOpenAI;
let companyInfo = {
  company: null,
  position: null,
  companyDesc: null,
}
let additionalInfo;
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
              return new Paragraph({
                children: createChildren(child),
                style: "p",
                bullet: { level: 0 }, 
                numbering: { reference: "numbering", level: 0 }, 
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

  const blob = await Packer.toBlob(docxFile);

  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "resume.docx";
  a.click();
}

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

document.getElementById("company").addEventListener("change", (e) => {
  const company = document.getElementById("company");
  if (e.target.value === "") {
    company.style.border = "1px solid #DC143C";
  } else {
    company.style.border = "1px solid #000";
  }

  companyInfo.company = e.target.value;
});

document.getElementById("position").addEventListener("change", (e) => {
  const position = document.getElementById("position");
  if (e.target.value === "") {
    position.style.border = "1px solid #DC143C";
  } else {
    position.style.border = "1px solid #000";
  }

  companyInfo.position = e.target.value;
});

document.getElementById("companyDesc").addEventListener("change", (e) => {
  const companyDesc = document.getElementById("companyDesc");
  if (e.target.value === "") {
    companyDesc.style.border = "1px solid #DC143C";
  } else {
    companyDesc.style.border = "1px solid #000";
  }

  companyInfo.companyDesc = e.target.value;
});

document.getElementById("fileInput").addEventListener("change", (e) => {
  const fileInput = document.getElementById("fileInput");
  if (fileInput.value === "" || fileInput.value === null || fileInput.value === undefined) {
    fileInput.style.border = "1px solid #DC143C";
  } else {
    fileInput.style.border = "1px solid #000";
  }
});

document.getElementById("aikey").addEventListener("change", (e) => {
  const aikey = document.getElementById("aikey");
  if (e.target.value === "") {
    aikey.style.border = "1px solid #DC143C";
  } else {
    aikey.style.border = "1px solid #000";
  }
});

document.getElementById("additionalInfo").addEventListener("change", (e) => {
  const additionalInfo = document.getElementById("additionalInfo");
  if (e.target.value === "") {
    additionalInfo.style.border = "1px solid #DC143C";
  } else {
    additionalInfo.style.border = "1px solid #000";
  }

  additionalInfo = e.target.value;
});

document.getElementById("createResume").addEventListener("click", async (e) => {
  const savedMsg = document.getElementById("saved-msg");
  const file = document.getElementById("fileInput");
  const company = document.getElementById("company");
  const position = document.getElementById("position");
  const companyDesc = document.getElementById("companyDesc");
  const key = document.getElementById("aikey");

  const checkIfOk = file.value !== "" && file.value !== undefined && file.value !== null && company.value !== "" && position.value !== "" && companyDesc.value !== "" && key.value !== "";

  if (checkIfOk) {
    const keyCheck = key.value.trim();
    if (!keyCheck.startsWith("sk-")) {
      alert("Please enter a valid OpenAI API key (starting with 'sk-')");
      return;
    }

    chrome.storage.local.get(["openaiKey"]).then((result) => {
      if (result.openaiKey) return
      else {
        const confirmed = confirm("Would you like us to remember your OpenAI API key?");
        if (confirmed) {
          chrome.storage.local.set({ openaiKey: key.value }).then(() => {
            savedMsg.style.display = "block";
            setTimeout(() => {
              savedMsg.style.display = "none";
            }, 2000);
          });
        } else {
          alert("OpenAI API key was not saved");
        }
      }
    });

    document.getElementById("loading").style.display = "block";

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key.value}`,
      },
      body: JSON.stringify({
        "model": "gpt-4.1",
        "messages": [
          {
            "role": "system",
            "content": `你是一个职业规划师，给别人改写简历信息。别人会给你个人简历信息，以及应聘的工作职位，公司介绍等信息。可能还会有必要的个人特色介绍。
            你要根据别人给你的这些信息，给他们回复一个符合他们应聘工作的简历。你的回答必须是跟简历模版一样是html格式，但你只可以回复<body>里面的内容。`
          },
          {
            "role": "user",
            "content": `这是我的简历模版，${resumeDocx}。这是我的简历，${resumeOpenAI}。这是公司的信息，${companyInfo}。这是我的个人特色介绍，也可能是空白，${additionalInfo}`,
          },
        ]
      }),
    });
  
    const data = await response.json();
    console.log(data?.choices?.[0]?.message?.content || "No response.");
    document.getElementById("loading").style.display = "none";

    if (data?.choices?.[0]?.message?.content) {
      if (fileName.endsWith(".pdf")) {
        generatePDF(resume);
      } else if (fileName.endsWith(".docx")) {
        generateDocx(data?.choices?.[0]?.message?.content);
      }
    }
  } else {
    if (file.value === "" || file.value === undefined || file.value === null) {
      file.style.border = "1px solid #DC143C";
      alert("Please upload your resume");
    } if (company.value === "") {
      company.style.border = "1px solid #DC143C";
      alert("Please provide the company name");
    } if (position.value === "") {
      position.style.border = "1px solid #DC143C";
      alert("Please provide the job title");
    } if (companyDesc.value === "") {
      companyDesc.style.border = "1px solid #DC143C";
      alert("Please provide a company introduction");
    } else {
      key.style.border = "1px solid #DC143C";
      alert("Please enter your OpenAI API key");
    }
  }
});

document.getElementById("fileInput").addEventListener("click", () => {
  const fileInput = document.getElementById("fileInput");
  fileInput.value = "";

  const output = document.getElementById("output");
  output.innerHTML = "";
  output.removeAttribute("class");

  const canvas = document.getElementById("the-canvas");
  const ctx = canvas.getContext("2d");

  const width = canvas.width;
  const height = canvas.height;

  ctx.clearRect(0, 0, width, height);

  canvas.width = 0;
  canvas.height = 0;
});

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
        resumeOpenAI = fullText;
      };

      reader.readAsArrayBuffer(file);
    }
  });

document.addEventListener("DOMContentLoaded", () => {
  const key = document.getElementById("aikey");

  chrome.storage.local.get(["openaiKey"]).then((result) => {
    if (result.openaiKey) {
      key.value = result.openaiKey;
    }
  });
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

      if ((currentIndex + 1) % tabs.length === 1 || (currentIndex + 1) % tabs.length === 2) {
        const nextIndex = (currentIndex + 1) % tabs.length;
        activateTab(nextIndex);
      }
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

document.getElementById("fileInput").addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;

  if (file.name.toLowerCase().endsWith(".pdf")) {
    document.getElementById("controls").style.display = "block";
  } else {
    document.getElementById("controls").style.display = "none";
  }
});

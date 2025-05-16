/*global pdfjsLib, mammoth, docx */
let resumePDF = null;
let resumeDocx = null;
let resumeOpenAI = null;
let companyInfo = {
  company: null,
  position: null,
  companyDesc: null,
};
let additionalInfo;
let fileName = null;
let fonts = {};
const { Document, Packer, Paragraph, TextRun, AlignmentType } = docx;

function generatePDF(data) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "pt", putOnlyUsedFonts: true, compress: true });
  const pdfHeight = 842;

  data.forEach((content, index) => {
    if (index !== 0) doc.addPage();
    content.items.forEach((item) => {
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
  });

  doc.save("Resume.pdf");
}

async function generateDocx(data, selectionType) {
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
          id: "li",
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
  a.download = generateFilename(selectionType);
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

  const company = document.getElementById("company");
  const position = document.getElementById("position");
  const companyDesc = document.getElementById("companyDesc");

  company.value = matches?.company?.innerText || "";

  if (company.value === "") {
    company.style.border = "1px solid #DC143C";
  } else {
    company.style.border = "1px solid #000";
  }

  position.value = matches?.position?.innerText || "";

  if (position.value === "") {
    position.style.border = "1px solid #DC143C";
  } else {
    position.style.border = "1px solid #000";
  }

  companyDesc.value = matches?.companyDesc?.innerText || "";

  if (companyDesc.value === "") {
    companyDesc.style.border = "1px solid #DC143C";
  } else {
    companyDesc.style.border = "1px solid #000";
  }
}

function generateFilename(sectionType) {
  const fileMap = {
    resume: "resume.docx",
    cover: "cover_letter.docx",
    achievement: "achievement.docx",
    why: "why_us.docx",
  };

  return fileMap[sectionType] || "document.docx";
}

function getSystemMessage(sectionType) {
  let base = `你是一位职业规划顾问，负责帮助用户优化简历内容。用户会提供他们的简历信息、应聘职位、公司介绍，以及可能包含的个人亮点或特长。
  你的任务是根据这些信息，优化并改写简历内容，使其更符合目标职位的要求，更具专业性和吸引力。
  简历上如果有skills必须要多match工作招聘上的要求。
  你的回复必须采用简历模板格式，并以 HTML 编写。要严格按照原来的格式，不可以自己乱添加删减空格。但请注意，你只能返回 <body> 标签内的内容，不能包含 <html>、<head> 或 <body> 标签本身。
  此外，简历中提及的职位必须与用户所应聘的岗位保持一致。`;

  if (sectionType === "cover") {
    base = `你是一位职业规划顾问，负责为用户撰写英文求职信（Cover Letter）。用户将提供其简历内容、应聘职位、公司信息，以及可能包含的个人亮点或特长。
    请根据这些信息，撰写一封不超过 150 字的英文求职信，应为单段形式，语言简洁、正式且具有说服力。信中应突出用户与目标岗位的匹配度以及其应聘动机。
    请使用简历模板的 HTML 格式返回内容，仅限 <body> 标签内部的部分，不得包含 <html>、<head> 或 <body> 标签本身。`;
  } else if (sectionType === "achievement") {
    base = `你是一位职业规划顾问，负责帮助用户提炼并撰写英文版的个人成就总结。用户将提供其简历内容、应聘职位、公司信息，以及可能包含的个人亮点或特长。
    请根据这些信息，撰写一段不超过 150 字的英文描述，用自然段形式呈现。
    内容应突出用户最具代表性的个人成就，真实可信，尽可能结合简历中的具体经历进行量化说明，使其更具说服力与专业性。
    请使用简历模板的 HTML 格式返回内容，仅限 <body> 标签内部的部分，不得包含 <html>、<head> 或 <body> 标签本身。`;
  } else if (sectionType === "why") {
    base = `你是一位职业规划顾问，负责帮助用户撰写英文版的“为什么选择我们公司”陈述。用户将提供其简历信息、应聘职位、目标公司介绍，以及可能的个人优势或特长。
    请根据这些信息，撰写一段不超过 150 字的英文自然段，说明用户选择该公司的理由。
    内容应体现用户对公司的了解，结合公司文化、使命或项目亮点，并突出其与用户背景或价值观的契合。
    请以简历模板的 HTML 格式返回，仅限 <body> 标签内部的内容，不得包含 <html>、<head> 或 <body> 标签本身。`;
  }

  return base;
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
  console.log("woooo!!!!!", message);
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

document.getElementById("fileInput").addEventListener("change", () => {
  const fileInput = document.getElementById("fileInput");
  if (
    fileInput.value === "" ||
    fileInput.value === null ||
    fileInput.value === undefined
  ) {
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
  const addition = document.getElementById("additionalInfo");
  if (e.target.value === "") {
    addition.style.border = "1px solid #DC143C";
  } else {
    addition.style.border = "1px solid #000";
  }

  additionalInfo = e.target.value;
});

document.addEventListener("DOMContentLoaded", () => {
  const createResumeBtn = document.getElementById("createResume");

  createResumeBtn.addEventListener("click", async () => {
    const savedMsg = document.getElementById("saved-msg");
    const file = document.getElementById("fileInput");
    const company = document.getElementById("company");
    const position = document.getElementById("position");
    const companyDesc = document.getElementById("companyDesc");
    const key = document.getElementById("aikey");
    const select = document.getElementById("infoSelect");

    const fileIfOk = file.value || resumeDocx !== null || resumeOpenAI !== null;
    console.log(resumeDocx, resumeOpenAI);

    const checkIfOk =
      fileIfOk &&
      company.value !== "" &&
      position.value !== "" &&
      companyDesc.value !== "" &&
      key.value !== "";

    if (checkIfOk) {
      const keyCheck = key.value.trim();
      if (!keyCheck.startsWith("sk-")) {
        alert("Please enter a valid OpenAI API key (starting with 'sk-')");
        return;
      }

      chrome.storage.local.get(["openaiKey"]).then((result) => {
        if (result?.openaiKey === key?.value) return;
        else {
          const confirmed = confirm(
            "Would you like us to remember your OpenAI API key?",
          );
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

      document.getElementById("loading").style.display = "flex";

      if (fileName.endsWith(".pdf")) {
        generatePDF(resumePDF);
      } else if (fileName.endsWith(".docx")) {
        const response = await fetch(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${key.value}`,
            },
            body: JSON.stringify({
              model: "gpt-4.1",
              messages: [
                {
                  role: "system",
                  content: getSystemMessage(select.value),
                },
                {
                  role: "user",
                  content: `这是我的简历模版，${resumeDocx}。这是我的简历，${resumeOpenAI}。这是公司的信息，${companyInfo}。这是我的个人特色介绍，也可能是空白，${additionalInfo}`,
                },
              ],
            }),
          },
        );

        const data = await response.json();
        document.getElementById("loading").style.display = "none";

        if (data?.choices?.[0]?.message?.content) {
          generateDocx(data?.choices?.[0]?.message?.content, select.value);
        }
      }
    } else {
      if (!file.value && !resumeDocx.value && !resumeOpenAI.value) {
        file.style.border = "1px solid #DC143C";
        alert("Please upload your resume");
      }
      if (company.value === "") {
        company.style.border = "1px solid #DC143C";
        alert("Please provide the company name");
      }
      if (position.value === "") {
        position.style.border = "1px solid #DC143C";
        alert("Please provide the job title");
      }
      if (companyDesc.value === "") {
        companyDesc.style.border = "1px solid #DC143C";
        alert("Please provide a company introduction");
      }
      if (key.value === "") {
        key.style.border = "1px solid #DC143C";
        alert("Please enter your OpenAI API key");
      }
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      createResumeBtn.click();
    }
  });
});

document.getElementById("fileInput").addEventListener("click", () => {
  const fileInput = document.getElementById("fileInput");
  fileInput.value = "";
  fileInput.style.border = "1px solid #DC143C";

  chrome.storage.local.remove("uploadedResume", () => {});
  chrome.storage.local.remove("uploadedHtmlResume", () => {});
  chrome.storage.local.remove("resumeName", () => {});

  const customFileInputLabel = document.getElementById("customFileInputLabel");
  customFileInputLabel.innerHTML = "📎 Upload Resume";

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
        console.log("texts", texts);

        resumePDF = texts;
        resumeOpenAI = fullText;
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

        mammoth
          .convertToHtml({ arrayBuffer })
          .then(function (result) {
            chrome.storage.local.set(
              { uploadedHtmlResume: result.value },
              () => {},
            );
            chrome.storage.local.set({ resumeName: fileName }, () => {});
            document.getElementById("output").innerHTML = result.value;
            document.getElementById("customFileInputLabel").innerHTML =
              `📎 ${fileName}`;
          })
          .catch(function (err) {
            console.error("Mammoth conversion error:", err);
          });

        mammoth
          .extractRawText({ arrayBuffer })
          .then(function (result) {
            chrome.storage.local.set(
              { uploadedResume: result.value },
              () => {},
            );
          })
          .catch(function (err) {
            console.error("Mammoth conversion error:", err);
          });
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

  chrome.storage.local.get("uploadedHtmlResume", (result) => {
    if (result.uploadedHtmlResume) {
      document.getElementById("output").innerHTML = result.uploadedHtmlResume;
      resumeDocx = result.uploadedHtmlResume;
    } else {
      console.log("No Resume found in storage.");
    }
  });

  chrome.storage.local.get("uploadedResume", (result) => {
    if (result.uploadedResume) {
      resumeOpenAI = result.uploadedResume;
    } else {
      console.log("No Resume found in storage.");
    }
  });

  chrome.storage.local.get("resumeName", (result) => {
    if (result.resumeName) {
      document.getElementById("customFileInputLabel").innerHTML =
        `📎 ${result.resumeName}`;
      fileName = result.resumeName;
    } else {
      console.log("No Resume Name found in storage.");
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

  function getCurrentIndex() {
    return [...tabs].findIndex((tab) => tab.classList.contains("active"));
  }

  function goToNextTab() {
    const currentIndex = getCurrentIndex();
    if (currentIndex < tabs.length - 1) {
      activateTab(currentIndex + 1);
    }
  }

  function goToPreviousTab() {
    const currentIndex = getCurrentIndex();
    if (currentIndex > 0) {
      activateTab(currentIndex - 1);
    }
  }

  tabs.forEach((tab, idx) => {
    tab.addEventListener("click", () => activateTab(idx));
  });

  forwardButtons.forEach((forwardButton) => {
    forwardButton.addEventListener("click", goToNextTab);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === "ArrowRight") {
      goToNextTab();
    } else if (e.key === "ArrowLeft") {
      goToPreviousTab();
    }
  });
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

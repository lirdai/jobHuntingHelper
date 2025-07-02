/*global pdfjsLib, mammoth, docx */
/* 
  sidepanel -> content.js -> chrome.tabs
  background -> content.js -> chrome.tabs
  sidepanel -> background.js -> chrome.runtime
  content -> sidepanel.js -> chrome.runtime
  content -> background.js -> chrome.runtime
  background -> sidepanel.js -> chrome.runtime
*/
let resumePDF = null;
let resumeDocx = null;
let resumeOpenAI = null;
let fileName = null;
let chatBox = null;
let companyInfo = {
  company: null,
  position: null,
  companyDesc: null,
};
let messages = [];
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

function updateSidePanel(matches) {
  if (!document.getElementById("my-extension-panel")) {
    return;
  }

  const company = document.getElementById("company");
  const position = document.getElementById("position");
  const companyDesc = document.getElementById("companyDesc");
  const chatMode = document.getElementById("chatMode");

  company.value = matches?.company?.innerText || "";
  position.value = matches?.position?.innerText || "";
  companyDesc.value = matches?.companyDesc?.innerText || "";

  companyInfo.company = company.value;
  companyInfo.position = position.value;
  companyInfo.companyDesc = companyDesc.value;

  if (chatMode.value === "perTask") {
    messages = [];
    clearChatWindow();
  }
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

function generateFilename(sectionType) {
  const fileMap = {
    resume: "resume.docx",
    cover: "cover_letter.docx",
    achievement: "achievement.docx",
    why_us: "why_us.docx",
    why_role: "why_role.docx",
    goal: "goal.docx",
    thank_you: "thank_you.docx",
    follow_up: "follow_up.docx",
  };

  return fileMap[sectionType] || "document.docx";
}

function generateFileFormat(sectionType) {
  const fileMap = {
    resume: `Make sure the resume content — including job titles, values, skills, and achievements — closely matches the target job. Follow the provided template exactly and do not alter the original formatting or spacing.`,
    cover: `Write a cover letter of around 150 words in a single paragraph. Use a complete structure: greeting (e.g., "Dear..."), body, closing (e.g., "Regards..."), and signature. Include the company name and job title, and align the content with the user’s resume and the company’s expectations. Keep the tone natural and conversational — avoid overly big or formal words.`,
    achievement: `Write a ~150-word paragraph describing the user’s biggest professional achievement. Highlight something that aligns well with what the company is likely looking for. Keep the tone persuasive but natural and avoid exaggerated or overly formal language.`,
    why_us: `Write a paragraph of around 150 words explaining why the user wants to join this company. Refer to the company’s mission, culture, products, or recent projects, and connect them to the user’s background or values. The tone should be sincere, personal, and conversational — not generic or overly formal.`,
    why_role: `Write a ~150-word paragraph explaining why the user is applying for this specific role. Match the user’s resume content and experience with the job description. Focus on skills, motivations, and relevant past work. Keep the tone clear and personal — avoid empty or cliché expressions.`,
    goal: `Write a ~150-word paragraph describing the user’s 5–10 year career goals. Tie them to the user’s current background and possibly to the direction this job could lead. The tone should be forward-looking and grounded — don’t make it sound like a generic template.`,
    thank_you: `Write a thank-you letter in one paragraph (~150 words) with a complete structure: greeting ("Dear..."), body, closing ("Regards..."), and signature. Use the company name and job title where appropriate. The tone should be polite, appreciative, and naturally conversational.`,
    follow_up: `Write a follow-up letter in one paragraph (~150 words) with a complete structure: greeting ("Dear..."), body, closing ("Regards..."), and signature. Use the company name and job title. Keep the tone polite and professional while restating interest in the position.`,
  };

  return fileMap[sectionType];
}

document.getElementById("company").addEventListener("change", (e) => {
  companyInfo.company = e.target.value;
});

document.getElementById("position").addEventListener("change", (e) => {
  companyInfo.position = e.target.value;
});

document.getElementById("companyDesc").addEventListener("change", (e) => {
  companyInfo.companyDesc = e.target.value;
});

document.getElementById("chatBox").addEventListener("change", (e) => {
  chatBox = e.target.value;
});

document.getElementById("modeToggle").addEventListener("change", () => {
  const toggle = document.getElementById("modeToggle");
  const switchValue = document.getElementById("switchValue");
  const generateFile = document.getElementById("generate_file");
  const chatWindow = document.getElementById("chat_window");

  switchValue.textContent = toggle.checked
    ? "Current Mode: Chat Only"
    : "Current Mode: Generate File";

  if (toggle.checked) {
    chatWindow.style.display = "block";
    generateFile.style.display = "none";
  } else {
    generateFile.style.display = "flex";
    chatWindow.style.display = "none";
  }
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

document.getElementById("fileInput").addEventListener("click", () => {
  const fileInput = document.getElementById("fileInput");
  fileInput.value = "";

  chrome.storage.local.remove("uploadedResume", () => {});
  chrome.storage.local.remove("uploadedHtmlResume", () => {});
  chrome.storage.local.remove("resumeName", () => {});

  resumeDocx = null;
  resumeOpenAI = null;
  fileName = null;

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

function checkChatWindowEmpty() {
  const chatWindow = document.getElementById("chat_window");
  const emptyIcon = document.getElementById("empty_icon");

  if (chatWindow.children.length > 1) {
    emptyIcon.style.display = "none";
  } else {
    emptyIcon.style.display = "block";
  }
}

function clearChatWindow() {
  const chatWindow = document.getElementById("chat_window");
  chatWindow.innerHTML = `
    <div class="empty-icon" id="empty_icon">
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="1.5"
          stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
      <p>No messages yet</p>
    </div>`;
  checkChatWindowEmpty();
}

function addMessageChatWindow(userText, assistantHTML) {
  const chatWindow = document.getElementById("chat_window");
  const chatMode = document.getElementById("chatMode");

  if (userText) {
    const userMsg = document.createElement("div");
    userMsg.className = "chat-message user-message";
    userMsg.textContent = userText;
    chatWindow.appendChild(userMsg);
    if (chatMode.value !== "single") {
      messages.push({
        role: "user",
        content: userText,
      });
    }
  }
  if (assistantHTML) {
    const assistantMsg = document.createElement("div");
    assistantMsg.className = "chat-message assistant-message";
    assistantMsg.innerHTML = assistantHTML;
    chatWindow.appendChild(assistantMsg);

    if (chatMode.value !== "single") {
      messages.push({
        role: "assistant",
        content: assistantHTML,
      });
    }
  }

  checkChatWindowEmpty();
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

document.addEventListener("DOMContentLoaded", () => {
  checkChatWindowEmpty();
});

document.addEventListener("DOMContentLoaded", () => {
  const updateSettingBn = document.getElementById("updateSetting");
  const chatMode = document.getElementById("chatMode");

  updateSettingBn.addEventListener("click", async () => {
    chrome.storage.local.set({ chatMode: chatMode.value }, () => {});
  });
});

document.addEventListener("DOMContentLoaded", () => {
  const createFileBtn = document.getElementById("createFile");
  const toggle = document.getElementById("modeToggle");
  const file = document.getElementById("fileInput");
  const company = document.getElementById("company");
  const position = document.getElementById("position");
  const companyDesc = document.getElementById("companyDesc");
  const taileredCommand = document.getElementById("chatBox");
  const key = document.getElementById("aikey");
  const savedMsg = document.getElementById("saved-msg");
  const select = document.getElementById("infoSelect");

  createFileBtn.addEventListener("click", async () => {
    createFileBtn.disabled = true;
    document.getElementById("overlay").style.display = "block";
    document.body.classList.add("locked");
    if (document.getElementById("chatMode").value === "single") {
      clearChatWindow();
    }

    try {
      const fileIfOk = file?.value || resumeDocx;

      const checkIfOk =
        fileIfOk &&
        company.value !== "" &&
        position.value !== "" &&
        companyDesc.value !== "" &&
        taileredCommand.value !== "" &&
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

        addMessageChatWindow(chatBox, null);
        taileredCommand.value = "";
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
                temperature: 1,
                top_p: 0.9,
                messages: [
                  {
                    role: "system",
                    content: toggle.checked
                      ? `The user will provide four inputs:
                      - Resume template: ${resumeDocx}
                      - Resume content: ${resumeOpenAI}
                      - Job and company information, provided as an object representing the current job application the user is pursuing:
                        - company: the target company name ${companyInfo.company}
                        - position: the job title being applied for ${companyInfo.position}
                        - companyDescription: a brief description of the company, including its culture, values, or business focus ${companyInfo.companyDesc}
                      - Optional chat context or instructions: ${chatBox}
              
                      You are a professional career advisor. Your task is to engage in a Q&A-style conversation and provide expert guidance on any career-related questions. 
                      You do not generate or edit resume or cover letter content directly. 
                      Instead, you offer personalized advice — like analyzing job fit, suggesting how to improve a resume for a specific role, or sharing insights on job market trends — just like a real career coach.
                      You must not create, modify, or reformat the resume unless the ${chatBox} input explicitly instructs you to do so.
              
                      Your response must:
                      - Be written in HTML format.
                      - Only return the content within the <body> tag — do not include <html>, <head>, or <body> tags themselves.
                      - If a resume is to be generated (only if explicitly asked), strictly follow the provided resume template, preserving original structure and spacing.`
                      : `You are a career advisor who helps users improve resumes, cover letters, and other job application content.
                      Please ${generateFileFormat(select.value)}, based on the provided information.
                      The user will provide three inputs:
                      - Resume template: ${resumeDocx}
                      - Resume content: ${resumeOpenAI}
                      - Job and company information, provided as an object representing the current job application the user is pursuing:
                        - company: the target company name ${companyInfo.company}
                        - position: the job title being applied for ${companyInfo.position}
                        - companyDescription: a brief description of the company, including its culture, values, or business focus ${companyInfo.companyDesc}
                   
                      Feel free to update job titles, company names, skills, values, or any key details as needed to closely match the target role and company.
                      Your response must follow a resume template format and be written in HTML. 
                      Only return the content within the <body> tag — do not include <html>, <head>, or the <body> tags themselves.
                      Strictly preserve the original format and spacing. Do not arbitrarily add, remove, or modify content structure.
                      If a specific task is provided, it should take precedence over the default instructions.
                      Your specific task is as follows:
                      ${chatBox}`,
                  },
                  ...messages,
                ],
              }),
            },
          );

          const data = await response.json();
          document.getElementById("loading").style.display = "none";

          if (data?.choices?.[0]?.message?.content) {
            addMessageChatWindow(null, data?.choices?.[0]?.message?.content);

            if (!toggle.checked) {
              generateDocx(data?.choices?.[0]?.message?.content, select.value);
            }
          }
        }
      } else {
        if (!fileIfOk) {
          alert("Please upload your resume");
        } else if (company.value === "") {
          alert("Please provide the company name");
        } else if (position.value === "") {
          alert("Please provide the job title");
        } else if (companyDesc.value === "") {
          alert("Please provide a company introduction");
        } else if (taileredCommand.value === "") {
          alert(
            "Please share more details so ChatGPT can better personalize the content",
          );
        } else if (key.value === "") {
          alert("Please enter your OpenAI API key");
        }
      }
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Upload failed.");
    } finally {
      document.getElementById("overlay").style.display = "none";
      document.body.classList.remove("locked");
      createFileBtn.disabled = false;
    }
  });
});

document.addEventListener("DOMContentLoaded", () => {
  const key = document.getElementById("aikey");
  const chatMode = document.getElementById("chatMode");

  chrome.storage.local.get(["openaiKey"]).then((result) => {
    if (result.openaiKey) {
      key.value = result.openaiKey;
    }
  });

  chrome.storage.local.get(["chatMode"]).then((result) => {
    if (result.chatMode) {
      chatMode.value = result.chatMode;
    } else {
      chatMode.value = "perTask";
    }
  });

  chrome.storage.local.get("uploadedHtmlResume", (result) => {
    if (result.uploadedHtmlResume) {
      document.getElementById("output").innerHTML = result.uploadedHtmlResume;
      resumeDocx = result.uploadedHtmlResume;
    } else {
      console.log("No uploadedHtmlResume found in storage.");
    }
  });

  chrome.storage.local.get("uploadedResume", (result) => {
    if (result.uploadedResume) {
      resumeOpenAI = result.uploadedResume;
    } else {
      console.log("No uploadedResume found in storage.");
    }
  });

  chrome.storage.local.get("resumeName", (result) => {
    if (result.resumeName) {
      document.getElementById("customFileInputLabel").innerHTML =
        `📎 ${result.resumeName}`;
      fileName = result.resumeName;
    } else {
      console.log("No resumeName found in storage.");
    }
  });
});

document.addEventListener("DOMContentLoaded", () => {
  const tabs = document.querySelectorAll(".tab");
  const contents = document.querySelectorAll(".tab-content");
  const forwardButtons = document.querySelectorAll(".forward_button");

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
    if (e.key === "ArrowRight") {
      goToNextTab();
    } else if (e.key === "ArrowLeft") {
      goToPreviousTab();
    }
  });
});

document.addEventListener("DOMContentLoaded", () => {
  const tabs = document.querySelectorAll(".tab");

  tabs.forEach((tab) => {
    const fullText = tab.textContent.trim();
    tab.dataset.full = fullText;
    tab.dataset.short = fullText[0].toUpperCase();
  });

  function updateTabTextByWidth() {
    const isSmall = window.innerWidth < 499;
    tabs.forEach((tab) => {
      tab.textContent = isSmall ? tab.dataset.short : tab.dataset.full;
    });
  }

  updateTabTextByWidth();
  window.addEventListener("resize", updateTabTextByWidth);
});

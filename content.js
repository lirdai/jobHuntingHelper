function findTargetElements(key, selectors, keywords) {
  let selectorCollections = [];
  const results = {};

  for (let selector of selectors) {
    const elements = document.querySelectorAll(selector);
    selectorCollections.push(...elements);
  }

  selectorCollections.forEach((selector) => {
    const className = selector.className || "";
    const dataTestId = selector.getAttribute("data-testid") || "";

    for (const keyword of keywords) {
      if (className.includes(keyword) || dataTestId.includes(keyword)) {
        results[key] = {
          element: selector,
          className,
          dataTestId,
          innerText: selector.innerText,
        };
        break;
      }
    }
  });

  return results;
}

function collectInfoForPanel() {
  let matches = {};

  const keywords = {
    company: [
      "companyName",
      "job-details-jobs-unified-top-card__company-name",
      "header-style__JobViewHeaderCompanyName",
    ],
    position: [
      "jobsearch-JobInfoHeader-title",
      "job-details-jobs-unified-top-card__job-title",
      "jobTitle",
    ],
    companyDesc: [
      "jobsearch-JobComponent-description",
      "jobs-description__content",
      "DescriptionContainerOuter",
    ],
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
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const matches = collectInfoForPanel();

  if (message.action === "request job info") {
    sendResponse(matches);
  }
});

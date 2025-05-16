# Job Hunting Helper - Chrome Extension

## Overview
**Job Hunting Helper** is a powerful Chrome extension that integrates OpenAI's API to streamline your job application process. Designed for efficiency and accuracy, it helps you generate personalized cover letters, optimize resumes, and highlight your accomplishments directly within your browser. Whether you're targeting roles on LinkedIn, Indeed, Monster, or elsewhere, Job Hunting Helper offers intelligent, context-aware support.

## Key Features
- **Resume Optimization**  
  Upload your resume and get AI-generated suggestions for improving clarity, tone, and impact.

- **Cover Letter Generation**  
  Generate personalized, job-specific cover letters based on the job description and your uploaded resume.

- **Achievement Highlighting**  
  Extract and emphasize your top achievements to make your application stand out.

- **Automatic Job Description Scraping**  
  Automatically scrape job descriptions from popular platforms like LinkedIn, Indeed, and Monster — no more copy-pasting.

- **.docx File Support**  
  Seamlessly upload and parse `.docx` resumes using Mammoth.js, and export generated documents via docx.js.

- **Persistent API Key Storage**  
  Securely store your OpenAI API key locally using Chrome Extension storage APIs to avoid repeated input.

- **User-Friendly Sidebar Interface**  
  Interact with all extension features through a clean and intuitive sidebar powered by the Chrome Extension Side Panel API.

## How It Works
1. Install the extension and pin it to your toolbar.
2. Open any job listing on LinkedIn, Indeed, or Monster.
3. Click the extension icon to activate the sidebar.
4. Upload your resume (`.docx` format).
5. Choose your desired output (Resume Optimization, Cover Letter, Achievements).
6. Let the AI generate optimized content tailored to the job.
7. Download the generated `.docx` documents, ready for submission.

## Demo
Here are three video demos:

![Demo GIF](demo/clip.gif)
![Demo GIF](demo/clip1.gif)
![Demo GIF](demo/clip2.gif)

## Tech Stack
- **Frontend**: HTML5, CSS3, JavaScript
- **Chrome Extension**: Manifest V3, Side Panel API, Chrome Storage API
- **AI Integration**: OpenAI API
- **File Handling**: Mammoth.js (parse `.docx`), docx.js (generate `.docx`)

## Project Link
GitHub: [https://github.com/lirdai/jobHuntingHelper](https://github.com/lirdai/jobHuntingHelper)

## Feedback & Support
We'd love your input! Please report bugs, request features, or share feedback via the [GitHub Issues](https://github.com/lirdai/jobHuntingHelper/issues) page.

## License
This project is licensed under the [GPL-3.0 License](https://www.gnu.org/licenses/gpl-3.0.html).


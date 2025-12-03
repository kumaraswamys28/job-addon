# AI Job Application Tracker (Gmail Add-on)

A smart Gmail Add-on that automatically parses job application emails and logs them into a Google Sheet using **Google Gemini 2.0 Flash**.

## Features

* **One-Click Logging:** Opens a sidebar in Gmail to log applications instantly.
* **AI Parsing (Gemini 2.0):** automatically extracts:
    * Company Name & Role
    * Application Status (Applied, Rejected, OA, Interview)
    * Next Action & Deadlines
    * Recruiter Contact Info
* **Smart Duplicate Detection:** Warns if you try to log the same role twice.
* **Intelligent Updates:** If you open a thread you've already logged (e.g., a rejection email), it pulls the existing data so you can update the status without creating duplicates.
* **Direct Linking:** Generates a direct link to the specific email thread in the spreadsheet.

## Tech Stack

* **Google Apps Script** (Backend Logic)
* **Google Gemini API** (LLM for text parsing)
* **Google Sheets API** (Database)
* **Gmail Service** (Contextual Trigger)

## Setup & Installation

1.  **Create a Google Sheet:**
    * Create a header row with these exact columns:
    * `Company | Role | Source | Applied On | Status | Email Link | Next Action | Deadline | Recruiter | JD Link | Resume | Follow-ups | Notes`
2.  **Open Apps Script:**
    * Extensions > Apps Script.
3.  **Copy the Code:**
    * Copy `Code.js` into the script editor.
    * Copy `appsscript.json` into the project settings manifest.
4.  **Configure Keys:**
    * Get a free API Key from [Google AI Studio](https://aistudio.google.com/).
    * Replace `YOUR_GEMINI_API_KEY` and `YOUR_SPREADSHEET_ID` in the code.
5.  **Deploy:**
    * Click `Deploy` > `Test Deployments` > `Install`.


## License

This project is open-source and available for personal use.

const SHEET_NAME = 'Sheet1'; // sheet name should be same 
const API_KEY = 'YOUR_GEMINI_API_KEY'; 
const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID';

const IDX_LINK = 5; 

function buildAddOn(e) {
  var accessToken = e.messageMetadata.accessToken;
  var messageId = e.messageMetadata.messageId;
  
  GmailApp.setCurrentMessageAccessToken(accessToken);
  var message = GmailApp.getMessageById(messageId);
  var threadId = message.getThread().getId();
  var subject = message.getSubject();
  // Get more body text for better context (3000 chars)
  var body = message.getPlainBody().substring(0, 3000); 
  var sender = message.getFrom();
  
  var emailLink = "https://mail.google.com/mail/u/0/#inbox/" + threadId;

  // --- CHECK IF EXISTS ---
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAME);
  var data = sheet.getDataRange().getValues();
  
  var existingRow = null;

  for (var i = 1; i < data.length; i++) {
    if (data[i][IDX_LINK] === emailLink) {
      existingRow = data[i];
      break;
    }
  }

  // formobject
  var formValues = {};

  if (existingRow) {
// editing
    formValues = {
      company: existingRow[0],
      role: existingRow[1],
      source: existingRow[2],
      status: existingRow[4],
      next_action: existingRow[6],
      deadline: existingRow[7],
      recruiter: existingRow[8],
      jd_link: existingRow[9],
      resume: existingRow[10],
      notes: existingRow[12]
    };
  } else {
    // aidata obect
    var aiData = callGeminiAPI(subject, body, sender);
    
    formValues = {
      company: aiData.company || "Unknown",
      role: aiData.role || "Unknown",
      source: aiData.source || "Email/Direct",
      status: aiData.status || "Applied",        
      next_action: aiData.next_action || "Check Email",
      deadline: aiData.deadline || "",
      recruiter: aiData.recruiter_email || sender,
      jd_link: "",
      resume: "v1",
      notes: aiData.notes || ("Subject: " + subject)
    };
  }

  // UI
  var section = CardService.newCardSection();

  if (existingRow) {
    section.addWidget(CardService.newTextParagraph().setText("<b>EDITING EXISTING ENTRY</b>"));
  } else {
    section.addWidget(CardService.newTextParagraph().setText("<b>AI ANALYSIS COMPLETE</b>"));
  }

  section
    .addWidget(CardService.newTextInput().setFieldName("company").setTitle("Company").setValue(safeString(formValues.company)))
    .addWidget(CardService.newTextInput().setFieldName("role").setTitle("Role").setValue(safeString(formValues.role)))
    .addWidget(CardService.newTextInput().setFieldName("source").setTitle("Source").setValue(safeString(formValues.source)))
    
    .addWidget(CardService.newTextInput().setFieldName("status").setTitle("Status").setValue(safeString(formValues.status)))
    
    .addWidget(CardService.newTextInput().setFieldName("email_link").setTitle("Email Link (ID)").setValue(safeString(emailLink)))

    .addWidget(CardService.newTextInput().setFieldName("next_action").setTitle("Next Action").setValue(safeString(formValues.next_action)))
    
    // safeString() 
    .addWidget(CardService.newTextInput().setFieldName("deadline").setTitle("Deadline").setValue(safeString(formValues.deadline)))
    
    .addWidget(CardService.newTextInput().setFieldName("recruiter").setTitle("Recruiter Email").setValue(safeString(formValues.recruiter)))
    .addWidget(CardService.newTextInput().setFieldName("jd_link").setTitle("JD Link").setValue(safeString(formValues.jd_link)))
    .addWidget(CardService.newTextInput().setFieldName("resume").setTitle("Resume Version").setValue(safeString(formValues.resume)))
    
    .addWidget(CardService.newTextInput().setFieldName("notes").setTitle("Notes").setMultiline(true).setValue(safeString(formValues.notes)));

  var action = CardService.newAction().setFunctionName("saveToSheet");
  var button = CardService.newTextButton().setText(existingRow ? "UPDATE ENTRY" : "LOG APPLICATION").setOnClickAction(action);
  section.addWidget(button);

  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle("Job Application Logger"))
    .addSection(section)
    .build();
}

// ai call
function callGeminiAPI(subject, body, sender) {
  try {
    const prompt = `
      You are an automated assistant logging job applications. Analyze this email and return a JSON object ONLY. 
      No markdown, no code blocks, just raw JSON.

      Input Data:
      Subject: "${subject}"
      Sender: "${sender}"
      Body Snippet: "${body}"

      Requirements:
      1. company: Extract company name.
      2. role: Extract job title.
      3. source: detailed source (e.g. "LinkedIn", "Indeed", "Referral", "Company Site"). Default to "Email".
      4. status: Analyze the sentiment.
         - If text contains "unfortunately", "not moving forward", "other candidates" -> "Rejected"
         - If text contains "coding challenge", "hackerrank", "assessment" -> "OA"
         - If text contains "interview", "schedule a chat", "availability" -> "Interview"
         - If text is just a receipt of application -> "Applied"
      5. next_action: What should the candidate do? (e.g. "None", "Reply to recruiter", "Complete OA").
      6. deadline: Extract any specific date/time deadline.
      7. recruiter_email: Extract the sender's email address strictly (remove < >).
      8. notes: A very short summary (e.g. "Rejected for Backend role", "OA link received").

      Output JSON Structure:
      {
        "company": "",
        "role": "",
        "source": "",
        "status": "",
        "next_action": "",
        "deadline": "",
        "recruiter_email": "",
        "notes": ""
      }
    `;

const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;
    const payload = { 
      "contents": [{ "parts": [{ "text": prompt }] }],
      "safetySettings": [
        { "category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE" },
        { "category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE" },
        { "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE" },
        { "category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE" }
      ]
    };
    
    const options = {
      'method': 'post',
      'contentType': 'application/json',
      'payload': JSON.stringify(payload),
      'muteHttpExceptions': true
    };

    const response = UrlFetchApp.fetch(url, options);
    const json = JSON.parse(response.getContentText());

    // error handling
    if (json.error) {
      throw new Error("API Error: " + json.error.message);
    }

    // check for permission
    if (!json.candidates || json.candidates.length === 0) {
      if (json.promptFeedback && json.promptFeedback.blockReason) {
        throw new Error("Blocked: " + json.promptFeedback.blockReason);
      }
      throw new Error("No response candidates returned.");
    }
    // throwing

    const textResponse = json.candidates[0].content.parts[0].text;
    const cleanJson = textResponse.replace(/```json/g, "").replace(/```/g, "").trim();
    
    return JSON.parse(cleanJson);
    
  } catch (e) {
    // log error to notes
    return { 
      company: "", 
      role: "", 
      source: "Email", 
      status: "Applied", 
      next_action: "Check Email", 
      notes: "AI FAILED: " + e.message 
    };
  }
}

function saveToSheet(e) {
  var inputs = e.formInput;
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAME);
  var data = sheet.getDataRange().getValues();
  
  var targetRowIndex = -1;

  // Search for existing link
  for (var i = 1; i < data.length; i++) {
    if (data[i][IDX_LINK] === inputs.email_link) {
      targetRowIndex = i + 1; 
      break;
    }
  }

  if (targetRowIndex > -1) {
    // update if exist
    sheet.getRange(targetRowIndex, 1).setValue(inputs.company); 
    sheet.getRange(targetRowIndex, 2).setValue(inputs.role);    
    sheet.getRange(targetRowIndex, 3).setValue(inputs.source);  
    sheet.getRange(targetRowIndex, 5).setValue(inputs.status);  
    sheet.getRange(targetRowIndex, 7).setValue(inputs.next_action); 
    sheet.getRange(targetRowIndex, 8).setValue(inputs.deadline);    
    sheet.getRange(targetRowIndex, 9).setValue(inputs.recruiter);   
    sheet.getRange(targetRowIndex, 10).setValue(inputs.jd_link);    
    sheet.getRange(targetRowIndex, 11).setValue(inputs.resume);     
    sheet.getRange(targetRowIndex, 13).setValue(inputs.notes);      

    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText("Entry Updated!"))
      .build();

  } else {
    // if new
    sheet.appendRow([
      inputs.company,
      inputs.role,
      inputs.source,
      new Date(),      
      inputs.status,
      inputs.email_link,
      inputs.next_action,
      inputs.deadline,
      inputs.recruiter,
      inputs.jd_link,
      inputs.resume,
      0,               
      inputs.notes
    ]);

    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText("Saved!"))
      .build();
  }
}



function forceAuth() {
  // This function does nothing but force Google to ask for permission
  UrlFetchApp.fetch("https://www.google.com");
  console.log("Authorization successful!");
}


function checkAvailableModels() {
  const key = 'YOUR_GEMINI_API_KEY';
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
  
  try {
    const response = UrlFetchApp.fetch(url);
    const data = JSON.parse(response.getContentText());
    
    // for my reference 
    console.log("--- AVAILABLE MODELS ---");
    data.models.forEach(m => {
      if (m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent")) {
        console.log(m.name);
      }
    });
    console.log("------------------------");
  } catch (e) {
    console.log("Error checking models: " + e.message);
  }
}



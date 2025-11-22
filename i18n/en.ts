

export const enTranslations = {
  "header": {
    "title": "DocuVault",
    "subtitle": "Your Secure Document Safe",
    "downloadAll": "Download All (Backup)"
  },
  "language": {
    "toggle": "മലയാളം"
  },
  "common": {
    "cancel": "Cancel",
    "processing": "Processing...",
    "hide": "Hide",
    "noDocsToDownload": "No documents to download.",
    "errorDownload": "Failed to generate backup."
  },
  "breadcrumb": {
    "home": "Home"
  },
  "folders": {
    "title": "Folders",
    "assignTo": "Assign to Folder",
    "none": "None (Uncategorized)",
    "createTitle": "Create New Folder",
    "renameTitle": "Rename Folder",
    "folderNameLabel": "Folder Name",
    "folderNamePlaceholder": "e.g., Certificates",
    "createButton": "Create Folder",
    "updateButton": "Update Name",
    "errorNoName": "Please enter a name for the folder.",
    "deleteConfirmation": "Are you sure you want to delete the folder '{{folderName}}'? Documents inside will be moved to Uncategorized.",
    "errorCircularMove": "Cannot move a folder into itself or its descendants."
  },
  "folderCard": {
      "item": "item",
      "items": "items"
  },
  "folderMenu": {
      "properties": "Properties",
      "rename": "Rename",
      "delete": "Delete"
  },
  "folderProperties": {
      "title": "Folder Properties",
      "created": "Date Created",
      "itemCount": "Contains",
      "totalSize": "Total Size",
      "close": "Close"
  },
  "documents": {
    "uncategorizedTitle": "Uncategorized Documents"
  },
  "documentList": {
    "searchPlaceholder": "Search by name, filename, or notes...",
    "sortByLabel": "Sort by:",
    "sortByRelevance": "Sorting by relevance.",
    "sortOptions": {
      "lastUpdated": "Last Updated",
      "name": "Name (A-Z)",
      "createdAt": "Date Created",
      "size": "Size",
      "itemCount": "Item Count"
    },
    "noDocumentsTitle": "No documents yet",
    "noDocumentsDescription": "Click the '+' button to add your first document or folder.",
    "noDocumentsFoundTitle": "No documents found",
    "noDocumentsFoundDescription": "Try adjusting your search term."
  },
  "documentCard": {
    "delete": "DELETE",
    "deleteConfirmation": "Are you sure you want to delete this document and all its versions? This action cannot be undone.",
    "versions": "{{count}} version",
    "versions_plural": "{{count}} versions",
    "fileSize": "Size: {{size}}",
    "lastUpdated": "Last updated: {{date}}",
    "viewDetails": "Details",
    "view": "View",
    "addNewVersion": "Add Version",
    "share": "Share",
    "shareError": "Your browser does not support sharing files directly.",
    "thumbnailAlt": "Thumbnail preview of {{docName}}"
  },
  "uploadModal": {
    "titleNew": "Add New Document",
    "titleUpdate": "Add version to \"{{docName}}\"",
    "docNameLabel": "Document Name",
    "docNamePlaceholder": "e.g., Car Insurance",
    "uploadFileLabel": "Upload File",
    "changeFile": "Change file",
    "uploadFile": "Upload files",
    "addMoreFiles": "Add more files",
    "dragAndDrop": "or drag and drop",
    "fileTypes": "PDF, JPG, PNG, etc.",
    "versionNotesLabel": "Version Notes (Optional)",
    "versionNotesPlaceholder": "e.g., Policy for 2024-2025",
    "errorNoFile": "Please select a file to upload.",
    "errorNoName": "Please enter a name for the document.",
    "errorReadFile": "Could not read the file.",
    "errorReadingFile": "Error reading file.",
    "cancel": "Cancel",
    "save": "Save Document",
    "saveZip": "Save as ZIP",
    "savePdf": "Save as PDF",
    "selectedFiles": "Selected Files:",
    "remove": "Remove",
    "compressing": "Processing..."
  },
  "documentDetailModal": {
    "title": "Version History",
    "version": "Version {{versionNumber}}",
    "latest": "Latest",
    "uploadedOn": "Uploaded on: {{date}}",
    "download": "Download",
    "close": "Close"
  },
  "authModal": {
    "titleSetup": "Set a Password",
    "titleUnlock": "Enter Password",
    "descriptionSetup": "This password protects your document vault. You will need it to access your data. Don't lose it!",
    "descriptionUnlock": "Enter your password to unlock your document vault.",
    "passwordLabel": "Password",
    "unlockButton": "Unlock",
    "setupButton": "Create Vault",
    "error": "Incorrect password. Please try again.",
    "forgotPassword": "Forgot Password?",
    "resetTitle": "Reset Vault?",
    "resetVault": "Reset Vault & Delete All Data",
    "resetWarning": "WARNING: This will permanently delete all your documents and folders. Since your data is encrypted with your password, it is impossible to recover it without the password. This action cannot be undone.",
    "confirmReset": "Yes, Delete Everything",
    "cancel": "Cancel",
    "recoveryTitle": "Save Your Recovery Key",
    "recoveryDesc": "If you forget your password, this is the ONLY way to recover your data. Save it somewhere safe!",
    "recoveryWarning": "We cannot recover this key for you. If you lose it and your password, your data is gone forever.",
    "savedRecoveryKey": "I have saved my Recovery Key",
    "useRecoveryKey": "Use Recovery Key",
    "backToLogin": "Back to Password Login",
    "titleRecovery": "Recover Vault",
    "descriptionRecovery": "Enter your Recovery Key (XXXX-XXXX-...) to unlock your vault.",
    "recoveryLabel": "Recovery Key",
    "recoverButton": "Recover Vault",
    "errorRecovery": "Invalid Recovery Key. Please check and try again.",
    "downloadKey": "Download Key (.txt)"
  },
  "changePasswordModal": {
    "title": "Settings & Password",
    "newPassword": "New Password",
    "confirmPassword": "Confirm New Password",
    "submit": "Change Password",
    "errorLength": "Password must be at least 4 characters long.",
    "errorMatch": "Passwords do not match.",
    "errorGeneric": "An error occurred while changing the password.",
    "recoveryMessage": "You accessed your vault using a recovery key. Please set a new password now.",
    "recoveryKeyTitle": "Recovery Key",
    "recoveryKeyDesc": "You can view or download your recovery key here. Keep it safe.",
    "showKey": "Show Recovery Key"
  },
  "cameraModal": {
    "title": "Scan Document",
    "capture": "Capture",
    "capturePage": "Capture Page",
    "retake": "Retake",
    "save": "Save ({{count}} page)",
    "save_plural": "Save ({{count}} pages)",
    "saveAsPdf": "Save as PDF",
    "saveAsZip": "Save as ZIP",
    "saveOptionsTitle": "Save Options",
    "pdfDescription": "Combines all pages into one easy-to-share PDF file.",
    "zipDescription": "Saves each page as a separate image in a single .zip file.",
    "backToCapture": "Back to Capture",
    "savingPdf": "Saving PDF...",
    "savingZip": "Saving ZIP...",
    "errorNoCamera": "Could not access the camera. Please check permissions.",
    "errorNoCapture": "Please capture at least one page.",
    "errorNoName": "Please enter a name for the document.",
    "docNameLabel": "Document Name",
    "docNamePlaceholder": "e.g., Scanned Receipt",
    "pages": "Pages"
  },
  "aria": {
    "addNewDocument": "Add new document",
    "createNewFolder": "Create new folder",
    "renameFolder": "Rename folder {{folderName}}",
    "deleteDocument": "Delete {{docName}}",
    "shareDocument": "Share {{docName}}",
    "deleteFolder": "Delete folder {{folderName}}",
    "viewDocument": "View {{docName}}",
    "downloadDocument": "Download {{docName}}",
    "scanDocument": "Scan a document with camera",
    "settings": "Settings & Password"
  }
};
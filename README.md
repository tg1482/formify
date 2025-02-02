# Formify

![Formify Logo](media/demo.gif)

Chrome Store link - https://chromewebstore.google.com/detail/formify/jkipfkohehajmidgmlhjljbngnjijfjo

Formify is a Chrome extension that assists with form filling by automatically saving and retrieving form inputs locally.

## Features

- Automatic saving of form inputs
- Side panel for easy access to saved data
- Context-aware search functionality
- Data retention strategy with customizable settings
- Privacy-focused: all data stored locally

## Installation in Developer Mode

1. Clone this repository or download the source code.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable "Developer mode" in the top right corner.
4. Click "Load unpacked" and select the project directory.

## Usage

- Press Control + O to toggle the side-panel. Alternatively, Right-Click on the Formify icon in your Chrome toolbar and open side panel
- Use the side panel to search and manage your saved form data.
- As you fill out forms on websites, Formify will automatically save your inputs.
- Use the context menu or keyboard shortcuts to quickly access Formify features.

## File Structure

- `manifest.json`: Extension configuration file
- `background.js`: Background service worker script
- `content.js`: Content script for interacting with web pages
- `sidebar.html`: HTML for the side panel
- `sidebar.js`: JavaScript for the side panel functionality
- `db.js`: Module for handling IndexedDB operations
- `icons/`: Directory containing extension icons

## Development

To set up the project for development:

1. Make changes to the source files as needed.
2. Load the extension in Chrome with Developer Mode activated.
3. After making changes, reload the extension in Chrome to see the updates.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Privacy

Formify stores all data locally in your browser using IndexedDB. No data is sent to external servers, ensuring your privacy and data security.

## Support

If you encounter any issues or have questions, please file an issue on the GitHub repository.

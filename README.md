# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.






<!-- Frontend Setup -->

## npm install
## npm run dev
## Frontend is built using:
React + Vite
React Hooks
Native CSS

<!-- Backend Setup -->
## cd server
## npm install
## node server.js
Backend uses:
Express.js
Multer
PDF.js
Node Canvas
Google Gemini API

## Environment Variables
Create .env file inside server folder:
GEMINI_API_KEY=your_api_key_here

## Short Explanation of the Approach
The application allows users to upload scanned PDF forms and automatically extracts form fields using AI.

## PDF Upload
The frontend uploads the PDF file using FormData to the Express backend.

## PDF to Image Conversion
Using pdfjs-dist and canvas, the first page of the PDF is rendered as an image.

## AI-Based Field Extraction
The generated image is sent to the Google Gemini Vision model.
The AI analyzes:

field labels
field values
checkbox states
field types
bounding box coordinates (bbox)
The response is returned in structured JSON format.

## Dynamic Form Rendering
The frontend dynamically generates form inputs using the extracted field metadata.

## PDF/Image Highlight Sync
When a user focuses on an input field:
the related area in the PDF image is highlighted
scrolling automatically moves to the detected region
This is achieved using the extracted bbox coordinates.

## State Management Strategy
The application currently uses React built-in state management:
useState
useEffect
useRef
useContext (optional for shared state)

## Why This Approach?
The project is relatively medium-sized, so React hooks are sufficient and lightweight.
State is mainly used for:
uploaded PDF image
extracted fields
active/focused field
highlight coordinates
image scaling data
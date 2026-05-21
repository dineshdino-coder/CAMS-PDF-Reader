import DynamicForm from "./components/forms/DynamicForm.jsx";
import PdfRenderer from "./components/pdfRenderer/PdfRender.jsx";
import { useState } from "react";
import {staticImage} from "./components/forms/samplevalue.js";
import { Contextapi } from "./components/contextapi/Contextapi.jsx";
import './styles/app.css'

function App() {

  const [pdfImg, setPdfImg] = useState(staticImage);
  const [fieldcoord, setFieldcoord] = useState(null);

  function handlePdfImage(imageData,fields) {
    imageData ? setPdfImg(imageData) : fields ? setFieldcoord(fields) : null;
  }


  return (
    <Contextapi.Provider value={{pdfImg, fieldcoord, handlePdfImage}}>
    <div className="app-root">
      <div className="pdf-panel">
        <PdfRenderer />
        <DynamicForm />
      </div>
    </div>
    </Contextapi.Provider>
  )
}

export default App

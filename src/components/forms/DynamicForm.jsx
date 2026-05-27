import React, { useEffect, useRef, useState } from "react";
import "./DynamicForm.css";
import samplePdf from "../../assets/sample-form.pdf";
import { useContext } from "react";
import { Contextapi } from "../contextapi/Contextapi.jsx";
import { staticformData } from "./samplevalue";

export default function DynamicForm(props) {
  const [fields, setFields] = useState([]);
  const [activeField, setActiveField] = useState(null);
  const { handlePdfImage } = useContext(Contextapi);
  const [usingFields, setUsingFields] = useState(false);
  const [loading, setLoading] = useState(false);

  async function uploadSamplePdf() {
    try {
      setLoading(true);
      const res = await fetch(samplePdf);
      const blob = await res.blob();
      const formData = new FormData();
      console.log("Blob to upload:", blob);
      formData.append("file", blob, "sample-form.pdf");
      console.log("FormData entries:", formData);
      const response = await fetch("http://localhost:5000/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      // const data = staticformData;
      // eslint-disable-next-line no-console
      console.log("upload response", data);
      const imagepdf = data.image;
      handlePdfImage(imagepdf);
      // setFields(data.fields);
      setFields(data.fields.fields);
      setLoading(false);
    } catch (err) {
      setLoading(false);
      console.error("upload error", err);
      alert("Failed to upload PDF. Please try again.", err);
    }
  }

  function handleFieldChange() {
    setUsingFields(true);
    uploadSamplePdf();
  }

  function focusTriggered(field) {
    setActiveField(field);
    handlePdfImage(null, field);
    console.log("Focused field:", field);
  }

  function filterDate(value) {
    if (!value) return "";
    const parts = value.split("/");
    if (parts.length !== 3) return "";
    let [day, month, year] = parts;
    if (year.length === 2) {
      year = "20" + year;
    }
    return `${year}-${month}-${day}`;
  }

  return !usingFields ? (
    <div className="halfWidth">
      <button onClick={() => handleFieldChange()}>Load the Fields</button>
    </div>
  ) : loading ? (
    <div className="halfWidth">
      <div className="rightHalf">
        <div className="loader-container">
          <div className="spinner"></div>

          <p>Reading PDF and extracting fields...</p>
        </div>
      </div>
    </div>
  ) : (
    <form className="dynamic-form" noValidate>
      <h3>Extracted Fields</h3>

      <div className="form-container">
        {fields && fields.length > 0
          ? fields.map(
              (field, index) =>
                index <= 14 && (
                  <div key={field.id} className="form-group">
                    {field.type === "checkbox" ? (
                      <div>
                        <label>{field.label}</label>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onFocus={() => focusTriggered(field)}
                        />
                      </div>
                    ) : field.type == "date" ? (
                      <div>
                        <label>{field.label}</label>
                        <input
                          type={field.type}
                          value={filterDate(field.value)}
                          onFocus={() => focusTriggered(field)}
                          onChange={(e) => {}}
                        />
                      </div>
                    ) : field.type == "text" ? (
                      <div>
                        <label>{field.label}</label>
                        <input
                          type={field.type}
                          value={field.value || ""}
                          onFocus={() => focusTriggered(field)}
                          onChange={(e) => {
                            setFields((prev) =>
                              prev.map((fld) =>
                                fld.id === field.id
                                  ? {
                                      ...fld,
                                      value:
                                        field.validation == "Numeric"
                                          ? e.target.value.replace(/\D/g, "")
                                          : field.validation == "Email format"
                                            ? e.target.value
                                            : e.target.value.replace(
                                                /[^a-zA-Z ]/g,
                                                "",
                                              ),
                                    }
                                  : fld,
                              ),
                            );
                          }}
                        />
                      </div>
                    ) : null}
                  </div>
                ),
              // ),
            )
          : null}
      </div>
    </form>
  );
}

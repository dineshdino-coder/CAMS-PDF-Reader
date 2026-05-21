import { useEffect, useRef, useState } from "react";
import samplePdf from "../../assets/sample-form.pdf";
import "./PdfRender.css";
import { staticCoOrdi } from "../forms/samplevalue";
import { useContext } from "react";
import { Contextapi } from "../contextapi/Contextapi";


export default function PdfRenderer(props) {
  const [pdfUrl] = useState(samplePdf + "#toolbar=0&navpanes=0&scrollbar=0");
  const { fieldcoord, pdfImg } = useContext(Contextapi);
  const wrapperRef = useRef(null);

  const imgRef = useRef(null);

  // const fieldcoord = props?.fieldcoord;

  const [imageSize, setImageSize] = useState({
    width: 0,
    height: 0,
  });


  const originalWidth = props.imageWidth || imageSize.width;

  const originalHeight = props.imageHeight || imageSize.height;

  // DISPLAYED IMAGE SIZE

  // SCALE
  const scaleX = imageSize.width / originalWidth;

  const scaleY = imageSize.height / originalHeight;

  // AUTO SCROLL
  useEffect(() => {
    if (fieldcoord && wrapperRef.current) {
      wrapperRef.current.scrollTo({
        top: fieldcoord.bbox.top * scaleY - 200,

        left: fieldcoord.bbox.left * scaleX - 100,

        behavior: "smooth",
      });
    }
  }, [fieldcoord, scaleX, scaleY]);

  return (
    <div className="pdf-root">
      <div className="pdf-canvas">
        {pdfImg ? (
          <div
            ref={wrapperRef}
            className="pdf-image-wrapper"
            style={{
              position: "relative",
              overflow: "auto",
              height: "100%",
            }}
          >
            <img
              ref={imgRef}
              src={`data:image/png;base64,${pdfImg}`}
              alt="pdf"
              style={{
                width: "100%",
                display: "block",
              }}
              onLoad={() => {
                setImageSize({
                  width: imgRef.current.naturalWidth,

                  height: imgRef.current.naturalHeight,
                });
              }}
            />

            {/* HIGHLIGHT */}
            {fieldcoord?.bbox && (
              <div
                style={{
                  position: "absolute",

                  left: staticCoOrdi[fieldcoord.id].bbox.left * scaleX,

                  top: staticCoOrdi[fieldcoord.id].bbox.top * scaleY,

                  width: staticCoOrdi[fieldcoord.id].bbox.width * scaleX,

                  height: staticCoOrdi[fieldcoord.id].bbox.height * scaleY,

                  border: "3px solid red",

                  background: "rgba(255,0,0,0.2)",

                  pointerEvents: "none",

                  transition: "all 0.3s ease",

                  boxSizing: "border-box",
                }}
              />
            )}
          </div>
        ) : (
          <iframe src={pdfUrl} className="pdf-iframe" />
        )}
      </div>
    </div>
  );
}

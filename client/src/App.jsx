import React, { useState, useRef, useEffect } from "react";
import DrawingCanvas from "./components/DrawingCanvas";
import jsPDF from "jspdf";
import socket from "./services/socket";
import "./index.css";

function App() {
  const [userType, setUserType] = useState("teacher"); // "teacher" or "student"
  const [pages, setPages] = useState([{ type: "drawing", content: [] }]);
  const [currentPage, setCurrentPage] = useState(0);

  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const dictationPageRef = useRef(null);

  // Initialize SpeechRecognition for teacher
  useEffect(() => {
    if (userType !== "teacher") return;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map((res) => res[0].transcript)
          .join(" ");

        setPages((prev) => {
          const updated = [...prev];
          const pageIndex = dictationPageRef.current ?? currentPage;
          updated[pageIndex] = { type: "speech", content: [{ text: transcript }] };
          socket.emit("noteUpdate", { page: pageIndex, text: transcript });
          return updated;
        });
      };

      recognitionRef.current = recognition;
    }
  }, [currentPage, userType]);

  const toggleSpeech = () => {
    if (!recognitionRef.current) return alert("SpeechRecognition not supported!");
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      dictationPageRef.current = null;
    } else {
      setPages((prev) => {
        const newPages = [...prev, { type: "speech", content: [{ text: "" }] }];
        dictationPageRef.current = newPages.length - 1;
        setCurrentPage(newPages.length - 1);
        return newPages;
      });
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const exportAllPages = () => {
    if (!pages.length) return alert("No pages to export");

    const format = prompt("Enter export format: PNG or PDF")?.toLowerCase();
    if (!format || (format !== "png" && format !== "pdf"))
      return alert("Invalid format");

    const canvasWidth = 800;
    const canvasHeight = 500;
    let pdf = null;
    if (format === "pdf") {
      pdf = new jsPDF({
        orientation: canvasWidth > canvasHeight ? "landscape" : "portrait",
        unit: "px",
        format: [canvasWidth, canvasHeight],
      });
    }

    pages.forEach((page, index) => {
      const canvas = document.createElement("canvas");
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      const ctx = canvas.getContext("2d");

      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (page.type === "speech" || page.type === "text") {
        ctx.fillStyle = "black";
        ctx.font = "20px Arial";
        const words = (page.content[0]?.text || "").split(" ");
        let line = "";
        const lineHeight = 28;
        let y = 40;

        words.forEach((word) => {
          const testLine = line + word + " ";
          const metrics = ctx.measureText(testLine);
          if (metrics.width > canvasWidth - 40) {
            ctx.fillText(line, 20, y);
            line = word + " ";
            y += lineHeight;
          } else {
            line = testLine;
          }
        });
        ctx.fillText(line, 20, y);
      } else if (page.type === "drawing") {
        (page.content || []).forEach((item) => {
          if (item.type === "line") {
            ctx.strokeStyle = item.erase ? "white" : item.color;
            ctx.lineWidth = item.strokeWidth;
            ctx.beginPath();
            const points = item.points;
            if (points.length >= 2) {
              ctx.moveTo(points[0], points[1]);
              for (let i = 2; i < points.length; i += 2) {
                ctx.lineTo(points[i], points[i + 1]);
              }
              ctx.stroke();
            }
          } else if (item.type === "text") {
            ctx.fillStyle = "black";
            ctx.font = `${item.fontSize}px Arial`;
            ctx.fillText(item.text, item.x, item.y);
          }
        });
      }

      const imgData = canvas.toDataURL("image/png");

      if (format === "png") {
        const link = document.createElement("a");
        link.download = `SmartClass_Page_${index + 1}.png`;
        link.href = imgData;
        link.click();
      } else if (format === "pdf") {
        if (index > 0) pdf.addPage([canvasWidth, canvasHeight]);
        pdf.addImage(imgData, "PNG", 0, 0, canvasWidth, canvasHeight);
      }
    });

    if (format === "pdf") pdf.save("SmartClass_Notes.pdf");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4 sm:p-6 md:p-8 w-full overflow-x-hidden">
      <h1 className="text-3xl font-extrabold text-gray-800 mb-6">
        AI-Powered Smart Classroom
      </h1>

      {/* Role Switcher */}
      <div className="flex space-x-4 mb-6 flex-wrap justify-center">
        <button
          className={`px-6 py-2 rounded-full ${userType === "teacher" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
          onClick={() => setUserType("teacher")}
        >
          Teacher
        </button>
        <button
          className={`px-6 py-2 rounded-full ${userType === "student" ? "bg-green-600 text-white" : "bg-gray-200"}`}
          onClick={() => setUserType("student")}
        >
          Student
        </button>
      </div>

      {/* Controls */}
      {userType === "teacher" && (
        <div className="flex space-x-4 mb-6 flex-wrap justify-center">
          <button
            onClick={toggleSpeech}
            className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-full shadow-lg hover:bg-blue-700 transition-colors duration-300"
          >
            {isListening ? "🛑 Stop Dictation" : "Start Speech-to-Text"}
          </button>

          <button
            onClick={exportAllPages}
            className="px-6 py-2 bg-gray-600 text-white font-semibold rounded-full shadow-lg hover:bg-gray-700 transition-colors duration-300"
          >
            Export as PDF/PNG
          </button>
        </div>
      )}

      <DrawingCanvas
        pages={pages}
        setPages={setPages}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        allowDeletePage={true}
        isTeacher={userType === "teacher"}
      />
    </div>
  );
}

export default App;

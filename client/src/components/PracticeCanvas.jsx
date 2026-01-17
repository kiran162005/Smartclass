import React, { useState, useRef } from "react";
import { Stage, Layer, Line, Text, Rect } from "react-konva";
import { 
  RotateCcw, Trash2, Brush, Eraser, Type, Palette, 
  Download, Plus, ChevronLeft, ChevronRight, Mic
} from "lucide-react";
import jsPDF from "jspdf";

const PracticeCanvas = () => {
  const [pages, setPages] = useState([{ content: [] }]);
  const [currentPage, setCurrentPage] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(3);
  const [mode, setMode] = useState("brush");
  const [showColorPalette, setShowColorPalette] = useState(false);
  const [listening, setListening] = useState(false);

  const stageRef = useRef(null);
  const recognitionRef = useRef(null);
  const BASE_WIDTH = 1200;
  const BASE_HEIGHT = 600;

  const colors = [
    "#000000", "#FF0000", "#0000FF", "#00FF00", "#FFA500", 
    "#800080", "#FFC0CB", "#8B4513", "#008080", "#808080"
  ];

  // --- Canvas Handlers ---
  const handleMouseDown = (e) => {
    const pos = e.target.getStage().getPointerPosition();
    if (mode === "brush" || mode === "eraser") {
      setIsDrawing(true);
      const newLine = {
        type: "line",
        points: [pos.x, pos.y],
        color: mode === "eraser" ? "#FFFFFF" : brushColor,
        strokeWidth: mode === "eraser" ? brushSize * 3 : brushSize,
      };
      setPages(prev => {
        const updated = [...prev];
        updated[currentPage].content = [...updated[currentPage].content, newLine];
        return updated;
      });
    } else if (mode === "text") {
      const text = prompt("Enter text:");
      if (text) addTextToCanvas(pos.x, pos.y, text);
      setMode("brush");
    }
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    setPages(prev => {
      const updated = [...prev];
      const content = updated[currentPage].content;
      const lastLine = content[content.length - 1];
      if (lastLine && lastLine.type === "line") {
        lastLine.points = lastLine.points.concat([point.x, point.y]);
      }
      return updated;
    });
  };

  const handleMouseUp = () => setIsDrawing(false);

  const addTextToCanvas = (x, y, text) => {
    const newText = { type: "text", x, y, text, fontSize: 24, color: brushColor, id: Date.now() };
    setPages(prev => {
      const updated = [...prev];
      updated[currentPage].content = [...updated[currentPage].content, newText];
      return updated;
    });
  };

  // --- Page Management ---
  const addPage = () => { setPages(prev => [...prev, { content: [] }]); setCurrentPage(pages.length); };
  const deletePage = () => {
    if (pages.length <= 1) return;
    if (!window.confirm("Delete this page?")) return;
    setPages(prev => { const updated = [...prev]; updated.splice(currentPage, 1); return updated; });
    setCurrentPage(prev => (prev > 0 ? prev - 1 : 0));
  };
  const undo = () => { setPages(prev => { const updated = [...prev]; updated[currentPage].content.pop(); return updated; }); };
  const clearPage = () => { if (!window.confirm("Clear this page?")) return; setPages(prev => { const updated = [...prev]; updated[currentPage].content = []; return updated; }); };

  // --- Speech to Text ---
  const toggleSpeech = () => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      alert("Your browser does not support Speech Recognition.");
      return;
    }
    if (listening) { recognitionRef.current.stop(); setListening(false); }
    else {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = "en-US";
      recognition.onresult = (event) => {
        const transcript = Array.from(event.results).map(result => result[0].transcript).join("");
        addTextToCanvas(100, 100, transcript);
      };
      recognition.onerror = (e) => console.error("Speech recognition error:", e.error);
      recognition.onend = () => setListening(false);
      recognition.start();
      recognitionRef.current = recognition;
      setListening(true);
    }
  };

  // --- Export all pages to PDF ---
  const exportAllPagesPDF = async () => {
    const pdf = new jsPDF("landscape", "px", [BASE_WIDTH, BASE_HEIGHT]);
    for (let i = 0; i < pages.length; i++) {
      const stage = stageRef.current;
      if (!stage) continue;
      const tempPage = currentPage;
      setCurrentPage(i);
      await new Promise(res => setTimeout(res, 50));
      const dataURL = stage.toDataURL({ pixelRatio: 2 });
      if (i > 0) pdf.addPage();
      pdf.addImage(dataURL, "PNG", 0, 0, BASE_WIDTH, BASE_HEIGHT);
      setCurrentPage(tempPage);
    }
    pdf.save("practice-notes.pdf");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-4 mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">✏️ Practice Canvas</h1>
            <p className="text-gray-500 text-sm mt-1">Take notes & practice drawing</p>
          </div>
          <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full font-semibold text-sm">👨‍🎓 Personal</span>
        </div>

        {/* Toolbar */}
        <div className="bg-white rounded-2xl shadow-xl p-2 mb-4">
          <div className="flex flex-wrap gap-2 items-center justify-center text-sm">
            <button onClick={addPage} className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition"><Plus size={16}/> Page</button>
            <button onClick={undo} className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-md hover:bg-gray-200 transition"><RotateCcw size={16}/> Undo</button>
            <button onClick={clearPage} className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-md hover:bg-gray-200 transition"><Trash2 size={16}/> Clear</button>
            <button onClick={deletePage} disabled={pages.length <= 1} className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-700 rounded-md hover:bg-red-100 transition disabled:opacity-50"><Trash2 size={16}/> Delete</button>

            <div className="h-5 w-px bg-gray-300"></div>

            <button onClick={() => setMode("brush")} className={`flex items-center gap-2 px-3 py-2 rounded-md transition ${mode==="brush"?"bg-green-100 text-green-700":"bg-gray-100 hover:bg-gray-200"}`}><Brush size={16}/> Brush</button>
            <button onClick={() => setMode("eraser")} className={`flex items-center gap-2 px-3 py-2 rounded-md transition ${mode==="eraser"?"bg-green-100 text-green-700":"bg-gray-100 hover:bg-gray-200"}`}><Eraser size={16}/> Eraser</button>
            <button onClick={() => setMode("text")} className={`flex items-center gap-2 px-3 py-2 rounded-md transition ${mode==="text"?"bg-green-100 text-green-700":"bg-gray-100 hover:bg-gray-200"}`}><Type size={16}/> Text</button>

            <button onClick={toggleSpeech} className={`flex items-center gap-2 px-3 py-2 rounded-md transition ${listening?"bg-red-100 text-red-700":"bg-gray-100 hover:bg-gray-200"}`}><Mic size={16}/> {listening?"Listening":"Speech"}</button>

            <div className="relative">
              <button onClick={() => setShowColorPalette(p => !p)} className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-md hover:bg-gray-200 transition">
                <Palette size={16}/> <div className="w-5 h-5 rounded-full border-2 border-gray-400" style={{ backgroundColor: brushColor }}></div>
              </button>
              {showColorPalette && (
                <div className="absolute top-full mt-1 bg-white border-2 rounded-2xl shadow-2xl p-2 grid grid-cols-5 gap-1 z-50">
                  {colors.map(color => (
                    <button key={color} onClick={() => { setBrushColor(color); setShowColorPalette(false); }} className="w-6 h-6 rounded-full border-2 border-gray-300 hover:border-green-500 hover:scale-110 transition-all" style={{ backgroundColor: color }} />
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-md">
              <span className="text-gray-700 text-sm">Size:</span>
              <input type="range" min="1" max="40" value={brushSize} onChange={e => setBrushSize(Number(e.target.value))} className="w-20"/>
              <span className="text-gray-700 text-sm">{brushSize}px</span>
            </div>

            <button onClick={exportAllPagesPDF} className="flex items-center gap-2 px-3 py-2 bg-purple-50 text-purple-700 rounded-md hover:bg-purple-100 transition"><Download size={16}/> Export PDF</button>
          </div>
        </div>

        {/* Canvas */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden p-2">
          <Stage width={BASE_WIDTH} height={BASE_HEIGHT} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} ref={stageRef} className="border-2 border-gray-200 rounded-xl" style={{ cursor: mode==="text"?"text":"crosshair", backgroundColor:'#fff' }}>
            <Layer>
              <Rect x={0} y={0} width={BASE_WIDTH} height={BASE_HEIGHT} fill="#FFFFFF"/>
              {pages[currentPage]?.content.map((item, i) => {
                if(item.type==="line") return <Line key={i} points={item.points} stroke={item.color} strokeWidth={item.strokeWidth} tension={0.5} lineCap="round" lineJoin="round" />;
                if(item.type==="text") return <Text key={item.id||i} x={item.x} y={item.y} text={item.text} fontSize={item.fontSize} fill={item.color||'#000'} />;
                return null;
              })}
            </Layer>
          </Stage>
        </div>

        {/* Page Navigation */}
        <div className="mt-4 flex items-center justify-center gap-3">
          <button onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))} disabled={currentPage===0} className="flex items-center gap-2 px-4 py-2 bg-white rounded-md shadow hover:shadow-lg transition disabled:opacity-50"><ChevronLeft size={16}/> Prev</button>
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-md shadow">
            <span className="font-bold text-gray-800">{currentPage+1}</span>
            <span className="text-gray-500 text-sm">of</span>
            <span className="font-bold text-gray-800">{pages.length}</span>
          </div>
          <button onClick={() => setCurrentPage(prev => Math.min(pages.length-1, prev+1))} disabled={currentPage===pages.length-1} className="flex items-center gap-2 px-4 py-2 bg-white rounded-md shadow hover:shadow-lg transition disabled:opacity-50">Next <ChevronRight size={16}/></button>
        </div>
      </div>
    </div>
  );
};

export default PracticeCanvas;

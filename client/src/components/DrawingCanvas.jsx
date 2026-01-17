import React, { useState, useRef, useEffect } from "react";
import { Stage, Layer, Line, Text, Rect } from "react-konva";
import { 
  Plus, RotateCcw, Trash2, Brush, Eraser, Type, Palette, 
  Download, Radio, Mic, MicOff, FileText, ChevronLeft, ChevronRight
} from "lucide-react";
import { jsPDF } from "jspdf";

const DrawingCanvas = ({ isTeacher = true, user, socket }) => {
  const [pages, setPages] = useState([{ content: [], type: "drawing" }]);
  const [currentPage, setCurrentPage] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(3);
  const [mode, setMode] = useState("brush");
  const [showColorPalette, setShowColorPalette] = useState(false);
  const [isLive, setIsLive] = useState(false);
  
  // Speech to Text
  const [isRecording, setIsRecording] = useState(false);
  const [speechText, setSpeechText] = useState("");
  const [recognition, setRecognition] = useState(null);
  
  const stageRef = useRef(null);
  const textareaRef = useRef(null);
  const BASE_WIDTH = 1200;
  const BASE_HEIGHT = 600;
  
  const colors = [
    "#000000", "#FF0000", "#0000FF", "#00FF00", "#FFA500", 
    "#800080", "#FFC0CB", "#8B4513", "#008080", "#808080",
    "#FFFF00", "#00FFFF", "#FF00FF", "#C0C0C0", "#FFFFFF"
  ];

  // Initialize Speech Recognition
  useEffect(() => {
    if (!isTeacher) return;
    
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = 'en-US';
      
      recognitionInstance.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) finalTranscript += transcript + ' ';
          else interimTranscript += transcript;
        }
        if (finalTranscript) setSpeechText(prev => prev + finalTranscript);
      };
      
      recognitionInstance.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
      };
      
      recognitionInstance.onend = () => setIsRecording(false);
      setRecognition(recognitionInstance);
    }
  }, [isTeacher]);

  // Socket handlers
  useEffect(() => {
    if (!socket) return;

    if (!isTeacher) {
      socket.on('canvas-live-update', (data) => {
        setPages(data.pages);
        setCurrentPage(data.currentPage);
      });
      socket.on('canvas-live-status', (status) => setIsLive(status));
    }

    return () => {
      socket.off('canvas-live-update');
      socket.off('canvas-live-status');
    };
  }, [isTeacher, socket]);

  // Broadcast when live
  useEffect(() => {
    if (isTeacher && isLive && socket) {
      socket.emit('canvas-live-update', { pages, currentPage });
    }
  }, [pages, currentPage, isLive, isTeacher, socket]);

  // Drawing handlers
  const handleMouseDown = (e) => {
    if (!isTeacher || pages[currentPage].type === "speech") return;
    
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
      if (text) {
        const newText = {
          type: "text",
          x: pos.x,
          y: pos.y,
          text,
          fontSize: 24,
          color: brushColor,
          id: Date.now()
        };
        setPages(prev => {
          const updated = [...prev];
          updated[currentPage].content = [...updated[currentPage].content, newText];
          return updated;
        });
      }
      setMode("brush");
    }
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || !isTeacher) return;
    
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

  // Page management
  const addDrawingPage = () => { if (!isTeacher) return; setPages(prev => [...prev, { content: [], type: "drawing" }]); setCurrentPage(pages.length); };
  const addSpeechPage = () => { if (!isTeacher) return; setPages(prev => [...prev, { content: "", type: "speech" }]); setCurrentPage(pages.length); setSpeechText(""); };
  const deletePage = () => { if (!isTeacher || pages.length <= 1) return; if (!window.confirm("Delete this page?")) return; setPages(prev => { const updated = [...prev]; updated.splice(currentPage, 1); return updated; }); setCurrentPage(prev => (prev > 0 ? prev - 1 : 0)); };
  const undo = () => { if (!isTeacher) return; if (pages[currentPage].type === "drawing") setPages(prev => { const updated = [...prev]; updated[currentPage].content = updated[currentPage].content.slice(0, -1); return updated; }); };
  const clearPage = () => { if (!isTeacher) return; if (!window.confirm("Clear this page?")) return; setPages(prev => { const updated = [...prev]; if (updated[currentPage].type === "drawing") updated[currentPage].content = []; else { updated[currentPage].content = ""; setSpeechText(""); } return updated; }); };

  const toggleLive = () => { if (!isTeacher) return; const newStatus = !isLive; setIsLive(newStatus); if (socket) socket.emit('canvas-live-status', newStatus); };
  const toggleRecording = () => { if (!recognition) { alert("Speech recognition not supported"); return; } if (isRecording) { recognition.stop(); setIsRecording(false); } else { recognition.start(); setIsRecording(true); } };
  const handleSpeechTextChange = (e) => { const newText = e.target.value; setSpeechText(newText); setPages(prev => { const updated = [...prev]; updated[currentPage].content = newText; return updated; }); };

  // Export to PDF
  const exportToPDF = () => {
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [BASE_WIDTH, BASE_HEIGHT] });
    pages.forEach((page, index) => {
      if (index > 0) pdf.addPage();
      if (page.type === "drawing") {
        const canvas = document.createElement('canvas');
        canvas.width = BASE_WIDTH; canvas.height = BASE_HEIGHT;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);
        page.content.forEach(item => {
          if (item.type === "line") {
            ctx.beginPath(); ctx.strokeStyle = item.color; ctx.lineWidth = item.strokeWidth; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
            for (let i = 0; i < item.points.length; i += 2) i===0?ctx.moveTo(item.points[i], item.points[i+1]):ctx.lineTo(item.points[i], item.points[i+1]);
            ctx.stroke();
          } else if (item.type === "text") {
            ctx.fillStyle = item.color||'#000'; ctx.font = `${item.fontSize}px Arial`; ctx.fillText(item.text, item.x, item.y+item.fontSize);
          }
        });
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, BASE_WIDTH, BASE_HEIGHT);
      } else if (page.type === "speech") { pdf.setFontSize(16); pdf.text(page.content||"", 20, 30, { maxWidth: BASE_WIDTH-40 }); }
    });
    pdf.save(`classroom-notes-${Date.now()}.pdf`);
  };

  const currentPageData = pages[currentPage] || { content: [], type: "drawing" };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-4">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{isTeacher ? "🎨 Teaching Canvas" : "📚 Live Class"}</h1>
              <p className="text-gray-500 mt-0.5 text-sm">{isTeacher ? "Create and broadcast your lessons" : "Watch and learn"}</p>
            </div>
            <div className="flex items-center gap-3">
              {isLive && <div className="flex items-center gap-1.5 bg-red-100 text-red-700 px-3 py-1.5 rounded-full animate-pulse text-sm"><div className="w-2.5 h-2.5 bg-red-500 rounded-full"></div><span className="font-semibold">LIVE</span></div>}
              <span className="bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-full font-semibold text-sm">{isTeacher ? "👨‍🏫 Teacher" : "👨‍🎓 Student"}</span>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        {isTeacher && (
          <div className="bg-white rounded-2xl shadow-xl p-3 mb-4">
            <div className="flex flex-wrap gap-2 items-center justify-center text-sm">

              <button onClick={toggleLive} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-semibold transition-all transform hover:scale-105 ${isLive?'bg-red-500 text-white shadow-lg shadow-red-200':'bg-gray-100 hover:bg-gray-200'}`}><Radio size={16}/>{isLive?'Stop':'Go Live'}</button>

              <button onClick={addDrawingPage} className="flex items-center gap-1 px-3 py-2 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition"><Plus size={16}/> Drawing</button>
              <button onClick={addSpeechPage} className="flex items-center gap-1 px-3 py-2 bg-green-50 text-green-700 rounded-xl hover:bg-green-100 transition"><FileText size={16}/> Text</button>
              <button onClick={undo} className="flex items-center gap-1 px-3 py-2 bg-gray-100 rounded-xl hover:bg-gray-200 transition"><RotateCcw size={16}/> Undo</button>
              <button onClick={clearPage} className="flex items-center gap-1 px-3 py-2 bg-gray-100 rounded-xl hover:bg-gray-200 transition"><Trash2 size={16}/> Clear</button>
              <button onClick={deletePage} disabled={pages.length<=1} className="flex items-center gap-1 px-3 py-2 bg-red-50 text-red-700 rounded-xl hover:bg-red-100 transition disabled:opacity-50"><Trash2 size={16}/> Delete</button>

              {currentPageData.type === "drawing" && <>
                <button onClick={()=>setMode("brush")} className={`flex items-center gap-1 px-3 py-2 rounded-xl transition ${mode==="brush"?'bg-indigo-100 text-indigo-700':'bg-gray-100 hover:bg-gray-200'}`}><Brush size={16}/> Brush</button>
                <button onClick={()=>setMode("eraser")} className={`flex items-center gap-1 px-3 py-2 rounded-xl transition ${mode==="eraser"?'bg-indigo-100 text-indigo-700':'bg-gray-100 hover:bg-gray-200'}`}><Eraser size={16}/> Eraser</button>
                <button onClick={()=>setMode("text")} className={`flex items-center gap-1 px-3 py-2 rounded-xl transition ${mode==="text"?'bg-indigo-100 text-indigo-700':'bg-gray-100 hover:bg-gray-200'}`}><Type size={16}/> Text</button>

                <div className="relative">
                  <button onClick={()=>setShowColorPalette(p=>!p)} className="flex items-center gap-1 px-3 py-2 bg-gray-100 rounded-xl hover:bg-gray-200 transition"><Palette size={16}/><div className="w-5 h-5 rounded-full border-2 border-gray-400" style={{backgroundColor:brushColor}}></div></button>
                  {showColorPalette && <div className="absolute top-full mt-1 bg-white border-2 rounded-2xl shadow-2xl p-2 grid grid-cols-5 gap-1 z-50">
                    {colors.map(c=><button key={c} onClick={()=>{setBrushColor(c); setShowColorPalette(false);}} className="w-8 h-8 rounded-full border-2 border-gray-300 hover:border-indigo-500 hover:scale-110 transition-all" style={{backgroundColor:c}}/>)}
                  </div>}
                </div>

                <div className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-xl text-sm">
                  <span className="font-semibold">Size:</span>
                  <input type="range" min="1" max="40" value={brushSize} onChange={e=>setBrushSize(Number(e.target.value))} className="w-20"/>
                  <span className="font-bold min-w-[40px]">{brushSize}px</span>
                </div>
              </>}

              <button onClick={exportToPDF} className="flex items-center gap-1 px-3 py-2 bg-purple-50 text-purple-700 rounded-xl hover:bg-purple-100 transition"><Download size={16}/> Export PDF</button>

            </div>
          </div>
        )}

        {/* Canvas & Pages (unchanged) */}
        {(isTeacher || isLive) && (
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            {currentPageData.type==="drawing"?(
              <div className="p-3">
                <Stage width={BASE_WIDTH} height={BASE_HEIGHT} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} ref={stageRef} className="border-2 border-gray-200 rounded-xl" style={{cursor:mode==="text"?"text":mode==="eraser"?"not-allowed":"crosshair", backgroundColor:'#fff'}}>
                  <Layer>
                    <Rect x={0} y={0} width={BASE_WIDTH} height={BASE_HEIGHT} fill="#fff"/>
                    {currentPageData.content.map((item,i)=>{
                      if(item.type==="line") return <Line key={i} points={item.points} stroke={item.color} strokeWidth={item.strokeWidth} tension={0.5} lineCap="round" lineJoin="round"/>
                      else if(item.type==="text") return <Text key={item.id||i} x={item.x} y={item.y} text={item.text} fontSize={item.fontSize} fill={item.color||'#000'}/>
                      return null;
                    })}
                  </Layer>
                </Stage>
              </div>
            ):(
              <div className="p-3">
                {isTeacher && <div className="flex gap-2 mb-2"><button onClick={toggleRecording} className={`flex items-center gap-1 px-3 py-2 rounded-xl font-semibold transition ${isRecording?'bg-red-500 text-white animate-pulse':'bg-indigo-500 text-white hover:bg-indigo-600'}`}>{isRecording?<MicOff size={16}/>:<Mic size={16}/>} {isRecording?'Stop':'Start'}</button><span className="text-gray-600 text-sm">{isRecording && "🎤 Listening..."}</span></div>}
                <textarea ref={textareaRef} value={isTeacher?speechText:currentPageData.content} onChange={isTeacher?handleSpeechTextChange:undefined} placeholder={isTeacher?"Speak or type your notes here...":""} readOnly={!isTeacher} className="w-full h-[600px] p-4 text-lg border-2 rounded-xl resize-none focus:outline-none focus:ring-4 focus:ring-indigo-200 bg-white" style={{fontFamily:'Georgia, serif', lineHeight:'1.8'}}/>
              </div>
            )}
          </div>
        )}

        {/* Page Navigation */}
        <div className="mt-4 flex items-center justify-center gap-3">
          <button onClick={()=>setCurrentPage(prev=>Math.max(0,prev-1))} disabled={currentPage===0} className="flex items-center gap-1.5 px-3 py-2 bg-white rounded-xl shadow hover:shadow-lg text-sm disabled:opacity-50"><ChevronLeft size={16}/> Prev</button>
          <span className="font-semibold text-sm">{currentPage+1} / {pages.length}</span>
          <button onClick={()=>setCurrentPage(prev=>Math.min(pages.length-1,prev+1))} disabled={currentPage===pages.length-1} className="flex items-center gap-1.5 px-3 py-2 bg-white rounded-xl shadow hover:shadow-lg text-sm disabled:opacity-50">Next <ChevronRight size={16}/></button>
        </div>

      </div>
    </div>
  );
};

export default DrawingCanvas;

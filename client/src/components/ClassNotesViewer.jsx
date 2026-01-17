import React, { useState, useEffect, useRef } from "react";
import { Stage, Layer, Line, Text } from "react-konva";
import {
  Upload,
  DownloadCloud,
  FileText,
  Trash2,
  X,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import axios from "axios";


export default function ClassNotesViewer({ user, onBack }) {
  const [pages] = useState([{ type: "drawing", content: [] }]); // kept for compatibility
  const [currentPage] = useState(0);
  const [zoom, setZoom] = useState(1);

  const [notes, setNotes] = useState([]);
  const [showUploadForm, setShowUploadForm] = useState(false);

  // upload form state
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const dropRef = useRef(null);

  useEffect(() => {
    fetchNotes();
  }, []);

  // Fetch uploaded notes from server
  const fetchNotes = async () => {
    try {
      const res = await axios.get("http://localhost:5000/notes");
      // Expecting array; handle safety
      const data = Array.isArray(res.data) ? res.data : res.data.notes || [];
      setNotes(data);
    } catch (err) {
      console.error("Fetch notes error:", err);
    }
  };

  // Drag & drop handlers
  useEffect(() => {
    const el = dropRef.current;
    if (!el) return;

    const handleDragOver = (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      el.classList.add("ring-2", "ring-indigo-300");
    };
    const handleDragLeave = () => {
      el.classList.remove("ring-2", "ring-indigo-300");
    };
    const handleDrop = (e) => {
      e.preventDefault();
      el.classList.remove("ring-2", "ring-indigo-300");
      const droppedFile = e.dataTransfer.files?.[0];
      if (droppedFile) handleFileSelected(droppedFile);
    };

    el.addEventListener("dragover", handleDragOver);
    el.addEventListener("dragleave", handleDragLeave);
    el.addEventListener("drop", handleDrop);

    return () => {
      el.removeEventListener("dragover", handleDragOver);
      el.removeEventListener("dragleave", handleDragLeave);
      el.removeEventListener("drop", handleDrop);
    };
  }, [dropRef.current]);

  const handleFileSelected = (f) => {
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) {
      setUploadError("File too large. Max 10MB allowed.");
      return;
    }
    setFile(f);
    setUploadError("");
  };

  const handleFileInput = (e) => {
    const f = e.target.files?.[0];
    handleFileSelected(f);
  };

  const cancelUpload = () => {
    setFile(null);
    setTitle("");
    setDescription("");
    setUploadError("");
    setUploadProgress(0);
    setShowUploadForm(false);
  };

  const handleUpload = async () => {
    if (!file) {
      setUploadError("Please select a file first.");
      return;
    }

    setIsUploading(true);
    setUploadError("");
    setUploadSuccess(false);
    setUploadProgress(0);

    const fd = new FormData();
    fd.append("file", file);
    if (title.trim()) fd.append("title", title.trim());
    if (description.trim()) fd.append("description", description.trim());

    try {
      const res = await axios.post("http://localhost:5000/notes", fd, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
          setUploadProgress(percent);
        },
      });

      // success
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 2500);

      // reset
      setFile(null);
      setTitle("");
      setDescription("");
      setShowUploadForm(false);
      setUploadProgress(0);

      // refresh list
      await fetchNotes();
    } catch (err) {
      console.error("Upload failed:", err);
      setUploadError(err.response?.data?.message || "Upload failed — try again.");
    } finally {
      setIsUploading(false);
    }
  };

  // delete note
  const handleDelete = async (noteId) => {
    if (!window.confirm("Delete this study material?")) return;
    try {
      await axios.delete(`http://localhost:5000/notes/${noteId}`);
      setNotes((prev) => prev.filter((n) => n._id !== noteId));
    } catch (err) {
      console.error("Delete error:", err);
      alert("Failed to delete — try again.");
    }
  };

  // small helpers
  const formatFileSize = (bytes) => {
    if (!bytes) return "N/A";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const getFileIcon = (fileName) => {
    if (!fileName) return "📄";
    const ext = fileName.split(".").pop().toLowerCase();
    const map = { pdf: "📕", doc: "📘", docx: "📘", txt: "📝", zip: "🗜️", rar: "🗜️" };
    return map[ext] || "📄";
  };

  // Konva preview helpers (kept minimal — no interactive editing here)
  const zoomIn = () => setZoom((z) => Math.min(2, +(z + 0.1).toFixed(2)));
  const zoomOut = () => setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(2)));
  const prevPage = () => {};
  const nextPage = () => {};

  // UI: Student-dashboard style = light blue + white
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <FileText size={26} className="text-sky-600" />
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Study Materials</h1>
              <p className="text-sm text-slate-500">Upload, download and manage class notes</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="text-slate-600 hover:text-sky-600 flex items-center gap-1 rounded px-2 py-1"
              >
                <ArrowLeft size={16} /> Back
              </button>
            )}
            {user?.role === "teacher" && (
              <button
                onClick={() => setShowUploadForm((s) => !s)}
                className="bg-sky-600 text-white px-4 py-2 rounded-lg hover:bg-sky-700 transition flex items-center gap-2"
              >
                <Upload size={16} /> Upload Material
              </button>
            )}
          </div>
        </div>

        {/* Upload area */}
        {user?.role === "teacher" && showUploadForm && (
          <div className="mb-6">
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <div className="flex flex-col md:flex-row gap-4">
                {/* Left: drag/drop + preview */}
                <div
                  ref={dropRef}
                  className={`flex-1 border-2 border-dashed rounded-lg p-4 flex flex-col justify-center items-center text-center transition ${
                    file ? "border-sky-300 bg-sky-50" : "border-gray-200 hover:border-sky-300"
                  }`}
                >
                  <input
                    id="note-file-input"
                    type="file"
                    accept=".pdf,.doc,.docx,.txt,.zip,.rar"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                  {!file ? (
                    <>
                      <div className="text-sky-500 mb-2">
                        <Upload size={32} />
                      </div>
                      <p className="text-sm text-slate-600">Drag & drop a file here, or</p>
                      <label htmlFor="note-file-input" className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 bg-white border rounded text-sm cursor-pointer hover:bg-sky-50">
                        <span className="text-sky-600 font-medium">Choose a file</span>
                      </label>
                      <p className="text-xs text-slate-400 mt-2">PDF / DOC / DOCX / TXT / ZIP — max 10MB</p>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <FileText size={20} className="text-sky-600" />
                        <div className="text-left">
                          <div className="font-medium text-slate-800">{file.name}</div>
                          <div className="text-xs text-slate-500">{formatFileSize(file.size)}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => setFile(null)}
                        className="mt-3 text-sm text-slate-500 hover:text-red-600"
                      >
                        Remove file
                      </button>
                    </>
                  )}
                </div>

                {/* Right: meta + actions */}
                <div className="w-full md:w-1/3 flex flex-col gap-3">
                  <input
                    type="text"
                    placeholder="Title (optional)"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full border px-3 py-2 rounded-lg focus:ring-2 focus:ring-sky-300"
                  />
                  <textarea
                    placeholder="Short description (optional)"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full border px-3 py-2 rounded-lg focus:ring-2 focus:ring-sky-300 resize-none"
                    rows={4}
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleUpload}
                      disabled={!file || isUploading}
                      className={`flex-1 inline-flex justify-center items-center gap-2 px-4 py-2 rounded-lg font-semibold transition ${
                        file && !isUploading ? "bg-sky-600 text-white hover:bg-sky-700" : "bg-gray-200 text-slate-500 cursor-not-allowed"
                      }`}
                    >
                      {isUploading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Uploading {uploadProgress > 0 && `${uploadProgress}%`}
                        </>
                      ) : (
                        <>
                          <Upload size={16} /> Upload
                        </>
                      )}
                    </button>
                    <button onClick={cancelUpload} className="px-4 py-2 bg-white border rounded-lg hover:bg-gray-50">
                      Cancel
                    </button>
                  </div>

                  {uploadProgress > 0 && isUploading && (
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden mt-2">
                      <div className="h-2 bg-sky-500" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  )}

                  {uploadSuccess && (
                    <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-100 px-3 py-2 rounded mt-2">
                      <CheckCircle size={16} /> Uploaded successfully
                    </div>
                  )}
                  {uploadError && (
                    <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-100 px-3 py-2 rounded mt-2">
                      <AlertCircle size={16} /> {uploadError}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Canvas preview (if any drawing content) */}
        {pages?.[currentPage]?.content?.length > 0 && (
          <div className="mb-6 bg-white border rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="font-medium text-slate-800">Canvas Preview</div>
              <div className="flex items-center gap-2">
                <button onClick={zoomOut} className="p-2 rounded bg-gray-100 hover:bg-gray-200"><ZoomOut size={16} /></button>
                <div className="text-sm text-slate-600">{Math.round(zoom * 100)}%</div>
                <button onClick={zoomIn} className="p-2 rounded bg-gray-100 hover:bg-gray-200"><ZoomIn size={16} /></button>
                <button onClick={prevPage} className="p-2 rounded bg-gray-100 hover:bg-gray-200"><ChevronLeft size={16} /></button>
                <button onClick={nextPage} className="p-2 rounded bg-gray-100 hover:bg-gray-200"><ChevronRight size={16} /></button>
              </div>
            </div>

            <div className="border rounded-md overflow-auto">
              <Stage width={900} height={500} scaleX={zoom} scaleY={zoom}>
                <Layer>
                  {(pages[currentPage]?.content || []).map((item, i) =>
                    item.type === "line" ? (
                      <Line key={i} points={item.points} stroke={item.color} strokeWidth={item.strokeWidth} lineCap="round" lineJoin="round" />
                    ) : (
                      <Text key={i} x={item.x} y={item.y} text={item.text} fontSize={item.fontSize || 14} fill="#333" />
                    )
                  )}
                </Layer>
              </Stage>
            </div>
          </div>
        )}

        {/* Notes list - SINGLE COLUMN (one per row) */}
        <div className="space-y-4">
          {notes.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
              <FileText size={40} className="text-slate-400 mx-auto mb-3" />
              <div className="text-slate-600 font-medium">No study materials uploaded yet</div>
              {user?.role === "teacher" && <div className="text-sm text-slate-400 mt-2">Use Upload Material to add files</div>}
            </div>
          ) : (
            <div className="space-y-3">
              {notes.map((note) => (
                <div
                  key={note._id}
                  className="bg-white border rounded-lg p-4 flex flex-col md:flex-row gap-4 items-start shadow-sm hover:shadow-md transition"
                >
                  <div className="w-full md:w-1/12 flex items-center justify-center text-3xl">
                    {getFileIcon(note.fileName || note.filePath)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="pr-4">
                        <div className="font-semibold text-slate-800 truncate">{note.title || note.fileName}</div>
                        {note.description && <div className="text-sm text-slate-600 mt-1 line-clamp-2">{note.description}</div>}
                        <div className="text-xs text-slate-500 mt-2">
                          {note.date ? new Date(note.date).toLocaleDateString() : ""} {note.fileSize ? `• ${formatFileSize(note.fileSize)}` : ""}
                        </div>
                      </div>

                      <div className="flex-shrink-0 flex items-center gap-2">
                        <a
                          href={`http://localhost:5000${note.fileUrl || note.filePath}`}
                          download
                          className="inline-flex items-center gap-2 px-3 py-2 bg-sky-600 text-white rounded-lg text-sm hover:bg-sky-700 transition"
                        >
                          <DownloadCloud size={16} /> Download
                        </a>

                        {user?.role === "teacher" && (
                          <button
                            onClick={() => handleDelete(note._id)}
                            className="px-3 py-2 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import React, { useState, useRef } from "react";
import { loginUser, signupUser } from "../services/api";

export default function FileUploader() {
  const [files, setFiles] = useState([]);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files).map((file) => ({
      file,
      caption: "",
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  };

  const handleRemoveFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClearAll = () => setFiles([]);

  const handleCaptionChange = (index, value) => {
    setFiles((prev) =>
      prev.map((f, i) => (i === index ? { ...f, caption: value } : f))
    );
  };

  const handleUpload = (index) => {
    const fileObj = files[index];
    // Placeholder: Implement actual upload logic here
    alert(`Uploading: ${fileObj.file.name}\nCaption: ${fileObj.caption}`);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files).map((file) => ({
      file,
      caption: "",
    }));
    setFiles((prev) => [...prev, ...droppedFiles]);
  };

  const handleDragOver = (e) => e.preventDefault();

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-4xl mx-auto">
      <h2 className="text-2xl font-semibold mb-4 text-gray-800">Class Notes / PDFs</h2>

      {/* Drag & Drop Zone */}
      <div
        className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 cursor-pointer hover:border-indigo-400"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => fileInputRef.current.click()}
      >
        <p className="text-gray-500 mb-2">Drag & drop files here, or click to browse</p>
        <p className="text-gray-400 text-sm">{files.length} file(s) selected</p>
        <input
          type="file"
          multiple
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Files List */}
      {files.length > 0 && (
        <div className="mt-4">
          <ul className="space-y-3 max-h-80 overflow-y-auto border border-gray-200 rounded-md p-3 bg-gray-50">
            {files.map((fileObj, index) => (
              <li
                key={index}
                className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white px-3 py-2 rounded shadow-sm gap-2"
              >
                <div className="flex-1">
                  <p className="text-gray-700 font-medium">{fileObj.file.name}</p>
                  <input
                    type="text"
                    placeholder="Enter caption/details..."
                    value={fileObj.caption}
                    onChange={(e) => handleCaptionChange(index, e.target.value)}
                    className="mt-1 w-full border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                <div className="flex gap-2 mt-2 md:mt-0">
                  <button
                    onClick={() => handleUpload(index)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-500 text-sm"
                  >
                    Upload
                  </button>
                  <button
                    onClick={() => handleRemoveFile(index)}
                    className="px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <div className="flex justify-between mt-3">
            <span className="text-gray-600 text-sm">{files.length} file(s) selected</span>
            <button
              onClick={handleClearAll}
              className="px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
            >
              Clear All
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

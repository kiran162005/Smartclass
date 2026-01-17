import { useState, useEffect } from "react";
import { 
  FileText, Plus, Trash2, Send, Calendar, Clock, 
  CheckCircle, XCircle, Award, Users, Upload, Download, File
} from "lucide-react";
import socket from "../services/socket";
import {
  getAssignments,
  createAssignment,
  deleteAssignment,
  getSubmissions,
  checkSubmission,
  submitAssignment,
  gradeSubmission,
} from "../services/api";

// ========================
// Helper Components
// ========================
const InfoItem = ({ icon: Icon, label, value, extra }) => (
  <div className="flex items-center gap-2 text-gray-600">
    <Icon size={16} />
    <span>{label}: {value} {extra}</span>
  </div>
);

const SubmissionStatus = ({ submitted }) => (
  <div className={`flex items-center gap-2 ${submitted ? 'text-green-600' : 'text-orange-600'}`}>
    {submitted ? <CheckCircle size={16} /> : <XCircle size={16} />}
    <span className="font-semibold">{submitted ? 'Submitted' : 'Not Submitted'}</span>
  </div>
);

const FileDisplay = ({ file, colorClass="blue" }) => (
  <div className={`bg-${colorClass}-50 border-2 border-${colorClass}-200 p-4 rounded-lg mb-3`}>
    <div className="flex items-center gap-3">
      <File size={32} className={`text-${colorClass}-600`} />
      <div className="flex-1">
        <p className="font-semibold text-gray-800">{file.name || file.fileName}</p>
        {file.size && <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>}
      </div>
      {file.url && (
        <a href={`http://localhost:5000${file.url}`} download target="_blank" rel="noopener noreferrer"
          className={`flex items-center gap-2 bg-${colorClass}-600 text-white px-4 py-2 rounded-lg hover:bg-${colorClass}-700 transition`}>
          <Download size={18} /> Download
        </a>
      )}
    </div>
  </div>
);

const TeacherActions = ({ assignment, onView, onDelete }) => (
  <div className="flex gap-2">
    <button onClick={() => onView(assignment)}
      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2">
      <Users size={18} /> View Submissions
    </button>

    <button onClick={() => onDelete(assignment._id)}
      className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition">
      <Trash2 size={18} />
    </button>
  </div>
);

// ========================
// Main Component
// ========================
export default function AssignmentsManager({ user }) {
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [showSubmissions, setShowSubmissions] = useState(false);
  const [newAssignment, setNewAssignment] = useState({ title:"", description:"", startDate:"", endDate:"" });
  const isTeacher = user?.role === "teacher";

  useEffect(() => {
    fetchAssignments();
    socket.on("new-assignment", (a) => setAssignments(prev => [a, ...prev]));
    return () => socket.off("new-assignment");
  }, []);

  const fetchAssignments = async () => setAssignments(await getAssignments().catch(()=>[]));

  // ========================
  // Teacher Functions
  // ========================
  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    await createAssignment({ ...newAssignment, createdBy: user._id, createdByName: user.name });
    setNewAssignment({ title:"", description:"", startDate:"", endDate:"" });
    fetchAssignments();
    alert("✅ Assignment created successfully!");
  };

  const handleDeleteAssignment = async (id) => {
    if (!window.confirm("Delete this assignment? All submissions will be deleted too.")) return;
    await deleteAssignment(id);
    setAssignments(prev => prev.filter(a => a._id !== id));
    alert("✅ Assignment deleted");
  };

  const handleViewSubmissions = async (assignment) => {
    setSubmissions(await getSubmissions(assignment._id).catch(()=>[]));
    setSelectedAssignment(assignment);
    setShowSubmissions(true);
  };

  const handleGrade = async (submissionId, grade, feedback) => {
    await gradeSubmission(submissionId, { grade, feedback });
    setSubmissions(await getSubmissions(selectedAssignment._id).catch(()=>[]));
    alert("✅ Graded successfully!");
  };

  // ========================
  // Student Functions
  // ========================
  const AssignmentCard = ({ assignment }) => {
    const [showForm,setShowForm]=useState(false);
    const [file,setFile]=useState(null);
    const [mySubmission,setMySubmission]=useState(null);
    const [uploading,setUploading]=useState(false);
    const isOverdue = new Date(assignment.endDate) < new Date();
    const hasSubmitted = mySubmission !== null;

    useEffect(()=>{ if(!isTeacher) checkMy(); }, []);

    const checkMy = async ()=>setMySubmission(await checkSubmission(assignment._id,user._id).catch(()=>null));
    const handleFileChange = (e)=>{ const f=e.target.files[0]; if(f && f.size<=10*1024*1024)setFile(f); else alert("Max 10MB"); };
    
    const handleSubmit = async ()=>{
      if(!file) return alert("Select a file");
      setUploading(true);
      try{
        const fd=new FormData();
        fd.append('submissionFile',file);
        fd.append('studentId',user._id);
        fd.append('studentName',user.name);
        await submitAssignment(assignment._id,fd);
        alert("✅ Assignment submitted successfully!");
        setFile(null); setShowForm(false); checkMy();
      }catch(err){ alert(err.response?.data?.message || "Failed"); console.error(err); }
      finally{ setUploading(false); }
    };

    return (
      <div className={`bg-white rounded-2xl shadow-xl overflow-hidden border-2 ${isOverdue&&!isTeacher&&!hasSubmitted?'border-red-300':'border-gray-100'}`}>
        <div className={`p-6 ${isOverdue&&!isTeacher&&!hasSubmitted?'bg-red-50':'bg-gradient-to-r from-indigo-50 to-purple-50'}`}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-gray-800 mb-2">{assignment.title}</h3>
              <p className="text-gray-600 mb-3">{assignment.description}</p>
              <div className="flex flex-wrap gap-4 text-sm">
                <InfoItem icon={Calendar} label="Start" value={new Date(assignment.startDate).toLocaleDateString()} />
                <InfoItem icon={Clock} label="Due" value={new Date(assignment.endDate).toLocaleDateString()} extra={isOverdue?"(Overdue)":""} />
                {!isTeacher && <SubmissionStatus submitted={hasSubmitted} />}
              </div>
            </div>
            {isTeacher && <TeacherActions assignment={assignment} onView={handleViewSubmissions} onDelete={handleDeleteAssignment} />}
          </div>
        </div>
        {!isTeacher && (
          <div className="p-6 border-t">
            {hasSubmitted && mySubmission ? (
              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
                <div className="flex items-center gap-2 text-green-700 font-semibold mb-3"><CheckCircle size={20} /><span>Your Submission</span></div>
                {mySubmission.fileUrl ? <FileDisplay file={{fileName:mySubmission.fileName,url:mySubmission.fileUrl,size:mySubmission.fileSize}} colorClass="green"/> : <p>{mySubmission.submissionText}</p>}
                <div className="text-sm text-gray-500">Submitted: {new Date(mySubmission.submittedAt).toLocaleString()}</div>
                {mySubmission.grade && <div className="mt-3 bg-white p-3 rounded-lg border-2 border-green-200">
                  <div className="font-semibold text-indigo-700 text-lg">Grade: {mySubmission.grade}</div>
                  {mySubmission.feedback && <div className="text-gray-600 mt-1">Feedback: {mySubmission.feedback}</div>}
                </div>}
              </div>
            ) : showForm ? (
              <div className="space-y-4">
                <div className="border-2 border-dashed border-indigo-300 rounded-xl p-8 text-center bg-indigo-50">
                  <input type="file" id={`file-${assignment._id}`} onChange={handleFileChange} accept=".pdf,.doc,.docx,.txt,.zip,.rar" className="hidden"/>
                  <label htmlFor={`file-${assignment._id}`} className="cursor-pointer">
                    <Upload size={48} className="mx-auto mb-4 text-indigo-600" />
                    <p className="text-lg font-semibold text-gray-800 mb-2">Click to upload document</p>
                    <p className="text-sm text-gray-500">PDF, DOC, DOCX, TXT, ZIP (Max 10MB)</p>
                  </label>
                </div>
                {file && <FileDisplay file={file} />}
                <div className="flex gap-3">
                  <button onClick={handleSubmit} disabled={!file||uploading} className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white px-6 py-3 rounded-xl hover:bg-green-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed">
                    {uploading ? <> <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> Uploading...</> : <><Send size={18}/> Submit Assignment</>}
                  </button>
                  <button onClick={()=>{setShowForm(false);setFile(null);}} disabled={uploading} className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition font-semibold">Cancel</button>
                </div>
              </div>
            ) : <button onClick={()=>setShowForm(true)} disabled={isOverdue} className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"><Upload size={18}/> Upload Assignment</button>}
          </div>
        )}
      </div>
    );
  };

  // ========================
  // Main Render
  // ========================
  if (showSubmissions && isTeacher) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6">
            <button onClick={()=>setShowSubmissions(false)} className="text-sm hover:underline mb-2">← Back to assignments</button>
            <h2 className="text-2xl font-bold">{selectedAssignment?.title}</h2>
            <p className="text-indigo-100 mt-1">Submissions ({submissions.length})</p>
          </div>
          <div className="p-6">
            {submissions.length===0 ? (
              <div className="text-center py-12 text-gray-500">
                <Users size={48} className="mx-auto mb-4 opacity-20" />
                <p>No submissions yet</p>
              </div>
            ) : submissions.map(sub=>(<div key={sub._id} className="border-2 rounded-xl p-4 hover:shadow-lg transition">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-lg text-gray-800">{sub.studentName}</h3>
                  <p className="text-sm text-gray-500">Submitted: {new Date(sub.submittedAt).toLocaleString()}</p>
                </div>
                {sub.grade && <div className="bg-green-100 text-green-700 px-4 py-2 rounded-lg font-semibold">Grade: {sub.grade}</div>}
              </div>
              {sub.fileUrl ? <FileDisplay file={{ fileName: sub.fileName, url: sub.fileUrl, size: sub.fileSize }} /> :
                <div className="bg-gray-50 p-4 rounded-lg mb-3"><p className="text-gray-700 whitespace-pre-wrap">{sub.submissionText || "No text content"}</p></div>}
              <div className="flex gap-3">
                <input type="text" placeholder="Grade" defaultValue={sub.grade} className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" id={`grade-${sub._id}`} />
                <input type="text" placeholder="Feedback" defaultValue={sub.feedback} className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" id={`feedback-${sub._id}`} />
                <button onClick={()=>{const grade=document.getElementById(`grade-${sub._id}`).value; const feedback=document.getElementById(`feedback-${sub._id}`).value; handleGrade(sub._id, grade, feedback);}} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2"><Award size={18} /> Save Grade</button>
              </div>
            </div>))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">📚 Assignments</h1>
          <p className="text-gray-500 mt-1">{isTeacher ? "Manage and grade assignments" : "View and submit your assignments"}</p>
        </div>
        <span className="bg-indigo-100 text-indigo-700 px-4 py-2 rounded-full font-semibold">{assignments.length} Total</span>
      </div>
      {isTeacher && (
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Create New Assignment</h2>
          <form onSubmit={handleCreateAssignment} className="space-y-4">
            <input type="text" placeholder="Assignment Title" value={newAssignment.title} 
              onChange={e=>setNewAssignment(prev=>({...prev,title:e.target.value}))}
              className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500" required />
            <textarea placeholder="Description..." value={newAssignment.description}
              onChange={e=>setNewAssignment(prev=>({...prev,description:e.target.value}))}
              className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 resize-none" rows={4} required />
            {["startDate","endDate"].map((field,i)=>(
              <div key={i}>
                <label className="block text-sm font-semibold text-gray-700 mb-2">{field==="startDate"?"Start Date":"Due Date"}</label>
                <input type="date" value={newAssignment[field]}
                  onChange={e=>setNewAssignment(prev=>({...prev,[field]:e.target.value}))}
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500" required />
              </div>
            ))}
            <button type="submit" className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 transition font-semibold">
              <Plus size={20} /> Create Assignment
            </button>
          </form>
        </div>
      )}
      <div className="space-y-4">
        {assignments.length===0 ? (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center text-gray-500">
            <FileText size={48} className="mx-auto mb-4 opacity-20" />
            <p>No assignments yet</p>
          </div>
        ) : assignments.map(a=><AssignmentCard key={a._id} assignment={a} />)}
      </div>
    </div>
  );
  
}

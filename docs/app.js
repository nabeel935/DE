const { useState, useEffect, useMemo } = React;
const { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } = Recharts;

/* ---------------- Utils ---------------- */
const uid = () => Date.now() + Math.floor(Math.random()*1000);
const loadLS = (k,f) => { try { return JSON.parse(localStorage.getItem(k))||f } catch(e){return f} };
const saveLS = (k,v) => localStorage.setItem(k,JSON.stringify(v));
const csvDownload = (rows, filename) => {
  const csv = rows.map(r=>r.map(c=>(`${c}`).replace(/\n/g,' ')).join(',')).join('\n');
  const blob = new Blob([csv],{type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download=filename; a.click(); URL.revokeObjectURL(url);
};

/* ---------------- App ---------------- */
function BromcomFullMIS(){
  const [users,setUsers] = useState(()=>loadLS("users", [{id:uid(),user:"admin",pass:"admin",role:"admin"}]));
  const [current,setCurrent] = useState(()=>loadLS("current",null));
  const [students,setStudents] = useState(()=>loadLS("students",[]));
  const [attendance,setAttendance] = useState(()=>loadLS("attendance",{}));
  const [behaviour,setBehaviour] = useState(()=>loadLS("behaviour",[]));
  const [grades,setGrades] = useState(()=>loadLS("grades",{}));
  const [timetable,setTimetable] = useState(()=>loadLS("timetable",{
    Monday:{P1:"Math",P2:"English",P3:"Physics",P4:"PE",P5:"History"},
    Tuesday:{P1:"Math",P2:"Chemistry",P3:"RE",P4:"Art",P5:"Music"},
    Wednesday:{P1:"English",P2:"Math",P3:"Biology",P4:"Drama",P5:"PSHE"},
    Thursday:{P1:"Geography",P2:"Math",P3:"Computer",P4:"Science",P5:"DT"},
    Friday:{P1:"Form",P2:"Assembly",P3:"Sport",P4:"History",P5:"Languages"}
  }));
  const [detentionLog,setDetentionLog] = useState(()=>loadLS("detentions",[]));
  const [announcement,setAnnouncement] = useState("");
  const [alarmMode,setAlarmMode] = useState(null);
  const [page,setPage] = useState("dashboard");

  /* ---------------- Persist ---------------- */
  useEffect(()=>saveLS("users",users),[users]);
  useEffect(()=>saveLS("current",current),[current]);
  useEffect(()=>saveLS("students",students),[students]);
  useEffect(()=>saveLS("attendance",attendance),[attendance]);
  useEffect(()=>saveLS("behaviour",behaviour),[behaviour]);
  useEffect(()=>saveLS("grades",grades),[grades]);
  useEffect(()=>saveLS("timetable",timetable),[timetable]);
  useEffect(()=>saveLS("detentions",detentionLog),[detentionLog]);

  /* ---------------- Auth ---------------- */
  const doSignup = (u,p,r="teacher")=>{
    if(!u||!p)return alert("Enter username & password");
    if(users.find(x=>x.user===u))return alert("User exists");
    const nu={id:uid(),user:u,pass:p,role:r};
    setUsers(prev=>[...prev,nu]);setCurrent(nu);
  };
  const doLogin=(u,p)=>{const f=users.find(x=>x.user===u&&x.pass===p);if(!f)return alert("Invalid");setCurrent(f);};
  const doLogout=()=>{setCurrent(null);setPage("dashboard");};

  /* ---------------- Students ---------------- */
  const addStudent=(name,className="")=>{if(!name.trim())return;setStudents(prev=>[...prev,{id:uid(),name,className,points:0,detention:false}]);};
  const updateStudent=(id,patch)=>setStudents(prev=>prev.map(s=>s.id===id?{...s,...patch}:s));
  const removeStudent=id=>{if(!confirm("Remove student?"))return;setStudents(prev=>prev.filter(s=>s.id!==id));};

  /* ---------------- Attendance ---------------- */
  const markAttendance=(sid,period,status)=>{
    const date=new Date().toISOString().split("T")[0];
    const dayRec=attendance[date]?{...attendance[date]}:{};
    const perRec=dayRec[period]?{...dayRec[period]}:{};
    perRec[sid]=status;dayRec[period]=perRec;
    setAttendance({...attendance,[date]:dayRec});
  };

  /* ---------------- Behaviour / Detentions ---------------- */
  const addBehaviour=(sid,score,pointsDelta=0,note="")=>{
    const rec={id:uid(),studentId:sid,score,pointsDelta,note,time:new Date().toISOString(),teacher:current?.user||"unknown"};
    setBehaviour(prev=>[rec,...prev]);
    setStudents(prev=>prev.map(s=>{
      if(s.id!==sid)return s;
      const newPoints=(s.points||0)+pointsDelta;
      const triggersDetention=(score===2||score===4||newPoints<=-5);
      if(triggersDetention&&!s.detention){
        setDetentionLog(prev=>[{id:uid(),studentId:s.id,name:s.name,reason:`Behaviour score ${score}`,time:new Date().toLocaleString(),served:false},...prev]);
      }
      return {...s,points:newPoints,detention:triggersDetention};
    }));
  };
  const markDetentionServed=did=>{
    setDetentionLog(prev=>prev.map(d=>d.id===did?{...d,served:true}:d));
    const det=detentionLog.find(d=>d.id===did);
    if(det){setStudents(prev=>prev.map(s=>s.id===det.studentId?{...s,detention:false}:s));}
  };

  /* ---------------- Grades ---------------- */
  const recordGrade=(sid,sub,mark)=>setGrades(prev=>({...prev,[sid]:{...(prev[sid]||{}),[sub]:mark}}));

  /* ---------------- Timetable ---------------- */
  const updateLesson=(day,period,value)=>setTimetable(prev=>({...prev,[day]:{...prev[day],[period]:value}}));

  /* ---------------- Reports ---------------- */
  const exportAttendanceCSV=()=>{
    const rows=[["date","period","student","status"]];
    for(const [date,dayRec] of Object.entries(attendance)){
      for(const [period,perRec] of Object.entries(dayRec||{})){
        for(const s of students)rows.push([date,period,s.name,perRec[s.id]||"absent"]);
      }
    }csvDownload(rows,"attendance.csv");
  };
  const exportBehaviourCSV=()=>{
    const rows=[["student","score","pointsDelta","note","time","teacher"]];
    behaviour.forEach(b=>{const name=students.find(s=>s.id===b.studentId)?.name||b.studentId;rows.push([name,b.score,b.pointsDelta||0,b.note,b.time,b.teacher]);});
    csvDownload(rows,"behaviour.csv");
  };
  const exportDetentionsCSV=()=>{
    const rows=[["student","reason","time","served"]];
    detentionLog.forEach(d=>{rows.push([d.name,d.reason,d.time,d.served?"Yes":"No"]);});
    csvDownload(rows,"detentions.csv");
  };

  /* ---------------- PA / Bell / Alarm ---------------- */
  const [bellSound] = useState("https://www.soundjay.com/button/beep-07.wav");
  const ringBell=()=>{const audio=new Audio(bellSound);audio.play();alert("School Bell!");};
  const triggerLockdown=()=>setAlarmMode("lockdown");
  const triggerFireAlarm=()=>setAlarmMode("fire");
  const dismissAlarm=()=>setAlarmMode(null);
  useEffect(()=>{if(!announcement)return;const t=setTimeout(()=>{try{const u=new SpeechSynthesisUtterance(announcement);speechSynthesis.cancel();speechSynthesis.speak(u);}catch(e){}},500);return()=>clearTimeout(t);},[announcement]);

  /* ---------------- Sidebar ---------------- */
  const Sidebar=()=>(
    <div className="w-64 bg-blue-700 text-white h-screen p-4 flex flex-col">
      <div className="text-2xl font-bold mb-4">AegisSchool</div>
      {[["dashboard","students","attendance","behaviour","detentions","grades","timetable","reports","pa"]][0].map(pn=>
        <button key={pn} className={`w-full text-left p-2 rounded mb-1 ${page===pn?"bg-blue-900":""}`} onClick={()=>setPage(pn)}>
          {pn.charAt(0).toUpperCase()+pn.slice(1)}
        </button>
      )}
      <div className="mt-auto text-sm">
        <div>Signed in: <strong>{current?.user}</strong> ({current?.role})</div>
        <button className="mt-2 w-full bg-red-500 p-2 rounded" onClick={doLogout}>Logout</button>
      </div>
    </div>
  );

  /* ---------------- Render ---------------- */
  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 min-h-screen bg-gray-100 p-6 overflow-auto">
        {alarmMode&&<div className={`fixed inset-0 flex items-center justify-center text-white text-4xl font-bold ${alarmMode==="fire"?"bg-red-700":"bg-orange-600"}`}>
          {alarmMode==="fire"?"🔥 FIRE ALARM! 🔥":"🔒 LOCKDOWN! 🔒"}
          <button className="ml-4 bg-white text-black p-2 rounded text-base" onClick={dismissAlarm}>Dismiss</button>
        </div>}
        <div className="bg-white p-4 rounded shadow mb-4 flex gap-2">
          <button className="bg-yellow-500 p-2 rounded" onClick={ringBell}>Ring School Bell</button>
          <button className="bg-red-600 p-2 rounded text-white" onClick={triggerFireAlarm}>Fire Alarm</button>
          <button className="bg-gray-700 p-2 rounded text-white" onClick={triggerLockdown}>Lockdown</button>
        </div>
        <div className="text-2xl font-bold mb-4">{page.charAt(0).toUpperCase()+page.slice(1)}</div>
        <PageRenderer page={page} {...{students,addStudent,updateStudent,removeStudent,attendance,markAttendance,behaviour,addBehaviour,detentionLog,markDetentionServed,grades,recordGrade,timetable,updateLesson,exportAttendanceCSV,exportBehaviourCSV,exportDetentionsCSV,announcement,setAnnouncement}}/>
      </div>
    </div>
  );
}

/* ---------------- Page Renderer ---------------- */
function PageRenderer(props){
  const {page} = props;
  switch(page){
    case "students": return <div>(Students page placeholder)</div>;
    case "attendance": return <div>(Attendance page placeholder)</div>;
    case "behaviour": return <div>(Behaviour page placeholder)</div>;
    case "detentions": return <div>(Detentions page placeholder)</div>;
    case "grades": return <div>(Grades page placeholder)</div>;
    case "timetable": return <div>(Timetable page placeholder)</div>;
    case "reports": return <div>(Reports page placeholder)</div>;
    case "pa": return <div>(PA / Announcements page placeholder)</div>;
    case "dashboard": return <div>(Dashboard page placeholder)</div>;
    default: return <div>Select a page</div>;
  }
}

/* ---------------- Pages ---------------- */
/* The detailed page JSX was omitted for brevity in the original. Placeholders are used here so the app mounts cleanly. */

ReactDOM.createRoot(document.getElementById("root")).render(<BromcomFullMIS />);

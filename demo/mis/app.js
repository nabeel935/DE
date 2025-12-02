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
    <div className="w-64 bg-blue-700 text-white h-screen p-4 flex flex-col overflow-auto">
      <div className="text-2xl font-bold mb-4">AegisSchool</div>
      {["dashboard","students","attendance","behaviour","detentions","grades","timetable","reports","pa"].map(pn=>
        <button key={pn} className={`w-full text-left p-2 rounded mb-1 text-sm ${page===pn?"bg-blue-900":"hover:bg-blue-600"}`} onClick={()=>setPage(pn)}>
          {pn.charAt(0).toUpperCase()+pn.slice(1)}
        </button>
      )}
      <div className="mt-auto text-xs">
        <div>User: <strong>{current?.user}</strong></div>
        <div className="text-gray-300 mb-2">{current?.role}</div>
        <button className="w-full bg-red-500 p-2 rounded text-sm" onClick={doLogout}>Logout</button>
      </div>
    </div>
  );

  /* ---------------- Auth UI ---------------- */
  const AuthPage=()=>{
    const [u,setU]=useState("");
    const [p,setP]=useState("");
    const [mode,setMode]=useState("login");
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-600 to-blue-800">
        <div className="bg-white p-8 rounded shadow-lg w-96">
          <h1 className="text-3xl font-bold mb-6 text-center text-blue-700">AegisSchool MIS</h1>
          <div className="flex gap-2 mb-4">
            <button className={`flex-1 p-2 rounded ${mode==='login'?'bg-blue-600 text-white':'bg-gray-200'}`} onClick={()=>setMode('login')}>Login</button>
            <button className={`flex-1 p-2 rounded ${mode==='signup'?'bg-blue-600 text-white':'bg-gray-200'}`} onClick={()=>setMode('signup')}>Sign Up</button>
          </div>
          <input className="w-full border p-2 mb-2" placeholder="Username" value={u} onChange={e=>setU(e.target.value)} />
          <input className="w-full border p-2 mb-4" placeholder="Password" type="password" value={p} onChange={e=>setP(e.target.value)} />
          <button className="w-full bg-blue-600 text-white p-2 rounded font-semibold" onClick={()=>mode==='login'?doLogin(u,p):doSignup(u,p,'teacher')}>
            {mode==='login'?'Login':'Sign Up'}
          </button>
          <div className="mt-4 text-sm text-gray-600">
            <div>Demo: admin / admin</div>
          </div>
        </div>
      </div>
    );
  };

  /* ---------------- Render ---------------- */
  if(!current) return <AuthPage />;
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
    case "students": return <StudentsPage {...props}/>;
    case "attendance": return <AttendancePage {...props}/>;
    case "behaviour": return <BehaviourPage {...props}/>;
    case "detentions": return <DetentionsPage {...props}/>;
    case "grades": return <GradesPage {...props}/>;
    case "timetable": return <TimetablePage {...props}/>;
    case "reports": return <ReportsPage {...props}/>;
    case "pa": return <PAPage {...props}/>;
    case "dashboard": return <DashboardPage {...props}/>;
    default: return <div>Select a page</div>;
  }
}

/* ---------------- Pages ---------------- */

function StudentsPage({students,addStudent,updateStudent,removeStudent}){
  const [name,setName]=useState("");
  const [cls,setCls]=useState("");
  return (
    <div className="bg-white p-4 rounded shadow">
      <div className="flex gap-2 mb-4">
        <input className="border p-2 flex-1" placeholder="Student name" value={name} onChange={e=>setName(e.target.value)} />
        <input className="border p-2 w-40" placeholder="Class" value={cls} onChange={e=>setCls(e.target.value)} />
        <button className="bg-blue-600 text-white p-2 rounded" onClick={()=>{addStudent(name,cls);setName("");setCls("")}}>Add</button>
      </div>
      <table className="w-full text-left">
        <thead><tr><th>Name</th><th>Class</th><th>Points</th><th>Detention</th><th></th></tr></thead>
        <tbody>
          {students.map(s=> (
            <tr key={s.id} className="border-t">
              <td><input className="p-1" value={s.name} onChange={e=>updateStudent(s.id,{name:e.target.value})} /></td>
              <td><input className="p-1 w-32" value={s.className||""} onChange={e=>updateStudent(s.id,{className:e.target.value})} /></td>
              <td>{s.points||0}</td>
              <td>{s.detention?"Yes":"No"}</td>
              <td><button className="text-red-600" onClick={()=>removeStudent(s.id)}>Remove</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AttendancePage({students,attendance,markAttendance}){
  const periods=["P1","P2","P3","P4","P5"];
  const [period,setPeriod]=useState(periods[0]);
  const date=new Date().toISOString().split("T")[0];
  const dayRec=(attendance[date]||{});
  const perRec=(dayRec[period]||{});
  return (
    <div className="bg-white p-4 rounded shadow">
      <div className="flex items-center gap-2 mb-4">
        <label className="font-semibold">Date:</label>
        <div>{date}</div>
        <label className="font-semibold ml-4">Period:</label>
        <select value={period} onChange={e=>setPeriod(e.target.value)} className="border p-1">
          {periods.map(p=><option key={p} value={p}>{p}</option>)}
        </select>
      </div>
      <table className="w-full text-left">
        <thead><tr><th>Name</th><th>Status</th></tr></thead>
        <tbody>
          {students.map(s=> (
            <tr key={s.id} className="border-t">
              <td>{s.name}</td>
              <td className="space-x-2">
                <button className={`p-1 rounded ${perRec[s.id]==='present'?'bg-green-200':''}`} onClick={()=>markAttendance(s.id,period,'present')}>Present</button>
                <button className={`p-1 rounded ${perRec[s.id]==='absent'?'bg-red-200':''}`} onClick={()=>markAttendance(s.id,period,'absent')}>Absent</button>
                <button className={`p-1 rounded ${perRec[s.id]==='late'?'bg-yellow-200':''}`} onClick={()=>markAttendance(s.id,period,'late')}>Late</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BehaviourPage({students,behaviour,addBehaviour}){
  const [sid,setSid]=useState(students[0]?.id||"");
  const [score,setScore]=useState(3);
  const [points,setPoints]=useState(0);
  const [note,setNote]=useState("");
  useEffect(()=>{if(!sid && students[0])setSid(students[0].id)},[students]);
  return (
    <div className="bg-white p-4 rounded shadow">
      <div className="flex gap-2 mb-4">
        <select value={sid} onChange={e=>setSid(e.target.value)} className="border p-2">
          {students.map(s=> <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={score} onChange={e=>setScore(Number(e.target.value))} className="border p-2">
          {[1,2,3,4,5].map(n=> <option key={n} value={n}>Score {n}</option>)}
        </select>
        <input className="border p-2 w-24" type="number" value={points} onChange={e=>setPoints(Number(e.target.value))} />
        <input className="border p-2 flex-1" placeholder="Note" value={note} onChange={e=>setNote(e.target.value)} />
        <button className="bg-blue-600 text-white p-2 rounded" onClick={()=>{if(!sid) return alert('Select student'); addBehaviour(sid,score,points,note); setNote(''); setPoints(0);}}>Add</button>
      </div>
      <div>
        <h4 className="font-semibold mb-2">Recent behaviour events</h4>
        <ul>
          {behaviour.map(b=>{
            const name=students.find(s=>s.id===b.studentId)?.name||b.studentId;
            return <li key={b.id} className="border-t py-1">{name} — score {b.score} ({b.pointsDelta||0}) — {b.note}</li>
          })}
        </ul>
      </div>
    </div>
  );
}

function DetentionsPage({detentionLog,markDetentionServed}){
  return (
    <div className="bg-white p-4 rounded shadow">
      <h3 className="font-semibold mb-2">Detention Log</h3>
      <table className="w-full text-left">
        <thead><tr><th>Student</th><th>Reason</th><th>Time</th><th>Served</th><th></th></tr></thead>
        <tbody>
          {detentionLog.map(d=> (
            <tr key={d.id} className="border-t">
              <td>{d.name}</td>
              <td>{d.reason}</td>
              <td>{d.time}</td>
              <td>{d.served?"Yes":"No"}</td>
              <td>{!d.served && <button className="text-green-600" onClick={()=>markDetentionServed(d.id)}>Mark served</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GradesPage({students,grades,recordGrade}){
  const [sid,setSid]=useState(students[0]?.id||"");
  const [sub,setSub]=useState('Math');
  const [mark,setMark]=useState('');
  useEffect(()=>{if(!sid && students[0])setSid(students[0].id)},[students]);
  return (
    <div className="bg-white p-4 rounded shadow">
      <div className="flex gap-2 mb-4">
        <select value={sid} onChange={e=>setSid(e.target.value)} className="border p-2">
          {students.map(s=> <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <input className="border p-2" value={sub} onChange={e=>setSub(e.target.value)} />
        <input className="border p-2 w-24" value={mark} onChange={e=>setMark(e.target.value)} />
        <button className="bg-blue-600 text-white p-2 rounded" onClick={()=>{recordGrade(sid,sub,mark); setMark('');}}>Save</button>
      </div>
      <div>
        <h4 className="font-semibold mb-2">Grades</h4>
        <table className="w-full text-left">
          <thead><tr><th>Student</th><th>Subject</th><th>Mark</th></tr></thead>
          <tbody>
            {students.map(s=>{
              const gs=grades[s.id]||{};
              return Object.keys(gs).map(subj=> (
                <tr key={s.id+subj} className="border-t"><td>{s.name}</td><td>{subj}</td><td>{gs[subj]}</td></tr>
              ));
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TimetablePage({timetable,updateLesson}){
  const days=Object.keys(timetable||{});
  return (
    <div className="bg-white p-4 rounded shadow">
      <h3 className="font-semibold mb-2">Timetable</h3>
      <div className="grid grid-cols-1 gap-4">
        {days.map(day=> (
          <div key={day} className="border p-2">
            <div className="font-semibold mb-2">{day}</div>
            <div className="grid grid-cols-5 gap-2">
              {Object.entries(timetable[day]).map(([period,lesson])=> (
                <div key={period}>
                  <div className="text-sm font-medium">{period}</div>
                  <input className="border p-1 w-40" value={lesson} onChange={e=>updateLesson(day,period,e.target.value)} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReportsPage({exportAttendanceCSV,exportBehaviourCSV,exportDetentionsCSV,students,attendance,behaviour}){
  return (
    <div className="bg-white p-4 rounded shadow">
      <h3 className="font-semibold mb-4 text-lg">Reports & Exports</h3>
      <div className="flex gap-2 mb-4 flex-wrap">
        <button className="bg-gray-700 text-white p-2 rounded">📊 Export Attendance CSV</button>
        <button className="bg-gray-700 text-white p-2 rounded" onClick={exportBehaviourCSV}>📋 Export Behaviour CSV</button>
        <button className="bg-gray-700 text-white p-2 rounded" onClick={exportDetentionsCSV}>📝 Export Detentions CSV</button>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 p-3 rounded"><div className="font-semibold text-2xl">{students.length}</div><div className="text-sm text-gray-600">Students</div></div>
        <div className="bg-yellow-50 p-3 rounded"><div className="font-semibold text-2xl">{behaviour.length}</div><div className="text-sm text-gray-600">Behaviour events</div></div>
        <div className="bg-purple-50 p-3 rounded"><div className="font-semibold text-2xl">{Object.keys(attendance).length}</div><div className="text-sm text-gray-600">Attendance days</div></div>
      </div>
    </div>
  );
}

function PAPage({announcement,setAnnouncement}){
  const [txt,setTxt]=useState(announcement||"");
  return (
    <div className="bg-white p-4 rounded shadow">
      <h3 className="font-semibold mb-2">Public Address / Announcement</h3>
      <textarea className="w-full border p-2 mb-2" rows={3} value={txt} onChange={e=>setTxt(e.target.value)} />
      <div className="flex gap-2">
        <button className="bg-blue-600 text-white p-2 rounded" onClick={()=>{setAnnouncement(txt);alert('Announcement sent')}}>Send Announcement</button>
        <button className="bg-yellow-500 p-2 rounded" onClick={()=>{const audio=new Audio('https://www.soundjay.com/button/beep-07.wav'); audio.play();}}>Play Bell</button>
      </div>
    </div>
  );
}

function DashboardPage({students,behaviour,detentionLog,attendance}){
  const totalStudents=students.length;
  const detentions=detentionLog.filter(d=>!d.served).length;
  const events=behaviour.length;
  const attendanceDays=Object.keys(attendance).length;
  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="bg-white p-4 rounded shadow">Students: <strong>{totalStudents}</strong></div>
      <div className="bg-white p-4 rounded shadow">Open detentions: <strong>{detentions}</strong></div>
      <div className="bg-white p-4 rounded shadow">Behaviour events: <strong>{events}</strong></div>
      <div className="bg-white p-4 rounded shadow col-span-3">Attendance days recorded: <strong>{attendanceDays}</strong></div>
    </div>
  );
}

try {
  ReactDOM.createRoot(document.getElementById("root")).render(<BromcomFullMIS />);
} catch(e) {
  console.error("Failed to mount app:", e);
  document.getElementById("root").innerHTML = `<div style="color: red; padding: 20px;">Error loading app: ${e.message}</div>`;
}
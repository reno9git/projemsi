"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isReg, setIsReg] = useState(false);
  const [tab, setTab] = useState("forum");
  const [threadId, setThreadId] = useState<number | null>(null);
  const [dmUser, setDmUser] = useState("");
  const [input, setInput] = useState("");
  const [toast, setToast] = useState("");
  const [profiles, setProfiles] = useState<any[]>([]);
  const [threads, setThreads] = useState<any[]>([]);
  const [msgs, setMsgs] = useState<any[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) loadProfile(data.session.user.id);
    });
  }, []);

  const loadProfile = async (uid: string) => {
    const { data } = await supabase.from("profiles").select("*").eq("id", uid).single();
    if (data) setUser(data);
  };

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").then(({ data }) => data && setProfiles(data));
    supabase.from("threads").select("*").order("id", { ascending: false }).then(({ data }) => data && setThreads(data));
    supabase.from("messages").select("*").order("id", { ascending: true }).then(({ data }) => data && setMsgs(data));

    const ch = supabase.channel("live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "threads" }, (p) => setThreads((prev) => [p.new, ...prev]))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (p) => setMsgs((prev) => [...prev, p.new]))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "pokes" }, (p) => {
        if (p.new.receiver_name === user.username) {
          setToast("👋 " + p.new.sender_name + " seni dürttü!");
          setTimeout(() => setToast(""), 3500);
        }
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const auth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReg) {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) return alert(error.message);
      if (data.user) {
        await supabase.from("profiles").insert({ id: data.user.id, username });
        loadProfile(data.user.id);
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return alert(error.message);
      if (data.user) loadProfile(data.user.id);
    }
  };

  const poke = async (target: string) => {
    await supabase.from("pokes").insert({ sender_name: user.username, receiver_name: target });
    setToast("👋 " + target + " dürtüldü!");
    setTimeout(() => setToast(""), 3000);
  };

  const newThread = async () => {
    const title = prompt("Konu başlığı:");
    if (!title) return;
    const { data } = await supabase.from("threads").insert({ category: "Genel", author_name: user.username, title }).select().single();
    if (data) { setThreadId(data.id); setTab("forum"); }
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const text = input; setInput("");
    await supabase.from("messages").insert({
      tab, thread_id: tab === "forum" ? threadId : null,
      sender_name: user.username, receiver_name: tab === "dm" ? dmUser : null, text
    });
  };

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0b141a] text-white">
        <form onSubmit={auth} className="w-80 bg-[#111b21] p-6 rounded-xl space-y-3 border border-gray-800">
          <h1 className="text-lg font-bold text-center text-[#00a884]">HibritForum</h1>
          {isReg && <input required placeholder="Kullanıcı adı" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full bg-[#2a3942] p-2 rounded text-sm" />}
          <input type="email" required placeholder="E-posta" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-[#2a3942] p-2 rounded text-sm" />
          <input type="password" required placeholder="Şifre" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-[#2a3942] p-2 rounded text-sm" />
          <button type="submit" className="w-full bg-[#00a884] text-black font-bold py-2 rounded text-sm">{isReg ? "Kayıt Ol" : "Giriş Yap"}</button>
          <p onClick={() => setIsReg(!isReg)} className="text-xs text-center text-gray-400 cursor-pointer">{isReg ? "Giriş yap" : "Hesabın yok mu? Kayıt ol"}</p>
        </form>
      </div>
    );
  }

  const activeThread = threads.find((t) => t.id === threadId);
  const visible = msgs.filter((m) => tab === "dm" ? (m.tab === "dm" && ((m.sender_name === user.username && m.receiver_name === dmUser) || (m.sender_name === dmUser && m.receiver_name === user.username))) : tab === "global" ? m.tab === "global" : (m.tab === "forum" && m.thread_id === threadId));

  return (
    <div className="flex h-screen bg-[#0b141a] text-gray-100 text-sm">
      {toast && <div className="fixed top-4 right-4 bg-[#00a884] text-black font-bold px-4 py-2 rounded">{toast}</div>}
      <div className="w-64 bg-[#111b21] border-r border-gray-800 flex flex-col">
        <div className="p-3 bg-[#202c33] flex justify-between items-center font-bold">
          <span>{user.username}</span>
          <button onClick={() => supabase.auth.signOut().then(() => setUser(null))} className="text-xs bg-red-900 px-2 py-1 rounded">Çıkış</button>
        </div>
        <div className="grid grid-cols-3 p-1 bg-[#0b141a] text-xs font-bold">
          <button onClick={() => setTab("forum")} className={tab === "forum" ? "py-1.5 bg-[#00a884] text-black rounded" : "py-1.5"}>Forum</button>
          <button onClick={() => setTab("dm")} className={tab === "dm" ? "py-1.5 bg-[#00a884] text-black rounded" : "py-1.5"}>DM</button>
          <button onClick={() => setTab("global")} className={tab === "global" ? "py-1.5 bg-[#00a884] text-black rounded" : "py-1.5"}>Genel</button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {profiles.filter((p) => p.username !== user.username).map((p) => (
            <div key={p.id} onClick={() => { setDmUser(p.username); setTab("dm"); }} className="flex justify-between items-center p-2 hover:bg-[#202c33] rounded cursor-pointer">
              <span>{p.username}</span>
              <button onClick={(e) => { e.stopPropagation(); poke(p.username); }} className="text-xs bg-[#2a3942] px-2 py-1 rounded">👋</button>
            </div>
          ))}
        </div>
      </div>

      <div className="w-72 border-r border-gray-800 flex flex-col">
        <div className="p-3 bg-[#202c33] flex justify-between items-center font-bold">
          <span>Konular</span>
          <button onClick={newThread} className="bg-[#00a884] text-black text-xs px-2 py-1 rounded">+ Konu</button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {threads.map((t) => (
            <div key={t.id} onClick={() => { setThreadId(t.id); setTab("forum"); }} className={threadId === t.id ? "p-2.5 bg-[#202c33] border border-[#00a884] rounded cursor-pointer" : "p-2.5 bg-[#111b21] rounded cursor-pointer"}>
              <div className="text-[10px] text-[#00a884]">{t.author_name}</div>
              <div className="font-bold">{t.title}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="p-3 bg-[#202c33] border-b border-gray-800 font-bold">
          {tab === "dm" ? (dmUser || "Üye seç") : tab === "global" ? "Genel Sohbet" : (activeThread?.title || "Konu seç")}
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {visible.map((m) => (
            <div key={m.id} className={m.sender_name === user.username ? "ml-auto max-w-xs bg-[#005c4b] p-2.5 rounded-xl" : "mr-auto max-w-xs bg-[#202c33] p-2.5 rounded-xl"}>
              <div className="text-[10px] text-[#00a884] font-bold">{m.sender_name}</div>
              <div>{m.text}</div>
            </div>
          ))}
        </div>
        <form onSubmit={send} className="p-2 bg-[#202c33] flex gap-2">
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Mesaj..." className="flex-1 bg-[#2a3942] px-3 py-2 rounded" />
          <button type="submit" className="px-4 bg-[#00a884] text-black font-bold rounded">Gönder</button>
        </form>
      </div>
    </div>
  );
}

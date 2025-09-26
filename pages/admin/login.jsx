import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) setErr(error.message);
    else window.location.href = "/admin";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <form onSubmit={onSubmit} className="bg-white text-black p-8 rounded-2xl w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-4">Logowanie Admin</h1>
        <label className="block mb-2 text-sm font-semibold">E-mail</label>
        <input className="w-full border rounded-lg px-3 py-2 mb-4" type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
        <label className="block mb-2 text-sm font-semibold">Hasło</label>
        <input className="w-full border rounded-lg px-3 py-2 mb-4" type="password" value={pass} onChange={e=>setPass(e.target.value)} required />
        {err && <div className="text-red-600 text-sm mb-3">{err}</div>}
        <button className="w-full py-2 rounded-lg bg-black text-white font-semibold hover:bg-gray-800">Zaloguj</button>
      </form>
    </div>
  );
}
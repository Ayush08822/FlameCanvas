import React, { useState } from "react";
import { UserCircle2, ArrowRight } from "lucide-react";

interface LoginProps {
  onJoin: (username: string) => void;
}

const Login: React.FC<LoginProps> = ({ onJoin }) => {
  const [inputValue, setInputValue] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onJoin(inputValue.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-[#09090b] flex items-center justify-center p-6">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-indigo-500/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-rose-500/10 rounded-full blur-[120px]" />

      <div className="w-full max-w-md relative">
        <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/10 p-10 rounded-[2.5rem] shadow-2xl">
          <div className="flex flex-col items-center gap-8">
            {/* Logo Icon */}
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-500/20 rotate-3">
              <span className="text-4xl">🎨</span>
            </div>

            <div className="text-center space-y-2">
              <h1 className="text-3xl font-black text-white uppercase tracking-tighter">
                Canvas<span className="text-indigo-500">Sync</span>
              </h1>
              <p className="text-zinc-500 text-sm font-medium">
                Collaborative real-time drawing lab
              </p>
            </div>

            <form onSubmit={handleSubmit} className="w-full space-y-6">
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-indigo-500 transition-colors">
                  <UserCircle2 size={20} />
                </div>
                <input
                  type="text"
                  placeholder="Enter your handle..."
                  autoFocus
                  required
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="w-full bg-black/40 border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-white placeholder:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all font-medium"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-white text-black hover:bg-zinc-200 font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 group shadow-xl"
              >
                Start Creating
                <ArrowRight
                  size={18}
                  className="group-hover:translate-x-1 transition-transform"
                />
              </button>
            </form>
          </div>
        </div>

        <p className="text-center mt-8 text-zinc-600 text-xs font-bold uppercase tracking-[0.2em]">
          Spring Boot + React + WebSockets
        </p>
      </div>
    </div>
  );
};

export default Login;

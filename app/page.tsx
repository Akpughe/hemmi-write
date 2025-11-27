import ChatPanel from './components/ChatPanel';
import TiptapEditor from './components/TiptapEditor';

export default function Home() {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Chat Panel - Left Side */}
      <div className="w-[400px] flex-shrink-0 border-r border-gray-300">
        <ChatPanel />
      </div>

      {/* Editor - Right Side */}
      <div className="flex-1">
        <TiptapEditor />
      </div>
    </div>
  );
}
